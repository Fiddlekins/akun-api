import {ChapterNode, ChoiceNode, ReaderPostNode} from '../nodes/index.js';
import BaseThread from './BaseThread.js'

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
			const possibleNodes = this._history.slice(Math.max(this._history.size - bookmarkCount - 1, 0));
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

	_newMessage(data, notify = true) {
		const nodeType = data['nt'];
		switch (nodeType) {
			case 'chapter':
				this._onChapter(new ChapterNode(data), notify);
				break;
			case 'choice':
				this._onChoice(new ChoiceNode(data), notify);
				break;
			case 'readerPost':
				this._onReaderPost(new ReaderPostNode(data), notify);
				break;
			default:
				if (!this._akun.silent) {
					console.warn(new Error(`StoryThread received unrecognised nodeType '${nodeType}':\n${JSON.stringify(data, null, '\t')}`));
				}
		}
	}

	_onChapter(node, notify) {
		if (this._isNodeUpdate(node)) {
			this._history.update(node);
			if (notify) {
				this.emit('chapterUpdated', node);
			}
		} else {
			this._history.add(node);
			if (notify) {
				this.emit('chapter', node);
			}
		}
	}

	_onChoice(node, notify) {
		if (this._isNodeUpdate(node)) {
			this._history.update(node);
			if (notify) {
				this.emit('choiceUpdated', node);
			}
		} else {
			this._history.add(node);
			if (notify) {
				this.emit('choice', node);
			}
		}
	}

	_onReaderPost(node, notify) {
		if (this._isNodeUpdate(node)) {
			this._history.update(node);
			if (notify) {
				this.emit('readerPostUpdated', node);
			}
		} else {
			this._history.add(node);
			if (notify) {
				this.emit('readerPost', node);
			}
		}
	}
}

export default StoryThread;
