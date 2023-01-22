import { Env } from '..'
import { Cloudflare } from '../challenge/dns01/provider'
import { Incoming, Mode } from '../incoming'

export async function handler(request: Request, env: Env, { mode, message }: Incoming, zone: string) {
	// Check if this provider supports the selected mode
	// We assume that all providers support MODE_RAW (which is lego default)
	if (mode === Mode.Default) {
		const provider = new Cloudflare({ auth: { token: env.CLOUDFLARE_TOKEN } })

		await provider.remove({
			challenge: {
				dnsZone: zone,
				dnsPrefix: message.fqdn.replace(new RegExp(`[.]${zone.replaceAll('.', '[.]')}[.]$`), ''),
				dnsAuthorization: message.value,
			}
		})
	} else {
		throw new Error()
	}
}