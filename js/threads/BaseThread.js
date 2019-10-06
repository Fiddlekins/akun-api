import events from 'events';
import History from '../History.js';

class BaseThread extends events.EventEmitter {
	constructor(akun, nodeData) {
		super();
		this._akun = akun;
		this._id = nodeData['_id'];
		this._metaData = nodeData; // Realtime connection never updates this so can't really be used in ChatThread, StoryThread is fine though
		this._history = new History();
		this._usersCount = null;
		// No guaranteed way to distinguish new nodes from edited nodes, so instead assume any node with ct over threshold less than latest node is an edit
		this._newVsEditThreshold = 1000 * 10;
		this._connected = false;
		this._boundConnectionListener = this._connectionListener.bind(this);
	}

	get id() {
		return this._id;
	}

	get metaData() {
		return this._metaData;
	}

	get history() {
		return this._history;
	}

	get usersCount() {
		return this._usersCount;
	}

	async init() {
		if (this._akun.connection) {
			this.connect();
		}
		// Override by populating history will recent nodes
	}

	destroy() {
		// Check connected flag instead of akun.connection in case that's been changed in the background
		// Need to guarantee that if the thread has subscribed to a connection that it attempts to unsubscribe else it won't ever be caught by garbage collector
		// Attempts to disconnect when akun.connection is falsey will result in errors being thrown, which accurately indicates that things are going wrong
		if (this._connected) {
			this.disconnect();
		}
		this._akun = null;
	}

	connect() {
		if (this._akun.connection) {
			this._connect();
		} else {
			throw new Error(`Thread tried to connect to realtime connection but Akun instance does not have one.`);
		}
	}

	disconnect() {
		if (this._akun.connection) {
			this._disconnect();
		} else {
			throw new Error(`Thread tried to disconnect from realtime connection but Akun instance does not have one.`);
		}
	}

	_connect() {
		// Subscribe to realtime connection channels
		this._connected = true;
	}

	_disconnect() {
		// Unsubscribe from realtime connection channels
		this._connected = false;
	}

	_connectionListener(data) {
		switch (data['event']) {
			case 'changed':
				this._newMetaData(data['message']);
				break;
			case 'childChanged':
				this._newMessage(data['message']);
				break;
			case 'updateUsersCount':
				this._updateUsersCount(data['message']['count']);
				break;
			default:
				throw new Error(`Thread received unrecognised data: ${JSON.stringify(data)}`);
		}
	}

	_newMetaData(data) {
		this._metaData = data;
	}

	_newMessage(data, notify = true) {
		const nodeType = data['nt'];
		switch (nodeType) {
			// Extend with type handlers
			default:
				throw new Error(`BaseThread received unrecognised nodeType '${nodeType}':\n${JSON.stringify(data, null, '\t')}`);
		}
	}

	_updateUsersCount(usersCount) {
		this._usersCount = usersCount;
		this.emit('usersCount', usersCount);
	}

	_isNodeUpdate(node) {
		return this._history.has(node) || !this._history.last() || (this._history.last().createdTime - node.createdTime >= this._newVsEditThreshold);
	}
}

export default BaseThread;
