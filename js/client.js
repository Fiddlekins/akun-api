'use strict';

const events = require('events');
const History = require('./history.js');

class ChatClient extends events.EventEmitter {
	constructor(akun, id){
		super();
		this._akun = akun;
		this._id = id;
		this._nameChat = `presence-chat-${id}-latest`;
		this._historyChat = new History();

		this.on('message', this._onMessage);
		this.on('chat', this._onChat);

		setImmediate(()=>{
			this._akun.connection.addClient(this);
		}, this);
	}

	destroy(){
		this._akun.connection.removeClient(this);
		this._akun.clients.delete(this._id);
		this._akun = null;
	}

	get id(){
		return this._id;
	}

	get nameChat(){
		return this._nameChat;
	}

	get historyChat(){
		return this._historyChat;
	}

	refreshConnection(){
		this._akun.connection.addClient(this);
	}

	post(body){
		return this._post(body);
	}

	reply(body, replyId){
		let replyObject;
		let message = this._historyChat.get(replyId);
		// TODO if not found in own chat make a get request to grab the message data from akun
		if (message) {
			replyObject = {};
			replyObject['_id'] = message['_id'];
			replyObject['b'] = message['b'];
			replyObject['hide'] = message['hide'];
		}
		return this._post(body, replyObject);
	}

	_onMessage(data){
		let eventType = data['nt'];
		this.emit(eventType, data);
	}

	_onChat(data){
		if (this._historyChat.has(data)) {
			this._historyChat.update(data);
		} else {
			this._historyChat.add(data);
		}
	}

	_post(body, replyObject){
		let postData = {
			'r': [this._id],
			'nt': 'chat',
			'b': body
		};
		if (replyObject) {
			postData['r'].push(replyObject['_id']);
			postData['ra'] = replyObject;
		}
		return this._akun.core.post('api/node', postData);
	}
}

class StoryClient extends ChatClient {
	constructor(id){
		super(id);
		this._nameStory = `anonkun-chapters-${id}`;
		this._historyStory = new History();

		this.on('chapter', this._onChapter);
	}

	get nameStory(){
		return this._nameStory;
	}

	get historyStory(){
		return this._historyStory;
	}

	post(body){
		let replyObject;
		if (this._historyStory.size) {
			let message = this._historyStory.last();
			if (message) {
				replyObject = {};
				replyObject['_id'] = message['_id'];
				replyObject['b'] = message['b'];
				replyObject['hide'] = true;
			}
		}
		return this._post(body, replyObject);
	}

	_onChapter(data){
		if (this._historyStory.has(data)) {
			this._historyStory.update(data);
		} else {
			this._historyStory.add(data);
		}
	}
}

module.exports.ChatClient = ChatClient;
module.exports.StoryClient = StoryClient;
