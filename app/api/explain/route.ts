import {NextResponse} from 'next/server';
import {explain,isHash,networks,type Network,type Transaction,type Receipt} from '@/lib/transactions';
export const maxDuration = 30;
export async function POST(request:Request) {
  let body: unknown;
  try {
    const text = await request.text();
    if(text.length>1024) return NextResponse.json({error:'Request is too large.'},{status:413});
    body=JSON.parse(text);
  } catch { return NextResponse.json({error:'Send a transaction hash and network.'},{status:400}); }
  const {hash,network}=(body && typeof body==='object'?body:{}) as {hash?:unknown;network?:unknown};
  if(typeof hash!=='string'||!isHash(hash)||typeof network!=='string'||!Object.hasOwn(networks,network)) return NextResponse.json({error:'Choose a supported network and enter a 0x transaction hash with 64 hexadecimal characters.'},{status:400});
  const selected=network as Network;
  async function rpc<T>(method:string,params:unknown[]):Promise<T>{
    const response=await fetch(networks[selected].rpc,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(10000),cache:'no-store'});
    if(!response.ok) throw new Error('RPC unavailable');
    const result=await response.json();
    if(result.error || !Object.hasOwn(result,'result')) throw new Error('RPC error');
    return result.result as T;
  }
  try {
    const [tx,receipt,chainId]=await Promise.all([rpc<Transaction|null>('eth_getTransactionByHash',[hash]),rpc<Receipt|null>('eth_getTransactionReceipt',[hash]),rpc<string>('eth_chainId',[])]);
    if(chainId.toLowerCase()!==networks[selected].chainId) throw new Error('Unexpected chain');
    if(!tx) return NextResponse.json({error:`Transaction not found on ${networks[selected].name}. Check the network and hash, or try again after it has propagated.`},{status:404});
    return NextResponse.json(explain(tx,receipt,selected),{headers:{'Cache-Control':'no-store'}});
  } catch { return NextResponse.json({error:'The public blockchain provider could not return a complete response. Please try again shortly. No report was generated.'},{status:502}); }
}
