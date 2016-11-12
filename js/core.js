'use strict';

const http = require('http');
const qs = require('qs');

class Core {

	static get(path){
		let options = {
			hostname: Core.hostname,
			path: Core._validatePath(path),
			method: 'GET',
			headers: {
				'Cookie': Core.cookie
			}
		};
		return Core._request(options);
	}

	static post(path, postData){
		let postDataString = Core._encodeURLFormData(postData);
		let options = {
			hostname: Core.hostname,
			path: Core._validatePath(path),
			method: 'POST',
			headers: {
				'Cookie': Core.cookie,
				'Content-Type': 'application/x-www-form-urlencoded',
				'Content-Length': Buffer.byteLength(postDataString)
			}
		};
		return Core._request(options, postDataString);
	}

	static _validatePath(path){
		if (path.charAt(0) !== '/') {
			return '/' + path;
		} else {
			return path;
		}
	}

	static _request(options, postDataString){
		return new Promise((resolve, reject)=>{
			let request = http.request(options, response=>{
				var str = '';

				response.on('data', chunk=>{
					str += chunk;
				});

				response.on('end', ()=>{
					resolve(str);
				});
			});

			request.on('error', err=>reject);
			if (postDataString) {
				request.write(postDataString);
			}
			request.end();
		});
	}

	static _encodeURLFormData(input){
		return qs.stringify(input, {arrayFormat: 'brackets'});
	}
}

Core.hostname = '';
Core.cookie = '';

module.exports = Core;
