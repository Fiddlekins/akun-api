import cloneDeep from '../cloneDeep.js';
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
		const postData = {
			'r': [this._id],
			'nt': 'chat',
			'b': body
		};
		const latestStoryNode = this._storyThread.latestNode(true);
		if (latestStoryNode) {
			postData['r'].push(latestStoryNode.data['_id']);
			postData['ra'] = {
				'_id': latestStoryNode.data['_id'],
				'b': latestStoryNode.data['b'],
				'hide': true
			};
		}
		if (replyObject) {
			postData['r'].push(replyObject['_id']);
			postData['ra'] = replyObject;
		}
		return this._akun.core.post('/api/storyChat', postData);
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
		const postData = {
			'sid': this._id,
			'nt': 'chapter',
			'b': body
		};
		return Promise.all([
			this._akun.core.post('/api/anonkun/chapter', postData),
			this._postPostsAChapter()
		]);
	}

	postChoice(config, inStory = true) {
		const { choices, custom, multiple } = config;
		const postData = {
			'choices': choices,
			'nt': 'choice',
			'o': choices.length,
			'custom': custom || false,
			'multiple': multiple || false
		};
		if (inStory) {
			postData['sid'] = this._id;
			return Promise.all([
				this._akun.core.post('/api/anonkun/chapter', postData),
				this._postPostsAChapter()
			]);
		} else {
			return this._akun.core.post('/api/node', postData);
		}
	}

	postReaderChoice() {
		return this._akun.core.post('/api/anonkun/chapter', {
			'nt': 'readerPost',
			'sid': this._id
		});
	}

	async publish(safe = true) {
		// Safe mode ensures the metaData isn't stale by fetching the current from the server
		const nodeData = safe ? await this._akun.getNodeData(this._id) : cloneDeep(this._storyThread.metaData);
		nodeData['init'] = false;
		nodeData['trash'] = false;
		return this._akun.put('/api/node', nodeData);
	}

	async unpublish(safe = true) {
		// Safe mode ensures the metaData isn't stale by fetching the current from the server
		const nodeData = safe ? await this._akun.getNodeData(this._id) : cloneDeep(this._storyThread.metaData);
		nodeData['trash'] = true;
		return this._akun.put('/api/node', nodeData);
	}

	_postPostsAChapter() {
		const postData = {
			'r': [this._id],
			'nt': 'chat',
			'pac': true,
			'b': 'posts a chapter'
		};
		return this._akun.core.post('/api/node', postData);
	}
}

export default StoryClient;
