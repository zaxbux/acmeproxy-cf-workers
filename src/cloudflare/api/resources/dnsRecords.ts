import Cloudflare from '..';
import { Client, Method } from '../client';

export class DNSRecords {
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
		const response = await this._client.request(Method.GET, `zones/${zone_id}/dns_records`)

		return await response.json()
	}

	async add(zone_id: string, record: Cloudflare.DnsRecord): Promise<Cloudflare.Response> {
		const response = await this._client.request(Method.POST, `zones/${zone_id}/dns_records`, record)

		return await response.json()
	}

	async del(zone_id: string, id: string): Promise<Cloudflare.Response<{ id: string }>> {
		const response = await this._client.request(Method.DELETE, `zones/${zone_id}/dns_records/${id}`)

		return await response.json()
	}
}