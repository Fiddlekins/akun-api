class Cookie {
	constructor() {
		this._values = new Map();
		this._string = '';
		this._ignoredKeys = new Set(['expires', 'domain', 'path']);
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

	serialize() {
		return this._string;
	}

	set(key, value) {
		this._values.set(key, value);
		this._serialize();
	}

	add(cookieString) {
		const pairs = cookieString.split(/; */);
		const obj = {};

		for (const pair of pairs) {
			const splitIndex = pair.indexOf('=');
			if (splitIndex < 0) {
				continue;
			}
			const key = pair.slice(0, splitIndex);
			const value = pair.slice(splitIndex + 1).trim(); // Final value might have trailing whitespace
			obj[Cookie._decode(key)] = Cookie._decode(value);
		}

		for (const key in obj) {
			if (obj.hasOwnProperty(key) && !this._ignoredKeys.has(key)) {
				this._values.set(key, obj[key]);
			}
		}

		this._serialize();
	}

	clear() {
		if (globalThis && globalThis.document) {
			for (const [key] of this._values) {
				globalThis.document.cookie = `${Cookie._encode(key)}=; Max-Age=-99999999;`;
			}
		}
		this._values = new Map();
		this._string = '';
	}

	_serialize() {
		const pairStrings = [];
		for (const [key, value] of this._values) {
			const pairString = `${Cookie._encode(key)}=${Cookie._encode(value)}`;
			pairStrings.push(pairString);
			if (globalThis && globalThis.document) {
				globalThis.document.cookie = pairString;
			}
		}
		this._string = pairStrings.join('; ');
	}
}

export default Cookie;
