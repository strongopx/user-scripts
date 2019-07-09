// ==UserScript==
// @name         Saraba1st 2b, try something new, something not familiar!!!
// @namespace    ATGT
// @version      0.1
// @description  try to take over the world!
// @author       Bob
// @match        *://bbs.saraba1st.com/2b/forum.php*
// @match        *://bbs.saraba1st.com/2b/forum*.html
// @match        *://bbs.saraba1st.com/2b/thread*.html
// @grant        none
// @run-at       document-end
// ==/UserScript==

function main_saraba1st() {
    'use strict';
	let q = document.querySelector.bind(document);
	let qa = document.querySelectorAll.bind(document);

	function getRandomInt(min, max) {
		min = Math.ceil(min);
		max = Math.floor(max);
		return Math.floor(Math.random() * (max - min)) + min; //The maximum is exclusive and the minimum is inclusive
	}

	if (/^https?:\/\/bbs\.saraba1st\.com\/2b\/forum\.php/.test(location.href)) {
		//return;
		let forumList = qa("#category_1 table tr > td > div > a");
		let randIdx = getRandomInt(0, forumList.length);
		console.log("random forum", randIdx, " / ", forumList.length);
		let randForum = forumList[randIdx];
		randForum.scrollIntoView({behavior: "smooth", block: "nearest", inline: "nearest"});
		setTimeout(() => {
			randForum.click();
		}, getRandomInt(1, 4) * 1000);

	} else if (/^https?:\/\/bbs\.saraba1st\.com\/2b\/forum/.test(location.href)) {
		let r = getRandomInt(0, 8);
		console.log("forum goto main page r ", r);
		if (r == 4) {
			console.log("*** goto main page");
			location.pathname = "/2b/";
			return;
		}
		setTimeout(() => {
			q("#threadlist").scrollIntoView({behavior: "smooth", block: "nearest", inline: "nearest"});
			let thList =  qa("#threadlisttableid th.new a.s.xst, #threadlisttableid th.common a.s.xst");
			console.log("thread count", thList.length);
			let randIdx = getRandomInt(0, thList.length);
			let randTh = thList[randIdx];
			console.log("rand thread", randIdx, randTh);
			randTh.scrollIntoView({behavior: "smooth", block: "nearest", inline: "nearest"});

			setTimeout(() => {
				randTh.click();
			}, getRandomInt(5, 100) * 1000);
		}, getRandomInt(1, 3) * 1000);
	} else if (/^https?:\/\/bbs\.saraba1st\.com\/2b\/thread/.test(location.href)) {
		let postList =  qa("#postlist div[id^=post_]");
		console.log("post count", postList.length);
		let randIdx = 0;
		function jumpToForum() {
			q("#visitedforums a").click();
		}
		function scrollToPost(randIdx) {
			let randPost = postList[randIdx];
			randPost.scrollIntoView({behavior: "smooth", block: "nearest", inline: "nearest"});
			randIdx += getRandomInt(1, 4);
			if (randIdx < postList.length) {
				setTimeout(scrollToPost, getRandomInt(1, 5) * 1000, randIdx);
			} else {
				document.body.scrollIntoView(true);
				setTimeout(jumpToForum, getRandomInt(1, 5) * 1000);
			}
		}
		setTimeout(scrollToPost, getRandomInt(1, 5) * 1000, randIdx);
	}
}

try {
	main_saraba1st();
} catch (e) {
	console.log("*** error occured, reload", e);
	location.pathname = "/2b/";
}
