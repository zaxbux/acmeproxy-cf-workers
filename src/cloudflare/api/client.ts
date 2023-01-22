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

	async request(requestMethod: string, requestPath: string, data?: any, opts?: { auth?: Cloudflare.AuthObject, contentType?: string }): Promise<Response> {
		let uri = `https://api.cloudflare.com/client/v4/${requestPath}`;
		const key = opts?.auth?.key || this.key;
		const token = opts?.auth?.token || this.token;
		const email = opts?.auth?.email || this.email;

		const options = {
			body: undefined as any,
			method: requestMethod,
			headers: new Headers({
				//'user-agent': `cloudflare/${pkg.version} node/${process.versions.node}`,
				'Content-Type': opts?.contentType || 'application/json',
				Accept: 'application/json',
			}),
		};

		if (isUserServiceKey(key)) {
			options.headers.set('X-Auth-User-Service-Key', key!);
		} else if (key) {
			options.headers.set('X-Auth-Key', key);
			options.headers.set('X-Auth-Email', email!);
		} else if (token) {
			options.headers.set('Authorization', `Bearer ${token}`);
		}

		if (requestMethod === 'GET') {
			const query = new URLSearchParams(data)
			uri = `${uri}?${query.toString()}`
		} else {
			options.body = data;
		}

		if (
			options.body &&
			(isPlainObject(options.body) || Array.isArray(options.body))
		) {
			options.body = JSON.stringify(options.body);
		}

		return fetch(uri, options);
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