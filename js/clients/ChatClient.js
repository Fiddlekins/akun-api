import {ChatThread} from '../threads/index.js';

class ChatClient {
	constructor(akun, nodeData) {
		this._akun = akun;
		this._id = nodeData['_id'];
		this._chatThread = new ChatThread(akun, nodeData);
	}

	get id() {
		return this._id;
	}

	get chatThread() {
		return this._chatThread;
	}

	init() {
		return this._chatThread.init();
	}

	destroy() {
		this._chatThread.destroy();
		this._akun.clients.delete(this._id);
	}

	postChat(body, replyObject) {
		const data = {
			'r': [this._id],
			'nt': 'chat',
			'b': body
		};
		if (replyObject) {
			data['r'].push(replyObject['_id']);
			data['ra'] = replyObject;
		}
		return this._akun.core.post('/api/node', { data });
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

	postChoice() {
	}
}

export default ChatClient;
