// Copyright (c) 2024 MintJams Inc. Licensed under MIT License.

let vComponents = {};

let makePath = function(node) {
	const nodeNames = [];
	for (; node.parentNode; node = node.parentNode) {
		const siblings = node.parentNode.children;

		if (siblings.length == 1) {
			nodeNames.unshift(node.nodeName);
			continue;
		}

		let index = -1;
		let count = 0;
		for (const sibling of siblings) {
			if (node.nodeName != sibling.nodeName) {
				continue;
			}

			count++;

			if (node == sibling) {
				index = count - 1;
			}
		}

		let nodeName = node.nodeName;
		if (count > 1) {
			nodeName += '[' + index + ']';
		}
		nodeNames.unshift(nodeName);
	}

	return '/' + nodeNames.join('/');
};

let delay = function(func, ms) {
	let timer = 0;
	return function(...args) {
		clearTimeout(timer);
		timer = setTimeout(func.bind(this, ...args), ms || 0);
	}
};

let getValueByPath = function(obj, path) {
	return path.split('.').reduce((o, key) => o?.[key], obj);
};

let setValueByPath = function(obj, path, value) {
	const keys = path.split('.');
	const lastKey = keys.pop();
	const target = keys.reduce((o, key) => o[key], obj);
	target[lastKey] = value;
};

class Values {
	static isNumber(value) {
		return (typeof value == 'number');
	}

	static isBoolean(value) {
		return (typeof value == 'boolean');
	}

	static isString(value) {
		return (typeof value == 'string');
	}

	static isDate(value) {
		return (toString.call(value) == '[object Date]');
	}

	static toNumber(value, defaultValue) {
		if (value == undefined) {
			return defaultValue;
		}

		value = Number(value);
		if (!isNaN(value)) {
			return value;
		}

		return defaultValue;
	}

	static toBoolean(value, defaultValue) {
		if (value == undefined) {
			return defaultValue;
		}
		if (typeof value == 'boolean') {
			return value;
		}

		if (typeof value == 'number') {
			if (value == 0) {
				return false;
			}
			return true;
		}

		if (typeof value == 'string') {
			try {
				return (JSON.parse(value.toLowerCase()) == true);
			} catch (ex) { }
		}

		return defaultValue;
	}

	static toString(value, defaultValue) {
		if (value == undefined) {
			return defaultValue;
		}
		if (typeof value == 'string') {
			return value;
		}

		try {
			return value.toString();
		} catch (ex) { }

		return defaultValue;
	}

	static trim(value) {
		return Values.toString(value, '').trim();
	}

	static toDate(value, defaultValue) {
		if (value == undefined) {
			return defaultValue;
		}
		if (toString.call(value) == '[object Date]') {
			return value;
		}

		try {
			return new Date(value);
		} catch (ex) { }

		return defaultValue;
	}

	static hashCode(value) {
		if (value == undefined) {
			return undefined;
		}

		value = JSON.stringify(value);
		if (value.length == 0) {
			return 0;
		}

		return value.split('').reduce(function(a, b) {
			a = ((a << 5) - a) + b.charCodeAt(0);
			return a & a
		}, 0);
	}

	static toISODateString(value) {
		try {
			if (!Values.isDate(value)) {
				value = new Date(value);
			}

			return '' + value.getFullYear() + '-' +
				('0' + (value.getMonth() + 1)).slice(-2) + '-' +
				('0' + value.getDate()).slice(-2);
		} catch (ignore) { }

		return '';
	}

	static toISOTimeString(value) {
		try {
			if (!Values.isDate(value)) {
				value = new Date(value);
			}

			return ('0' + value.getHours()).slice(-2) + ':' +
				('0' + value.getMinutes()).slice(-2);
		} catch (ignore) { }

		return '';
	}

	static toISODateTimeString(value) {
		try {
			if (!Values.isDate(value)) {
				value = new Date(value);
			}

			return '' + value.getFullYear() + '-' +
				('0' + (value.getMonth() + 1)).slice(-2) + '-' +
				('0' + value.getDate()).slice(-2) + 'T' +
				('0' + value.getHours()).slice(-2) + ':' +
				('0' + value.getMinutes()).slice(-2);
		} catch (ignore) { }

		return '';
	}

	static clone(value, defaultValue) {
		if (value == undefined) {
			return defaultValue;
		}

		value = structuredClone(value);
		if (value != undefined) {
			return value;
		}

		return defaultValue;
	}
}

class VModels {
	static toValue(vNode, v) {
		if (vNode.vModelModifiers.includes('number')) {
			return Values.toNumber(v);
		}
		if (vNode.vModelModifiers.includes('date') || vNode.vModelModifiers.includes('datetime')) {
			return Values.toDate(v);
		}
		if (vNode.vModelModifiers.includes('time')) {
			return Values.toDate('1970-01-01T' + v);
		}
		if (vNode.vModelModifiers.includes('boolean')) {
			return Values.toBoolean(v);
		}
		return Values.toString(v);
	}

	static toString(vNode, v) {
		if (vNode.vModelModifiers.includes('date')) {
			return Values.toISODateString(v);
		}
		if (vNode.vModelModifiers.includes('time')) {
			return Values.toISOTimeString(v);
		}
		if (vNode.vModelModifiers.includes('datetime')) {
			return Values.toISODateTimeString(v);
		}
		return Values.toString(v);
	}
}

class VForExpression {
	constructor(vNode, source) {
		let vForExpression = this;
		vForExpression.$vNode = vNode;
		source = Values.toString(source, '').trim();
		if (source == '') {
			throw new Error('The expression must be specified.');
		}
		vForExpression.$source = source;

		let s = source;
		let expression;
		if (s.startsWith('(')) {
			let v = s.match(/\(.*\)/);
			if (!v) {
				throw new Error('Syntax error: ' + vForExpression.$source);
			}
			v = v[0];
			expression = s.substring(v.length).trim();
			s = v;
		} else if (s.startsWith('{')) {
			let v = s.match(/\{.*\}/);
			if (!v) {
				throw new Error('Syntax error: ' + vForExpression.$source);
			}
			v = v[0];
			expression = s.substring(v.length).trim();
			s = v;
		} else if (s.startsWith('[')) {
			let v = s.match(/\[.*\]/);
			if (!v) {
				throw new Error('Syntax error: ' + vForExpression.$source);
			}
			v = v[0];
			expression = s.substring(v.length).trim();
			s = v;
		} else {
			let v = s.split(/\s/);
			if (v.length < 3) {
				throw new Error('Syntax error: ' + vForExpression.$source);
			}
			v = v[0];
			expression = s.substring(v.length).trim();
			s = v;
		}

		const c = expression.split(/\s/);
		if (c.length < 2 || ['of', 'in'].indexOf(c[0]) == -1) {
			throw new Error('Syntax error: ' + vForExpression.$source);
		}
		expression = ' ' + expression;

		let indexVariable;
		let variables = [];
		if (s.startsWith('(')) {
			s = s.substring(1, s.length - 1).trim();
			let v;
			if (s.startsWith('{')) {
				v = s.match(/\{.*\}/);
				if (!v) {
					throw new Error('Syntax error: ' + vForExpression.$source);
				}
			} else if (s.startsWith('[')) {
				v = s.match(/\[.*\]/);
				if (!v) {
					throw new Error('Syntax error: ' + vForExpression.$source);
				}
			}
			if (v) {
				expression = v + expression;
				variables.push(...v.substring(1, v.length - 1).trim().split(/\s*,\s*/));
				let i = s.substring(v.length).trim();
				if (i.length > 0) {
					if (i == ',' || !i.startsWith(',')) {
						throw new Error('Syntax error: ' + vForExpression.$source);
					}
					indexVariable = i.substring(1).trim();
				}
			} else {
				v = s.split(/\s*,\s*/);
				if (v.length == 0) {
					throw new Error('Syntax error: ' + vForExpression.$source);
				}
				expression = v[0] + expression;
				variables.push(v[0]);
				if (v.length > 1) {
					indexVariable = v[1];
				}
			}
		} else if (s.startsWith('{')) {
			expression = s + expression;
			variables.push(...s.substring(1, s.length - 1).trim().split(/\s*,\s*/));
		} else if (s.startsWith('[')) {
			expression = s + expression;
			variables.push(...s.substring(1, s.length - 1).trim().split(/\s*,\s*/));
		} else {
			expression = s + expression;
			variables.push(s);
		}

		for (const name of variables.concat([indexVariable])) {
			if (name == undefined) {
				continue;
			}
			if (name.split(/\s/).length > 1) {
				throw new Error('Syntax error: ' + vForExpression.$source);
			}
		}

		vForExpression.$expression = expression;
		vForExpression.$variables = variables;
		vForExpression.$indexVariable = indexVariable;
	}

	execute(func) {
		let vApp = this.$vNode.$vApp;
		let vNode = this.$vNode;
		let vForExpression = this;

		let source = '(function() {';
		source += 'let $index = -1;';
		source += 'for (const ' + vForExpression.$expression + ') {';
		source += '$index++;';
		source += 'const $bindings = {};';
		for (const name of vForExpression.$variables) {
			source += '$bindings[\'' + name + '\'] = ' + name + ';';
		}
		if (vForExpression.$indexVariable != undefined) {
			source += '$bindings[\'' + vForExpression.$indexVariable + '\'] = $index;';
		}
		source += '$function($bindings);';
		source += '}';
		source += '})()';

		let bindings = {};
		if (vNode.$bindings) {
			for (const [name, value] of Object.entries(vNode.$bindings)) {
				bindings[name] = value;
			}
		}
		bindings['$function'] = func;

		vApp.eval(source, bindings);
	}
}

class VIfStatus {
	constructor() {
		this.clear();
	}

	get canIf() {
		return true;
	}

	get canElseIf() {
		return (this.$executed == 'v-if' || this.$executed == 'v-else-if');
	}

	get canElse() {
		return (this.$executed == 'v-if' || this.$executed == 'v-else-if');
	}

	get condition() {
		return this.$condition;
	}

	markTruthy(executed) {
		this.$executed = executed;
		this.$condition = true;
	}

	markFalsy(executed) {
		this.$executed = executed;
		this.$condition = false;
	}

	done() {
		this.clear();
	}

	clear() {
		this.$executed = undefined;
		this.$condition = false;
	}
}

class VRenderContext {
	constructor() {
		this.clearIfStatus();
	}

	get ifStatus() {
		return this.$ifStatus;
	}

	clearIfStatus() {
		this.$ifStatus = new VIfStatus();
	}
}

class VEventHandler {
	constructor(type, expression) {
		let vEventHandler = this;
		let typeAndModifiers = type.split('.');
		vEventHandler.$type = typeAndModifiers.shift();
		vEventHandler.$modifiers = typeAndModifiers;
		vEventHandler.$expression = Values.toString(expression, '').trim();
		if (vEventHandler.$type == '') {
			throw Error('The event type must be specified.');
		}
	}

	get type() {
		let vEventHandler = this;
		return vEventHandler.$type;
	}

	get modifiers() {
		let vEventHandler = this;
		return vEventHandler.$modifiers;
	}

	get lifecycleEvents() {
		return ['bind', 'bound', 'unbind', 'unbound', 'updated'];
	}

	get isLifecycleEvent() {
		let vEventHandler = this;
		return (vEventHandler.lifecycleEvents.includes(vEventHandler.type));
	}

	register(vNode) {
		let vEventHandler = this;
		vEventHandler.$vNode = vNode;
		vEventHandler.$eventListener = function(event) {
			let vApp = vEventHandler.$vNode.$vApp;
			let bindings = {
				event: event,
				vNode: vNode,
				...vNode.$bindings,
			};

			for (const modifier of vEventHandler.$modifiers) {
				if (modifier == 'stop') {
					event.stopPropagation();
				} else if (modifier == 'prevent') {
					event.preventDefault();
				} else if (event.key && event.key.toLowerCase() != modifier.toLowerCase()) {
					return;
				}
			}

			if (vEventHandler.$expression == '') {
				return;
			}

			let result;
			if (typeof vApp.$instance.methods == 'object') {
				result = vApp.$instance.methods[vEventHandler.$expression];
			}
			if (typeof result != 'function') {
				result = vApp.eval(vEventHandler.$expression, bindings, true);
			}
			if (typeof result == 'function') {
				try {
					result = result.apply(vApp, [event, vNode]);
				} catch (ex) {
					vApp.log.error(ex);
				}
			}
			if (result instanceof Promise) {
				result.then(function() {
					vApp.commit();
				});
			}
			vApp.commit();
		};
		vEventHandler.$vNode.$node.addEventListener(vEventHandler.type, vEventHandler.$eventListener);

		return vEventHandler;
	}

	unregister() {
		let vEventHandler = this;
		if (vEventHandler.$eventListener == undefined) {
			return;
		}

		vEventHandler.$vNode.$node.removeEventListener(vEventHandler.type, vEventHandler.$eventListener);
		vEventHandler.$eventListener = undefined;
	}
}

class VNode {
	#styles;

	constructor({ node, parentVNode, vApp, bindings }) {
		let vNode = this;
		vNode.$node = node;
		vNode.$parentVNode = parentVNode;
		vNode.$nodeType = node.nodeType;
		vNode.$isReactive = false;
		vNode.$isComponent = false;
		vNode.$vApp = vApp;
		vNode.$bindings = bindings ? bindings : {};

		if (vNode.$node.nodeType == Node.ELEMENT_NODE) {
			vNode.$nodeName = vNode.$node.nodeName;
			vNode.$attributes = {};
			vNode.$childVNodes = [];
			vNode.$childVNodeMap = {};
			vNode.$eventHandlers = [];
			vNode.$isBound = false;
			let isTemplate = false;

			if (vNode.$node.getAttribute('v-for') != undefined) {
				const name = 'v-for';
				const value = vNode.$node.getAttribute(name);
				vNode.$attributes[name] = value;
				vNode.$isReactive = true;
				vNode.$node.removeAttribute(name);
				isTemplate = true;

				for (const name of [':key']) {
					if (!vNode.$node.hasAttribute(name)) {
						continue;
					}

					vNode.$attributes[name] = vNode.$node.getAttribute(name);
					vNode.$node.removeAttribute(name);
				}
				if (vNode.$attributes[':key'] == undefined) {
					throw Error(':key must be specified.');
				}
			}

			// v-if, v-else-if, v-else
			{
				const vAttrs = [];
				for (const name of ['v-if', 'v-else-if', 'v-else']) {
					const value = vNode.$node.getAttribute(name);
					if (value != undefined) {
						vAttrs.push(name);
						if (vAttrs.length > 1) {
							throw Error('' + vAttrs[0] + ' and ' + vAttrs[1] + ' cannot be used on the same element.');
						}

						vNode.$attributes[name] = value;
						vNode.$isReactive = true;
						vNode.$node.removeAttribute(name);
						isTemplate = true;
					}
				}
			}

			if (!isTemplate) {
				for (const name of vNode.$node.getAttributeNames()) {
					vNode.$attributes[name] = vNode.$node.getAttribute(name);

					if (name.startsWith(':')) {
						vNode.$isReactive = true;
						vNode.$node.removeAttribute(name);
						continue;
					}

					if (name.startsWith('@')) {
						vNode.$node.removeAttribute(name);
						continue;
					}

					if (name == 'v-component' || name.startsWith('v-component.')) {
						vNode.$isComponent = true;
						vNode.$isActivated = false;
						continue;
					}

					if (name.startsWith('v-')) {
						vNode.$node.removeAttribute(name);
						continue;
					}
				}
			} else {
				if (vNode.$node.nodeName.toLowerCase() != 'template') {
					vNode.$templateNodeName = vNode.$node.nodeName;
					vNode.$template = vNode.$node.outerHTML;
					let templateNode = document.createComment('template');
					vNode.$node.parentNode.insertBefore(templateNode, vNode.$node);
					vNode.$node.parentNode.removeChild(vNode.$node);
					vNode.$node = templateNode;
					vNode.$nodeType = templateNode.nodeType;
				}
			}

			if (!isTemplate) {
				for (const childNode of vNode.$node.childNodes) {
					vNode.$childVNodes.push(new VNode({
						node: childNode,
						parentVNode: vNode,
						vApp: vApp,
						bindings: vNode.$bindings,
					}));
				}
			}
		} else if (vNode.$node.nodeType == Node.TEXT_NODE) {
			vNode.$nodeValue = vNode.$node.nodeValue;
			if (/{{.*?}}/.test(vNode.$node.nodeValue)) {
				vNode.$isReactive = true;
			}
		} else {
			vNode.$nodeValue = vNode.$node.nodeValue;
		}
	}

	get vApp() {
		let vNode = this;
		return vNode.$vApp;
	}

	get node() {
		let vNode = this;
		return vNode.$node;
	}

	get nodePath() {
		let vNode = this;
		return makePath(vNode.$node);
	}

	get parent() {
		let vNode = this;
		return vNode.$parentVNode;
	}

	get isComponent() {
		let vNode = this;
		return vNode.$isComponent;
	}

	get isTemplated() {
		let vNode = this;
		return (vNode.$template != undefined);
	}
	get isTemplateElement() {
		let vNode = this;
		return (vNode.$nodeType == Node.ELEMENT_NODE && vNode.$node.nodeName.toLowerCase() == 'template');
	}

	get isReactive() {
		let vNode = this;
		return vNode.$isReactive;
	}

	get isBound() {
		let vNode = this;
		return vNode.$isBound;
	}

	get vModelKey() {
		let vNode = this;
		if (vNode.$nodeType != Node.ELEMENT_NODE) {
			return undefined;
		}

		for (const key in vNode.$attributes) {
			if (key.startsWith('v-model.')) {
				return key.trim();
			}
		}

		if ('v-model' in vNode.$attributes) {
			return 'v-model';
		}

		return undefined;
	};

	get vModel() {
		let vNode = this;
		if (vNode.$nodeType != Node.ELEMENT_NODE) {
			return undefined;
		}

		if (vNode.$vModel == undefined) {
			if (vNode.vModelKey) {
				vNode.$vModel = vNode.$attributes[vNode.vModelKey];
			} else {
				vNode.$vModel = '';
			}
		}

		if (vNode.$vModel == '') {
			return undefined;
		}
		return vNode.$vModel;
	}

	get vModelModifiers() {
		let vNode = this;
		if (vNode.$nodeType != Node.ELEMENT_NODE) {
			return undefined;
		}

		if (vNode.$vModelModifiers == undefined) {
			let vModelAttr = vNode.vModelKey ? vNode.vModelKey.split('.') : [];
			if (vModelAttr.length > 0) {
				vModelAttr.shift();
			}
			vNode.$vModelModifiers = vModelAttr;
		}

		return vNode.$vModelModifiers;
	}

	get hasVModel() {
		let vNode = this;
		return (vNode.vModel != undefined);
	}

	get isRoot() {
		let vNode = this;
		return (vNode.$parentVNode == undefined);
	}

	get root() {
		for (let vNode = this; vNode; vNode = vNode.$parentVNode) {
			if (vNode.isRoot) {
				return vNode;
			}
		}
		return undefined;
	}

	findParent(nodeName) {
		let vNode = this;
		nodeName = nodeName.toLowerCase();
		for (let parentVNode = vNode.$parentVNode; parentVNode; parentVNode = parentVNode.$parentVNode) {
			if (parentVNode.$nodeName.toLowerCase() == nodeName) {
				return parentVNode;
			}
		}
		return undefined;
	}

	on(name) {
		let vApp = this.$vApp;
		let vNode = this;
		for (const vName of Object.keys(vNode.$attributes)) {
			if (vName == '@' + name) {
				let expression = vNode.$attributes[vName];
				if (expression == '') {
					return;
				}

				let result;
				if (typeof vApp.$instance.methods == 'object') {
					result = vApp.$instance.methods[expression];
				}
				if (typeof result != 'function') {
					result = vApp.eval(expression, { ...vNode.$bindings, vNode }, true);
				}
				if (typeof result == 'function') {
					try {
						result = result.apply(vApp, [vNode]);
					} catch (ex) {
						vApp.log.error(ex);
					}
				}
				if (result instanceof Promise) {
					result.then(function() {
						vApp.commit();
					});
				} else {
					vApp.commit();
				}
				break;
			}
		}
	}

	bind() {
		let vApp = this.$vApp;
		let vNode = this;
		if (vNode.$isBound) {
			return;
		}
		if (vNode.isComponent) {
			return;
		}
		if (vNode.$nodeType != Node.ELEMENT_NODE) {
			return;
		}
		if (vNode.$node.nodeName.toLowerCase() == 'template') {
			return;
		}

		vNode.on('bind');

		if (vNode.hasVModel) {
			if (vNode.$updateListener == undefined) {
				vNode.$updateListener = function() {
					if (vNode.update()) {
						vNode.on('updated');
						vApp.commit();
					}
				};
			}

			if (vNode.$nodeName.toLowerCase() == 'input') {
				vNode.$node.addEventListener('change', vNode.$updateListener);
				vNode.$node.addEventListener('keyup', delay(vNode.$updateListener, vApp.keyupDelayTime));
			} else if (vNode.$nodeName.toLowerCase() == 'textarea') {
				vNode.$node.addEventListener('change', vNode.$updateListener);
				vNode.$node.addEventListener('keyup', delay(vNode.$updateListener, vApp.keyupDelayTime));
			} else if (vNode.$nodeName.toLowerCase() == 'select') {
				vNode.$node.addEventListener('change', vNode.$updateListener);
			}
		}

		for (const vName of Object.keys(vNode.$attributes)) {
			if (vName.startsWith('@')) {
				let type = vName.substring(1);
				let vEventHandler = new VEventHandler(type, vNode.$attributes[vName]);
				if (vEventHandler.isLifecycleEvent) {
					continue;
				}

				vNode.$eventHandlers.push(vEventHandler.register(vNode));
			}
		}

		vNode.$isBound = true;
		vNode.on('bound');
	}

	unbind() {
		let vNode = this;
		if (vNode.isComponent) {
			return;
		}
		if (vNode.$nodeType != Node.ELEMENT_NODE) {
			return;
		}
		if (vNode.$node.nodeName.toLowerCase() == 'template') {
			return;
		}

		vNode.on('unbind');

		if (vNode.$eventHandlers) {
			for (const eventHandler of vNode.$eventHandlers) {
				eventHandler.unregister();
			}
			vNode.$eventHandlers = [];
		}

		if (vNode.$updateListener != undefined) {
			vNode.$node.removeEventListener('change', vNode.$updateListener);
			vNode.$node.removeEventListener('keyup', delay);
			vNode.$updateListener = undefined;
		}

		vNode.$isBound = false;
		vNode.on('unbound');
	}

	update() {
		let vApp = this.$vApp;
		let vNode = this;
		if (!vNode.$node || !vNode.hasVModel) {
			return;
		}

		let oldValue = getValueByPath(vApp, vNode.vModel);
		let newValue = undefined;

		if (vNode.$nodeName.toLowerCase() == 'input') {
			let type = Values.toString(vNode.$node.type, '').toLowerCase();
			if (['checkbox'].includes(type)) {
				newValue = Values.clone(oldValue);
				if (newValue == undefined) {
					newValue = [];
				} else if (!Array.isArray(newValue)) {
					newValue = [newValue];
				}
				let value = VModels.toValue(vNode, vNode.$node.value);
				let i = newValue.indexOf(value);
				if (vNode.$node.checked) {
					if (i == -1) {
						newValue.push(value);
					}
				} else {
					if (i != -1) {
						newValue.splice(i, 1);
					}
				}
			} else {
				newValue = VModels.toValue(vNode, vNode.$node.value);
			}
		} else if (vNode.$nodeName.toLowerCase() == 'textarea') {
			newValue = VModels.toValue(vNode, vNode.$node.value);
		} else if (vNode.$nodeName.toLowerCase() == 'select') {
			if (vNode.$node.multiple) {
				newValue = [];
				for (const el of vNode.$node.selectedOptions) {
					let value = VModels.toValue(vNode, el.value);
					if (newValue.indexOf(value) == -1) {
						newValue.push(value);
					}
				}
			} else {
				newValue = VModels.toValue(vNode, vNode.$node.value);
			}
		}

		if (JSON.stringify(oldValue) != JSON.stringify(newValue)) {
			setValueByPath(vApp, vNode.vModel, newValue);
			return true;
		}

		return false;
	}

	render(vRenderContext) {
		let vApp = this.$vApp;
		let vNode = this;

		if (vNode.parent && vNode.parent.$bindings && vNode.$bindings) {
			for (const [name, value] of Object.entries(vNode.parent.$bindings)) {
				vNode.$bindings[name] = value;
			}
		}

		if (vNode.isComponent) {
			if (vNode.$isActivated) {
				vNode.$componentVApp.commit(vNode.$bindings);
				return;
			}

			let vComponentAttr, vComponentValue;
			let vTemplateAttr, vTemplateValue;
			let vPropertiesValue;
			for (const [name, value] of Object.entries(vNode.$attributes)) {
				if (name == 'v-component' || name.startsWith('v-component.')) {
					vComponentAttr = Values.trim(name).split('.');
					vComponentValue = Values.trim(value);
					continue;
				}
				if (name == 'v-template' || name.startsWith('v-template.')) {
					vTemplateAttr = Values.trim(name).split('.');
					vTemplateValue = Values.trim(value);
					continue;
				}
				if (name == 'v-properties' || name.startsWith('v-properties.')) {
					vPropertiesValue = Values.trim(value);
					continue;
				}
			}

			// id
			if (vComponentAttr.includes('static')) {
				vNode.$componentID = vComponentValue;
			} else {
				vNode.$componentID = vApp.eval(vComponentValue, vNode.$bindings);
			}

			const vComponent = VDOM.getComponent(vNode.$componentID);

			// template
			if (vTemplateAttr != undefined) {
				if (vTemplateAttr.includes('static')) {
					vNode.$templateID = vTemplateValue;
				} else {
					vNode.$templateID = vApp.eval(vTemplateValue, vNode.$bindings);
				}
			}
			if (vNode.$templateID == undefined) {
				let v = Values.trim(vComponent.templateID);
				if (v.length > 0) {
					vNode.$templateID = vComponent.templateID;
				}
			}
			if (vNode.$templateID == undefined) {
				vNode.$templateID = vComponent.id;
			}

			let props = {};
			if (vPropertiesValue != undefined) {
				let p = vApp.eval(vPropertiesValue, vNode.$bindings);
				if (typeof p == 'object') {
					props = p;
				}
			}

			let fragmentNode = document.querySelector('#' + vNode.$templateID).content.cloneNode(true);
			for (const childNode of fragmentNode.childNodes) {
				if (childNode.nodeType != Node.ELEMENT_NODE) {
					continue;
				}

				vNode.$node.parentNode.insertBefore(childNode, vNode.$node);
				vNode.$node.parentNode.removeChild(vNode.$node);
				vNode.$node = childNode;
				vNode.$nodeType = childNode.nodeType;
				let instance = vComponent.createInstance(props);
				vNode.$componentVApp = new VApp(vNode.$node, instance);
				vNode.$isActivated = true;
				vNode.$componentVApp.init(vNode.$bindings);
				break;
			}
			return;
		}

		if (vNode.isRoot) {
			if (vNode.$renderedHashCode === vApp.$state.hashCode) {
				return;
			}
			vNode.$renderedHashCode = vApp.$state.hashCode;

			vRenderContext = new VRenderContext();
		}

		if (vNode.$isReactive) {
			if (vNode.$nodeType == Node.ELEMENT_NODE && !vNode.isTemplateElement) {
				for (const vName of Object.keys(vNode.$attributes)) {
					if (vName == ':key') {
						continue;
					}

					if (vName.startsWith(':')) {
						let name = vName.substring(1);
						let newValue = vApp.eval(vNode.$attributes[vName], vNode.$bindings);

						if (name == 'class') {
							if (typeof newValue != 'object') {
								continue;
							}

							let addList = [];
							let removeList = [];
							const classList = vNode.$node.classList;
							for (const [names, value] of Object.entries(newValue)) {
								for (const name of names.split(/\s/)) {
									if (value) {
										if (!classList.contains(name)) {
											addList.push(name);
										}
									} else {
										if (classList.contains(name)) {
											removeList.push(name);
										}
									}
								}
							}
							if (removeList.length > 0) {
								classList.remove(...removeList);
							}
							if (addList.length > 0) {
								classList.add(...addList);
							}
							continue;
						}

						if (name == 'style') {
							let result;
							if (typeof newValue == 'object') {
								result = newValue;
							} else {
								if (typeof vApp.$instance.methods == 'object') {
									result = vApp.$instance.methods[newValue];
								}
								if (typeof result != 'function') {
									result = vApp.eval(newValue, { vNode }, false);
								}
								if (typeof result == 'function') {
									try {
										result = result.apply(vApp, [vNode]);
									} catch (ex) {
										vApp.log.error(ex);
									}
								}
							}
							if (typeof result != 'object') {
								continue;
							}

							const oldStyles = vNode.#styles || {};
							const newStyles = result;
							const style = vNode.$node.style;
							for (const name in oldStyles) {
								if (!(name in newStyles)) {
									if (name.includes('-')) {
										style.removeProperty(name);
									} else {
										style[name] = '';
									}
								}
							}
							for (const [name, value] of Object.entries(newStyles)) {
								if (name.includes('-')) {
									if (value == undefined) {
										style.removeProperty(name);
										continue;
									}
									if (style.getPropertyValue(name) != value) {
										style.setProperty(name, value);
									}
								} else {
									if (value == undefined) {
										style[name] = '';
										continue;
									}
									if (style[name] != value) {
										style[name] = value;
									}
								}
							}
							vNode.#styles = newStyles;
							continue;
						}

						if (vNode.$node.getAttribute(name) != newValue) {
							vNode.$node.setAttribute(name, newValue);
						}
					}
				}
			} else if (vNode.$nodeType == Node.TEXT_NODE) {
				if (vNode.$parentVNode.$nodeName.toLowerCase() != 'textarea') {
					let newValue = vNode.$nodeValue.replaceAll(/{{.*?}}/g, function(exp) {
						return Values.toString(vApp.eval(exp.substring(2, exp.length - 2), vNode.$bindings), '');
					});
					if (vNode.$node.nodeValue != newValue) {
						vNode.$node.nodeValue = newValue;
					}
				}
			} else if (vNode.$nodeType == Node.COMMENT_NODE || vNode.isTemplateElement) {
				vNode.renderTemplate(vRenderContext);
			}
		}

		if (vNode.$nodeType == Node.ELEMENT_NODE && !vNode.isTemplateElement) {
			if (vNode.hasVModel || vNode.$nodeName.toLowerCase() == 'option') {
				if (vNode.$nodeName.toLowerCase() == 'input') {
					let type = Values.toString(vNode.$node.type, '').toLowerCase();
					if (['checkbox'].includes(type)) {
						let values = getValueByPath(vApp, vNode.vModel);
						if (values == undefined) {
							values = [];
						} else if (!Array.isArray(values)) {
							values = [values];
						}
						let newValue = (values.includes(VModels.toValue(vNode, vNode.$node.value)));
						if (vNode.$node.checked != newValue) {
							vNode.$node.checked = newValue;
						}
					} else if (['radio'].includes(type)) {
						let newValue = (getValueByPath(vApp, vNode.vModel) == VModels.toValue(vNode, vNode.$node.value));
						if (vNode.$node.checked != newValue) {
							vNode.$node.checked = newValue;
						}
					} else {
						let newValue = VModels.toString(vNode, getValueByPath(vApp, vNode.vModel));
						if (vNode.$node.value != newValue) {
							vNode.$node.value = newValue;
						}
					}
				} else if (vNode.$nodeName.toLowerCase() == 'textarea') {
					let newValue = VModels.toString(vNode, getValueByPath(vApp, vNode.vModel));
					if (vNode.$node.value != newValue) {
						vNode.$node.value = newValue;
					}
				} else if (vNode.$nodeName.toLowerCase() == 'select') {
					// do nothing
				} else if (vNode.$nodeName.toLowerCase() == 'option') {
					let selectVNode = vNode.findParent('select');
					if (selectVNode && selectVNode.hasVModel) {
						if (selectVNode.$node.multiple) {
							let values = vApp[selectVNode.vModel];
							if (values == undefined) {
								values = [];
							} else if (!Array.isArray(values)) {
								values = [values];
							}
							let newValue = (values.includes(VModels.toValue(vNode, vNode.$node.value)));
							if (vNode.$node.selected != newValue) {
								vNode.$node.selected = newValue;
							}
						} else {
							let newValue = (vApp[selectVNode.vModel] == VModels.toValue(vNode, vNode.$node.value));
							if (vNode.$node.selected != newValue) {
								vNode.$node.selected = newValue;
							}
						}
					}
				}
			}
		}

		vNode.bind();

		if (vNode.$nodeType == Node.ELEMENT_NODE) {
			vRenderContext.ifStatus.clear();
			for (const childVNode of vNode.$childVNodes) {
				childVNode.render(vRenderContext);
			}
		}
	}

	renderTemplate(vRenderContext) {
		let vApp = this.$vApp;
		let vNode = this;
		if (!vNode.isTemplated && !vNode.isTemplateElement) {
			return;
		}

		let vIf = vNode.$attributes['v-if'];
		let vElseIf = vNode.$attributes['v-else-if'];
		let vElse = vNode.$attributes['v-else'];
		let vFor = vNode.$attributes['v-for'];
		let vKey = vNode.$attributes[':key'];

		if (vFor != undefined) {
			let vForExp = new VForExpression(vNode, vFor);
			let childVNodes = [];
			let childVNodeMap = {};
			vForExp.execute(function(bindings) {
				let key = Values.toString(vApp.eval(vKey, bindings));
				if (key == undefined) {
					vApp.log.error('Invalid key expression.');
					return;
				}

				if (vIf != undefined || vElseIf != undefined || vElse != undefined) {
					let expression;
					let executed;
					if (vIf != undefined) {
						if (!vRenderContext.ifStatus.canIf) {
							vApp.log.error('The v-if clause cannot be executed.');
							return;
						}
						vRenderContext.ifStatus.clear();
						expression = vIf;
						executed = 'v-if';
					}
					if (vElseIf != undefined) {
						if (!vRenderContext.ifStatus.canElseIf) {
							vApp.log.error('The v-else-if clause cannot be executed.');
							return;
						}
						expression = vElseIf;
						executed = 'v-else-if';
					}
					if (vElse != undefined) {
						if (!vRenderContext.ifStatus.canElse) {
							vApp.log.error('The v-else clause cannot be executed.');
							return;
						}
						expression = vElse;
						executed = 'v-else';
					}

					let isActive = false;
					if (!vRenderContext.ifStatus.condition) {
						if (['v-if', 'v-else-if'].includes(executed)) {
							isActive = Values.toBoolean(!!vApp.eval(expression, bindings), false);
						} else {
							isActive = true;
						}
					}

					if (!vRenderContext.ifStatus.condition) {
						if (['v-if', 'v-else-if'].includes(executed)) {
							if (isActive) {
								vRenderContext.ifStatus.markTruthy(executed);
							} else {
								vRenderContext.ifStatus.markFalsy(executed);
							}
						} else {
							vRenderContext.ifStatus.done();
						}
					}

					if (!isActive) {
						return;
					}
				} else {
					vRenderContext.ifStatus.clear();
				}

				let reuseVNodes = vNode.$childVNodeMap[key];
				if (reuseVNodes != undefined) {
					childVNodeMap[key] = [];
					for (const reuseVNode of reuseVNodes) {
						childVNodes.push(reuseVNode);
						childVNodeMap[key].push(reuseVNode);

						// Update
						for (const [name, value] of Object.entries(bindings)) {
							reuseVNode.$bindings[name] = value;
						}

						// Rendering
						reuseVNode.render(vRenderContext);
					}
					delete vNode.$childVNodeMap[key];
					return;
				}

				let newNodes = vNode.createTemplateNode();
				if (newNodes instanceof DocumentFragment) {
					let l = [];
					for (const node of newNodes.childNodes) {
						l.push(node);
					}
					newNodes = l;
				} else {
					newNodes = [newNodes];
				}
				childVNodeMap[key] = [];
				for (const newNode of newNodes) {
					vNode.$node.parentNode.insertBefore(newNode, vNode.$node);
					if (newNode.nodeType == Node.ELEMENT_NODE) {
						newNode.setAttribute(':key', vNode.$attributes[':key']);
					}
					let newVNode = new VNode({
						node: newNode,
						parentVNode: vNode.$parentVNode,
						vApp: vNode.$vApp,
						bindings: bindings,
					});
					childVNodes.push(newVNode);
					childVNodeMap[key].push(newVNode);

					// Initial rendering
					newVNode.render(vRenderContext);
				}
			});

			for (const unnecessaryVNodes of Object.values(vNode.$childVNodeMap)) {
				for (const unnecessaryVNode of unnecessaryVNodes) {
					unnecessaryVNode.remove();
				}
			}

			vNode.$childVNodes = childVNodes;
			vNode.$childVNodeMap = childVNodeMap;

			let lastNode = vNode.$node;
			for (const childVNode of vNode.$childVNodes) {
				childVNode.$node.parentNode.insertBefore(childVNode.$node, lastNode.nextSibling);
				lastNode = childVNode.$node;
			}

			return;
		}

		if (vIf != undefined || vElseIf != undefined || vElse != undefined) {
			let expression;
			let executed;
			if (vIf != undefined) {
				if (!vRenderContext.ifStatus.canIf) {
					vApp.log.error('The v-if clause cannot be executed.');
					return;
				}
				vRenderContext.ifStatus.clear();
				expression = vIf;
				executed = 'v-if';
			}
			if (vElseIf != undefined) {
				if (!vRenderContext.ifStatus.canElseIf) {
					vApp.log.error('The v-else-if clause cannot be executed.');
					return;
				}
				expression = vElseIf;
				executed = 'v-else-if';
			}
			if (vElse != undefined) {
				if (!vRenderContext.ifStatus.canElse) {
					vApp.log.error('The v-else clause cannot be executed.');
					return;
				}
				expression = vElse;
				executed = 'v-else';
			}

			let isActive = false;
			if (!vRenderContext.ifStatus.condition) {
				if (['v-if', 'v-else-if'].includes(executed)) {
					isActive = Values.toBoolean(!!vApp.eval(expression, vNode.$bindings), false);
				} else {
					isActive = true;
				}
			}

			if (!isActive) {
				if (vNode.$childVNodes.length > 0) {
					for (const unnecessaryVNode of vNode.$childVNodes) {
						unnecessaryVNode.remove();
					}

					vNode.$childVNodes = [];
				}
			} else {
				if (vNode.$childVNodes.length > 0) {
					// Rendering
					for (const reuseVNode of vNode.$childVNodes) {
						reuseVNode.render(vRenderContext);
					}
				} else {
					let newNodes = vNode.createTemplateNode();
					if (newNodes instanceof DocumentFragment) {
						let l = [];
						for (const node of newNodes.childNodes) {
							l.push(node);
						}
						newNodes = l;
					} else {
						newNodes = [newNodes];
					}
					for (const newNode of newNodes) {
						vNode.$node.parentNode.insertBefore(newNode, vNode.$node);
						let newVNode = new VNode({
							node: newNode,
							parentVNode: vNode.$parentVNode,
							vApp: vNode.$vApp,
							bindings: vNode.$bindings,
						});
						vNode.$childVNodes.push(newVNode);

						// Initial rendering
						newVNode.render(vRenderContext);
					}
				}
			}

			if (!vRenderContext.ifStatus.condition) {
				if (['v-if', 'v-else-if'].includes(executed)) {
					if (isActive) {
						vRenderContext.ifStatus.markTruthy(executed);
					} else {
						vRenderContext.ifStatus.markFalsy(executed);
					}
				} else {
					vRenderContext.ifStatus.done();
				}
			}
		} else {
			vRenderContext.ifStatus.clear();
		}
	}

	createTemplateNode() {
		let vNode = this;

		if (vNode.$node.nodeName.toLowerCase() == 'template') {
			return vNode.$node.content.cloneNode(true);
		}

		let template = vNode.$template;
		if (['thead', 'tbody', 'tr', 'th', 'td'].includes(Values.toString(vNode.$templateNodeName, '').toLowerCase())) {
			template = '<table>' + template + '</table>';
		}
		const fragment = document.createRange().createContextualFragment(template);
		return fragment.querySelector(vNode.$templateNodeName);
	}

	remove() {
		let vNode = this;

		if (vNode.$childVNodes) {
			for (const childVNode of vNode.$childVNodes) {
				childVNode.remove();
			}
		}

		if (vNode.isComponent) {
			if (vNode.$isActivated) {
				vNode.$componentVApp.remove();
			}
		} else {
			vNode.unbind();
			vNode.$node.parentNode.removeChild(vNode.$node);
			delete vNode.$node;
		}
	}

	static create({ node, vApp }) {
		return new VNode({
			node: node,
			vApp: vApp,
		});
	}
}

class VLog {
	constructor(vApp) {
		this.$vApp = vApp;
	}

	debug(message) {
		let vApp = this.$vApp;
		if (['debug'].indexOf(vApp.logLevel) == -1) {
			return;
		}
		console.debug('App[' + vApp.appPath + ']: ' + message);
	}

	info(message) {
		let vApp = this.$vApp;
		if (['debug', 'info'].indexOf(vApp.logLevel) == -1) {
			return;
		}
		console.info('App[' + vApp.appPath + ']: ' + message);
	}

	warn(message) {
		let vApp = this.$vApp;
		if (['debug', 'info', 'warn'].indexOf(vApp.logLevel) == -1) {
			return;
		}
		console.warn('App[' + vApp.appPath + ']: ' + message);
	}

	error(message) {
		let vApp = this.$vApp;
		if (['debug', 'info', 'warn', 'error'].indexOf(vApp.logLevel) == -1) {
			return;
		}
		console.error('App[' + vApp.appPath + ']: ' + message);
	}
}

class VApp {
	constructor(node, instance) {
		let vApp = this;
		vApp.$log = new VLog(vApp);
		vApp.$node = VDOM.getCleanedElement(node);
		vApp.$instance = instance;
		vApp.$state = {
			names: [],
			values: [],
			hashCode: undefined,
		};
	}

	get appPath() {
		let vApp = this;
		if (!vApp.$node) {
			return undefined;
		}
		return makePath(vApp.$node);
	}

	get keyupDelayTime() {
		let vApp = this;
		return Values.toNumber(vApp.$instance.keyupDelayTime, 0);
	}

	get logLevel() {
		let vApp = this;
		let logLevel = ('' + vApp.$instance.logLevel).toLowerCase();
		if (['debug', 'info', 'warn', 'error'].indexOf(logLevel) == -1) {
			return undefined;
		}
		return logLevel;
	}

	get log() {
		let vApp = this;
		return vApp.$log;
	}

	init(bindings) {
		let vApp = this;
		if (vApp.$instance.methods != undefined) {
			if (typeof vApp.$instance.methods != 'object') {
				throw Error('The methods attribute must be an object.');
			}

			for (const [name, value] of Object.entries(vApp.$instance.methods)) {
				if (typeof value != 'function') {
					continue;
				}
				vApp[name] = value;
			}
		}

		if (vApp.$instance.data != undefined) {
			if (typeof vApp.$instance.data != 'function') {
				throw Error('The data attribute must be a function.');
			}

			let data = vApp.$instance.data();
			if (typeof data != 'object') {
				vApp.log.error('The data function must return an object.');
			}
			for (const [name, value] of Object.entries(data)) {
				vApp[name] = value;
			}
		}

		const mount = function() {
			vApp.$vNode = VNode.create({
				node: vApp.$node,
				vApp: vApp,
			});

			if (typeof bindings == 'object') {
				for (const [name, value] of Object.entries(bindings)) {
					vApp.$vNode.$bindings[name] = value;
				}
			}

			vApp.compute();
			vApp.render();

			if (typeof vApp.$instance.mounted == 'function') {
				vApp.$instance.mounted.apply(vApp);
			}
		};
		if (typeof vApp.$instance.created == 'function') {
			const result = vApp.$instance.created.apply(vApp);
			if (result instanceof Promise) {
				result.then(function() {
					mount();
				});
				return;
			}
		}
		mount();
	}

	remove() {
		let vApp = this;
		let vNode = vApp.$vNode;
		vNode.remove();
	}

	compute() {
		let vApp = this;
		if (typeof vApp.$instance.computed == 'object') {
			for (const [name, func] of Object.entries(vApp.$instance.computed)) {
				if (typeof func != 'function') {
					continue;
				}

				vApp[name] = func.call(vApp);
			}
		}

		vApp.$state.data = {};
		let data = {
			names: [],
			values: [],
		};
		for (const key of Object.keys(vApp).sort()) {
			if (key.startsWith('$')) {
				continue;
			}

			const value = vApp[key];
			if (typeof value == 'function') {
				continue;
			}

			vApp.$state.data[key] = value;
			data.names.push(key);
			data.values.push(value);
		}
		vApp.$state.hashCode = Values.hashCode(data);
	}

	render() {
		let vApp = this;
		vApp.$vNode.render();
	}

	eval(expression, bindings, updatable) {
		let vApp = this;
		try {
			let names = [];
			let values = [];

			if (bindings) {
				for (const [name, value] of Object.entries(bindings)) {
					if (names.includes(name)) {
						continue;
					}

					names.push(name);
					values.push(value);
				}
			}

			if (typeof vApp.$instance.methods == 'object') {
				for (const [name, value] of Object.entries(vApp.$instance.methods)) {
					if (names.includes(name)) {
						continue;
					}
					if (typeof value != 'function') {
						continue;
					}

					names.push(name);
					values.push(value.bind(vApp));
				}
			}

			let source = '';
			if (updatable) {
				source += 'with(this) {return (' + expression + ')}';
			} else {
				source += 'with(this) {return (' + expression + ')}';
			}

			let fn;
			try {
				fn = new Function(...[...names, source]);
			} catch (ex) {
				vApp.log.error("Failed to compile script: " + ex.message);
				throw ex;
			}

			try {
				return fn.apply(vApp, values);
			} catch (ex) {
				vApp.log.error("Script execution failed: " + ex.message);
				throw ex;
			}
		} catch (ex) {
			vApp.log.error(ex);
		}
		return undefined;
	}

	commit(bindings) {
		let vApp = this;

		if (typeof bindings == 'object') {
			for (const [name, value] of Object.entries(bindings)) {
				vApp.$vNode.$bindings[name] = value;
			}
		}

		vApp.compute();
		vApp.render();
	}
}

class VComponent {
	constructor({ id, createInstance, templateID }) {
		let vComponent = this;
		vComponent.$id = Values.toString(id, '').trim();
		if (!vComponent.$id) {
			throw new Error('The component-id must be specified.');
		}
		vComponent.$createInstance = createInstance;
		if (typeof vComponent.$createInstance != 'function') {
			throw new Error('The createInstance function must be specified.');
		}
		vComponent.$templateID = Values.toString(templateID, '').trim();
		if (!vComponent.$templateID) {
			vComponent.$templateID = undefined;
		}
	}

	get id() {
		let vComponent = this;
		return vComponent.$id;
	}

	get templateID() {
		let vComponent = this;
		return vComponent.$templateID;
	}

	createInstance(props) {
		let vComponent = this;
		return vComponent.$createInstance(props);
	}
}

export class VDOM {
	static get isSupported() {
		try {
			if (typeof structuredClone !== 'function') return false;

			// if (typeof crypto.randomUUID !== 'function') return false;
			// if (!Array.prototype.at) return false;

			return true;
		} catch {
			return false;
		}
	}

	static createApp(selectors, instance) {
		let vComponent;
		if (typeof instance == 'string') {
			const id = instance;
			if (!VDOM.hasComponent(id)) {
				throw Error('The specified instance cannot be found: ' + id);
			}

			vComponent = VDOM.getComponent(id);
		}

		for (const node of document.querySelectorAll(selectors)) {
			if (node.nodeType != Node.ELEMENT_NODE) {
				continue;
			}

			let vApp = new VApp(node, vComponent ? vComponent.createInstance() : instance);
			vApp.init();
		}
	}

	static addComponent(componentData) {
		if (VDOM.hasComponent(componentData.id)) {
			return false;
		}

		vComponents[componentData.id] = new VComponent(componentData);
		return true;
	}

	static hasComponent(id) {
		return (VDOM.getComponent(id) != undefined);
	}

	static getComponent(id) {
		return vComponents[id];
	}

	static removeComponent(id) {
		delete vComponents[id];
	}

	static getCleanedElement(element) {
		const childNodes = Array.from(element.childNodes);
		let buffer = null;

		for (let i = 0; i < childNodes.length; i++) {
			const node = childNodes[i];

			if (node.nodeType === Node.TEXT_NODE) {
				if (/^[\s\n\r\t]*$/.test(node.nodeValue)) {
					element.removeChild(node);
				} else {
					if (buffer) {
						buffer.nodeValue += node.nodeValue;
						element.removeChild(node);
					} else {
						buffer = node;
					}
				}
			} else {
				buffer = null;
				if (node.nodeType === Node.ELEMENT_NODE) {
					VDOM.getCleanedElement(node);
				}
			}
		}

		return element;
	}
}
