import { Router } from 'itty-router';
import { basicAuthentication, verifyCredentials } from './authorization';
import { ForbiddenException, NotFoundException, UnauthorizedException, MethodNotAllowedException } from './exception';
import handler from './handler';
import { checkDomain, getIncoming } from './incoming';

export interface Env {
	/** Comma-separated domains */
	//ALLOWED_DOMAINS?: string

	/** Comma-separated IP addresses */
	//ALLOWED_IPS?: string;

	/** Comma-separated username/password address pairs in the format username:password */
	BASIC_AUTH?: string;

	CLOUDFLARE_TOKEN: string;
}

const router = Router()
router.all('/present', (request, env: Env, context) => actionHandler('present', { request: request as unknown as Request, env, context }))
router.all('/cleanup', (request, env: Env, context) => actionHandler('cleanup', { request: request as unknown as Request, env, context }))

// Catch-all
router.all('*', () => { throw new NotFoundException() })

async function actionHandler(action: 'present' | 'cleanup', { request, env, context }: { request: Request, env: Env, context?: unknown }) {
	if (request.method === 'OPTIONS') {
		return new Response(null, {
			status: 204,
			headers: {
				'Allow': 'POST',
				'Accept': 'application/json',
			},
		})
	}

	if (request.method !== 'POST') {
		throw new MethodNotAllowedException()
	}

	let zone = ''
	let domainAuthorized = false;

	const basicAuth = JSON.parse(env.BASIC_AUTH ?? '[]') as {
		host: string,
		zone: string,
		user: string,
		pass: string,
	}[]

	// Get the incoming message, mode, and domain to check
	const incoming = await getIncoming(request)

	// The "Authorization" header is sent when authenticated.
	if (basicAuth.length && request.headers.has('Authorization')) {
		// Throws exception when authorization fails.
		await verifyCredentials(basicAuthentication(request), async (credentials) => {
			let match = basicAuth.find(({ host, zone, user, pass }) => (`${host}.${zone}` === incoming.checkDomain && user === credentials.user && pass === credentials.pass))

			if (match) {
				zone = match.zone
				return true
			}

			return false
		});

		domainAuthorized = true;
	}

	// If the domain was not authorized using Basic auth, check IP address and authorized domains
	// if (!domainAuthorized && env.ALLOWED_DOMAINS) {
	// 	const allowedIPs = (env.ALLOWED_IPS || '').split(',')
	// 	if (allowedIPs.length > 0) {
	// 		if (!request.headers.has('CF-Connecting-IP')) {
	// 			throw new ForbiddenException('Unauthorized')
	// 		}

	// 		const ip = request.headers.get('CF-Connecting-IP')!
	// 		if (!allowedIPs.includes(ip)) {
	// 			throw new ForbiddenException('Unauthorized')
	// 		}
	// 	}
	// 	domainAuthorized = await checkDomain(env.ALLOWED_DOMAINS.split(','), incoming.checkDomain)
	// }

	if (!domainAuthorized) {
		throw new ForbiddenException('Domain not permitted')
	}

	switch (action) {
		case 'present':
			await handler.present(request, env, incoming, zone)
			console.info(`Successfully created TXT record`)
			break;
		case 'cleanup':
			await handler.cleanup(request, env, incoming, zone)
			console.info(`Successfully removed TXT record`)
			break;
	}

	return new Response(JSON.stringify(incoming), {
		status: action == 'present' ? 201 : 200,
		headers: {
			'Content-Type': 'application/json',
		}
	})
}

export default {
	fetch: (request: Request, env: Env) => router
		.handle(request, env)
		.then(response => {
			return response
		})
		.catch(err => {
			const message = err.reason || err.stack || 'Unknown Error';

			if (err instanceof UnauthorizedException && err.responseInit) {
				return new Response(null, err.responseInit)
			}

			return new Response(message, {
				status: err.status || 500,
				statusText: err.statusText || null,
				headers: {
					'Content-Type': 'text/plain;charset=UTF-8',
					// Disables caching by default.
					'Cache-Control': 'no-store',
				},
			});
		})
}