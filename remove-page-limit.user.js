// ==UserScript==
// @namespace ATGT
// @name     remove page limit
// @name:zh-CN     解除网页限制
// @description 	Remove various page limit, check the code for the page list.
//		quora.com: Remove login page
//		360doc.com: Remove copy limit
//		wenku.baidu.com: Remove copy limit
//		baidu.com: Remove baidu calculator select limit
// How to remove other web page's copy or select limit:
//		1. Add domain to @match *://*.your.domain/*
//		2. Add you handlers to variable `pageHandlers' below
//		3. Modify the handlers' memebers
// @description:zh-CN 	解除各种网页限制。网页列表，请查看源代码。
// 怎么移除其它网页的限制：
//		1. 将域名加到下面：// @match *://*.your.domain/*
//		2. 将解除类型加到 `pageHandlers' 这个数组
//		3. 指明解除方法
// @version  1.4.3
// @match    *://*.quora.com/*
// @match    *://*.360doc.com/*
// @match    *://*.baidu.com/*
// @match    *://*.z3z4.com/*
// @match    *://*.sdifen.com/*
// @match    *://*.popbee.com/*
// @run-at   document-start
// ==/UserScript==

/*
ChangeLog:
v1.4.3:
	30 Jun 2019, Try remove all limit by default, may not work for all sites.
v1.4:
	27 Nov 2018, Add wenku.baidu.com
v1.3:
	29 Jan 2018, Added generic functions:
  							1. Intercept event handlers.
                2. Wait for some node and do the unlock
v1.1:
	someday, Enable user select.
v1:
	someday, Remove quora login page.

*/

console.log("!!!!!!!!!!!!!!!!!!!!!unlock-page!!!!!!!!!!!!!!!!!!!!!!!!");
(function () {

  var pageHandlers = [
    /* !!! Need to add the global match to @include also */
    /* Formats:
     *		[ /domain name regex/, [ selector-string or node-object, event-type, event-handler, delay-ms-before-run-event-handle, event-handler-parameter ] ]
     *	-- or --
     *		[ /domain name regex/, [ selector-string or node-object, event-type, event-handler, observed-object-to-be-added-dynamicly-before-run-event-handle, event-handler-parameter ] ]
     *	-- or multiple handlers for the domain, syntax similar to previous ones --
     *		[ /domain name regex/, [
     *				[ selector-string or node-object, event-type, event-handler, delay or observed-object before run event handler, event-handler-parameter ],
     *				[ selector-string or node-object, event-type, event-handler, delay or observed-object before run event handler, event-handler-parameter ], ]
     *		]
	 * Notes:
	 * 1. empty selector-string/node-object and event-type means run immediately/after-some-delay at document-start
	 * 2. some event does not need a node to run on, e.g. DOMContentLoaded
     */
    [ /quora\.com/, [ /* not needed for DOMContentLoaded */, "DOMContentLoaded", quoraHandler, 0]],
    [ /360doc\.com/, [ window, "load", enableCopyHandler, 0]],
    [ /popbee\.com/, [ window, "load", enableCopyHandler, 0]],
    [ /wenku\.baidu\.com/, [
        [ , , interceptJackEvent, 0 ], /* run immediately at document-start */
        [ window, "load", enableCopyHandler, 0, ".bd.doc-reader"],
      ]
    ],
    [ /baidu\.com/, [
        [ /* not needed for DOMContentLoaded */, "DOMContentLoaded", enableUserSelect, 0, ".op_new_cal_screen"],
        [ "#form", "submit", enableUserSelect, "body", ".op_new_cal_screen"],
      ]
    ],
    [ /z3z4\.com/, [
      [ , , interceptJackEvent, 0], /* run immediately at document-start */
      [ /* not needed for DOMContentLoaded */, "DOMContentLoaded", enableUserSelect, 0, "body"],]
    ],
    [ /sdifen\.com/, [
      [ , , interceptJackEvent, 0], /* run immediately at document-start */
      [ /* not needed for DOMContentLoaded */, "DOMContentLoaded", enableUserSelect, 0, "body"],
      [ window, "load", enableCopyHandler, 0],]
    ],
    [ /.*/, [
      [ , , interceptJackEvent, 0], /* run immediately at document-start */
      [ /* not needed for DOMContentLoaded */, "DOMContentLoaded", enableUserSelect, 0, "body"],
      [ window, "load", enableCopyHandler, 0],]
    ],
  ];


  function quoraHandler() {
    console.log(new Date().toLocaleString(), " ", arguments.callee.name);
    for (var d of document.body.childNodes) {
      if (/signup_wall_wrapper$/.test(d.id)) {
        d.remove();
        break;
      }
    }
    document.body.style.overflow = "visible";
  }
  function replaceAddEventListener() {
    console.log("replaceAddEventListener");
    var r0_EventTargetRegFunc = EventTarget.prototype.addEventListener;
    //var r1_documentRegFunc = document.addEventListener;
    function dummyRegFunc (type, listener, options) {
      var regFunc = r0_EventTargetRegFunc;
      //console.log("dummyRegFunc", this, type, listener, options);
      if (!this.ATGT_disabledEventHandlers)
        this.ATGT_disabledEventHandlers = {};
      if (!this.ATGT_enabledEventHandlers)
        this.ATGT_enabledEventHandlers = {};
      //console.log("window.ATGT_eventFilter", window.ATGT_eventFilter);
      if (window.ATGT_eventFilter && window.ATGT_eventFilter.test(type)) {
        console.log("dummyRegFunc", this, type, listener, options);
        console.log("this event is %cdisabled.", "color: red;");
      	this.ATGT_disabledEventHandlers[type] = [listener, options];
      } else {
        //console.log("dummyRegFunc", this, type, listener, options);
        //console.log("this event is %cregistered.", "color: green;");
      	this.ATGT_enabledEventHandlers[type] = [listener, options];
      	regFunc.call(this, type, listener, options);
      }
    }
    EventTarget.prototype.addEventListener = dummyRegFunc;
    if (document.addEventListener !== dummyRegFunc)
        document.addEventListener = dummyRegFunc;
  }

  function injectFunction (func) {
    var script = document.createElement('script');
    //script.appendChild(document.createTextNode('('+ func +')();'));
    script.appendChild(document.createTextNode('(function (){'+'('+ func +')();'+'})();'));
    (document.body || document.head || document.documentElement).appendChild(script);
  }
  //console.log(""+injectFunction);
  injectFunction(replaceAddEventListener);

  function interceptJackEvent() {
    var f = function setEventFilter() {
      var eventFilter = /copy|selectstart|mouseup|mousedown|contextmenu|keydown|keyup/;
      window.ATGT_eventFilter = eventFilter;
    }
    injectFunction(f);
  }

  function enableUserSelect(sel) {
    console.log("enableUserSelect ", sel);
    if (sel)
      var b = document.querySelector(sel);
    else
      var b = document.body;
    var uselattrs = [ "-webkit-touch-callout",
                     "-webkit-user-select",
                     "-khtml-user-select",
                     "-moz-user-select",
                     "-ms-user-select",
                     "user-select",
                    ];
    for (var usel of uselattrs) {
      try {
        if (b && usel in b.style) {
          console.log("Found style user-select: "+b.style[usel]+", replace it.");
          b.style[usel] = "text";
        }
      } catch (e) {
        console.log(e);
      }
    }
  }

  function enableCopyHandler(sel) {
    var body = document.body;
    var doc = document;
    console.log(new Date().toLocaleString(), " ", arguments.callee.name, body.oncopy, doc.oncopy);
    function replaceUserHandlers(n) {
      n.onclick = n.oncontextmenu = n.oncopy =
      	n.onmouseup = n.onmousedown = n.onselectstart = null;
    }
    replaceUserHandlers(body);
    replaceUserHandlers(doc);
    var node = document.querySelector(sel);
    //for (var n of nodes)
    console.log(sel, "=>", node);
      replaceUserHandlers(node);
  }

  function waitForNode(targetSel, nodeFilter, nodeHandler, attrHandler) {
    console.log("waitForNode ", targetSel, nodeFilter, nodeHandler, attrHandler);
    // Select the node that will be observed for mutations
    var targetNode = document;
    if (typeof targetSel === "object")
      targetNode = targetSel;
    else if (typeof targetSel === "string")
      targetNode = document.querySelector(targetSel);

    // console.log("targetNode", targetNode);

    // Options for the observer (which mutations to observe)
    var config = {
      attributes: !!attrHandler,
      childList: !!nodeHandler,
      subtree: true,
    };

    // Callback function to execute when mutations are observed
    var callback = function(mutationsList) {
      for(var mutation of mutationsList) {
        if (nodeHandler && mutation.type == 'childList') {
          //console.log('A child node has been added ', mutation.addedNodes, ' or removed.');
          for (var node of mutation.addedNodes) {
            if (node.querySelector instanceof Function && node.querySelector(nodeFilter) || node === node.parentNode.querySelector(nodeFilter)) {
              setTimeout(nodeHandler, 0);
              this.disconnect();
              break;
            }
          }
        } else if (attrHandler && mutation.type == 'attributes') {
          //console.log('The ' + mutation.attributeName + ' attribute was modified.');
          setTimeout(attrHandler, 0);
        }
      }
    };

    // Create an observer instance linked to the callback function
    var observer = new MutationObserver(callback);
    // Start observing the target node for configured mutations
    observer.observe(targetNode, config);
    // Later, you can stop observing
    //observer.disconnect();
  }

  function runHandler(url, info) {
    try {
      console.log(new Date().toLocaleString(), " handle ", url, " with ", info);
      var nodeSel = info[0];
      var evt = info[1];
      var func = info[2];
      var delay_or_observe = info[3];
      var param = info[4];
      var node = document;
      if (typeof delay_or_observe === "number") {
        var handler = function () {
          setTimeout(func, delay_or_observe, param);
        };
      } else {
        var handler = function () {
          waitForNode(delay_or_observe, param, function () { func(param); }, );
        };
      }
      if (typeof nodeSel === "object")
        node = nodeSel;
      else if (typeof nodeSel === "string")
        node = document.querySelector(nodeSel);
      console.info("nodeSel", nodeSel, "node", node);
      if (evt)
      	node && node.addEventListener(evt, ()=>{handler(param);});
      else
        handler(param);
    } catch (e) {
      console.log("Error handling ", url, " ", e);
    }
  }

  for (var ph of pageHandlers) {
    var url = ph[0];
    if (url.test(location.href)) {
      var info_list = ph[1];
      if (!(info_list[0] instanceof Array)) {
        try {
          runHandler(url, info_list);
        } catch(e) {
          console.log(e);
        }
      } else for (var info of info_list) {
        try {
          runHandler(url, info);
        } catch(e) {
          console.log(e);
        }
      }
    }
  }
})();

console.log("!!!!!!!!!!!!!!!!!!!!!/unlock-page!!!!!!!!!!!!!!!!!!!!!!!!");
