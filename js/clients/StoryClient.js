import History from '../History.js';
import {ChapterNode, ChatNode, ChoiceNode, ReaderPostNode} from '../nodes/index.js';
import ChatClient from './ChatClient.js';

class StoryClient extends ChatClient {
	constructor(akun, nodeData) {
		super(akun, nodeData);
		this._nameMeta = `node-${this._id}`;
		this._nameStory = `anonkun-chapters-${this._id}`;
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

	async init() {
		// Do both in parallel
		await Promise.all([
			super.init(),
			(async () => {
				const story = await this._akun.get(`/api/anonkun/chapters/${this._id}/${this.latestChapter()['ct']}/9999999999999998`);
				for (const nodeData of story) {
					this.newMessage(nodeData, false);
				}
			})()
		]);
	}

	newMetaData(data) {
		this._metaData = data;
	}

	newMessage(data, notify = true) {
		const nodeType = data['nt'];
		switch (nodeType) {
			case 'chat':
				this._onChat(new ChatNode(data), notify);
				break;
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
				throw new Error(`StoryClient received unrecognised nodeType '${nodeType}':\n${data}`);
		}
	}

	latestChapter() {
		const nonAppendices = this._metaData['bm'].filter((chapter) => {
			return !StoryClient._isAppendix(chapter['title']);
		});
		return nonAppendices[nonAppendices.length - 1];
	}

	static _isAppendix(title) {
		return title.startsWith('#special ');
	}

	_onChapter(node, notify) {
		if (this._historyStory.has(node) || !this._historyStory.last() || (this._historyStory.last().createdTime - node.createdTime >= this._newVsEditThreshold)) {
			this._historyStory.update(node);
			if (notify) {
				this.emit('chapterUpdated', node);
			}
		} else {
			this._historyStory.add(node);
			if (notify) {
				this.emit('chapter', node);
			}
		}
	}

	_onChoice(node, notify) {
		if (this._historyStory.has(node) || !this._historyStory.last() || (this._historyStory.last().createdTime - node.createdTime >= this._newVsEditThreshold)) {
			this._historyStory.update(node);
			if (notify) {
				this.emit('choiceUpdated', node);
			}
		} else {
			this._historyStory.add(node);
			if (notify) {
				this.emit('choice', node);
			}
		}
	}

	_onReaderPost(node, notify) {
		if (this._historyStory.has(node) || !this._historyStory.last() || (this._historyStory.last().createdTime - node.createdTime >= this._newVsEditThreshold)) {
			this._historyStory.update(node);
			if (notify) {
				this.emit('readerPostUpdated', node);
			}
		} else {
			this._historyStory.add(node);
			if (notify) {
				this.emit('readerPost', node);
			}
		}
	}

	_post(body, replyObject) {
		const postData = {
			'r': [this._id],
			'nt': 'chat',
			'b': body
		};
		const lastChapterNode = this._historyStory.last();
		if (lastChapterNode) {
			const chapterReplyObject = {};
			chapterReplyObject['_id'] = lastChapterNode.data['_id'];
			chapterReplyObject['b'] = lastChapterNode.data['b'];
			chapterReplyObject['hide'] = true;
			postData['r'].push(chapterReplyObject['_id']);
			postData['ra'] = chapterReplyObject;
		}
		if (replyObject) {
			postData['r'].push(replyObject['_id']);
			postData['ra'] = replyObject;
		}
		return this._akun.core.post('/api/storyChat', postData);
	}
}

export default StoryClient;
