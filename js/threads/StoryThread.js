import {ChapterNode, ChoiceNode, Node, ReaderPostNode} from '../nodes/index.js';
import BaseThread from './BaseThread.js'

function isChapter(nodeData) {
	return nodeData['nt'] === 'chapter';
}

function isChoice(nodeData) {
	return nodeData['nt'] === 'choice';
}

function isReaderPost(nodeData) {
	return nodeData['nt'] === 'readerPost';
}

class StoryThread extends BaseThread {
	constructor(akun, nodeData) {
		super(akun, nodeData);
		this._nameMeta = `node-${this._id}`;
		this._nameStory = `anonkun-chapters-${this._id}`;
	}

	static isAppendix(title) {
		return title && title.startsWith('#special ');
	}

	async init() {
		await super.init();
		const latestBookmark = this.latestBookmark();
		const startTime = latestBookmark ? latestBookmark['ct'] : 0;
		const story = await this._akun.get(`/api/anonkun/chapters/${this._id}/${startTime}/9999999999999998`);
		for (const nodeData of story) {
			this._newMessage(nodeData, false);
		}
	}

	latestBookmark() {
		if (this._metaData['bm']) {
			const nonAppendices = this._metaData['bm'].filter((node) => {
				return !StoryThread.isAppendix(node['title']);
			});
			if (nonAppendices.length) {
				return nonAppendices[nonAppendices.length - 1];
			} else {
				return null;
			}
		} else {
			return null;
		}
	}

	latestNode(excludeAppendices = false) {
		if (excludeAppendices) {
			// Assuming all bookmarks are the latest nodes and all are appendices we need to check bookmarkCount + 1 latest nodes to find one that isn't an appendix
			const bookmarkCount = this._metaData['bm'] ? this._metaData['bm'].length : 0;
			if (bookmarkCount === 0) {
				return null;
			}
			const possibleNodes = this._history.nodes.slice(Math.max(this._history.size - bookmarkCount - 1, 0));
			for (let nodeIndex = possibleNodes.length - 1; nodeIndex >= 0; nodeIndex--) {
				const node = possibleNodes[nodeIndex];
				if (!StoryThread.isAppendix(node['title'])) {
					return node;
				}
			}
		} else {
			return this._history.last();
		}
	}

	_connect() {
		this._akun.connection.subscribe(this._nameMeta, this._boundConnectionListener);
		this._akun.connection.subscribe(this._nameStory, this._boundConnectionListener);
		super._connect();
	}

	_disconnect() {
		this._akun.connection.unsubscribe(this._nameMeta, this._boundConnectionListener);
		this._akun.connection.unsubscribe(this._nameStory, this._boundConnectionListener);
		super._disconnect();
	}

	_makeNode(nodeData) {
		switch (true) {
			case isChapter(nodeData):
				return new ChapterNode(nodeData);
			case isChoice(nodeData):
				return new ChoiceNode(nodeData);
			case isReaderPost(nodeData):
				return new ReaderPostNode(nodeData);
			default:
				if (!this._akun.silent) {
					console.warn(new Error(`StoryThread received unrecognised nodeType '${nodeData['nt']}':\n${JSON.stringify(nodeData, null, '\t')}`));
				}
				return new Node(nodeData);
		}
	}

	_notifyNodeChange(node, isUpdate) {
		let event;
		switch (true) {
			case isChapter(node.data):
				event = isUpdate ? 'chapterUpdated' : 'chapter';
				break;
			case isChoice(node.data):
				event = isUpdate ? 'choiceUpdated' : 'choice';
				break;
			case isReaderPost(node.data):
				event = isUpdate ? 'readerPostUpdated' : 'readerPost';
				break;
			default:
				event = isUpdate ? 'unknownUpdated' : 'unknown';
		}
		this.emit(event, node);
	}
}

export default StoryThread;
