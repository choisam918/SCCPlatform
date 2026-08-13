(function () {
  function setAppVh() {
    var height = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-vh', (height * 0.01) + 'px');
  }

  setAppVh();
  window.addEventListener('resize', setAppVh, { passive: true });
  window.addEventListener('orientationchange', function () {
    setTimeout(setAppVh, 250);
  });
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', setAppVh);
  }
})();

window.escapeHtml = function (value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

window.safeAppUrl = function (value) {
  var s = String(value == null ? '' : value).trim();
  if (!s) return '';
  var lower = s.toLowerCase();
  if (lower.indexOf('javascript:') === 0 || lower.indexOf('data:') === 0 || lower.indexOf('vbscript:') === 0) return '';
  if (s.indexOf('//') === 0) return '';
  if (/^[a-z][a-z0-9+.-]*:/i.test(s)) return '';
  if (/[<>"'`]/.test(s)) return '';
  return s;
};
