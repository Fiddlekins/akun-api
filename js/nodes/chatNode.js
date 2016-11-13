'use strict';

const Node = require('./baseNode.js');

class ChatNode extends Node {
	_init(){
		super._init();
	}

	toString(){
		return `${this._userName} (${this._userId}): ${this.body}`;
	}
}

module.exports = ChatNode;
