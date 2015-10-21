function BmxPlay() {

	var BUFSIZE = 11025;
	var buf = [];
	var machines = [];
	var connections = [];

	var BeatsPerMin;
	var TicksPerBeat; // [1..32]
	var SamplesPerSec; // usually 44100, but machines should support any rate from 11050 to 96000
	var SamplesPerTick; // (int)((60 * SPS) / (BPM * TPB))  
	var PosInTick; // [0..SamplesPerTick-1]
	var TicksPerSec; // (float)SPS / (float)SPT
	
	var CurrentTick = 0;
	var TicksPerPattern = 0;

	var songsize = 0;
	var startloop = 0;
	var endloop = 0;

	var MT_MASTER = 0;
	var MT_GENERATOR = 1;
	var MT_EFFECT = 2;

	var snd = new Sound();
	var soundChannel = null;
	snd.addEventListener('sampleData', sampleData);
	var playing = false;

	var callback = null;

	function chr(c) {
		return String.fromCharCode(c);
	}

	function FCC(i) {
		return chr(i & 0xff) + chr((i >> 8) & 0xff) + chr((i >> 16) & 0xff) + chr((i >> 24) & 0xff);
	}

	function readArray(src, len) {
		var dest = new ByteArray();
		dest.length = len;
		if (dest.length > 0) {
			src.readBytes(dest, 0, dest.length);
		}
		return dest;
	}

	function readString(buf) {
		var res="";
		while (buf.position < buf.length) {
			var c = buf.readByte();
			if (c == 0) {
				break;
			}
			res += String.fromCharCode(c);
		}
		return res;
	}

	this.Load = function(bytes) {

		machines = [];
		connections = [];

		var wasPlaying = playing;
		this.Stop();

		console.log("Loading data ("+bytes.length+" bytes)...");

		var data = new ByteArray(bytes);

		if (FCC(data.readInt()) != "Buzz")
			return -1;

		var numSections = data.readInt();

		for (var h = 0; h < numSections; ++h)
		{
			var fourcc = data.readInt();
			var offset = data.readInt();
			var size = data.readInt();
			var lastpos = data.position;
			var section = FCC(fourcc);

			data.position = offset;

			switch (section) {

				case "MACH":
					var numMachines = data.readShort();

					for (var i = 0; i < numMachines; ++i) {
						var name = readString(data);
						var type = data.readByte();
						var m = null;

						if (type == MT_MASTER) {
							m = new BmxMachine();
						} else {
							var dllname = readString(data);
							try {
								m = new window[dllname]();
							} catch(e) {
								console.log("Could not find class: " + dllname);
								break;
							}
						}

						m.xPos = data.readFloat();
						m.yPos = data.readFloat();

						var datalen = data.readInt();

						if (datalen>data.length) {
							console.log('machine data is too big, ' + datalen + ' bytes');
							return;
						}

						var msd = readArray(data, datalen);

						var numAttrs = data.readShort();

						for (var k = 0; k < numAttrs; ++k) {
							var attrName = readString(data);
							var attrValue = data.readInt();
						}

						m.GlobalVals = readArray(data, m.numGlobalParameters);
						var numTracks = data.readShort();
						m.TrackVals = readArray(data, m.numTrackParameters * numTracks);
						m.sources = 0;

						m.pMasterInfo = this;
						machines.push(m);

						m.Init(msd);

					}

				break;

				case "CONN":
					var numConnections = data.readShort();
					for (i = 0; i < numConnections; i++) {
						var c = BmxConnection();

						c.src = data.readShort();
						c.dst = data.readShort();
						c.amp = data.readShort();
						c.pan = data.readShort();

						connections.push(c);

						for (j = 0; j < machines.length; ++j) {
							if (c.dst == j)
								machines[j].sources++;
						}
					}
					break;

				case "PATT":
					var n = 0;
					for (i = 0; i < machines.length; i++) {
						var m = machines[i];

						var numPatterns = data.readShort();

						var tracks = data.readShort();

						for (var j = 0; j < numPatterns; j++) {
							var p = BmxPattern();
							p.numTracks = tracks;
							p.name = readString(data);
							p.numRows = data.readShort();

							for (k = 0; k < m.sources; ++k) {
								data.readShort();
								readArray(data, p.numRows * 2 * 2);
							}
							
							p.gdata = readArray(data, m.numGlobalParameters * p.numRows);
							p.tdata = readArray(data, m.numTrackParameters * p.numRows * p.numTracks);

							m.patterns.push(p);
						}
					}
					break;

				case "SEQU": 
					songsize = data.readInt();
					startloop = data.readInt();
					endloop = data.readInt();

					var numSequences = data.readShort();

					for (i = 0; i < numSequences; i++) {
						var iMachine = data.readShort();

						var m = machines[iMachine];

						var numEvents = data.readInt();

						var posSize = data.readByte();
						var evtSize = data.readByte();
						
						for (j = 0; j < numEvents; j++) {
							var pos = (posSize == 1) ? data.readByte() & 0xff : data.readShort();
							var event = (evtSize == 1) ? data.readByte() & 0xff : data.readShort();
							var rec = [pos, event];
							m.events.push(rec);
						}
					}
					break;

			}
			data.position = lastpos;
		}

		BeatsPerMin = machines[0].gp(2);
		TicksPerBeat = machines[0].gp(4);

		SamplesPerSec = 44100;
		SamplesPerTick = ~~((60 * SamplesPerSec) / (BeatsPerMin * TicksPerBeat));

		PosInTick = 0;
		TicksPerSec = ~~(SamplesPerSec / SamplesPerTick);
		CurrentTick = 0;
		TicksPerPattern = 16;

		this.SamplesPerSec = SamplesPerSec;
		this.SamplesPerTick = SamplesPerTick;

		for (var i=0; i<machines.length; ++i) {
			machines[i].Tick();
		}

		BmxWorkBuffer(buf, BUFSIZE);

		if (wasPlaying)
			this.Play();
	}

	function Tick(m, tick) {
		for (var i=0; i<m.events.length; ++i) {
			var evt = m.events[i];
			var pos = evt[0];
			var event = evt[1];

			if (pos == tick) {
				if (event >= 0x10) {
					m.currentPattern = event - 0x10;
					m.currentRow = 0;
					m.patternRows = m.patterns[m.currentPattern].numRows;
				}
			}
		}
		
		if (m.currentRow < m.patternRows) {
			m.loadValues(m.currentPattern, m.currentRow);
			m.Tick();
		}

		m.currentRow++;
	}

	function BmxSmartMix(out, ofs, size) {

		if (machines.length==0) {
			return;
		}
		
		var src;
		var dest;

		for (var j = 0; j<machines.length; ++j) {
			var m = machines[j];
			m.scount = m.sources;

			dest = m.buf;
			var i = size * m.numChannels;

			while (i--) {
				dest[i] = 0;
			}
		}

		var machine = 0;

		while (machines[0].scount != 0) {

			if (machines[machine].scount != 0 || machines[machine].scount < 0) {

				//next, if cannot evaluate yet, or machine has been processed
				machine++;

			} else {

				var m = machines[machine];

				m.Work(m.buf, size, m.numChannels);

				for (var k = 0; k<connections.length; ++k) {

					var c = connections[k];
					var m1;

					if (c.src == machine) {

						m1 = machines[c.dst];

						//copy source to destination with corresponding amplitude and panning
						var amp = c.amp / 0x4000;
						var rpan = c.pan / 0x8000;
						var lpan = 1.0 - rpan;

						var lamp = amp * lpan;
						var ramp = amp * rpan;

						src = m.buf;
						dest = m1.buf;
						var i = size;

						var j;
						var n;

						if (m.numChannels == 1 && m1.numChannels == 1) {

							while (i--) {
								dest[i] += src[i] * amp;
							}

						} else if (m.numChannels == 1 && m1.numChannels == 2) {

							for (var i = 0, j = 0; i < size; i++) {
								dest[j++] += src[i] * lamp;
								dest[j++] += src[i] * ramp;
							}

						} else if (m.numChannels == 2 && m1.numChannels == 2) {

							for (var i = 0, j = 0; i < size*2; ) {
								dest[j++] += src[i++] * lamp;
								dest[j++] += src[i++] * ramp;
							}
						}
						
						m1.scount--;
					}
				}
				m.scount--;
				machine = 0;
			}
		}

		src = machines[0].buf;
		dest = out;

		for (var i = 0, j = ofs*2; i < size * 2;) {
			dest[j++] = src[i++];
		}
	}

	function BmxWorkBuffer(psamples, numsamples) {
		var portion = 0;
		var count = numsamples;
		var maxsize = 0;
		var ofs = 0;

		while (count != 0) {

			if (PosInTick == 0) {

				if (callback) {
					callback ( { pos:CurrentTick, size:songsize } );
				}

				for (var i=0; i<machines.length; ++i) {
					var m = machines[i];
					Tick(m, CurrentTick);
				}

				CurrentTick++;

				if (CurrentTick >= songsize) {
					CurrentTick = startloop;
				}
			}

			maxsize = SamplesPerTick - PosInTick;
			portion = count;

			if (portion > BUFSIZE) {
				portion = BUFSIZE;
			}

			if (portion > maxsize) {
				portion = maxsize;
			}

			PosInTick += portion;

			if (PosInTick == SamplesPerTick) {
				PosInTick = 0;
			}

			BmxSmartMix(psamples, ofs, portion);

			ofs += portion;
			count -= portion;
		}
	}

	this.SetCallback = function (fn) {
		callback = fn;
	}

	function sampleData(e) {
		var mastervolume = 1.0/32767.0;
		for (var i = 0,j=0; i < BUFSIZE; i++) {
			e.data.getChannelData(0)[i] = buf[j] * mastervolume;
			e.data.getChannelData(1)[i] = buf[j+1] * mastervolume;
			j+=2;
		}
		BmxWorkBuffer(buf, BUFSIZE);
	}

	this.Play = function() {
		if (playing)
			return;
		playing = true;

		console.log("Hammertime!");
		soundChannel = snd.play();
	}

	this.Stop = function() {
		if (!playing)
			return;
		playing = false;

		console.log("Stop.");
		soundChannel.stop();
	}

	this.SetCanvas = function(c) {
		snd.SetCanvas(c);
	}
}

