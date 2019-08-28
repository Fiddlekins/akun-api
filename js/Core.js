import https from 'https';
import qs from 'qs';
import Cookie from './Cookie.js';

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

	async login(username, password) {
		const res = await this.post('/api/login', {
			'user': username,
			'password': password
		});
		if (res['err']) {
			throw new Error(res['err']);
		}
		this._user = res;
		this._cookie.set('ajs_user_id', `"${res['_id']}"`);
		this._cookie.set('loginToken', JSON.stringify({
			'loginToken': res['token'],
			'userId': res['_id']
		}));
		return res;
	}

	logout() {
		this._cookie = new Cookie();
	}

	get(path, json = true) {
		const options = {
			hostname: this._hostname,
			path,
			method: 'GET'
		};
		return this._request(options, null, json);
	}

	post(path, postData, json = true) {
		const postDataString = qs.stringify(postData, { arrayFormat: 'brackets' });
		const options = {
			hostname: this._hostname,
			path,
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'content-length': Buffer.byteLength(postDataString)
			}
		};
		return this._request(options, postDataString, json);
	}

	put(path, putData, json = true) {
		const putDataString = JSON.stringify(putData);
		const options = {
			hostname: this._hostname,
			path,
			method: 'PUT',
			headers: {
				'content-type': 'application/json; charset=UTF-8',
				'content-length': Buffer.byteLength(putDataString)
			}
		};
		return this._request(options, putDataString, json);
	}

	_request(options, postDataString, json = false) {
		this._addCookie(options);
		// console.log(options);
		// console.log(postDataString);
		return new Promise((resolve, reject) => {
			const request = https.request(options, response => {
				let str = '';

				response.on('data', chunk => {
					str += chunk;
				});

				response.on('end', () => {
					if (response.headers['set-cookie']) {
						response.headers['set-cookie'].forEach(cookie => {
							this._cookie.add(cookie);
						});
					}
					// console.log(response.statusCode);
					// console.log(response.statusMessage);
					if (json) {
						try {
							resolve(JSON.parse(str));
						} catch (err) {
							const errorMessage = `akun-api unable to parse response for request '${options.path}':
Response:
${str}

Called with:
${JSON.stringify(options, null, '\t')}
${postDataString}`;
							reject(new Error(errorMessage));
						}
					} else {
						resolve(str);
					}
				});
			});

			request.on('error', reject);

			if (postDataString) {
				request.write(postDataString);
			}
			request.end();
		});
	}

	_addCookie(options) {
		const cookie = this._cookie.serialize();
		if (cookie.length) {
			options.headers = options.headers || {};
			options.headers['cookie'] = cookie;
		}
	}
}

export default Core;
