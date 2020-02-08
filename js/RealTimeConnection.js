import WebSocket from 'isomorphic-ws';

class RealTimeConnection {
	constructor(akun, settings) {
		this._akun = akun;
		this._hostname = settings.hostname;
		this._active = false;
		this._connecting = false;
		this._queuedMessages = [];
		this._ws = null;
		this._channelNameToListenersMap = new Map();
		this._cid = 1;

		this._boundOnOpen = this._onOpen.bind(this);
		this._boundOnClose = this._onClose.bind(this);
		this._boundOnError = this._onError.bind(this);
		this._boundOnMessage = this._onMessage.bind(this);

	}

	get active() {
		return this._active;
	}

	destroy() {
		this._active = false;
		this._connecting = false;
		this._close();
		this._akun = null;
	}

	_close() {
		if (this._ws) {
			this._ws.off('open', this._boundOnOpen);
			this._ws.off('close', this._boundOnClose);
			this._ws.off('error', this._boundOnError);
			this._ws.off('message', this._boundOnMessage);
			try {
				this._ws.close();
			} catch (err) {
				console.warn(`Warning: websocket encountered an error whilst closing:\n${err}`)
			}
		}
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

	refresh() {
		this._close();
		this._active = false;
		this._connecting = false;
		this._cid = 1;
		this.connect();
	}

	subscribe(channelName, listener) {
		if (this._channelNameToListenersMap.has(channelName)) {
			this._channelNameToListenersMap.get(channelName).add(listener);
		} else {
			const listeners = new Set();
			listeners.add(listener);
			this._channelNameToListenersMap.set(channelName, listeners);
			this._subscribe(channelName);
		}
	}

	unsubscribe(channelName, listener) {
		if (this._channelNameToListenersMap.has(channelName)) {
			const listeners = this._channelNameToListenersMap.get(channelName);
			listeners.delete(listener);
			if (!listeners.size) {
				this._unsubscribe(channelName);
				this._channelNameToListenersMap.delete(channelName);
			}
		}
	}


	_onOpen() {
		// console.log(`Connection opened!`);
		this._connecting = false;
		this._sendMessage({
			'event': '#handshake',
			'data': {
				'authToken': null
			}
		}, false);
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

	_sendHeartbeat() {
		this._send('#2');
	}

	_onConnectionEstablished(message) {
		this._active = true;
		if (this._akun.loggedIn) {
			this._login();
		}
		this._queuedMessages.forEach(data => this._sendMessage(data));
		this._queuedMessages.length = 0;
		this._channelNameToListenersMap.forEach((listeners, channelName) => {
			this._subscribe(channelName);
		})
	}

	_onPublish(data) {
		const channelName = data['channel'];
		const listeners = this._channelNameToListenersMap.get(channelName);
		listeners.forEach((listener) => {
			listener(data['data']);
		});
	}

	_onDisconnect(data) {
		throw new Error(`Connection disconnected with error code: ${data.code}`);
	}

	_sendMessage(data, queueIfInactive = true) {
		if (this._active || !queueIfInactive) {
			data['cid'] = this._cid;
			this._cid++;
			const dataString = JSON.stringify(data);
			// console.log(`Connection sent message: ${dataString}`);
			this._send(dataString);
		} else {
			this._queuedMessages.push(data);
		}
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

	_subscribe(channelName) {
		this._sendMessage({
			'event': '#subscribe',
			'data': {
				'channel': channelName
			}
		});
	}

	_unsubscribe(channelName) {
		this._sendMessage({
			'event': '#unsubscribe',
			'data': {
				'channel': channelName
			}
		});
	}

	_send(dataString) {
		this._ws.send(dataString);
	}
}

export default RealTimeConnection;
