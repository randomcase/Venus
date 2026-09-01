/* chains.js — the networks, and one adapter per chain family.

   Three families from one seed phrase:
     evm   Ethereum and every chain that speaks its RPC; ethers does the work
     utxo  Bitcoin, Bitcoin testnet, Litecoin; native segwit (BIP-84), signed by
           @scure/btc-signer, funded and broadcast through a mempool.space-style API
     sol   Solana; SLIP-10 ed25519 keys, a system-program transfer built by hand
           and signed with @noble/ed25519, so no 400 KB web3 library is needed
   Each adapter gives derive / balance / isAddress / quote / send and formatting.
   Amounts cross the boundary as strings in whole units; inside, base units as BigInt. */
const NETWORKS = [
  { id: 'sepolia',   kind: 'evm', chainId: 11155111, name: 'Ethereum Sepolia (testnet)', symbol: 'ETH',  rpc: 'https://ethereum-sepolia-rpc.publicnode.com',        explorer: 'https://sepolia.etherscan.io' },
  { id: 'eth',       kind: 'evm', chainId: 1,        name: 'Ethereum',                   symbol: 'ETH',  rpc: 'https://ethereum-rpc.publicnode.com',                explorer: 'https://etherscan.io' },
  { id: 'base',      kind: 'evm', chainId: 8453,     name: 'Base',                       symbol: 'ETH',  rpc: 'https://base-rpc.publicnode.com',                    explorer: 'https://basescan.org' },
  { id: 'arb',       kind: 'evm', chainId: 42161,    name: 'Arbitrum One',               symbol: 'ETH',  rpc: 'https://arbitrum-one-rpc.publicnode.com',            explorer: 'https://arbiscan.io' },
  { id: 'op',        kind: 'evm', chainId: 10,       name: 'Optimism',                   symbol: 'ETH',  rpc: 'https://optimism-rpc.publicnode.com',                explorer: 'https://optimistic.etherscan.io' },
  { id: 'polygon',   kind: 'evm', chainId: 137,      name: 'Polygon',                    symbol: 'POL',  rpc: 'https://polygon-bor-rpc.publicnode.com',             explorer: 'https://polygonscan.com' },
  { id: 'bnb',       kind: 'evm', chainId: 56,       name: 'BNB Smart Chain',            symbol: 'BNB',  rpc: 'https://bsc-rpc.publicnode.com',                     explorer: 'https://bscscan.com' },
  { id: 'avax',      kind: 'evm', chainId: 43114,    name: 'Avalanche C-Chain',          symbol: 'AVAX', rpc: 'https://avalanche-c-chain-rpc.publicnode.com',       explorer: 'https://snowtrace.io' },
  { id: 'gnosis',    kind: 'evm', chainId: 100,      name: 'Gnosis',                     symbol: 'xDAI', rpc: 'https://gnosis-rpc.publicnode.com',                  explorer: 'https://gnosisscan.io' },
  { id: 'fantom',    kind: 'evm', chainId: 250,      name: 'Fantom',                     symbol: 'FTM',  rpc: 'https://fantom-rpc.publicnode.com',                  explorer: 'https://ftmscan.com' },
  { id: 'linea',     kind: 'evm', chainId: 59144,    name: 'Linea',                      symbol: 'ETH',  rpc: 'https://linea-rpc.publicnode.com',                   explorer: 'https://lineascan.build' },
  { id: 'scroll',    kind: 'evm', chainId: 534352,   name: 'Scroll',                     symbol: 'ETH',  rpc: 'https://scroll-rpc.publicnode.com',                  explorer: 'https://scrollscan.com' },
  { id: 'mantle',    kind: 'evm', chainId: 5000,     name: 'Mantle',                     symbol: 'MNT',  rpc: 'https://mantle-rpc.publicnode.com',                  explorer: 'https://mantlescan.xyz' },
  { id: 'celo',      kind: 'evm', chainId: 42220,    name: 'Celo',                       symbol: 'CELO', rpc: 'https://celo-rpc.publicnode.com',                    explorer: 'https://celoscan.io' },
  { id: 'cronos',    kind: 'evm', chainId: 25,       name: 'Cronos',                     symbol: 'CRO',  rpc: 'https://cronos-evm-rpc.publicnode.com',              explorer: 'https://cronoscan.com' },
  { id: 'moonbeam',  kind: 'evm', chainId: 1284,     name: 'Moonbeam',                   symbol: 'GLMR', rpc: 'https://moonbeam-rpc.publicnode.com',                explorer: 'https://moonscan.io' },
  { id: 'opbnb',     kind: 'evm', chainId: 204,      name: 'opBNB',                      symbol: 'BNB',  rpc: 'https://opbnb-rpc.publicnode.com',                   explorer: 'https://opbnbscan.com' },
  { id: 'blast',     kind: 'evm', chainId: 81457,    name: 'Blast',                      symbol: 'ETH',  rpc: 'https://blast-rpc.publicnode.com',                   explorer: 'https://blastscan.io' },
  { id: 'basesep',   kind: 'evm', chainId: 84532,    name: 'Base Sepolia (testnet)',     symbol: 'ETH',  rpc: 'https://base-sepolia-rpc.publicnode.com',            explorer: 'https://sepolia.basescan.org' },
  { id: 'arbsep',    kind: 'evm', chainId: 421614,   name: 'Arbitrum Sepolia (testnet)', symbol: 'ETH',  rpc: 'https://arbitrum-sepolia-rpc.publicnode.com',        explorer: 'https://sepolia.arbiscan.io' },
  { id: 'opsep',     kind: 'evm', chainId: 11155420, name: 'Optimism Sepolia (testnet)', symbol: 'ETH',  rpc: 'https://optimism-sepolia-rpc.publicnode.com',        explorer: 'https://sepolia-optimism.etherscan.io' },
  { id: 'amoy',      kind: 'evm', chainId: 80002,    name: 'Polygon Amoy (testnet)',     symbol: 'POL',  rpc: 'https://polygon-amoy-bor-rpc.publicnode.com',        explorer: 'https://amoy.polygonscan.com' },
  { id: 'bnbtest',   kind: 'evm', chainId: 97,       name: 'BNB testnet',                symbol: 'tBNB', rpc: 'https://bsc-testnet-rpc.publicnode.com',             explorer: 'https://testnet.bscscan.com' },
  { id: 'fuji',      kind: 'evm', chainId: 43113,    name: 'Avalanche Fuji (testnet)',   symbol: 'AVAX', rpc: 'https://avalanche-fuji-c-chain-rpc.publicnode.com',  explorer: 'https://testnet.snowtrace.io' },
  { id: 'tbtc',      kind: 'utxo', name: 'Bitcoin testnet',  symbol: 'tBTC', coin: 1, params: 'tbtc', decimals: 8, api: 'https://mempool.space/testnet/api', explorer: 'https://mempool.space/testnet' },
  { id: 'btc',       kind: 'utxo', name: 'Bitcoin',          symbol: 'BTC',  coin: 0, params: 'btc',  decimals: 8, api: 'https://mempool.space/api',         explorer: 'https://mempool.space' },
  { id: 'ltc',       kind: 'utxo', name: 'Litecoin',         symbol: 'LTC',  coin: 2, params: 'ltc',  decimals: 8, api: 'https://litecoinspace.org/api',     explorer: 'https://litecoinspace.org' },
  { id: 'soldev',    kind: 'sol',  name: 'Solana devnet',    symbol: 'SOL',  decimals: 9, rpc: 'https://api.devnet.solana.com',       explorer: 'https://explorer.solana.com', txSuffix: '?cluster=devnet' },
  { id: 'sol',       kind: 'sol',  name: 'Solana',           symbol: 'SOL',  decimals: 9, rpc: 'https://api.mainnet-beta.solana.com', explorer: 'https://explorer.solana.com' },
];

const Families = (() => {
  const C = Chains;
  const seedOf = phrase => C.bip39.mnemonicToSeedSync(phrase);
  const units = (amount, decimals) => { const [a, b = ''] = String(amount).trim().split('.'); if (!/^\d*$/.test(a) || !/^\d*$/.test(b) || b.length > decimals) throw new Error('bad amount'); return BigInt((a || '0') + b.padEnd(decimals, '0')); };
  const whole = (v, decimals) => { const s = v.toString().padStart(decimals + 1, '0'); return (s.slice(0, -decimals) + '.' + s.slice(-decimals)).replace(/\.?0+$/, '') || '0'; };
  const json = async (url, init) => { const r = await fetch(url, init); const t = await r.text(); if (!r.ok) throw new Error(t.slice(0, 160) || r.statusText); return t ? JSON.parse(t) : null; };

  const BTC_NETS = { btc: C.btc.NETWORK, tbtc: C.btc.TEST_NETWORK, ltc: { bech32: 'ltc', pubKeyHash: 0x30, scriptHash: 0x32, wif: 0xb0 } };
  const utxo = {
    derive(phrase, i, net) { const node = C.HDKey.fromMasterSeed(seedOf(phrase)).derive(`m/84'/${net.coin}'/0'/0/${i}`); const p = C.btc.p2wpkh(node.publicKey, BTC_NETS[net.params]); return { address: p.address, script: p.script, key: node.privateKey, net }; },
    async balance(a) { const r = await json(`${a.net.api}/address/${a.address}`); const c = r.chain_stats, m = r.mempool_stats; return BigInt(c.funded_txo_sum - c.spent_txo_sum + m.funded_txo_sum - m.spent_txo_sum); },
    isAddress(s, net) { try { C.btc.Address(BTC_NETS[net.params]).decode(s); return true; } catch (e) { return false; } },
    async quote(a, to, amount) { const sats = units(amount, 8); const utxos = await json(`${a.net.api}/address/${a.address}/utxo`); const fees = await json(`${a.net.api}/v1/fees/recommended`); const rate = BigInt(Math.max(1, fees.halfHourFee || fees.hourFee || 2));
      utxos.sort((x, y) => y.value - x.value); let total = 0n; const used = [];
      for (const u of utxos) { used.push(u); total += BigInt(u.value); const fee = rate * BigInt(11 + 68 * used.length + 31 * 2); if (total >= sats + fee) return { sats, used, fee, change: total - sats - fee, rate, to, feeText: `${whole(fee, 8)} ${a.net.symbol} (${rate} sat/vB, ${used.length} input${used.length === 1 ? '' : 's'})` }; }
      throw new Error('insufficient funds'); },
    async send(a, q) { const tx = new C.btc.Transaction(); for (const u of q.used) tx.addInput({ txid: u.txid, index: u.vout, witnessUtxo: { script: a.script, amount: BigInt(u.value) } });
      tx.addOutputAddress(q.to, q.sats, BTC_NETS[a.net.params]); if (q.change > 546n) tx.addOutputAddress(a.address, q.change, BTC_NETS[a.net.params]); tx.sign(a.key); tx.finalize();
      const r = await fetch(`${a.net.api}/tx`, { method: 'POST', body: tx.hex }); const t = await r.text(); if (!r.ok) throw new Error(t.slice(0, 160)); return t.trim(); },
    whole: v => whole(v, 8),
  };

  const sol = {
    derive(phrase, i, net) { const seed = seedOf(phrase); let I = C.hmac(C.sha512, new TextEncoder().encode('ed25519 seed'), seed); let k = I.slice(0, 32), c = I.slice(32);
      for (const p of [44, 501, i, 0]) { const d = new Uint8Array(37); d.set(k, 1); new DataView(d.buffer).setUint32(33, (p | 0x80000000) >>> 0); I = C.hmac(C.sha512, c, d); k = I.slice(0, 32); c = I.slice(32); }
      const pub = C.ed.getPublicKey(k); return { address: C.base58.encode(pub), pub, key: k, net }; },
    async rpc(net, method, params) { const r = await json(net.rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params }) }); if (r.error) throw new Error(r.error.message); return r.result; },
    async balance(a) { return BigInt((await sol.rpc(a.net, 'getBalance', [a.address])).value); },
    isAddress(s) { try { return C.base58.decode(s).length === 32; } catch (e) { return false; } },
    async quote(a, to, amount) { const lamports = units(amount, 9), fee = 5000n; return { lamports, fee, to, feeText: `${whole(fee, 9)} ${a.net.symbol} (one signature)` }; },
    async send(a, q) { const bh = (await sol.rpc(a.net, 'getLatestBlockhash', [{ commitment: 'finalized' }])).value.blockhash;
      const data = new Uint8Array(12); const dv = new DataView(data.buffer); dv.setUint32(0, 2, true); dv.setBigUint64(4, q.lamports, true);
      /* legacy message: header, 3 account keys (payer, recipient, system program), blockhash, one instruction */
      const m = new Uint8Array([1, 0, 1, 3, ...a.pub, ...C.base58.decode(q.to), ...new Uint8Array(32), ...C.base58.decode(bh), 1, 2, 2, 0, 1, data.length, ...data]);
      const sig = C.ed.sign(m, a.key); const tx = new Uint8Array([1, ...sig, ...m]);
      return sol.rpc(a.net, 'sendTransaction', [C.base64.encode(tx), { encoding: 'base64', preflightCommitment: 'processed' }]); },
    whole: v => whole(v, 9),
  };
  return { utxo, sol, units, whole };
})();
