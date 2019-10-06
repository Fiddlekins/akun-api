import {ChatClient, StoryClient} from './clients/index.js'
import Core from './Core.js';
import {ChapterNode, ChatNode, ChoiceNode, ReaderPostNode} from './nodes/index.js';
import RealTimeConnection from './RealTimeConnection.js';

class Akun {
	constructor(settings) {
		this._settings = settings;
		this.core = new Core({ hostname: settings.hostname });
		if (this._settings.connection) {
			this.connection = new RealTimeConnection(this, this._settings.connection);
		}
		this._clients = new Map();
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
		return this.core.post(`/api/anonkun/board/item`, {
			'nt': 'story',
			'storyStatus': 'active',
			'contentRating': 'teen',
			't': title,
			'mcOff': true,
			'trash': true,
			'init': true
		});
	}

	vote(choiceId, choice) {
		return this.core.post(`/api/anonkun/voteChapter`, {
			'_id': choiceId,
			'vote': choice
		});
	}

	removeVote(choiceId, choice) {
		return this.core.delete(`/api/anonkun/voteChapter`, {
			'_id': choiceId,
			'vote': choice
		});
	}

	writeInChoice(choiceId, value, storyId) {
		const postData = {
			'value': value,
			'_id': choiceId
		};
		if (storyId) {
			// Site does this but omitting it seems to work anyway
			postData['r'] = [storyId];
		}
		return this.core.post(`/api/anonkun/customChoice`, postData);
	}

	openChoice(choiceId) {
		return this._openNode(choiceId);
	}

	closeChoice(choiceId) {
		return this._closeNode(choiceId);
	}

	writeInReaderPost(readerPostId, value, storyId) {
		const postData = {
			'value': value,
			'_id': readerPostId
		};
		if (storyId) {
			// Site does this but omitting it seems to work anyway
			postData['r'] = [storyId];
		}
		return this.core.post(`/api/anonkun/readerPost`, postData);
	}

	openReaderPost(readerPostId) {
		return this._openNode(readerPostId);
	}

	closeReaderPost(readerPostId) {
		return this._closeNode(readerPostId);
	}

	_openNode(nodeId) {
		return this.core.post(`/api/anonkun/editChapter`, {
			'_id': nodeId,
			'update': {
				'$unset': {
					'closed': 1
				}
			}
		}, false);
	}

	_closeNode(nodeId) {
		return this.core.post(`/api/anonkun/editChapter`, {
			'_id': nodeId,
			'update': {
				'$set': {
					'closed': 'closed'
				}
			}
		}, false);
	}
}

export default Akun;
