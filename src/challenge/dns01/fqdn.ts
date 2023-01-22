/**
 * @see https://github.com/go-acme/lego/blob/master/challenge/dns01/fqdn.go
 */

/** ToFqdn converts the name into a fqdn appending a trailing dot. */
export function toFQDN(name: string): string {
	const n = name.length
	if (n === 0 || name[n - 1] === '.') {
		return name
	}

	return name + '.'
}

/** UnFqdn converts the fqdn into a name removing the trailing dot. */
export function unFQDN(name: string): string {
	const n = name.length
	if (n !== 0 && name[n - 1] === '.') {
		return name.substring(0, n - 1)
	}

	return name
}