'use strict';

// const Dice = require('./dice.js');
const Core = require('./js/core.js');

const HOSTNAME = 'anonkun.com';
const COOKIE = '__cfduid=d95fdab71be8cd3017fe3d6796bfed6931473093587; ' +
	'ajs_group_id=null; ' +
	'ajs_anonymous_id=%222cced225-0eea-4026-b2ad-d6ff046b4d51%22; ' +
	'loginToken=%7B%22loginToken%22%3A%22qTANYN89zyFKvyEQf%22%2C%22userId%22%3A%22C8x2fwWvtRvr4CyFm%22%7D; ' +
	'ajs_user_id=%22C8x2fwWvtRvr4CyFm%22';

Core.hostname = HOSTNAME;
Core.cookie = COOKIE;

const ChatClient = require('./js/client.js').ChatClient;
const StoryClient = require('./js/client.js').StoryClient;

class Akun {
// will fill in later
}

module.exports = Akun;

let storyId = 'vhHhMfskRnNDbxwzo';

// let client = new ChatClient(storyId);
// client.on('chat', data=>{
// 	console.log('chat', data);
// 	if (data['b'] === 'ping'){
// 		client.post('pong');
// 	}
// });
// client.on('subscriptionSucceeded', data=>{
// 	console.log('subscriptionSucceeded', data);
// });

// Shitty test code

let story = new StoryClient(storyId);
story.on('chat', data=>{
	console.log('chat', data);
	if (data['b'] === 'peng') {
		console.log('Trying to post');
		story.post('pung').then(response=>{
			console.log(response)
		}).catch(console.error);
	}
});
story.on('chapter', data=>{
	console.log('chapter', data);
	if (data['b'] === 'ping') {
		console.log('Trying to chapter');
		story.post('chapong').then(response=>{
			console.log(response)
		}).catch(console.error);
	}
});
story.on('subscriptionSucceeded', data=>{
	console.log('subscriptionSucceeded', data);
});

