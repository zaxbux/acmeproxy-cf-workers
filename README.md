# acmeproxy for Cloudflare Workers

A workers implementation of <https://github.com/mdbraber/acmeproxy>.


## API

### `/present`

#### Default

The `acme.sh` implementation of `acmeproxy` only supports this method.

```jsonc
{
	"fqdn": "",
	"value": "",
}
```

#### Raw

```jsonc
{
	"domain": "",
	"token": "",
	"keyauth": "",
}
```

### `/cleanup`

Same as `/present`, but removes DNS records.