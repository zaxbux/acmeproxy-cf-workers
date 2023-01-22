/**
 * @see {@link https://github.com/therootcompany/acme.js/blob/master/lib/browser/sha2.js}
 */

const encoder = new TextEncoder();

export async function sum(algorithm: string | SubtleCryptoHashAlgorithm, str: string | ArrayBuffer | ArrayBufferView) {
	var data = str;
	if ('string' === typeof data) {
		data = encoder.encode(str as string);
	}
	var sha = 'SHA-' + String(algorithm).replace(/^sha-?/i, '');
	return await crypto.subtle.digest(sha, data);
};