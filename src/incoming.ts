import { toFQDN, unFQDN } from './challenge/dns01/fqdn';
import { BadRequestException, ForbiddenException } from './exception';

export enum Mode {
	Default = 'default',
	Raw = 'raw',
}

namespace Message {
	// message represents the JSON payload
	// See https://github.com/go-acme/lego/tree/master/providers/dns/httpreq
	export interface Default {
		fqdn: string;
		value: string;
	}

	// message represents the JSON payload
	// See https://github.com/go-acme/lego/tree/master/providers/dns/httpreq
	export interface Raw {
		domain: string;
		token: string;
		keyauth: string;
	}
}

export type Message = Message.Default | Message.Raw

interface IncomingRaw {
	mode: Mode.Raw;
	message: Message.Raw;
	checkDomain: string;
}

interface IncomingDefault {
	mode: Mode.Default;
	message: Message.Default;
	checkDomain: string;
}

export type Incoming = IncomingRaw | IncomingDefault;

export async function getIncoming(request: Request): Promise<Incoming> {
	const message = await request.json<Message>()
	// Check if we've received a message or messageRaw JSON
	// See https://github.com/go-acme/lego/tree/master/providers/dns/httpreq
	if (
		('fqdn' in message && message.fqdn !== '') &&
		('value' in message && message.value !== '')
	) {
		// Make sure domain and FQDN from the incoming message are correct
		message.fqdn = toFQDN(message.fqdn)

		const checkDomain = unFQDN(message.fqdn.replace(/^_acme-challenge\./, ''))

		return { mode: Mode.Default, checkDomain, message }
	}

	if (
		('domain' in message && message.domain !== '') && (
			('token' in message && message.token !== '') ||
			('keyauth' in message && message.keyauth !== '')
		)
	) {

		// Make sure domain and FQDN from the incoming message are correct
		message.domain = unFQDN(message.domain)

		const checkDomain = message.domain

		return { mode: Mode.Raw, checkDomain, message }
	}

	throw new BadRequestException('Invalid JSON')
}

// Check if we are allowed to request certificates for this domain
export async function checkDomain(allowed: string[], domain: string): Promise<boolean> {
	for (const allowedDomain of allowed) {
		if (
			// check apex
			domain === allowedDomain //||
			// remove subdomains and check
			//domain.split('.', 2)[1].endsWith(allowedDomain)
		) {
			return true
		}
	}

	return false
}