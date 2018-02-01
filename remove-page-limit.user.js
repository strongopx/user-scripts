// ==UserScript==
// @namespace ATGT
// @name     remove page limit
// @name:zh-CN     解除网页限制
// @description 	Remove various page limit, check the code for the page list.
//		quora.com: Remove login page
//		360doc.com: Remove copy limit
//		baidu.com: Remove baidu calculator select limit
// How to remove other web page's copy or select limit: 
//		1. Add domain to @include http*://*your.domain/*
//		2. Add you handlers to variable `pageHandlers' below
//		3. Modify the handlers' memebers
// @description:zh-CN 	解除各种网页限制。网页列表，请查看源代码。
// @version  1.3.1
// @include    http*://*quora.com/*
// @include    http*://*360doc.com/*
// @include    http*://*baidu.com/*
// @include    http*://*z3z4.com/*
// @run-at   document-start
// ==/UserScript==

/*
ChangeLog:
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
    /* format:
     *		[ /regex/, [ selector-string or node-object, event-type, event-handler, delay-ms, event-handler-parameter ] ]
     *	-- or --
     *		[ /regex/, [ selector-string or node-object, event-type, event-handler, observed-object, observer-wait-for-this-selector-string ] ]
     *	-- or --
     *		[ /regex/, [
     *				[ selector-string or node-object, event-type, event-handler, delay or observed-object, ... ],
     *				[ selector-string or node-object, event-type, event-handler, delay or observed-object, ... ], ]
     *		]
     */
    [/quora\.com/, [, "DOMContentLoaded", quoraHandler, 0]],
    [/360doc\.com/, [window, "load", enableCopyHandler, 0]],
    [/baidu\.com/, [
      [, "DOMContentLoaded", enableUserSelect, 0, ".op_new_cal_screen"],
      ["#form", "submit", enableUserSelect, "body", ".op_new_cal_screen"],]
    ],
    [/z3z4\.com/, [
      [, , interceptJackEvent, 0],
      [, "DOMContentLoaded", enableUserSelect, 0, "body"],]
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
      var eventFilter = /copy|selectstart|mouseup|contextmenu|keydown|keyup/;
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
        if (usel in b.style) {
          console.log("Found style user-select: "+b.style[usel]+", replace it.");
          b.style[usel] = "text";
        }
      } catch (e) {
        console.log(e);
      }
    }
  }

  function enableCopyHandler() {
    var body = document.body;
    var doc = document;
    console.log(new Date().toLocaleString(), " ", arguments.callee.name, body.oncopy, doc.oncopy);
    body.onclick = body.oncontextmenu = body.oncopy =
      body.onmouseup = body.onselectstart = null;
    doc.onclick = doc.oncontextmenu = doc.oncopy =
      doc.onmouseup = doc.onselectstart = null;
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
      if (evt)
      	node.addEventListener(evt, handler);
      else
        handler();
    } catch (e) {
      console.log("Error handling ", url, " ", e);
    }
  }

  for (var ph of pageHandlers) {
    var url = ph[0];
    if (url.test(location.href)) {
      var info_list = ph[1];
      if (!(info_list[0] instanceof Array))
        runHandler(url, info_list);
      else for (var info of info_list)
        runHandler(url, info);
    }
  }
})();

console.log("!!!!!!!!!!!!!!!!!!!!!/unlock-page!!!!!!!!!!!!!!!!!!!!!!!!");
