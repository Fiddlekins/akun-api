import Node from './Node.js';

/**
 * @typedef {Object} AkunAPI.nodes#replyTarget
 * @property {string} _id - The unique node ID
 * @property {string} b - The node body
 * @property {boolean} [hide] - Whether the reply target should be hidden
 */

/**
 * @typedef {Node#nodeData} AkunAPI.nodes#chatNodeData
 * @property {string} nt=chat - Node type is "chat"
 * @property {string} b - The text to display
 * @property {Array.<string>} r - An array of node IDs that this node is a reply to
 * @property {AkunAPI.nodes#replyTarget} [ra] - Summary of the node this node is a reply to
 * @property {boolean} [pac] - Whether this is a "posts a chapter" chat node
 */

/**
 * @class AkunAPI.nodes.ChatNode
 * @extends AkunAPI.nodes.Node
 */
class ChatNode extends Node {
	/**
	 * @constructor
	 * @param {AkunAPI.nodes.nodeData&AkunAPI.nodes#chatNodeData} chatNodeData - The node data
	 */
	constructor(chatNodeData) {
		super(chatNodeData);
	}

	/**
	 * The node body text
	 *
	 * @member {string}
	 * @readonly
	 */
	get body() {
		return this._internal['b'];
	}

	/**
	 * Returns a string representation of this node
	 *
	 * @returns {string}
	 */
	toString() {
		return `Chat: ${this._userName} (${this._userId}): ${this.body}`;
	}
}

export default ChatNode;
