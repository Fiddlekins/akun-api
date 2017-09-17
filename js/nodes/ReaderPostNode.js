'use strict';

const Node = require('./BaseNode.js');

class ReaderPostNode extends Node {
	_init(){
		super._init();
		this._votes = null;
		this._dice = null;
	}

	get votes(){
		if (this._votes) {
			return this._votes;
		}
		let votes = this._internal['votes'];
		this._votes = [];
		for (let voter in votes) {
			if (votes.hasOwnProperty(voter)) {
				this._votes.push(votes[voter]);
			}
		}
		return this._votes;
	}

	get dice(){
		if (this._dice) {
			return this._dice;
		}
		let dice = this._internal['dice'];
		this._dice = [];
		for (let user in dice) {
			if (dice.hasOwnProperty(user)) {
				this._dice.push(dice[user]);
			}
		}
		return this._dice;
	}

	toString(){
		return `ReaderPost: (${this.id}) votes: ${this.votes}, dice: ${this.dice}`;
	}
}

module.exports = ReaderPostNode;
