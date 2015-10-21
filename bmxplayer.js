window.onload = function() {

	var playing = false;
	var player = new BmxPlay();
	player.SetCallback(status);

	document.getElementById("playlist").addEventListener("change", function() {
		var s = this.value;
		player.Stop();
		loadSong('songs/'+s);
	});

	document.getElementById("playBtn").addEventListener("click", function() {
		if (!playing) {
			playing = true;
			player.Play();
		} else {
			playing = false;
			player.Stop();
		}
	});

	function status(e) {
		document.getElementById('label').innerText = e.pos + '/' + e.size;
	}

	function loadSong(url) {

		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.overrideMimeType('text/plain; charset=x-user-defined');

		xhr.onreadystatechange = function(e) {
			if (this.readyState == 4) {
				player.Load(this.responseText);

				playing = true;
				player.Play();
			}
		};

		xhr.send();
	}

	loadSong('songs/default.bmx');
}

