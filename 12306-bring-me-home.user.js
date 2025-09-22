// ==UserScript==
// @name         12306 bring me on the train to home
// @name:zh-CN         12306带我坐火车回家
// @namespace    ATGT
// @version      1.9
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
// @author       StrongOp
// @homepageURL  https://github.com/strongop/user-scripts/
// @supportURL   https://github.com/strongop/user-scripts/issues
// @match        https://kyfw.12306.cn/otn/leftTicket/*
// @match        https://kyfw.12306.cn/otn/confirmPassenger/*
// @icon         https://kyfw.12306.cn/otn/resources/images/ots/favicon.ico
// @run-at       document-start
// ==/UserScript==

console.log("++++++ 12306");

let mainFunc = function () {
  'use strict';

  let log = console.log;
  let error = console.error;
  function date() {
    return new Date().toLocaleString();
  }

  function logDate() {
    log(date());
  }

  function local_setValue(k, v) {
    localStorage.setItem(k, v);
  }

  function local_getValue(k, v) {
    return localStorage.getItem(k);
  }

  let isFirefox = navigator.userAgent.indexOf("Firefox") >= 0;


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
      options = {};
    }

    //     if (isFirefox) {
    //       log("Workaround firefox MutationObserver bug.");
    //       if (options.once)
    //         $(targetSel).one(eventType, options, function (e) { handler.call(e.target); });
    //       else
    //         $(targetSel).bind(eventType, options, function (e) { handler.call(e.target); });
    //       return;
    //     }
    let MutationObserver = window.MutationObserver || window.WebKitMutationObserver;

    let targetNode = document;
    if (typeof targetSel === "object")
      targetNode = targetSel;
    else if (typeof targetSel === "string")
      targetNode = document.querySelector(targetSel);
    // console.log("targetNode", targetNode);

    let config = {
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


    function obCallback(mutationsList) {
      for (let mutation of mutationsList) {
        if (mutation.type == 'childList') {
          console.log(`${eventType}: A child node has been added`, mutation.addedNodes, ' or removed', mutation.removedNodes);
          if (!handler) {
            error('No handler for mutations');
          }
          // let nodes = [];
          // if (eventType == "DOMNodeInserted")
          //   nodes = mutation.addedNodes;
          // else if (eventType == "DOMNodeRemoved")
          //   nodes = mutation.removedNodes;
          // for (let node of nodes) {
          //   if (!filter || filter(node)) {
              setTimeout(() => { handler && handler.call(mutation.target, eventType); }, 0);
              if (options.once) {
                this.disconnect();
                return;
              }
          //   }
          // }
        } else if (eventType == "DOMAttrModified" && handler && mutation.type == 'attributes') {
          console.log('The ' + mutation.attributeName + ' of ', mutation.target, ' attribute was modified.');
          setTimeout(() => { handler.call(mutation.target, mutation.attributeName, mutation.oldValue); }, 0);
          if (options.once) {
            this.disconnect();
            return;
          }
        } else {
          log("Unhandled MutationObserver event.");
        }

      }
    };

    let observer = new MutationObserver(obCallback);
    observer.observe(targetNode, config);
    // Later, you can stop observing
    //observer.disconnect();
    return observer;
  }


  function reQueryIfTimeout() {
    function reQueryHandler(attrName, oldValue) {
      let node = $(this);
      //log("\nAttrMod", attrName, ":", oldValue, "->", node.attr(attrName),
      //    " of ", node, node.text().replace(/\s*/g, ""));

      if (node.prop("ATGT_reQuery_ongoing")/* || attrName !== "style"*/)
        return;
      function queryAgain(node) {
        if (node.text().indexOf("查询超时") < 0) {
          return;
        }
        let timeoutShow = node.css("display") !== "none";
        let progbar = $(".dhx_modal_cover").css("display") !== "none";
        if (timeoutShow && !progbar) {
          logDate();
          log("Try send query");
          node.prop("ATGT_reQuery_ongoing", true);
          let queryBtn = $("#query_ticket");
          log("queryBtn", queryBtn);
          queryBtn.click();
          let nextQueryTime = 2000;
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
    $(".no-ticket").each((i) => {
      let noTkt = $(this);
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
    //     $("#show_more").click(); // already expanded in new version


    /* add 07:00--19:00 time */
    function appendCustomTimeToSelect() {
      $("select#cc_start_time").css("color", "red");
      let goodTime = $('<option id=custom_time_opt value="07001900">07:00--19:00</option>');
      //goodTime.insertBefore($("#cc_start_time > option:first-child"));
      $("#cc_start_time").append(goodTime);
      goodTime.prop("selected", true);
      $("#cc_start_time").bind("change", () => log("start time changed"));
    }


    function getCustomTime() {
      let inputs = $("div#custom_time > input");
      inputs.each((i, e) => {
        e.value = parseInt(e.value, 10);
        if (e.value < 0)
          e.value = 0;
        if (e.value.length === 0)
          e.value = "00";
        if (e.value.length === 1)
          e.value = "0" + e.value;
      });
      let tstr = inputs[0].value + ":" + inputs[1].value + "--" + inputs[2].value + ":" + inputs[3].value;
      let tval = inputs[0].value + inputs[1].value + inputs[2].value + inputs[3].value;

      return [tstr, tval];
    }


    function setCustomTime(tstr) {
      if (!tstr)
        return;
      let tarr = tstr.split(/:|--/);
      if (tarr.length != 4)
        return;
      let inputs = $("div#custom_time > input");
      inputs.each((i, e) => {
        e.value = tarr[i];
      });
    }


    function updateCustomTime() {
      let custT = getCustomTime();
      let tstr = custT[0];
      let tval = custT[1];
      log("Custom time: ", tstr, tval);
      let goodTime = $("option#custom_time_opt");
      goodTime.replaceWith('<option id=custom_time_opt value="' + tval + '">' + tstr + '</option>');
      $("option#custom_time_opt").prop("selected", true);
      local_setValue("customTime", tstr);
    }


    function createCustomTime() {
      let custom_time_sel = `\
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
    setCustomTime(local_getValue("customTime"));
    updateCustomTime();

    /* no autosumbit */
    // hidden in 2025 version
    // $("input#autoSubmit").prop("checked", false);

    /* don't overlap other checkboxes */
    $("div.sear-result span").css("position", "static");
    /* show only bookable */
    $("input#avail_ticket").prop("checked", true);
    $("label[for='avail_ticket']").css("color", "red");
  }


  /**
   * remember user choice helper functions
   */
  function loadValue(options) {
    try {
      let storeName = options.storeName;
      let storeValue = local_getValue(storeName);
      //log("load", storeName, storeValue);
      storeValue = JSON.parse(storeValue);
      //log("load", storeName, storeValue);
      return storeValue;
    } catch (e) {
      log("Load", options.storeName, "failed.");
      //log(e);
    }
  }

  /**
   * restore user choice from local storage
   */
  function restoreTrainProp(options) {
    log("restoreTrainProp");
    let storeValue = loadValue(options);
    log("Loaded", options.storeName, storeValue);
    let propName = options.propName;
    let format = options.restoreFormat;
    let restoreFunc = options.restoreFunc;
    $(storeValue).each((i, e) => {
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
    let storeName = options.storeName;
    let propName = options.propName;
    let storeValue = [];
    $(options.choosedSel).each((i, e) => {
      let val = $(e).attr(propName) || $(e).text();
      storeValue.push(val);
    });
    log(storeName, storeValue);
    local_setValue(storeName, JSON.stringify(storeValue));
  }


  function triggerTrainInfoLoad(options) {
    log("Trig load",
      // options.loadTrigger ? options.loadTrigger.name : null,
      "on event", options.loadedEventType, "of", options.loadedEventTarget);

    waitMutationEvent(options.loadedEventType, $(options.loadedEventTarget).get(0),
      { once: true },
      () => {
        log("Loaded trigger event from", this);
        options.loaded = true;
        setTimeout(rememberTrainProp, options.delay, options);
      });

    // setTimeout(options.loadTrigger, options.loadDelay);
    return;
  }

  /**
   * Save user choices on change
   *
   * NOTE: need to rebind event handler on requery.
   */
  function handleTrainPropRebindAddEvents(options) {
    log("Handle prop Add event.", options.addEventTarget, ":", $(options.addEventTarget));
    try {
      $(options.addEventTarget).each((i, e) => {
        waitMutationEvent(options.addEventType, e, {},
          () => {
            setTimeout(saveTrainProp, options.delay, options);
          });
      });
    } catch (e) {
      // error(`Error waitMutationEvent ${options.addEventType}`, e)
      log("Fall thru to bind Add event", options.addEventType, "of", options.addEventTarget);
      if (options.addEventHandler)
        $(options.addEventTarget).unbind(options.addEventType, options, options.addEventHandler);
      options.addEventHandler = (e) => setTimeout(saveTrainProp, options.delay, options);
      $(options.addEventTarget).bind(options.addEventType, options, options.addEventHandler);
    }
  }
  function handleTrainPropChange(options) {
    handleTrainPropRebindAddEvents(options);

    log("Handle prop Remove event.", options.removeEventTarget, ":", $(options.removeEventTarget));
    try {
      $(options.removeEventTarget).each((i, e) => {
        waitMutationEvent(options.removeEventType, e, {},
          () => { setTimeout((options) => {
            // saveTrainProp(options);
            restoreTrainProp(options);
            handleTrainPropRebindAddEvents(options);
          }, options.delay, options); });
      })
    } catch (e) {
      // error(`Error waitMutationEvent ${options.removeEventType}`, e)
      log("Fall thru to bind remove event", options.removeEventType, "of", options.removeEventTarget);
      $(options.removeEventTarget).bind(options.removeEvent, options,
        (e) => setTimeout(saveTrainProp, options.delay, options)
      );
    }

    $(options.chain).each((i, e) => {
      setTimeout(e, 0);
    });
  }


  function rememberTrainProp(options) {
    log("\n>>>>>>>>>>>>>>>>>>>> rememberTrainProp", options.storeName, " >>>>>>>>>>>>>>>>>>>>>>>>", options);

    let prevValue = loadValue(options);
    if ((prevValue && prevValue.length || options.forceTrigLoad) &&
      !options.loaded && options.loadedEventType && options.loadedEventTarget) {
      return triggerTrainInfoLoad(options);  // will chain back to rememberTrainProp()
    }

    if (options.processed) {
      log("already processed");
      return;
    }
    options.processed = true;

    if (options.loaded)
      log("Train prop loaded");

    restoreTrainProp(options);

    handleTrainPropChange(options);
  }
  // end remember user choice helper functions


  function rememberLeftTicketChoice() {

    // let altDateOptions = {
    //   storeName: "altDate",
    //   propName: "name",
    //   choosedSel: "#sel-date ul#date-list > li.cur[train_date!='yes']",
    //   addEventType: "DOMNodeInserted",
    //   addEventTarget: "#prior_date",
    //   removeEventType: "DOMNodeRemoved",
    //   removeEventTarget: "#prior_date",
    //   delay: 200,
    //   restoreFormat: "#sel-date ul#date-list > li[%k='%v']",
    // };
    // rememberTrainProp(altDateOptions);

    let priorTrainTypeOptions = {
      storeName: "priorTrainType",
      propName: "value",
      choosedSel: "ul#_ul_station_train_code > li > input:checked",
      addEventType: "click",
      addEventTarget: "#train_type_btn_all, ul#_ul_station_train_code > li > input",
      delay: 200,
      restoreFormat: "ul#_ul_station_train_code > li > input[%k='%v']",
    };
    rememberTrainProp(priorTrainTypeOptions);

    let priorFromStationOptions = {
      storeName: "priorFromStation",
      propName: "value",
      choosedSel: "ul#from_station_ul > li > input:checked",
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

    let priorToStationOptions = {
      storeName: "priorToStation",
      propName: "value",
      choosedSel: "ul#to_station_ul > li > input:checked",
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

    // let buyerOptions = {
    //   storeName : "buyer",
    //   propName: "p_value",
    //   choosedSel : "ul#buyer-list > li.cur",
    //   addEventType: "DOMNodeInserted",
    //   addEventTarget: "#setion_postion",
    //   removeEventType: "DOMNodeRemoved",
    //   removeEventTarget: "#setion_postion",
    //   loaded: $("ul#buyer-list > li").length,
    //   loadTrigger: $.showSelectBuyer, //function () { $("div#setion_postion > .wrap-left > a").click(); },
    //   loadDone: $.closeSelectBuyer,
    //   loadedEventType: "DOMNodeInserted",
    //   loadedEventTarget: "ul#buyer-list",
    //   delay: 200,
    //   loadDelay: 1000,
    //   restoreFormat: "ul#buyer-list > li[%k='%v']",
    // };
    // rememberTrainProp(buyerOptions);


    // function addPriorTrain(trainCode) {
    //   $("#inp-train").val(trainCode); //($(this).attr("traincode"));
    //   let cJ = $('#prior_train span.sel-box[name="prior_train-span"]').length;
    //   $("#add-train").click();
    //   /* if (cJ < 6) { $(this).attr("class", "cur"); $.chooseAutoSubmit() } */
    // }

    // let priorTrainOptions = {
    //   storeName: "priorTrain",
    //   propName: "traincode",
    //   choosedSel: '#prior_train span.sel-box[name="prior_train-span"]',
    //   addEventType: "DOMNodeInserted",
    //   addEventTarget: "#prior_train",
    //   removeEventType: "DOMNodeRemoved",
    //   removeEventTarget: "#prior_train",
    //   loaded: $("#yxtrain_code > li").length,
    //   loadTrigger: $.showYxTrain,
    //   loadDone: function () { $("#yxtraindiv").hide(); },
    //   loadedEventType: "DOMNodeInserted",
    //   loadedEventTarget: "#yxtrain_code",
    //   delay: 200,
    //   loadDelay: 1000,
    //   //restoreFormat: "div#yxtraindiv ul#yxtrain_code > li[%k='%v']",
    //   restoreFunc: addPriorTrain,
    // };
    // if ($("#yxtrain_code > li").length) {
    //   log("^_^ prior train already loaded.");
    //   priorTrainOptions.loaded = true;
    //   rememberTrainProp(priorTrainOptions);
    // } else {
    //   log("-_-|| need to load prior train.");
    //   rememberTrainProp(priorTrainOptions);
    //   // $("#query_ticket").bind("click", function(e) { rememberTrainProp(priorTrainOptions); });
    // }

    // let priorAdvanOptOptions = {
    //   storeName: "advanOpt",
    //   propName: "id",
    //   choosedSel: "#ad_setting ~ div > span > input:checked",
    //   addEventType: "click",
    //   addEventTarget: "#ad_setting ~ div > span > input",
    //   delay: 200,
    //   restoreFormat: "input#%v",
    // };
    // rememberTrainProp(priorAdvanOptOptions);

    // let priorTypeOptions = {
    //   storeName: "priorType",
    //   propName: "value",
    //   choosedSel: "#ad_setting ~ div > span > select > option:checked",
    //   addEventType: "click",
    //   addEventTarget: "#ad_setting ~ div > span > select > option",
    //   delay: 200,
    //   restoreFormat: "#ad_setting ~ div > span > select > option[%k='%v']",
    // };
    // rememberTrainProp(priorTypeOptions);
  }

  function rememberVolatileChoice() {

    let priorSeatOptions = {
      storeName: "seatType",
      propName: "value",
      choosedSel: "ul#seat_type_new_ul > li > input:checked",
      addEventType: "click",
      addEventTarget: "#to_seat_type_new_all, ul#seat_type_new_ul > li > input",
      forceTrigLoad: true,
      loadedEventType: "DOMNodeInserted",
      loadedEventTarget: "ul#seat_type_new_ul",
      removeEventType: "DOMNodeRemoved",
      removeEventTarget: "ul#seat_type_new_ul",
      delay: 200,
      restoreFormat: "ul#seat_type_new_ul > li > input[%k='%v']",
    };
    rememberTrainProp(priorSeatOptions);
  }


  function rememberPassengerChoice() {
    let passengerOptions = {
      storeName: "passengers",
      propName: "value",
      choosedSel: "ul#normal_passenger_id > li > input:checked",
      addEventType: "click",
      addEventTarget: "ul#normal_passenger_id > li > input",
      forceTrigLoad: true,
      loaded: $("ul#normal_passenger_id > li").length,
      loadedEventType: "DOMNodeInserted",
      loadedEventTarget: "ul#normal_passenger_id",
      delay: 200,
      restoreFormat: "ul#normal_passenger_id > li > input[%k='%v']",
    };
    rememberTrainProp(passengerOptions);
  }


  /**
   * UI Log
   */
  const DEBUG = 0;
  const PASS = 1;
  const INFO = 2;
  const WARN = 3;
  const FATAL = 4;

  const uilogColorMap = [
    "gray",
    "green",
    "black",
    "orange",
    "red",
  ];

  function createUILogDiv() {
    let div = `\
<div id=ATGT_uilog_div style="position: fixed; bottom: 2px; left: 2px; background-color: #FFFFFFDD; display: none;">
<a onclick="javascript:$('#ATGT_uilog_div').hide();" href="javascript:" style="float: right;">X</a>
<ul id=ATGT_uilog_ul>
<!-- uilog messages here -->
</ul>
</div>
`;
    $("body").append(div);
  }

  function uilog(level) {
    const args = Array.from(arguments).slice(1);
    let logLi = '<li style="color:' + uilogColorMap[level] + ';">' +
      args.join(' ') +
      '</li>';
    $("#ATGT_uilog_ul").append(logLi);
    log(logLi);
    if (level > INFO)
      $("#ATGT_uilog_div").show();
  }


  function compatCheck() {

    let compatList = {
      "超时自动重新查询": [
        /* [".dhx_modal_cover", 1, "检测'正在查询'", WARN], */
        [".dhtmlx_winviewport", 1, "检测'正在查询'", WARN],
        ["#query_ticket", 1, "自动点击'查询按钮'", WARN],
        [".no-ticket", 5, "检测'查询超时'", WARN],
      ],
      "优化乘车选项": [
        ["#relogin, #loginForm", 2, "'登录界面'提升", INFO],
        [".quick-gif, #show_more", 2, "展开'订票助手'", WARN],
        ["select#cc_start_time, div.pos-top", 2, "自定义时间", WARN],
        ["input#autoSubmit", 1, "取消'自动提交'", WARN],
        ["div.sear-result span", 1, "结果提示不遮挡其他选项", WARN],
        ["input#avail_ticket, label[for='avail_ticket']", 2, "自动选择'显示全部可预订车次'", WARN],

      ],
      "记住用户选项，以便刷新后恢复": [
        ["ul#_ul_station_train_code > li > input, #train_type_btn_all", 9, "记住'车次类型'", WARN],
        ["ul#from_station_ul, #from_station_name_all", 2, "记住'出发车站'", WARN],
        ["ul#to_station_ul, #to_station_name_all", 2, "记住'到达车站'", WARN],
        // ["ul#buyer-list, #setion_postion", 2, "记住'乘车人'", WARN],
        ["#prior_train, #yxtrain_code", 2, "记住'优先车次'", WARN],
        ["div#sel-seat ul#seat-list, #prior_seat", 2, "记住'优先席别'", WARN],
        ["#sel-date ul#date-list, #prior_date", 2, "记住'备选日期'", WARN],
        // ["#ad_setting ~ div > span > input", 2, "记住'提交'相关高级设置", WARN],
        // ["#ad_setting ~ div > span > select > option", 2, "记住'选票'相关高级设置", WARN],

        // [$.showSelectBuyer, "function", "打开选择'乘车人'对话框", WARN],
        // [$.closeSelectBuyer, "function", "关闭选择'乘车人'对话框", WARN],
        // [$.showYxTrain, "function", "打开选择'优先车次'对话框", WARN ],
      ],
    };

    function checkOneItem(sel, std, msg, errType) {
      let r0 = NaN;

      if (typeof sel === "string")
        r0 = $(sel).length;
      else if (typeof sel === "function")
        r0 = typeof sel;

      if (r0 != std)
        uilog(errType, msg, "将不起作用" + `${r0} != ${std}`);
      else
        uilog(PASS, msg, "有效");
    }
    uilog(INFO, "12306带我回家, 脚本兼容性检查：");
    for (let cat of Object.keys(compatList)) {
      uilog(INFO, "<br /><b>检查", cat, "</b>");
      for (let item of Array.from(compatList[cat])) {
        checkOneItem.apply(this, item);
      }
    }
  }


  /**
   * Entry code
   */
  // Your code here...
  function runPageTunner() {
    let pageTunners = {
      'leftTicket': () => {
        createUILogDiv();
        compatCheck();
        reQueryIfTimeout();
        optimizeTravelOptions();
        rememberLeftTicketChoice();
        rememberVolatileChoice();
      },
      'confirmPassenger': () => {
        rememberPassengerChoice();
      },
    }

    for (let pat of Object.keys(pageTunners)) {
      if (new RegExp(pat).exec(location.href)) {
        console.log(`${pat}`, pageTunners[pat]);
        pageTunners[pat]();
      }
    }
  }
  //document.addEventListener("DOMContentLoaded", removeAds);
  window.addEventListener("load", removeAds);
  window.addEventListener("load", runPageTunner);
};

function runOnPage(func) {
  let script = document.createElement('script');
  //script.appendChild(document.createTextNode('('+ func +')();'));
  // script.appendChild(document.createTextNode('(function (){' + '(' + func + ')();' + '})();'));
  script.appendChild(document.createTextNode(`(function (){(${func})();})();`));
  (document.body || document.head || document.documentElement).appendChild(script);
}

runOnPage(mainFunc);

console.log("------ 12306");
