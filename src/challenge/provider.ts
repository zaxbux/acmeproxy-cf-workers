/**
 * @file
 * See <https://github.com/go-acme/lego/blob/master/challenge/provider.go>
 */

/** Provider enables implementing a custom challenge provider. */
export interface Provider {
	/** Present presents the solution to a challenge available to be solved. */
	present: (domain: string, token: string, keyAuth: string) => Promise<void>
	/** CleanUp will be called by the challenge if Present ends in a non-error state. */
	cleanup: (domain: string, token: string, keyAuth: string) => Promise<void>
}