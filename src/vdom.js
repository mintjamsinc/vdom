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
			} catch (ex) {}
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
		} catch (ex) {}

		return defaultValue;
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
		} catch (ex) {}

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
		} catch (ignore) {}

		return '';
	}

	static toISOTimeString(value) {
		try {
			if (!Values.isDate(value)) {
				value = new Date(value);
			}

			return ('0' + value.getHours()).slice(-2) + ':' +
					('0' + value.getMinutes()).slice(-2);
		} catch (ignore) {}

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
		} catch (ignore) {}

		return '';
	}

	static clone(value, defaultValue) {
		if (value == undefined) {
			return defaultValue;
		}

		value = JSON.parse(JSON.stringify(value));
		if (value != undefined) {
			return value;
		}

		return defaultValue;
	}
}

class VForExpression {
	constructor(expression) {
		expression = Values.toString(expression, '').trim();
		if (expression == '') {
			throw new Error('The expression must be specified.');
		}
		this.$expression = expression;

		let e = expression;

		if (e.startsWith('(')) {
			let i = e.indexOf(')');
			this.$nameExp = e.substring(0, i + 1);
			e = e.substring(i + 1).trim();
		} else if (e.startsWith('{')) {
			let i = e.indexOf('}');
			this.$nameExp = e.substring(0, i + 1);
			e = e.substring(i + 1).trim();
		} else {
			e = e.split(/\s/);
			this.$nameExp = e[0];
			e.splice(0, 1);
			e = e.join(' ');
		}

		if (!e.startsWith('in')) {
			throw new Error('Syntax error: ' + this.$expression);
		}

		this.$arrayExp = e.substring(2).trim();
	}

	get arrayExpression() {
		return this.$arrayExp;
	}

	checkVarName(name) {
		if (name.split(/\s/).length > 1) {
			throw new Error('Syntax error: ' + this.$expression);
		}
		return name;
	}

	execute(items, func) {
		let isArray = Array.isArray(items);
		if (!isArray) {
			items = Object.entries(items);
		}

		for (let i = 0; i < items.length; i++) {
			let bindings = {};
			let e = this.$nameExp;
			if (e.startsWith('(')) {
				e = e.substring(1, e.length - 1).split(/\s*,\s*/);
				if (e.length == 0) {
					throw new Error('Syntax error: ' + this.$expression);
				}

				if (isArray) {
					if (e[0].startsWith('{')) {
						if (!e[0].endsWith('}')) {
							throw new Error('Syntax error: ' + this.$expression);
						}

						for (let p of e[0].substring(1, e[0].length - 1).split(/\s*,\s*/)) {
							bindings[this.checkVarName(p)] = items[i][p];
						}
					} else {
						bindings[this.checkVarName(e[0])] = items[i];
					}
					if (e.length > 1) {
						bindings[this.checkVarName(e[1])] = i;
					}
				} else {
					if (e[0].startsWith('{')) {
						throw new Error('Syntax error: ' + this.$expression);
					}

					bindings[this.checkVarName(e[0])] = items[i][1];
					if (e.length > 1) {
						bindings[this.checkVarName(e[1])] = items[i][0];
					}
					if (e.length > 2) {
						bindings[this.checkVarName(e[2])] = i;
					}
				}
			} else if (e.startsWith('{')) {
				e = e.substring(1, e.length - 1).split(/\s*,\s*/);
				if (e.length == 0) {
					throw new Error('Syntax error: ' + this.$expression);
				}

				if (isArray) {
					for (let p of e[0]) {
						bindings[this.checkVarName(p)] = items[i][p];
					}
				} else {
					throw new Error('Syntax error: ' + this.$expression);
				}
			} else {
				bindings[this.checkVarName(e)] = items[i];
			}

			func(bindings);
		}
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
		vEventHandler.$type = typeAndModifiers[0];
		typeAndModifiers.splice(0, 1);
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
		return (vEventHandler.lifecycleEvents.indexOf(vEventHandler.type) != -1);
	}

	register(vNode) {
		let vEventHandler = this;
		vEventHandler.$vNode = vNode;
		vEventHandler.$eventListener = function(event) {
			let vApp = vEventHandler.$vNode.$vApp;
			let bindings = {
				event: event,
				vNode: vNode,
			};

			for (const modifier of vEventHandler.$modifiers) {
				if (modifier == 'stop') {
					event.stopPropagation();
				} else if (modifier == 'prevent') {
					event.preventDefault();
				}
			}

			if (vEventHandler.$expression == '') {
				return;
			}

			let result = vApp.eval(vEventHandler.$expression, bindings, true);
			if (typeof result == 'function') {
				try {
					result = result.apply(vApp, [event, vNode]);
				} catch (ignore) {}
			}

			if (result instanceof Promise) {
				result.then(function() {
					vApp.commit();
				});
			} else {
				vApp.commit();
			}
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
	constructor({ node, parentVNode, vApp, bindings }) {
		let vNode = this;
		vNode.$node = node;
		vNode.$parentVNode = parentVNode;
		vNode.$nodeType = node.nodeType;
		vNode.$isReactive = false;
		vNode.$isComponent = false;
		vNode.$vApp = vApp;
		vNode.$bindings = bindings ? Values.clone(bindings) : {};

		if (node.nodeType == Node.ELEMENT_NODE) {
			vNode.$nodeName = node.nodeName;

			if (node.getAttribute('v-component') != undefined) {
				const id = Values.toString(node.getAttribute('v-component'), '').trim();
				if (!id || !VDOM.hasComponent(id)) {
					throw Error('The specified component cannot be found: ' + id);
				}

				vNode.$isComponent = true;
				vNode.$componentID = id;
				vNode.$isActivated = false;
				return;
			}

			vNode.$attributes = {};
			vNode.$childVNodes = [];
			vNode.$childVNodeMap = {};
			vNode.$eventHandlers = [];
			vNode.$isBound = false;
			let isTemplate = false;

			if (node.getAttribute('v-for') != undefined) {
				const name = 'v-for';
				const value = node.getAttribute(name);
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
					const value = node.getAttribute(name);
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
				for (const attr of node.attributes) {
					vNode.$attributes[attr.name] = attr.value;

					if (attr.name.startsWith(':')) {
						vNode.$isReactive = true;
						vNode.$node.removeAttribute(attr.name);
						continue;
					}

					if (attr.name.startsWith('@')) {
						vNode.$node.removeAttribute(attr.name);
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
		} else if (node.nodeType == Node.TEXT_NODE) {
			vNode.$nodeValue = node.nodeValue;
			if (/{{.*?}}/.test(node.nodeValue)) {
				vNode.$isReactive = true;
			}
		} else {
			vNode.$nodeValue = node.nodeValue;
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

	get vModel() {
		let vNode = this;
		if (vNode.$nodeType != Node.ELEMENT_NODE) {
			return undefined;
		}

		if (vNode.$vModel == undefined) {
			let vModel = Values.toString(vNode.$attributes['v-model'], '');

			vNode.$vModel = vModel.trim();
		}

		if (vNode.$vModel == '') {
			return undefined;
		}
		return vNode.$vModel;
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
		for (const parentVNode = vNode.$parentVNode; parentVNode; parentVNode = parentVNode.$parentVNode) {
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
				let result = vApp.eval(vNode.$attributes[vName], vNode.$bindings);
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
		if (!vNode.hasVModel) {
			return;
		}

		let oldValue = vApp[vNode.vModel];
		let newValue = undefined;

		if (vNode.$nodeName.toLowerCase() == 'input') {
			let type = Values.toString(vNode.$node.type, '').toLowerCase();
			if (['checkbox'].indexOf(type) !=  -1) {
				newValue = Values.clone(oldValue);
				if (!Array.isArray(newValue)) {
					newValue = Values.toString(newValue, '').trim().split(/\s*,\s*/);
				}
				let value = Values.toString(vNode.$node.value);
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
				newValue = Values.toString(vNode.$node.value);
			}
		} else if (vNode.$nodeName.toLowerCase() == 'textarea') {
			newValue = Values.toString(vNode.$node.value);
		} else if (vNode.$nodeName.toLowerCase() == 'select') {
			if (vNode.$node.multiple) {
				newValue = [];
				for (const el of vNode.$node.selectedOptions) {
					let value = Values.toString(el.value, '');
					if (newValue.indexOf(value) == -1) {
						newValue.push(value);
					}
				}
			} else {
				newValue = Values.toString(vNode.$node.value);
			}
		}

		if (JSON.stringify(oldValue) != JSON.stringify(newValue)) {
			vApp[vNode.vModel] = newValue;
			return true;
		}

		return false;
	}

	render(vRenderContext) {
		let vApp = this.$vApp;
		let vNode = this;

		if (vNode.isComponent) {
			if (vNode.$isActivated) {
				return;
			}

			const vComponent = VDOM.getComponent(vNode.$componentID);

			vNode.$templateID = Values.toString(vNode.$node.getAttribute('v-template'), '').trim();
			if (!vNode.$templateID) {
				vNode.$templateID = vComponent.templateID;
			}
			if (!vNode.$templateID) {
				vNode.$templateID = vComponent.id;
			}

			let props = {};
			for (const [name, value] of Object.entries(vNode.$bindings)) {
				props[name] = value;
			}
			let vProperties = Values.toString(vNode.$node.getAttribute('v-properties'), '').trim();
			if (vProperties) {
				p = vApp.eval(vProperties, vNode.$bindings);
				if (typeof p == 'object') {
					for (const [name, value] of Object.entries(p)) {
						props[name] = value;
					}
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
				vNode.$vApp = new VApp(vNode.$node, instance);
				vNode.$isActivated = true;
				vNode.$vApp.init();
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
							if (typeof newValue != 'object') {
								continue;
							}

							const style = vNode.$node.style;
							for (const [name, value] of Object.entries(newValue)) {
								if (style[name] != value) {
									style[name] = value;
								}
							}
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
					if (['checkbox'].indexOf(type) !=  -1) {
						let values = vApp[vNode.vModel];
						if (!Array.isArray(values)) {
							values = Values.toString(values, '').trim().split(/\s*,\s*/);
						}
						let newValue = (values.indexOf(vNode.$node.value) !=  -1);
						if (vNode.$node.checked != newValue) {
							vNode.$node.checked = newValue;
						}
					} else if (['radio'].indexOf(type) !=  -1) {
						let newValue = (Values.toString(vApp[vNode.vModel], '') == Values.toString(vNode.$node.value));
						if (vNode.$node.checked != newValue) {
							vNode.$node.checked = newValue;
						}
					} else {
						let newValue = Values.toString(vApp[vNode.vModel], '');
						if (vNode.$node.value != newValue) {
							vNode.$node.value = newValue;
						}
					}
				} else if (vNode.$nodeName.toLowerCase() == 'textarea') {
					let newValue = Values.toString(vApp[vNode.vModel], '');
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
							if (!Array.isArray(values)) {
								values = Values.toString(values, '').trim().split(/\s*,\s*/);
							}
							let newValue = (values.indexOf(Values.toString(vNode.$node.value)) != -1);
							if (vNode.$node.selected != newValue) {
								vNode.$node.selected = newValue;
							}
						} else {
							let newValue = (Values.toString(vApp[selectVNode.vModel], '') == Values.toString(vNode.$node.value));
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
			let vForExp = new VForExpression(vFor);
			let items = vApp.eval(vForExp.arrayExpression, vNode.$bindings);

			let childVNodes = [];
			let childVNodeMap = {};
			vForExp.execute(items, function(bindings) {
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
						if (['v-if', 'v-else-if'].indexOf(executed) != -1) {
							isActive = Values.toBoolean(vApp.eval(expression, bindings), false);
						} else {
							isActive = true;
						}
					}

					if (!vRenderContext.ifStatus.condition) {
						if (['v-if', 'v-else-if'].indexOf(executed) != -1) {
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

				let vNodes = vNode.$childVNodeMap[key];
				if (vNodes != undefined) {
					childVNodeMap[key] = [];
					for (const vNode of vNodes) {
						childVNodes.push(vNode);
						childVNodeMap[key].push(vNode);

						// Rendering
						vNode.render(vRenderContext);
					}
					delete vNode.$childVNodeMap[key];
					return;
				}

				let templateNodes = vNode.createTemplateNode();
				if (templateNodes instanceof DocumentFragment) {
					let l = [];
					for (const node of templateNodes.childNodes) {
						l.push(node);
					}
					templateNodes = l;
				} else {
					templateNodes = [templateNodes];
				}
				childVNodeMap[key] = [];
				for (const templateNode of templateNodes) {
					vNode.$node.parentNode.insertBefore(templateNode, vNode.$node);
					let templateVNode = new VNode({
						node: templateNode,
						parentVNode: vNode.$parentVNode,
						vApp: vNode.$vApp,
						bindings: bindings,
					});
					childVNodes.push(templateVNode);
					childVNodeMap[key].push(templateVNode);

					// Initial rendering
					templateVNode.render(vRenderContext);
				}
			});

			for (const childVNodes of Object.values(vNode.$childVNodeMap)) {
				for (const childVNode of childVNodes) {
					childVNode.remove();
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
				if (['v-if', 'v-else-if'].indexOf(executed) != -1) {
					isActive = Values.toBoolean(vApp.eval(expression, vNode.$bindings), false);
				} else {
					isActive = true;
				}
			}

			if (!isActive) {
				if (vNode.$childVNodes.length > 0) {
					for (const templateVNode of vNode.$childVNodes) {
						templateVNode.remove();
					}

					vNode.$childVNodes = [];
				}
			} else {
				if (vNode.$childVNodes.length > 0) {
					// Rendering
					for (const childVNode of vNode.$childVNodes) {
						childVNode.render(vRenderContext);
					}
				} else {
					let templateNodes = vNode.createTemplateNode();
					if (templateNodes instanceof DocumentFragment) {
						let l = [];
						for (const node of templateNodes.childNodes) {
							l.push(node);
						}
						templateNodes = l;
					} else {
						templateNodes = [templateNodes];
					}
					for (const templateNode of templateNodes) {
						vNode.$node.parentNode.insertBefore(templateNode, vNode.$node);
						let templateVNode = new VNode({
							node: templateNode,
							parentVNode: vNode.$parentVNode,
							vApp: vNode.$vApp,
							bindings: vNode.$bindings,
						});
						vNode.$childVNodes.push(templateVNode);

						// Initial rendering
						templateVNode.render(vRenderContext);
					}
				}
			}

			if (!vRenderContext.ifStatus.condition) {
				if (['v-if', 'v-else-if'].indexOf(executed) != -1) {
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
		if (['thead', 'tbody', 'tr', 'th', 'td'].indexOf(Values.toString(vNode.$templateNodeName, '').toLowerCase()) != -1) {
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
				vNode.$vApp.remove();
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
		vApp.$node = node;
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
		return Values.toNumber(vApp.$instance.keyupDelayTime, 400);
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

	init() {
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
					if (names.indexOf(name) != -1) {
						continue;
					}

					names.push(name);
					values.push(value);
				}
			}

			for (const [name, value] of Object.entries(vApp.$state.data)) {
				if (names.indexOf(name) != -1) {
					continue;
				}

				names.push(name);
				values.push(value);
			}

			if (vApp.$instance.methods != undefined) {
				for (const [name, value] of Object.entries(vApp.$instance.methods)) {
					if (names.indexOf(name) != -1) {
						continue;
					}
					if (typeof value != 'function') {
						continue;
					}

					names.push(name);
					values.push(value);
				}
			}

			if (updatable) {
				const $update = function() {
					const ignores = bindings ? Object.keys(bindings) : [];
					for (let i = 0; i < names.length; i++) {
						if (ignores.indexOf(names[i]) != -1) {
							continue;
						}
						if (typeof arguments[i] != 'function') {
							continue;
						}

						vApp[names[i]] = arguments[i];
					}
				};

				names.push('$update');
				values.push($update);
			}

			let source = '"use strict";';
			source += 'return function(' + names.join(',') + ') {';
			source += 'const $return = (' + expression + ');';
			if (updatable) {
				source += '$update(' + names.join(',') + ');';
			}
			source += 'return $return;';
			source += '}';
			return Function(source).call({}).apply(vApp, values);
		} catch (ex) {
			vApp.log.error(ex);
		}
		return undefined;
	}

	commit() {
		let vApp = this;
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
}