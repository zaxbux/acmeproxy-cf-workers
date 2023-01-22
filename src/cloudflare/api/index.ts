import { Client } from './client';
import { DNSRecords } from './resources/dnsRecords';
import { Zones } from './resources/zones';

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
		| "URI";

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

export default Cloudflare