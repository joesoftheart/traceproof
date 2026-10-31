# Traceproof

An evidence-led transaction explainer prototype. Paste an Arc Testnet transaction hash, read the receipt in plain English, inspect its evidence, and export the report.

## Run locally

Requires Node.js 22+.

```sh
npm ci
npm run dev
```

Open http://localhost:3000/en. No wallet, database or API key is needed.

```sh
npm test
npm run typecheck
npm run build
```

## Structure and design lineage

Uses the same Next.js App Router / React / TypeScript / Tailwind foundation and `app/[locale]/[[...slug]]`, `components`, `lib` structure as [Standard Reserve Community](https://github.com/joesoftheart/standard-reserve-community), referenced at commit c347cbe03653a5cba45406279320cbf5b4810d41. Keeps its light editorial shell, split hero, interactive explanation panel and modular cards. Project content and transaction UI are new. The current UI locale is English (`/en`). The bundled Noto Sans Thai font retains its OFL notice.

Routes: `/en`, `/en/explain`, `/en/how-it-works`, `/en/agent`.

## Available now

- Responsive UI with transfer / approval / reverted educational scenarios.
- Clearly labeled fictional sample report.
- Read-only Arc Testnet (default), Base and Base Sepolia RPC lookup with hash and chain ID validation.
- Exact integer native value, execution fee, optional reported L1 fee, and ERC-20-shaped Transfer event decoding.
- Full addresses, explorer evidence links, explicit limitations, JSON export.
- Pending, reverted, not-found, invalid-input and provider-error handling.

## Deliberately not implemented

Concordium registration / owner verification, verified-agent badge, x402 payments, LLM inference, wallet signing, internal traces, NFT / approval / swap / bridge interpretation, persistent accounts and storage. This is **not yet a complete Concordium hackathon submission**. The agent page records these as planned. The educational approval scenario does not imply live approval decoding support.

## Interpretation limits

ERC-20-shaped events are not proof that balance changes occurred or tokens are legitimate. Unknown token values stay in raw units because token metadata is not verified. On Arc Testnet, native value and system Transfer events use 18 decimals; the official USDC ERC-20 emitter uses 6 decimals. Matching system/USDC events are paired one-for-one to avoid duplicate movements; a matching top-level value is shown through its system event only. Historical NativeCoin events are not decoded. Only the first 200 logs are inspected. Native value is the top-level call value plus supported Arc system event evidence, not a reconstruction of all balance changes. Execution and reported L1 fees are separate, not claimed as the total fee; additional chain-specific fees may apply. Successful inclusion is not treated as verified finality. Explanations are deterministic and are not security audits.

## Operations and privacy

The POST `/api/explain` endpoint accepts `{ "hash": "0x…", "network": "arc-testnet" }`. It reads only fixed public RPC endpoints (no user-provided URLs), has upstream timeouts and does not broadcast transactions. Hashes are sent to the hosting server and RPC provider. No report database or analytics SDK is configured; infrastructure providers can retain operational logs. Public RPC endpoints are rate-limited and not suitable for production-scale traffic. Add a dedicated provider, shared rate limiting, telemetry with privacy controls and response validation before production use.

Hosted on Vercel as an early build, connected to this repository. Vercel assigned the first deployment to the project’s production environment; it is still a prototype with Vercel Authentication enabled. No custom domain or payment service is configured.

## Next milestones

1. Concordium testnet Agent Registry: agent card, verifiable operator and explorer evidence.
2. Grounded language model output referencing only decoded fields.
3. x402 testnet payment and receipt flow with explicit user authorization.
4. End-to-end testnet demo, 3-minute video and submission evidence.

Sources: [Arc network configuration](https://docs.arc.io/arc/references/connect-to-arc), [Arc USDC events and decimals](https://docs.arc.io/arc/references/usdc-system-events), [Arc contract addresses](https://docs.arc.io/arc/references/contract-addresses), [Base network details](https://docs.base.org/get-started/connect-to-base), [Concordium Agent Registry](https://docs.concordium.com/en/mainnet/technical-reference/agent-registry/index.html).

## Arc integration

Chain ID: 5042002. RPC: `https://rpc.testnet.arc.io`. Explorer: `https://explorer.testnet.arc.io`. Gas and native currency: test USDC, 18 decimals. This is a read-only application consuming Arc RPC data; it does not deploy a smart contract or move funds. No mainnet support is claimed.
