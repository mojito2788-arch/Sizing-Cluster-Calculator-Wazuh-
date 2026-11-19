(() => {
  const allowed = ['cluster-sizing-local-v2', 'cluster-approved-defaults-v2', 'cluster-theme'];
  const set = Storage.prototype.setItem;
  for (const key of allowed) {
    if (typeof window.__savedSettings[key] === 'string') set.call(localStorage, key, window.__savedSettings[key]);
  }
  delete window.__savedSettings;
  Storage.prototype.setItem = function(key, value) {
    set.call(this, key, value);
    if (this === localStorage && allowed.includes(String(key))) {
      const snapshot = Object.fromEntries(allowed.map(k => [k, localStorage.getItem(k)]).filter(([,v]) => v !== null));
      window.webkit.messageHandlers.settings.postMessage(snapshot);
    }
  };
})();
