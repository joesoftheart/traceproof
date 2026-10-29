# Verification — 2026-10-29

Runtime commit: af2dabd01670496dad50b13a6b9a38a4a9e9961c.

- `npm test`: 6 passing cases covering exact integer units, reverted transactions, pending receipts, raw token units, NFT-shaped log exclusion, unknown call intent, malformed hashes and noncanonical event addresses.
- `npm run typecheck`: passed.
- `npm run build`: passed; four English UI routes plus POST API.
- Browser: Transfer / Approval / Reverted examples switch visibly; sample report renders; invalid hash produces useful error; real lookup renders receipt-backed evidence.
- Local mobile viewport: 390px iframe renders the responsive header, stacked hero and transaction illustration without page-width overflow observed.
- Vercel: deployment `dpl_8BGsoJiSgvighd1ZCWDY9kQGEVJM` READY. Vercel assigned the initial deployment to production despite requesting preview. Deployment Protection remains enabled.
- Deployed browser flow verified in Brave after normal GitHub login to Vercel. No shared-access link or bypass was used.
- Live read-only test: Base transaction `0x40cef76fe49cead829cbbd594bbdc8e914ffb2fd98fdbbcbc80bbd9f4342991e`, block 53244582. UI returned 0.003489385359510442 ETH, execution fee 0.000000126 ETH, reported L1 fee 0.000000000465491611 ETH, matching the RPC response. No blockchain transaction was sent.

Not verified / not implemented: production load behavior, exhaustive token semantics, Concordium identity, x402, LLM generation, wallet signing. See README for scope and limitations.
