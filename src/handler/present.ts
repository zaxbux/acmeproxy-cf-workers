import { Env } from '..'
import { Cloudflare } from '../challenge/dns01/provider'
import { Incoming, Mode } from '../incoming'

export async function handler(request: Request, env: Env, { mode, message }: Incoming) {
	// Check if this provider supports the selected mode
	// We assume that all providers support MODE_RAW (which is lego default)
	if (mode === Mode.Default) {
		const plugin = new Cloudflare({ auth: { token: env.CLOUDFLARE_TOKEN } })

		await plugin.set({
			challenge: {
				dnsZone: 'example.com',
				dnsPrefix: message.fqdn.replace(/\.example\.com\.?$/, ''),
				dnsAuthorization: message.value,
			}
		})
	}

	throw new Error()
}