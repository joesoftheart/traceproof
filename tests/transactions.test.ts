import {test} from 'node:test';
import assert from 'node:assert/strict';
import {explain,units,isHash,TRANSFER_TOPIC,ARC_USDC,ARC_SYSTEM,networks,type Transaction,type Receipt} from '../lib/transactions';
const tx:Transaction={hash:'0x'+'a'.repeat(64),from:'0x'+'1'.repeat(40),to:'0x'+'2'.repeat(40),value:'0xde0b6b3a7640000',input:'0x',blockNumber:'0x10'};
const receipt:Receipt={status:'0x1',blockNumber:'0x10',gasUsed:'0x5208',effectiveGasPrice:'0x3b9aca00',l1Fee:'0x1',logs:[]};
test('native value and execution fee preserve exact integer precision',()=>{const r=explain(tx,receipt,'base');assert.equal(r.movements[0].amount,'1');assert.equal(r.executionFee,'0.000021');assert.equal(r.l1Fee,'0.000000000000000001');assert.equal(units(123456789012345678901n),'123.456789012345678901');});
test('reverted transaction does not claim a completed transfer',()=>{const r=explain(tx,{...receipt,status:'0x0'},'base');assert.equal(r.status,'reverted');assert.deepEqual(r.movements,[]);assert.equal(r.executionFee,'0.000021');});
test('pending receipt never claims inclusion or a fee',()=>{const r=explain(tx,null,'base');assert.equal(r.status,'pending');assert.equal(r.executionFee,null);assert.deepEqual(r.movements,[]);});
test('token values remain raw and NFT-shaped logs are not decoded',()=>{const tokenLog={address:'0x'+'3'.repeat(40),topics:[TRANSFER_TOPIC,'0x'+'0'.repeat(24)+'1'.repeat(40),'0x'+'0'.repeat(24)+'2'.repeat(40)],data:'0x'+(25000000n).toString(16).padStart(64,'0')};const r=explain({...tx,value:'0x0',input:'0xa9059cbb'},{...receipt,logs:[tokenLog,{...tokenLog,topics:[...tokenLog.topics,'0x'+'0'.repeat(64)],data:'0x'}]},'base');assert.equal(r.decodedCount,1);assert.equal(r.movements[0].amount,'25000000');assert.equal(r.movements[0].asset,'token raw units');assert.ok(r.warnings.some(w=>w.includes('1 event(s)')));});
test('unknown contract calls are not invented as approvals or swaps',()=>{const r=explain({...tx,input:'0x095ea7b3',value:'0x0'},receipt,'base');assert.equal(r.method,'0x095ea7b3');assert.equal(r.movements.length,0);assert.ok(r.warnings.some(w=>w.includes('intent and internal calls are not decoded')));});
test('malformed hashes and non-canonical event addresses are rejected',()=>{assert.equal(isHash('0x'+'a'.repeat(64)),true);assert.equal(isHash('https://example.org'),false);assert.equal(isHash('0x'+'z'.repeat(64)),false);const r=explain({...tx,value:'0x0'},{...receipt,logs:[{address:tx.from,topics:[TRANSFER_TOPIC,'0x'+'f'.repeat(64),'0x'+'0'.repeat(64)],data:'0x'+'0'.repeat(64)}]},'base');assert.equal(r.decodedCount,0);});
const transfer = (address:string,value:bigint) => ({address,topics:[TRANSFER_TOPIC,'0x'+'0'.repeat(24)+'1'.repeat(40),'0x'+'0'.repeat(24)+'2'.repeat(40)],data:'0x'+value.toString(16).padStart(64,'0')});
test('Arc native value and gas use USDC with 18 decimals',()=>{
  const r=explain(tx,receipt,'arc-testnet');
  assert.equal(networks['arc-testnet'].chainId,'0x4cef52');
  assert.equal(networks['arc-testnet'].currency,'USDC');
  assert.equal(r.movements[0].asset,'USDC');assert.equal(r.movements[0].amount,'1');
  assert.match(r.summary,/1 USDC/);assert.equal(r.executionFee,'0.000021');
});
test('Arc official ERC-20 USDC uses six decimals only on Arc',()=>{
  const rec={...receipt,logs:[transfer(ARC_USDC,25000001n)]};
  const r=explain({...tx,value:'0x0'},rec,'arc-testnet');
  assert.equal(r.movements[0].amount,'25.000001');assert.equal(r.movements[0].asset,'USDC');
  const base=explain({...tx,value:'0x0'},rec,'base');
  assert.equal(base.movements[0].amount,'25000001');assert.equal(base.movements[0].asset,'token raw units');
});
test('Arc native transaction and its system log produce one movement',()=>{
  const r=explain(tx,{...receipt,logs:[transfer(ARC_SYSTEM,10n**18n)]},'arc-testnet');
  assert.equal(r.movements.length,1);assert.equal(r.movements[0].amount,'1');assert.equal(r.decodedCount,1);
});
test('Arc duplicate event streams pair one-for-one and preserve repeated transfers',()=>{
  const system=transfer(ARC_SYSTEM,25n*10n**18n),erc20=transfer(ARC_USDC,25000000n);
  const r=explain({...tx,value:'0x0',input:'0xa9059cbb'},{...receipt,logs:[erc20,system,system,erc20]},'arc-testnet');
  assert.equal(r.movements.length,2);assert.equal(r.decodedCount,4);
  assert.deepEqual(r.movements.map(m=>m.amount),['25','25']);
  assert.ok(r.warnings.some(w=>w.startsWith('2 duplicate')));
});
test('Arc does not suppress a different transfer or lose sub-micro USDC precision',()=>{
  const r=explain({...tx,value:'0x0'},{...receipt,logs:[transfer(ARC_SYSTEM,25000001000000000001n),transfer(ARC_USDC,25000000n),transfer('0x'+'3'.repeat(40),100n)]},'arc-testnet');
  assert.equal(r.movements.length,3);assert.equal(r.movements[0].amount,'25.000001000000000001');
  assert.equal(r.movements[1].amount,'25');assert.equal(r.movements[2].asset,'token raw units');
});
test('Arc pending and failed executions never show completed system movements',()=>{
  assert.deepEqual(explain(tx,null,'arc-testnet').movements,[]);
  const r=explain(tx,{...receipt,status:'0x0',logs:[transfer(ARC_SYSTEM,10n**18n)]},'arc-testnet');
  assert.deepEqual(r.movements,[]);assert.equal(r.executionFee,'0.000021');
});
