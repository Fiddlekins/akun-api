import _ from 'lodash';
import {ChatClient, StoryClient} from './clients/index.js'
import Core from './Core.js';
import {ChapterNode, ChatNode, ChoiceNode, ReaderPostNode} from './nodes/index.js';
import RealTimeConnection from './RealTimeConnection.js';

class Akun {
	constructor(settings) {
		this._settings = settings;
		this.core = new Core({ protocol: settings.protocol, hostname: settings.hostname });
		if (this._settings.connection) {
			this.connection = new RealTimeConnection(this, this._settings.connection);
		}
		// Special choice node in unpublished story devoted to divining the ephemeralUserId
		this._ephemeralUserId = this.vote('DAjqaif2XdtjF9mPD', 0).then(({ user }) => user);
		this._clients = new Map();
	}

	/**
	 * Special UID based on IP used to track vote requests
	 *
	 * @returns {Promise<string>}
	 */
	get ephemeralUserIdPromise() {
		return this._ephemeralUserId;
	}

	get loggedIn() {
		return this.core.loggedIn;
	}

	get clients() {
		return this._clients;
	}

	get silent() {
		return this._settings.silent === true;
	}

	destroy() {
		if (this.connection) {
			this.connection.destroy();
		}
		this._clients.forEach(client => client.destroy());
	}

	async login(username, password, shouldRefresh = true) {
		const res = await this.core.login(username, password);
		if (shouldRefresh && this._settings.connection) {
			this.connection.refresh();
		}
		return res;
	}

	async logout(shouldRefresh = true) {
		this.core.logout();
		if (shouldRefresh) {
			this.connection.refresh();
		}
	}

	async join(idOrNodeData) {
		let id;
		let nodeData;
		if (idOrNodeData['_id']) {
			id = idOrNodeData['_id'];
			nodeData = idOrNodeData;
		} else {
			id = idOrNodeData;
		}
		if (this._clients.has(id)) {
			return this._clients.get(id);
		}
		if (!nodeData) {
			nodeData = await this.getNodeData(id);
		}
		const nodeType = nodeData['nt'];
		let client;
		switch (nodeType) {
			case 'story':
				client = new StoryClient(this, nodeData);
				break;
			case 'chat':
				client = new ChatClient(this, nodeData);
				break;
			case 'post':
				client = new ChatClient(this, nodeData);
				break;
			default:
				throw new Error(`Join request to unrecognised nodeType '${nodeType}':\n${nodeData}`);
		}
		this._clients.set(id, client);
		await client.init();
		return client;
	}

	get(...args) {
		return this.core.get(...args);
	}

	post(...args) {
		return this.core.post(...args);
	}

	delete(...args) {
		return this.core.delete(...args);
	}

	put(...args) {
		return this.core.put(...args);
	}

	getNodeData(id) {
		return this.core.get(`/api/node/${id}`);
	}

	async getNode(id) {
		const nodeData = await this.getNodeData(id);
		const nodeType = nodeData['nt'];
		switch (nodeType) {
			case 'chat':
				return new ChatNode(nodeData);
			case 'chapter':
				return new ChapterNode(nodeData);
			case 'choice':
				return new ChoiceNode(nodeData);
			case 'readerPost':
				return new ReaderPostNode(nodeData);
			default:
				throw new Error(`Unrecognised nodeType '${nodeType}':\n${JSON.stringify(nodeData, null, '\t')}`);
		}
	}

	async setAnon(postAsAnon = true) {
		if (!this.loggedIn) {
			throw new Error(`Tried to set anon mode whilst not logged into an account`);
		}
		this.core.profileSettings.asAnon = postAsAnon;
		await this.core.updateProfileSettings(this.core.profileSettings);
	}

	createStory(title) {
		const data = {
			'nt': 'story',
			'storyStatus': 'active',
			'contentRating': 'teen',
			't': title,
			'mcOff': true,
			'trash': true,
			'init': true
		};
		return this.core.post(`/api/anonkun/board/item`, { data });
	}

	vote(choiceNodeId, choiceId) {
		const data = {
			'_id': choiceNodeId,
			'vote': choiceId
		};
		return this.core.post(`/api/anonkun/voteChapter`, { data });
	}

	removeVote(choiceNodeId, choiceId) {
		const data = {
			'_id': choiceNodeId,
			'vote': choiceId
		};
		return this.core.delete(`/api/anonkun/voteChapter`, { data });
	}

	writeInChoice(choiceNodeId, value, storyId) {
		const data = {
			'value': value,
			'_id': choiceNodeId
		};
		if (storyId) {
			// Site does this but omitting it seems to work anyway
			data['r'] = [storyId];
		}
		return this.core.post(`/api/anonkun/customChoice`, { data });
	}

	openChoice(choiceNodeId) {
		return this._openNode(choiceNodeId);
	}

	closeChoice(choiceNodeId) {
		return this._closeNode(choiceNodeId);
	}

	writeInReaderPost(readerPostId, value, storyId) {
		const data = {
			'value': value,
			'_id': readerPostId
		};
		if (storyId) {
			// Site does this but omitting it seems to work anyway
			data['r'] = [storyId];
		}
		return this.core.post(`/api/anonkun/readerPost`, { data });
	}

	openReaderPost(readerPostNodeId) {
		return this._openNode(readerPostNodeId);
	}

	closeReaderPost(readerPostNodeId) {
		return this._closeNode(readerPostNodeId);
	}

	ban(storyId, chatNodeId) {
		const data = {
			blockFor: chatNodeId,
			blockFrom: storyId
		};
		return this.core.post(`/api/anonkun/ban`, { data, json: false });
	}

	unban(storyId, chatNodeId) {
		const data = {
			blockFor: chatNodeId,
			blockFrom: storyId
		};
		return this.core.delete(`/api/anonkun/ban`, { data, json: false });
	}

	getBans(storyId) {
		return this.core.get(`/api/anonkun/story/bans/${storyId}`);
	}

	deleteChatNodeFromStory(storyId, chatNodeId) {
		// Specific method name because deleting chapters and topic posts behave differently
		const data = {
			deleteFrom: storyId,
			nid: chatNodeId
		};
		return this.core.delete(`/api/anonkun/node`, { data, json: false });
	}

	/**
	 * Returns a list of stories
	 *
	 * @param {string} [board='stories'] - The board to search
	 * @param {?number} [page=1] - Which page of results to fetch, pass in falsey value to fetch multiple pages
	 * @param {Object} [options] - Options to configure filtering and sorting of the stories
	 * @param {Object} [options.contentRating] - Which content rating categories should appear in results
	 * @param {boolean} [options.contentRating.teen=true] - Teen age rating
	 * @param {boolean} [options.contentRating.mature=true] - Mature age rating
	 * @param {boolean} [options.contentRating.nsfw=true] - NSFW
	 * @param {Object} [options.storyStatus] - Which story status categories should appear in the results
	 * @param {boolean} [options.storyStatus.active=true] - On-going stories
	 * @param {boolean} [options.storyStatus.finished=true] - Finished stories
	 * @param {boolean} [options.storyStatus.hiatus=true] - Stories that met an untimely pause
	 * @param {string} [options.sort] - How the results are sorted. Values can be:
	 *   - 'Latest': "Sort by the latest activity in the story, including chat posts"
	 *   - 'UpdatedChapter': "Sort by the latest posted chapter"
	 *   - 'top': "Sort by the most commented stories"
	 *   - 'new': "Show the newest stories"
	 * @param {string} [options.length] - Filter stories by length. Values can be:
	 *   - 'Any': No filtering
	 *   - 'Short': "Less than 5000 words"
	 *   - 'Medium': "More than 5000 words"
	 *   - 'Long': "More than 30000 words"
	 *   - 'Epic': "More than 100000+ words"
	 * @returns {Promise<Object>}
	 */
	getStories(board = 'stories', page = 1, options) {
		const query = _.merge(
			{
				contentRating: {
					teen: true,
					mature: true,
					nsfw: true
				},
				storyStatus: {
					active: true,
					finished: true,
					hiatus: true
				},
				sort: 'Latest',
				length: 'Any'
			},
			options
		);
		if (_.isNumber(page)) {
			return this.core.get(`/api/anonkun/board/${board}/${page}`, { query });
		} else {
			return this.core.get(`/api/anonkun/board/${board}`, { query });
		}
	}

	_openNode(nodeId) {
		const data = {
			'_id': nodeId,
			'update': {
				'$unset': {
					'closed': 1
				}
			}
		};
		return this.core.post(`/api/anonkun/editChapter`, { data, json: false });
	}

	_closeNode(nodeId) {
		const data = {
			'_id': nodeId,
			'update': {
				'$set': {
					'closed': 'closed'
				}
			}
		};
		return this.core.post(`/api/anonkun/editChapter`, { data, json: false });
	}
}

export default Akun;
