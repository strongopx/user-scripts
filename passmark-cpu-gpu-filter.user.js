// ==UserScript==
// @name     Passmark CPU/GPU Filter
// @version  2
// @match    https://www.cpubenchmark.net/cpu_lookup.php*
// @match    https://www.cpubenchmark.net/*_cpus.html*
// @match    https://www.videocardbenchmark.net/video_lookup.php*
// @match    https://www.videocardbenchmark.net/*_gpus.html
// @grant    none
// @icon     https://www.cpubenchmark.net/favicon.ico
// @run-at   document-end
// ==/UserScript==


console.log(`=== cpu benchmark filter on '${location.href}' ===`);

const active_bg_color = '#FFFFFF80';
const inactive_bg_color = 'slategray';
const active_fg_color = 'black';
const inactive_fg_color = 'lightgray';

function gen_filter_keyword(kw_regex, prod_map) {
	let regex = new RegExp(kw_regex, 'i');
	let products = document.querySelectorAll('ul.chartlist .prdname');
	for (let prod of products) {
		let m = prod.innerText.match(regex);
		if (m && m.length >= 2) {
			let kw = m[1];
			kw = kw.replace(/(AMD|Intel)\s+/i, '').replace('-', '').replace(/\s+/, '\\s+');
			//console.log(`gen filter m ${m} kw ${kw}`);
			if (!(kw in prod_map))
				prod_map[kw] = {};
		}
	}
	return prod_map;
}

function gen_filter_map(filter_map) {
	let products = document.querySelectorAll('ul.chartlist .prdname');
	for (let k of Object.keys(filter_map)) {
		let regex = filter_map['regex'];
		if (!regex) {
			regex = filter_map[k]['regex'] = new RegExp(k);
		}
		filter_map[k]['products'] = [];
		for (let prod of products) {
			//console.log('prod', prod.innerText);
			if (regex.test(prod.innerText)) {
				//console.log('Add prod', prod.innerText);
				filter_map[k]['products'].push(prod.parentNode.parentNode);
			}
		}
	}
}

function gen_filter_toolbar(toolbar, filter_map) {
	function filter_action(event) {
		let tool = event.target;
		if (tool.className.indexOf('filter_tool') < 0) {
			tool = tool.parentNode;
			if (tool.className.indexOf('filter_tool') < 0) {
				return;
			}
		}

		let active = tool.attributes['active'];
		//console.log('event on ', event.target, 'active', active);
		active = !active;
		tool.attributes['active'] = active;
		let display = active ? 'block' : 'none';
		for (let node of tool.attributes['map']) {
			console.log('node of map ', node);
			node.style.display = display;
		}
		tool.style.backgroundColor = active ? active_bg_color : inactive_bg_color;
		tool.style.color = active ? active_fg_color : inactive_fg_color;
		if (node.className.indexOf('filter_all') >= 0) {
			for (let node of document.querySelectorAll('.filter_tool.filter_part')) {
				//console.log('alter', node);
				node.attributes['active'] = active;
				node.style.background = active ? active_bg_color : inactive_bg_color;
				node.style.color = active ? active_fg_color : inactive_fg_color;
			}
		}
	}

	let container = document.createElement('DIV');
	container.style.borderTop = 'dotted 6px white';
	container.style.textAlign = 'left';
	toolbar.appendChild(container);

	let node;
	for (let k of Object.keys(filter_map).sort()) {
		node = document.createElement('DIV');
		let name = k.replace(/(\\\w\+?|\.)+/i, ' ');
		let prod_cnt = filter_map[k]['products'].length;
		if (prod_cnt == 0)
			continue;
		name += ` <span style='color: aliceblue;'>(${prod_cnt})</span>`
		node.innerHTML = name;
		node.style.border = '1px black solid';
		node.style.borderRadius = '4px';
		node.style.padding = '2px 4px';
		node.style.margin = '4px';
		node.style.cursor = 'pointer';
		node.style.textAlign = 'left';
		node.style.background = active_bg_color;
		node.style.color = active_fg_color;
		//node.style.float = 'left';
		node.addEventListener('click', filter_action, { capture: true });
		node.attributes['active'] = true;
		node.attributes['map'] = filter_map[k]['products'];
		if (name.search(/^\s*\.?\*\s*/) < 0)
			node.className = 'filter_tool filter_part';
		else
			node.className = 'filter_tool filter_all';
		container.appendChild(node);
	}
}

function create_filter_toolbar() {
	let toolbar = document.createElement('DIV');
	//toolbar.innerText = 'Filter: ';
	toolbar.style.borderRadius = '4px';
	toolbar.style.lineHeight = '1em';
	toolbar.style.position = 'fixed';
	toolbar.style.right = '2px';
	toolbar.style.top = '120px';
	toolbar.style.backgroundColor = inactive_bg_color;
	toolbar.style.color = active_fg_color;
	toolbar.style.zIndex = '10000';
	toolbar.style.fontSize = 'small';
	toolbar.style.padding = '4px';
	toolbar.style.maxWidth = '11rem';
	toolbar.style.maxHeight = '80%';
	toolbar.style.overflowY = 'scroll';

	function fold_filters(event) {
		console.log('Fold Filters');
		let target = event.target;
		target.attributes['fold'] = !target.attributes['fold'];
		for (let node of document.querySelectorAll('.filter_tool')) {
			node.style.display = target.attributes['fold'] ? 'none' : 'block';
		}
	}

	let label = document.createElement('DIV');
	label.innerHTML = 'FILTERS';
	label.style.borderRadius = '4px';
	label.style.textAlign = 'center';
	label.style.padding = '2px';
	label.style.margin = '2px 2px 10px';
	label.style.cursor = 'pointer';
	label.style.fontWeight = 'bold';
	label.style.background = 'white';
	label.attributes['fold'] = false;
	label.onclick = fold_filters;
	toolbar.appendChild(label);
	document.body.appendChild(toolbar);

	return toolbar;
}

function filter_cpus() {
	if (!/cpu/i.test(location.href)) {
		return;
	}

	let toolbar = create_filter_toolbar();

	let all_cpu_map = {
		'.*': {}
	};

	let intel_cpu_map = {
		'Intel': {},
	};

	let amd_cpu_map = {
		'AMD': {},
	};

	/*
	let intel_cpu_map = {
		'Atom': {},
		'Celeron': {},
		'Core\\s+i3': {},
		'Core\\s+i5': {},
		//'Core\\s+i7': {},
		//'Core\\s+i9': {},
		'Core': {},
		'Pentium': {},

		//'Xeon\\s+X': {},
		'Xeon\\s+D': {},
		'Xeon\\s+E3': {},
		'Xeon\\s+E5': {},
		'Xeon\\s+W': {},
		'Xeon\\s+Silver': {},
		'Xeon\\s+Gold': {},
		//'Xeon\\s+Platinum': {},

		'Xeon': {},
	};

  let amd_cpu_map = {
		'Athlon': {},

		'FX': {},

		'Opteron': {},

		'Ryzen\\s+3': {},
		'Ryzen\\s+5': {},
		'Ryzen\\s+7': {},

		'EPYC\\s+3': {},
		'EPYC\\s+7': {},
		'Threadripper': {},
	};
  */


	gen_filter_map(all_cpu_map);
	gen_filter_toolbar(toolbar, all_cpu_map);

	gen_filter_keyword('(Intel\\s+(?:[a-zA-Z]+\\s+)(?:[a-zA-Z][\\d-]|\\d|[a-zA-Z]{2,}))', intel_cpu_map);
	gen_filter_map(intel_cpu_map);
	gen_filter_toolbar(toolbar, intel_cpu_map);

	gen_filter_keyword('(AMD\\s+(?:[a-zA-Z]+\\s+)(?:[a-zA-Z][\\d-]|\\d|[a-zA-Z]{2,}))', amd_cpu_map);
	gen_filter_map(amd_cpu_map);
	gen_filter_toolbar(toolbar, amd_cpu_map);

	/*
  for (let k of Object.keys(cpu_map)) {
		console.log('k', k, cpu_map[k]);
	}
  */

}

function filter_gpus() {
	if (!/gpu/i.test(location.href)) {
		return;
	}

	let toolbar = create_filter_toolbar();

	let all_gpu_map = {
		'.*': {}
	};

	let intel_gpu_map = {
	};

	let nvidia_gpu_map = {
	};

	let amd_gpu_map = {
	};

	gen_filter_map(all_gpu_map);
	gen_filter_toolbar(toolbar, all_gpu_map);

	gen_filter_keyword('((?:Intel)\\s+(?:[a-zA-Z]+\\s+)?(?:[a-zA-Z][\\d-]|\\d|[a-zA-Z]{2,}))', intel_gpu_map);
	gen_filter_map(intel_gpu_map);
	gen_filter_toolbar(toolbar, intel_gpu_map);

	gen_filter_keyword('((?:Nvidia|Geforce|TITAN|Quadro|Tesla)\\s+(?:[a-zA-Z]+\\s+)?(?:[a-zA-Z][\\d-]|\\d+(?=\\d\\d\\s)|[a-zA-Z]{2,}))', nvidia_gpu_map);
	gen_filter_map(nvidia_gpu_map);
	gen_filter_toolbar(toolbar, nvidia_gpu_map);

	gen_filter_keyword('((?:AMD|Radeon|FirePro)\\s+(?:[a-zA-Z]+\\s+)?(?:[a-zA-Z][\\d-]|\\d|[a-zA-Z]{2,}))', amd_gpu_map);
	gen_filter_map(amd_gpu_map);
	gen_filter_toolbar(toolbar, amd_gpu_map);

	/*
  for (let k of Object.keys(gpu_map)) {
		console.log('k', k, gpu_map[k]);
	}
  */

}

filter_cpus();

filter_gpus();

console.log(`=== /cpu benchmark filter on '${location.href}' ===`);
