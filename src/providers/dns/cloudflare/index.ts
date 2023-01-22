/**
 * @file This module handles ACME dns-01 challenges for Cloudflare DNS + LetsEncrypt.
 * @author Nodecraft <https://github.com/nodecraft>
 * @see {@link https://github.com/nodecraft/acme-dns-01-cloudflare} for original implementation.
 */
/**
 * @license
 * MIT License
 * 
 * Copyright (c) 2019 Nodecraft
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { Challenge, DnsPlugin } from '..';
import Cloudflare from './api';

// async function dnsLookup(name: string, type: string) {
// 	const response = await fetch(`https://cloudflare-dns.com/dns-query?name=${name}&type=${type}&ct=application/dns-json`, {
// 		headers: {
// 			'Accept': 'application/dns-json',
// 		},
// 	});
// 	return await response.json<{
// 		Status: number;
// 		TC: boolean;
// 		RD: boolean;
// 		RA: boolean;
// 		AD: boolean;
// 		CD: boolean;
// 		Question: {
// 			name: string;
// 			type: number;
// 		}[];
// 		Answer?: {
// 			name: string;
// 			type: string;
// 			TTL: number;
// 			data: string;
// 		}[]
// 	}>()
// }

// function formatCloudflareError(err: Error) {
// 	if (!err.response || !err.response.body) {
// 		return err;
// 	}
// 	// maintain Cloudflare API errors, not just a generic HTTPError from `got`
// 	const newErr = err;
// 	newErr.cloudflare_errors = err.response.body.errors;
// 	return newErr;
// }

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
			throw err // formatCloudflareError(err);
		}

		if (response.success) {
			yield* response.result;
		} else {
			// const error = new Error('Cloudflare API error.');
			// error.response = response;
			// throw formatCloudflareError(error);
			console.debug(response)
			throw new Error('Cloudflare API error.')
		}

		didReadAll = (page * response.result_info.per_page) >= response.result_info.total_count;
	}
}

// async function resolveTxt(fqdn: string) {
// 	const records = (await dnsLookup(fqdn, 'txt')).Answer ?? []
// 	return records.map(record => record.data).join(' ');
// }

// function delay(ms: number) {
// 	return new Promise<void>((resolve) => {
// 		setTimeout(() => {
// 			resolve();
// 		}, ms);
// 	});
// }

export interface Options {
	retries?: number;
	verbose?: boolean;
	waitFor?: number;
	verifyPropagation?: boolean;
	propagationDelay?: number;
	client?: Cloudflare.AuthObject;
	email?: string;
	key?: string;
	token?: string;
}

export class Plugin implements DnsPlugin {
	options: Options;
	cfClient: Cloudflare;
	client: Cloudflare.AuthObject;

	constructor(options: Options = {}) {
		this.options = options;
		this.cfClient = new Cloudflare({
			email: options.client && options.client.email || options.email,
			key: options.client && options.client.key || options.key,
			token: options.client && options.client.token || options.token,
		});
		this.client = {
			email: options.client && options.client.email || options.email,
			key: options.client && options.client.key || options.key,
			token: options.client && options.client.token || options.token,
		};
		// this.propagationDelay = options.propagationDelay || 15000; // set propagationDelay for ACME.js
		// if (this.options.verifyPropagation) {
		// 	// if our own propagation is set, like is required for greenlock.js at time of writing, disable use native ACME.js propagation delay to prevent double verification
		// 	this.propagationDelay = 0;
		// }
	}

	async set(args: { challenge: Challenge }) {
		try {
			const fullRecordName = args.challenge.dnsPrefix + '.' + args.challenge.dnsZone;
			const zone = await this.getZoneForDomain(args.challenge.dnsZone);
			if (!zone) {
				throw new Error(`Could not find a zone for '${fullRecordName}'.`);
			}
			// add record
			console.debug(`Setting TXT for ${fullRecordName} with value "${args.challenge.dnsAuthorization}"`)
			const response = await this.cfClient.dnsRecords.add(zone.id, {
				type: 'TXT',
				name: fullRecordName,
				content: args.challenge.dnsAuthorization,
				ttl: 120,
			});
			console.debug('Add DNS Record', response.success)
			// verify propagation
			// if (this.options.verifyPropagation) {
			// 	// wait for one "tick" before attempting to query. This can help prevent the DNS cache from getting polluted with a bad value
			// 	await delay(this.options.waitFor || 10000);
			// 	await Plugin.verifyPropagation(args.challenge, this.options.verbose, this.options.waitFor, this.options.retries);
			// }
			return;
		} catch (err) {
			// if (err instanceof Error) {
			// 	throw formatCloudflareError(err);
			// }
			// throw new Error(err);
			throw err
		}
	}

	async remove(args: { challenge: Challenge }) {
		try {
			const fullRecordName = args.challenge.dnsPrefix + '.' + args.challenge.dnsZone;
			const zone = await this.getZoneForDomain(args.challenge.dnsZone);
			if (!zone) {
				throw new Error(`Could not find a zone for '${fullRecordName}'.`);
			}
			const records = await this.getTxtRecords(zone, fullRecordName);
			if (records.length === 0) {
				throw new Error(`No TXT records found for ${fullRecordName}`);
			}
			for (const record of records) {
				if (record.name === fullRecordName && record.content === args.challenge.dnsAuthorization) {
					console.debug(`Removing TXT for ${fullRecordName} where content is "${args.challenge.dnsAuthorization}"`)
					const response = await this.cfClient.dnsRecords.del(zone.id, record.id);
					console.debug(`Delete DNS Record`, response.success)
				}
			}
			// if (this.options.verifyPropagation) {
			// 	// wait for one "tick" before attempting to query. This can help prevent the DNS cache from getting polluted with a bad value
			// 	await delay(this.options.waitFor || 10000);
			// 	// allow time for deletion to propagate
			// 	await Plugin.verifyPropagation(Object.assign({}, args.challenge, { removed: true }), this.options.verbose);
			// }
			return;
		} catch (err) {
			// if (err instanceof Error) {
			// 	throw formatCloudflareError(err);
			// }
			// throw new Error(err);
			throw err
		}
	}

	/* implemented for testing purposes */
	async get(args: { challenge: Challenge }) {
		try {
			const fullRecordName = args.challenge.dnsPrefix + '.' + args.challenge.dnsZone;
			const zone = await this.getZoneForDomain(fullRecordName);
			if (!zone) {
				throw new Error(`Could not find a zone for '${fullRecordName}'.`);
			}
			const records = await this.getTxtRecords(zone, fullRecordName);
			if (records.length === 0) {
				return null;
			}
			// find the applicable record if multiple
			let foundRecord = null;
			for (const record of records) {
				if (record.name === fullRecordName && record.content === args.challenge.dnsAuthorization) {
					foundRecord = record;
				}
			}
			if (!foundRecord) {
				return null;
			}
			return {
				dnsAuthorization: foundRecord.content,
			};

		} catch {
			// could not get record
			return null;
		}
	}

	async zones() {
		try {
			const zones = [];
			for await (const zone of consumePages(pagination => this.cfClient.zones.browse(pagination))) {
				zones.push(zone.name);
			}
			console.debug('Zones', zones)
			return zones;
		} catch (err) {
			// if (err instanceof Error) {
			// 	throw formatCloudflareError(err);
			// }
			// throw new Error(err);
			throw err
		}
	}

	// static async verifyPropagation(challenge: Challenge, verbose = false, waitFor = 10000, retries = 30) {
	// 	const fullRecordName = challenge.dnsPrefix + '.' + challenge.dnsZone;
	// 	for (let i = 0; i < retries; i++) {
	// 		try {
	// 			const records = await resolveTxt(fullRecordName);
	// 			const verifyCheck = challenge.dnsAuthorization;
	// 			if (challenge.removed === true && records.includes(verifyCheck)) {
	// 				throw new Error(`DNS record deletion not yet propagated for ${fullRecordName}`);
	// 			}
	// 			if (!records.includes(verifyCheck)) {
	// 				if (challenge.removed === true) {
	// 					return;
	// 				}
	// 				throw new Error(`Could not verify DNS for ${fullRecordName}`);
	// 			}
	// 			return;
	// 		} catch (err) {
	// 			if (/* err.code === 'ENODATA' && */ challenge.removed === true) {
	// 				return;
	// 			}
	// 			if (verbose) {
	// 				console.log(`DNS not propagated yet for ${fullRecordName}. Checking again in ${waitFor}ms. (Attempt ${i + 1} / ${retries})`);
	// 			}
	// 			await delay(waitFor);
	// 		}
	// 	}
	// 	throw new Error(`Could not verify challenge for '${fullRecordName}'.`);
	// }

	async getZoneForDomain(domain: string): Promise<Cloudflare.Response.Zone | null> {
		for await (const zone of consumePages(pagination => this.cfClient.zones.browse(pagination))) {
			if (domain === zone.name || domain.endsWith(`.${zone.name}`)) {
				console.debug(`Found zone ${zone.name} for domain ${domain}`)
				return zone;
			}
		}
		/* for await (const zone of this.cfClient.zones.browse_paginate()) {
			if (domain === zone.name || domain.endsWith(`.${zone.name}`)) {
				return zone;
			}
		} */
		return null;
	}

	async getTxtRecords(zone: Cloudflare.Response.Zone, name: string) {
		const records = [];

		for await (const txtRecord of consumePages(pagination => this.cfClient.dnsRecords.browse(zone.id, {
			...pagination,
			type: 'TXT',
			name,
		}))) {
			if (txtRecord.name === name) {
				records.push(txtRecord);
			}
		}

		return records;
	}
}
