import History from '../History.js';
import {ChapterNode, ChatNode, ChoiceNode, ReaderPostNode} from '../nodes/index.js';
import ChatClient from './ChatClient.js';

class StoryClient extends ChatClient {
	constructor(akun, id) {
		super(akun, id);
		this._nameMeta = `node-${id}`;
		this._nameStory = `anonkun-chapters-${id}`;
		this._metaData = null;
		this._historyStory = new History();
	}

	get nameMeta() {
		return this._nameMeta;
	}

	get nameStory() {
		return this._nameStory;
	}

	get historyStory() {
		return this._historyStory;
	}

	get metaData() {
		return this._metaData;
	}

	post(body) {
		let replyObject;
		if (this._historyStory.size) {
			const replyNode = this._historyStory.last();
			if (replyNode) {
				replyObject = {};
				replyObject['_id'] = replyNode.data['_id'];
				replyObject['b'] = replyNode.data['b'];
				replyObject['hide'] = true;
			}
		}
		return this._post(body, replyObject);
	}

	newMetaData(data) {
		this._metaData = data;
	}

	newMessage(data) {
		const nodeType = data['nt'];
		switch (nodeType) {
			case 'chat':
				this._onChat(new ChatNode(data));
				break;
			case 'chapter':
				this._onChapter(new ChapterNode(data));
				break;
			case 'choice':
				this._onChoice(new ChoiceNode(data));
				break;
			case 'readerPost':
				this._onReaderPost(new ReaderPostNode(data));
				break;
			default:
				throw new Error(`StoryClient received unrecognised nodeType '${nodeType}':\n${data}`);
		}
	}

	_onChapter(node) {
		if (this._historyStory.has(node)) {
			this._historyStory.update(node);
			this.emit('chapterUpdated', node);
		} else {
			this._historyStory.add(node);
			this.emit('chapter', node);
		}
	}

	_onChoice(node) {
		if (this._historyStory.has(node)) {
			this._historyStory.update(node);
			this.emit('choiceUpdated', node);
		} else {
			this._historyStory.add(node);
			this.emit('choice', node);
		}
	}

	_onReaderPost(node) {
		if (this._historyStory.has(node)) {
			this._historyStory.update(node);
			this.emit('readerPostUpdated', node);
		} else {
			this._historyStory.add(node);
			this.emit('readerPost', node);
		}
	}
}

export default StoryClient;
