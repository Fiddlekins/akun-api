'use strict';

const https = require('https');
const qs = require('qs');

class Cookie {
	constructor() {
		this._values = new Map();
		this._string = '';
		this._ignoredKeys = new Set(['expires', 'domain', 'path']);
	}

	serialize() {
		return this._string;
	}

	set(key, value) {
		this._values.set(key, value);
		this._serialize();
	}

	add(cookieString) {
		let pairs = cookieString.split(/; */);
		let obj = {};

		for (let pair of pairs) {
			let splitIndex = pair.indexOf('=');
			if (splitIndex < 0) {
				continue;
			}
			let key = pair.slice(0, splitIndex);
			let value = pair.slice(splitIndex + 1).trim(); // Final value might have trailing whitespace
			obj[Cookie._decode(key)] = Cookie._decode(value);
		}

		for (let key in obj) {
			if (obj.hasOwnProperty(key) && !this._ignoredKeys.has(key)) {
				this._values.set(key, obj[key]);
			}
		}

		this._serialize();
	}

	_serialize() {
		let pairStrings = [];
		for (let [key, value] of this._values) {
			pairStrings.push(Cookie._encode(key) + '=' + Cookie._encode(value));
		}
		this._string = pairStrings.join('; ');
	}

	static _encode(value) {
		if (value === undefined) {
			value = '';
		}
		return encodeURIComponent(value);
	}

	static _decode(value) {
		if (value === undefined) {
			value = '';
		}
		return decodeURIComponent(value);
	}
}

class Core {
	constructor({ hostname }) {
		this._hostname = hostname;
		this._cookie = new Cookie();
		this._user = null;
	}

	get hostname() {
		return this._hostname;
	}

	get user() {
		return this._user;
	}

	login(username, password) {
		return this.post('api/login', {
			'user': username,
			'password': password
		}).then(response => {
			let data = JSON.parse(response);
			if (data['err']) {
				throw new Error(data['err']);
			} else {
				this._user = data;
				this._cookie.set('ajs_user_id', `"${data['_id']}"`);
				this._cookie.set('loginToken', JSON.stringify({
					'loginToken': data['token'],
					'userId': data['_id']
				}));
				return data;
			}
		});
	}

	async api(path, postData) {
		let response;
		if (postData) {
			response = await this.post(`api/${path}`, postData);
		} else {
			response = await this.get(`api/${path}`);
		}
		return JSON.parse(response);
	}

	get(path) {
		let options = {
			hostname: this._hostname,
			path: Core._validatePath(path),
			method: 'GET'
		};
		return this._request(options);
	}

	post(path, postData) {
		let postDataString = Core._encodeURLFormData(postData);
		let options = {
			hostname: this._hostname,
			path: Core._validatePath(path),
			method: 'POST',
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(postDataString)
			}
		};
		return this._request(options, postDataString);
	}

	_request(options, postDataString) {
		this._addCookie(options);
		return new Promise((resolve, reject) => {
			let request = https.request(options, response => {
				let str = '';

				response.on('data', chunk => {
					str += chunk;
				});

				response.on('end', () => {
					if (response.headers['set-cookie']) {
						response.headers['set-cookie'].forEach(cookie => {
							this._cookie.add(cookie)
						});
					}
					resolve(str);
				});
			});

			request.on('error', err => reject);

			if (postDataString) {
				request.write(postDataString);
			}
			request.end();
		});
	}

	_addCookie(options) {
		let cookie = this._cookie.serialize();
		if (cookie.length) {
			console.log(`Using cookie: ${cookie}`);
			options.headers = options.headers || {};
			options.headers['Cookie'] = cookie;
		}
	}

	static _validatePath(path) {
		if (path.charAt(0) !== '/') {
			return '/' + path;
		} else {
			return path;
		}
	}

	static _encodeURLFormData(input) {
		return qs.stringify(input, { arrayFormat: 'brackets' });
	}
}

module.exports = Core;
