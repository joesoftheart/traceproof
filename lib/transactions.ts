export const networks = {
  'arc-testnet': { name: 'Arc Testnet', rpc: 'https://rpc.testnet.arc.io', explorer: 'https://explorer.testnet.arc.io', chainId: '0x4cef52', currency: 'USDC' },
  base: { name: 'Base', rpc: 'https://mainnet.base.org', explorer: 'https://basescan.org', chainId: '0x2105', currency: 'ETH' },
  'base-sepolia': { name: 'Base Sepolia', rpc: 'https://sepolia.base.org', explorer: 'https://sepolia.basescan.org', chainId: '0x14a34', currency: 'ETH' },
} as const;
export type Network = keyof typeof networks;
export type Transaction = { hash: string; from: string; to: string | null; value: string; input: string; blockNumber: string | null };
export type Log = { address: string; topics: string[]; data: string };
export type Receipt = { status: string; blockNumber: string; gasUsed: string; effectiveGasPrice: string; l1Fee?: string; logs: Log[] };
export type Movement = { from: string; to: string; amount: string; asset: string; contract?: string; evidence?: string };
export type Report = {
  hash: string; network: Network; source: 'live' | 'sample'; status: 'included' | 'reverted' | 'pending';
  title: string; summary: string; from: string; to: string | null; block: string | null;
  executionFee: string | null; l1Fee: string | null; movements: Movement[];
  warnings: string[]; eventCount: number; decodedCount: number; method: string;
};
export const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';
export const ARC_USDC = '0x3600000000000000000000000000000000000000';
export const ARC_SYSTEM = '0xfffffffffffffffffffffffffffffffffffffffe';
export const isHash = (value: string) => /^0x[0-9a-fA-F]{64}$/.test(value);
export const short = (value: string) => `${value.slice(0,6)}…${value.slice(-4)}`;
export function units(value: bigint, decimals = 18): string {
  const scale = 10n ** BigInt(decimals);
  const fractional = (value % scale).toString().padStart(decimals, '0').replace(/0+$/, '');
  return `${value / scale}${fractional ? '.' + fractional : ''}`;
}
export function explain(tx: Transaction, receipt: Receipt | null, network: Network): Report {
  const arc = network === 'arc-testnet';
  const currency = networks[network].currency;
  const status = receipt ? receipt.status === '0x1' ? 'included' : 'reverted' : 'pending';
  const movements: Movement[] = [];
  let decodedCount = 0;
  let rawTokens = false;
  let duplicates = 0;
  if (status === 'included') {
    const transfers = (receipt?.logs || []).slice(0,200).filter(log =>
      /^0x[0-9a-fA-F]{40}$/.test(log.address) && log.topics[0]?.toLowerCase() === TRANSFER_TOPIC && log.topics.length === 3 && /^0x[0-9a-fA-F]{64}$/.test(log.data) && log.topics.slice(1).every(t=>/^0x0{24}[0-9a-fA-F]{40}$/.test(t))
    ).map(log => ({from:('0x'+log.topics[1].slice(-40)).toLowerCase(),to:('0x'+log.topics[2].slice(-40)).toLowerCase(),value:BigInt(log.data),address:log.address.toLowerCase()}));
    decodedCount = transfers.length;
    const systemTransfers = arc ? transfers.filter(t=>t.address===ARC_SYSTEM) : [];
    // Pair by endpoints and exact native units; preserve repeated identical transfers.
    const key = (from:string,to:string,value:bigint) => `${from.toLowerCase()}:${to.toLowerCase()}:${value}`;
    const unmatchedSystem = new Map<string,number>();
    for (const t of systemTransfers) {
      const k = key(t.from,t.to,t.value);
      unmatchedSystem.set(k,(unmatchedSystem.get(k)||0)+1);
    }
    const nativeInLogs = tx.to && systemTransfers.some(t=>key(t.from,t.to,t.value)===key(tx.from,tx.to!,BigInt(tx.value)));
    if (tx.to && BigInt(tx.value) > 0n && !nativeInLogs) movements.push({from:tx.from,to:tx.to,amount:units(BigInt(tx.value)),asset:currency,evidence:'Top-level transaction value'});
    for (const t of transfers) {
      const system = arc && t.address === ARC_SYSTEM;
      const usdc = arc && t.address === ARC_USDC;
      if (usdc) {
        const k = key(t.from,t.to,t.value*10n**12n);
        const remaining = unmatchedSystem.get(k)||0;
        if (remaining) { unmatchedSystem.set(k,remaining-1); duplicates++; continue; }
      }
      if (!system && !usdc) rawTokens = true;
      movements.push({from:t.from,to:t.to,amount:system?units(t.value):usdc?units(t.value,6):t.value.toString(),asset:system||usdc?'USDC':'token raw units',contract:t.address,evidence:system?'Arc native system event (18 decimals)':usdc?'Arc USDC ERC-20 event (6 decimals)':'Unverified token Transfer event'});
    }
  }
  const hasCall = tx.input !== '0x' && tx.input.length > 2;
  const warnings = ['This is a receipt-based explanation, not a security audit or a guarantee of safety.'];
  if (hasCall) warnings.push('Contract intent and internal calls are not decoded. No claim is made about swaps, permissions or complete balance changes.');
  if (rawTokens) warnings.push('Unknown token values are raw integer units emitted by contracts. Symbols, decimals, legitimacy and actual balance changes have not been verified.');
  if (arc) warnings.push('Arc Testnet uses test USDC. Native value, system events and gas use 18 decimals; the official USDC ERC-20 interface uses 6. Historical NativeCoin events are not decoded.');
  if (duplicates) warnings.push(`${duplicates} duplicate USDC ERC-20 event(s) matched to native system events and omitted from the movement list. Gas is shown separately.`);
  if ((receipt?.logs.length || 0) > decodedCount) warnings.push(`${(receipt?.logs.length || 0) - decodedCount} event(s) remain uninterpreted. NFT transfers are not decoded in this preview.`);
  if ((receipt?.logs.length || 0) > 200) warnings.push('Only the first 200 logs were inspected.');
  if (status === 'included') warnings.push('Included in a block according to the RPC. Finality has not been checked.');
  if (!tx.to) warnings.push('Contract creation: deployment details are not decoded.');
  const title = status === 'pending' ? 'Waiting for a receipt.' : status === 'reverted' ? 'This transaction reverted.' : hasCall ? 'A contract call, with evidence.' : tx.to ? 'A direct transfer, explained.' : 'A contract was created.';
  const summary = status === 'pending' ? 'The RPC returned a transaction but no receipt. Its execution outcome is not known yet.' : status === 'reverted' ? 'Execution failed and state changes were rolled back. Network fees can still be charged. No completed transfers are reported.' : hasCall ? `The receipt reports successful execution. We decoded ${decodedCount} Transfer event(s) and show ${movements.length} movement(s)${arc ? ', after removing matching Arc USDC duplicates' : ''}. Review the evidence and limitations below.` : tx.to ? `${short(tx.from)} sent ${units(BigInt(tx.value))} ${currency} to ${short(tx.to)} in the top-level transaction.` : 'The receipt reports successful execution of a contract creation transaction.';
  return {hash:tx.hash,network,source:'live',status,title,summary,from:tx.from,to:tx.to,block:receipt?BigInt(receipt.blockNumber).toString():null,executionFee:receipt?units(BigInt(receipt.gasUsed)*BigInt(receipt.effectiveGasPrice)):null,l1Fee:receipt?.l1Fee?units(BigInt(receipt.l1Fee)):null,movements,warnings,eventCount:receipt?.logs.length||0,decodedCount,method:hasCall?tx.input.slice(0,10):'Native transfer'};
}
export const sampleReport: Report = {
  hash:'Illustrative example — not an on-chain transaction',network:'arc-testnet',source:'sample',status:'included',
  title:'A transfer. One clear story.',summary:'In this illustrative example, Wallet A sends 25 USDC to Wallet B. The recipient receives the tokens; the sender separately pays a network fee.',
  from:'0x1111111111111111111111111111111111111111',to:'0x2222222222222222222222222222222222222222',block:null,
  executionFee:'0.00105',l1Fee:null,movements:[{from:'0x1111111111111111111111111111111111111111',to:'0x2222222222222222222222222222222222222222',amount:'25',asset:'USDC (illustrative)'}],
  warnings:['All values and addresses in this example are fictional. No funds were moved.','Live reports use receipt data and do not yet include AI inference, verified agent identity or payments.'],eventCount:1,decodedCount:1,method:'Token transfer example',
};
