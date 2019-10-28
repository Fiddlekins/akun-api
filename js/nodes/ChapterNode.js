import Node from './Node.js';

/**
 * @typedef {Node#nodeData} AkunAPI.nodes#chapterNodeData
 * @property {string} nt=chapter - Node type is "chapter"
 * @property {string} b - The text to display
 * @property {string} sid - The unique ID of the story this node is part of, if not posted in a chat thread
 * @property {number} w - Word count
 * @property {number} [p] - Number of nodes that are replying to this node
 * @property {AkunAPI.nodes#chatNodeData} [lr] - The latest reply to this node
 */

/**
 * @class AkunAPI.nodes.ChapterNode
 * @extends AkunAPI.nodes.Node
 */
class ChapterNode extends Node {
	/**
	 * @constructor
	 * @param {AkunAPI.nodes.nodeData&AkunAPI.nodes#chapterNodeData} chapterNodeData - The node data
	 */
	constructor(chapterNodeData) {
		super(chapterNodeData);
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
		return `Chapter: (${this.id}) ${this.body && this.body.slice(0, 500)}`;
	}
}

export default ChapterNode;
