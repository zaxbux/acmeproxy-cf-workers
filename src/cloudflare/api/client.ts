import Cloudflare from '.';

export const enum Method {
	GET = 'GET',
	POST = 'POST',
	DELETE = 'DELETE',
}

export class Client {
	email?: string;
	key?: string;
	token?: string;

	constructor(options: Cloudflare.AuthObject) {
		this.email = options.email;
		this.key = options.key;
		this.token = options.token;
	}

	async request(method: string, requestPath: string, data?: any, opts?: { auth?: Cloudflare.AuthObject, contentType?: string }): Promise<Response> {
		let uri = `https://api.cloudflare.com/client/v4/${requestPath}`;
		const key = opts?.auth?.key || this.key;
		const token = opts?.auth?.token || this.token;
		const email = opts?.auth?.email || this.email;

		const headers: Record<string, string> = {
			//'user-agent': `cloudflare/${pkg.version} node/${process.versions.node}`,
			'Content-Type': opts?.contentType || 'application/json',
			Accept: 'application/json',
		}

		if (isUserServiceKey(key)) {
			headers['X-Auth-User-Service-Key'] = key!
		} else if (key) {
			headers['X-Auth-Key'] = key
			headers['X-Auth-Email'] = email!
		} else if (token) {
			headers['Authorization'] = `Bearer ${token}`
		}

		let body = undefined;

		if (method === 'GET') {
			if (data) {
				const query = new URLSearchParams(data)
				uri = `${uri}?${query.toString()}`
			}
		} else {
			if (data && (isPlainObject(data) || Array.isArray(data))) {
				body = JSON.stringify(data);
			}
		}

		return fetch(uri, {
			body,
			method,
			headers,
		});
	}
}

const isPlainObject = function isPlainObject(x: any) {
	const prototype = Object.getPrototypeOf(x);
	const toString = Object.prototype.toString;

	return (
		toString.call(x) === '[object Object]' &&
		(prototype === null || prototype === Object.getPrototypeOf({}))
	);
};

const isUserServiceKey = function isUserServiceKey(x?: string) {
	return x && x.substring(0, 5) === 'v1.0-';
};