# Venus Wallet

A self-custodial wallet as a Chromium extension. One seed phrase; from it,
Ethereum and two dozen EVM chains, Bitcoin, Litecoin and Solana. No server, no
account, no telemetry. The phrase is generated on your machine, encrypted with
a password you choose (PBKDF2-SHA256, 600k rounds, AES-256-GCM), and kept in
the extension's local storage. Unlocking puts the phrase in session storage,
which is memory only and cleared when Chrome closes or the auto-lock fires.

**Unaudited.** Read `vault.js`, `chains.js` and `popup.js` before trusting it
with anything you would mind losing. Test networks are the default on purpose.

## Load it

1. `chrome://extensions`, turn on Developer mode, **Load unpacked**, pick this
   `wallet/` folder.
2. Click the toolbar icon. Create a wallet (write the twelve words down) or
   import one. A phrase from another wallet gives the same addresses here on
   every chain listed below, so long as that wallet used the standard paths.
3. Pick a test network, get coins from a faucet, send some to a second account.

## Chains

| family | networks | keys and paths | how it talks to the chain |
|---|---|---|---|
| EVM | Sepolia (default), Ethereum, Base, Arbitrum One, Optimism, Polygon, BNB Smart Chain, Avalanche C-Chain, Gnosis, Fantom, Linea, Scroll, Mantle, Celo, Cronos, Moonbeam, opBNB, Blast, and the Base, Arbitrum, Optimism, Polygon Amoy, BNB and Avalanche Fuji testnets | BIP-44 `m/44'/60'/0'/0/i`, secp256k1 | JSON-RPC over public endpoints (publicnode); ethers 6 signs. Any ERC-20 by contract address. A custom https RPC per network if you prefer your own. |
| Bitcoin-like | Bitcoin testnet, Bitcoin, Litecoin | BIP-84 native segwit `m/84'/coin'/0'/0/i`, coin 1 / 0 / 2 | mempool.space and litecoinspace.org REST for UTXOs, fee rates and broadcast; @scure/btc-signer signs P2WPKH. Fee = recommended half-hour rate × estimated vsize. |
| Solana | Solana devnet, Solana | SLIP-10 ed25519 `m/44'/501'/i'/0'` (the Phantom path) | JSON-RPC to the public cluster; a system-program transfer is built by hand in `chains.js` and signed with @noble/ed25519. No SPL tokens yet. |

Adding an EVM chain is one line in `NETWORKS` in `chains.js`. Adding another
Bitcoin-like coin with segwit and a mempool-style API is one line too. Anything
else is a new adapter.

## Not here

Dogecoin (no segwit; needs a legacy signer and a different API), XRP, Cardano,
Cosmos and its chains, Polkadot, Tron, Monero, and every other family with its
own signing scheme. Each is its own library and its own audit; none is a
weekend. Also not here: dapp connection (`window.ethereum` is not injected),
swaps, fiat, prices, address book, hardware wallets, and recovery. The phrase
is the wallet.

## Files

- `manifest.json` MV3, permissions `storage` and `alarms` only, CSP `script-src 'self'`
- `popup.html` / `popup.js` the room; `chains.js` the networks and the three adapters
- `vault.js` the encryption; `sw.js` the auto-lock alarm
- `lib/ethers.umd.min.js` ethers 6.13.4, vendored
- `lib/chains.js` @scure/bip39, @scure/bip32, @scure/btc-signer, @noble/ed25519,
  @noble/hashes, @scure/base, bundled with esbuild into one file so nothing
  loads from a CDN

Verified against known vectors: the BIP-39 test phrase gives
`bc1qcr8te4kr609gcawutmrza0j4xv80jy8z306fyu` on Bitcoin and
`HAgk14JpMQLgt6rVgv7cBQFJWFto5Dqxi472uT3DKpqk` on Solana, which is what
Electrum and Phantom give for it.
