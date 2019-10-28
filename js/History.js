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

	get last() {
		return this._order[this._order.length - 1];
	}

	get nodes() {
		return this._order;
	}

	has(idOrNode) {
		const id = idOrNode.id || idOrNode;
		return this._content.has(id);
	}

	get(idOrNode) {
		const id = idOrNode.id || idOrNode;
		return this._content.get(id);
	}

	add(node) {
		const id = node.id;
		// Most of the time we're dealing with new nodes which we can push to the front more efficiently
		if (this._order.length && node.createdTime >= this.last.createdTime) {
			this._order.push(node);
		} else {
			// Otherwise we've probably wound up loading an old node, so start from the back and work forwards, checking created time to determine insert point
			for (let nodeIndex = 0; nodeIndex < this._order.length; nodeIndex++) {
				if (node.createdTime < this._order[nodeIndex].createdTime) {
					this._order.splice(nodeIndex, 0, node);
					break;
				}
			}
		}
		this._content.set(id, node);
		this._cull();
	}

	_cull() {
		if (this.size > this._maxSize) {
			const cullCount = Math.floor(this._maxSize / 2);
			const culledNodes = this._order.splice(0, cullCount);
			for (const { id } of culledNodes) {
				this._content.delete(id);
			}
		}
	}
}

export default History;
