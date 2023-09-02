/*
Copyrigth luojia@luojia.me
*/ 
class VisualGroup{
	constructor(audioCtx){
		this.audioCtx=audioCtx;
		this.container=document.createElement('div');
		this.container.id='visualGroupEle';
		this.channels=[];

		this._splitter=null;
		this._source=null;

		this.paused=false;

		this.defaultChannelMode=eles.channelMode.channelmode.value;

		setTimeout(()=>{
			if(this._source && !this.channels.length)
				this.channelMode('split');
		},0);

	}
	setChannelCount(c){
		this._source.channelCount=c;
		this.channelMode(this.defaultChannelMode);
	}
	setSource(source){
		try{
			if(this._source&&this._splitter)this._source.disconnect(this._splitter);
		}catch(e){}
		console.log('set source');
		if(!source){
			this._source=null;return;
		}
		this._source=source;
		sourceChannels.value=source.channelCount;
		this.channelMode(this.defaultChannelMode);
	}
	channelMode(mode=(this._splitter.channelCount===1?'split':'merge')){// split/merge
		this.defaultChannelMode=mode;
		if(!this._source){
			console.warn('no source, cannot change channelMode');
			return;
		}
		console.warn('channel mode',mode);
		try{
			if(this._source&&this._splitter)this._source.disconnect(this._splitter);
		}catch(e){}
		if(this._splitter){
			this._splitter.disconnect();
			this._splitter=null;
		}
		let chArr=[],ch;
		if(mode=='split'){
			ch=this._source.channelCount;
		}else if(mode=='merge'){
			ch=1;
		}else{throw(new Error('Wrong channel mode:'+mode))}

		console.log('source channels:',ch);
		this._splitter=this.audioCtx.createChannelSplitter(ch);
		this._source.connect(this._splitter);
		//console.log('splited channels:',sp.channelCount);
		for(;ch--;){
			let g=this.audioCtx.createGain();
			g.channelCount=1;
			this._splitter.connect(g,ch,0);
			chArr.unshift(g);
		}
		if(!chArr.length)return;

		for(let c of this.channels){
			c.destroy();
		}
		this.channels.length=0;

		let height=100/chArr.length,i=0;
		for(let nc of chArr){
			let VC=new VisualChannel(this,nc);
			VC.visualFrame.style.cssText+=`height:${height}%;top:${100*i/chArr.length}%`;
			this.container.appendChild(VC.visualFrame);
			this.channels.push(VC);
			i++;
		}

		this.canvasSize();

	}
	channelFunc(func,...args){
		for(let c of this.channels)c[func](...args);
	}
	channelValue(name,value){
		for(let c of this.channels)c[name]=value;
	}
	canvasSize(){
		this.channelFunc('canvasSize');
	}
}


class VisualChannel{
	constructor(visualGroup,channelNode,opts){
		this.visualGroup=visualGroup;
		this.audioCtx=visualGroup.audioCtx;
		this._audioNode=channelNode;
		this.waveCanvas=document.createElement('canvas');
		this.waveCanvas.id='waveCanvas';
		this.freCanvas=document.createElement('canvas');
		this.freCanvas.id='freCanvas';
		this.waveCtx=this.waveCanvas.getContext('2d');
		this.freCtx=this.freCanvas.getContext('2d');
		this.visualFrame=document.createElement('div');
		this.visualFrame.className='visualFrame';
		this.visualFrame.appendChild(this.freCanvas);
		this.visualFrame.appendChild(this.waveCanvas);

		// this.lowerLimit=-140;
		// this.higherLimit=1;

		this.waveVisual=null;
		this.freVisual=null;

		let opt=Object.assign({fftSize:Number(eles.fftSize.value),waveMode:eles.waveForm.wave.value,freMode:eles.freForm.fre.value},opts);
		this.analyserPack=new AnalyserPack({fftSize:Number(opt.fftSize),audioCtx:this.audioCtx});

		requestAnimationFrame(()=>{
			opt.waveMode&&this.waveMode(opt.waveMode);
			opt.freMode&&this.freMode(opt.freMode);
		});

		this._audioNode.connect(this.analyserPack.analyser);
	}
	get lowerLimit(){return lowerLimitNum.value;}
	set fftSize(size){
		this.analyserPack.fftSize=Number(size);
		this.canvasSize();
	}
	waveMode(mode){// wave/none
		console.log('wave mode:',mode)
		this.waveCanvas.height+=0;
		if(visualList.wave[mode]){
			this.waveVisual=new visualList.wave[mode](this);
			this.waveCanvas.hidden=false;
			this.waveVisual.canvasSize();
		}else{
			this.waveCanvas.hidden=true;
			this.waveVisual=null;
		}
	}
	freMode(mode){// waterfall/bar/none
		console.log('fre mode:',mode)
		this.freCanvas.height+=0;
		if(visualList.fre[mode]){
			this.freVisual=new visualList.fre[mode](this);
			this.freCanvas.hidden=false;
			this.freVisual.canvasSize();
		}else{
			this.freCanvas.hidden=true;
			this.freVisual=null;
		}
	}
	refresh(){
		if(this.visualGroup.paused)return;
		if(this.analyserPack){
			this.waveVisual&&this.analyserPack.collectWave();
			this.freVisual&&this.analyserPack.collectFre();
			this.waveVisual&&this.waveVisual.draw();
			this.freVisual&&this.freVisual.draw();
		}
	}
	destroy(){// undo all connections and delete dom nodes
		try{
			this._audioNode.disconnect(this.analyserPack.analyser);
		}catch(e){}
		this.visualFrame.parentNode.removeChild(this.visualFrame);
		this.waveVisual=null;
		this.freVisual=null;
		this.analyserPack=null;
		this._audioNode=null;
	}
	canvasSize(){
		if(this.waveVisual){
			this.waveVisual.canvasSize();
		}
		if(this.freVisual){
			this.freVisual.canvasSize();

		}
	}
}
class AnalyserPack{
	constructor({fftSize=1024,audioCtx}={}){
		var analyser=this.analyser=new AnalyserNode(audioCtx);
		analyser.smoothingTimeConstant=0;
		this.frequencyArray=null;
		this.waveArray=null;
		this.fftSize=fftSize;
		console.log('fft:',analyser.fftSize,' ','fB:',analyser.frequencyBinCount)
	}
	set fftSize(size){
		this.analyser.fftSize=size;
		this.frequencyArray=new Float32Array(this.analyser.frequencyBinCount);
		// this.frequencyArray=new Uint8Array(this.analyser.frequencyBinCount);
		this.waveArray=new Float32Array(this.analyser.fftSize);
	}
	collectFre(){
		if(this.frequencyArray)
			this.analyser.getFloatFrequencyData(this.frequencyArray);
	}
	collectWave(){
		if(this.waveArray)
			this.analyser.getFloatTimeDomainData(this.waveArray);
	}
}







class Visual{
	constructor(visualChannel){
		this.visualChannel=visualChannel;
		this.analyserPack=visualChannel.analyserPack;
	}
	draw(){}
	get dataCount(){return this.analyserPack.analyser.frequencyBinCount;}
	collectFre(){
		this.analyserPack.collectFre();
	}
	collectWave(){
		this.analyserPack.collectWave();
	}
}

class Waterfall extends Visual{
	constructor(visualChannel){
		super(visualChannel);
		this.setArrays();
		this.bufferCanvas=document.createElement('canvas');
		this.bufferCanvas.height=1;
		this.bufferCtx=this.bufferCanvas.getContext('2d');
		this.bufferMode=false;
	}
	setArrays(){
		this.freImageDataArray=new Uint8ClampedArray(this.dataCount*4);
		this.freNewImageData = new ImageData(this.freImageDataArray,this.dataCount,1);
		for(let i=this.dataCount;i--;){
			this.freImageDataArray[i*4+3]=255;
		}
	}
	map(){
		if(this.freNewImageData.width!==this.dataCount)
			this.setArrays();
		let freArr=this.analyserPack.frequencyArray,
			dataArr=this.freImageDataArray,
			dataCount=this.dataCount,
			lowerLimit=this.visualChannel.lowerLimit;

		let v;
		for(let i=dataCount;i--;){
			v=freValueScale(freArr[i],lowerLimit);
			if(v===0){
				dataArr[i*4]=dataArr[i*4+1]=dataArr[i*4+2]=0;
				continue;
			}
			dataArr[i*4]=(v**0.9)*255;
			dataArr[i*4+1]=(v**1.9)*255;
			dataArr[i*4+2]=(v**0.7)*255;
		}
		if(this.bufferMode)
			this.bufferCtx.putImageData(this.freNewImageData,0,0);
	}
	canvasSize(){
		let canvas=this.visualChannel.freCanvas;
		if(canvas.isConnected){
			refreshElement(canvas);
		}
		if(canvas.height!=canvas.offsetHeight)canvas.height=canvas.offsetHeight;
		canvas.width=canvas.offsetWidth;
		this.bufferCanvas.width=this.dataCount;
		this.bufferMode=true;
	}
	draw(){
		let canvas=this.visualChannel.freCanvas,ctx=this.visualChannel.freCtx;
		this.map();
		ctx.drawImage(canvas,0,-1);
		if(this.bufferMode){
			ctx.drawImage(this.bufferCanvas,0,canvas.height-1,canvas.width,1);
		}else{
			ctx.putImageData(this.freNewImageData,0,canvas.height-1);
		}
	}
}

class Bar extends Visual{
	constructor(visualChannel){
		super(visualChannel);
	}
	draw(){
		let canvas=this.visualChannel.freCanvas,ctx=this.visualChannel.freCtx;
		let freArr=this.analyserPack.frequencyArray,
			h=canvas.height,
			max_h=.9*h;
		if(max_h>300)max_h=300;
		ctx.clearRect(0,0,canvas.width,canvas.height);
		ctx.beginPath();
		ctx.strokeStyle = "#ccc";
		ctx.lineTo(0,h-max_h);
		ctx.lineTo(canvas.width,h-max_h);
		ctx.stroke();
		ctx.strokeStyle = "#555";
		let lowerLimit=this.visualChannel.lowerLimit;
		for(let i=freArr.length;i--;){
			ctx.moveTo(i,h-freValueScale(freArr[i],lowerLimit)*max_h);
			ctx.lineTo(i,h);
		}
		ctx.stroke();
	}
	canvasSize(){
		let canvas=this.visualChannel.freCanvas;
		if(canvas.isConnected){
			refreshElement(canvas);
		}
		if(canvas.height!=canvas.offsetHeight)canvas.height=canvas.offsetHeight;
		canvas.width=this.dataCount;
	}
}

class Wave extends Visual{
	constructor(visualChannel){
		super(visualChannel);
	}
	draw(){
		let canvas=this.visualChannel.waveCanvas,ctx=this.visualChannel.waveCtx;
		let waveArray=this.analyserPack.waveArray,
			max_h=canvas.height,
			half_h=canvas.height/2;
		if(max_h>300)max_h=300;
		ctx.clearRect(0,0,canvas.width,canvas.height);
		ctx.beginPath();
		ctx.strokeStyle = "rgba(250, 250, 250, 0.97)";
		let dataLength;
		if(canvas.width<this.analyserPack.analyser.fftSize){
			dataLength=canvas.width;
		}else{
			dataLength=this.analyserPack.analyser.fftSize;
		}
		ctx.moveTo(0,half_h+half_h*waveArray[waveArray.length-dataLength]);
		for (var i =1,dataInd=waveArray.length-dataLength; dataInd < waveArray.length; i++,dataInd++) {
			ctx.lineTo(i,half_h+half_h*waveArray[dataInd]);
		}
		ctx.stroke();
	}
	canvasSize(){
		let canvas=this.visualChannel.waveCanvas;
		if(canvas.isConnected){
			refreshElement(canvas);
		}
		canvas.width=this.dataCount;
		canvas.height=canvas.offsetHeight;
	}
}


const visualList={
	fre:{
		bar:Bar,
		waterfall:Waterfall,
	},
	wave:{
		wave:Wave,
	}
};

function freValueScale(raw,min=-150,max=-20){
	raw=(raw-max)/(min-max);
	if(raw>1)raw=1;
	else if(raw<0)raw=0;
	return (1-raw)**2.9;
}

function refreshElement(ele){
	ele.offsetHeight;
}