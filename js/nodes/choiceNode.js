'use strict';

const Node = require('./baseNode.js');

class ChoiceNode extends Node {
	_init(){
		super._init();
		this._votes = {};
		this._needsTallying = true;
		this._voteWinning = null;
		this._voteLosing = null;
		this._votesSorted = null;
	}

	get choices(){
		return this._internal['choices'];
	}

	get custom(){
		return this._internal['custom'];
	}

	get multiple(){
		return this._internal['multiple'];
	}

	get voteWinning(){
		if (this._voteWinning) {
			return this._voteWinning;
		}
		this._checkTally();
		let highestVoteCount = -Infinity;
		let highestVote = null;
		for (let vote in this._votes) {
			if (this._votes.hasOwnProperty(vote) && this._votes[vote] > highestVoteCount) {
				highestVote = vote;
				highestVoteCount = this._votes[vote];
			}
		}
		this._voteWinning = ChoiceNode._getVoteObject(highestVote, highestVoteCount);
		return this._voteWinning;
	}

	get voteLosing(){
		if (this._voteLosing) {
			return this._voteLosing;
		}
		this._checkTally();
		let lowestVoteCount = Infinity;
		let lowestVote = null;
		for (let vote in this._votes) {
			if (this._votes.hasOwnProperty(vote) && this._votes[vote] < lowestVoteCount) {
				lowestVote = vote;
				lowestVoteCount = this._votes[vote];
			}
		}
		this._voteLosing = ChoiceNode._getVoteObject(lowestVote, lowestVoteCount);
		return this._voteLosing;
	}

	voteSlice(begin, end){
		if (this._votesSorted) {
			return this._votesSorted.slice(begin, end);
		}
		this._checkTally();
		this._votesSorted = [];
		for (let vote in this._votes) {
			if (this._votes.hasOwnProperty(vote)) {
				this._votesSorted.push(ChoiceNode._getVoteObject(vote, this._votes[vote]));
			}
		}
		this._votesSorted.sort(ChoiceNode._voteSortFunction);
		return this._votesSorted.slice(begin, end);
	}

	merge(newNodeData){
		super.merge(newNodeData);
		this._needsTallying = true;
	}

	replace(newNodeData){
		super.replace(newNodeData);
		this._needsTallying = true;
	}

	toString(){
		return `Choice: (${this.id}) ${JSON.stringify(this._internal['choices'])}`;
	}

	_checkTally(){
		if (this._needsTallying) {
			this._tallyVotes();
		}
	}

	_tallyVotes(){
		let choices = this.choices;
		let votes = this._internal['votes'];
		if (this.multiple) {
			for (let voter in votes) {
				if (votes.hasOwnProperty(voter)) {
					for (let vote of votes[voter]) {
						this._incrementChoice(choices[vote]);
					}
				}
			}
		} else {
			for (let voter in votes) {
				if (votes.hasOwnProperty(voter)) {
					let vote = votes[voter];
					this._incrementChoice(choices[vote]);
				}
			}
		}
		this._needsTallying = false;
	}

	_incrementChoice(choice){
		this._votes[choice] = this._votes[choice] || 0;
		this._votes[choice]++;
	}

	static _getVoteObject(vote, count){
		return {vote: vote, count: count};
	}

	static _voteSortFunction(a, b){
		return a.count - b.count;
	}
}

module.exports = ChoiceNode;
