// This file is intended for examples and testing

import fs from 'fs';
import Akun from './index.js';

const credentials = JSON.parse(fs.readFileSync('credentials.json'));

function setTimeoutPromise(duration) {
	return new Promise(res => setTimeout(res, duration));
}

async function onChat(akun, client, chatNode) {
	console.log(`New ChatNode:\n${chatNode}`);
	// console.log('historyChat', client.historyChat.slice());
	if (chatNode.body === 'peng') {
		console.log('attempting response');
		const res = await client.post('pung');
		console.log(`post response: ${res}`);
	}
	if (chatNode.body === 'login') {
		const res = await akun.login(credentials['username'], credentials['password']);
		console.log(`Logged in as ${res['username']}!`);
	}
	if (chatNode.body === 'reply') {
		const res = await client.reply('rooply', chatNode.id);
		console.log(`reply response: ${res}`);
	}
}

async function onChatChanged(akun, client, chatNode) {
	console.log(`Updated ChatNode:\n${chatNode}`);
}

async function onChapter(akun, client, chapterNode) {
	console.log(`New ChapterNode:\n${chapterNode}`);
	// console.log('historyStory', client.historyStory.slice());
	if (chapterNode.body === '<p>ping</p>') {
		console.log('Trying to chapter');
		const res = await client.post('chapong');
		console.log(`post response: ${res}`);
	}
}

async function onChapterChanged(akun, client, chapterNode) {
	console.log(`Updated ChapterNode:\n${chapterNode}`);
}

async function onChoice(akun, client, choiceNode) {
	console.log(`New ChoiceNode:\n${choiceNode}`);
	// console.log('historyStory', client.historyStory.slice());
}

async function onChoiceChanged(akun, client, choiceNode) {
	console.log(`Updated ChoiceNode:\n${choiceNode}`);
}

async function onReaderPost(akun, client, readerPostNode) {
	console.log(`New ReaderPostNode:\n${readerPostNode}`);
	// console.log('historyStory', client.historyStory.slice());
}

async function onReaderPostChanged(akun, client, readerPostNode) {
	console.log(`Updated ReaderPostNode:\n${readerPostNode}`);
}

async function onSubscriptionSucceeded(data) {
	console.log('subscriptionSucceeded', data);
}

async function testStory(akun, storyId) {
	const client = await akun.join(storyId);

	client.on('chat', (node) => {
		onChat(akun, client, node);
	});
	client.on('chatChanged', (node) => {
		onChatChanged(akun, client, node);
	});
	client.on('chapter', (node) => {
		onChapter(akun, client, node);
	});
	client.on('chapterChanged', (node) => {
		onChapterChanged(akun, client, node);
	});
	client.on('choice', (node) => {
		onChoice(akun, client, node);
	});
	client.on('choiceChanged', (node) => {
		onChoiceChanged(akun, client, node);
	});
	client.on('readerPost', (node) => {
		onReaderPost(akun, client, node);
	});
	client.on('readerPostChanged', (node) => {
		onReaderPostChanged(akun, client, node);
	});
	client.on('subscriptionSucceeded', onSubscriptionSucceeded);

	// const resTestPost1 = await client.post('Test post 1');
	// console.log(`post response: ${resTestPost1}`);

	const resLogin = await akun.login(credentials['username'], credentials['password']);
	console.log(`Logged in as ${resLogin['username']}!`);

	// const resTestPost2 = await client.post('Test post 2');
	// console.log(`post response: ${resTestPost2}`);

	return new Promise(res => {
		client.on('chat', (node) => {
			if (node.body === 'exit') {
				res();
			}
		});
	})
}

async function testChat(akun, chatId) {
	const client = await akun.join(chatId);

	client.on('chat', (node) => {
		onChat(akun, client, node);
	});
	client.on('chapter', (node) => {
		onChapter(akun, client, node);
	});
	client.on('choice', (node) => {
		onChoice(akun, client, node);
	});
	client.on('readerPost', (node) => {
		onReaderPost(akun, client, node);
	});
	client.on('subscriptionSucceeded', onSubscriptionSucceeded);

	// const resTestPost1 = await client.post('Test post 1');
	// console.log(`post response: ${resTestPost1}`);

	// const resLogin = await akun.login(credentials['username'], credentials['password']);
	// console.log(`Logged in as ${resLogin['username']}!`);

	// const resTestPost2 = await client.post('Test post 2');
	// console.log(`post response: ${resTestPost2}`);

	return new Promise(res => {
		client.on('chat', (node) => {
			if (node.body === 'exit') {
				res();
			}
		});
	})
}

async function testPut(akun, chatId) {
	await akun.login(credentials['username'], credentials['password']);
	const client = await akun.join(chatId);
	const postData = await client.post('Test post');
	const post = await akun.getNode(postData['_id']);
	post.b = 'edited text';
	console.log(await akun.put('/api/node', post));
}

async function testAnonToggle(akun, chatId) {
	await akun.login(credentials['username'], credentials['password']);
	const client = await akun.join(chatId);
	await akun.setAnon(true);
	await client.post('Test anon post');
	await akun.setAnon(false);
	await client.post('Test non-anon post');
}

async function runTests(akun) {
	await testAnonToggle(akun, 'vhHhMfskRnNDbxwzo');
	// await testStory(akun, 'vhHhMfskRnNDbxwzo');
	// await testChat(akun, 'oWC3WhFDMXqZkAG69');
	// await testPut(akun, 'vhHhMfskRnNDbxwzo');
}

async function setup() {
	return new Akun({
		hostname: 'fiction.live',
		connection: {
			hostname: 'rt.fiction.live'
		}
	});
}

async function teardown(akun) {
	await akun.destroy();
}

(async function run() {
	const akun = await setup();
	await runTests(akun).catch(console.error);
	await teardown(akun);
})().catch(console.error);

