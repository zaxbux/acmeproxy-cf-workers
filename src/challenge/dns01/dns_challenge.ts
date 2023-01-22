import { sum } from './sha2'
import { toFQDN } from './fqdn'
import { base64url } from 'rfc4648';

/** GetRecord returns a DNS record which will fulfill the `dns-01` challenge. */
export async function getRecord(domain: string, keyAuth: string) {
	const keyAuthShaBytes = await sum('', keyAuth)
	// base64URL encoding without padding
	const value = base64url.stringify(new Uint8Array(keyAuthShaBytes), { pad: false });

	const fqdn = await getChallengeFQDN(domain)

	return {
		fqdn,
		value,

	}
}

async function getChallengeFQDN(domain: string, cname: boolean = false): Promise<string> {
	const fqdn = `_acme-challenge.${toFQDN(domain)}`

	if (!cname) {
		return fqdn
	}

	// recursion counter so it doesn't spin out of control
	/* for (let limit = 0; limit < 50; limit++) {
		// Keep following CNAMEs
		r, err := dnsQuery(fqdn, dns.TypeCNAME, recursiveNameservers, true)

		if err != nil || r.Rcode != dns.RcodeSuccess {
			// No more CNAME records to follow, exit
			break
		}

		// Check if the domain has CNAME then use that
		cname:= updateDomainWithCName(r, fqdn)
		if cname == fqdn {
			break
		}

		log.Infof("Found CNAME entry for %q: %q", fqdn, cname)

		fqdn = cname
		
	} */

	return fqdn
}