import https from 'https';
import qs from 'qs';
import Cookie from './Cookie.js';

class Core {
	constructor({ hostname }) {
		this._hostname = hostname;
		this._cookie = new Cookie();
		this._loginData = null;
		this._siteSettings = null;
		this._currentUser = null;
		this._siteVersion = null;
		this._loggedIn = false;
	}

	get hostname() {
		return this._hostname;
	}

	get loginData() {
		return this._loginData;
	}

	get loggedIn() {
		return this._loggedIn;
	}

	get siteSettings() {
		return this._siteSettings;
	}

	get currentUser() {
		return this._currentUser;
	}

	get siteVersion() {
		return this._siteVersion;
	}

	get profileSettings() {
		if (this._loggedIn) {
			if (!this._currentUser.profile) {
				this._currentUser.profile = {};
			}
			return this._currentUser.profile;
		} else {
			return null;
		}
	}

	async updateSiteData() {
		const pageString = await this.get('', false);
		const data = this._extractDataFromPage(pageString);
		this._siteSettings = data.settings;
		this._currentUser = data.currentUser;
		this._siteVersion = data.version;
	}

	async login(username, password) {
		const res = await this.post('/api/login', {
			'user': username,
			'password': password
		});
		if (res['err']) {
			throw new Error(res['err']);
		}
		this._loginData = res;
		this._cookie.set('ajs_user_id', `"${res['_id']}"`);
		this._cookie.set('loginToken', JSON.stringify({
			'loginToken': res['token'],
			'userId': res['_id']
		}));
		await this.updateSiteData();
		this._loggedIn = true;
		return res;
	}

	logout() {
		this._cookie = new Cookie();
		this._loggedIn = false;
	}

	async updateProfileSettings(settings, safe = true) {
		if (!this._loggedIn) {
			throw new Error(`Tried to update profile settings whilst not logged into an account`);
		}
		if (!settings) {
			settings = this._currentUser && this._currentUser.profile;
		}
		if (!settings && safe) {
			throw new Error(`Tried to update profile settings with invalid settings object, prevented as likely to cause account corruption`);
		}
		await this.put('/api/user', settings, false);
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

	delete(path, postData, json = true) {
		const postDataString = qs.stringify(postData, { arrayFormat: 'brackets' });
		const options = {
			hostname: this._hostname,
			path,
			method: 'DELETE',
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

	_extractDataFromPage(pageString) {
		const components = ['<', 'script', '>', 'ty', '=', '([\\s\\S]+?);?', '</script', '>'];
		const re = new RegExp(components.join('\\s*'), 'i');
		const match = pageString.match(re);
		if (!match) {
			throw new Error(`Failed to extract data from page:\n${pageString}`);
		}
		let dataString = match[1];
		try {
			dataString = dataString.replace('settings:', '"settings":');
			dataString = dataString.replace('currentUser:', '"currentUser":');
			dataString = dataString.replace(/version:\s?'([A-z0-9]+)'/, '"version":"$1"');
			return JSON.parse(dataString);
		} catch (err) {
			throw new Error(`Failed to parse extracted data from page:\n${dataString}`);
		}
	}
}

export default Core;
