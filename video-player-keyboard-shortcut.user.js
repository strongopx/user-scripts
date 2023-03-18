// ==UserScript==
// @name      video player keyboard shortcut
// @namespace ATGT
// @description  video player keyboard shortcut
// @version  1
// @match    https://v.youku.com/v_show/*
// @match    https://www.ixigua.com/*
// @run-at   document-start
// ==/UserScript==

let log = console.log;
let info = console.info;
let warn = console.warn;
let error = console.error;

warn(`=== video-player-keyboard-shortcut on '${location.href}' ===`);

let site_keymaps = [
	{
		url: /^https:\/\/v\.youku\.com\/v_show\//,
		keymap: {
			'w': 'icon.kui-webfullscreen-icon-0',
			'f': 'icon.kui-fullscreen-icon-0',
			'n': 'icon.kui-next-icon-0',
			'p': 'button#pictureInPictureToggle'
		},
	}, {
		url: /^https:\/\/www\.ixigua\.com\//,
		keymap: {
			'f': 'div[aria-label$="全屏"]',
		}
	}
]

function reg_event_handler(keymap)
{
	document.addEventListener('keyup', function (event) {
		// warn('event ', event)
		let sel = keymap[event.key];
		warn('sel ', sel);
		if (sel) {
			let element = document.querySelector(sel);
			element && element.click();
		}
	});
}

for (let skm of site_keymaps) {
	if (skm.url.test(location.href)) {
		reg_event_handler(skm.keymap);
	}
}

warn(`=== video-player-keyboard-shortcut on '${location.href}' ===`);
