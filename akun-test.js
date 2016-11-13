'use strict';
// This file is intended for examples and testing

const fs = require('fs');
const Akun = require('./index.js');

let credentials = JSON.parse(fs.readFileSync('credentials.json'));

let akun = new Akun();

let storyId = 'vhHhMfskRnNDbxwzo';
let storyClient = akun.join(storyId);

storyClient.then(client=>{

	client.on('chat', chatNode=>{
		console.log(`chat ${chatNode}`);
		// console.log('historyChat', client.historyChat.slice());
		if (chatNode.body === 'peng') {
			console.log('Trying to post');
			client.post('pung').then(response=>{
				console.log(response)
			}).catch(console.error);
		}
		if (chatNode.body === 'login') {

			akun.login(credentials['username'], credentials['password'], true).then(response=>{
				console.log(`Logged in as ${response['username']}!`);
			}).catch(console.error);

		}
		if (chatNode.body === 'reply') {
			client.reply('rooply', chatNode.id);
		}
	});
	client.on('chapter', chapterNode=>{
		console.log(`chapter ${chapterNode}`);
		// console.log('historyStory', client.historyStory.slice());
		if (chapterNode.body === '<p>ping</p>') {
			console.log('Trying to chapter');
			client.post('chapong').then(response=>{
				console.log(response)
			}).catch(console.error);
		}
	});
	client.on('choice', choiceNode=>{
		console.log(`choice ${choiceNode}`);
		// console.log('historyStory', client.historyStory.slice());
	});
	client.on('readerPost', readerPostNode=>{
		console.log(`readerPost ${readerPostNode}`);
		// console.log('historyStory', client.historyStory.slice());
	});
	client.on('subscriptionSucceeded', data=>{
		console.log('subscriptionSucceeded', data);
	});

});

let chatId = 'oWC3WhFDMXqZkAG69';
let chatClient = akun.join(chatId);

chatClient.then(client=>{

	client.on('chat', data=>{
		console.log('chat', data);
		// console.log('historyChat', client.historyChat.slice());
		if (data['b'] === 'peng') {
			console.log('Trying to post');
			client.post('pung').then(response=>{
				console.log(response)
			}).catch(console.error);
		}
	});
	client.on('chapter', data=>{
		console.log('chapter', data);
		// console.log('historyStory', client.historyStory.slice());
		if (data['b'] === 'ping') {
			console.log('Trying to chapter');
			client.post('chapong').then(response=>{
				console.log(response)
			}).catch(console.error);
		}
	});
	client.on('subscriptionSucceeded', data=>{
		console.log('subscriptionSucceeded', data);
	});

});
