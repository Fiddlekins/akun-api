'use strict';

const WebSocket = require('ws');

class RealTimeConnection {
	constructor(akun, settings) {
		this._akun = akun;
		this._hostname = settings.hostname;
		this._active = false;
		this._connecting = false;
		this._clients = {};
		this._pendingClients = [];
		this._ws = null;
		this._channelNameToClientIdMap = new Map();
		this._cid = 1;
	}

	destroy() {
		this._active = false;
		this._connecting = false;
		this._ws.close();
		this._akun = null;
	}

	get active() {
		return this._active;
	}

	connect() {
		if (!this._connecting && !this._active) {
			this._connecting = true;
			this._ws = new WebSocket(`wss://${this._hostname}/socketcluster/`);
			this._ws.on('open', this._onOpen.bind(this));
			this._ws.on('close', this._onClose.bind(this));
			this._ws.on('error', this._onError.bind(this));
			this._ws.on('message', this._onMessage.bind(this));
		}
	}

	addClient(client) {
		if (this._active) {
			this._clients[client.id] = client;
			this._subscribeClient(client);
		} else {
			this._pendingClients.push(client);
			this.connect();
		}
	}

	removeClient(client) {
		delete this._clients[client.id];
	}

	_onOpen() {
		console.log(`Connection opened!`);
		this._connecting = false;
		this._sendMessage({
			'event': '#handshake',
			'data': {
				'authToken': null
			}
		});
	}

	_onClose() {
		console.log(`Connection closed.`);
	}

	_onError(err) {
		console.error(`Connection experienced an error: ${err}`);
	}

	_onMessage(rawMessage) {
		switch (rawMessage.charAt(0)) {
			case '#':
				switch (rawMessage) {
					case '#1':
						this._sendHeartbeat();
						break;
					default:
						console.error(`Connection received an unrecognised message: ${rawMessage}`);
				}
				break;
			case '{':
				let message = JSON.parse(rawMessage);
				switch (message['event']) {
					case undefined:
						if (message['rid']) {
							if (message['rid'] === 1) {
								this._onConnectionEstablished(message);
							}
						} else {
							console.error(`Connection received an unrecognised message: ${rawMessage}`);
						}
						break;
					case '#publish':
						this._onPublish(message['data']);
						break;
					case '#disconnect':
						this._onDisconnect(message['data']);
						break;
					default:
						console.error(`Connection received an unrecognised message: ${rawMessage}`);
				}
				break;
			default:
				console.error(`Connection received an unrecognised message: ${rawMessage}`);
		}
	}

	_onConnectionEstablished(message) {
		this._active = true;
		for (const client of this._pendingClients) {
			this.addClient(client);
		}
		this._pendingClients.length = 0;
	}

	_onPublish(data) {
		switch (data['data'] && data['data']['event']) {
			case 'childChanged':
				this._onChildChanged(data);
				break;
			default:
				console.error(`Connection received unrecognised data: ${data}`);
		}
	}

	_onChildChanged(data) {
		let channelName = data['channel'];
		let clientId = this._channelNameToClientIdMap.get(channelName);
		this._clients[clientId].emit('message', data['data']['message']);
	}

	_onDisconnect(data) {
		console.error(`Connection disconnected with error code: ${data.code}`);
	}

	_send(dataString) {
		this._ws.send(dataString);
	}

	_sendMessage(data) {
		data['cid'] = this._cid;
		this._cid++;
		let dataString = JSON.stringify(data);
		console.log(`Connection sent message: ${dataString}`);
		this._send(dataString);
	}

	_sendHeartbeat() {
		this._send('#2');
	}

	_subscribeClient(client) {
		let nameChat = client.nameChat;
		let nameStory = client.nameStory;

		this._channelNameToClientIdMap.set(nameChat, client.id);
		this._subscribe(nameChat);
		if (nameStory) {
			this._channelNameToClientIdMap.set(nameStory, client.id);
			this._subscribe(nameStory);
		}
	}

	_login() {
		this._sendMessage({
			'event': '#login',
			'data': {
				'loginToken': 'figure out where this even comes from at some point when logging in actually makes a difference',
				'userId': ''
			}
		});
	}

	_subscribe(channelName) {
		this._sendMessage({
			'event': '#subscribe',
			'data': {
				'channel': channelName
			}
		});
	}
}

module.exports = RealTimeConnection;
