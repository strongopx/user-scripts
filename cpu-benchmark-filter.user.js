// ==UserScript==
// @name     CPU Benchmark Filter
// @version  1
// @match    https://www.cpubenchmark.net/cpu_lookup.php*
// @match    https://www.cpubenchmark.net/*_cpus.html*
// @grant    none
// @run-at   document-end
// ==/UserScript==


console.log(`=== cpu benchmark filter on '${location.href}' ===`);


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
		let checked = tool.attributes['active'];
		console.log('event on ', event.target, 'checked', checked);

		checked = !checked;
		tool.attributes['active'] = checked;
		let display = checked ? 'block' : 'none';
		for (let node of tool.attributes['map']) {
			//console.log('node of map ', node);
			node.style.display = display;
		}
		tool.style.backgroundColor = checked ? 'lightgreen' : 'white';
		if (/\*/.test(tool.innerText)) {
			for (let node of document.querySelectorAll('.filter_tool.part')) {
				console.log('alter', node);
				node.attributes['active'] = checked;
				node.style.background = checked ? 'lightgreen' : 'white';
			}
		}
	}

	let node;
	for (let k of Object.keys(filter_map)) {
		node = document.createElement('DIV');
		node.innerText = k.replace(/(\\\w\+?|\.)+/i, ' ');
		node.style.border = '1px black solid';
		node.style.padding = '2px 4px';
		node.style.margin = '4px';
		node.style.cursor = 'pointer';
		node.style.textAlign = 'center';
		node.style.background = 'lightgreen';
		node.style.float = 'left';
		node.onclick = filter_action;
		node.attributes['active'] = true;
		node.attributes['map'] = filter_map[k]['products'];
		node.className = 'filter_tool part';
		toolbar.appendChild(node);
	}
	node.className = 'filter_tool';
}

function filter_cpus() {
	let cpu_map = {
		'Core\\s+i3': {},
		'Core\\s+i5': {},
		'Core\\s+i7': {},
		'Core\\s+i9': {},

		'Xeon\\s+X': {},
		'Xeon\\s+D': {},
		'Xeon\\s+E3': {},
		'Xeon\\s+E5': {},
		'Xeon\\s+W': {},
		'Xeon\\s+Silver': {},
		'Xeon\\s+Gold': {},
		'Xeon\\s+Platinum': {},

		'Xeon': {},

		'AMD\\s+FX': {},
		'Opteron': {},
		'Ryzen\\s+3': {},
		'Ryzen\\s+5': {},
		'Ryzen\\s+7': {},

		'EPYC\\s+3': {},
		'EPYC\\s+7': {},
		'Threadripper': {},

		'.*': {}
	};

	gen_filter_map(cpu_map);
	for (let k of Object.keys(cpu_map)) {
		console.log('k', k, cpu_map[k]);
	}

	let toolbar = document.createElement('DIV');
	//toolbar.innerText = 'Filter: ';
	toolbar.style.lineHeight = '1em';
	toolbar.style.position = 'fixed';
	toolbar.style.right = '4px';
	toolbar.style.top = '120px';
	//filter_toolbar.style.backgroundColor = 'orange';
	toolbar.style.color = 'purple';
	toolbar.style.zIndex = '10000';
	toolbar.style.fontSize = 'large';
	toolbar.style.padding = '10px';
	toolbar.style.maxWidth = '20%';

	let label = document.createElement('DIV');
	label.innerText = 'Filters:';
	label.style.fontWeight = 'bold';
	toolbar.appendChild(label);

	gen_filter_toolbar(toolbar, cpu_map);
	document.body.appendChild(toolbar);
}

filter_cpus();

console.log(`=== /cpu benchmark filter on '${location.href}' ===`);
