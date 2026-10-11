/* Demo only: rewrites {{D+n}} / {{NOW}} placeholders in the sample data so the demo always looks current. */
(function () {
  var realFetch = window.fetch.bind(window);
  function iso(offset) { var d = new Date(); d.setDate(d.getDate() + offset); var m = d.getMonth() + 1, day = d.getDate(); return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day; }
  window.fetch = function (input, init) {
    var url = typeof input === 'string' ? input : (input && input.url) || '';
    if (/data\/reports\/\d{4}-\d{2}-\d{2}\.json/.test(url)) { input = url = url.replace(/\d{4}-\d{2}-\d{2}\.json/, 'today.json'); }
    if (/(^|\/)data\/.*\.json/.test(url)) {
      return realFetch(input, init).then(function (res) {
        if (!res.ok) return res;
        return res.text().then(function (t) {
          t = t.replace(/\{\{D([+-]\d+)\}\}/g, function (_, n) { return iso(parseInt(n, 10)); })
               .replace(/\{\{NOW\}\}/g, function () { var d = new Date(); d.setHours(9, 0, 0, 0); return d.toISOString(); });
          return new Response(t, { status: 200, headers: { 'Content-Type': 'application/json' } });
        });
      });
    }
    if (/^api\/save\//.test(url)) return Promise.resolve(new Response('{}', { status: 404 }));
    return realFetch(input, init);
  };
  document.addEventListener('DOMContentLoaded', function () {
    var b = document.createElement('div');
    b.setAttribute('role', 'note');
    b.style.cssText = 'position:sticky;top:0;z-index:999;background:#f2c14e;color:#1d1a12;font:600 13px/1.4 Inter,system-ui,sans-serif;padding:8px 16px;text-align:center';
    b.innerHTML = 'Live demo with fictional sample data — edits stay in your browser. <a href="../" style="color:inherit;text-decoration:underline">Back to the case study</a>';
    document.body.insertBefore(b, document.body.firstChild);
    var hide = function () { document.querySelectorAll('a[href="files.html"]').forEach(function (a) { a.style.display = 'none'; }); };
    hide(); new MutationObserver(hide).observe(document.body, { childList: true, subtree: true });
  });
})();
