/**
 * @file This module handles ACME dns-01 challenges for Cloudflare DNS + LetsEncrypt.
 * @see {@link https://github.com/nodecraft/acme-dns-01-cloudflare}
 */

import Cloudflare from '../../../cloudflare/api';
import { paginate } from '../../../cloudflare/api/paginate';
import { Challenge } from '../challenge';

export default class Provider {
	client: Cloudflare;

	constructor(options: { auth: Cloudflare.AuthObject }) {
		this.client = new Cloudflare(options.auth);
	}

	async set({ challenge }: { challenge: Challenge }) {
		const { zone, fullRecordName } = await this.getZone(challenge)

		await this.client.dnsRecords.add(zone.id, {
			type: 'TXT',
			name: fullRecordName,
			content: challenge.dnsAuthorization,
			ttl: 120,
		});
	}

	async remove({ challenge }: { challenge: Challenge }) {
		const { zone, fullRecordName } = await this.getZone(challenge)

		const records = [];

		for await (const txtRecord of paginate(pagination => this.client.dnsRecords.browse(zone.id, {
			...pagination,
			type: 'TXT',
			name: fullRecordName,
		}))) {
			if (txtRecord.name === fullRecordName) {
				records.push(txtRecord);
			}
		}

		if (records.length === 0) {
			throw new Error(`No TXT records found for ${fullRecordName}`);
		}
		for (const record of records) {
			if (record.name === fullRecordName && record.content === challenge.dnsAuthorization) {
				await this.client.dnsRecords.del(zone.id, record.id);
			}
		}
	}

	private async getZone(challenge: Challenge) {
		const fullRecordName = challenge.dnsPrefix + '.' + challenge.dnsZone;
		const zone = await this.getZoneForDomain(challenge.dnsZone);
		if (!zone) {
			throw new Error(`Could not find a zone for '${fullRecordName}'.`);
		}
		return { zone, fullRecordName }
	}

	async getZoneForDomain(domain: string): Promise<Cloudflare.Response.Zone | null> {
		for await (const zone of paginate(pagination => this.client.zones.browse(pagination))) {
			if (domain === zone.name || domain.endsWith(`.${zone.name}`)) {
				return zone;
			}
		}
		return null;
	}
}
