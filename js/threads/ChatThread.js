import {ChatNode, ChoiceNode} from '../nodes/index.js';
import BaseThread from './BaseThread.js';

class ChatThread extends BaseThread {
	constructor(akun, nodeData) {
		super(akun, nodeData);
		this._nameChat = `presence-chat-${this._id}-latest`;
	}

	async init() {
		await super.init();
		const chat = await this._akun.get(`/api/chat/${this._id}/latest`);
		for (const nodeData of chat) {
			this._newMessage(nodeData, false);
		}
	}

	_connect() {
		this._akun.connection.subscribe(this._nameChat, this._boundConnectionListener);
		super._connect();
	}

	_disconnect() {
		this._akun.connection.unsubscribe(this._nameChat, this._boundConnectionListener);
		super._disconnect();
	}

	_newMessage(data, notify = true) {
		const nodeType = data['nt'];
		switch (nodeType) {
			case 'chat':
				this._onChat(new ChatNode(data), notify);
				break;
			case 'choice':
				this._onChoice(new ChoiceNode(data), notify);
				break;
			default:
				if (!this._akun.silent) {
					console.warn(new Error(`ChatThread received unrecognised nodeType '${nodeType}':\n${JSON.stringify(data, null, '\t')}`));
				}
		}
	}

	_onChat(node, notify) {
		if (this._isNodeUpdate(node)) {
			this._history.update(node);
			if (notify) {
				this.emit('chatUpdated', node);
			}
		} else {
			this._history.add(node);
			if (notify) {
				this.emit('chat', node);
			}
		}
	}

	_onChoice(node, notify) {
		if (this._isNodeUpdate(node)) {
			this._history.update(node);
			if (notify) {
				this.emit('choiceUpdated', node);
			}
		} else {
			this._history.add(node);
			if (notify) {
				this.emit('choice', node);
			}
		}
	}
}

export default ChatThread;
