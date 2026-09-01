/* sw.js — auto-lock. The popup keeps the unlocked phrase in session storage
   (memory only, gone when the browser closes); this worker clears it when the
   lock alarm fires. It never sees a password and never reads the phrase. */
chrome.alarms.onAlarm.addListener(a => { if (a.name === 'lock') chrome.storage.session.remove(['phrase']); });
chrome.runtime.onMessage.addListener((m, _s, reply) => {
  if (m && m.type === 'arm') { chrome.alarms.create('lock', { delayInMinutes: Math.max(1, m.minutes || 15) }); reply && reply({ ok: true }); }
  if (m && m.type === 'disarm') { chrome.alarms.clear('lock'); reply && reply({ ok: true }); }
});
