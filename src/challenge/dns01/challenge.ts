export interface Challenge {
	dnsZone: string;
	dnsPrefix: string;
	dnsAuthorization: string;
	removed?: boolean;
}