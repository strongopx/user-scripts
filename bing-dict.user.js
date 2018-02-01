// ==UserScript==
// @namespace ATGT
// @name     bing-dict
// @name:zh-CN     必应词典
// @description Select any word in any web to show it's definition from Bing Dict.
// @description:zh-CN 划词翻译，使用必应词典
// @version  1.3.3.1
// @match    http://*/*
// @match    https://*/*
// -match    https://github.com/*
// @grant    GM.xmlHttpRequest
// @connect  www.bing.com
// @icon     https://www.bing.com/favicon.ico
// @run-at   document-end
// ==/UserScript==

/*
Change Log:
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

console.log("!!!!!!!!!!!!!!!!!!!!!bing-dict!!!!!!!!!!!!!!!!!!!!!!!!");
(function () {
  (function addStyleSheet() {
    var style = document.createElement("STYLE");
    style.type = "text/css";
    var css = `
div#ATGT-bing-dict-result-wrapper-reset {
  all: initial;
  * {
  	all: initial;
  }
}
div#ATGT-bing-dict-result-wrapper {
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
div#ATGT-bing-dict-result-wrapper .dict-provider {
	font-size: xx-small;
	float: right;
	margin-left: 0.5rem;
/*
	position: absolute;
  top: 2px;
  right: 2px;
*/
}
div#ATGT-bing-dict-result-wrapper .search_suggest_area {
	font-size: xx-small;
}
div#ATGT-bing-dict-result-wrapper .error {
	color: red;
}
div#ATGT-bing-dict-result-wrapper .headword {
	font-weight: bold;
	font-size: medium;
}
div#ATGT-bing-dict-result-wrapper .div_title {
	font-weight: bold;
}
div#ATGT-bing-dict-result-wrapper .suggest_word {
	margin-right: 5px;
}
div#ATGT-bing-dict-result-wrapper .mach_trans {
	font-style: italic; 
	font-size: x-small;
}
div#ATGT-bing-dict-result-wrapper a:link {
	color: #37a;
	text-decoration: none;
}
div#ATGT-bing-dict-result-wrapper a:hover {
	color: white;
	background-color: #37a;
}
div#ATGT-bing-dict-result-wrapper .pronuce {
	color: gray;
}
div#ATGT-bing-dict-result-wrapper .mach_trans_result {
	color: gray;
}
div#ATGT-bing-dict-result-wrapper ul {
	list-style-type: none;
	padding: 1px;
	margin: 0px;
}
div#ATGT-bing-dict-result-wrapper ul li{
	margin-top: 1px;
}
div#ATGT-bing-dict-result-wrapper ul li span {
  float:left;
	color: white;
  background-color: gray;
  text-align: center;
  padding: 0 2px;
  margin-right: 3px;
}

`;
    style.appendChild(document.createTextNode(css));
    document.head.appendChild(style);
  })();
  
  var dictResultDiv = (function createDictResultDiv() {
    var div_wrapper_reset = document.createElement("DIV");
    div_wrapper_reset.id = "ATGT-bing-dict-result-wrapper-reset";
    var div = document.createElement("DIV");
    div.id = "ATGT-bing-dict-result-wrapper";
    div_wrapper_reset.appendChild(div);
    document.body.appendChild(div_wrapper_reset);
    return div;
  })();
  
  function setResult(defs) {
    dictResultDiv.innerHTML = defs;
  }

  var dictCache = {};
  var lastSearchWord = "";
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

  function escapeHtml (string) {
    return String(string).replace(/[&<>"'`=\/]/g, function (s) {
      return entityMap[s];
    });
  }
  
  var dictProvider = '<div class=dict-provider>Bing Dict</div>';
  
  function parseDefinition(page, url) {
    //console.log("parseDefinition");
    var qdef = page.querySelector(".qdef");
    //console.log("qdef ", qdef);
    var hd_area = qdef.childNodes[0];
    try {
      var headword = escapeHtml(hd_area.querySelector("#headword").innerText);
    } catch (e) {
      var headword = "";
    }
    
    var hd_pr = "";
    try { /* en to cn */
    	hd_pr = escapeHtml(hd_area.querySelector(".hd_prUS").innerText) 
      				+ "&emsp;" + escapeHtml(hd_area.querySelector(".hd_pr").innerText);
    } catch (e) {
    }
    try {
      if (!hd_pr) /* cn to en */
        hd_pr = escapeHtml(hd_area.querySelector(".hd_tf_lh").innerText);
    } catch (e) {
    }
    
    headword = "<div class='headword'>"
      + "<a href='"+url+"' target='_blank'>" + headword + "</a>"
      + "</div>";
    hd_pr = "<div class='pronuce'>" + hd_pr + "</div>";
    
    try {
      var def_area = qdef.childNodes[1];
      var def_list = def_area.querySelectorAll("li");
      var defs = "<ul>";
      for (var def of def_list) {
        defs += "<li><span>" + escapeHtml(def.childNodes[0].innerText) + "</span>"
          					+ escapeHtml(def.childNodes[1].innerText) + "</li>";
      }
      defs += "</ul>";
    } catch (e) {
      var defs = "";
    }

    return headword + hd_pr  + defs;
  }
  
  function parseMachTrans(page, url) {
    //console.log("parseMachTrans");
    var trans_area = page.querySelector(".lf_area");
    try {
    	var smt_hw_elem = trans_area.querySelector(".smt_hw");
      var smt_hw = escapeHtml(smt_hw_elem.innerText);
    	var headword_elem = smt_hw_elem.nextElementSibling;
      var headword = escapeHtml(headword_elem.innerText);
    	var trans_result_elem = headword_elem.nextElementSibling;
      var trans_result = escapeHtml(trans_result_elem.innerText);
    } catch (e) {
    }

    smt_hw = "<div class='mach_trans'>" + smt_hw + "</div>";
    headword = "<div class='headsentence'>"
      +"<a href='"+url+"' target='_blank'>" + headword + "</a>"
      +"</div>";
    trans_result = "<div class='mach_trans_result'>" + trans_result + "</div>";
    
    return smt_hw + headword + trans_result;
  }
  
  function parseBingDymArea(dym) {
    var suggest = escapeHtml(dym.querySelector(".df_wb_a").innerText);
    suggest = "<div class='div_title'>"+suggest+"</div>";
    var defs = "<ul>";
    for (var s of dym.querySelectorAll(".df_wb_c")) {
      var r0 = s.childNodes[0];
      var r1 = s.childNodes[1];
      defs += "<li><a class='suggest_word' href='" 
        		+ "//www.bing.com" + r0.pathname + r0.search + "'>" 
        		+ escapeHtml(r0.innerText) + "</a>"
      			+ escapeHtml(r1.innerText) + "</li>";
    }
    defs += "</ul>";
    return suggest + defs;
  }
  
  function parseSearchSuggest(page, url) {
    //console.log("parseSearchSuggest");
    var trans_area = page.querySelector(".lf_area");
    var headword = escapeHtml(trans_area.querySelector(".dym_p").innerText);
    var suggest = escapeHtml(trans_area.querySelector(".p2-2").innerText);
    headword = "<div class='headword'><a href='" + url + "'>" + headword + "</a></div>";
    suggest = "<div class='div_title'>" + suggest + "</div>";
    var defs = "";
    for (var dym of trans_area.querySelectorAll(".dym_area")) {
      defs += parseBingDymArea(dym);
    }
    
    return "<div class='search_suggest_area'>" + headword +  suggest + defs + "</div>";
  }

  function parseDictResultDom(page, url) {
    //console.log("page ", page);
    var qdef = page.querySelector(".qdef");
    var smt_hw = page.querySelector(".smt_hw");
    var search_suggest = page.querySelector(".dym_area") && page.querySelector(".df_wb_c");
    //var no_result = page.querySelector(".no_results");
    if (qdef)
      return parseDefinition(page, url);
		else if (smt_hw)
      return parseMachTrans(page, url);
    else if (search_suggest)
      return parseSearchSuggest(page, url);
    else
      return "";
  }
  
  const fallback_message = "No result.<br />Try <a href='https://www.bing.com/translator' target=_blank>Microsoft Translator</a>.";

  function parseDictResult(word, response) {
    //console.log("search dict ok", response);
    var url = response.finalUrl;
    try {
      var parser = new DOMParser();
      var doc = parser.parseFromString(response.responseText, "text/html");
      var defs = parseDictResultDom(doc, url);
      if (!defs)
        defs = fallback_message;
      defs = dictProvider + defs;
      dictCache[word] = defs;
    } catch (e){
      console.log("parseDictResult failed:\n " +  e.stack);
      var defs = "<span class='error'>Error</span> parsing result of <a href='" + url + "'>" 
        		+ escapeHtml(word) + "</a>, <br />" + fallback_message;
    }
    
    setResult(defs);
  }
  
  function searchDictFail(word, response) {
    //console.log("search dict fail ", response);
    var url = response.finalUrl;
    var status = (response.status ? response.status : "")
    							+ " " + (response.statusText ? response.statusText : "");
    setResult("<span class='error'>Error</span> searching <a href='" + url + "'>" +  escapeHtml(word) + "</a>, "
              + status + "<br />"
              + fallback_message);
  }

  function searchBingDict(word) {
    word = word.replace(/^\s*|\s*$/g, "");
    if (word.length == 0) {
      setResult("");
      lastSearchWord = "";
      return;
    }
    if (word in dictCache && dictCache[word]) {
      console.log("cache hit \"", word, "\"");
      if (lastSearchWord != word) {
        setResult(dictCache[word]);
        lastSearchWord = word;
      }
      return;
    } else {
      console.log("cache miss");
    }
    var url = "http://www.bing.com/dict/search?q=" + encodeURIComponent(word);
    console.log(url);
    setResult("Searching <a href='" + url + "'>" +  escapeHtml(word) + "</a>");
    
    GM.xmlHttpRequest({
      url : url,
      method : "GET",
      onload : (response) => parseDictResult(word, response),
      onerror : (response) => searchDictFail(word, response),
    });
  }

  document.addEventListener("mouseup", function (event) {
    var divRect = dictResultDiv.getBoundingClientRect();
		if (event.clientX >= divRect.left && event.clientX <= divRect.right &&
      event.clientY >= divRect.top && event.clientY <= divRect.bottom) {
      // Mouse is inside result element, do nothing.
      return;
    }
    
    var sel = window.getSelection().toString();
    console.log("selected: \"", sel, "\"");
    searchBingDict(sel);
  });
  
  function dictTest() {
    var testWords = ["hello",  // word definition
                     "hello, this is world", //machine translation
                     "ndalo", // ambigous
                     "DNS queries", // example sentence only
                     "<script>", // html escape
                     "",
                     "overrideMimeType", // no result
                    ];
    for (var i=0; i<testWords.length; i++) {
    	setTimeout(searchBingDict, i*1500, testWords[i]);
    }
  }
  // dictTest();
  
})();
console.log("!!!!!!!!!!!!!!!!!!!!!/bing-dict!!!!!!!!!!!!!!!!!!!!!!!!");
