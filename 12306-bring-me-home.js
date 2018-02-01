// ==UserScript==
// @name         12306 bring me on the train to home
// @name:zh-CN         12306带我坐火车回家
// @namespace    ATGT
// @version      1.6.1
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

  function waitForNodeAttr(targetSel, subtree, nodeFilter, nodeHandler, attrFilter, attrHandler) {
    console.log("waitForNode ", targetSel, nodeFilter, nodeHandler ? nodeHandler.name : null, attrFilter, attrHandler ? attrHandler.name : null);
    var MutationObserver    = window.MutationObserver || window.WebKitMutationObserver;

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
      subtree: subtree,
      attributeFilter: attrFilter ? attrFilter : undefined,
    };

    // Callback function to execute when mutations are observed
    var callback = function(mutationsList) {
      for(var mutation of mutationsList) {
        if (nodeHandler && mutation.type == 'childList') {
          //console.log('A child node has been added ', mutation.addedNodes, ' or removed.');
          for (var node of mutation.addedNodes) {
            if (!nodeFilter || nodeFilter(node)) {
              setTimeout(nodeHandler, 0, mutation.target);
              this.disconnect();
              break;
            }
          }
        } else if (attrHandler && mutation.type == 'attributes') {
          console.log('The ' + mutation.attributeName + ' of ', mutation.target, ' attribute was modified.');
          setTimeout(attrHandler, 0, mutation.target);
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

  function reQueryIfTimeout() {
      function reQueryHandler(target) {
        if (target.type === "DOMAttrModified")
          var node = $(this);
        else
          var node = $(target);
        log("attr mod", node, node.text().replace(/\s*/g, ""));
        if (node.prop("ATGT_reQuery_ongoing"))
          return;
        function queryAgain(node) {
          if (node.text().indexOf("查询超时") < 0) {
            return;
          }
          var timeoutShow = node.css("display") !== "none";
          var progbar = $(".dhx_modal_cover").css("display") !== "none";
          if (timeoutShow && !progbar) {
            logDate();
            log("try send query");
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
            log("query %congoing.", "color: blue;");
            setTimeout(queryAgain, 2000, node);
          } else {
            logDate();
            log("query send %cok.", "color: green;");
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
        waitForNodeAttr(this, false, null, null, ["style"], reQueryHandler);
    });
  }

  function optimizeTravelOptions() {
    /* login page on top */
    $("#relogin").css("z-index", 2000);
    $("#loginForm").css("z-index", 2000);

    /* expand ticket helper */
    $("#show_more").click();

    /* GaoTie only */
    /* var GChk = $("div#cc_train_type_btn_all input[value='G'][name='cc_type']");
    GChk.prop("checked", true); */

    /* normal seat only */
    /* $("ul#seat-list > li[name='二等座']").click();
    $("ul#seat-list > li[name='一等座']").click();
    $("ul#seat-list > li[name='硬座']").click();
    $("ul#seat-list > li[name='无座']").click(); */

    /* add 07:00--21:00 time */
    $("select#cc_start_time").css("color", "red");
    var goodTime = $('<option id=custom_time_opt value="07001900">07:00--19:00</option>');
    //goodTime.insertBefore($("#cc_start_time > option:first-child"));
    $("#cc_start_time").append(goodTime);
    goodTime.prop("selected", true);
    $("#cc_start_time").bind("change", function () {
      log("start time changed");
    });

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
      log("custom time: ", tstr, tval);
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
    createCustomTime();
    setCustomTime(GM_getValue("customTime"));
    updateCustomTime();

    /* no autosumbit */
    $("input#autoSubmit").prop("checked", false);

    /* show only bookable */
    $("div.sear-result span").css("position", "static");
    $("input#avail_ticket").prop("checked", true);
    $("label[for='avail_ticket']").css("color", "red");
  }

  function rememberUserChoice() {
    function loadValue(options) {
      try {
        var storeName = options.storeName;
        var storeValue = GM_getValue(storeName, "{[]}");
        log("restore", storeName, storeValue);
        storeValue = JSON.parse(storeValue);
        log("restore", storeName, storeValue);
        return storeValue;
      } catch (e) {
        log("load", options.storeName, "failed.");
        //log(e);
      }
    }

    function restoreTrainProp(options) {
      log("restoreTrainProp", options);
      var storeValue = loadValue(options);
      var propName = options.propName;
      var format = options.restoreFormat;
      var restoreFunc = options.restoreFunc;
      $(storeValue).each(function (i, e){
        if (format)
          $(format.replace("%k", propName).replace("%v", e)).click();
        else if (restoreFunc)
          restoreFunc(e);
        else
          log("skip restore", options.storeName);
      });
      log("click close", $(options.addTriggerSel));
      if (options.loadTrigger)
        $(options.addTriggerSel).click();
    }

    function saveTrainProp(event) {
      log("saveTrainProp", event);
      var options = event.data;
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
      log("trig load", options.loadTrigger);
      waitForNodeAttr($(options.loadedTriggerSel).get(0), false, null, function (target) {
        log("loaded trigger event.", target);
        options.loaded = true;
        setTimeout(rememberTrainProp, options.delay, options);
      }, null, null);
      setTimeout(options.loadTrigger, options.loadDelay);
      return;
    }

    function rememberTrainProp(options) {
      log(">>> rememberTrainProp", options);
      var prevValue = loadValue(options);
      if (prevValue && prevValue.length && !options.loaded && options.loadTrigger) {
        return triggerTrainInfoLoad(options);
      }
      log("train prop loaded", options);

      restoreTrainProp(options);

      $(options.addTriggerSel).bind(options.addEvent, options, function (e) {
        setTimeout(saveTrainProp, e.data.delay, e);
      });
      $(options.removeTriggerSel).bind(options.removeEvent, options, function (e) {
        setTimeout(saveTrainProp, e.data.delay, e);
      });

      $(options.chain).each(function (i, e) {
        setTimeout(e, 0);
      });
    }

    var priorSeatOptions = {
      storeName : "seatType",
      propName: "name",
      choosedSel : "div#sel-seat ul#seat-list > li.cur",
      addEvent: "click",
      addTriggerSel: "div#sel-seat > .quick-box-hd > a",
      removeEvent: "DOMNodeRemoved",
      removeTriggerSel: "div#prior_seat",
      delay: 200,
      restoreFormat: "div#sel-seat ul#seat-list > li[%k='%v']",
    };
    rememberTrainProp(priorSeatOptions);

    var altDateOptions = {
      storeName : "altDate",
      propName: "name",
      choosedSel : "div#sel-date ul#date-list > li.cur[train_date!='yes']",
      addEvent: "click",
      addTriggerSel: "div#sel-date > .quick-box-hd > a",
      removeEvent: "DOMNodeRemoved",
      removeTriggerSel: "div#prior_date",
      delay: 200,
      restoreFormat: "div#sel-date ul#date-list > li[%k='%v']",
    };
    rememberTrainProp(altDateOptions);

    var priorTrainTypeOptions = {
      storeName : "priorTrainType",
      propName: "value",
      choosedSel : "ul#_ul_station_train_code > li > input:checked",
      addEvent: "click",
      addTriggerSel: "ul#_ul_station_train_code > li > input",
      delay: 200,
      restoreFormat: "ul#_ul_station_train_code > li > input[%k='%v']",
    };
    rememberTrainProp(priorTrainTypeOptions);

    var priorFromStationOptions = {
      storeName : "priorFromStation",
      propName: "value",
      choosedSel : "ul#from_station_ul > li > input:checked",
      addEvent: "click",
      addTriggerSel: "ul#from_station_ul > li > input",
      delay: 200,
      restoreFormat: "ul#from_station_ul > li > input[%k='%v']",
    };
    //$("#query_ticket").bind("click", function(e) { rememberTrainProp(priorFromStationOptions); });

    var priorToStationOptions = {
      storeName : "priorToStation",
      propName: "value",
      choosedSel : "ul#to_station_ul > li > input:checked",
      addEvent: "click",
      addTriggerSel: "ul#to_station_ul > li > input",
      delay: 200,
      restoreFormat: "ul#to_station_ul > li > input[%k='%v']",
    };
    //$("#query_ticket").bind("click", function(e) { rememberTrainProp(priorToStationOptions); });

    var buyerOptions = {
      loadTrigger: $.showSelectBuyer, //function () { $("div#setion_postion > .wrap-left > a").click(); },
      loaded: false,
      storeName : "buyer",
      propName: "p_value",
      choosedSel : "ul#buyer-list > li.cur",
      addEvent: "click",
      addTriggerSel: "div#sel-buyer > .quick-box-hd > a:first-child",
      removeEvent: "DOMNodeRemoved",
      removeTriggerSel: "div#setion_postion",
      loadedEvent: "DOMNodeInserted",
      loadedTriggerSel: "ul#buyer-list",
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
      loadTrigger: $.showYxTrain,
      loaded: false,
      storeName : "priorTrain",
      propName: "traincode",
      choosedSel : '#prior_train span.sel-box[name="prior_train-span"]',
      addEvent: "click",
      addTriggerSel: "div#yxtraindiv > .quick-box-hd > a#yxtrain_close",
      removeEvent: "DOMNodeRemoved",
      removeTriggerSel: "div#prior_train",
      loadedEvent: "DOMNodeInserted",
      loadedTriggerSel: "#yxtrain_code",
      delay: 200,
      loadDelay: 1000,
      //restoreFormat: "div#yxtraindiv ul#yxtrain_code > li[%k='%v']",
      restoreFunc: addPriorTrain,
      chain: [ function(e) { rememberTrainProp(priorFromStationOptions); },
              function(e) { rememberTrainProp(priorToStationOptions); },
             ],
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
      addEvent: "click",
      addTriggerSel: "#ad_setting ~ div > span > input",
      delay: 200,
      restoreFormat: "input#%v",
    };
    rememberTrainProp(priorAdvanOptOptions);

    var priorTypeOptions = {
      storeName : "priorType",
      propName: "value",
      choosedSel : "#ad_setting ~ div > span > select > option:checked",
      addEvent: "click",
      addTriggerSel: "#ad_setting ~ div > span > select > option",
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
