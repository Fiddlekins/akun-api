import {ChatNode, ChoiceNode, Node} from '../nodes/index.js';
import BaseThread from './BaseThread.js';

function isChat(nodeData) {
	return nodeData['nt'] === 'chat';
}

function isChoice(nodeData) {
	return nodeData['nt'] === 'choice';
}

function isTopic(nodeData) {
	return nodeData['nt'] === 'post';
}

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

	_checkBelongsInHistory(nodeData) {
		switch (true) {
			case isChat(nodeData):
				return true;
			case isChoice(nodeData):
				return true;
			case isTopic(nodeData):
				// TODO handle topic node updates
				return false;
			default:
				if (!this._akun.silent) {
					console.warn(new Error(`ChatThread received unrecognised nodeType '${nodeData['nt']}':\n${JSON.stringify(nodeData, null, '\t')}`));
				}
				return true;
		}
	}

	_makeNode(nodeData) {
		switch (true) {
			case isChat(nodeData):
				return new ChatNode(nodeData);
			case isChoice(nodeData):
				return new ChoiceNode(nodeData);
			default:
				return new Node(nodeData);
		}
	}

	_notifyNodeChange(node, isUpdate) {
		let event;
		switch (true) {
			case isChat(node.data):
				event = isUpdate ? 'chatUpdated' : 'chat';
				break;
			case isChoice(node.data):
				event = isUpdate ? 'choiceUpdated' : 'choice';
				break;
			default:
				event = isUpdate ? 'unknownUpdated' : 'unknown';
		}
		this.emit(event, node);
	}
}

export default ChatThread;
