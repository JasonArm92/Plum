(function () {
  "use strict";

  var KEY = "plum_v18", BAK = "plum_v18_bak", PREFS = "plum_prefs";
  var TOTAL = 934745.32;
  var ROUTE = "home";
  var page = 0;

  function $(s, r) { return (r || document).querySelector(s); }
  function money(n) {
    return "£" + Math.abs(n).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  function signed(n) { return (n < 0 ? "−" : "+") + money(n); }

  /* ---------- seeded prng ---------- */
  function mulberry(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      var t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  /* ---------- merchants ---------- */
  var MERCHANTS = [
    { s: "tesco", n: "Tesco", c: "Groceries", b: [16, 94], cad: "w", dow: 6, w: 9, sea: { 12: 1.4, 11: 1.2 } },
    { s: "sainsburys", n: "Sainsbury's", c: "Groceries", b: [14, 78], cad: "w", dow: 3, w: 5 },
    { s: "lidl", n: "Lidl", c: "Groceries", b: [9, 42], cad: "w", dow: 1, w: 4 },
    { s: "aldi", n: "Aldi", c: "Groceries", b: [8, 38], cad: "w", dow: 4, w: 3 },
    { s: "ocado", n: "Ocado", c: "Groceries", b: [32, 88], cad: "m", w: 2 },
    { s: "pret", n: "Pret A Manger", c: "Eating out", b: [5, 14], cad: "d", w: 5 },
    { s: "greggs", n: "Greggs", c: "Eating out", b: [3, 9], cad: "d", w: 6 },
    { s: "costa", n: "Costa Coffee", c: "Eating out", b: [3, 8], cad: "d", w: 4 },
    { s: "starbucks", n: "Starbucks", c: "Eating out", b: [4, 10], cad: "d", w: 3 },
    { s: "mcdonalds", n: "McDonald's", c: "Eating out", b: [6, 18], cad: "d", w: 3 },
    { s: "nandos", n: "Nando's", c: "Eating out", b: [18, 46], cad: "m", w: 2 },
    { s: "deliveroo", n: "Deliveroo", c: "Eating out", b: [16, 44], cad: "w", dow: 5, w: 5 },
    { s: "amazon", n: "Amazon", c: "Shopping", b: [7, 96], cad: "d", w: 4, sea: { 12: 2.2 } },
    { s: "asos", n: "ASOS", c: "Shopping", b: [22, 88], cad: "m", w: 2 },
    { s: "boots", n: "Boots", c: "Health", b: [5, 34], cad: "m", w: 2 },
    { s: "tfl", n: "TfL", c: "Travel", b: [2.8, 9.6], cad: "d", w: 7 },
    { s: "uber", n: "Uber", c: "Travel", b: [8, 32], cad: "w", dow: 5, w: 3 },
    { s: "trainline", n: "Trainline", c: "Travel", b: [12, 68], cad: "m", w: 2 },
    { s: "shell", n: "Shell", c: "Travel", b: [38, 72], cad: "m", w: 2, fixed: true },
    { s: "bp", n: "BP", c: "Travel", b: [36, 70], cad: "m", w: 1 },
    { s: "spotify", n: "Spotify", c: "Subscriptions", b: [11.99, 11.99], cad: "m", w: 10, fixed: true },
    { s: "netflix", n: "Netflix", c: "Subscriptions", b: [10.99, 10.99], cad: "m", w: 10, fixed: true },
    { s: "apple", n: "Apple", c: "Subscriptions", b: [2.99, 2.99], cad: "m", w: 10, fixed: true },
    { s: "octopus", n: "Octopus Energy", c: "Bills", b: [62, 148], cad: "m", w: 10, fixed: true, sea: { 1: 1.5, 2: 1.5, 12: 1.3 } }
  ];

  /* ---------- seed ---------- */
  function seed() {
    var rnd = mulberry(20260119);
    var now = Date.now();
    var tx = [];
    var id = 1;

    var start = new Date();
    start.setMonth(start.getMonth() - 12);
    start.setHours(0, 0, 0, 0);

    for (var d = new Date(start); d.getTime() < now; d.setDate(d.getDate() + 1)) {
      var m = d.getMonth() + 1;
      var dom = d.getDate();
      var dow = d.getDay();

      for (var i = 0; i < MERCHANTS.length; i++) {
        var x = MERCHANTS[i];
        var p = 0;
        if (x.cad === "d") p = 0.17 * (x.w / 5);
        else if (x.cad === "w") p = dow === x.dow ? 0.62 * (x.w / 6) : 0;
        else if (x.cad === "m") p = dom === ((i % 26) + 2) ? 0.8 : 0;
        if (x.sea && x.sea[m]) p *= x.sea[m];
        if (rnd() > p) continue;

        var lo = x.b[0], hi = x.b[1];
        var amt = x.fixed ? lo : lo + rnd() * (hi - lo);
        if (x.sea && x.sea[m] && !x.fixed) amt *= x.sea[m];
        amt = Math.round(amt * 100) / 100;

        var at = new Date(d);
        at.setHours(6 + Math.floor(rnd() * 16), Math.floor(rnd() * 60), 0, 0);
        if (at.getTime() > now) continue;

        tx.push({ id: id++, t: at.getTime(), s: x.s, n: x.n, c: x.c, a: -amt });
      }

      if (dom === 28) {
        var pay = new Date(d); pay.setHours(7, 4, 0, 0);
        if (pay.getTime() < now) {
          tx.push({ id: id++, t: pay.getTime(), s: "", n: "Kestrel Digital Ltd", c: "Salary", a: 4250 });
        }
      }
    }

    tx.sort(function (a, b) { return b.t - a.t; });
    return tx;
  }

  /* ---------- state ---------- */
  var holdings = [
    { k: "CSPX", n: "iShares Core S&P 500", i: "iShares", v: 168420.55 },
    { k: "VUSA", n: "Vanguard S&P 500", i: "Vanguard", v: 142309.10 },
    { k: "VWRL", n: "Vanguard FTSE All-World", i: "Vanguard", v: 131880.42 },
    { k: "VUAG", n: "Vanguard S&P 500 Acc", i: "Vanguard", v: 98214.66 },
    { k: "IUSA", n: "iShares Core S&P 500 Acc", i: "iShares", v: 84512.30 },
    { k: "EQQQ", n: "Invesco Nasdaq 100", i: "Invesco", v: 76240.18 },
    { k: "VFEM", n: "Vanguard FTSE Emerging", i: "Vanguard", v: 58910.24 },
    { k: "IUKD", n: "iShares UK Dividend", i: "iShares", v: 41205.60 },
    { k: "SMT", n: "Scottish Mortgage", i: "Baillie Gifford", v: 38720.45 },
    { k: "BRKB", n: "Berkshire Hathaway B", i: "Berkshire", v: 27410.90 },
    { k: "AZN", n: "AstraZeneca", i: "AstraZeneca", v: 19880.15 },
    { k: "HSBA", n: "HSBC Holdings", i: "HSBC", v: 14320.40 },
    { k: "ULVR", n: "Unilever", i: "Unilever", v: 11640.28 },
    { k: "VOD", n: "Vodafone", i: "Vodafone", v: 8963.70 }
  ];

  var pockets = [
    { id: 1, em: "🇯🇵", n: "Japan trip", v: 2140.00 },
    { id: 2, em: "🍳", n: "New kitchen", v: 4863.52 },
    { id: 3, em: "🛠️", n: "Emergency fund", v: 1700.00 }
  ];

  var tx = [];
  var cash = 3412.87;

  var prefs = { theme: "auto", logo: null, pin: "1234", bio: true, name: "Jason" };

  var invested = function () {
    return holdings.reduce(function (n, h) { return n + h.v; }, 0);
  };
  var pocketTotal = function () {
    return pockets.reduce(function (n, p) { return n + p.v; }, 0);
  };
  var total = function () { return cash + invested() + pocketTotal(); };

  /* ---------- persistence ---------- */
  function save() {
    try {
      var blob = JSON.stringify({ cash: cash, holdings: holdings, pockets: pockets, tx: tx });
      var old = localStorage.getItem(KEY);
      if (old) localStorage.setItem(BAK, old);
      localStorage.setItem(KEY, blob);
      localStorage.setItem(PREFS, JSON.stringify(prefs));
    } catch (e) {}
  }

  function load() {
    try {
      var p = localStorage.getItem(PREFS);
      if (p) Object.assign(prefs, JSON.parse(p));
    } catch (e) {}
    try {
      var raw = localStorage.getItem(KEY);
      if (raw) {
        var s = JSON.parse(raw);
        if (s && s.tx && s.tx.length) {
          cash = s.cash; holdings = s.holdings; pockets = s.pockets; tx = s.tx;
        }
      }
    } catch (e) {}
    if (!tx.length) { tx = seed(); save(); }
  }

  /* ---------- theme ---------- */
  function resolveTheme() {
    if (prefs.theme === "light" || prefs.theme === "dark") return prefs.theme;
    return matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";
  }
  function paint() {
    document.documentElement.setAttribute("data-theme", resolveTheme());
    if (prefs.logo) document.documentElement.setAttribute("data-logo", prefs.logo);
    else document.documentElement.removeAttribute("data-logo");
  }
  matchMedia("(prefers-color-scheme: light)").addEventListener("change", function () {
    if (prefs.theme === "auto") { paint(); }
  });

  /* ---------- rows ---------- */
  function row(t, opts) {
    opts = opts || {};
    var dt = new Date(t.t);
    var when = dt.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    var clock = dt.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
    return '<div class="row">' +
      logo(t.s, t.n) +
      '<div class="mid"><b>' + t.n + '</b><span>' + when + " · " + clock + " · " + t.c + '</span></div>' +
      '<div class="amt ' + (t.a > 0 ? "pos" : "neg") + '">' + signed(t.a) + '</div>' +
      '</div>';
  }

  function renderTx(list) {
    if (!list.length) return '<p class="muted small">Nothing here yet.</p>';
    return '<div class="rows">' + list.map(row).join("") + "</div>";
  }

  /* ---------- screens ---------- */
  function home() {
    var recent = tx.slice(0, 5);
    return '<div class="hello">' +
        '<span class="mark" aria-hidden="true">' +
          '<img data-v="white" src="icon-white.svg" alt="">' +
          '<img data-v="purple" src="icon-purple.svg" alt="">' +
        '</span>' +
        '<div class="greet"><span>' + greeting() + '</span><b>' + prefs.name + '</b></div>' +
      '</div>' +
      '<div class="eyebrow">Total balance</div>' +
      '<div class="bal mono-num">' + money(total()) + '</div>' +
      '<div class="split">' +
        '<div><span class="eyebrow">Invested</span><b class="mono-num">' + money(invested()) + '</b></div>' +
        '<div><span class="eyebrow">In pockets</span><b class="mono-num">' + money(pocketTotal()) + '</b></div>' +
      '</div>' +
      '<div class="pockets">' +
        pockets.map(function (p) {
          return '<button class="pocket" data-act="pocket" data-id="' + p.id + '">' +
            '<span class="em">' + p.em + '</span><b>' + p.n + '</b>' +
            '<span class="amt mono-num">' + money(p.v) + '</span></button>';
        }).join("") +
        '<button class="pocket add" data-act="newpocket">+<br>New pocket</button>' +
      '</div>' +
      '<div class="brain">' +
        '<div class="eyebrow">Plum Brain</div>' +
        '<h3>You could save ' + money(38.40) + ' this week</h3>' +
        '<p>Two subscriptions renew in the next 7 days. We can move the money aside now.</p>' +
        '<button data-act="brain">Move it</button>' +
      '</div>' +
      '<div class="sec"><h3>Recent activity</h3><a href="#activity" data-act="go" data-r="activity">See all</a></div>' +
      renderTx(recent);
  }

  function greeting() {
    var h = new Date().getHours();
    if (h < 12) return "GOOD MORNING";
    if (h < 18) return "GOOD AFTERNOON";
    return "GOOD EVENING";
  }

  function invest() {
    return '<h1 style="padding:22px 0 4px">Invest</h1>' +
      '<p class="muted small" style="margin:0 0 16px">' + money(invested()) + " invested across " + holdings.length + " funds</p>" +
      '<div class="rows">' +
      holdings.map(function (h) {
        return '<div class="row">' +
          logo("", h.k) +
          '<div class="mid"><b>' + h.k + '</b><span>' + h.n + '</span></div>' +
          '<div class="amt mono-num">' + money(h.v) + '</div>' +
          '<button class="btn sm" style="width:auto;margin:0;padding:8px 13px" data-act="buy" data-k="' + h.k + '">Buy</button>' +
          '</div>';
      }).join("") + '</div>';
  }

  function cards() {
    var cardTx = tx.filter(function (t) { return t.a < 0 && !t.c.match(/Bills|Subscriptions|Salary/); }).slice(0, 8);
    return '<h1 style="padding:22px 0 16px">Cards</h1>' +
      '<div class="plumcard">' +
        '<div class="top"><span>DEBIT</span><span>VISA</span></div>' +
        '<div class="num">•••• •••• •••• 4417</div>' +
        '<div class="foot"><div>JASON ARMSTRONG<span style="display:block">09/29</span></div><span>PLUM</span></div>' +
      '</div>' +
      '<button class="btn">Freeze card</button>' +
      '<button class="btn ghost">Card details</button>' +
      '<div class="sec"><h3>Card activity</h3></div>' +
      renderTx(cardTx);
  }

  function activity() {
    var shown = tx.slice(0, 60 + page * 60);
    var out = '<h1 style="padding:22px 0 16px">Activity</h1>';
    var last = "";
    shown.forEach(function (t) {
      var m = new Date(t.t).toLocaleDateString("en-GB", { month: "long", year: "numeric" });
      if (m !== last) { out += '<div class="eyebrow" style="margin:18px 0 8px">' + m + '</div>'; last = m; }
      out += '<div class="rows" style="margin-bottom:0">' + row(t) + "</div>";
    });
    if (shown.length < tx.length) out += '<button class="btn ghost" style="margin:16px 0" data-act="more">Load more</button>';
    return out;
  }

  function more() {
    return '<h1 style="padding:22px 0 16px">More</h1>' +
      '<div class="group">' +
        '<button class="opt" data-act="go" data-r="appearance">' +
          '<div><div class="t">Appearance</div><div class="s">Theme and mark</div></div>' +
          '<span class="muted">›</span></button>' +
        '<button class="opt" data-act="tier"><div><div class="t">Your plan</div><div class="s">Boost</div></div>' +
          '<span class="muted">›</span></button>' +
        '<button class="opt" data-act="lock"><div><div class="t">Lock app</div><div class="s">PIN or fingerprint</div></div>' +
          '<span class="muted">›</span></button>' +
        '<button class="opt" data-act="reset"><div><div class="t">Rebuild data</div><div class="s">Regenerate 12 months</div></div>' +
          '<span class="muted">›</span></button>' +
      '</div>';
  }

  function appearance() {
    var t = prefs.theme, l = prefs.logo;
    var theme = function (v, label) {
      return '<button class="opt" data-act="theme" data-v="' + v + '" aria-pressed="' + (t === v) + '">' +
        '<div class="t">' + label + '</div><span class="tick"></span></button>';
    };
    var mark = function (v, label) {
      return '<button class="opt" data-act="logo" data-v="' + v + '" aria-pressed="' + (l === v) + '">' +
        '<div class="t">' + label + '</div><span class="tick"></span></button>';
    };
    return '<h1 style="padding:22px 0 16px">Appearance</h1>' +
      '<div class="eyebrow" style="margin-bottom:8px">Theme</div>' +
      '<div class="group">' + theme("auto", "Match device") + theme("dark", "Dark") + theme("light", "Light") + '</div>' +
      '<div class="eyebrow" style="margin-bottom:8px">Mark</div>' +
      '<div class="group">' +
        '<button class="opt" data-act="logo" data-v="auto" aria-pressed="' + (!l) + '">' +
          '<div class="t">Match theme</div><span class="tick"></span></button>' +
        mark("white", "White mark") + mark("purple", "Purple mark") +
      '</div>' +
      '<div class="group"><button class="opt" data-act="bio" aria-pressed="' + prefs.bio + '">' +
        '<div><div class="t">Fingerprint unlock</div><div class="s">Samsung Galaxy S24 Ultra</div></div>' +
        '<span class="toggle"></span></button></div>';
  }

  /* ---------- render ---------- */
  var SCREENS = { home: home, invest: invest, cards: cards, activity: activity, more: more, appearance: appearance };

  function render() {
    try {
      var fn = SCREENS[ROUTE] || home;
      var html = fn();
      if (html === "") return;
      $("#view").innerHTML = html;
      $("#view").scrollTop = 0;
      document.querySelectorAll(".tabs button").forEach(function (b) {
        b.classList.toggle("on", b.dataset.r === ROUTE);
      });
    } catch (err) {
      crash(err);
    }
  }

  function crash(err) {
    var d = document.createElement("div");
    d.id = "crash";
    d.textContent = "Render failed\n\n" + (err && err.stack || err) + "\n\nroute: " + ROUTE + "\nhref: " + location.href;
    document.body.appendChild(d);
  }

  function go(r) { ROUTE = r; page = 0; render(); }

  /* ---------- lock ---------- */
  var buf = "";
  function lock() {
    buf = "";
    var el = document.createElement("div");
    el.id = "lock";
    el.innerHTML =
      '<span class="mark" aria-hidden="true">' +
        '<img data-v="white" src="icon-white.svg" alt="">' +
        '<img data-v="purple" src="icon-purple.svg" alt="">' +
      '</span>' +
      '<h1>Welcome back</h1>' +
      '<div class="pin">' + "<i></i>".repeat(4) + '</div>' +
      '<div class="err"></div>' +
      '<div class="pad">' +
        [1, 2, 3, 4, 5, 6, 7, 8, 9].map(function (n) { return "<button data-d='" + n + "'>" + n + "</button>"; }).join("") +
        '<button data-d="x" aria-label="Delete">⌫</button>' +
        '<button data-d="0">0</button>' +
        '<button data-d="b" aria-label="Fingerprint">☝</button>' +
      '</div>' +
      (prefs.bio ? '<div class="bio">Touch the sensor to unlock</div>' : "");

    el.addEventListener("click", function (e) {
      var b = e.target.closest("[data-d]");
      if (!b) return;
      var d = b.dataset.d;
      if (d === "x") buf = buf.slice(0, -1);
      else if (d === "b") { if (prefs.bio) return unlock(); }
      else if (buf.length < 4) buf += d;

      el.querySelectorAll(".pin i").forEach(function (dot, i) {
        dot.classList.toggle("f", i < buf.length);
      });

      if (buf.length === 4) {
        if (buf === prefs.pin) unlock();
        else {
          el.querySelector(".err").textContent = "Wrong PIN";
          buf = "";
          el.querySelectorAll(".pin i").forEach(function (dot) { dot.classList.remove("f"); });
        }
      }
    });

    document.body.appendChild(el);
  }

  function unlock() {
    var el = $("#lock");
    if (el) el.remove();
  }

  /* ---------- sheet ---------- */
  function sheet(html) {
    var old = $("#sheet");
    if (old) old.remove();
    var el = document.createElement("div");
    el.id = "sheet";
    el.innerHTML = '<div class="in">' + html + '</div>';
    el.addEventListener("click", function (e) { if (e.target === el) el.remove(); });
    document.body.appendChild(el);
    var f = el.querySelector("input");
    if (f) f.focus();
  }

  /* ---------- actions ---------- */
  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-act]");
    if (!b) return;
    var a = b.dataset.act;

    if (a === "go") { go(b.dataset.r); return; }
    if (a === "more") { page++; render(); return; }
    if (a === "lock") { lock(); return; }
    if (a === "brain") { cash += 38.40; save(); render(); return; }

    if (a === "theme") {
      prefs.theme = b.dataset.v;
      if (b.dataset.v !== "auto") prefs.logo = null;
      paint(); save(); render(); return;
    }
    if (a === "logo") {
      prefs.logo = b.dataset.v === "auto" ? null : b.dataset.v;
      paint(); save(); render(); return;
    }
    if (a === "bio") {
      prefs.bio = !prefs.bio; save(); render(); return;
    }

    if (a === "tier") {
      sheet('<h3>Your plan</h3><p class="small muted">Boost — £4.99 a month. Unlimited pockets, fee-free investing and 4.34% interest.</p>' +
        '<button class="btn" data-act="close">Done</button>');
      return;
    }
    if (a === "close") { var s = $("#sheet"); if (s) s.remove(); return; }

    if (a === "reset") {
      tx = seed(); cash = 3412.87; save(); go("home"); return;
    }

    if (a === "newpocket") {
      sheet('<h3>New pocket</h3><input class="field" inputmode="decimal" placeholder="Amount">' +
        '<div class="chips"><button data-p="25">£25</button><button data-p="100">£100</button><button data-p="250">£250</button></div>' +
        '<button class="btn" data-act="savepocket">Create pocket</button>');
      return;
    }
    if (a === "savepocket") {
      var inp = $("#sheet input");
      var v = parseFloat(String(inp && inp.value || "").replace(/[^0-9.]/g, ""));
      if (!v || v > cash) { if (inp) inp.value = ""; return; }
      cash -= v;
      pockets.push({ id: Date.now(), em: "🎯", n: "New pocket", v: v });
      save(); var s2 = $("#sheet"); if (s2) s2.remove(); render(); return;
    }

    if (a === "pocket") {
      var p = pockets.find(function (x) { return String(x.id) === b.dataset.id; });
      if (!p) return;
      sheet('<h3>' + p.em + " " + p.n + '</h3><p class="small muted">' + money(p.v) + ' in this pocket.</p>' +
        '<input class="field" inputmode="decimal" placeholder="Amount">' +
        '<div class="chips"><button data-p="25">£25</button><button data-p="100">£100</button><button data-p="250">£250</button></div>' +
        '<button class="btn" data-act="topup" data-id="' + p.id + '">Add money</button>' +
        '<button class="btn ghost" data-act="withdraw" data-id="' + p.id + '">Withdraw all</button>');
      return;
    }
    if (a === "topup") {
      var inp2 = $("#sheet input");
      var v2 = parseFloat(String(inp2 && inp2.value || "").replace(/[^0-9.]/g, ""));
      if (!v2 || v2 > cash) { if (inp2) inp2.value = ""; return; }
      var p2 = pockets.find(function (x) { return String(x.id) === b.dataset.id; });
      cash -= v2; p2.v += v2;
      save(); var s3 = $("#sheet"); if (s3) s3.remove(); render(); return;
    }
    if (a === "withdraw") {
      var p3 = pockets.find(function (x) { return String(x.id) === b.dataset.id; });
      cash += p3.v; p3.v = 0;
      save(); var s4 = $("#sheet"); if (s4) s4.remove(); render(); return;
    }

    if (a === "buy") {
      sheet('<h3>Buy ' + b.dataset.k + '</h3><input class="field" inputmode="decimal" placeholder="Amount">' +
        '<div class="chips"><button data-p="50">£50</button><button data-p="250">£250</button><button data-p="1000">£1,000</button></div>' +
        '<button class="btn" data-act="dobuy" data-k="' + b.dataset.k + '">Buy</button>');
      return;
    }
    if (a === "dobuy") {
      var inp3 = $("#sheet input");
      var v3 = parseFloat(String(inp3 && inp3.value || "").replace(/[^0-9.]/g, ""));
      if (!v3 || v3 > cash) { if (inp3) inp3.value = ""; return; }
      var h = holdings.find(function (x) { return x.k === b.dataset.k; });
      cash -= v3; h.v += v3;
      save(); var s5 = $("#sheet"); if (s5) s5.remove(); render(); return;
    }
  });

  document.addEventListener("click", function (e) {
    var c = e.target.closest("[data-p]");
    if (!c) return;
    var inp = $("#sheet input");
    if (inp) inp.value = c.dataset.p;
  });

  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { var s = $("#sheet"); if (s) s.remove(); }
  });

  /* ---------- boot ---------- */
  window.__plumErrors = [];
  window.addEventListener("error", function (e) {
    window.__plumErrors.push(e.message + " @ " + e.filename + ":" + e.lineno);
  });

  load();
  paint();
  render();
  lock();
})();
