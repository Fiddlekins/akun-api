import http from 'http';
import https from 'https';
import qs from 'qs';
import Cookie from './Cookie.js';

class Core {
	constructor({ protocol, hostname }) {
		this._protocol = protocol || 'https:';
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
		const pageString = await this.get('', { json: false });
		const data = this._extractDataFromPage(pageString);
		this._siteSettings = data.settings;
		this._currentUser = data.currentUser;
		this._siteVersion = data.version;
	}

	async login(username, password) {
		const data = {
			'user': username,
			'password': password
		};
		const res = await this.post('/api/login', { data });
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
		await this.put('/api/user', { data: settings, json: false });
	}

	get(path, options) {
		const { json, query } = {
			json: true,
			query: '',
			...options
		};
		const requestOptions = {
			hostname: this._hostname,
			path: query ? `${path}?${new URLSearchParams(qs.stringify(query, { arrayFormat: 'brackets' })).toString()}` : path,
			method: 'GET'
		};
		return this._request(requestOptions, { json });
	}

	post(path, options) {
		const { json, data } = {
			json: true,
			data: undefined,
			...options
		};
		const body = qs.stringify(data, { arrayFormat: 'brackets' });
		const requestOptions = {
			hostname: this._hostname,
			path,
			method: 'POST',
			headers: {
				'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'content-length': Buffer.byteLength(body)
			}
		};
		return this._request(requestOptions, { json, body });
	}

	delete(path, options) {
		const { json, data } = {
			json: true,
			data: undefined,
			...options
		};
		const body = qs.stringify(data, { arrayFormat: 'brackets' });
		const requestOptions = {
			hostname: this._hostname,
			path,
			method: 'DELETE',
			headers: {
				'content-type': 'application/x-www-form-urlencoded; charset=UTF-8',
				'content-length': Buffer.byteLength(body)
			}
		};
		return this._request(requestOptions, { json, body });
	}

	put(path, options) {
		const { json, data } = {
			json: true,
			data: undefined,
			...options
		};
		const body = JSON.stringify(data);
		const requestOptions = {
			hostname: this._hostname,
			path,
			method: 'PUT',
			headers: {
				'content-type': 'application/json; charset=UTF-8',
				'content-length': Buffer.byteLength(body)
			}
		};
		return this._request(requestOptions, { json, body });
	}

	async _request(requestOptions, options) {
		const { json, body } = {
			json: false,
			body: undefined,
			...options
		};
		this._addCookie(requestOptions);
		console.log(requestOptions);
		// console.log(postDataString);
		let requestPromise;
		if (globalThis.fetch) {
			const { hostname, path, method, headers } = requestOptions;
			const url = `${this._protocol}//${hostname}${path}`;
			const init = {
				method,
				credentials: 'include'
			};
			if (headers) {
				init.headers = headers;
			}
			if (body) {
				init.body = body;
			}
			requestPromise = globalThis.fetch(url, init).then((res) => {
				return res.text();
			});
		} else {
			requestPromise = new Promise((resolve, reject) => {
				const request = (this._protocol === 'https:' ? https : http).request(requestOptions, response => {
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
						resolve(str);
					});
				});

				request.on('error', reject);

				if (body) {
					request.write(body);
				}
				request.end();
			});
		}
		const responseText = await requestPromise;
		if (json) {
			try {
				return JSON.parse(responseText);
			} catch (err) {
				const errorMessage = `akun-api unable to parse response for request '${requestOptions.path}':
Response:
${responseText}

Called with:
${JSON.stringify(requestOptions, null, '\t')}
${body}`;
				throw new Error(errorMessage);
			}
		} else {
			return responseText;
		}
	}

	_addCookie(requestOptions) {
		const cookie = this._cookie.serialize();
		if (cookie.length) {
			requestOptions.headers = requestOptions.headers || {};
			requestOptions.headers['cookie'] = cookie;
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
