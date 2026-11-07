# n8n-nodes-nizlo

An open-source, read-only [n8n](https://n8n.io/) community node for the [Nizlo](https://nizlo.com/) RMM API.

The first release supports tenant-scoped reads for:

- customers (get one or many)
- sites (get one or many)
- endpoints (get one or many)
- alerts (get many)

List operations support server-side filters and pagination. The node does not create, update, delete, execute, patch, reboot, or remotely access anything.

## Requirements

- self-hosted n8n with community nodes enabled
- an active Nizlo technician account
- a Nizlo personal access token containing only the permissions required by the workflow
  - `devices.view` for customers, sites, and endpoints
  - `alerts.view` for alerts

Nizlo personal tokens remain attached to an active technician identity. Their effective permissions are the intersection of the token scope and that technician's current role.

## Installation

Until an npm release is available, a self-hosted n8n administrator can install the public GitHub package:

```bash
cd ~/.n8n/nodes
npm install github:izikipizi/n8n-nodes-nizlo
```

Restart n8n after installation. Review n8n's current [community-node installation guidance](https://docs.n8n.io/integrations/community-nodes/installation/) before adding any third-party package to a production instance.

## Credentials

1. In Nizlo, open **Admin → API Access**.
2. Create a personal access token with the narrowest permissions needed by the workflow.
3. Copy the token when it is shown; Nizlo returns the full token only once.
4. In n8n, create a **Nizlo API** credential and paste the token.
5. Run the credential test. It calls only `GET https://app.nizlo.com/api/v1/auth/me`.

The node uses the fixed production API origin and does not accept a custom host, which avoids sending the token to an arbitrary destination.

## Operations

| Resource | Operations | Common filters |
| --- | --- | --- |
| Customer | Get, Get Many | search, lifecycle |
| Site | Get, Get Many | search, customer ID, lifecycle |
| Endpoint | Get, Get Many | customer/site/tag, status, platform, kind, attention, favorites, lifecycle |
| Alert | Get Many | search, IDs, status, severity, assignment, source |

`Return All` follows Nizlo's stable page envelope until the reported total is reached. A bounded `Limit` is available when only part of the result set is needed.

## Development

```bash
npm ci
npm test
npm run lint
```

The test command performs a clean n8n node build and checks resource routing, query compaction, and response-envelope handling.

## Security and limitations

- This package never asks for a browser session cookie, password, device credential, or agent enrollment token.
- Keep personal tokens out of workflow fields, logs, source control, and screenshots; store them only in n8n credentials.
- Independent service accounts are not currently available in Nizlo.
- Production OpenAPI access can be restricted. The provider-owned overview is at [nizlo.com/rmm-api](https://nizlo.com/rmm-api).
- The node intentionally starts with read-only operations. Additional operations should not be added without narrow permissions, tests, and clear operator intent.

## Maintainer disclosure

This node is maintained by Nizlo. Kip Ecklund founded Nizlo. Initial implementation and documentation were AI-assisted and human-reviewed. The package is offered as a functional integration, not as an independent endorsement of Nizlo or n8n.

## License

[MIT](LICENSE)
