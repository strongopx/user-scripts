// ==UserScript==
// @name         12306 bring me on the train to home
// @name:zh-CN         12306带我坐火车回家
// @namespace    ATGT
// @version      1.7
// @description  Please bring me home.
// Functionality:
//    * remember almost all options, restore the options after refresh, if login page show, need to refresh again
//    * add "customize start time" function
//    * requery if auto query timedout and stop forever
//    * auto select "show bookable train only"
//    * set default start time to 07:00-19:00
// @description:zh-CN  12306 带我坐火车回家
// 功能：
//    * 记住所有选项，刷新页面后自动恢复，如果出现登录界面，请登录后重新刷新
//    * 增加“自定义发车时间”功能
//    * 自动查询因为超时停止后，自动重新开始
//    * 自动选择 “显示全部可预订车次”
//    * 默认发车时间改为 07:00-19:00
// @author       strongopwh@hotmail.com
// @updateURL  https://raw.githubusercontent.com/strongop/user-scripts/master/12306-bring-me-home.user.js
// @downloadURL  https://raw.githubusercontent.com/strongop/user-scripts/master/12306-bring-me-home.user.js
// @supportURL  https://github.com/strongop/user-scripts/issues
// @match        https://kyfw.12306.cn/otn/leftTicket/*
// @icon         https://kyfw.12306.cn/otn/resources/images/ots/favicon.ico
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// ==/UserScript==

console.log("++++++ 12306");
(function() {
  'use strict';

  var log = console.log;
  function date() {
    return new Date().toLocaleString();
  }
  function logDate() {
    log(date());
  }
  var isFirefox = navigator.userAgent.indexOf("Firefox") >= 0;

  function removeAds() {
    log("jQuery", jQuery);
    log("$", $);
    $("iframe#ad_frame_query").remove();
    $("div#myfix_yh").remove();
  }

  function waitMutationEvent(eventType, targetSel, options, handler, filter) {
    if (!eventType || !targetSel || !handler)
      return;
    console.log("\n>>>> waitMutationEvent ", eventType, targetSel, options,
                  filter, handler ? handler.name : null);

    if (typeof options !== "object") {
      options = { };
    }

    if (isFirefox) {
      log("Workaround firefox MutationObserver bug.");
      if (options.once)
        $(targetSel).one(eventType, options, function (e) { handler.call(e.target) });
      else
        $(targetSel).bind(eventType, options, function (e) { handler.call(e.target) });
      return;
    }
    var MutationObserver    = window.MutationObserver || window.WebKitMutationObserver;

    var targetNode = document;
    if (typeof targetSel === "object")
      targetNode = targetSel;
    else if (typeof targetSel === "string")
      targetNode = document.querySelector(targetSel);
    // console.log("targetNode", targetNode);

    var config = {
      attributes: undefined,
      childList: undefined,
      subtree: options.subtree,
      attributeFilter: undefined,
    };
    if (eventType.indexOf("DOMNode") > -1)
      config.childList = true;
    else if (eventType.indexOf("DOMAttr") > -1) {
      config.attributes = true;
      config.attributeFilter = filter;
    } else {
      throw new Error("No event type specified.");
    }

    var callback = function(mutationsList) {
      for(var mutation of mutationsList) {
        if (handler && mutation.type == 'childList') {
          //console.log('A child node has been added ', mutation.addedNodes, ' or removed.');
          var nodes = [];
          if (eventType == "DOMNodeInserted")
            nodes = mutation.addedNodes;
          else if (eventType == "DOMNodeRemoved")
            nodes = mutation.removedNodes;
          for (var node of nodes) {
            if (!filter || filter(node)) {
              setTimeout(function () { handler.call(mutation.target, eventType); }, 0);
              if (options.once) {
                this.disconnect();
                return;
              }
            }
          }
        } else if (eventType == "DOMAttrModified" && handler && mutation.type == 'attributes') {
          console.log('The ' + mutation.attributeName + ' of ', mutation.target, ' attribute was modified.');
          setTimeout(function () { handler.call(mutation.target, mutation.attributeName, mutation.oldValue); }, 0);
          if (options.once) {
            this.disconnect();
            return;
          }
        } else {
          log("Unhandled MutationObserver event.");
        }

      }
    };

    var observer = new MutationObserver(callback);
    observer.observe(targetNode, config);
    // Later, you can stop observing
    //observer.disconnect();
    return observer;
  }

  function reQueryIfTimeout() {
      function reQueryHandler(attrName, oldValue) {
        var node = $(this);
        //log("\nAttrMod", attrName, ":", oldValue, "->", node.attr(attrName),
        //    " of ", node, node.text().replace(/\s*/g, ""));

        if (node.prop("ATGT_reQuery_ongoing")/* || attrName !== "style"*/)
          return;
        function queryAgain(node) {
          if (node.text().indexOf("查询超时") < 0) {
            return;
          }
          var timeoutShow = node.css("display") !== "none";
          var progbar = $(".dhx_modal_cover").css("display") !== "none";
          if (timeoutShow && !progbar) {
            logDate();
            log("Try send query");
            node.prop("ATGT_reQuery_ongoing", true);
            var queryBtn = $("#query_ticket");
            log("queryBtn", queryBtn);
            queryBtn.click();
            var nextQueryTime = 2000;
            if (queryBtn.text().indexOf("停止查询") > -1) {
              nextQueryTime = 100;
            }
            setTimeout(queryAgain, nextQueryTime, node);
          } else if (progbar) {
            logDate();
            log("Query %congoing.", "color: blue;");
            setTimeout(queryAgain, 2000, node);
          } else {
            logDate();
            log("Query send %cok.", "color: green;");
            node.prop("ATGT_reQuery_ongoing", false);
          }
        }
        setTimeout(queryAgain, 500, node);
      }
    $(".no-ticket").each(function (i) {
      var noTkt = $(this);
      log("no-ticket ", noTkt, noTkt.text().replace(/\s*/g, ""));
      if (isFirefox)
        noTkt.bind("DOMAttrModified", reQueryHandler);
      else
        waitMutationEvent("DOMAttrModified", this, {}, reQueryHandler, ["style"]);
    });
  }

  function optimizeTravelOptions() {
    /* login page on top */
    $("#relogin").css("z-index", 2000);
    $("#loginForm").css("z-index", 2000);

    /* expand ticket helper */
    $(".quick-gif").css("z-index", 11);
    $("#show_more").click();

    /* add 07:00--19:00 time */
    function appendCustomTimeToSelect() {
      $("select#cc_start_time").css("color", "red");
      var goodTime = $('<option id=custom_time_opt value="07001900">07:00--19:00</option>');
      //goodTime.insertBefore($("#cc_start_time > option:first-child"));
      $("#cc_start_time").append(goodTime);
      goodTime.prop("selected", true);
      $("#cc_start_time").bind("change", function () {
        log("start time changed");
      });
    }

    function getCustomTime() {
      var inputs = $("div#custom_time > input");
      inputs.each(function(i, e) {
        e.value = parseInt(e.value, 10);
        if (e.value < 0)
          e.value = 0;
        if (e.value.length === 0)
          e.value = "00";
        if (e.value.length === 1)
          e.value = "0" + e.value;
        });
      var tstr = inputs[0].value + ":" + inputs[1].value + "--" + inputs[2].value + ":" + inputs[3].value;
      var tval = inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value;

      return [tstr, tval];
    }

    function setCustomTime(tstr) {
      if (!tstr)
        return;
      var tarr = tstr.split(/:|--/);
      if (tarr.length != 4)
        return;
      var inputs = $("div#custom_time > input");
      inputs.each(function(i, e) {
        e.value = tarr[i];
      });
    }

    function updateCustomTime() {
      var custT = getCustomTime();
      var tstr = custT[0];
      var tval = custT[1];
      log("Custom time: ", tstr, tval);
      var goodTime = $("option#custom_time_opt");
      goodTime.replaceWith('<option id=custom_time_opt value="'+tval+'">'+tstr+'</option>');
      $("option#custom_time_opt").prop("selected", true);
      GM_setValue("customTime", tstr);
    }

    function createCustomTime() {
      var custom_time_sel = `\
<div><span style="font-size: smaller;">自定义发车时间：</span>
<!-- <input id=update_custom_time type=button value='确定' style='padding: 1px 2px; float: right;'/> -->
<div id=custom_time>
<input type=number maxlength=2 value='07' style='text-align:center; width: 2rem;' />
:<input type=number maxlength=2 value='00' style='text-align:center; width: 2rem;' />
--
<input type=number maxlength=2 value='19' style='text-align:center; width: 2rem;' />
:<input type=number maxlength=2 value='00' style='text-align:center; width: 2rem;' />
</div>
</div>
`;
      $("div.pos-top").append($(custom_time_sel));
      $("div#custom_time > input").bind("input", updateCustomTime);
    }

    appendCustomTimeToSelect();
    createCustomTime();
    setCustomTime(GM_getValue("customTime"));
    updateCustomTime();

    /* no autosumbit */
    $("input#autoSubmit").prop("checked", false);

    /* don't overlap other checkboxes */
    $("div.sear-result span").css("position", "static");
    /* show only bookable */
    $("input#avail_ticket").prop("checked", true);
    $("label[for='avail_ticket']").css("color", "red");
  }

  function rememberUserChoice() {
    function loadValue(options) {
      try {
        var storeName = options.storeName;
        var storeValue = GM_getValue(storeName);
        //log("load", storeName, storeValue);
        storeValue = JSON.parse(storeValue);
        //log("load", storeName, storeValue);
        return storeValue;
      } catch (e) {
        log("Load", options.storeName, "failed.");
        //log(e);
      }
    }

    function restoreTrainProp(options) {
      log("restoreTrainProp");
      var storeValue = loadValue(options);
      log("Loaded", options.storeName, storeValue);
      var propName = options.propName;
      var format = options.restoreFormat;
      var restoreFunc = options.restoreFunc;
      $(storeValue).each(function (i, e){
        if (format)
          $(format.replace("%k", propName).replace("%v", e)).click();
        else if (restoreFunc)
          restoreFunc(e);
        else
          log("Skip restore", options.storeName);
      });
      if (options.loadDone) {
        log("Load Done", $(options.loadedEventTarget));
        options.loadDone();
      }
    }

    function saveTrainProp(options) {
      log("saveTrainProp", options);
      var storeName = options.storeName;
      var propName = options.propName;
      var storeValue = [];
      $(options.choosedSel).each(function (i, e) {
        var val = $(e).attr(propName) || $(e).text();
        storeValue.push(val);
      });
      log(storeName, storeValue);
      GM_setValue(storeName, JSON.stringify(storeValue));
    }

    function triggerTrainInfoLoad(options) {
      log("Trig load", options.loadTrigger ? options.loadTrigger.name : null,
          "on event", options.loadedEventType, "of", options.loadedEventTarget);
      waitMutationEvent(options.loadedEventType, $(options.loadedEventTarget).get(0),
                        { once: true },
                        function () {
        log("Loaded trigger event from", this);
        options.loaded = true;
        setTimeout(rememberTrainProp, options.delay, options);
      });

      setTimeout(options.loadTrigger, options.loadDelay);
      return;
    }

    function handleTrainPropChange(options) {
      log("Handle prop add event.", options.addEventTarget, $(options.addEventTarget));
      try {
        $(options.addEventTarget).each(function (i, e) {
          waitMutationEvent(options.addEventType, e, {},
            function () {
            setTimeout(saveTrainProp, options.delay, options);
          });
        });
      } catch (e) {
        log("Fall thru to bind event", options.addEventType, "of", options.addEventTarget);
        $(options.addEventTarget).bind(options.addEventType, options, function (e) {
          setTimeout(saveTrainProp, options.delay, options);
        });
      }
      log("Handle prop remove event.", options.removeEventTarget, $(options.removeEventTarget));
      try {
        $(options.removeEventTarget).each(function (i, e) {
          waitMutationEvent(options.removeEventType, e, {},
                            function () {
            setTimeout(saveTrainProp, options.delay, options);
          });
        })
      } catch (e) {
        log("Fall thru to bind event", options.removeEventType, "of", options.removeEventTarget);
        $(options.removeEventTarget).bind(options.removeEvent, options, function (e) {
          setTimeout(saveTrainProp, options.delay, options);
        });
      }

      $(options.chain).each(function (i, e) {
        setTimeout(e, 0);
      });
    }

    function rememberTrainProp(options) {
      log("\n>>>>>>>>>>>>>>>>>>>> rememberTrainProp", options.storeName, " >>>>>>>>>>>>>>>>>>>>>>>>", options);

      var prevValue = loadValue(options);
      if ((prevValue && prevValue.length || options.forceTrigLoad) &&
          !options.loaded && options.loadedEventType && options.loadedEventTarget) {
        return triggerTrainInfoLoad(options);
      }

      if (options.processed) {
        log ("already processed");
        return;
      }
      options.processed = true;

      if (options.loaded)
        log("Train prop loaded");

      restoreTrainProp(options);
      handleTrainPropChange(options);
    }

    var priorSeatOptions = {
      storeName : "seatType",
      propName: "name",
      choosedSel : "#sel-seat ul#seat-list > li.cur",
      addEventType: "DOMNodeInserted",
      addEventTarget: "#prior_seat",
      removeEventType: "DOMNodeRemoved",
      removeEventTarget: "#prior_seat",
      delay: 200,
      restoreFormat: "#sel-seat ul#seat-list > li[%k='%v']",
    };
    rememberTrainProp(priorSeatOptions);

    var altDateOptions = {
      storeName : "altDate",
      propName: "name",
      choosedSel : "#sel-date ul#date-list > li.cur[train_date!='yes']",
      addEventType: "DOMNodeInserted",
      addEventTarget: "#prior_date",
      removeEventType: "DOMNodeRemoved",
      removeEventTarget: "#prior_date",
      delay: 200,
      restoreFormat: "#sel-date ul#date-list > li[%k='%v']",
    };
    rememberTrainProp(altDateOptions);

    var priorTrainTypeOptions = {
      storeName : "priorTrainType",
      propName: "value",
      choosedSel : "ul#_ul_station_train_code > li > input:checked",
      addEventType: "click",
      addEventTarget: "#train_type_btn_all, ul#_ul_station_train_code > li > input",
      delay: 200,
      restoreFormat: "ul#_ul_station_train_code > li > input[%k='%v']",
    };
    rememberTrainProp(priorTrainTypeOptions);

    var priorFromStationOptions = {
      storeName : "priorFromStation",
      propName: "value",
      choosedSel : "ul#from_station_ul > li > input:checked",
      addEventType: "click",
      addEventTarget: "#from_station_name_all, ul#from_station_ul > li > input",
      forceTrigLoad: true,
      loaded: $("ul#from_station_ul > li").length,
      loadedEventType: "DOMNodeInserted",
      loadedEventTarget: "ul#from_station_ul",
      delay: 200,
      restoreFormat: "ul#from_station_ul > li > input[%k='%v']",
    };
    rememberTrainProp(priorFromStationOptions);

    var priorToStationOptions = {
      storeName : "priorToStation",
      propName: "value",
      choosedSel : "ul#to_station_ul > li > input:checked",
      addEventType: "click",
      addEventTarget: "#to_station_name_all, ul#to_station_ul > li > input",
      forceTrigLoad: true,
      loaded: $("ul#to_station_ul > li").length,
      loadedEventType: "DOMNodeInserted",
      loadedEventTarget: "ul#to_station_ul",
      delay: 200,
      restoreFormat: "ul#to_station_ul > li > input[%k='%v']",
    };
    rememberTrainProp(priorToStationOptions);

    var buyerOptions = {
      storeName : "buyer",
      propName: "p_value",
      choosedSel : "ul#buyer-list > li.cur",
      addEventType: "DOMNodeInserted",
      addEventTarget: "#setion_postion",
      removeEventType: "DOMNodeRemoved",
      removeEventTarget: "#setion_postion",
      loaded: $("ul#buyer-list > li").length,
      loadTrigger: $.showSelectBuyer, //function () { $("div#setion_postion > .wrap-left > a").click(); },
      loadDone: $.closeSelectBuyer,
      loadedEventType: "DOMNodeInserted",
      loadedEventTarget: "ul#buyer-list",
      delay: 200,
      loadDelay: 1000,
      restoreFormat: "ul#buyer-list > li[%k='%v']",
    };
    rememberTrainProp(buyerOptions);


    function addPriorTrain(trainCode) {
      $("#inp-train").val(trainCode); //($(this).attr("traincode"));
      var cJ = $('#prior_train span.sel-box[name="prior_train-span"]').length;
      $("#add-train").click();
      /* if (cJ < 6) { $(this).attr("class", "cur"); $.chooseAutoSubmit() } */
    }

    var priorTrainOptions = {
      storeName : "priorTrain",
      propName: "traincode",
      choosedSel : '#prior_train span.sel-box[name="prior_train-span"]',
      addEventType: "DOMNodeInserted",
      addEventTarget: "#prior_train",
      removeEventType: "DOMNodeRemoved",
      removeEventTarget: "#prior_train",
      loaded: $("#yxtrain_code > li").length,
      loadTrigger: $.showYxTrain,
      loadDone: function () { $("#yxtraindiv").hide(); },
      loadedEventType: "DOMNodeInserted",
      loadedEventTarget: "#yxtrain_code",
      delay: 200,
      loadDelay: 1000,
      //restoreFormat: "div#yxtraindiv ul#yxtrain_code > li[%k='%v']",
      restoreFunc: addPriorTrain,
    };
    if ($("#yxtrain_code > li").length) {
      log("^_^ prior train already loaded.");
      priorTrainOptions.loaded = true;
      rememberTrainProp(priorTrainOptions);
    } else {
      log("-_-|| need to load prior train.");
      rememberTrainProp(priorTrainOptions);
      // $("#query_ticket").bind("click", function(e) { rememberTrainProp(priorTrainOptions); });
    }

    var priorAdvanOptOptions = {
      storeName : "advanOpt",
      propName: "id",
      choosedSel : "#ad_setting ~ div > span > input:checked",
      addEventType: "click",
      addEventTarget: "#ad_setting ~ div > span > input",
      delay: 200,
      restoreFormat: "input#%v",
    };
    rememberTrainProp(priorAdvanOptOptions);

    var priorTypeOptions = {
      storeName : "priorType",
      propName: "value",
      choosedSel : "#ad_setting ~ div > span > select > option:checked",
      addEventType: "click",
      addEventTarget: "#ad_setting ~ div > span > select > option",
      delay: 200,
      restoreFormat: "#ad_setting ~ div > span > select > option[%k='%v']",
    };
    rememberTrainProp(priorTypeOptions);
 }

  // Your code here...

  //document.addEventListener("DOMContentLoaded", removeAds);
  window.addEventListener("load", removeAds);
  window.addEventListener("load", function () {
    reQueryIfTimeout();
    optimizeTravelOptions();
    rememberUserChoice();
  });
})();
console.log("------ 12306");
