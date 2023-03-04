// ==UserScript==
// @name      video player keyboard shortcut
// @namespace ATGT
// @description  video player keyboard shortcut
// @version  1
// @match    https://v.youku.com/v_show/*
// @run-at   document-start
// ==/UserScript==

let log = console.log;
let info = console.info;
let warn = console.warn;
let error = console.error;

warn(`=== video-player-keyboard-shortcut on '${location.href}' ===`);
function injectYoukuShortcut()
{
	document.addEventListener('keyup', function (event) {
		if (event.key === 'f' || event.key === 'w') {
			warn('event ', event)
			let element = document.querySelector(event.key == 'w' && 'icon.kui-webfullscreen-icon-0' || 'icon.kui-fullscreen-icon-0');
			element && element.click();
		}
	});
}

/^https:\/\/v\.youku\.com\/v_show\//.test(location.href) && injectYoukuShortcut();

warn(`=== video-player-keyboard-shortcut on '${location.href}' ===`);
