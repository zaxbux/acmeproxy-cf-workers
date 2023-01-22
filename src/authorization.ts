import { BadRequestException, ForbiddenException, UnauthorizedException } from './exception';

export type BasicAuthorizationCredentials = {
	user: string,
	pass: string,
};

/**
 * Throws exception on verification failure.
 * @throws {UnauthorizedException}
 */
export async function verifyCredentials(credentials: BasicAuthorizationCredentials, verifyFn: (credentials: BasicAuthorizationCredentials) => Promise<boolean>) {
	if (!(await verifyFn(credentials))) {
		throw new UnauthorizedException('Invalid credentials.');
	}
}

/**
 * Parse HTTP Basic Authorization value.
 * @throws {BadRequestException}
 */
export function basicAuthentication(request: Request, realm?: string): BasicAuthorizationCredentials {
	// In the case of a Basic authentication, the exchange
	// MUST happen over an HTTPS (TLS) connection to be secure.
	const { protocol } = new URL(request.url);
	if ('https:' !== protocol || 'https' !== request.headers.get('x-forwarded-proto')) {
		throw new ForbiddenException('SSL required');
	}

	if (request.headers.has('Authorization')) {
		const Authorization = request.headers.get('Authorization')!;
		const [scheme, encoded] = Authorization.split(' ');

		// The Authorization header must start with Basic, followed by a space.
		if (!encoded || scheme !== 'Basic') {
			throw new BadRequestException('Malformed authorization header.');
		}

		// Decodes the base64 value and performs unicode normalization.
		// @see https://datatracker.ietf.org/doc/html/rfc7613#section-3.3.2 (and #section-4.2.2)
		// @see https://dev.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/String/normalize
		const buffer = Uint8Array.from(atob(encoded), character => character.charCodeAt(0));
		const decoded = new TextDecoder().decode(buffer).normalize();

		// The username & password are split by the first colon.
		//=> example: "username:password"
		const index = decoded.indexOf(':');

		// The user & password are split by the first colon and MUST NOT contain control characters.
		// @see https://tools.ietf.org/html/rfc5234#appendix-B.1 (=> "CTL = %x00-1F / %x7F")
		if (index === -1 || /[\0-\x1F\x7F]/.test(decoded)) {
			throw new BadRequestException('Invalid Authorization header');
		}

		const [user, pass] = decoded.split(':', 2);
		return { user, pass };

		/* return {
			user: decoded.substring(0, index),
			pass: decoded.substring(index + 1),
		}; */
	}

	// Not authenticated.
	throw new UnauthorizedException('', {
		status: 401,
		headers: {
			// Prompts the user for credentials.
			'WWW-Authenticate': realm ? `Basic realm="${realm}", charset="UTF-8"` : `Basic charset="UTF-8"`,
		},
	})
}
