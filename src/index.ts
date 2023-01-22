import { Router } from 'itty-router'
import { Provider, dns01 } from './challenge'
import { DnsPlugin, Cloudflare } from './providers/dns';

export interface Env {
	/** Comma-separated domains */
	ALLOWED_DOMAINS: string

	/** Comma-separated IP addresses */
	ALLOWED_IPS?: string;

	/** Comma-separated username/password address pairs in the format username:password */
	BASIC_AUTH?: string;

	CLOUDFLARE_TOKEN: string;
}

enum Mode {
	Default = 'default',
	Raw = 'raw',
}

// message represents the JSON payload
// See https://github.com/go-acme/lego/tree/master/providers/dns/httpreq
interface MessageDefault {
	fqdn: string;
	value: string;
}

// message represents the JSON payload
// See https://github.com/go-acme/lego/tree/master/providers/dns/httpreq
interface MessageRaw {
	domain: string;
	token: string;
	keyauth: string;
}

type MessageIncoming = MessageDefault | MessageRaw
const router = Router()

// Set verification record
router.get('/present', () => jsonResponse(null, { status: 405 }))
router.post('/present', async (request, env: Env, context) => {
	return actionHandler('present', { request, env, context })
})

// Remove verification record
router.get('/cleanup', () => jsonResponse(null, { status: 405 }))
router.post('/cleanup', async (request, env: Env, context) => {
	return actionHandler('cleanup', { request, env, context })
})

// Catch-all
router.all('*', () => jsonResponse(null, { status: 404 }))

async function actionHandler(action: 'present' | 'cleanup', { request, env, context }: { request: Request, env: Env, context: unknown }) {
	let incoming: MessageIncoming
	try {
		incoming = await request.json()
	} catch {
		return jsonResponse(null, { status: 400 })
	}

	// Make sure domain and FQDN from the incoming message are correct
	if ('fqdn' in incoming) {
		incoming.fqdn = dns01.toFQDN(incoming.fqdn)
	}
	if ('domain' in incoming) {
		incoming.domain = dns01.unFQDN(incoming.domain)
	}

	// Check if we've received a message or messageRaw JSON
	// See https://github.com/go-acme/lego/tree/master/providers/dns/httpreq
	let mode: Mode, checkDomain: string
	if (
		('fqdn' in incoming && incoming.fqdn !== '') &&
		('value' in incoming && incoming.value !== '')
	) {
		mode = Mode.Default
		checkDomain = dns01.unFQDN(incoming.fqdn.replace(/^_acme-challenge\./, ''))
		console.debug('Received JSON payload (default mode)', { fqdn: incoming.fqdn, value: incoming.value })
	} else if (
		('domain' in incoming && incoming.domain !== '') && (
			('token' in incoming && incoming.token !== '') ||
			('keyauth' in incoming && incoming.keyauth !== '')
		)
	) {
		mode = Mode.Raw
		checkDomain = incoming.domain
		console.debug('Received JSON payload (raw mode)', { domain: incoming.domain, token: incoming.token, keyAuth: incoming.keyauth })
	} else {
		console.debug('Wrong JSON content', { ...incoming })
		return jsonResponse(null, { status: 400 })
	}

	// Check if we are allowed to requests certificates for this domain
	let allowed = false
	for (const allowedDomain of env.ALLOWED_DOMAINS.split(',')) {
		console.debug('Checking allowed domain', { checkDomain, allowedDomain })
		if (
			// check apex
			checkDomain === allowedDomain ||
			// remove subdomains and check
			checkDomain.split('.', 2)[1].endsWith(allowedDomain)
		) {
			allowed = true
			break
		}
	}

	if (!allowed) {
		console.debug("Requested domain not in allowed-domains", { checkDomain, allowedDomains: env.ALLOWED_DOMAINS })
		return jsonResponse(null, { status: 400 })
	}

	// Check if this provider supports the selected mode
	// We assume that all providers support MODE_RAW (which is lego default)
	if (mode === Mode.Default) {
		const message = incoming as MessageDefault
		const plugin = await getPlugin(env.CLOUDFLARE_TOKEN)

		if (action == 'present') {
			try {
				await plugin.set({
					challenge: {
						dnsZone: 'example.com',
						dnsPrefix: message.fqdn.replace(/\.example\.com\.?$/, ''),
						dnsAuthorization: message.value,
					}
				})
			} catch (err) {
				console.error(err)
				return jsonResponse(null, { status: 500 })
			}
		} else if (action == 'cleanup') {
			try {
				await plugin.remove({
					challenge: {
						dnsZone: 'example.com',
						dnsPrefix: message.fqdn.replace(/\.example\.com\.?$/, ''),
						dnsAuthorization: message.value,
					},
				})
			} catch (err) {
				console.error(err)
				return jsonResponse(null, { status: 500 })
			}
		} else {
			console.error('Wrong action specified', {
				provider: 'cf',
				fqdn: message.fqdn,
				value: message.value,
				mode,
			})
			return jsonResponse(null, { status: 400 })
		}

		console.info('Successfully updated TXT record', {
			provider: 'cf',
			fqdn: message.fqdn,
			value: message.value,
			mode,
		})

		// Send back the original JSON to confirm success
		return jsonResponse(message)
	} /* else if (mode === Mode.Raw) {
		const message = incoming as MessageRaw
		const { fqdn, value } = await dns01.getRecord(message.domain, message.keyauth)
		console.debug('Provider supports requested mode', { provider: 'cf', mode })

		const provider = await getProvider()
		try {
			provider.present(message.domain, message.token, message.keyauth)
		} catch (err) {
			console.error('Failed to update TXT record', {
				provider: 'cf',
				domain: message.domain,
				fqdn,
				token: message.token,
				keyAuth: message.keyauth,
				value,
				mode,
			})
		}

		console.info('Successfully updated TXT record', {
			provider: 'cf',
			domain: message.domain,
			fqdn,
			token: message.token,
			keyAuth: message.keyauth,
			value,
			mode,
		})

		// Send back the original JSON to confirm success
		return jsonResponse(message)
	} */ else {
		console.error('Unknown mode requested', { provider: 'cf', mode })
		return jsonResponse(null, { status: 400 })
	}
}

function jsonResponse(body?: any | null, init?: ResponseInit) {
	if (body !== null) {
		body = JSON.stringify(body)
	}
	if (!init) {
		init = {}
	}
	if (!init.headers) {
		init.headers = {}
	}
	init.headers = {
		'Content-Type': 'application/json',
		...init.headers
	}

	return new Response(body, init)
}

// async function getProvider(): Promise<Provider> {

// }

async function getPlugin(token: string): Promise<DnsPlugin> {
	const plugin = new Cloudflare({
		client: {
			// email: '',
			// key: '',
			token,
		}
	})

	return plugin
}

export default {
	fetch: router.handle // yep, it's this easy.
}