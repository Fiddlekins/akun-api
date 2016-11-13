'use strict';

class History {
	constructor(maxSize){
		if (maxSize < 0) {
			throw new Error('History initialised with invalid maxSize: ' + maxSize);
		}
		this._maxSize = maxSize || 500;
		this._order = [];
		this._content = new Map();
	}

	get size(){
		return this._content.size;
	}

	has(idOrNode){
		let id = typeof idOrNode === 'object' ? History._getId(idOrNode) : idOrNode;
		return this._content.has(id);
	}

	get(idOrNode){
		let id = typeof idOrNode === 'object' ? History._getId(idOrNode) : idOrNode;
		return this._content.get(id);
	}

	lastId(){
		return this._order[this._order.length - 1];
	}

	last(){
		let id = this.lastId();
		return this._content.get(id);
	}

	sliceId(begin, end){
		return this._order.slice(begin, end);
	}

	slice(begin, end){
		return this.sliceId(begin, end).map(id=>{
			return this._content.get(id)
		});
	}

	add(node){
		let id = History._getId(node);
		this._order.push(id);
		this._content.set(id, node);
		this._cull();
	}

	update(node){
		let id = History._getId(node);
		if (node['updateProperties']) {
			History._mergeNodes(this._content.get(id), node);
		} else {
			this._content.set(id, node);
		}
	}

	static _getId(node){
		return node['_id'];
	}

	static _mergeNodes(currentNode, newNode){
		for (let prop in newNode) {
			if (prop !== 'updateProperties' && newNode.hasOwnProperty(prop)) {
				if (typeof newNode[prop] === 'object' && !Array.isArray(newNode[prop])) {
					if (typeof currentNode[prop] === 'object') {
						History._mergeNodes(currentNode[prop], newNode[prop]);
					} else {
						currentNode[prop] = newNode[prop];
					}
				} else {
					currentNode[prop] = newNode[prop];
				}
			}
		}
	}

	_cull(){
		if (this._content.size > this._maxSize) {
			let cullCount = Math.floor(this._maxSize / 2);
			let culledIds = this._order.splice(0, cullCount);
			for (let id of culledIds) {
				this._content.delete(id);
			}
		}
	}
}

module.exports = History;
