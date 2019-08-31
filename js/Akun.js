import Core from './Core.js';
import RealTimeConnection from './RealTimeConnection.js';
import {ChatClient, StoryClient} from './clients/index.js';

class Akun {
	constructor(settings) {
		this._settings = settings;
		this.core = new Core({ hostname: settings.hostname });
		if (this._settings.connection) {
			this.connection = new RealTimeConnection(this, this._settings.connection);
		}
		this.clients = new Map();
	}

	destroy() {
		this.connection.destroy();
		this.clients.forEach(client => client.destroy());
	}

	get loggedIn() {
		return this.core.loggedIn;
	}

	async login(username, password, shouldRefresh = true) {
		const res = await this.core.login(username, password);
		if (shouldRefresh) {
			this.refreshConnection();
		}
		return res;
	}

	async logout(shouldRefresh = true) {
		this.core.logout();
		if (shouldRefresh) {
			this.refreshConnection();
		}
	}

	refreshConnection() {
		if (this.connection) {
			this.connection.destroy();
		}
		this.connection = new RealTimeConnection(this, this._settings.connection);
		this.clients.forEach(client => client.refreshConnection());
	}

	async join(id) {
		const nodeData = await this.getNode(id);
		const nodeType = nodeData['nt'];
		let client;
		switch (nodeType) {
			case 'story':
				client = new StoryClient(this, id);
				break;
			case 'chat':
				client = new ChatClient(this, id);
				break;
			case 'post':
				client = new ChatClient(this, id);
				break;
			default:
				throw new Error(`Join request to unrecognised nodeType '${nodeType}':\n${nodeData}`);
		}
		this.clients.set(id, client);
		await client.connect();
		return client;
	}

	get(...args) {
		return this.core.get(...args);
	}

	post(...args) {
		return this.core.post(...args);
	}

	put(...args) {
		return this.core.put(...args);
	}

	getNode(id) {
		return this.core.get(`/api/node/${id}`);
	}

	async setAnon(postAsAnon = true) {
		if (!this.loggedIn) {
			throw new Error(`Tried to set anon mode whilst not logged into an account`);
		}
		this.core.profileSettings.asAnon = postAsAnon;
		await this.core.updateProfileSettings(this.core.profileSettings);
	}
}

export default Akun;
