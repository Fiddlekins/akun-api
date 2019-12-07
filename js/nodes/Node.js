/**
 * @typedef {Object} AkunAPI.nodes#user
 * @property {string} _id - The unique user ID
 * @property {string} n - The username or "Anon" if the user was posting anonymously
 * @property {string} [a] - If the user wasn't posting anonymously and they have an avatar this is the url to that image
 */

/**
 * @typedef {Object} AkunAPI.nodes#nodeData
 * @property {string} _id - The unique node ID
 * @property {string} nt - Node type
 * @property {number} ct - Creation timestamp
 * @property {number} rt - Reply timestamp?
 * @property {number} ut - Update timestamp (eg. node was edited)
 * @property {string|Node#user|Array.<Node#user>} u - The user that created the node. This is the string "Anon" if made without an account
 * @property {string} [t] - The title, displayed when opening the node in a new tab (eg. /stories/threads/chat/{id})
 */

/**
 * Recursively merges an updated subset of node properties with the existing data
 *
 * @param {AkunAPI.nodes#nodeData} currentNodeData - The existing node data
 * @param {AkunAPI.nodes#nodeData} newNodeData - The new node data to merge in
 */
function mergeNodeData(currentNodeData, newNodeData) {
	for (const prop in newNodeData) {
		if (prop !== 'updateProperties' && newNodeData.hasOwnProperty(prop)) {
			if (typeof newNodeData[prop] === 'object' && !Array.isArray(newNodeData[prop])) {
				if (typeof currentNodeData[prop] === 'object') {
					mergeNodeData(currentNodeData[prop], newNodeData[prop]);
				} else {
					currentNodeData[prop] = newNodeData[prop];
				}
			} else {
				currentNodeData[prop] = newNodeData[prop];
			}
		}
	}
}

/**
 * @class AkunAPI.nodes.Node
 */
class Node {
	/**
	 * @constructor
	 * @param {AkunAPI.nodes.nodeData} nodeData - The raw node data to create an interface for
	 */
	constructor(nodeData) {
		/** @type {AkunAPI.nodes.nodeData} */
		this._internal = nodeData;

		/** @type {?String} */
		this._userName = null;

		/** @type {?String} */
		this._userId = null;

		/** @type {?String} */
		this._userAvatar = null;

		this._init();
	}

	/**
	 * The raw node data
	 *
	 * @member {AkunAPI.nodes.nodeData}
	 * @readonly
	 */
	get data() {
		return this._internal;
	}

	/**
	 * The node ID
	 *
	 * @member {string}
	 * @readonly
	 */
	get id() {
		return this._internal['_id'];
	}

	/**
	 * The username of the node creator
	 *
	 * @member {?string}
	 * @readonly
	 */
	get username() {
		return this._userName;
	}

	/**
	 * The userId of the node creator
	 *
	 * @member {?string}
	 * @readonly
	 */
	get userId(){
		return this._userId;
	}

	/**
	 * The avatar of the node creator
	 *
	 * @member {?string}
	 * @readonly
	 */
	get avatar() {
		return this._userAvatar;
	}

	/**
	 * The timestamp the node was created at
	 *
	 * @member {number}
	 * @readonly
	 */
	get createdTime() {
		return this._internal['ct'];
	}

	/**
	 * The node type
	 *
	 * @member {string}
	 * @readonly
	 */
	get type() {
		return this._internal['nt'];
	}

	/**
	 * Initialises the node
	 *
	 * @private
	 */
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

	/**
	 * Merges an a subset of updated properties of this node into the existing data
	 *
	 * @param {AkunAPI.nodes.nodeData} newNodeData - The new node data to merge in
	 */
	merge(newNodeData) {
		mergeNodeData(this._internal, newNodeData);
		this._init();
	}

	/**
	 * Replaces the internal data with the new node data
	 *
	 * @param {AkunAPI.nodes.nodeData} newNodeData - The new node data to replace with
	 */
	replace(newNodeData) {
		this._internal = newNodeData;
		this._init();
	}

	/**
	 * Returns a string representation of this node
	 *
	 * @returns {string}
	 */
	toString() {
		return `BaseNode: ${JSON.stringify(this._internal)}`;
	}
}

export default Node;
