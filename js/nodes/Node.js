class Node {
	constructor(data) {
		this._internal = data;
		this._userName = null;
		this._userId = null;
		this._userAvatar = null;
		this._init();
	}

	get data() {
		return this._internal;
	}

	get id() {
		return this._internal['_id'];
	}

	get body() {
		return this._internal['b'];
	}

	get username() {
		return this._userName;
	}

	get createdTime() {
		return this._internal['ct'];
	}

	static _mergeNodeData(currentNodeData, newNodeData) {
		for (const prop in newNodeData) {
			if (prop !== 'updateProperties' && newNodeData.hasOwnProperty(prop)) {
				if (typeof newNodeData[prop] === 'object' && !Array.isArray(newNodeData[prop])) {
					if (typeof currentNodeData[prop] === 'object') {
						Node._mergeNodeData(currentNodeData[prop], newNodeData[prop]);
					} else {
						currentNodeData[prop] = newNodeData[prop];
					}
				} else {
					currentNodeData[prop] = newNodeData[prop];
				}
			}
		}
	}

	_init() {
		this._userName = 'Anon';
		if (this._internal['u']) {
			const user = this._internal['u'][0] || this._internal['u'];
			if (user['n']) {
				this._userName = user['n'];
			}
			if (user['_id']) {
				this._userId = user['_id'];
			}
			if (user['a']) {
				this._userAvatar = user['a'];
			}
		}
	}

	merge(newNodeData) {
		Node._mergeNodeData(this._internal, newNodeData);
		this._init();
	}

	replace(newNodeData) {
		this._internal = newNodeData;
		this._init();
	}

	toString() {
		return `BaseNode: ${JSON.stringify(this._internal)}`;
	}
}

export default Node;
