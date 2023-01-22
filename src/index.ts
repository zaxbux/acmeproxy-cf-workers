import { Router } from 'itty-router';
import { basicAuthentication, verifyCredentials } from './authorization';
import { NotFoundException, UnauthorizedException } from './exception';
import handler from './handler';
import { checkDomain, getIncoming } from './incoming';

export interface Env {
	/** Comma-separated domains */
	ALLOWED_DOMAINS: string

	/** Comma-separated IP addresses */
	ALLOWED_IPS?: string;

	/** Comma-separated username/password address pairs in the format username:password */
	BASIC_AUTH?: string;

	CLOUDFLARE_TOKEN: string;
}

const router = Router()
router.all('/present', (request, env: Env, context) => actionHandler('present', { request: request as unknown as Request, env, context }))
router.post('/cleanup', (request, env: Env, context) => actionHandler('cleanup', { request: request as unknown as Request, env, context }))

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
		return jsonResponse(null, { status: 405 })
	}

	// The "Authorization" header is sent when authenticated.
	if (request.headers.has('Authorization')) {
		// Throws exception when authorization fails.
		await verifyCredentials(basicAuthentication(request), async (credentials) => {
			// todo
			return false
		});
	}

	// Get the incoming message, mode, and domain to check
	const incoming = await getIncoming(request)

	await checkDomain(env.ALLOWED_DOMAINS.split(','), incoming.checkDomain)

	switch (action) {
		case 'present':
			await handler.present(request, env, incoming)
			console.info(`Successfully created TXT record`)
		case 'cleanup':
			await handler.cleanup(request, env, incoming)
			console.info(`Successfully removed TXT record`)
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