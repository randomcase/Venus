/* sw.js — the extension's service worker. Two jobs: open the side panel when
   the toolbar button is pressed, and turn "the rains have come" into a system
   notification when the page asks. The game itself never runs here. */
chrome.runtime.onInstalled.addListener(() => {
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {});
});
chrome.runtime.onMessage.addListener((msg) => {
  if (msg && msg.type === 'notify') {
    chrome.notifications.create({ type: 'basic', iconUrl: 'icon.png', title: msg.title, message: msg.body || '' });
  }
});
