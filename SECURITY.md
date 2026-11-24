# Security and scope

This repository is a limited public integration reference. It is not an audited lending implementation and must not be used as a credit-decision service or custody system.

The published reader contains no signing or transaction-submission functions. It does not request seed phrases, private keys, API secrets or personal identity documents. Tests use invented addresses and fixed responses.

The repository excludes production configuration, treasury and operator addresses, customer records, KYC data, database exports, proprietary decision logic and the production repository's Git history.

RPC results still depend on the selected provider. Block freshness is not finality, a balance observation does not prove history completeness, and these tests do not constitute a security audit. A provider that does not support canonical block-hash reads is rejected rather than silently using a weaker read.

Do not include credentials, private wallet details or customer information in public issues. Use the contact route on [stao.io](https://stao.io) to arrange a private disclosure.

No open-source license is granted to the private STAO backend by publishing this reference. This repository is available for technical review; no additional software license is declared.
