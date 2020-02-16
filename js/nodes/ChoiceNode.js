import _ from 'lodash';
import Node from './Node.js';

/**
 * @typedef {nodes#nodeData} AkunAPI.nodes#choiceNodeData
 * @property {string} nt=choice - Node type is "choice"
 * @property {Array.<string>} choices - The choices
 * @property {number} o - The original number of choices
 * @property {boolean} custom - Whether users are able to submit new choices
 * @property {boolean} multiple - Whether users can vote for multiple choices rather than just one
 * @property {Array.<string>} r - An array of node IDs that this node is a reply to
 * @property {string} [sid] - The unique ID of the story this node is part of, if not posted in a chat thread
 * @property {number} [w] - Word count
 * @property {number} [p] - Number of nodes that are replying to this node
 * @property {AkunAPI.nodes#chatNodeData} [lr] - The latest reply to this node
 * @property {Object.<string,number|Array.<number>>} [votes] - Map of user session ID to choice(s) voted for, the number matching an index in the choices array
 * @property {Object.<string,number|Array.<number>>} [userVotes] - Map of user ID to choice(s) voted for, the number matching an index in the choices array (omits votes cast by users without an account)
 * @property {Object.<string,string>} [uidUser] - Map of user session ID to user ID
 * @property {Array.<string>} [xOut] - List of crossed out choices, where it's the choice index in string form
 * @property {Object.<number,string>} [xOutReasons] - If reason for crossing a choice out is given this maps the choice index to that reason
 * @property {string|boolean} [closed] - If choice node is closed this takes value string "closed" otherwise it is absent or boolean true
 */

/**
 * @typedef {nodes#nodeData} AkunAPI.nodes#choice
 * @property {number} choiceId - The choice ID, aka the choiceValues array index
 * @property {number} count - The number of votes for this choice
 * @property {number} countVerified - The number of verified votes for this choice
 * @property {string} value - What the choice actually is
 * @property {boolean} [xOut] - Whether the choice was crossed out
 * @property {string} [xOutReason] - What the reason for being crossed out is if one was given
 */

/**
 * Sorts a list of choices into descending order by vote count
 *
 * @param {AkunAPI.nodes#choice} a - One of the votes to compare
 * @param {AkunAPI.nodes#choice} b - One of the votes to compare
 * @returns {number}
 */
function choiceSortFunction(a, b) {
	return b.count - a.count;
}

/**
 * Determines whether a vote is valid
 *
 * @param {AkunAPI.nodes#choice} vote - The vote to check
 * @returns {boolean}
 */
function isChoiceValid(vote) {
	return !vote.xOut;
}

/**
 * @class AkunAPI.nodes.ChoiceNode
 * @extends AkunAPI.nodes.Node
 */
class ChoiceNode extends Node {
	/**
	 * @constructor
	 * @param {AkunAPI.nodes.nodeData&AkunAPI.nodes#choiceNodeData} choiceNodeData - The node data
	 */
	constructor(choiceNodeData) {
		super(choiceNodeData);

		/** @type {?Array.<number>} */
		this._voteCounts = null;

		/** @type {?Array.<number>} */
		this._verifiedVoteCounts = null;

		/** @type {?Array.<AkunAPI.nodes#choice>} */
		this._choices = null;

		/** @type {?Array.<AkunAPI.nodes#choice>} */
		this._choicesWinning = null;

		/** @type {?Array.<AkunAPI.nodes#choice>} */
		this._choicesLosing = null;

		/** @type {?number} */
		this._voterCount = null;
	}

	/**
	 * The choices available
	 *
	 * @member {Array.<string>}
	 * @readonly
	 */
	get choiceValues() {
		return this._internal['choices'] || [];
	}

	/**
	 * Whether write-ins are allowed
	 *
	 * @member {boolean}
	 * @readonly
	 */
	get custom() {
		return !!this._internal['custom'];
	}

	/**
	 * Whether users can vote for multiple choices
	 *
	 * @member {boolean}
	 * @readonly
	 */
	get multiple() {
		return !!this._internal['multiple'];
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
	 * A list of vote counts. This and the choiceValues array match choice index
	 *
	 * @member {Array.<number>}
	 * @readonly
	 */
	get voteCounts() {
		if (!this._voteCounts) {
			this._tallyVotes();
		}
		return this._voteCounts;
	}

	/**
	 * A list of verified vote counts. This and the choiceValues array match choice index
	 *
	 * @member {Array.<number>}
	 * @readonly
	 */
	get verifiedVoteCounts() {
		if (!this._verifiedVoteCounts) {
			this._tallyVotes();
		}
		return this._verifiedVoteCounts;
	}

	/**
	 * A list of choices sorted by vote count.
	 *
	 * @member {Array.<AkunAPI.nodes#choice>}
	 * @readonly
	 */
	get choices() {
		if (!this._choices) {
			this._sortVotes();
		}
		return this._choices;
	}

	/**
	 * A list of votes that share highest vote count
	 * If there's a single winner this array is length 1
	 * If there are no valid votes this array is length 0
	 *
	 * @member {Array.<AkunAPI.nodes#choice>}
	 * @readonly
	 */
	get choicesWinning() {
		if (!this._choicesWinning) {
			const validChoices = this.choices.filter(isChoiceValid);
			if (validChoices.length) {
				const highestVoteCount = validChoices.reduce((acc, curr) => {
					return Math.max(acc, curr.count);
				}, 0);
				this._choicesWinning = validChoices.filter((choice) => {
					return choice.count === highestVoteCount;
				});
			} else {
				this._choicesWinning = [];
			}
		}
		return this._choicesWinning;
	}

	/**
	 * A list of votes that share lowest vote count
	 * If there's a single loser this array is length 1
	 * If there are no valid votes this array is length 0
	 *
	 * @member {Array.<AkunAPI.nodes#choice>}
	 * @readonly
	 */
	get choicesLosing() {
		if (!this._choicesLosing) {
			const validChoices = this.choices.filter(isChoiceValid);
			if (validChoices.length) {
				const lowestVoteCount = validChoices.reduce((acc, curr) => {
					return Math.min(acc, curr.count);
				}, 0);
				this._choicesLosing = validChoices.filter((choice) => {
					return choice.count === lowestVoteCount;
				});
			} else {
				this._choicesLosing = [];
			}
		}
		return this._choicesLosing;
	}

	/**
	 * The number of users that have placed one or more votes
	 *
	 * @returns {number}
	 */
	get voterCount() {
		if (_.isNull(this._voterCount)) {
			if (this._internal.votes) {
				if (this.multiple) {
					this._voterCount = Object.values(this._internal.votes).filter((choiceArray) => choiceArray.length > 0).length;
				} else {
					this._voterCount = Object.values(this._internal.votes).filter(_.isNumber).length;
				}
			} else {
				this._voterCount = 0;
			}
		}
		return this._voterCount;
	}

	/**
	 * Initialises the node
	 *
	 * @private
	 */
	_init() {
		super._init();
		this._voteCounts = null;
		this._choices = null;
		this._choicesWinning = null;
		this._choicesLosing = null;
	}

	/**
	 * Returns a string representation of this node
	 *
	 * @returns {string}
	 */
	toString() {
		return `Choice: (${this.id}) ${JSON.stringify(this.choiceValues)}`;
	}

	/**
	 * Counts the votes up
	 *
	 * @private
	 */
	_tallyVotes() {
		this._voteCounts = new Array(this.choiceValues.length);
		this._voteCounts.fill(0);
		this._verifiedVoteCounts = new Array(this.choiceValues.length);
		this._verifiedVoteCounts.fill(0);
		const votes = this._internal['votes'];
		if (votes) {
			for (const voter of Object.keys(votes)) {
				const isVerified = this._internal['uidUser'] && this._internal['uidUser'][voter];
				if (this.multiple) {
					for (const choiceId of votes[voter]) {
						this._incrementVote(choiceId, isVerified);
					}
				} else {
					const choiceId = votes[voter];
					this._incrementVote(choiceId, isVerified);
				}
			}
		}
	}

	/**
	 * Validates the given choiceId and increments the corresponding vote count
	 *
	 * @param {number} choiceId - The vote ID is the index of the vote in the choices array
	 * @param {boolean} isVerified - Whether the vote is a verified vote
	 * @private
	 */
	_incrementVote(choiceId, isVerified) {
		// choiceId can be null or a number but that number isn't guaranteed to match an index of an entry in the choices array
		// votes is a non-holey array set to match the length of choices and filled with 0
		if (this._voteCounts[choiceId] || this._voteCounts[choiceId] === 0) {
			this._voteCounts[choiceId]++;
		}
		if (isVerified) {
			if (this._verifiedVoteCounts[choiceId] || this._verifiedVoteCounts[choiceId] === 0) {
				this._verifiedVoteCounts[choiceId]++;
			}
		}
	}

	/**
	 * Sorts the votes by order of vote count
	 *
	 * @private
	 */
	_sortVotes() {
		this._choices = [];
		const voteCounts = this.voteCounts;
		const verifiedVoteCounts = this.verifiedVoteCounts;
		const xOut = this._internal['xOut'];
		const xOutReasons = this._internal['xOutReasons'];
		for (let choiceId = 0; choiceId < voteCounts.length; choiceId++) {
			const choice = {
				choiceId,
				count: voteCounts[choiceId],
				countVerified: verifiedVoteCounts[choiceId],
				value: this.choiceValues[choiceId]
			};
			if (xOut && xOut.includes(`${choiceId}`)) {
				choice.xOut = true;
				if (xOutReasons && xOutReasons[choiceId]) {
					choice.xOutReason = xOutReasons[choiceId];
				}
			}
			this._choices.push(choice);
		}
		this._choices.sort(choiceSortFunction);
	}
}

export default ChoiceNode;
