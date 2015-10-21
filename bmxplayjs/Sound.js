// Sound class, as in flash.media.Sound

/*
	usage:

	function sampleData(e) {
		for (var i = 0; i < BUFSIZE*2; ++i) {
			e.data.writeFloat(buf[i] * mastervolume);
		}
		RenderBuffer(buf, BUFSIZE);
	}

	snd = new Sound();
	snd.addEventListener('sampleData', sampleData);
	RenderBuffer(buf, BUFSIZE);
	soundChannel = snd.play();
	soundChannel.stop();

	// set BUFSIZE to 11025 (sampleRate/4, 250 ms) to get rid of clicks
	// data stored as two channels, non-interleaved
	// samples are floats, range is -1.0 .. 1.0
*/

function Sound() {

	var playing = false;
	var callback = null;
	var canvasCtx = null;

	var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

	var analyser = audioCtx.createAnalyser();

	var bufferLength = analyser.frequencyBinCount;

	var dataArray = new Uint8Array(bufferLength);

	var BUFSIZE = 11025;//audioCtx.sampleRate/4;

	var frameCount = BUFSIZE * 2.0;
	var buffers = 3;
	var channels = 2;
	var buf = [];
	var nodes = [];

	for (var i=0; i<buffers; i++) {
		buf[i] = audioCtx.createBuffer(channels, frameCount, audioCtx.sampleRate);
	}

	var i = 0;

	nodes[i] = audioCtx.createBufferSource();
	nodes[i].buffer = buf[i];

	var tickPeriod = BUFSIZE/audioCtx.sampleRate;
	var nextTime = audioCtx.currentTime;

	function update() {

		var time = audioCtx.currentTime;

		if (time>=nextTime) {

			nodes[i].connect(audioCtx.destination);
			nodes[i].connect(analyser);
			nodes[i].start(nextTime+tickPeriod);

			i = (i+1) % buffers;

			nodes[i] = audioCtx.createBufferSource();
			nodes[i].buffer = buf[i];
			callback( { data: buf[i] } );

			nextTime = nextTime + tickPeriod;
		}
	}

	this.addEventListener = function(event, fn) {
		callback = fn;
	}

	var timer;

	this.play = function() {

		if (!playing) {
			nextTime = audioCtx.currentTime;
			playing = true;
			timer = WorkerTimer.setInterval(update, 50);
		}

		return  {
			stop: function() {
				playing = false;
				WorkerTimer.clearInterval(timer);
			}
		}
	}

	var WIDTH;
	var HEIGHT;

	function draw() {
		drawVisual = requestAnimationFrame(draw);

		analyser.getByteFrequencyData(dataArray);
		//analyser.getByteTimeDomainData(dataArray);

		canvasCtx.fillStyle = "black";
		canvasCtx.fillRect(0, 0, WIDTH, HEIGHT);

		var barWidth = 1;
		canvasCtx.fillStyle = "rgb(50,255,50)";
		canvasCtx.strokeStyle = "rgb(50,255,50)";
		canvasCtx.beginPath();
		for(var i = 0; i < WIDTH; i++) {
			var x = i;
			var y = HEIGHT-dataArray[i];
			if(i === 0) {
				canvasCtx.moveTo(x, y);
			} else {
				canvasCtx.lineTo(x, y);
			}
		}
		canvasCtx.stroke();
	}

	this.SetCanvas = function(c) {
		WIDTH = c.width;
		HEIGHT = c.height;
		analyser.fftSize = WIDTH*2;
		canvasCtx = c.getContext("2d");
		draw();
	}
}

