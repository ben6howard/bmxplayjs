// Sound class, as in flash.media.Sound

function Sound() {

	var playing = false;
	var callback = null;
	var oscType = 1;

	var audioCtx = new (window.AudioContext || window.webkitAudioContext)();
	var analyser = audioCtx.createAnalyser();
	var bufferLength = analyser.frequencyBinCount;
	var dataArray = new Uint8Array(bufferLength)

	var BUFSIZE = audioCtx.sampleRate/4;
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
			timer = WorkerTimer.setInterval(update, 120);
		}

		return  {
			stop: function() {
				playing = false;
				WorkerTimer.clearInterval(timer);
			}
		}
	}

	this.GetSampleRate = function() {
		return audioCtx.sampleRate;
	}

	this.GetOscData = function(oscType, size, smooth) {
		size = Math.pow(2, Math.round(Math.log(size) / Math.log(2)));
		analyser.fftSize = size;
		if (smooth) {
			analyser.smoothingTimeConstant = smooth; // 0.8 by default
		}
		oscType==1 ? analyser.getByteFrequencyData(dataArray) : analyser.getByteTimeDomainData(dataArray);
		return dataArray;
	}
}

