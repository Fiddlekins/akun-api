// This file is intended for examples and testing

import fs from 'fs';
import Akun from './index.js';

const credentials = JSON.parse(fs.readFileSync('credentials.json'));

function setTimeoutPromise(duration) {
	return new Promise(res => setTimeout(res, duration));
}

function printObject(object) {
	return JSON.stringify(object, null, '\t');
}

async function onChat(akun, client, chatNode) {
	console.log(`New ChatNode:\n${chatNode}`);
	// console.log('historyChat', client.historyChat.nodes);
	if (chatNode.body === 'peng') {
		console.log('attempting response');
		const res = await client.postChat('pung');
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

async function onChatUpdated(akun, client, chatNode) {
	console.log(`Updated ChatNode:\n${chatNode}`);
}

function onUsersCount(akun, client, usersCount) {
	console.log(`Updated usersCount: ${usersCount}`);
}

async function onChapter(akun, client, chapterNode) {
	console.log(`New ChapterNode:\n${chapterNode}`);
	// console.log('historyStory', client.historyStory.nodes);
	if (chapterNode.body === '<p>ping</p>') {
		console.log('Trying to chapter');
		const res = await client.postChat('chapong');
		console.log(`post response: ${res}`);
	}
}

async function onChapterUpdated(akun, client, chapterNode) {
	console.log(`Updated ChapterNode:\n${chapterNode}`);
}

async function onChoice(akun, client, choiceNode) {
	console.log(`New ChoiceNode:\n${choiceNode}`);
	// console.log('historyStory', client.historyStory.nodes);
}

async function onChoiceUpdated(akun, client, choiceNode) {
	console.log(`Updated ChoiceNode:\n${choiceNode}`);
}

async function onReaderPost(akun, client, readerPostNode) {
	console.log(`New ReaderPostNode:\n${readerPostNode}`);
	// console.log('historyStory', client.historyStory.nodes);
}

async function onReaderPostUpdated(akun, client, readerPostNode) {
	console.log(`Updated ReaderPostNode:\n${readerPostNode}`);
}

async function onSubscriptionSucceeded(data) {
	console.log('subscriptionSucceeded', data);
}

async function testStory(akun, storyId) {
	const client = await akun.join(storyId);

	client.chatThread.on('chat', (node) => {
		onChat(akun, client, node);
	});
	client.chatThread.on('chatUpdated', (node) => {
		onChatUpdated(akun, client, node);
	});
	client.chatThread.on('usersCount', (usersCount) => {
		onUsersCount(akun, client, usersCount);
	});
	client.storyThread.on('chapter', (node) => {
		onChapter(akun, client, node);
	});
	client.storyThread.on('chapterUpdated', (node) => {
		onChapterUpdated(akun, client, node);
	});
	client.storyThread.on('choice', (node) => {
		onChoice(akun, client, node);
	});
	client.storyThread.on('choiceUpdated', (node) => {
		onChoiceUpdated(akun, client, node);
	});
	client.storyThread.on('readerPost', (node) => {
		onReaderPost(akun, client, node);
	});
	client.storyThread.on('readerPostUpdated', (node) => {
		onReaderPostUpdated(akun, client, node);
	});
	client.storyThread.on('subscriptionSucceeded', onSubscriptionSucceeded);

	// const resTestPost1 = await client.postChat('Test post 1');
	// console.log(`post response: ${resTestPost1}`);

	const resLogin = await akun.login(credentials['username'], credentials['password']);
	console.log(`Logged in as ${resLogin['username']}!`);

	// const resTestPost2 = await client.postChat('Test post 2');
	// console.log(`post response: ${resTestPost2}`);

	// console.log(client.latestChapter());
	// client.historyChat.nodes.forEach((node) => {
	// 	console.log(node.toString())
	// });
	// client.historyStory.nodes.forEach((node) => {
	// 	console.log(node.toString())
	// });

	return new Promise(res => {
		client.chatThread.on('chat', (node) => {
			if (node.body === 'exit') {
				res();
			}
		});
	});
}

async function testChat(akun, chatId) {
	const client = await akun.join(chatId);

	client.chatThread.on('chat', (node) => {
		onChat(akun, client, node);
	});
	client.chatThread.on('chatUpdated', (node) => {
		onChatUpdated(akun, client, node);
	});
	client.chatThread.on('choice', (node) => {
		onChoice(akun, client, node);
	});
	client.chatThread.on('choiceUpdated', (node) => {
		onChoiceUpdated(akun, client, node);
	});
	client.chatThread.on('subscriptionSucceeded', onSubscriptionSucceeded);

	// const resTestPost1 = await client.postChat('Test post 1');
	// console.log(`post response: ${resTestPost1}`);

	const resLogin = await akun.login(credentials['username'], credentials['password']);
	console.log(`Logged in as ${resLogin['username']}!`);

	// const resTestPost2 = await client.postChat('Test post 2');
	// console.log(`post response: ${JSON.stringify(resTestPost2, null, '\t')}`);

	return new Promise(res => {
		client.chatThread.on('chat', (node) => {
			if (node.body === 'exit') {
				res();
			}
		});
	});
}

async function testPut(akun, chatId) {
	await akun.login(credentials['username'], credentials['password']);
	const client = await akun.join(chatId);
	const postData = await client.post('Test post');
	const data = await akun.getNode(postData['_id']);
	data.b = 'edited text';
	console.log(await akun.put('/api/node', {data}));
}

async function testAnonToggle(akun, chatId) {
	await akun.login(credentials['username'], credentials['password']);
	const client = await akun.join(chatId);
	await akun.setAnon(true);
	await client.postChat('Test anon post');
	await akun.setAnon(false);
	await client.postChat('Test non-anon post');
}

async function testVote(akun, pollId) {
	await akun.vote(pollId, 0);
	await akun.removeVote(pollId, 0);
}

async function testPost(akun, chatId) {
	const client = await akun.join(chatId);
	await client.postChat('Test post 1');
	// console.log(await client.reply('rooply', 't2KXjRztofE5Z58uE'));
}

async function testBan(akun) {
	let res;
	res = await akun.login(credentials['username'], credentials['password']);
	console.log(res);
	res = await akun.ban('iRoYFFCDCZnB2QvEq', '53zAELYaC8RkkMpcn');
	console.log(res);
	res = await akun.unban('iRoYFFCDCZnB2QvEq', 'B5cqvTk3kMgRNPesr');
	console.log(res);
}

async function testPollOpenClose(akun) {
	await akun.login(credentials['username'], credentials['password']);

	while (true) {
		console.log(await akun.closeChoice('58BfMER3GZg48LbYm'));
		await setTimeoutPromise(1000);
		console.log(await akun.openChoice('58BfMER3GZg48LbYm'));
		await setTimeoutPromise(1000);
	}
}

async function testPollChoiceRemoval(akun) {
	let res;
	res = await akun.login(credentials['username'], credentials['password']);
	console.log(res);
	const client = await akun.join('vhHhMfskRnNDbxwzo');
	client.storyThread.on('choice', (node) => {
		onChoice(akun, client, node);
		for (let choiceId = 0; choiceId < node.choiceValues.length; choiceId++) {
			if (node.choiceValues[choiceId] === 'test') {
				akun.removeChoiceNodeChoice(node.id, choiceId).then(res => console.log(res));
			}
		}
	});
	client.storyThread.on('choiceUpdated', (node) => {
		onChoiceUpdated(akun, client, node);
		for (let choiceId = 0; choiceId < node.choiceValues.length; choiceId++) {
			if (node.choiceValues[choiceId] === 'test') {
				akun.removeChoiceNodeChoice(node.id, choiceId, 'sample reason').then(res => console.log(res));
			}
		}
	});

	return new Promise(res => {
		client.chatThread.on('chat', (node) => {
			if (node.body === 'exit') {
				res();
			}
		});
	});
}

async function testGetStories(akun) {
	const {stories} = await akun.getStories('stories', 1, {sort: 'new'});
	stories.forEach((story, i) => {
		console.log(i, `${story.t} by ${story.u[0].n}`);
	});
}

async function runTests(akun) {
	// await testAnonToggle(akun, 'vhHhMfskRnNDbxwzo');
	// await testPost(akun, 'vhHhMfskRnNDbxwzo');
	await testStory(akun, 'vhHhMfskRnNDbxwzo');
	// await testChat(akun, 'oQ2fkvRS4nxjLfSmA');
	// await testChat(akun, 'oWC3WhFDMXqZkAG69');
	// await testPut(akun, 'vhHhMfskRnNDbxwzo');
	// await testVote(akun, 'TziTddJsppEfr82nh');
	// await testPollOpenClose(akun);
	// await testBan(akun);
	// await testPollChoiceRemoval(akun);
	// await testGetStories(akun);
}

async function setup(withRealtime = true) {
	const settings = {
		hostname: 'fiction.live'
		// silent: true
	};
	if (withRealtime) {
		settings.connection = {
			hostname: 'rt.fiction.live'
		};
	}
	return new Akun(settings);
}

async function teardown(akun) {
	await akun.destroy();
}

(async function run() {
	const akun = await setup(true);
	await runTests(akun).catch(console.error);
	await teardown(akun);
})().catch(console.error);


