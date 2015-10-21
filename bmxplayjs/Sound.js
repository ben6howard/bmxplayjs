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
	// samples are floats, range is -32767.0 .. 32767.0
*/

function Sound() {

	var playing = false;
	var callback = null;

	var audioCtx = new (window.AudioContext || window.webkitAudioContext)();

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
			nodes[i].start(nextTime+tickPeriod);

			//console.log('scheduled',nextTime+tickPeriod);

			i = (i+1) % buffers;

			nodes[i] = audioCtx.createBufferSource();
			nodes[i].buffer = buf[i];
			callback( { data: buf[i] } );

			nextTime = nextTime + tickPeriod;
		}

		if (playing)
			setTimeout(update, 25);
	}

	this.addEventListener = function(event, fn) {
		callback = fn;
	}

	this.play = function() {

		if (!playing) {
			nextTime = audioCtx.currentTime;
			playing = true;
			update();
		}

		return  {
			stop: function() {
				playing = false;
			}
		}
	}

}

