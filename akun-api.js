'use strict';

const Core = require('./js/core.js');
const PusherConnection = require('./js/pusherConnection.js');
const ChatClient = require('./js/client.js').ChatClient;
const StoryClient = require('./js/client.js').StoryClient;

// const Dice = require('./dice.js');

class Akun {
	constructor(){
		this.core = new Core();
		this.connection = new PusherConnection(this);
		this.clients = new Map();
	}

	login(username, password, shouldRefresh){
		return new Promise((resolve, reject)=>{
			this.core.login(username, password).then(response=>{
				if (shouldRefresh) {
					this.refreshConnection();
				}
				resolve(response);
			}).catch(reject);
		});
	}

	refreshConnection(){
		this.connection.destroy();
		this.connection = new PusherConnection(this);
		for (let client of this.clients.values()) {
			client.refreshConnection();
		}
	}

	join(id){
		return new Promise((resolve, reject)=>{
			this.getNode(id).then(response=>{
				let client;
				if (response['nt'] === 'story') {
					client = new StoryClient(this, id);
				} else {
					client = new ChatClient(this, id);
				}
				this.clients.set(id, client);
				resolve(client);
			}).catch(reject);
		});
	}

	getNode(id){
		return this.core.get(`api/node/${id}`);
	}
}

module.exports = Akun;
