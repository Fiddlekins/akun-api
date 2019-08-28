import Node from './Node.js';

class ChatNode extends Node {
	_init() {
		super._init();
	}

	toString() {
		return `Chat: ${this._userName} (${this._userId}): ${this.body}`;
	}
}

export default ChatNode;
