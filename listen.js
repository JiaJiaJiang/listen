class AnalyserPack{
	constructor({fftSize=1024,audioCtx}={}){
		var analyser=this.analyser=audioCtx.createAnalyser();
		analyser.fftSize=fftSize;
		analyser.smoothingTimeConstant=0;
		this.frequencyArray=null;
		this.waveArray=null;
		console.log('fft:',analyser.fftSize,' ','fB:',analyser.frequencyBinCount)
	}
	collectFre(){
		if(!this.frequencyArray || this.frequencyArray.length!==this.analyser.frequencyBinCount)
			this.frequencyArray=new Uint8Array(this.analyser.frequencyBinCount);
		this.analyser.getByteFrequencyData(this.frequencyArray);
	}
	collectWave(){
		if(!this.waveArray || this.waveArray.length!==this.analyser.frequencyBinCount)
			this.waveArray=new Float32Array(this.analyser.frequencyBinCount);
		this.analyser.getFloatTimeDomainData(this.waveArray);
	}
}

class Visual{
	constructor({analyserPack}={}){
		this.analyserPack=analyserPack;
	}
	draw(canvas,ctx){}
	get dataCount(){return this.analyserPack.analyser.frequencyBinCount;}
	collectFre(){
		this.analyserPack.collectFre();
	}
	collectWave(){
		this.analyserPack.collectWave();
	}
}

class Waterfall extends Visual{
	constructor({analyserPack}={}){
		super({analyserPack});
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
	map(canvas){
		if(this.freNewImageData.width!==this.dataCount)
			this.setArrays();
		let freArr=this.analyserPack.frequencyArray,
			dataArr=this.freImageDataArray,
			dataCount=this.dataCount;
		/*if(dataCount>canvas.width){
			let r=freArr.length/canvas.width,
				scale=canvas.width/dataCount;
			for(let i=freArr.length;i--;){
				freArr[Math.round(i/r)]+=freArr[i]*scale;
			}
			dataCount=canvas.width;
		}*/

		for(let i=dataCount;i--;){
			if(freArr[i]<lowerLimit){
				dataArr[i*4]=dataArr[i*4+1]=dataArr[i*4+2]=0;
				continue;
			}
			if(freArr[i]===0){
				dataArr[i*4]=dataArr[i*4+1]=dataArr[i*4+2]=0;
				continue;
			}
			let v=freArr[i]*3;
			dataArr[i*4]=v;
			v=v-dataArr[i*4];
			dataArr[i*4+1]=v;
			v=v-dataArr[i*4+1];
			dataArr[i*4+2]=v;
		}
		if(this.bufferMode)
			this.bufferCtx.putImageData(this.freNewImageData,0,0);
	}
	canvasSize(canvas){
		if(canvas.height!=canvas.offsetHeight)canvas.height=canvas.offsetHeight;
		if(canvas.offsetWidth<this.dataCount){
			canvas.width=canvas.offsetWidth;
			this.bufferCanvas.width=this.dataCount;
			this.bufferMode=true;
		}
		else{
			canvas.width=this.dataCount;
			this.bufferMode=false;
		}

	}
	draw(canvas,ctx){
		ctx.drawImage(canvas,0,-1);
		if(this.bufferMode){
			ctx.drawImage(this.bufferCanvas,0,canvas.height-1,canvas.width,1);
		}else{
			ctx.putImageData(this.freNewImageData,0,canvas.height-1);
		}
	}
}

class Bar extends Visual{
	constructor({analyserPack}={}){
		super({analyserPack});
	}
	draw(canvas,ctx){
		let freArray=this.analyserPack.frequencyArray,
			h=canvas.height,
			max_h=.9*h;
		if(max_h>300)max_h=300;
		ctx.clearRect(0,0,canvas.width,canvas.height);
		ctx.beginPath();
		ctx.strokeStyle = "#555";
		for(let i=freArray.length;i--;){
			if(freArray[i]<lowerLimit)continue;
			ctx.moveTo(i,h-(freArray[i]/255)*max_h);
			ctx.lineTo(i,h);
		}
		ctx.stroke();
	}
	canvasSize(canvas){
		if(canvas.height!=canvas.offsetHeight)canvas.height=canvas.offsetHeight;
		canvas.width=this.dataCount;
	}
}

class Wave extends Visual{
	constructor({analyserPack}={}){
		super({analyserPack});
	}
	draw(canvas,ctx){
		let waveArray=this.analyserPack.waveArray,
			wave_distance=(waveArray.length-1)/canvas.width,
			max_h=.8*canvas.height,
			half_h=canvas.height/2;
		if(max_h>300)max_h=300;
		ctx.clearRect(0,0,canvas.width,canvas.height);
		ctx.beginPath();
		ctx.strokeStyle = "rgba(250, 250, 250, 0.97)";
		ctx.moveTo(0,half_h+max_h*waveArray[0]);
		for (var i = 1; i < waveArray.length; i++) {
			ctx.lineTo(i/wave_distance,half_h+max_h*waveArray[i]);
		}
		ctx.stroke();
	}
	canvasSize(canvas){
		canvas.width=canvas.offsetWidth;
		canvas.height=canvas.offsetHeight;
	}
}