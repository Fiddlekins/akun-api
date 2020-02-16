import Node from './Node.js';

/**
 * @typedef {Node#nodeData} AkunAPI.nodes#readerPostNodeData
 * @property {string} nt=readerPost - Node type is "readerPost"
 * @property {string} [sid] - The unique ID of the story this node is part of, if not posted in a chat thread
 * @property {number} [w] - Word count
 * @property {number} [p] - Number of nodes that are replying to this node
 * @property {AkunAPI.nodes#chatNodeData} [lr] - The latest reply to this node
 * @property {string|boolean} [closed] - If readerPost node is closed this takes value string "closed" otherwise it is absent or boolean true
 * @property {Object.<string,string>} [votes] - Map of user session ID to user submitted write-in
 * @property {Object.<string,string>} [dice] - Map of user session ID to dice results
 */

/**
 * @class AkunAPI.nodes.ReaderPostNode
 * @extends AkunAPI.nodes.Node
 */
class ReaderPostNode extends Node {
	/**
	 * @constructor
	 * @param {AkunAPI.nodes.nodeData&AkunAPI.nodes#readerPostNodeData} readerPostNodeData - The node data
	 */
	constructor(readerPostNodeData) {
		super(readerPostNodeData);

		/** @type {?Array.<string>} */
		this._votes = null;

		/** @type {?Array.<string>} */
		this._dice = null;
	}

	/**
	 * The user write-ins
	 *
	 * @member {Array.string}
	 * @readonly
	 */
	get votes() {
		if (!this._votes) {
			this._votes = this._internal['votes'] ? Object.values(this._internal['votes']) : [];
		}
		return this._votes;
	}

	/**
	 * The user dice rolls
	 *
	 * @member {Array.string}
	 * @readonly
	 */
	get dice() {
		if (!this._dice) {
			this._dice = this._internal['dice'] ? Object.values(this._internal['dice']) : [];
		}
		return this._dice;
	}

	/**
	 * Whether the choice node is closed
	 *
	 * @member {boolean}
	 * @readonly
	 */
	get closed() {
		return this._internal['closed'] === 'closed';
	}

	/**
	 * Initialises the node
	 *
	 * @private
	 */
	_init() {
		super._init();
		this._votes = null;
		this._dice = null;
	}

	/**
	 * Returns a string representation of this node
	 *
	 * @returns {string}
	 */
	toString() {
		const content = [];
		if (this.votes.length) {
			content.push(`votes: ${this.votes}`);
		}
		if (this.dice.length) {
			content.push(`dice: ${this.dice}`);
		}
		return `ReaderPost: (${this.id}) ${content.length ? content.join(', ') : 'Empty'}`;
	}
}

export default ReaderPostNode;
