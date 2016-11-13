'use strict';

const Node = require('./baseNode.js');

class ChapterNode extends Node {
	_init(){
		super._init();
	}

	toString(){
		return `Chapter ${this.body.slice(0,500)}`;
	}
}

module.exports = ChapterNode;
