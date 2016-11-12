'use strict';

const events = require('events');
const Core = require('./core.js');
const connection = require('./pusherConnection.js');

class ChatClient extends events.EventEmitter {
	constructor(id){
		super();
		this._id = id;
		this._nameChat = `presence-chat-${id}-latest`;
		this._connection = connection;
		this._historyChat = [];

		this.on('message', this._onMessage);
		this.on('chat', this._onChat);

		setImmediate(()=>{
			this._connection.addClient(this);
		}, this);
	}

	destroy(){
		this._connection.removeClient(this);
		this._connection = null;
	}

	get id(){
		return this._id;
	}

	get nameChat(){
		return this._nameChat;
	}

	post(body){
		return this._post(body);
	}

	reply(body, replyId){
		let replyObject;
		let message = this._historyChat.find(message=>{
			return message['_id'] === replyId
		});
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
		this._historyChat.push(data);
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
		console.log(postData);
		return Core.post('api/node', postData);
	}
}

class StoryClient extends ChatClient {
	constructor(id){
		super(id);
		this._nameStory = `anonkun-chapters-${id}`;
		this._historyStory = [];

		this.on('chapter', this._onChapter);
	}

	get nameStory(){
		return this._nameStory;
	}

	post(body){
		let replyObject;
		if (this._historyStory.length) {
			let message = this._historyStory[this._historyStory.length - 1];
			if (message) {
				replyObject = {};
				replyObject['_id'] = message['_id'];
				replyObject['b'] = message['b'];
				replyObject['hide'] = message['hide'];
			}
		}
		return this._post(body, replyObject);
	}

	_onChapter(data){
		this._historyStory.push(data);
	}
}

module.exports.ChatClient = ChatClient;
module.exports.StoryClient = StoryClient;
