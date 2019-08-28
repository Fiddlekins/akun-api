import events from 'events';
import History from '../History.js';
import {ChatNode} from '../nodes/index.js';

class ChatClient extends events.EventEmitter {
	constructor(akun, id) {
		super();
		this._akun = akun;
		this._id = id;
		this._nameChat = `presence-chat-${id}-latest`;
		this._historyChat = new History();
		this._usersCount = null;
	}

	destroy() {
		if (this._akun.connection) {
			this._akun.connection.removeClient(this);
		}
		this._akun.clients.delete(this._id);
		this._akun = null;
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

	reply(body, replyId) {
		let replyObject;
		const replyNode = this._historyChat.get(replyId);
		// TODO if not found in own chat make a get request to grab the message data from akun
		if (replyNode) {
			replyObject = {};
			replyObject['_id'] = replyNode.data['_id'];
			replyObject['b'] = replyNode.data['b'];
			replyObject['hide'] = replyNode.data['hide'];
		}
		return this._post(body, replyObject);
	}

	newMessage(data) {
		const nodeType = data['nt'];
		switch (nodeType) {
			case 'chat':
				this._onChat(new ChatNode(data));
				break;
			default:
				throw new Error(`StoryClient received unrecognised nodeType '${nodeType}':\n${data}`);
		}
	}

	updateUsersCount(usersCount) {
		this._usersCount = usersCount;
		this.emit('usersCount', usersCount);
	}

	_onChat(node) {
		if (this._historyChat.has(node)) {
			this._historyChat.update(node);
			this.emit('chatUpdated', node);
		} else {
			this._historyChat.add(node);
			this.emit('chat', node);
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
