'use strict';

const Node = require('./BaseNode.js');

class ChapterNode extends Node {
	_init(){
		super._init();
	}

	toString(){
		return `Chapter: (${this.id}) ${this.body && this.body.slice(0, 500)}`;
	}
}

module.exports = ChapterNode;
