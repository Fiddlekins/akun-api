'use strict';

const Core = require('./Core.js');
const PusherConnection = require('./PusherConnection.js');
const ChatClient = require('./Client.js').ChatClient;
const StoryClient = require('./Client.js').StoryClient;

// const Dice = require('./dice.js');

class Akun {
	constructor(settings) {
		this.core = new Core({ hostname: settings.hostname });
		this.connection = new PusherConnection(this);
		this.clients = new Map();
	}

	login(username, password, shouldRefresh) {
		return new Promise((resolve, reject) => {
			this.core.login(username, password).then(response => {
				if (shouldRefresh) {
					this.refreshConnection();
				}
				resolve(response);
			}).catch(reject);
		});
	}

	refreshConnection() {
		this.connection.destroy();
		this.connection = new PusherConnection(this);
		for (let client of this.clients.values()) {
			client.refreshConnection();
		}
	}

	join(id) {
		return new Promise((resolve, reject) => {
			this.getNode(id).then(response => {
				let data;
				try {
					data = JSON.parse(response);
				} catch (err) {
					reject(err);
				}
				let client;
				if (data['nt'] === 'story') {
					client = new StoryClient(this, id);
				} else {
					client = new ChatClient(this, id);
				}
				this.clients.set(id, client);
				resolve(client);
			}).catch(reject);
		});
	}

	getNode(id) {
		return this.core.get(`api/node/${id}`);
	}
}

module.exports = Akun;
