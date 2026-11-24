# Arbitrum scope

## Included

The read-only reference uses these public network parameters:

| Parameter | Value |
| --- | --- |
| Network | Arbitrum One |
| Chain ID | `42161` |
| Public RPC | `https://arb1.arbitrum.io/rpc` |
| Asset | Circle-issued native USDC |
| Contract | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` |
| Expected decimals | `6`, checked against the contract for every observation |

Sources: [Arbitrum](https://docs.arbitrum.io/chain-info), [Circle](https://developers.circle.com/stablecoins/usdc-contract-addresses), [ERC-20 read methods](https://eips.ethereum.org/EIPS/eip-20), [block-hash RPC reads](https://eips.ethereum.org/EIPS/eip-1898). Reviewed 24 November 2026.

This example has no token-address override. USDC.e, USDT and other assets are outside its scope; their exclusion here is not a statement about whether they exist on Arbitrum. An additional token needs its own explicit review before it is included.

## Relationship to STAO

The STAO source reviewed for this package already includes Arbitrum native USDC in its wallet-analysis allowlist and an Arbitrum RPC configuration path. That establishes source-level support; it does not establish production RPC availability or an Arbitrum loan-settlement deployment.

No production Arbitrum lending contract, transaction volume, audit status or launch date is asserted here. The source in this repository is an intentionally small public reference rather than the private underwriting service.

## Proposed settlement work

These are next steps, not completed deliverables:

1. Define the Arbitrum settlement scope, supported assets and account/authorization model.
2. Exercise the full credit-line, collateral, funding and repayment lifecycle on Arbitrum Sepolia using test assets.
3. Test replay protection, duplicate receipts, failed transactions, reorg handling and repayment reconciliation.
4. Complete the required security review and publish verified contract source and deployment addresses.
5. Validate a controlled mainnet rollout before making production availability claims.

The public RPC is convenient for this example. It is not an availability guarantee for production underwriting or settlement.
