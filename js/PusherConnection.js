'use strict';

const WebSocket = require('ws');

class PusherConnection {
	constructor(akun){
		this._akun = akun;
		this._active = false;
		this._clients = {};
		this._pusherId = 'undefined';
		this._ws = null;
		this._heartbeatTimeout = null;
		this._boundSendHeartbeat = this._sendHeartbeat.bind(this);
		this._channelNameToClientIdMap = new Map();

		this._akun.core.get('').then(response=>{
			this._pusherId = /"pusher":"([0-9A-z]+)"/.exec(response)[1];
			this._ws = new WebSocket(`wss://ws.pusherapp.com/app/${this._pusherId}?protocol=7&client=js&version=2.2.0&flash=false`);
			this._ws.on('open', this._onOpen.bind(this));
			this._ws.on('close', this._onClose.bind(this));
			this._ws.on('error', this._onError.bind(this));
			this._ws.on('message', this._onMessage.bind(this));
		}).catch(console.error);
	}

	destroy(){
		this._clearHeartbeat();
		this._active = false;
		this._ws.close();
		this._akun = null;
	}

	get active(){
		return this._active;
	}

	addClient(client){
		this._clients[client.id] = client;
		if (this._active) {
			this._subscribeClient(client);
		}
	}

	removeClient(client){
		delete this._clients[client.id];
	}

	_onOpen(){
		console.log(`Pusher Connection opened!`);
	}

	_onClose(){
		console.log(`Pusher Connection closed.`);
	}

	_onError(err){
		console.error(`Pusher Connection experienced an error: ${err}`);
	}

	_onMessage(rawMessage){
		let message = JSON.parse(rawMessage);

		switch (message['event']) {
			case 'pusher:connection_established':
				this._onConnectionEstablished(message);
				break;
			case 'pusher_internal:subscription_succeeded':
				this._onSubscriptionSucceeded(message);
				break;
			case 'pusher:pong':
				console.log(`Pusher Connection received Pong.`);
				break;
			case 'childChanged':
				this._onChildChanged(message);
				break;
			default:
				console.log(`Pusher Connection received an unrecognised message: ${message}`);
		}

		this._resetHeartbeat();
	}

	_onConnectionEstablished(message){
		let data = JSON.parse(message['data']);
		this._socket_id = data['socket_id'];
		this._activity_timeout = data['activity_timeout'] * 1000;
		this._active = true;

		for (let clientId in this._clients) {
			if (this._clients.hasOwnProperty(clientId)) {
				this._subscribeClient(this._clients[clientId]);
			}
		}
	}

	_onSubscriptionSucceeded(message){
		let channelName = message['channel'];
		let clientId = this._channelNameToClientIdMap.get(channelName);
		let data = JSON.parse(message['data']);
		this._clients[clientId].emit('subscriptionSucceeded', data);
	}

	_onChildChanged(message){
		let channelName = message['channel'];
		let clientId = this._channelNameToClientIdMap.get(channelName);
		let data = JSON.parse(message['data']);
		this._clients[clientId].emit('message', data);
	}

	_send(data){
		let dataString = JSON.stringify(data);
		console.log(`Pusher Connection sent message: ${dataString}`);
		this._ws.send(dataString);
	}

	_sendHeartbeat(){
		this._send({
			'event': 'pusher:ping',
			'data': {}
		});
	}

	_resetHeartbeat(){
		this._clearHeartbeat();
		this._heartbeatTimeout = setTimeout(this._boundSendHeartbeat, this._activity_timeout);
	}

	_clearHeartbeat(){
		if (this._heartbeatTimeout) {
			clearTimeout(this._heartbeatTimeout);
		}
	}

	_subscribeClient(client){
		let nameChat = client.nameChat;
		let nameStory = client.nameStory;

		this._channelNameToClientIdMap.set(nameChat, client.id);
		this._subscribe(nameChat);
		if (nameStory) {
			this._channelNameToClientIdMap.set(nameStory, client.id);
			this._subscribe(nameStory);
		}
	}

	_subscribe(channelName){
		this._akun.core.post('pusher/auth', {
			'socket_id': this._socket_id,
			'channel_name': channelName
		}).then(response=>{
			let data = JSON.parse(response);
			this._send({
				'event': 'pusher:subscribe',
				'data': {
					'auth': data['auth'],
					'channel': channelName,
					'channel_data': data['channel_data']
				}
			});
		}).catch(console.error);
	}
}

module.exports = PusherConnection;
