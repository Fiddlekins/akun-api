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
 * @property {number} voteId - The vote ID, aka the choices array index
 * @property {number} count - The number of votes for this choice
 * @property {string} choice - What the choice actually is
 * @property {boolean} [xOut] - Whether the choice was crossed out
 * @property {string} [xOutReason] - What the reason for being crossed out is if one was given
 */

/**
 * Sorts a list of votes into descending order by vote count
 *
 * @param {AkunAPI.nodes#choice} a - One of the votes to compare
 * @param {AkunAPI.nodes#choice} b - One of the votes to compare
 * @returns {number}
 */
function voteSortFunction(a, b) {
	return a.count - b.count;
}

/**
 * Determines whether a vote is valid
 *
 * @param {AkunAPI.nodes#choice} vote - The vote to check
 * @returns {boolean}
 */
function isVoteValid(vote) {
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

		/** @type {?Array.<AkunAPI.nodes#choice>} */
		this._votes = null;

		/** @type {?Array.<AkunAPI.nodes#choice>} */
		this._votesWinning = null;

		/** @type {?Array.<AkunAPI.nodes#choice>} */
		this._voteLosing = null;
	}

	/**
	 * The choices available
	 *
	 * @member {Array.<string>}
	 * @readonly
	 */
	get choices() {
		return this._internal['choices'];
	}

	/**
	 * Whether write-ins are allowed
	 *
	 * @member {boolean}
	 * @readonly
	 */
	get custom() {
		return this._internal['custom'];
	}

	/**
	 * Whether users can vote for multiple choices
	 *
	 * @member {boolean}
	 * @readonly
	 */
	get multiple() {
		return this._internal['multiple'];
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
	 * A list of vote counts. This and the choices array match choice index
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
	 * A sorted list of votes.
	 *
	 * @member {Array.<AkunAPI.nodes#choice>}
	 * @readonly
	 */
	get votes() {
		if (!this._votes) {
			this._sortVotes();
		}
		return this._votes;
	}

	/**
	 * A list of votes that share highest vote count
	 * If there's a single winner this array is length 1
	 * If there are no valid votes this array is length 0
	 *
	 * @member {Array.<AkunAPI.nodes#choice>}
	 * @readonly
	 */
	get votesWinning() {
		if (!this._votesWinning) {
			const validVotes = this.votes.filter(isVoteValid);
			if (validVotes.length) {
				const highestVoteCount = validVotes.reduce((acc, curr) => {
					return Math.max(acc, curr.count);
				}, 0);
				this._votesWinning = validVotes.filter((vote) => {
					return vote.count === highestVoteCount;
				});
			} else {
				this._votesWinning = [];
			}
		}
		return this._votesWinning;
	}

	/**
	 * A list of votes that share lowest vote count
	 * If there's a single loser this array is length 1
	 * If there are no valid votes this array is length 0
	 *
	 * @member {Array.<AkunAPI.nodes#choice>}
	 * @readonly
	 */
	get votesLosing() {
		if (!this._voteLosing) {
			const validVotes = this.votes.filter(isVoteValid);
			if (validVotes.length) {
				const lowestVoteCount = validVotes.reduce((acc, curr) => {
					return Math.min(acc, curr.count);
				}, 0);
				this._voteLosing = validVotes.filter((vote) => {
					return vote.count === lowestVoteCount;
				});
			} else {
				this._voteLosing = [];
			}
		}
		return this._voteLosing;
	}

	/**
	 * Initialises the node
	 *
	 * @private
	 */
	_init() {
		super._init();
		this._voteCounts = null;
		this._votes = null;
		this._votesWinning = null;
		this._voteLosing = null;
	}

	/**
	 * Returns a string representation of this node
	 *
	 * @returns {string}
	 */
	toString() {
		return `Choice: (${this.id}) ${JSON.stringify(this._internal['choices'])}`;
	}

	/**
	 * Counts the votes up
	 *
	 * @private
	 */
	_tallyVotes() {
		const votes = this._internal['votes'];
		this._voteCounts = new Array(this.choices.length);
		this._voteCounts.fill(0);
		for (const voter of Object.keys(votes)) {
			if (this.multiple) {
				for (const voteId of votes[voter]) {
					this._incrementVote(voteId);
				}
			} else {
				const voteId = votes[voter];
				this._incrementVote(voteId);
			}
		}
	}

	/**
	 * Validates the given voteID and increments the corresponding vote count
	 *
	 * @param {number} voteId - The vote ID is the index of the vote in the choices array
	 * @private
	 */
	_incrementVote(voteId) {
		// voteId can be null or a number but that number isn't guaranteed to match an index of an entry in the choices array
		// votes is a non-holey array set to match the length of choices and filled with 0
		if (this._voteCounts[voteId] || this._voteCounts[voteId] === 0) {
			this._voteCounts[voteId]++;
		}
	}

	/**
	 * Sorts the votes by order of vote count
	 *
	 * @private
	 */
	_sortVotes() {
		this._votes = [];
		const voteCounts = this.voteCounts;
		const xOut = this._internal['xOut'];
		const xOutReasons = this._internal['xOutReasons'];
		for (let voteId = 0; voteId < voteCounts.length; voteId++) {
			const vote = {
				voteId,
				count: voteCounts[voteId],
				choice: this.choices[voteId]
			};
			if (xOut && xOut.includes(`${voteId}`)) {
				vote.xOut = true;
				if (xOutReasons && xOutReasons[voteId]) {
					vote.xOutReason = xOutReasons[voteId];
				}
			}
			this._votes.push(vote);
		}
		this._votes.sort(voteSortFunction);
	}
}

export default ChoiceNode;
