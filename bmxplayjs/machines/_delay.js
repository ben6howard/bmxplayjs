_delay.prototype = Object.create(BmxMachine.prototype);
_delay.prototype.constructor=_delay;

function _delay() {

	this.type = 1;
	this.numGlobalParameters = 4;
	this.numTrackParameters = 0;
	this.numChannels = 2;

	this.buf = [];
	this.patterns = [];
	this.events = [];

	var dlength;
	var feedback;
	var dryout;
	var wetout;

	var iw;
	var len;
	var fb;
	var dry;
	var wet;
	var pan;

	var dsize = 44100;
	var buf1 = [];
	var buf2 = [];
	
	this.Init = function(msd) {
		pan = 0;
		iw = 0;
		dlength = 0;
		feedback = 0;
		dryout = 0;
		wetout = 0;

		buf1.length = dsize;
		buf2.length = dsize;

		for (var i=0;i<dsize;i++) {
			buf1[i] = 0;
			buf2[i] = 0;
		}
	}
	
	this.Tick = function() {

		dlength = this.gp(0, dlength);
		feedback = this.gp(1, feedback);
		dryout = this.gp(2, dryout);
		wetout = this.gp(3, wetout);

		len = dlength / 128.0;
		fb = feedback / 128.0;
		dry = dryout / 128.0;
		wet = wetout / 128.0;
	}

	this.Work = function(psamples, numsamples, channels) {

		var delta = len * dsize;
		var lbuf;
		var rbuf;

		if (pan==1) {
			lbuf = buf1;
			rbuf = buf2;
		} else {
			lbuf = buf2;
			rbuf = buf1;
		}

		for (var i = 0; i < numsamples*2;) {
			var pin = psamples[i];

			psamples[i++] = rbuf[iw] * wet + pin * dry;
			rbuf[iw] = fb * rbuf[iw];

			psamples[i++] = lbuf[iw] * wet + pin * dry;
			lbuf[iw] = pin + fb * lbuf[iw];

			iw++;

			if (iw >= delta) {
				iw = 0;
				pan = 1 - pan;

				if (pan==1) {
					lbuf = buf1;
					rbuf = buf2;
				} else {
					lbuf = buf2;
					rbuf = buf1;
				}

			}
		}
		return true;
	}
}
