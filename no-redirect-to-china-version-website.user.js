// ==UserScript==
// @name         Do not redirect to China Version Website
// @namespace    ATGT
// @version      0.2
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
		let close_btn = document.querySelector('#region_switcher .close-btn');
		console.log('close_btn', close_btn);
		setTimeout(() => { close_btn.click(); }, 500);
	}
	console.log(`=== /do not direct to china version web size ${location.host} ===`);
})();
