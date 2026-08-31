/* ═══════════════════════════════════════════════════════════════════════════
   DEV MODE — a hand in the page, on the same channel as the automat.

   Inert unless the URL carries ?dev. Same reasoning as automat.js: CSS reads
   the fragment, CSS cannot read the query string, so the query is where a
   script gets switched on without the stylesheet ever learning that scripts
   exist. ?dev and ?run compose — page.html?run&dev is a board being driven
   with the panel open over it.

   ─────────────────────────────────────────────────────────────── WHAT IT DOES
   Four tools, and every one of them is the same tool: put something into a
   live page and see what the cascade does with it, before you commit a line.

     CSS      a textarea that IS a stylesheet. It is injected LAST, after every
              rule the page ships, so on equal specificity it wins — which is
              how you find out whether your rule loses on specificity or was
              simply never true. The yard learned that one the hard way, in
              ecosystem.html, where a blanket stop rule at (1,3,0) lost silently
              to every capability rule at (2,4,0) and the arithmetic is still
              nailed to the foot of that stylesheet as a warning.

     HTML     a selector and a fragment. Append into it, or replace it. State in
              this yard is structural — a checkbox that exists is a checkbox
              that counts — so adding a node is adding a term to the arithmetic,
              and you can watch the counters move as you do it.

     PROBE    click anything. You get its path, and then every rule in the
              page's own stylesheets that MATCHES it, in cascade order with
              specificity computed. On a board where the logic is the selectors,
              this is the debugger.

     CENSUS   what the page is made of: rules, :has() rules, counter
              declarations, radios, boxes, fragments.

   Nothing is fetched, nothing is uploaded, nothing is written to disk. The CSS
   you type is kept in sessionStorage so a reload does not eat it, and that is
   the only thing on this page that outlives a paint. Clear it with WIPE.

   Classic script. No module, no build, works from file://.
   ═══════════════════════════════════════════════════════════════════════════ */
(function () {
  'use strict';
  if (!/[?&]dev(=|&|$)/.test(String(location.search || ''))) return;

  var D = document, KEY = 'venus.dev.css';
  var slice = function (l) { return Array.prototype.slice.call(l); };
  var esc = function (s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };

  /* ───────────────────────────────────────────────── 1 · the injected sheet
     Appended to <head> last, so it is last in cascade order. That is the whole
     reason it can be trusted to tell you the truth about a rule: if what you
     typed still does not apply, the loss was specificity, not order. */
  var sheet = D.createElement('style');
  sheet.id = 'venus-dev-sheet';
  D.head.appendChild(sheet);

  /* ─────────────────────────────────────────────────── 2 · specificity, real
     (id, class+attr+pseudo-class, type+pseudo-element). Counted the way the
     spec counts it, including the one that catches people out: :has() and :is()
     contribute the specificity of their most specific argument, and :not() the
     same, while :where() contributes nothing at all. */
  function spec(sel) {
    var s = String(sel), a = 0, b = 0, c = 0;
    s = s.replace(/:where\([^()]*(\([^()]*\))?[^()]*\)/g, ' ');
    var fn = /:(?:has|is|not|matches|any)\(/g, m;
    while ((m = fn.exec(s))) {                       /* pull the argument out */
      var i = fn.lastIndex, d = 1, j = i;
      while (j < s.length && d) { if (s[j] === '(') d++; if (s[j] === ')') d--; j++; }
      var inner = s.slice(i, j - 1), best = [0, 0, 0];
      inner.split(',').forEach(function (p) {
        var v = spec(p);
        if (v[0] * 1e4 + v[1] * 1e2 + v[2] > best[0] * 1e4 + best[1] * 1e2 + best[2]) best = v;
      });
      a += best[0]; b += best[1]; c += best[2];
      s = s.slice(0, m.index) + ' ' + s.slice(j);
      fn.lastIndex = 0;
    }
    a += (s.match(/#[\w-]+/g) || []).length;
    b += (s.match(/\.[\w-]+/g) || []).length +
         (s.match(/\[[^\]]*\]/g) || []).length +
         (s.match(/:(?!:)[\w-]+/g) || []).length;
    c += (s.match(/::[\w-]+/g) || []).length +
         (s.replace(/::?[\w-]+(\([^)]*\))?/g, ' ').replace(/[#.][\w-]+/g, ' ')
            .match(/(^|[\s>+~,(])([a-zA-Z][\w-]*)/g) || []).length;
    return [a, b, c];
  }

  /* ─────────────────────────────────────── 3 · every rule the page ships
     Walked once, flattened out of @media and @supports, in source order —
     which is cascade order for everything at the same specificity. */
  var RULES = (function () {
    var out = [];
    function walk(list, at) {
      slice(list || []).forEach(function (r) {
        if (r.type === 1 && r.selectorText) {                    /* style rule */
          r.selectorText.split(',').forEach(function (sel) {
            sel = sel.trim();
            if (sel) out.push({ sel: sel, css: r.style.cssText, at: at });
          });
        } else if (r.cssRules) {
          walk(r.cssRules, (r.conditionText ? '@' + (r.media ? 'media' : 'supports') +
                            ' ' + r.conditionText : at));
        }
      });
    }
    slice(D.styleSheets).forEach(function (ss) {
      if (ss.ownerNode && ss.ownerNode.id === 'venus-dev-sheet') return;
      if (ss.ownerNode && ss.ownerNode.id === 'venus-dev-css') return;
      try { walk(ss.cssRules, ''); } catch (e) { /* cross-origin; there are none */ }
    });
    return out;
  }());

  function path(el) {
    var out = [], n = el, hops = 0;
    while (n && n.nodeType === 1 && hops < 5) {
      var s = n.tagName.toLowerCase();
      if (n.id) { out.unshift(s + '#' + n.id); break; }
      if (n.className && typeof n.className === 'string') {
        s += '.' + n.className.trim().split(/\s+/).slice(0, 3).join('.');
      }
      out.unshift(s); n = n.parentNode; hops++;
    }
    return out.join(' ');
  }

  /* ────────────────────────────────────────────────────────── 4 · the panel */
  var css = D.createElement('style');
  css.textContent = [
    '#vdev{position:fixed;right:12px;top:12px;bottom:12px;z-index:2147483001;',
      'width:352px;max-width:calc(100vw - 24px);display:flex;flex-direction:column;',
      'font:11px/1.55 ui-monospace,SFMono-Regular,Menlo,monospace;color:#e2e8ef;',
      'background:rgba(8,11,16,.955);border:1px solid #2b3644;border-radius:12px;',
      'box-shadow:0 14px 48px rgba(0,0,0,.62);overflow:hidden;',
      'backdrop-filter:blur(7px);-webkit-backdrop-filter:blur(7px)}',
    '#vdev *{box-sizing:border-box}',
    '#vdev .hd{display:flex;gap:8px;align-items:baseline;padding:9px 11px;',
      'border-bottom:1px solid #2b3644;cursor:move;user-select:none}',
    '#vdev .hd b{font-size:10px;letter-spacing:.2em;color:#6ec6ff}',
    '#vdev .hd s{margin-left:auto;text-decoration:none;color:#67788a;cursor:pointer}',
    '#vdev .tb{display:flex;border-bottom:1px solid #2b3644}',
    '#vdev .tb button{flex:1;cursor:pointer;font:8.5px/1 inherit;letter-spacing:.13em;',
      'padding:8px 0;border:0;border-right:1px solid #2b3644;background:transparent;',
      'color:#67788a}',
    '#vdev .tb button:last-child{border-right:0}',
    '#vdev .tb button.on{color:#0a0e13;background:#6ec6ff;font-weight:700}',
    '#vdev .pn{display:none;flex:1;overflow:auto;padding:10px 11px}',
    '#vdev .pn.on{display:block}',
    '#vdev textarea,#vdev input{width:100%;background:#0d131b;color:#e2e8ef;',
      'border:1px solid #2b3644;border-radius:7px;padding:8px 9px;',
      'font:10.5px/1.6 inherit;resize:vertical}',
    '#vdev textarea:focus,#vdev input:focus{outline:0;border-color:#6ec6ff}',
    '#vdev .row{display:flex;gap:6px;margin-top:7px}',
    '#vdev .row button{flex:1;cursor:pointer;font:8.5px/1 inherit;letter-spacing:.11em;',
      'padding:8px 0;border-radius:6px;border:1px solid #2b3644;background:#121821;',
      'color:#9aa8b6}',
    '#vdev .row button:hover{color:#e2e8ef;border-color:#3d4a5c}',
    '#vdev .row button.warn:hover{color:#e0705a;border-color:#e0705a}',
    '#vdev h5{margin:12px 0 5px;font:8.5px/1 inherit;letter-spacing:.17em;',
      'color:#67788a;font-weight:600}',
    '#vdev h5:first-child{margin-top:0}',
    '#vdev .r{padding:6px 0;border-bottom:1px solid #1c242e}',
    '#vdev .r u{text-decoration:none;color:#e0b155;word-break:break-all}',
    '#vdev .r em{font-style:normal;float:right;color:#4fd18b;font-size:9px}',
    '#vdev .r i{display:block;font-style:normal;color:#67788a;font-size:9.5px;',
      'word-break:break-all;margin-top:2px}',
    '#vdev .r s{text-decoration:none;color:#9d8ae0;font-size:9px}',
    '#vdev .kv{display:flex;justify-content:space-between;gap:10px;padding:3px 0;',
      'border-bottom:1px solid #1c242e;color:#8a9aa8}',
    '#vdev .kv b{color:#e2e8ef;font-weight:600}',
    '#vdev .msg{color:#4fd18b;font-size:9.5px;min-height:1.4em;margin-top:6px}',
    '#vdev.min{bottom:auto;width:150px}',
    '#vdev.min .tb,#vdev.min .pn{display:none}',
    '.vdev-hot{outline:2px dashed #6ec6ff !important;outline-offset:1px !important}',
    '@media (max-width:760px){#vdev{left:12px;width:auto}}'
  ].join('');
  D.head.appendChild(css);

  var P = D.createElement('div');
  P.id = 'vdev';
  P.innerHTML =
    '<div class="hd"><b>DEV</b><span id="vd-sub" style="color:#67788a"></span>' +
      '<s id="vd-min">&minus;</s></div>' +
    '<div class="tb">' +
      '<button data-p="css">CSS</button><button data-p="html">HTML</button>' +
      '<button data-p="probe">PROBE</button><button data-p="census">CENSUS</button>' +
    '</div>' +
    '<div class="pn" id="p-css">' +
      '<h5>injected last &middot; wins every tie</h5>' +
      '<textarea id="vd-css" rows="14" spellcheck="false" ' +
        'placeholder="/* live. type a rule. */"></textarea>' +
      '<div class="row"><button id="vd-copy">COPY</button>' +
        '<button id="vd-wipe" class="warn">WIPE</button></div>' +
      '<div class="msg" id="vd-cmsg"></div></div>' +
    '<div class="pn" id="p-html">' +
      '<h5>target</h5><input id="vd-sel" spellcheck="false" value="body">' +
      '<h5>fragment</h5><textarea id="vd-html" rows="8" spellcheck="false" ' +
        'placeholder="&lt;input type=checkbox id=x&gt;&lt;label for=x&gt;new term&lt;/label&gt;"></textarea>' +
      '<div class="row"><button id="vd-app">APPEND</button>' +
        '<button id="vd-pre">PREPEND</button>' +
        '<button id="vd-rep" class="warn">REPLACE</button></div>' +
      '<div class="msg" id="vd-hmsg"></div></div>' +
    '<div class="pn" id="p-probe">' +
      '<div class="row"><button id="vd-arm">ARM &middot; then click anything</button></div>' +
      '<div id="vd-out"><h5>nothing picked yet</h5></div></div>' +
    '<div class="pn" id="p-census"><div id="vd-cen"></div></div>';
  D.body.appendChild(P);

  var $ = function (id) { return D.getElementById(id); };

  /* tabs */
  var tabs = slice(P.querySelectorAll('.tb button'));
  function tab(n) {
    tabs.forEach(function (b) { b.className = b.getAttribute('data-p') === n ? 'on' : ''; });
    slice(P.querySelectorAll('.pn')).forEach(function (p) {
      p.className = 'pn' + (p.id === 'p-' + n ? ' on' : '');
    });
  }
  tabs.forEach(function (b) {
    b.addEventListener('click', function () { tab(b.getAttribute('data-p')); });
  });

  $('vd-min').addEventListener('click', function () {
    P.className = P.className ? '' : 'min';
  });

  /* drag by the header, because it will always be over the thing you want */
  (function () {
    var hd = P.querySelector('.hd'), dx = 0, dy = 0, on = false;
    hd.addEventListener('mousedown', function (e) {
      if (e.target.id === 'vd-min') return;
      on = true; dx = e.clientX - P.offsetLeft; dy = e.clientY - P.offsetTop;
      e.preventDefault();
    });
    D.addEventListener('mousemove', function (e) {
      if (!on) return;
      P.style.left = (e.clientX - dx) + 'px'; P.style.top = (e.clientY - dy) + 'px';
      P.style.right = 'auto'; P.style.bottom = 'auto';
    });
    D.addEventListener('mouseup', function () { on = false; });
  }());

  /* ─────────────────────────────────────────────────────────────── CSS tool */
  var ta = $('vd-css');
  try { ta.value = sessionStorage.getItem(KEY) || ''; } catch (e) {}
  function apply() {
    sheet.textContent = ta.value;
    try { sessionStorage.setItem(KEY, ta.value); } catch (e) {}
    $('vd-cmsg').textContent = ta.value.trim()
      ? sheet.sheet.cssRules.length + ' rule(s) live'
      : '';
  }
  ta.addEventListener('input', apply);
  apply();
  $('vd-copy').addEventListener('click', function () {
    try { navigator.clipboard.writeText(ta.value); $('vd-cmsg').textContent = 'copied'; }
    catch (e) { ta.select(); $('vd-cmsg').textContent = 'selected — copy it'; }
  });
  $('vd-wipe').addEventListener('click', function () {
    ta.value = ''; apply(); $('vd-cmsg').textContent = 'wiped';
  });

  /* ────────────────────────────────────────────────────────────── HTML tool */
  function inject(how) {
    var t;
    try { t = D.querySelector($('vd-sel').value); }
    catch (e) { $('vd-hmsg').textContent = 'bad selector'; return; }
    if (!t) { $('vd-hmsg').textContent = 'no such element'; return; }
    var h = $('vd-html').value;
    if (how === 'rep') t.innerHTML = h;
    else t.insertAdjacentHTML(how === 'app' ? 'beforeend' : 'afterbegin', h);
    $('vd-hmsg').textContent = how + ' → ' + path(t);
    census();
  }
  $('vd-app').addEventListener('click', function () { inject('app'); });
  $('vd-pre').addEventListener('click', function () { inject('pre'); });
  $('vd-rep').addEventListener('click', function () { inject('rep'); });

  /* ───────────────────────────────────────────────────────────── PROBE tool */
  var armed = false, hot = null;
  $('vd-arm').addEventListener('click', function () {
    armed = !armed;
    $('vd-arm').textContent = armed ? 'ARMED · click anything' : 'ARM · then click anything';
    if (!armed && hot) { hot.classList.remove('vdev-hot'); hot = null; }
  });
  D.addEventListener('mouseover', function (e) {
    if (!armed || P.contains(e.target)) return;
    if (hot) hot.classList.remove('vdev-hot');
    hot = e.target; hot.classList.add('vdev-hot');
  }, true);
  D.addEventListener('click', function (e) {
    if (!armed || P.contains(e.target)) return;
    e.preventDefault(); e.stopPropagation();
    show(e.target);
  }, true);

  function show(el) {
    var hits = [];
    RULES.forEach(function (r, ix) {
      try { if (el.matches(r.sel)) hits.push({ r: r, ix: ix, s: spec(r.sel) }); }
      catch (e) {}
    });
    var b = el.getBoundingClientRect();
    var out = '<h5>picked</h5><div class="r"><u>' + esc(path(el)) + '</u>' +
      '<i>' + Math.round(b.width) + ' &times; ' + Math.round(b.height) + ' px' +
      (el.checked !== undefined ? ' &middot; checked=' + el.checked : '') + '</i></div>' +
      '<h5>' + hits.length + ' matching rule(s) &middot; source order</h5>';
    hits.forEach(function (h) {
      out += '<div class="r"><em>' + h.s.join(',') + '</em><u>' + esc(h.r.sel) + '</u>' +
        (h.r.at ? '<s>' + esc(h.r.at) + '</s>' : '') +
        '<i>' + esc(h.r.css.slice(0, 210)) + (h.r.css.length > 210 ? ' …' : '') +
        '</i></div>';
    });
    if (!hits.length) out += '<div class="r"><i>nothing in the page selects it. ' +
      'if you expected a rule here, the selector is wrong — not the cascade.</i></div>';
    $('vd-out').innerHTML = out;
    tab('probe');
  }

  /* ──────────────────────────────────────────────────────────── CENSUS tool */
  function census() {
    var has = 0, ctr = 0, tgt = 0;
    RULES.forEach(function (r) {
      if (r.sel.indexOf(':has(') >= 0) has++;
      if (r.sel.indexOf(':target') >= 0) tgt++;
      if (/counter-(reset|increment|set)/.test(r.css)) ctr++;
    });
    var rows = [
      ['style rules', RULES.length],
      [':has() rules', has],
      [':target rules', tgt],
      ['counter declarations', ctr],
      ['radio groups', (function () {
        var s = {}; slice(D.querySelectorAll('input[type=radio]'))
          .forEach(function (e) { s[e.name] = 1; }); return Object.keys(s).length;
      }())],
      ['checkboxes', D.querySelectorAll('input[type=checkbox]').length],
      ['fragment anchors', D.querySelectorAll('a[href^="#"]').length],
      ['elements', D.getElementsByTagName('*').length],
      ['script tags', D.querySelectorAll('script:not([type])' +
        ',script[type="text/javascript"]').length]
    ];
    $('vd-cen').innerHTML = '<h5>what this page is made of</h5>' +
      rows.map(function (r) {
        return '<div class="kv"><span>' + r[0] + '</span><b>' + r[1] + '</b></div>';
      }).join('') +
      '<h5>note</h5><div class="r"><i>the script count includes automat.js and this ' +
      'panel. Both are inert without a query string, so the page as it is served ' +
      'still decides everything in the stylesheet.</i></div>';
  }
  census();

  $('vd-sub').textContent = RULES.length + ' rules';
  tab('css');
}());
