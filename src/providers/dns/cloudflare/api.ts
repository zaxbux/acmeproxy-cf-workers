declare namespace Cloudflare {
	type RecordTypes =
		| "A"
		| "AAAA"
		| "CNAME"
		| "HTTPS"
		| "TXT"
		| "SRV"
		| "LOC"
		| "MX"
		| "NS"
		| "SPF"
		| "CERT"
		| "DNSKEY"
		| "DS"
		| "NAPTR"
		| "SMIMEA"
		| "SSHFP"
		| "SVCB"
		| "TLSA"
		| "URI read only";

	interface AuthObject {
		email?: string | undefined;
		key?: string | undefined;
		token?: string | undefined;
	}

	interface DnsRecordWithoutPriority {
		type: Exclude<RecordTypes, 'MX' | 'SRV' | 'URI'>;
		name: string;
		content: string;
		ttl: number;
		proxied?: boolean | undefined;
	}

	interface DnsRecordWithPriority {
		type: Extract<RecordTypes, 'MX' | 'URI'>;
		name: string;
		content: string;
		ttl: number;
		proxied?: boolean | undefined;
		priority: number;
	}

	interface SrvDnsRecord {
		type: 'SRV';
		data: {
			name: string;
			service: string;
			proto: string;
			ttl: number;
			proxied?: boolean | undefined;
			priority: number;
			weight: number;
			port: number;
			target: string;
		};
	}

	type DnsRecord = DnsRecordWithPriority | DnsRecordWithoutPriority | SrvDnsRecord;

	interface Response<R = any> {
		errors: {
			code: number;
			message: string;
		}[];
		messages: {
			code: number;
			message: string;
		}[];
		result: R;
		success: boolean;
	}

	interface ResponsePaginated<R = any> extends Response<R> {
		result_info: {
			count: number,
			page: number,
			per_page: number,
			total_count: number
		}
	}

	namespace Response {
		interface DnsRecord {
			comment: string;
			content: string;
			created_on: string;
			data: Record<string, any>;
			id: string;
			locked: boolean,
			meta: {
				auto_added: boolean;
				source: string;
			};
			modified_on: string;
			name: string;
			proxiable: boolean;
			proxied: boolean;
			tags: string[];
			ttl: number;
			type: string;
			zone_id: string;
			zone_name: string;
		}

		interface Zone {
			id: string;
			name: string;
			development_mode: number;
			original_name_servers: string[];
			original_registrar: string;
			original_dnshost: string;
			created_on: string;
			modified_on: string;
			activated_on: string;
			owner: Owner;
			account: Account;
			permissions: string[];
			plan: Plan;
			plan_pending: Plan;
			status: string;
			paused: false;
			type: string;
			name_servers: string[];
		}
	}

	interface Account {
		id: string;
		name: string;
	}

	interface Owner {
		id: string;
		email: string;
		type: string;
	}

	interface Plan {
		id: string;
		name: string;
		price: number;
		currency: string;
		frequency: string;
		legacy_id: string;
		is_subscribed: true;
		can_subscribe: true;
	}
}

export const enum METHOD {
	GET = 'GET',
	POST = 'POST',
	DELETE = 'DELETE',
}

class Cloudflare {
	readonly _client: Client

	constructor(auth: Cloudflare.AuthObject) {
		const opts = {
			email: auth && auth.email,
			key: auth && auth.key,
			token: auth && auth.token,
		}

		this._client = new Client(opts)
	}

	get dnsRecords() {
		return new DNSRecords(this._client)
	}

	get zones() {
		return new Zones(this._client)
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

		const options: RequestInit<RequestInitCfProperties> = {
			//json: opts.json !== false,
			//timeout: opts.timeout || 1e4,
			//retries: opts.retries,
			method: requestMethod,
			headers: {
				//'user-agent': `cloudflare/${pkg.version} node/${process.versions.node}`,
				'Content-Type': opts?.contentType || 'application/json',
				Accept: 'application/json',
			},
		};

		if (isUserServiceKey(key)) {
			options.headers['X-Auth-User-Service-Key'] = key;
		} else if (key) {
			options.headers['X-Auth-Key'] = key;
			options.headers['X-Auth-Email'] = email;
		} else if (token) {
			options.headers['Authorization'] = `Bearer ${token}`;
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

class DNSRecords {
	readonly _client: Client

	constructor(client: Client) {
		this._client = client
	}

	async browse(zone_id: string, params?: {
		match?: 'any' | 'all';
		name?: string;
		order?: 'type' | 'name' | 'content' | 'ttl' | 'proxied';
		page?: number;
		per_page?: number;
		content?: string;
		type?: Cloudflare.RecordTypes;
		proxied?: boolean;
		direction?: 'asc' | 'desc';
	}): Promise<Cloudflare.ResponsePaginated<Cloudflare.Response.DnsRecord[]>> {
		const response = await this._client.request(METHOD.GET, `zones/${zone_id}/dns_records`)

		return await response.json()
	}

	async add(zone_id: string, record: Cloudflare.DnsRecord): Promise<Cloudflare.Response> {
		const response = await this._client.request(METHOD.POST, `zones/${zone_id}/dns_records`, record)

		return await response.json()
	}

	async del(zone_id: string, id: string): Promise<Cloudflare.Response<{ id: string }>> {
		const response = await this._client.request(METHOD.DELETE, `zones/${zone_id}/dns_records/${id}`)

		return await response.json()
	}
}

class Zones {
	readonly _client: Client

	constructor(client: Client) {
		this._client = client
	}

	async browse(params?: {
		match?: 'any' | 'all';
		name?: string;
		'account.name'?: string;
		'account.id'?: string;
		order?: 'name' | 'status' | 'account.name' | 'account.id';
		page?: number;
		per_page?: number;
		status?: 'active' | 'pending' | 'initializing' | 'moved' | 'deleted' | 'deactivated';
		direction?: 'asc' | 'desc';
	}): Promise<Cloudflare.ResponsePaginated<Cloudflare.Response.Zone[]>> {
		const response = await this._client.request(METHOD.GET, `zones`, params)

		return await response.json()
	}

	async* browse_paginate(params?: {
		match?: 'any' | 'all';
		name?: string;
		'account.name'?: string;
		'account.id'?: string;
		order?: 'name' | 'status' | 'account.name' | 'account.id';
		page?: number;
		per_page?: number;
		status?: 'active' | 'pending' | 'initializing' | 'moved' | 'deleted' | 'deactivated';
		direction?: 'asc' | 'desc';
	}): AsyncGenerator<Cloudflare.Response.Zone> {
		for await (const zone of consumePages(async (pagination) => {
			const response = await this._client.request(METHOD.GET, `zones`, {
				...params,
				...pagination,
			})

			return await response.json() as Cloudflare.ResponsePaginated<Cloudflare.Response.Zone[]>
		})) {
			yield zone
		}
	}
}

interface Pagination {
	page: number;
	per_page: number;
}

/* Thanks to https://github.com/buschtoens/le-challenge-cloudflare for this great pagination implementation */
async function* consumePages<R>(loader: ({ per_page, page }: Pagination) => Promise<Cloudflare.ResponsePaginated<R[]>>, pageSize = 10) {
	for (let page = 1, didReadAll = false; !didReadAll; page++) {
		let response;
		try {
			response = await loader({
				per_page: pageSize,
				page,
			});
		} catch (err) {
			// try to pass-through human-friendly Cloudflare API errors
			throw new CloudflareError(response, err)
			//throw formatCloudflareError(err);
		}

		if (response.success) {
			yield* response.result;
		} else {
			throw new CloudflareError(response)
			//const error = new Error('Cloudflare API error.');
			//error.response = response;
			//throw formatCloudflareError(error);
		}

		didReadAll = (page * response.result_info.per_page) >= response.result_info.total_count;
	}
}

export class CloudflareError extends Error {
	readonly response: Cloudflare.Response

	constructor(response: Cloudflare.Response, initial?: unknown) {
		super(initial)
		this.response = response
	}
}

export default Cloudflare