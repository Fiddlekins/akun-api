import events from 'events';
import History from '../History.js';
import {ChatNode} from '../nodes/index.js';

class ChatClient extends events.EventEmitter {
	constructor(akun, nodeData) {
		super();
		this._akun = akun;
		this._id = nodeData['_id'];
		this._nameChat = `presence-chat-${this._id}-latest`;
		this._metaData = nodeData; // Realtime connection never updates this so can't really be used in ChatClient, StoryClient is fine though
		this._historyChat = new History();
		this._usersCount = null;
		// No guaranteed way to distinguish new nodes from edited nodes, so instead assume any node with ct over threshold less than latest node is an edit
		this._newVsEditThreshold = 1000 * 10;
	}

	get id() {
		return this._id;
	}

	get nameChat() {
		return this._nameChat;
	}

	get historyChat() {
		return this._historyChat;
	}

	get usersCount() {
		return this._usersCount;
	}

	async init() {
		const chat = await this._akun.get(`/api/chat/${this._id}/latest`);
		for (const nodeData of chat) {
			this.newMessage(nodeData, false);
		}
	}

	destroy() {
		if (this._akun.connection) {
			this._akun.connection.removeClient(this);
		}
		this._akun.clients.delete(this._id);
		this._akun = null;
	}

	connect() {
		if (!this._akun.connection) {
			throw new Error(`Client tried to connect to realtime connection but Akun instance does not have one.`);
		}
		return this._akun.connection.addClient(this);
	}

	refreshConnection() {
		return this.connect();
	}

	post(body) {
		return this._post(body);
	}

	async reply(body, replyId) {
		let replyObject;
		let replyNode = this._historyChat.get(replyId);
		if (!replyNode) {
			const nodeData = await this._akun.getNode(replyId);
			if (!nodeData) {
				throw Error(`Can't find node with id ${replyId} to reply to`);
			}
			this.newMessage(nodeData, false);
			replyNode = this._historyChat.get(replyId);
		}
		if (replyNode) {
			replyObject = {};
			replyObject['_id'] = replyNode.data['_id'];
			replyObject['b'] = replyNode.data['b'];
			replyObject['hide'] = replyNode.data['hide'];
		}
		return this._post(body, replyObject);
	}

	newMessage(data, notify = true) {
		const nodeType = data['nt'];
		switch (nodeType) {
			case 'chat':
				this._onChat(new ChatNode(data), notify);
				break;
			default:
				throw new Error(`Client received unrecognised nodeType '${nodeType}':\n${data}`);
		}
	}

	updateUsersCount(usersCount) {
		this._usersCount = usersCount;
		this.emit('usersCount', usersCount);
	}

	_onChat(node, notify) {
		if (this._historyChat.has(node) || !this._historyChat.last() || (this._historyChat.last().createdTime - node.createdTime >= this._newVsEditThreshold)) {
			this._historyChat.update(node);
			if (notify) {
				this.emit('chatUpdated', node);
			}
		} else {
			this._historyChat.add(node);
			if (notify) {
				this.emit('chat', node);
			}
		}
	}

	_post(body, replyObject) {
		const postData = {
			'r': [this._id],
			'nt': 'chat',
			'b': body
		};
		if (replyObject) {
			postData['r'].push(replyObject['_id']);
			postData['ra'] = replyObject;
		}
		return this._akun.core.post('/api/node', postData);
	}
}

export default ChatClient;
