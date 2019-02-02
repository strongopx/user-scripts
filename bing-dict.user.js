// ==UserScript==
// @namespace      ATGT
// @name           Bing Dict, with pronunciation
// @name:zh-CN     必应词典，带英语发音
// @description    Translate selected words by Bing Dict(Dictionary support EN to CN, CN to EN), with EN pronunciation, with CN pinyin, translation is disabled by default, check the 'Bing Dict' at bottom left to enable tranlation.
// @description:zh-CN 划词翻译，使用必应词典(支持英汉、汉英)，带英语发音，带中文拼音，默认不开启翻译，勾选左下角的'Bing Dict'开启翻译。
// @version  1.4.3.1
// @author StrongOp
// @supportURL  https://github.com/strongop/user-scripts/issues
// @match    http://*/*
// @match    https://*/*
// -match    https://github.com/*
// @require  https://greasemonkey.github.io/gm4-polyfill/gm4-polyfill.js
// @grant    GM.xmlHttpRequest
// @grant    GM_xmlhttpRequest
// @grant    GM.setValue
// @grant    GM.getValue
// @grant    GM_setValue
// @grant    GM_getValue
// @connect  www.bing.com
// @icon     https://www.bing.com/favicon.ico
// @run-at   document-end
// ==/UserScript==

/* eslint: */
/* global GM GM_xmlhttpRequest GM_setValue GM_getValue */

/*
Change Log:
v1.4.1:
    31 Jan 2019, Refactor with class, Add pronunciation support.
v1.3.8:
	30 Jan 2019, Need user click on checkbox to enable translate.
v1.3.5:
	21 Dec 2018, Fix GM_xmlhttpRequest not def in Greasemonkey, GM not define in Tampermonkey
v1.3.4:
    28 Nov 2018, Fix GM.xmlHttpRequest not def in chrome.
v1.3.3:
	28 Jan 2018, Fix dict provider overlap with result.
  	    		 Add test cases.
v1.3.2:
	27 Jan 2018, Add dict provider name: Bing Dict.
v1.3.1:
	19 Jan 2018, Escape suggested words.
v1.3:
	19 Jan 2018, refactor & parse search suggestion.
v1.2:
	14 Jan 2018, Escape search word and result.
v1.1:
	13 Jan 2018, Reset style for result div.
v1.0:
	12 Jan 2018, Initial version.
*/

/*
if (typeof GM_xmlhttpRequest !== 'undefined')
    var GM = {
        setValue: GM_setValue,
        getValue: GM_getValue
    };
*/
console.log('!!!!!!!!!!!!!!!!!!!!!bing-dict!!!!!!!!!!!!!!!!!!!!!!!!');
let dict_result_id = 'ATGT-bing-dict-result-wrapper';
const DICT_RESULT_CSS = `
    div#${dict_result_id}-reset {
        all: initial;
        * {
            all: initial;
        }
    }
    div#${dict_result_id} {
        all: initial;
        div, img, a, input, span, ul, li {
            all: initial;
        }
    }
    div#${dict_result_id} {
        display: block;
        position: fixed;
        left: 2px;
        bottom: 2px;
        max-width: 32%;
        z-index: 2100000000;
        padding: 0;
        margin: 0;
        color: black;
        background-color: rgba(255,255,255,0.9);
        font-size: small;
        font-family: sans-serif;
        white-space: normal;
    }
    div#${dict_result_id} .dict-provider {
        font-size: xx-small;
        float: right;
        margin-left: 0.5rem;
        /*
        position: absolute;
        top: 2px;
        right: 2px;
        */
    }
    div#${dict_result_id} .dict-provider input {
        display: inline;
        vertical-align: bottom;
        transform: scale(0.7);
        margin: 0 0;
        border: solid 1px;
        -webkit-appearance: checkbox;
    }
    div#${dict_result_id} .search_suggest_area {
        font-size: xx-small;
    }
    div#${dict_result_id} .error {
        color: red;
    }
    div#${dict_result_id} .headword {
        color: #37a;
        font-weight: bold;
        font-size: medium;
    }
    div#${dict_result_id} .div_title {
        font-weight: bold;
    }
    div#${dict_result_id} .suggest_word {
        margin-right: 5px;
    }
    div#${dict_result_id} .mach_trans {
        font-style: italic;
        font-size: x-small;
    }
    div#${dict_result_id} a:link {
        color: #37a;
        text-decoration: none;
    }
    div#${dict_result_id} a:hover {
        color: white;
        background-color: #37a;
    }
    div#${dict_result_id} a:visited {
        color: #37a;
    }
    div#${dict_result_id} .pronuce {
        color: gray;
    }
    div#${dict_result_id} .pronuce audio {
        display: inline;
    }
    div#${dict_result_id} .pronuce a {
        width: initial;
        height: initial;
    }
    div#${dict_result_id} .pronuce a:hover {
        color: white;
        background-color: white;
    }
    div#${dict_result_id} .mach_trans_result {
        color: gray;
    }
    div#${dict_result_id} ul {
        list-style-type: none;
        padding: 1px;
        margin: 0px;
    }
    div#${dict_result_id} ul li{
        margin-top: 1px;
    }
    div#${dict_result_id} ul li span {
        float:left;
        color: white;
        background-color: gray;
        text-align: center;
        padding: 0 2px;
        margin-right: 3px;
    }
	div#${dict_result_id} a img.audioPlayer:hover {
		opacity: 0.8;
	}
	div#${dict_result_id} img.audioPlayer {
		width: 1em;
		height: 1em;
	}
`;

class DictResultView {
	//dictResultDiv;
	constructor(prefs) {
		this.prefs = prefs;
		this.addStyleSheet();
		this.createDictResultDiv();
		this.transEnableShown = false;
	}

	addStyleSheet() {
		let style = document.createElement('STYLE');
		style.type = 'text/css';
		style.appendChild(document.createTextNode(DICT_RESULT_CSS));
		document.head.appendChild(style);
	}
	createDictResultDiv() {
		this.addStyleSheet();
		let div_wrapper_reset = document.createElement('DIV');
		div_wrapper_reset.id = `${dict_result_id}-reset`;
		let div = document.createElement('DIV');
		div.id = `${dict_result_id}`;
		div_wrapper_reset.appendChild(div);
		document.body.appendChild(div_wrapper_reset);
		this.dictResultDiv = div;
	}

	setProvider(provider) {
		this.dictProvider = provider;
	}

	setResult(defs) {
		this.dictResultDiv.innerHTML = this.dictProvider + defs;
		this.dictResultDiv.style.display = 'block';
		this.showEnableTransChoice();
	}
	hideResult() {
		this.dictResultDiv.style.display = 'none';
		this.transEnableShown = false;
	}

	mouseEventInView(event) {
		// if Mouse is inside result element
		let divRect = this.dictResultDiv.getBoundingClientRect();
		let isInView = (event.clientX >= divRect.left && event.clientX <= divRect.right &&
			event.clientY >= divRect.top && event.clientY <= divRect.bottom);
		if (isInView)
			console.log('mouse in result area');
		return isInView;
	}
	mouseEventInDictProviderBanner(event) {
		// if Mouse is inside dict provider to enable/disable tranlation
		try {
			let divRect = this.dictResultDiv.querySelector(`.dict-provider`).getBoundingClientRect();
			let isInView = (event.clientX >= divRect.left && event.clientX <= divRect.right &&
				event.clientY >= divRect.top && event.clientY <= divRect.bottom);
			if (isInView)
				console.log('mouse in dict provider banner');
			return isInView;
		} catch (e) {
			return false;
		}
	}
	showEnableTransChoice() {
		this.transEnableShown = true;
		let prefs = this.prefs;
		let view = this;
		function enableTransChoiceHandler(event) {
			console.log('enableTransChoiceHandler called, translate enable ', event.target.checked);
			prefs.updateTransEnabledList(location.host, !!event.target.checked);
			prefs.transEnabledOnPage = event.target.checked;
			if (prefs.transEnabledOnPage && CurrentSelWord.length > 0)
				setTimeout(bingDict.search.bind(bingDict), 0, CurrentSelWord);
			else
				view.hideResult();
		}
		let enableCheckbox = document.querySelector(`div#${dict_result_id} input#enableTrans`);
		enableCheckbox.checked = this.prefs.transEnabledOnPage;
		enableCheckbox.onclick = enableTransChoiceHandler;
	}

}

var dictCache = {};
var entityMap = {
	'&': '&amp;',
	'<': '&lt;',
	'>': '&gt;',
	'"': '&quot;',
	"'": '&#39;',
	'/': '&#x2F;',
	'`': '&#x60;',
	'=': '&#x3D;'
};

function escapeHtml(string) {
	return String(string).replace(/[&<>"'`=/]/g, function (s) {
		return entityMap[s];
	});
}

class DictProvider {
	//resultView;
	constructor(resultView) {
		this.resultView = resultView;
		let dictProvider = '<div class="dict-provider"><input type="checkbox" id="enableTrans" name="enableTrans"><label for="enableTrans">No Dict Provider</label></div>';
		this.resultView.setProvider(dictProvider);
	}
	search(word) {
		console.log(`base DictProvider::search ${word}`);
		return 'not implement yet.';
	}
}

class BingDictProvider extends DictProvider {
	constructor(resultView) {
		super(resultView);
		let dictProvider = '<div class="dict-provider"><input type="checkbox" id="enableTrans" name="enableTrans"><label for="enableTrans">Bing Dict</label></div>';
		this.resultView.setProvider(dictProvider);
		this.baseURL = 'https://www.bing.com/';
	}

	search(word) {
		let self = this;
		/*
		function playAudio(audioLink) {
			let audio = new Audio(audioLink);
			audio.play();
		}*/
		function parseVoiceLink(elem, id_prefix) {
			let voiceLink;
			//let voiceIcon;
			try {
				let linkElem = elem.childNodes[0];
				//console.log('PronuceLink', linkElem);
				let handler = linkElem.attributes['onclick'].value;
				let matches = handler.match(/'(https?:\/\/[^ ']*)'\s*,\s*'([^']*)'/m);
				//console.log('matches', matches);
				voiceLink = matches[1];
				//voiceIcon = matches[2];
			} catch (e) {
				console.log('parseVoiceLink', e);
			}
			let id = `${id_prefix}_${Math.random()}`;
			let speakerIcon = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABoAAAAZCAYAAAAv3j5gAAAABmJLR0QA/wD/AP+gvaeTAAAACXBIWXMAAA3XAAAN1wFCKJt4AAAAB3RJTUUH4wICACYBOBTr1QAAAvZJREFUSMed1k2IVlUYB/Dfe8dRabqS9mFiEn3ZqQxC2lQU5a6FEBE4tAhaJUqrK0HRxkWLoBNupJA2UlCuigipdtXCwCyirEsLw4omM8aak5jizNui5x1ub+/YzDxwuefc8/F//s/n7VlA+vvv0Nt9HJSctuENNDhUN+3cqDO/70vGZv8Z102r5DQ/rkYdKDnp7T6u5DRectqJ97EBD2BsIeUuXpyDFdhaclpbN+38WjUKpLNhF17BeMxvGHVmIFft+Q4ewqd4tuQ0PmBWdQE6lFeXnPZi39Bd16I3rNiQXBmK7cS2/5huwKLktB3v4fkRSm8cwagX59bG/F28hho7Sk5rYEXJqcKLuB03hS/WLGCd1SPM3C85PYVnSk731k17quR0EE/gMbyAmQrPYQ8exq2XAIHLB4wGviw5TeBJ3IhXY98JfBSstpScehW2d02wBKlKTusxi/04i0dKTtfhZ3wZ++7DWIWblwiwKgLgLnyFl/AWTsf6ZPj7+5hvGQCtWyLQxnhfj6tD4zU42mEAv+H8ICUqS5e50PjzMNEtWN8x1eZ4z+BPXIPecoDmAXEGl0XenIrvg2A6H8+ES2X5ImQlNmE6LuwNBVW/U32Wx6jk1MPdof3X+DXMB390FBnHOfSXBVQ3bR8f420crpt2OoDh23hPhFmn0V+BC4G+WPkrwKbwaDDcgHti/YNOzZvAMcxV+GmJhH4ZUUx3RahP49BQGrQDoKPL8FG3lcBhTOHpumlnSk7ronaKljFbYS9OLhJjFv1OpR/47Aju77DZgAdjfKxu2rkqqN0WBXNrZ/MoudAJ2+F2faJu2tmS0yrsiET9MJiqIoLO4WzdtF/UTTsZLXtqBNDJLlC3j3U/4fEYH6yb9vR8wtZN22186qb9BHfi+NAlZ4aBRv2j4GUcwDsLdOF/t+eS06aS05GSUz+eN0tOKxcZMFX3rmqBhNQ/sFndtD9iEq/H0jcREJeMyLhjrhudvUVqd0X8aHyGH0b45X/lb9cUC+N7uVGjAAAAAElFTkSuQmCC';
			let voiceHTML = `<audio id="${id}" src="${voiceLink}" preload="auto"></audio>
<a onclick="javascript: document.getElementById('${id}').play()" onmouseover="javascript: document.getElementById('${id}').play()">
<img class="audioPlayer" src="${speakerIcon}"></img></a>`;
			return voiceHTML;
		}
		function parsePronuce(elem) {
			let prUS = elem.querySelector('.hd_prUS');
			let prUK = elem.querySelector('.hd_pr');
			let pronText = '';
			if (prUS)
				pronText = escapeHtml(prUS.innerText) + parseVoiceLink(prUS.nextElementSibling, 'voiceUS') +
					'&emsp;' + escapeHtml(prUK.innerText) + parseVoiceLink(prUK.nextElementSibling, 'voiceUK');
			else
				pronText = escapeHtml(elem.innerText);
			return pronText;
		}
		function parseDefinition(page, url) {
			//console.log('parseDefinition');
			let qdef = page.querySelector('.qdef');
			//console.log('qdef ', qdef);
			let hd_area = qdef.childNodes[0];
			let headword = '';
			let pronuce = '';
			try {
				headword = escapeHtml(hd_area.querySelector('#headword').innerText);
				pronuce = parsePronuce(hd_area.querySelector('.hd_tf_lh'));
			} catch (e) { }


			headword = `<div class='headword'>
                <a href='${url}' target='_blank'>${headword ? headword : word}</a>
                </div>`;
			pronuce = `<div class='pronuce'>${pronuce}</div>`;

			let defs = '';
			try {
				let def_area = qdef.childNodes[1];
				let def_list = def_area.querySelectorAll('li');
				defs = '<ul>';
				for (let def of def_list) {
					defs += `<li><span>${escapeHtml(def.childNodes[0].innerText)}</span>
						${escapeHtml(def.childNodes[1].innerText)}</li>`;
				}
				defs += '</ul>';
			} catch (e) {
				defs = '';
			}

			return headword + pronuce + defs;
		}

		function parseMachTrans(page, url) {
			//console.log('parseMachTrans');
			try {
				let trans_area = page.querySelector('.lf_area');
				let smt_hw_elem = trans_area.querySelector('.smt_hw');
				let smt_hw = escapeHtml(smt_hw_elem.innerText);
				let headword = escapeHtml(smt_hw_elem.nextElementSibling.innerText);
				let trans_result = escapeHtml(smt_hw_elem.nextElementSibling.nextElementSibling.innerText);
				smt_hw = `<div class='mach_trans'>${smt_hw}</div>`;
				headword = `<div class='headsentence'>
                    <a href='${url}' target='_blank'>${headword}</a>
                    </div>`;
				trans_result = `<div class='mach_trans_result'>${trans_result}</div>`;

				return smt_hw + headword + trans_result;
			} catch (e) {
				console.error('parseMachTrans error');
				return '';
			}
		}

		function parseBingDymArea(dym) {
			let suggest = escapeHtml(dym.querySelector('.df_wb_a').innerText);
			suggest = `<div class='div_title'>${suggest}</div>`;
			let defs = '<ul>';
			for (let s of dym.querySelectorAll('.df_wb_c')) {
				let r0 = s.childNodes[0];
				let r1 = s.childNodes[1];
				defs += `<li><a class='suggest_word' href='//www.bing.com${r0.pathname}${r0.search}'>` +
					`${escapeHtml(r0.innerText)}</a>${escapeHtml(r1.innerText)}</li>`;
			}
			defs += '</ul>';
			return suggest + defs;
		}

		function parseSearchSuggest(page, url) {
			//console.log('parseSearchSuggest');
			let trans_area = page.querySelector('.lf_area');
			let headword = escapeHtml(trans_area.querySelector('.dym_p').innerText);
			let suggest = escapeHtml(trans_area.querySelector('.p2-2').innerText);
			headword = `<div class='headword'><a href='${url}'>${headword}</a></div>`;
			suggest = `<div class='div_title'>${suggest}</div>`;
			let defs = '';
			for (let dym of trans_area.querySelectorAll('.dym_area')) {
				defs += parseBingDymArea(dym);
			}

			return `<div class='search_suggest_area'>${headword}${suggest}${defs}</div>`;
		}

		function parseDictResultDom(page, url) {
			//console.log('page ', page);
			let qdef = page.querySelector('.qdef');
			let smt_hw = page.querySelector('.smt_hw');
			let search_suggest = page.querySelector('.dym_area') && page.querySelector('.df_wb_c');
			//let no_result = page.querySelector('.no_results');
			if (qdef)
				return parseDefinition(page, url);
			else if (smt_hw)
				return parseMachTrans(page, url);
			else if (search_suggest)
				return parseSearchSuggest(page, url);
			else
				return '';
		}

		const FAILURE_MSG = `No result.<br />Try <a href='https://www.bing.com/translator' target=_blank>Microsoft Translator</a>.`;

		function parseDictResult(word, response) {
			//console.log('search dict ok', response);
			let defs = '';
			let url = response.finalUrl;
			try {
				let doc = (new DOMParser()).parseFromString(response.responseText, 'text/html');
				defs = parseDictResultDom(doc, url);
				if (!defs)
					defs = FAILURE_MSG;
				dictCache[word] = defs;
			} catch (e) {
				console.log('parseDictResult failed:\n ', e, e.stack);
				defs = `<span class='error'>Error</span> parsing result of <a href='${url}'>` +
					`${escapeHtml(word)}</a>, <br />${FAILURE_MSG}`;
			}

			self.resultView.setResult(defs);
		}

		function searchDictFail(word, response) {
			//console.log('search dict fail ', response);
			let url = response.finalUrl;
			let status = (response.status ? response.status : '')
				+ ' ' + (response.statusText ? response.statusText : '');

			self.resultView.setResult(`<span class='error'>Error</span>searching <a href='${url}'>${escapeHtml(word)}</a>,` +
				`${status}<br />${FAILURE_MSG}`);
		}

		function searchBingDict(word) {
			if (word in dictCache && dictCache[word]) {
				//console.log(`cache hit '${word}'`);
				self.resultView.setResult(dictCache[word]);
				return;
			} else {
				//console.log('cache miss');
			}
			let url = 'http://www.bing.com/dict/search?q=' + encodeURIComponent(word);
			console.log(url);
			self.resultView.setResult(`Searching <a href='${url}' target='_blank'>${escapeHtml(word)}</a>`);

			(typeof GM_xmlhttpRequest != 'undefined' && GM_xmlhttpRequest || GM.xmlHttpRequest)({
				url: url,
				method: 'GET',
				onload: (response) => parseDictResult(word, response),
				onerror: (response) => searchDictFail(word, response),
			});
		}

		searchBingDict(word);
	}
}

var CurrentSelWord = '';

class DictPrefs {
	constructor() {
		this.transEnabledOnPage = false;
	}
	updateTransEnabledList(key, value) {
		GM.getValue('transEnabledList', {}).then((transEnabledList) => {
			console.log(`update ${key} => ${value} into transEnabledList`, transEnabledList);
			transEnabledList[key] = value;
			GM.setValue('transEnabledList', transEnabledList);
			//console.log(`updated ${key} => ${value} into transEnabledList`, transEnabledList);
		});
	}
	checkEnableTrans() {
		GM.getValue('transEnabledList', {}).then((transEnabledList) => {
			console.log('transEnabledList', transEnabledList);
			if (!transEnabledList)
				return;
			if (typeof transEnabledList === 'string')
				GM.setValue('transEnabledList', {});
			if (transEnabledList[location.host] === true)
				this.transEnabledOnPage = true;
		});
	}
}
var dictPrefs = new DictPrefs();
dictPrefs.checkEnableTrans();

var dictResultView = new DictResultView(dictPrefs);
var bingDict = new BingDictProvider(dictResultView);

document.addEventListener('mouseup', function (event) {
	// click on enable/disable translation area
	if (dictResultView.mouseEventInDictProviderBanner(event))
		return;
	CurrentSelWord = window.getSelection().toString().replace(/^\s*|\s*$/g, '');
	console.log(`selected: '${CurrentSelWord}', length ${CurrentSelWord.length}`);
	// click on page other than result view hides the result view
	if (!dictResultView.mouseEventInView(event) && CurrentSelWord.length == 0) {
		dictResultView.hideResult();
		return;
	}
	// show enable translate option if not enabled
	if (!dictPrefs.transEnabledOnPage) {
		if (!dictResultView.transEnableShown)
			dictResultView.setResult('');
		console.log('translate not enabled.');
		return;
	}
	// return if click on result view
	if (dictResultView.mouseEventInView(event) && CurrentSelWord.length == 0) {
		return;
	}
	bingDict.search(CurrentSelWord);
});

function dictTest() {
	let testWords = [
		'tunnel',
		'hello',  // word definition
		'你好',
		'hello, this is world', //machine translation
		'ndalo', // ambigous
		'DNS queries', // example sentence only
		'<script>', // html escape
		'',
		'overrideMimeType', // no result
	];
	for (let i = 0; i < testWords.length; i++) {
		setTimeout(bingDict.search.bind(bingDict), i * 3000, testWords[i]);
	}
	alert(
		`
		/*TODO:
		* 1. Translation enable/disable test.
		* 2. Audio/voice test.
		*/
		`);
}
//dictTest();

console.log('!!!!!!!!!!!!!!!!!!!!!/bing-dict!!!!!!!!!!!!!!!!!!!!!!!!');
