import _ from 'lodash';
import {ChatThread, StoryThread} from '../threads/index.js';

class StoryClient {
	constructor(akun, nodeData) {
		this._akun = akun;
		this._id = nodeData['_id'];
		this._storyThread = new StoryThread(akun, nodeData);
		this._chatThread = new ChatThread(akun, nodeData);
	}

	get id() {
		return this._id;
	}

	get storyThread() {
		return this._storyThread;
	}

	get chatThread() {
		return this._chatThread;
	}

	init() {
		return Promise.all([
			this._storyThread.init(),
			this._chatThread.init()
		]);
	}

	destroy() {
		this._storyThread.destroy();
		this._chatThread.destroy();
		this._akun.clients.delete(this._id);
	}

	postChat(body, replyObject) {
		const data = {
			'r': [this._id],
			'nt': 'chat',
			'b': body
		};
		const latestStoryNode = this._storyThread.latestNode(true);
		if (latestStoryNode) {
			data['r'].push(latestStoryNode.data['_id']);
			data['ra'] = {
				'_id': latestStoryNode.data['_id'],
				'b': latestStoryNode.data['b'],
				'hide': true
			};
		}
		if (replyObject) {
			data['r'].push(replyObject['_id']);
			data['ra'] = replyObject;
		}
		return this._akun.core.post('/api/storyChat', { data });
	}

	async reply(body, replyId) {
		let replyObject;
		let replyNode = this._chatThread.history.get(replyId);
		if (!replyNode) {
			replyNode = await this._akun.getNode(replyId);
		}
		if (replyNode) {
			replyObject = {
				'_id': replyNode.data['_id'],
				'b': replyNode.data['b'],
				'hide': replyNode.data['hide']
			};
			replyObject['_id'] = replyNode.data['_id'];
			replyObject['b'] = replyNode.data['b'];
			replyObject['hide'] = replyNode.data['hide'];
		}
		return this.postChat(body, replyObject);
	}

	postChapter(body) {
		const data = {
			'sid': this._id,
			'nt': 'chapter',
			'b': body
		};
		return Promise.all([
			this._akun.core.post('/api/anonkun/chapter', { data }),
			this._postPostsAChapter()
		]);
	}

	postChoice(config, inStory = true) {
		const { choices, custom, multiple } = config;
		const data = {
			'choices': choices,
			'nt': 'choice',
			'o': choices.length,
			'custom': custom || false,
			'multiple': multiple || false
		};
		if (inStory) {
			data['sid'] = this._id;
			return Promise.all([
				this._akun.core.post('/api/anonkun/chapter', { data }),
				this._postPostsAChapter()
			]);
		} else {
			return this._akun.core.post('/api/node', { data });
		}
	}

	postReaderChoice() {
		const data = {
			'nt': 'readerPost',
			'sid': this._id
		};
		return this._akun.core.post('/api/anonkun/chapter', { data });
	}

	async publish(safe = true) {
		// Safe mode ensures the metaData isn't stale by fetching the current from the server
		const data = safe ? await this._akun.getNodeData(this._id) : _.cloneDeep(this._storyThread.metaData);
		data['init'] = false;
		data['trash'] = false;
		return this._akun.put('/api/node', { data });
	}

	async unpublish(safe = true) {
		// Safe mode ensures the metaData isn't stale by fetching the current from the server
		const data = safe ? await this._akun.getNodeData(this._id) : _.cloneDeep(this._storyThread.metaData);
		data['trash'] = true;
		return this._akun.put('/api/node', { data });
	}

	_postPostsAChapter() {
		const data = {
			'r': [this._id],
			'nt': 'chat',
			'pac': true,
			'b': 'posts a chapter'
		};
		return this._akun.core.post('/api/node', { data });
	}
}

export default StoryClient;
