// ==UserScript==
// @name         Do not redirect to China Version Website
// @namespace    ATGT
// @version      0.3
// @description  try to take over the world!
// @author       You
// @match        *://*.leetcode-cn.com/*
// @match        *://*.leetcode.com/*
// @grant        none
// @run-at		 document-end
// ==/UserScript==

(function() {
	console.log(`=== do not direct to china version web size ${location.host} ===`);
	'use strict';
	if (/leetcode-cn.com$/.test(location.host)) {
		console.log('redirect to leetcode.com');
		location.host = location.host.replace(/leetcode-cn.com$/, 'leetcode.com');
		console.log('new location ', location.host);
	} else if (/leetcode.com$/.test(location.host)) {
		setTimeout(() => {
			// close banner on main page
			let btn = document.querySelector('#region_switcher .close-btn');
			if (btn)
				btn.click();

		}, 500);
		setTimeout(() => {
			// close banner on problems page
			let btn = document.querySelector('#CNbanner .cn_close_btn');
			if (btn)
				btn.click();
		}, 1500);

	}
	console.log(`=== /do not direct to china version web size ${location.host} ===`);
})();
