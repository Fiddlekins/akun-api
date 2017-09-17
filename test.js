'use strict';
// This file is intended for examples and testing

const fs = require('fs');
const Akun = require('./index.js');

let credentials = JSON.parse(fs.readFileSync('credentials.json'));

let akun = new Akun({
	hostname: 'fiction.live',
	connection: {
		hostname: 'rt.fiction.live'
	}
});

let storyId = 'vhHhMfskRnNDbxwzo';
akun.join(storyId).then(client => {

	client.on('chat', chatNode => {
		console.log(`${chatNode}`);
		// console.log('historyChat', client.historyChat.slice());
		if (chatNode.body === 'peng') {
			client.post('pung').then(response => {
			}).catch(console.error);
		}
		if (chatNode.body === 'login') {

			akun.login(credentials['username'], credentials['password']).then(response => {
				console.log(`Logged in as ${response['username']}!`);
			}).catch(console.error);

		}
		if (chatNode.body === 'reply') {
			client.reply('rooply', chatNode.id);
		}
	});
	client.on('chapter', chapterNode => {
		console.log(`${chapterNode}`);
		// console.log('historyStory', client.historyStory.slice());
		if (chapterNode.body === '<p>ping</p>') {
			console.log('Trying to chapter');
			client.post('chapong').then(response => {
				console.log(response)
			}).catch(console.error);
		}
	});
	client.on('choice', choiceNode => {
		console.log(`${choiceNode}`);
		// console.log('historyStory', client.historyStory.slice());
	});
	client.on('readerPost', readerPostNode => {
		console.log(`${readerPostNode}`);
		// console.log('historyStory', client.historyStory.slice());
	});
	client.on('subscriptionSucceeded', data => {
		console.log('subscriptionSucceeded', data);
	});

}).catch(console.error);

let chatId = 'oWC3WhFDMXqZkAG69';
akun.join(chatId).then(client => {

	client.on('chat', data => {
		console.log('chat', data);
		// console.log('historyChat', client.historyChat.slice());
		if (data['b'] === 'peng') {
			console.log('Trying to post');
			client.post('pung').then(response => {
				console.log(response)
			}).catch(console.error);
		}
	});
	client.on('chapter', data => {
		console.log('chapter', data);
		// console.log('historyStory', client.historyStory.slice());
		if (data['b'] === 'ping') {
			console.log('Trying to chapter');
			client.post('chapong').then(response => {
				console.log(response)
			}).catch(console.error);
		}
	});
	client.on('subscriptionSucceeded', data => {
		console.log('subscriptionSucceeded', data);
	});

}).catch(console.error);
