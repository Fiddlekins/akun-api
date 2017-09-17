'use strict';

const events = require('events');
const History = require('./History.js');
const ChatNode = require('./nodes/ChatNode.js');
const ChapterNode = require('./nodes/ChapterNode.js');
const ChoiceNode = require('./nodes/ChoiceNode.js');
const ReaderPostNode = require('./nodes/ReaderPostNode.js');

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
		let replyNode = this._historyChat.get(replyId);
		// TODO if not found in own chat make a get request to grab the message data from akun
		if (replyNode) {
			replyObject = {};
			replyObject['_id'] = replyNode.data['_id'];
			replyObject['b'] = replyNode.data['b'];
			replyObject['hide'] = replyNode.data['hide'];
		}
		return this._post(body, replyObject);
	}

	_onMessage(data){
		let nodeType = data['nt'];
		let payload;
		switch (nodeType) {
			case 'chat':
				payload = new ChatNode(data);
				break;
			case 'chapter':
				payload = new ChapterNode(data);
				break;
			case 'choice':
				payload = new ChoiceNode(data);
				break;
			case 'readerPost':
				payload = new ReaderPostNode(data);
				break;
			default:
				payload = data;
		}
		this.emit(nodeType, payload);
	}

	_onChat(node){
		if (this._historyChat.has(node)) {
			this._historyChat.update(node);
		} else {
			this._historyChat.add(node);
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
	constructor(akun, id){
		super(akun, id);
		this._nameStory = `anonkun-chapters-${id}`;
		this._historyStory = new History();

		this.on('chapter', this._onChapter);
		this.on('choice', this._onChoice);
		this.on('readerPost', this._onReaderPost);
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
			let replyNode = this._historyStory.last();
			if (replyNode) {
				replyObject = {};
				replyObject['_id'] = replyNode.data['_id'];
				replyObject['b'] = replyNode.data['b'];
				replyObject['hide'] = true;
			}
		}
		return this._post(body, replyObject);
	}

	_onChapter(node){
		if (this._historyStory.has(node)) {
			this._historyStory.update(node);
		} else {
			this._historyStory.add(node);
		}
	}

	_onChoice(node){
		if (this._historyStory.has(node)) {
			this._historyStory.update(node);
		} else {
			this._historyStory.add(node);
		}
	}

	_onReaderPost(node){
		if (this._historyStory.has(node)) {
			this._historyStory.update(node);
		} else {
			this._historyStory.add(node);
		}
	}
}

module.exports.ChatClient = ChatClient;
module.exports.StoryClient = StoryClient;
