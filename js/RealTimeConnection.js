import WebSocket from 'ws';

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

		this._boundOnOpen = this._onOpen.bind(this);
		this._boundOnClose = this._onClose.bind(this);
		this._boundOnError = this._onError.bind(this);
		this._boundOnMessage = this._onMessage.bind(this);
	}

	destroy() {
		this._active = false;
		this._connecting = false;
		if (this._ws) {
			this._ws.off('open', this._boundOnOpen);
			this._ws.off('close', this._boundOnClose);
			this._ws.off('error', this._boundOnError);
			this._ws.off('message', this._boundOnMessage);
			this._ws.close();
		}
		this._akun = null;
	}

	get active() {
		return this._active;
	}

	connect() {
		if (!this._connecting && !this._active) {
			this._connecting = true;
			this._ws = new WebSocket(`wss://${this._hostname}/socketcluster/`);
			this._ws.on('open', this._boundOnOpen);
			this._ws.on('close', this._boundOnClose);
			this._ws.on('error', this._boundOnError);
			this._ws.on('message', this._boundOnMessage);
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
		// console.log(`Connection opened!`);
		this._connecting = false;
		this._sendMessage({
			'event': '#handshake',
			'data': {
				'authToken': null
			}
		});
	}

	_onClose() {
		// console.log(`Connection closed.`);
	}

	_onError(err) {
		throw new Error(`Connection experienced an error: ${err}`);
	}

	_onMessage(rawMessage) {
		// console.log(rawMessage);
		switch (rawMessage.charAt(0)) {
			case '#':
				switch (rawMessage) {
					case '#1':
						this._sendHeartbeat();
						break;
					default:
						throw new Error(`Connection received an unrecognised message: ${rawMessage}`);
				}
				break;
			case '{':
				const message = JSON.parse(rawMessage);
				switch (message['event']) {
					case undefined:
						if (message['rid']) {
							if (message['rid'] === 1) {
								this._onConnectionEstablished(message);
							}
						} else {
							throw new Error(`Connection received an unrecognised message: ${rawMessage}`);
						}
						break;
					case '#publish':
						this._onPublish(message['data']);
						break;
					case '#disconnect':
						this._onDisconnect(message['data']);
						break;
					default:
						throw new Error(`Connection received an unrecognised message: ${rawMessage}`);
				}
				break;
			default:
				throw new Error(`Connection received an unrecognised message: ${rawMessage}`);
		}
	}

	_onConnectionEstablished(message) {
		this._active = true;
		this._pendingClients.forEach(client => this.addClient(client));
		this._pendingClients.length = 0;
	}

	_onPublish(data) {
		switch (data['data'] && data['data']['event']) {
			case 'changed':
				this._onChanged(data);
				break;
			case 'childChanged':
				this._onChildChanged(data);
				break;
			case 'updateUsersCount':
				this._onUpdateUsersCount(data);
				break;
			default:
				throw new Error(`Connection received unrecognised data: ${JSON.stringify(data)}`);
		}
	}

	_onChanged(data) {
		const channelName = data['channel'];
		const clientId = this._channelNameToClientIdMap.get(channelName);
		this._clients[clientId].newMetaData(data['data']['message']);
	}

	_onChildChanged(data) {
		const channelName = data['channel'];
		const clientId = this._channelNameToClientIdMap.get(channelName);
		this._clients[clientId].newMessage(data['data']['message']);
	}

	_onUpdateUsersCount(data) {
		const channelName = data['channel'];
		const clientId = this._channelNameToClientIdMap.get(channelName);
		this._clients[clientId].updateUsersCount(data['data']['message']['count']);
	}

	_onDisconnect(data) {
		throw new Error(`Connection disconnected with error code: ${data.code}`);
	}

	_send(dataString) {
		this._ws.send(dataString);
	}

	_sendMessage(data) {
		data['cid'] = this._cid;
		this._cid++;
		const dataString = JSON.stringify(data);
		// console.log(`Connection sent message: ${dataString}`);
		this._send(dataString);
	}

	_sendHeartbeat() {
		this._send('#2');
	}

	_subscribeClient(client) {
		const nameChat = client.nameChat;
		const nameMeta = client.nameMeta;
		const nameStory = client.nameStory;

		this._channelNameToClientIdMap.set(nameChat, client.id);
		this._subscribe(nameChat);
		if (nameMeta) {
			this._channelNameToClientIdMap.set(nameMeta, client.id);
			this._subscribe(nameMeta);
		}
		if (nameStory) {
			this._channelNameToClientIdMap.set(nameStory, client.id);
			this._subscribe(nameStory);
		}
		if (this._akun.loggedIn) {
			this._login();
		}
	}

	_subscribe(channelName) {
		this._sendMessage({
			'event': '#subscribe',
			'data': {
				'channel': channelName
			}
		});
	}

	_login() {
		this._sendMessage({
			'event': '#login',
			'data': {
				'loginToken': this._akun.core.loginData['loginToken'],
				'userId': this._akun.core.loginData['_id']
			}
		});
	}
}

export default RealTimeConnection;
