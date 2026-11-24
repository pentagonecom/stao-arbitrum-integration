# Validation evidence

Validated on 24 November 2026 with Node.js 24.14.1.

## Offline validation

| Command | Result |
| --- | --- |
| `npm run check` | All three JavaScript files passed syntax checks |
| `npm test` | 17 tests passed; zero failures |

Coverage includes exact integer amounts, valid zero balances, fixed token identity, canonical block-hash reads, chain mismatch, decimal mismatch, stale and future blocks, malformed responses, invalid addresses, provider failures, timeouts, request IDs, read-only method restrictions and deterministic repeat observations. All test addresses and block data are synthetic.

## Live metadata check

`npm run inspect` completed against Arbitrum's public RPC and returned:

```json
{
  "chainId": 42161,
  "token": "0xaf88d065e77c8cc2239327c5edb3a432268e5831",
  "decimals": 6,
  "blockNumber": "527074819",
  "blockHash": "0xba199de89059e00b5aa1a3581fb6d782c32fd323aa700cb68ccccc1a7cf04e2f",
  "blockTimestamp": "2026-11-24T09:19:27.000Z",
  "observationType": "READ_ONLY_RPC"
}
```

This check read chain metadata and token decimals at the reported block. It did not query a customer balance, connect a wallet, request a signature, deploy a contract or move funds. The balance-reading path was tested with synthetic responses only.

These results apply to the public reference. They are not evidence of a production Arbitrum lending deployment, a complete underwriting assessment, or an independent security audit.
