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

	function min(a, b) {
		return a < b ? a : b;
	}
	function max(a, b) {
		return a > b ? a : b;
	}

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
			let jumpDelay = getRandomInt(5, 30) * 1000;
			console.log("dump to thread delay", jumpDelay);
			setTimeout(() => {
				randTh.click();
			}, jumpDelay);
		}, getRandomInt(1, 3) * 1000);
	} else if (/^https?:\/\/bbs\.saraba1st\.com\/2b\/thread/.test(location.href)) {
		let postList =  qa("#postlist div[id^=post_]");
		console.log("post count", postList.length);
		let randIdx = 0;
		function jumpToForum() {
			q("#visitedforums a").click();
		}
		function calcReadingTime(elem) {
			return Math.ceil(elem.textContent.length / 8 * 1000);
		}
		function getNodeTopOffset(node) {
			let range = document.createRange();
			range.selectNodeContents(node);
			let rects = range.getClientRects();
			if (rects.length > 0) {
				//console.log("node rect: ", rects[0]);
				return rects[0];
			}
		}
		function textNodesUnder(el){
			var n, a = [], walk = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, null, false);
			while(n = walk.nextNode()) a.push(n);
			return a;
		}

		function textImgNodesUnder(el){
			let n;
			let nodeList = [];
			let walk=document.createTreeWalker(el,
											   NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
											   { acceptNode: function(node) {
												   if (node.nodeName == '#text' || node.nodeName == 'IMG')
													   return NodeFilter.FILTER_ACCEPT;
											     }
											   },
											   false);
			while(n = walk.nextNode())
				nodeList.push(n);
			return nodeList;
		}

		function scrollPageForReading(progress) {
			//console.log("progress", progress);
			if (progress.lineIdx >= progress.lines.length) {
				setTimeout(scrollToPost, 100, progress.randIdx);
				return;
			}
			let line = progress.lines[progress.lineIdx];
			if (line.nodeName == "BR" && line.previousSibling)
				line = line.previousSibling;
			let rect = getNodeTopOffset(line);
			if (rect && (progress.ScrollAccum == 0 || line.nodeName == 'IMG')) {
				console.log("do scroll");
				window.scrollTo(window.scrollX + rect.x, window.scrollY + rect.y - 50);
			}
			progress.ScrollAccum = (progress.ScrollAccum + 1) % 8;

			//console.log("current line", line.textContent);
			let nextScroll = calcReadingTime(line);
			if (line.nodeName == 'IMG') {
				console.log("*** IMG");
				nextScroll = max(2000, nextScroll);
				progress.ScrollAccum = 0;
			}
			progress.lineIdx++;
			console.log("next scroll ", nextScroll);
			setTimeout(scrollPageForReading, nextScroll, progress);
		}
		/* function getFontSize(el) {
			//var el = document.getElementById('foo');
			var style = window.getComputedStyle(el, null).getPropertyValue('font-size');
			var fontSize = parseFloat(style);
		} */
		function scrollToPost(randIdx) {
			let randPost = postList[randIdx];
			randPost.scrollIntoView({behavior: "smooth", block: "nearest", inline: "nearest"});
			let readingTime = 3000;
			let postMsg = randPost.querySelector("[id^=postmessage_]");
			let lineCount = 1;
			let lines = [];
			if (postMsg) {
				readingTime = calcReadingTime(postMsg);
				lineCount = max(readingTime/8000, lineCount);
				/* lines = qa("#" + postMsg.id + "> div, " +
							   "#" + postMsg.id + " > br, " +
							   "#" + postMsg.id + " > div br, " +
							   "#" + postMsg.id + " img"); */
				lines = textImgNodesUnder(postMsg);
				if (lines.length > lineCount)
					lineCount = lines.length;
				console.log("post msg", postMsg.innerText);
				console.log("post lines ", lines.length);
			}
			console.log("reading time", readingTime/1000);
			randIdx += getRandomInt(1, 4);
			if (randIdx < postList.length) {
				setTimeout(scrollPageForReading, 0, {
					randIdx: randIdx,
					currentTime: 0,
					readingTime: readingTime,
					lines: lines,
					lineIdx: 0,
					ScrollAccum: 0,
				});
				//setTimeout(scrollToPost, readingTime, randIdx);
			} else {
				document.body.scrollIntoView(true);
				setTimeout(jumpToForum, getRandomInt(1, 5) * 1000);
				// warning: for debug
			}
		}
		setTimeout(scrollToPost, 500, randIdx);
	}
}

try {
	main_saraba1st();
} catch (e) {
	console.log("*** error occured, reload", e);
	location.pathname = "/2b/";
}
