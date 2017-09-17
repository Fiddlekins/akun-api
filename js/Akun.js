'use strict';

const Core = require('./Core.js');
const RealTimeConnection = require('./RealTimeConnection.js');
const ChatClient = require('./Client.js').ChatClient;
const StoryClient = require('./Client.js').StoryClient;

// const Dice = require('./dice.js');

class Akun {
	constructor(settings) {
		this._settings = settings;
		this.core = new Core({ hostname: settings.hostname });
		this.connection = new RealTimeConnection(this, this._settings.connection);
		this.clients = new Map();
	}

	login(username, password, shouldRefresh) {
		return this.core.login(username, password).then(response => {
			if (shouldRefresh) {
				this.refreshConnection();
			}
			return response;
		});
	}

	refreshConnection() {
		this.connection.destroy();
		this.connection = new RealTimeConnection(this, this._settings.connection);
		for (let client of this.clients.values()) {
			client.refreshConnection();
		}
	}

	join(id) {
		return this.getNode(id).then(response => {
			const data = JSON.parse(response);
			let client;
			if (data['nt'] === 'story') {
				client = new StoryClient(this, id);
			} else {
				client = new ChatClient(this, id);
			}
			this.clients.set(id, client);
			client.connect();
			return client;
		});
	}

	getNode(id) {
		return this.core.get(`api/node/${id}`);
	}
}

module.exports = Akun;
