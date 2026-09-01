/* popup.js — the wallet's one room.

   What is where:
     chrome.storage.local    vault (encrypted phrase), settings, sent txs
     chrome.storage.session  the unlocked phrase, memory only, cleared by lock or by closing Chrome
     nowhere else            the password. It is used to open the vault and dropped.
   Chains and their adapters live in chains.js. Opened as a plain page for
   testing, the same code falls back to localStorage / sessionStorage, which is
   fine for a testnet and for nothing else. */
(async function () {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const isExt = typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local;
  const store = {
    get: async k => isExt ? (await chrome.storage.local.get(k))[k] : JSON.parse(localStorage.getItem('vw.' + k) || 'null'),
    set: async (k, v) => isExt ? chrome.storage.local.set({ [k]: v }) : localStorage.setItem('vw.' + k, JSON.stringify(v)),
    del: async k => isExt ? chrome.storage.local.remove(k) : localStorage.removeItem('vw.' + k),
  };
  const session = {
    get: async k => isExt && chrome.storage.session ? (await chrome.storage.session.get(k))[k] : JSON.parse(sessionStorage.getItem('vw.' + k) || 'null'),
    set: async (k, v) => isExt && chrome.storage.session ? chrome.storage.session.set({ [k]: v }) : sessionStorage.setItem('vw.' + k, JSON.stringify(v)),
    del: async k => isExt && chrome.storage.session ? chrome.storage.session.remove(k) : sessionStorage.removeItem('vw.' + k),
  };
  const ERC20 = ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)', 'function symbol() view returns (string)', 'function transfer(address to, uint256 amount) returns (bool)'];

  let settings = Object.assign({ network: 'sepolia', account: 0, accounts: 1, autolock: 15, tokens: {}, rpcs: {}, txs: [] }, (await store.get('settings')) || {});
  if (typeof settings.network === 'number') settings.network = (NETWORKS.find(n => n.chainId === settings.network) || NETWORKS[0]).id;
  const save = () => store.set('settings', settings);
  let phrase = null, provider = null, refreshTimer = null;
  const net = () => NETWORKS.find(n => n.id === settings.network) || NETWORKS[0];
  const kind = () => net().kind;
  const rpc = () => settings.rpcs[settings.network] || net().rpc;
  const msg = (t, cls = '') => { const m = $('#msg'); m.textContent = t; m.className = cls; };
  const short = a => a.length > 14 ? a.slice(0, 6) + '…' + a.slice(-4) : a;
  const acct = (i = settings.account) => kind() === 'evm' ? ethers.HDNodeWallet.fromPhrase(phrase, '', `m/44'/60'/0'/0/${i}`) : Families[kind()].derive(phrase, i, net());
  const fmtNum = n => n === 0 ? '0' : n < 0.0001 ? '<0.0001' : n < 1 ? n.toFixed(6).replace(/0+$/, '') : n.toLocaleString(undefined, { maximumFractionDigits: 4 });
  const fmt = (v, d = 18) => fmtNum(+ethers.formatUnits(v, d));
  const txLink = h => `${net().explorer}/tx/${h}${net().txSuffix || ''}`;

  /* --------------------------------------------------------------- screens */
  const show = id => { $$('.screen').forEach(s => s.classList.toggle('on', s.id === 's-' + id)); };
  $$('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
  $$('nav button').forEach(b => b.onclick = () => { $$('nav button').forEach(x => x.classList.toggle('on', x === b)); $$('.tab').forEach(t => t.classList.toggle('on', t.id === 't-' + b.dataset.tab)); if (b.dataset.tab === 'receive') drawQR(); });
  const groups = { 'Testnets': n => /testnet|devnet/i.test(n.name), 'Ethereum and EVM chains': n => n.kind === 'evm', 'Bitcoin and Litecoin': n => n.kind === 'utxo', 'Solana': n => n.kind === 'sol' };
  { const sel = $('#network'), seen = new Set(); for (const [label, test] of Object.entries(groups)) { const g = document.createElement('optgroup'); g.label = label; for (const n of NETWORKS) if (!seen.has(n.id) && test(n)) { seen.add(n.id); g.append(new Option(n.name, n.id)); } sel.append(g); } sel.value = settings.network; }
  $('#network').onchange = async () => { settings.network = $('#network').value; await save(); provider = null; buildAccounts(); refresh(); };

  let newPhrase = null;
  async function go(id) {
    if (id === 'create') { newPhrase = ethers.Wallet.createRandom().mnemonic.phrase; $('#new-phrase').innerHTML = newPhrase.split(' ').map((w, i) => `<span><i>${i + 1}</i>${w}</span>`).join(''); }
    show(id);
  }
  const createOk = () => { $('#c-go').disabled = !($('#c-ok').checked && $('#c-pw').value.length >= 8 && $('#c-pw').value === $('#c-pw2').value); };
  ['#c-ok', '#c-pw', '#c-pw2'].forEach(s => $(s).oninput = createOk);
  $('#c-go').onclick = () => setup(newPhrase, $('#c-pw').value);
  $('#i-go').onclick = () => { const p = $('#i-phrase').value.trim().toLowerCase().split(/\s+/).join(' ');
    if (!ethers.Mnemonic.isValidMnemonic(p)) return msg('That is not a valid seed phrase.', 'bad'); if ($('#i-pw').value.length < 8) return msg('Password: eight characters at least.', 'bad'); setup(p, $('#i-pw').value); };
  async function setup(p, pw) { msg('Sealing…'); const box = await Vault.seal(pw, { phrase: p }); await store.set('vault', box); newPhrase = null; $('#c-pw').value = $('#c-pw2').value = $('#i-pw').value = $('#i-phrase').value = ''; await unlocked(p); }
  $('#u-go').onclick = unlock; $('#u-pw').onkeydown = e => { if (e.key === 'Enter') unlock(); };
  async function unlock() { const box = await store.get('vault'); $('#u-msg').textContent = 'Opening…';
    try { const { phrase: p } = await Vault.open($('#u-pw').value, box); $('#u-pw').value = ''; $('#u-msg').textContent = ''; await unlocked(p); }
    catch (e) { $('#u-msg').textContent = 'Wrong password.'; } }
  async function unlocked(p) { phrase = p; await session.set('phrase', p); arm(); buildAccounts(); show('main'); msg(''); refresh(); }
  function arm() { if (isExt && chrome.runtime) chrome.runtime.sendMessage({ type: 'arm', minutes: settings.autolock }).catch(() => {}); }
  async function lock() { phrase = null; provider = null; await session.del('phrase'); if (isExt && chrome.runtime) chrome.runtime.sendMessage({ type: 'disarm' }).catch(() => {}); show('unlock'); }
  $('#lock').onclick = lock;

  /* ---------------------------------------------------------------- main */
  function buildAccounts() { const sel = $('#account'); sel.innerHTML = ''; for (let i = 0; i < settings.accounts; i++) sel.append(new Option(`Account ${i + 1} · ${short(acct(i).address)}`, i)); sel.value = settings.account; }
  $('#account').onchange = async () => { settings.account = +$('#account').value; await save(); refresh(); };
  $('#add-account').onclick = async () => { settings.accounts++; settings.account = settings.accounts - 1; await save(); buildAccounts(); refresh(); msg('Account added. Same phrase, next path, on every chain.'); };
  $('#copy').onclick = () => { navigator.clipboard.writeText(acct().address); msg('Address copied.', 'ok'); };
  function getProvider() { if (!provider) provider = new ethers.JsonRpcProvider(rpc(), net().chainId, { staticNetwork: true }); return provider; }
  async function balanceOf(a) { if (kind() === 'evm') return fmt(await getProvider().getBalance(a.address)); return fmtNum(+Families[kind()].whole(await Families[kind()].balance(a))); }
  async function refresh() { if (!phrase) return; const a = acct(), n = net(); $('#address').textContent = a.address; $('#recv-addr').textContent = a.address; $('#symbol').textContent = n.symbol; $('#balance').textContent = '…';
    $('#fiat').textContent = /testnet|devnet/i.test(n.name) ? 'Test network. Faucets hand these out; they are worth nothing, which is the point.' : n.kind === 'utxo' ? `Native segwit, m/84'/${n.coin}'/0'/0/${settings.account}` : n.kind === 'sol' ? `SLIP-10, m/44'/501'/${settings.account}'/0'` : `m/44'/60'/0'/0/${settings.account}`;
    $('#autolock').value = settings.autolock; $('#rpc').value = settings.rpcs[settings.network] || ''; $('#rpc').placeholder = n.rpc || n.api; $('#rpc').parentElement.style.display = n.kind === 'utxo' ? 'none' : '';
    $('#tok-row').style.display = n.kind === 'evm' ? '' : 'none'; $('#tokens').style.display = n.kind === 'evm' ? '' : 'none'; $('#no-tokens').style.display = n.kind === 'evm' ? 'none' : '';
    try { $('#balance').textContent = await balanceOf(a); } catch (e) { $('#balance').textContent = '?'; msg('Cannot reach the network: ' + (e.shortMessage || e.message), 'bad'); }
    buildSendAssets(); refreshTokens(); refreshTxs(); clearTimeout(refreshTimer); refreshTimer = setTimeout(refresh, 20000); }

  /* -------------------------------------------------------------- tokens */
  const tokens = () => kind() === 'evm' ? settings.tokens[settings.network] || [] : [];
  async function refreshTokens() { const box = $('#tokens'); box.innerHTML = ''; if (kind() !== 'evm') return; const a = acct();
    for (const t of tokens()) { const row = document.createElement('div'); row.className = 'item'; row.innerHTML = `<div><b>${t.symbol}</b><br><small>${short(t.address)}</small></div><div style="text-align:right"><span>…</span><br><small><a href="#" data-rm="${t.address}">remove</a></small></div>`; box.append(row);
      try { const c = new ethers.Contract(t.address, ERC20, getProvider()); row.querySelector('span').textContent = fmt(await c.balanceOf(a.address), t.decimals); } catch (e) { row.querySelector('span').textContent = '?'; } }
    box.querySelectorAll('[data-rm]').forEach(el => el.onclick = async e => { e.preventDefault(); settings.tokens[settings.network] = tokens().filter(t => t.address !== el.dataset.rm); await save(); refresh(); }); }
  $('#tok-add').onclick = async () => { const a = $('#tok-addr').value.trim(); if (!ethers.isAddress(a)) return msg('Not an address.', 'bad'); msg('Reading the contract…');
    try { const c = new ethers.Contract(a, ERC20, getProvider()); const [symbol, decimals] = await Promise.all([c.symbol(), c.decimals()]); (settings.tokens[settings.network] = tokens().filter(t => t.address.toLowerCase() !== a.toLowerCase())).push({ address: ethers.getAddress(a), symbol, decimals: Number(decimals) }); await save(); $('#tok-addr').value = ''; msg(`${symbol} added.`, 'ok'); refresh(); }
    catch (e) { msg('That address does not answer like an ERC-20 on this network.', 'bad'); } };

  /* ---------------------------------------------------------------- send */
  function buildSendAssets() { const s = $('#send-asset'); const cur = s.value; s.innerHTML = ''; s.append(new Option(net().symbol, 'native')); for (const t of tokens()) s.append(new Option(t.symbol, t.address)); if ([...s.options].some(o => o.value === cur)) s.value = cur; }
  const validTo = to => kind() === 'evm' ? ethers.isAddress(to) : Families[kind()].isAddress(to, net());
  async function quote() { const to = $('#send-to').value.trim(), amt = $('#send-amt').value.trim(), asset = $('#send-asset').value; if (!validTo(to) || !amt || isNaN(+amt) || +amt <= 0) return null;
    const a = acct(), sym = asset === 'native' ? net().symbol : tokens().find(x => x.address === asset).symbol;
    if (kind() !== 'evm') { const q = await Families[kind()].quote(a, to, amt); return { ...q, kind: kind(), a, amt, sym, to }; }
    const p = getProvider(), w = a.connect(p), fee = await p.getFeeData(); let tx;
    if (asset === 'native') tx = { to, value: ethers.parseEther(amt) };
    else { const t = tokens().find(x => x.address === asset); const c = new ethers.Contract(t.address, ERC20, w); tx = await c.transfer.populateTransaction(to, ethers.parseUnits(amt, t.decimals)); }
    const gas = await p.estimateGas({ ...tx, from: w.address }); const price = fee.maxFeePerGas || fee.gasPrice || 0n;
    return { kind: 'evm', tx, gas, w, amt, sym, to, feeText: `${fmt(gas * price)} ${net().symbol} (${gas} gas)` }; }
  let quoting = null;
  const requote = async () => { $('#send-fee').textContent = ''; try { quoting = await quote(); if (quoting) $('#send-fee').textContent = 'Network fee about ' + quoting.feeText; } catch (e) { quoting = null; $('#send-fee').textContent = 'Cannot estimate: ' + (e.shortMessage || e.message); } };
  ['#send-to', '#send-amt', '#send-asset'].forEach(s => $(s).onchange = requote);
  $('#send-go').onclick = async () => { await requote(); const q = quoting; if (!q) return msg('Check the address and the amount.', 'bad');
    if (!confirm(`Send ${q.amt} ${q.sym} to ${q.to} on ${net().name}?\nFee about ${q.feeText}. This cannot be undone.`)) return;
    msg('Signing and sending…');
    try { let hash; if (q.kind === 'evm') { const sent = await q.w.sendTransaction({ ...q.tx, gasLimit: q.gas * 12n / 10n }); hash = sent.hash; sent.wait().then(() => { msg('Confirmed: ' + short(hash), 'ok'); refresh(); }).catch(() => {}); }
      else hash = await Families[q.kind].send(q.a, q);
      settings.txs.unshift({ hash, net: settings.network, to: q.to, amt: q.amt, sym: q.sym, t: Date.now() }); settings.txs.length = Math.min(settings.txs.length, 50); await save();
      msg(`Sent. ${short(hash)}`, 'ok'); $('#send-amt').value = ''; $('#send-fee').textContent = ''; refreshTxs(); if (q.kind !== 'evm') setTimeout(refresh, 8000); }
    catch (e) { msg('Not sent: ' + (e.shortMessage || e.message), 'bad'); } };
  function refreshTxs() { const list = settings.txs.filter(t => t.net === settings.network); $('#txs-empty').style.display = list.length ? 'none' : ''; $('#txs').innerHTML = list.map(t => `<div class="item"><div><b>${t.amt} ${t.sym}</b><br><small>to ${short(t.to)} · ${new Date(t.t).toLocaleString()}</small></div><div><a href="${txLink(t.hash)}" target="_blank" rel="noopener">${short(t.hash)}</a></div></div>`).join(''); }

  /* ------------------------------------------------------------ settings */
  $('#autolock').onchange = async () => { settings.autolock = Math.max(1, +$('#autolock').value || 15); await save(); arm(); };
  $('#rpc').onchange = async () => { const v = $('#rpc').value.trim(); if (v && !/^https:\/\//.test(v)) return msg('RPC must be https.', 'bad'); if (v) settings.rpcs[settings.network] = v; else delete settings.rpcs[settings.network]; await save(); provider = null; refresh(); };
  $('#reveal').onclick = () => { $('#reveal-box').style.display = $('#reveal-box').style.display === 'none' ? '' : 'none'; $('#r-phrase').innerHTML = ''; };
  $('#r-go').onclick = async () => { try { const { phrase: p } = await Vault.open($('#r-pw').value, await store.get('vault')); $('#r-pw').value = ''; $('#r-phrase').innerHTML = p.split(' ').map((w, i) => `<span><i>${i + 1}</i>${w}</span>`).join(''); } catch (e) { msg('Wrong password.', 'bad'); } };
  $('#wipe').onclick = async () => { if (!confirm('Forget this wallet on this machine? Only the seed phrase brings it back.')) return; if (prompt('Type FORGET to confirm') !== 'FORGET') return; await store.del('vault'); await store.del('settings'); await session.del('phrase'); phrase = null; settings = { network: 'sepolia', account: 0, accounts: 1, autolock: 15, tokens: {}, rpcs: {}, txs: [] }; show('welcome'); };

  /* ------------------------------------------------------------- receive
     A small QR: version 3, byte mode, error level L, 53 usable bytes. Every
     address here fits. No library. */
  function drawQR() { const box = $('#qr'); box.innerHTML = ''; const cv = document.createElement('canvas'); const m = qr(acct().address); const n = m.length, sc = 4; cv.width = cv.height = n * sc; const g = cv.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, cv.width, cv.height); g.fillStyle = '#000'; for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) g.fillRect(x * sc, y * sc, sc, sc); box.append(cv); }
  function qr(text) {
    const V = 3, N = 17 + 4 * V, DATA = 55, EC = 15; const bytes = new TextEncoder().encode(text); if (bytes.length > DATA - 2) throw new Error('too long');
    const bits = []; const put = (v, k) => { for (let i = k - 1; i >= 0; i--) bits.push((v >> i) & 1); }; put(4, 4); put(bytes.length, 8); bytes.forEach(b => put(b, 8)); put(0, Math.min(4, DATA * 8 - bits.length)); while (bits.length % 8) bits.push(0);
    const data = []; for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2)); for (let p = 0; data.length < DATA; p ^= 1) data.push(p ? 0x11 : 0xec);
    const exp = [], log = []; for (let i = 0, x = 1; i < 256; i++) { exp[i] = x; log[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; } const mul = (a, b) => a && b ? exp[(log[a] + log[b]) % 255] : 0;
    let gen = [1]; for (let i = 0; i < EC; i++) { const ng = new Array(gen.length + 1).fill(0); for (let j = 0; j < gen.length; j++) { ng[j] ^= gen[j]; ng[j + 1] ^= mul(gen[j], exp[i]); } gen = ng; }
    const rem = data.slice(); rem.push(...new Array(EC).fill(0)); for (let i = 0; i < DATA; i++) { const c = rem[i]; if (c) for (let j = 0; j < gen.length; j++) rem[i + j] ^= mul(gen[j], c); } const all = data.concat(rem.slice(DATA));
    const M = Array.from({ length: N }, () => new Array(N).fill(null)); const set = (x, y, v) => { M[y][x] = v ? 1 : 0; };
    const finder = (x0, y0) => { for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) { const X = x0 + x, Y = y0 + y; if (X < 0 || Y < 0 || X >= N || Y >= N) continue; const on = x >= 0 && x <= 6 && y >= 0 && y <= 6 && (x === 0 || x === 6 || y === 0 || y === 6 || (x >= 2 && x <= 4 && y >= 2 && y <= 4)); set(X, Y, on); } };
    finder(0, 0); finder(N - 7, 0); finder(0, N - 7); for (let i = 8; i < N - 8; i++) { set(i, 6, i % 2 === 0); set(6, i, i % 2 === 0); }
    const ax = N - 7; for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) set(ax + x, ax + y, Math.max(Math.abs(x), Math.abs(y)) !== 1);
    const fb = 0b111011111000100, gb = i => (fb >> i) & 1; // format info for EC level L, mask 0; bit 0 is the least significant
    for (let i = 0; i <= 5; i++) set(8, i, gb(i)); set(8, 7, gb(6)); set(8, 8, gb(7)); set(7, 8, gb(8)); for (let i = 9; i <= 14; i++) set(14 - i, 8, gb(i));
    for (let i = 0; i <= 7; i++) set(N - 1 - i, 8, gb(i)); for (let i = 8; i <= 14; i++) set(8, N - 15 + i, gb(i)); set(8, N - 8, 1);
    let bi = 0; const total = all.length * 8; for (let col = N - 1; col > 0; col -= 2) { if (col === 6) col--; const upward = ((col + 1) & 2) === 0; for (let r = 0; r < N; r++) { const y = upward ? N - 1 - r : r; for (const x of [col, col - 1]) { if (M[y][x] !== null) continue; const bit = bi < total ? (all[bi >> 3] >> (7 - (bi & 7))) & 1 : 0; bi++; M[y][x] = bit ^ ((x + y) % 2 === 0 ? 1 : 0); } } }
    return M.map(r => r.map(v => v || 0)); }

  /* ---------------------------------------------------------------- boot */
  const vault = await store.get('vault');
  if (!vault) show('welcome'); else { const p = await session.get('phrase'); if (p) { phrase = p; arm(); buildAccounts(); show('main'); refresh(); } else show('unlock'); }
  if (!isExt) msg('Running as a plain page: storage is this origin\'s localStorage. Fine for a testnet, nothing else.');
})();
