window.onload = function() {

	document.getElementById("playlist").addEventListener("change", function() {
		loadSong('songs/'+this.value);
	});

	document.getElementById("playBtn").addEventListener("click", function() {
		player.Play();
	});

	document.getElementById("stopBtn").addEventListener("click", function() {
		player.Stop();
	});

	function status(e) {
		document.getElementById('label').innerHTML = e.pos + '/' + e.size;
	}

	function loadSong(url) {
		var xhr = new XMLHttpRequest();
		xhr.open('GET', url, true);
		xhr.overrideMimeType('text/plain; charset=x-user-defined');
		xhr.onreadystatechange = function(e) {
			if (this.readyState == 4) {
				if (this.responseText.length === 0) {
					alert ('try chrome --allow-file-access-from-files');
					return;
				}
				player.Load(this.responseText);

				if (autostart) {
					autostart = false;
					player.Play();
				}
			}
		};
		xhr.send();
	}

	var autostart = true;
	var player = new BmxPlay();
	player.SetCallback(status);
	player.SetCanvas(document.getElementById("canvas"));
	loadSong('songs/default.bmx');
}

