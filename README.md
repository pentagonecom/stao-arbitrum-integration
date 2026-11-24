# STAO · Arbitrum integration

[STAO](https://stao.io) provides stablecoin credit infrastructure for applications: wallet assessment, credit-line agreements, collateral tracking, disbursement and repayment workflows. Bion is our consumer application using that infrastructure.

This is STAO's public integration repository for Arbitrum technical review. It contains a high-level architecture, an executable read-only USDC example, and deterministic tests. The production backend and underwriting model remain private.

## Arbitrum scope

STAO's existing wallet-analysis source includes Arbitrum in its chain-and-token allowlist and supports RPC balance and decimal checks alongside provider data. Wallet assessment and loan settlement are separate integrations.

| Component | Scope of this repository |
| --- | --- |
| Arbitrum One native USDC | Exact contract identification and read-only balance observation |
| RPC evidence | Chain ID, block hash, block timestamp, decimals and integer token balance |
| Tests | Offline tests with synthetic fixtures; no customer records |
| STAO architecture | Responsibility boundaries and proposed Arbitrum settlement work |
| Arbitrum lending deployment | Not delivered or claimed by this repository |

The example is newly written review code, not an export of the production adapter. It does not issue a credit decision, retrieve transaction history, reconcile Zerion positions, request a wallet signature, or submit a transaction. A successful balance read is not evidence of creditworthiness or a completed lending integration.

## Run the tests

Requires Node.js 22 or later. There are no third-party runtime dependencies and no installation step.

```sh
npm test
```

## Try a read-only network check

```sh
npm run inspect
```

This checks Arbitrum One and the native USDC contract using Arbitrum's public RPC. It does not query a customer wallet by default. To inspect your own address:

```sh
node examples/inspect.mjs YOUR_PUBLIC_EVM_ADDRESS
```

No private key, wallet connection or payment is needed. An optional `ARBITRUM_RPC_URL` environment variable can select your own HTTPS RPC provider. Keep credential-bearing URLs out of commits and shared output. The RPC provider can see an address you choose to query.

The reader checks chain identity and freshness, pins token reads to one canonical block hash, validates six decimals, and keeps balances in integer units. It returns an error if a check fails; it does not substitute a zero balance. These checks rely on the selected RPC provider and do not establish finality or historical completeness.

## Review documents

- [Architecture and responsibility boundaries](docs/architecture.md)
- [Arbitrum scope and proposed next steps](docs/arbitrum.md)
- [Validation evidence](docs/validation.md)
- [Security and disclosure boundaries](SECURITY.md)

Public network parameters are sourced from [Arbitrum chain information](https://docs.arbitrum.io/chain-info) and [Circle's USDC contract list](https://developers.circle.com/stablecoins/usdc-contract-addresses). This repository does not imply endorsement by Arbitrum or Circle.
