// ==UserScript==
// @namespace		ATGT
// @name			jssz12320 order page optimize
// @name:zh-CN		苏州市12320预约界面优化
// @description		optimize jiangsu suzhou 12320 order page
// @description:zh-CN		苏州市12320预约界面优化，苏州市卫生热线，增加科室、评分、日期、儿童医院院区过滤，多页加载，医院，医生预约。
// @version  2.2
// @match    *://www.jssz12320.cn/hrs/step03.action
// @match    *://www.jssz12320.cn/hrs/step03?*
// @grant    GM.xmlHttpRequest
// @grant    GM_xmlhttpRequest
// @grant    GM.addStyle
// @grant    GM_addStyle
// @require  https://code.jquery.com/jquery-3.3.1.min.js
// @run-at   document-end
// ==/UserScript==

/* eslint: */
/* global GM GM_xmlhttpRequest GM_setValue GM_getValue GM_registerMenuCommand GM_addStyle $ jQuery */
/* eslint curly: ['off', 'multi', 'consistent'] */

console.log(`=== jssz12320 on '${location.href}' ===`);
let log = console.log;
let info = console.info;
let error = console.error;
let warn = console.warn;


const PAGE_COUNT_LIMIT = 1;
const PAGE_COUNT_LIMIT_STEP = 5;
let g_page_count_real = 0;
let g_page_count_limited = 0;
let g_page_loaded_idx = 0;
let g_page_load_fail = [];

let g_doc_sched_list = [];

const HOSP_PART_MASK_YUAN = 0x1;
const HOSP_PART_MASK_JING = 0x2;
const HOSP_PART_MASK_ALL = 0xFFFFFFFF;
const IS_CHILDREN_HOSPITAL = $('.right-cont > div:first-child').text().includes('儿童');

const DEPARTMENT_ALL = '所有科室';
let g_department_set = new Set();

const DAYS_DEFAULT_CHECKED = 3;

log('IS_CHILDREN_HOSPITAL', IS_CHILDREN_HOSPITAL);

function min(a, b) {
	return (a < b ? a : b);
}

function InitDocDetailDiv() {
	GM_addStyle(`
		tr.evenRow {
			background-color: lightcyan;
		}
		tr.oddRow  {
			background-color: antiquewhite;
		}
		.col-left {
			padding: 10px;
		}
		#doctorInfo2 {
			border: 1px solid;
			position: fixed;
			top: 5px;
			left: 5px;
			background: #f4f4f4;
			width: 16em;
		}
		a:link.close {
			position: absolute;
			top: 2px;
			right: 4px;
			text-decoration: none;
		}
		`);

	$('body').prepend(
		$(`<div id='doctorInfo2'>
				<a class='close' href='javascript:void(0)'>x</a>
				<div>
					Doctor Details
				</div>
			</div>
		`)
	);
	$('#doctorInfo2').hide();
	$('#doctorInfo2 .close').on('click', (e) => {
		$(e.target.parentNode).hide();
	});
}
InitDocDetailDiv();

let docInfoCache = {};
let docInfoKeyLast = null;

function GetDoctorInfoEx(node, hospName, depName, docName, docRank, docIntro, docMajor, docPhotoURL, docRate, multipleHosp) {
	//log('GetDoctorInfoEx', arguments);
	$('#doctorInfo2').show();
	let div = $('#doctorInfo2 div');
	let docInfoKey = [hospName, depName, docName, docRank, docRate].join('&');
	log('request doc info of ', docInfoKey);
	if (docInfoKey in docInfoCache) {
		//log('++++++ cache hit');
		if (docInfoKey != docInfoKeyLast) {
			div.html(docInfoCache[docInfoKey]);
			docInfoKeyLast = docInfoKey;
		}
		return;
	} else {
		//log('------ cache miss');
	}
	div.html('查询中。。。请稍等。。。');//清除之前的load内容
	let xhr = jQuery.ajax({
		url: 'queryDoctorInfo',
		type: 'POST',
		data: {
			'doctorInfo.hospName': hospName,
			'doctorInfo.depName': depName,
			'doctorInfo.docName': docName,
			'doctorInfo.docRank': docRank,
			'doctorInfo.docIntro': docIntro,
			'doctorInfo.docMajor': docMajor,
			'doctorInfo.docPhotoURL': docPhotoURL,
			'doctorInfo.docRate': docRate,
			'doctorInfo.multipleHosp': multipleHosp,
		},
		cache: false
	});

	xhr.done(function (resp) {
		//log('>>> GetDoctorInfoEx done <<<');
		div.html(resp);
		docInfoKeyLast = docInfoKey;
		docInfoCache[docInfoKey] = resp;
	});
	xhr.fail(function (resp) {
		error('*** GetDoctorInfoEx fail', resp);
		div.html('加载失败！');
	});
}

function RowColorify(row, idx) {
	$(row).removeClass('evenRow').removeClass('oddRow');
	$(row).addClass((idx % 2 == 0) ? ' evenRow' : ' oddRow');
}

function ReplaceDocInfoHandler(row, row_next) {
	let doc = row.firstElementChild;
	let func;
	try {
		func = doc.onclick.toString();
		doc.onclick = '';
	} catch (e) {
		/* already processed */
		return;
	}
	let params = func.slice(func.indexOf('getDoctorInfo(') + 'getDoctorInfo('.length, func.lastIndexOf(')'));
	params = params.split(/'\s*,\s*'/);
	let first = params.shift().split(/,'/);
	let last = params.pop().split(/'/).shift();
	params = first.concat(params).concat(last);
	params[0] = '';
	//log('params', params);
	(function () {
		let params_copy = JSON.parse(JSON.stringify(params)); // make a local deep copy of r0
		let handler = function (event) {
			GetDoctorInfoEx.apply(event.target, params_copy);
		};
		$(row).on('click', handler); //.on('mouseover', handler);
		$(row_next).on('click', handler); //.on('mouseover', handler);
	})();
}

function ProcSchedTable() {
	let rows = $('#pipetable tr:gt(0):visible');
	for (let i = 0; i < rows.length; i += 2) {
		let row = rows[i];
		let docIdx = Math.floor(i / 2);
		let row_next = rows[i + 1];
		RowColorify(row, docIdx);
		RowColorify(row_next, docIdx);
		ReplaceDocInfoHandler(row, row_next);
	}
}

function FilterMask(mask_of_doc, filter_new) {
	//log('FilterMask', mask_of_doc, filter_new);
	//log('FilterMask.sched_mask', mask_of_doc.sched_mask.toString(16), filter_new.sched_mask.toString(16));
	let match = (mask_of_doc.hosp_part_mask & filter_new.hosp_part_mask)
		&& (mask_of_doc.doc_score >= filter_new.doc_score)
		&& (filter_new.department === DEPARTMENT_ALL || mask_of_doc.department === filter_new.department)
		&& (mask_of_doc.sched_mask & filter_new.sched_mask);
	//log('match', match);
	return match;
}

function UpdateFilter() {
	log('UpdateFilter');
	$('#filter-status').show();
	let filter = {};
	filter.hosp_part_mask = parseInt($(`#hosp-part input[type='radio'][name='hosp_part_radio']:checked`).val());
	//log('filter.hosp_part_mask', filter.hosp_part_mask.toString(16));
	filter.doc_score = parseFloat($('#doc-score').val());
	filter.department = $('#department').val();
	filter.sched_mask = 0;
	let sched_filter = $(`#dayofweek input[type='checkbox']`);
	for (let i = 0; i < sched_filter.length; i++) {
		if (sched_filter[i].checked)
			filter.sched_mask |= 0x00010001 << i;
	}
	let doc_sched_nodes = $('#pipetable tbody tr:gt(0)');
	for (let i = 0; i < doc_sched_nodes.length; i += 2) {
		let doc_mask = g_doc_sched_list[i / 2];
		let mask = doc_mask.sched_mask;
		if (FilterMask(mask, filter)) {
			$(doc_sched_nodes[i]).show();
			$(doc_sched_nodes[i + 1]).show();
			//$(doc_sched_nodes[i]).addClass('match');
			//$(doc_sched_nodes[i+1]).addClass('match');
		} else {
			$(doc_sched_nodes[i]).hide();
			$(doc_sched_nodes[i + 1]).hide();
			//$(doc_sched_nodes[i]).removeClass('match');
			//$(doc_sched_nodes[i+1]).removeClass('match');
		}
	}
	ProcSchedTable();
	setTimeout(function () {
		//log('hide status');
		$('#filter-status').hide();
	}, 300);
}

function UpdateDepartFilterOption() {
	let department_node = $('#department').empty();
	let hosp_part_mask = parseInt($(`#hosp-part input[type='radio'][name='hosp_part_radio']:checked`).val());
	//log('g_department_set', g_department_set);
	let dep_set = new Set();
	g_department_set.forEach(x => {
		if (x[1] & hosp_part_mask)
			dep_set.add(x[0]);
	});
	//dep_arr = dep_arr.filter(x => x[1] & hosp_part_mask);
	//log('dep_set', dep_set);
	let dep_arr = Array.from(dep_set).sort((x, y) => x.localeCompare(y, 'zh-CN'))
	dep_arr.splice(0, 0, DEPARTMENT_ALL);
	for (let dep of dep_arr)
		department_node.append(`<option value='${dep}'>${dep}</option>`);
	department_node.unbind('change').on('change', UpdateFilter);
}

function AddFilterOptions() {
	$('#filter-options').remove();
	GM_addStyle(`
	#filter-options {
		position: relative;
		border: 1px solid gray;
		padding: 2px 2px;
		border-radius: 4px;
		background: #efefef;
	}
	#filter-options > div {
		padding: 2px 2px;
	}
	#filter-title {
		float: right;
		font-size: small;
		color: gray;
		font-weight: bold;
	}
	div.inline, div.inline input, div.inline label {
		display: inline-block;
	}
	.right-border {
		border-right: 1px solid gray;
	}
	.bottom-border {
		border-bottom: 1px solid gray;
		padding-bottom: 4px;
		margin-bottom: 4px;
	}
	.top-border {
		border-top: 1px solid gray;
	}
	#hosp-part {
		vertical-align: top;
	}
	#doc-score {
		width: 3em;
	}
	#doc-score-good {
		display: none;
	}
	#doc-score-good:checked ~ label{
		padding-right: 14px;
	}
	#dayofweek input {
		display: none;
	}
	input[type='checkbox'] ~ label {
		position: relative;
		vertical-align: top;
		border: 1px solid gray;
		border-radius: 2px;
		padding: 3px 6px;
		margin-right: 4px;
		font-size: x-small;
	}
	input[type='checkbox']:checked ~ label {
		background: lightblue;
	}
	input[type='checkbox'] ~ label:hover {
		background: thistle;
	}
	input[type='checkbox']:checked ~ label:after {
		content: '🗸';
		position: absolute;
		right: 2px;
		top: 2px;
	}
	#dayofweek :last-child {
		vertical-align: bottom;
	}
	#dayofweek :last-child input ~ label {
		padding-top: 6px;
		padding-bottom: 6px;
		font-weight: bold;
	}
	#dayofweek :last-child input:checked ~ label {
		padding-right: 14px;
	}
	#load-more {
		border: dimgray solid 1px;
		border-radius: 4px;
		background: linear-gradient(white, #ebf8b1, #f69d3c);
	}
	#load-more:not(hover) {
		background-color: orange;
		animation-name: flash;
		animation-duration: 2s;
		animation-timing-function: linear;
		animation-iteration-count: infinite;
	}
	#load-more:hover {
		animation-name: unset;
		opacity: 0.9;
	}
	tr.match {
		background: yellow;
	}
	#filter-status {
		display: none;
		position: absolute;
		right: 2px;
		bottom: 2px;
		color: red;
	}
	.hidden {
		display: none!important;
	}
	span.highlight {
		color: red;
		font-weight: bold;
		font-size: large;
	}

	@keyframes flash {
		0% { background: linear-gradient(white, #ebf8b1, #f69d3c); }
		10% { background: linear-gradient(white, #ebf8b1e0, #f69d3ce0); }
		20% { background: linear-gradient(white, #ebf8b1c0, #f69d3cc0); }
		30% { background: linear-gradient(white, #ebf8b1a0, #f69d3ca0); }
		40% { background: linear-gradient(white, #ebf8b180, #f69d3c80); }
		50% { background: linear-gradient(white, #ebf8b1a0, #f69d3ca0); }
		60% { background: linear-gradient(white, #ebf8b1b0, #f69d3cb0); }
		70% { background: linear-gradient(white, #ebf8b1c0, #f69d3cc0); }
		80% { background: linear-gradient(white, #ebf8b1d0, #f69d3cd0); }
		90% { background: linear-gradient(white, #ebf8b1e0, #f69d3ce0); }
		100% { background: linear-gradient(white, #ebf8b1, #f69d3c); }
	}
	`);
	let right_cont = $('.right-cont');
	let options = `
	<div id='filter-options'>
		<div id='filter-title'>过滤<br>选项</div>
		<div id='hosp-part' class='inline right-border ${IS_CHILDREN_HOSPITAL ? '' : 'hidden'}'>
			<div>
				<input id='hosp-part-yuan' type='radio' name='hosp_part_radio' value='${HOSP_PART_MASK_YUAN}'>
				<label for='hosp-part-yuan'>园区总院</label>
			</div>
			<div>
				<input id='hosp-part-jing' type='radio' name='hosp_part_radio' value='${HOSP_PART_MASK_JING}'>
				<label for='hosp-part-jing'>景德路院区</label>
			</div>
			<div class='inline hidden'>
				<input id='hosp-part-all' type='radio' name='hosp_part_radio' value='${HOSP_PART_MASK_ALL}' checked>
				<label for='hosp-part-all'>无须区分院区</label>
			</div>
		</div>
		<div class='inline'>
			<div class='bottom-border'>
				<label for='department'>科室：</label>
				<select id='department'>
				</select>
			</div>
			<div>
				<label for='doc-score'>评分大于：</label>
				<input id='doc-score' type='number' value='0' min='0' max='5' step='0.1'>
				<input id='doc-score-good' type='checkbox'>
				<label for='doc-score-good'>只显示>=4.8分的</label>
			</div>
		</div>
		<div id='dayofweek'>
		</div>
		<div id='loading-progress' class='inline'>
		</div>
		<div class='inline'>
			<input id='load-more' type='button' name='load-more'
				value='再加载 N 页'>
			<span>（建议指定‘专家姓名’或‘科室名称’以减少页数。）</span>
		</div>
		<div id='filter-status'>
			更新中...
		</div>
	</div>
	`;
	right_cont.children('table:first-of-type').after(options);

	/* hosptial part */
	$(`#hosp-part input[type='radio'][name='hosp_part_radio']`).on('change', () => {
		UpdateDepartFilterOption();
		UpdateFilter();
	});

	/* department */
	UpdateDepartFilterOption();

	/* doctor score */
	$('#doc-score').on('keyup', function (e) {
		if (e.key === 'Enter') {
			log('update doc-score by key');
			UpdateFilter();
		}
	}).on('mouseup', function () {
		log('update doc-score by mouse');
		UpdateFilter();
	}).on('change', function (e) {
		doc_score_saved = $(e.target).val();
		log('doc-score change', doc_score_saved);
		$('#doc-score-good').prop('checked', false);
	});
	let doc_score_saved = 0;
	$('#doc-score-good').on('change', (e) => {
		if (e.target.checked) {
			doc_score_saved = $('#doc-score').val();
			$('#doc-score').val('4.8');
		} else {
			$('#doc-score').val(doc_score_saved);
		}
		UpdateFilter();
	});

	/* days of week */
	let dayofweek = $('#dayofweek');
	let days = $('#pipetable tbody tr:first-child th:gt(2)');
	let daymasks_all = (1 << days.length) - 1;
	let daymasks_update = (1 << DAYS_DEFAULT_CHECKED) - 1;
	/* each day */
	for (let i = 0; i < days.length; i++) {
		let day = days[i];
		$(`<div class='inline'>
				<input id='day_from_now_${i}' class='inline day_from_now' type='checkbox'
					name='day_from_now_${i}' value='${1 << i}' ${i < DAYS_DEFAULT_CHECKED ? 'checked' : ''}>
				<label for='day_from_now_${i}'>${day.innerHTML}</label>
			</div>
		`).appendTo(dayofweek).children('input').on('change', (e) => {
			let node = e.target;
			if (node.checked)
				daymasks_update |= parseInt($(node).val());
			else
				daymasks_update &= ~parseInt($(node).val());
			log('daymasks_update', daymasks_update.toString(16));
			$('#allweekday')[0].checked = (daymasks_all == daymasks_update);
			UpdateFilter();
		});
	}
	/* all day check */
	$(`<div class='inline'>
			<input id='allweekday' class='inline' type='checkbox' name='allweekday'>
			<label for='allweekday'>所有日期</label>
		</div>
	`).appendTo(dayofweek).children('input').on('change', (e_all) => {
		$(`.day_from_now`).prop('checked', e_all.target.checked);
		daymasks_update = e_all.target.checked ? daymasks_all : 0;
		UpdateFilter();
	});

	/* load more pages */
	$('#load-more').on('click', () => {
		$('#load-more').attr('disabled', 'disabled');
		g_page_count_limited = min(g_page_count_limited + PAGE_COUNT_LIMIT_STEP, g_page_count_real);
		setTimeout(() => {
			GetDocSchedPage(g_page_loaded_idx + 1);
		}, 100);
	});
}

function ParsePageCount(page) {
	let divs = page.children('div');
	//log('.schedule > div', divs);
	for (let i = 1; i < divs.length; i++) {
		let div = divs[i];
		let matches = div.innerText.match(/共\s*(\d+)\s*页/);
		if (!matches)
			continue;
		let page_count = parseInt(matches[1]) || -1;

		matches = div.innerText.match(/第\s*(\d+)\s*页/);
		let page_no = parseInt(matches[1]) || 1;

		/* replace previous counts */
		let totals = div.innerText.split('|');
		div.innerText = totals[1] + ' | ' + totals[2];

		return [page_count, page_no];
	}
	return [-1, 1];
}

function GenPageMasks(row_up, row_down) {
	let doc_desc = row_up.children('td:first-child');
	let mask = {};
	mask.doc_name = doc_desc.children('#dname').text();
	mask.doc_title = doc_desc.children('font:first-of-type').text();
	if (mask.doc_title.includes('评分'))
		mask.doc_title = '';
	mask.doc_score = parseFloat(doc_desc.children('font:last-of-type').text().split(/:|：/)[1]) || 0.1;
	mask.department = row_up.children('td:nth-child(2)').text().replace(/^[\s\n\r]*|[\s\n\r]*$/gm, '');
	mask.hosp_part_mask = HOSP_PART_MASK_ALL;
	if (IS_CHILDREN_HOSPITAL) {
		if (/(\(|（).*园.*(\)|）)/.test(mask.department))
			mask.hosp_part_mask = HOSP_PART_MASK_YUAN;
		else if (/(\(|（).*景.*(\)|）)/.test(mask.department))
			mask.hosp_part_mask = HOSP_PART_MASK_JING;
	}
	//log(`department ${mask.department} hosp_part_mask ${mask.hosp_part_mask}`);
	//mask.department = mask.department.split(/(\(|（)/, 1)[0];
	g_department_set.add([mask.department, mask.hosp_part_mask]);

	let sched = row_up.children('td:gt(2)');
	mask.sched_mask = 0;
	for (let i = 0; i < sched.length; i++) {
		if ($(sched[i]).children('input:first-child').length)
			mask.sched_mask |= 1 << i;
	}
	sched = row_down.children('td:gt(0)');
	for (let i = 0; i < sched.length; i++) {
		if ($(sched[i]).children('input:first-child').length)
			mask.sched_mask |= 1 << (i + 16);
	}
	//log('mask', mask);
	return mask;
}
function ParsePageSched(page_no, page) {
	log(`parse page No.${page_no}/${g_page_count_limited}`);
	ShowLoadedProgress(page_no);
	let rows = page.find('#pipetable tr');
	//if (!g_doc_sched_list.length)
	//	g_doc_sched_list.push(rows[0]);
	for (let i = 1; i < rows.length; i += 2) {
		let doc_name = $(rows[i]).find('#dname').text();
		g_doc_sched_list.push({
			doc_name: doc_name,
			//sched: [rows[i], rows[i + 1]],
			sched_mask: GenPageMasks($(rows[i]), $(rows[i + 1]))
		});
		if (page_no > 1) {
			$('#pipetable tbody').append(rows[i], rows[i + 1]);
		}
	}
	UpdateDepartFilterOption();
	UpdateFilter();
}
function ShowLoadedProgress(page_no) {
	g_page_loaded_idx = page_no;
	$('#loading-progress').html(
		`已加载 <span class='${page_no < g_page_count_real ? 'highlight' : ''}'>${page_no}</span> 页，共 ${g_page_count_real} 页
		${g_page_load_fail.length ? '，其中第 [ ' + g_page_load_fail.join('、') + ' ] 页加载失败' : ''}`
	);
	if (g_page_count_limited >= g_page_count_real) {
		$('#load-more').parent().hide();
	}
}
function GetDocSchedPage(page_no) {
	log(`get page No.${page_no}/${g_page_count_limited}`);
	if (page_no > g_page_count_limited) {
		error(`page No. too large ${page_no} > ${g_page_count_limited}`);
		$('#load-more').removeAttr('disabled').val(
			`再加载 ${min(PAGE_COUNT_LIMIT_STEP, g_page_count_real - g_page_count_limited)} 页`
		);
		return;
	}
	$('#load-more').attr('disabled', 'disabled');
	let two_week_flag = $('#14thflag').attr('flag') == 'yes';
	let weekth = 1;
	$('#depweektabs').hide();
	if (two_week_flag)
		$('#docweektabs').show();
	else
		$('#docweektabs').hide();
	if (two_week_flag && !$('.docFirstWeek').hasClass('cur'))
		weekth = 2;

	let data = {
		docName: $('#docName').val(),
		deptName: $('#dptName').val(),
		hospName: $('#hospitalName').val(),
		regType: $('input:radio:checked').val(),
		weekth: weekth
	};
	if (page_no)
		data['page.pageNum'] = page_no;
	let xhr = jQuery.ajax({
		url: 'load_doc_schedule',
		type: 'POST',
		dataType: 'html',
		data: data,
		cache: false
	});
	xhr.done(function (resp) {
		//log('xhr doc sched done');
		let doc_sched = new DOMParser().parseFromString(resp, 'text/html');
		ParsePageSched(page_no, $(doc_sched));
		GetDocSchedPage(page_no + 1);
	});
	xhr.fail(function (resp) {
		error('*** xhr doc sched fail', resp);
		g_page_load_fail.push(page_no);
		ShowLoadedProgress(page_no);
		GetDocSchedPage(page_no + 1);
	});
}
function GetAllSchedPages() {
	g_page_count_real = ParsePageCount($('.schedule'))[0];
	log('g_page_count_real', g_page_count_real);
	g_page_count_limited = min(g_page_count_real, PAGE_COUNT_LIMIT);
	ParsePageSched(1, $('.schedule'));
	GetDocSchedPage(2);
}

function ResetStorage() {
	g_page_load_fail.length = 0;
	g_doc_sched_list.length = 0;
	g_department_set.clear();
}

(function waitForScheduleTable() {
	// Callback function to execute when mutations are observed
	let callback = function (mutationsList) {
		for (let mutation of mutationsList) {
			if (mutation.type == 'childList' && mutation.addedNodes.length) {
				if ($('table input:radio:checked').val() == 1) {
					/* normal department */
					$('#filter-options').remove();
				} else {
					/* specialist */
					ResetStorage();
					AddFilterOptions();
					GetAllSchedPages();
				}
				//observer.disconnect();
			}
		}
	};
	// Create an observer instance linked to the callback function
	var observer = new MutationObserver(callback);
	observer.observe(document.querySelector('.schedule'),
		{ childList: true, subtree: false }
	);
})();

(function TinyTunePage() {
	function doSearch(evt) {
		if (event.keyCode === 13) {
			$('#button').click();
		}
	}

	$('#dptName').on('keyup', doSearch);
	$('#docName').on('keyup', doSearch);
})();

console.log(`=== /jssz12320 on '${location.href}' ===`);
