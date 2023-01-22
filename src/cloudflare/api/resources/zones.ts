import Cloudflare from '..';
import { Client, Method } from '../client';
import { paginate } from '../paginate';

export class Zones {
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
		const response = await this._client.request(Method.GET, `zones`, params)

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
		for await (const zone of paginate(async (pagination) => {
			const response = await this._client.request(Method.GET, `zones`, {
				...params,
				...pagination,
			})

			return await response.json() as Cloudflare.ResponsePaginated<Cloudflare.Response.Zone[]>
		})) {
			yield zone
		}
	}
}