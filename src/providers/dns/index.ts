export interface DnsPlugin {
	// (optional) initialize your module
	init?: (args: { request: Request }) => Promise<void>

	// return a list of "Zones" or "Apex Domains" (i.e. example.com, NOT foo.example.com)
	zones: (args: { dnsHosts: string[] }) => Promise<string[]>

	// set a TXT record for dnsHost with keyAuthorizationDigest as the value
	set: (args: { challenge: Challenge }) => Promise<void>

	// check that the EXACT a TXT record that was set, exists, and return it
	get: (args: { challenge: Challenge }) => Promise<null | {
		dnsAuthorization: string;
	}>

	// remove the exact TXT record that was set
	remove: (args: { challenge: Challenge }) => Promise<void>
}

interface Request {

}

export interface Challenge {
	dnsZone: string;
	dnsPrefix: string;
	dnsAuthorization: string;
	removed?: boolean;
}

import * as cloudflare from './cloudflare';
export const Cloudflare = cloudflare.Plugin