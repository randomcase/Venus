/* vault.js — the only place the seed phrase is turned into bytes at rest.

   PBKDF2-SHA256 (600k rounds) stretches the password into an AES-256-GCM key;
   the phrase (and the account count) are sealed under a fresh salt and IV each
   time. Nothing here touches the network and nothing here logs. */
const Vault = (() => {
  const enc = new TextEncoder(), dec = new TextDecoder();
  const b64 = b => btoa(String.fromCharCode(...new Uint8Array(b)));
  const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
  async function key(pw, salt, iter) {
    const km = await crypto.subtle.importKey('raw', enc.encode(pw), 'PBKDF2', false, ['deriveKey']);
    return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: iter, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
  }
  async function seal(pw, obj) {
    const salt = crypto.getRandomValues(new Uint8Array(16)), iv = crypto.getRandomValues(new Uint8Array(12)), iter = 600000;
    const k = await key(pw, salt, iter);
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, enc.encode(JSON.stringify(obj)));
    return { v: 1, kdf: 'PBKDF2-SHA256', iter, salt: b64(salt), iv: b64(iv), ct: b64(ct) };
  }
  async function open(pw, box) {
    const k = await key(pw, unb64(box.salt), box.iter);
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: unb64(box.iv) }, k, unb64(box.ct));
    return JSON.parse(dec.decode(pt));
  }
  return { seal, open };
})();
