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
			dataArr=this.freImageDataArray;
		for(let i=this.dataCount;i--;){
			if(freArr[i]<lowerLimit)freArr[i]=0;
			let v=freArr[i]*3;
			dataArr[i*4]=v;
			v=v-dataArr[i*4];
			dataArr[i*4+1]=v;
			v=v-dataArr[i*4+1];
			dataArr[i*4+2]=v;
		}
		return this.freNewImageData;
	}
	draw(canvas,ctx){
		ctx.drawImage(canvas,0,-1);
		ctx.putImageData(this.freNewImageData,0,canvas.height-1);
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
}