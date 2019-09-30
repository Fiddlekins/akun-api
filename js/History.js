class History {
	constructor(maxSize) {
		if (maxSize < 0) {
			throw new Error(`History initialised with invalid maxSize: ${maxSize}`);
		}
		this._maxSize = maxSize || 500;
		this._order = [];
		this._content = new Map();
	}

	get size() {
		return this._content.size;
	}

	has(idOrNode) {
		const id = typeof idOrNode === 'object' ? idOrNode.id : idOrNode;
		return this._content.has(id);
	}

	get(idOrNode) {
		const id = typeof idOrNode === 'object' ? idOrNode.id : idOrNode;
		return this._content.get(id);
	}

	lastId() {
		return this._order[this._order.length - 1];
	}

	last() {
		const id = this.lastId();
		return this._content.get(id);
	}

	sliceId(begin, end) {
		return this._order.slice(begin, end);
	}

	slice(begin, end) {
		return this.sliceId(begin, end).map(id => {
			return this._content.get(id);
		});
	}

	forEach(...args) {
		return this._content.forEach(...args);
	}

	add(node) {
		const id = node.id;
		this._order.push(id);
		this._content.set(id, node);
		this._cull();
	}

	update(node) {
		const id = node.id;
		const nodeData = node.data;
		if (this._content.has(id)) {
			if (nodeData['updateProperties']) {
				this._content.get(id).merge(nodeData);
			} else {
				this._content.get(id).replace(nodeData);
			}
		} else {
			const id = node.id;
			this._order.unshift(id);
			this._content.set(id, node);
			this._cull();
		}
	}

	_cull() {
		if (this._content.size > this._maxSize) {
			const cullCount = Math.floor(this._maxSize / 2);
			const culledIds = this._order.splice(0, cullCount);
			for (const id of culledIds) {
				this._content.delete(id);
			}
		}
	}
}

export default History;
