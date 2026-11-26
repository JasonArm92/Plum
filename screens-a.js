/* src/screens-a.js — daily-use surfaces. */

import {
  getState, esc, fmt, TODAY, THIS_YM, MONTHS, round2, plan,
  balNow, isaBal, growTotal, savingsTotal, homeEquity, connTotal, loanOwed,
  spentThisMonth, spentCat, spentToday, committedLeft, leftToSpend,
  daysToPayday, balanceSeries, tyUsed, TARGET_ISA,
  setHomeEstimate, setTarget, addTx, moveToPot, createPot, updatePot,
  moveLayoutSection, toggleLayoutSection, addStandingOrder, addSharedTab, notif, CATS, FLEX
} from './core.js';

import {
  go, toast, sheet, closeSheet, lineChart, donut, heatmap, logo, kv, badge,
  empty, txRow, potRow, meter, chipRow, accCard, spotCard, sectionHead
} from './ui.js';

/* ---------- home ---------- */
const LAYOUT_NAMES = { spotlights: 'Spotlights', personal: 'Personal account', joint: 'Joint account',
  pots: 'Pots', invest: 'Investments', latest: 'Latest activity' };

const sections = {
  spotlights(){
    const lt = leftToSpend(), d = daysToPayday();
    return `<div class="spot">
      ${spotCard({ label: 'Left to spend', value: fmt(lt),
        note: d === 0 ? 'Payday today' : d + ' days to payday',
        tone: lt < 100 ? 'bad' : lt < 300 ? 'warn' : 'ok', go: 'trends' })}
      ${spotCard({ label: 'Spent today', value: fmt(spentToday()),
        note: 'Across ' + getState().tx.filter(t => t.date === TODAY && t.amt < 0).length + ' payments',
        go: 'acc' })}
      ${spotCard({ label: 'Bills left', value: fmt(committedLeft()), note: 'Before payday', go: 'trends' })}
    </div>`;
  },
  personal(){
    return accCard({ cls: 'coral', label: 'Personal current account', meta: '04-00-04 · 73829104',
      balance: fmt(balNow()), tag: `<span class="badge" style="background:rgba(255,255,255,.24);color:#fff">${plan().name}</span>`,
      go: 'acc' });
  },
  joint(){
    const s = getState();
    const income = s.tx.filter(t => t.date.slice(0, 7) === THIS_YM && t.cat === 'Income')
      .reduce((a, t) => a + t.amt, 0);
    return accCard({ label: 'Joint account', meta: 'With ' + esc(s.partner),
      balance: fmt(round2(income * 0.35)), tag: badge('Joint'), go: 'joint' });
  },
  pots(){
    const s = getState();
    if (!s.pots.length) return '';
    return sectionHead('Pots', 'See all', 'data-go="pots"') +
      `<div class="card" style="padding:6px 18px">${s.pots.slice(0, 2).map(p => potRow(p, plan().ia)).join('')}</div>`;
  },
  invest(){
    return sectionHead('Investments', 'Open', 'data-go="invest"') +
      accCard({ label: 'Stocks &amp; shares ISA', meta: 'Opened 1992', balance: fmt(isaBal()),
        tag: badge('ISA', 'coral'), go: 'invest' });
  },
  latest(){
    const s = getState();
    return sectionHead('Latest', 'Add', 'data-add') +
      `<div class="card" style="padding:4px 14px"><ul class="txlist" id="feed">
        ${s.tx.slice(0, 12).map(txRow).join('')}</ul>
        <button class="btn ghost sm" data-more style="margin:8px 0 12px;width:100%">Load more</button></div>
      <div class="row2" style="margin:12px 0"><button class="btn" data-go="payees">Send money</button>
        <button class="btn ghost" data-go="pots">Move to pot</button></div>`;
  }
};

export function mountHome(root){
  let limit = 12;

  const render = () => {
    const s = getState();
    root.innerHTML = s.layout.filter(x => x.on).map(sec => sections[sec.id] ? sections[sec.id]() : '').join('') +
      `<button class="btn ghost sm" data-layout style="margin:8px 0 20px;width:100%">Edit layout</button>`;
    const feed = root.querySelector('#feed');
    if (feed){
      feed.innerHTML = s.tx.slice(0, limit).map(txRow).join('');
      const more = root.querySelector('[data-more]');
      if (more) more.classList.toggle('hide', limit >= s.tx.length);
    }
  };

  /* the sheet lives outside the screen root, so its controls are bound directly */
  const layoutSheet = () => {
    const s = getState();
    sheet(`<h2>Edit layout</h2><div class="sub">Reorder or hide sections of your Home screen</div>` +
      s.layout.map((sec, i) => `<div class="layoutrow"><span class="mini">${i + 1}</span>
        <span class="mid">${LAYOUT_NAMES[sec.id]}</span>
        <button class="iconbtn" data-up="${sec.id}" aria-label="Up">↑</button>
        <button class="iconbtn" data-down="${sec.id}" aria-label="Down">↓</button>
        <button class="sw ${sec.on ? 'on' : ''}" data-eye="${sec.id}" aria-label="Toggle"></button></div>`).join('') +
      `<button class="btn" style="margin-top:16px" data-close>Done</button>`);

    document.querySelectorAll('[data-up]').forEach(b =>
      b.onclick = () => { moveLayoutSection(b.dataset.up, -1); layoutSheet(); render(); });
    document.querySelectorAll('[data-down]').forEach(b =>
      b.onclick = () => { moveLayoutSection(b.dataset.down, 1); layoutSheet(); render(); });
    document.querySelectorAll('[data-eye]').forEach(b =>
      b.onclick = () => { toggleLayoutSection(b.dataset.eye); layoutSheet(); render(); });
  };

  root.addEventListener('click', e => {
    if (e.target.closest('[data-more]')){ limit += 20; return render(); }
    if (e.target.closest('[data-layout]')) return layoutSheet();
    if (e.target.closest('[data-add]')) return addTxSheet();
  });

  render();
}

/* ---------- add transaction ---------- */
function addTxSheet(){
  sheet(`<h2>Add transaction</h2><div class="sub">Record something you've spent or received</div>
    <div class="field"><label>Description</label><input id="atName"></div>
    <div class="field"><label>Amount</label><input id="atAmt" type="number" min="0" step="0.01"></div>
    <div class="field"><label>Category</label><select id="atCat">
      ${CATS.map(c => `<option ${c === 'Groceries' ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Date</label><input id="atDate" type="date" value="${TODAY}" max="${TODAY}"></div>
    <button class="btn" id="atGo">Add transaction</button>`);
  document.getElementById('atGo').onclick = () => {
    const name = document.getElementById('atName').value.trim();
    const amt = +document.getElementById('atAmt').value;
    const cat = document.getElementById('atCat').value;
    if (!name) return toast('Enter a description');
    if (!amt || amt <= 0) return toast('Enter an amount');
    const signed = cat === 'Income' || cat === 'Investments' ? amt : -amt;
    if (signed < 0 && Math.abs(signed) > balNow()) return toast('Not enough in your balance');
    addTx(name, cat, signed, '', document.getElementById('atDate').value || TODAY);
    closeSheet(); go('home'); toast('Added');
  };
}

/* ---------- grow ---------- */
export function mountGrow(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Grow</h2></div>
      <div class="card"><div class="sub">Everything you're building</div>
        <div class="balance rev" style="font-size:30px;margin:4px 0">${fmt(growTotal())}</div>
        <div class="sub" style="margin:0">Savings ${fmt(savingsTotal())} · Invested ${fmt(isaBal())} ·
          Pension ${fmt(s.pension)} · Equity ${fmt(homeEquity())}${loanOwed() ? ' · Owed ' + fmt(loanOwed()) : ''}</div></div>
      ${accCard({ label: 'Savings', meta: s.pots.filter(p => p.type === 'savings').length + ' savings pots · connected ' + fmt(connTotal()),
        balance: fmt(savingsTotal()), tag: badge(plan().ia + '% AER', 'coral') })}
      ${accCard({ label: 'Investments', meta: 'Stocks &amp; shares ISA', balance: fmt(isaBal()), tag: badge('ISA', 'coral') })}
      ${accCard({ label: 'Pension', meta: 'SIPP · connected', balance: fmt(s.pension), tag: badge('SIPP') })}
      ${accCard({ label: 'Home equity', meta: 'Estimate from your mortgage', balance: fmt(homeEquity()), tag: badge('Est.') })}
      <div class="card"><h2>Home</h2><div class="sub">Set your estimate</div>
        <div class="field"><label>Property value</label><input id="hv" type="number" value="${s.homeValue}"></div>
        <div class="field"><label>Mortgage owed</label><input id="hm" type="number" value="${s.mortgage}"></div>
        <button class="btn" data-save>Save</button></div>`;
  };
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-save]')) return;
    setHomeEstimate(+root.querySelector('#hv').value || 0, +root.querySelector('#hm').value || 0);
    render(); toast('Saved');
  });
  render();
}

/* ---------- pay ---------- */
export function mountPay(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Pay</h2></div>
      <div class="card" style="padding:6px 8px">
        <button class="pot" data-go="payees"><span class="lg">SND</span><span class="mid">
          <span class="nm">Send money</span><span class="sub">To a saved payee</span></span></button>
        <button class="pot" data-so><span class="lg">SO</span><span class="mid">
          <span class="nm">Standing orders</span><span class="sub">${s.sos.filter(x => x.active).length} active</span></span></button>
        <button class="pot" data-tabs><span class="lg">TAB</span><span class="mid">
          <span class="nm">Shared tabs</span><span class="sub">${s.tabs.length} open</span></span></button>
        <button class="pot" data-go="joint"><span class="lg">JNT</span><span class="mid">
          <span class="nm">Joint account</span><span class="sub">With ${esc(s.partner)}</span></span></button>
        <button class="pot" data-sorter><span class="lg">SRT</span><span class="mid">
          <span class="nm">Salary sorter</span><span class="sub">Split your pay automatically</span></span></button>
        <button class="pot" data-gpe><span class="lg">GPE</span><span class="mid">
          <span class="nm">Get paid early</span><span class="sub">4pm the day before</span></span></button>
      </div>
      <div class="card"><h2>Standing orders</h2><div class="sub">Regular payments</div>
        ${s.sos.length ? s.sos.map(x => kv(`${esc(x.name)}<br><span style="font-size:12.5px">Day ${x.day}</span>`,
          `<span class="rev">${fmt(x.amt)}</span>`)).join('') : empty('None set up')}</div>
      <div class="card"><h2>Shared tabs</h2><div class="sub">Split with friends</div>
        ${s.tabs.length ? s.tabs.map(t => kv(`${esc(t.name)}<br><span style="font-size:12.5px">${t.people} people</span>`,
          `<span class="rev">${fmt(t.total)}</span>`)).join('') : empty('No open tabs')}</div>`;
  };

  const soSheet = () => {
    sheet(`<h2>Standing order</h2><div class="field"><label>Payee</label><input id="soName"></div>
      <div class="field"><label>Amount</label><input id="soAmt" type="number" min="1"></div>
      <div class="field"><label>Day of month</label><input id="soDay" type="number" min="1" max="28" value="1"></div>
      <button class="btn" id="soGo">Create</button>`);
    document.getElementById('soGo').onclick = () => {
      const n = document.getElementById('soName').value.trim();
      const a = +document.getElementById('soAmt').value;
      if (!n || !a) return toast('Fill in both fields');
      addStandingOrder(n, a, +document.getElementById('soDay').value || 1);
      closeSheet(); render(); toast('Standing order created');
    };
  };

  const tabSheet = () => {
    sheet(`<h2>Shared tab</h2><div class="field"><label>Name</label><input id="tbName"></div>
      <div class="field"><label>Total</label><input id="tbTot" type="number" min="1"></div>
      <div class="field"><label>People</label><input id="tbPpl" type="number" min="2" value="2"></div>
      <button class="btn" id="tbGo">Create tab</button>`);
    document.getElementById('tbGo').onclick = () => {
      const n = document.getElementById('tbName').value.trim();
      const tot = +document.getElementById('tbTot').value;
      const ppl = Math.max(2, +document.getElementById('tbPpl').value || 2);
      if (!n || !tot) return toast('Fill in both fields');
      addSharedTab(n, tot, ppl);
      closeSheet(); render(); toast('Tab created');
    };
  };

  const sorterSheet = () => {
    const s = getState();
    sheet(`<h2>Salary sorter</h2><div class="sub">Split your next pay automatically</div>
      ${s.pots.map(p => kv(esc(p.name), '<span class="rev">£100.00</span>')).join('')}
      <p class="note">Splits are taken the moment your salary lands.</p>
      <button class="btn" id="sorterSave" style="margin-top:12px">Save sorter</button>`);
    document.getElementById('sorterSave').onclick = () => {
      notif('Salary sorter saved', 'Your next pay will be split automatically');
      closeSheet(); toast('Sorter saved');
    };
  };

  const gpeSheet = () => {
    sheet(`<h2>Get paid early</h2><div class="sub">Salary lands at 4pm the day before it's due.</div>
      <button class="btn" id="gpeGo">Claim early</button>`);
    document.getElementById('gpeGo').onclick = () => {
      notif('Paid early', 'Your salary is available now');
      closeSheet(); toast('Claimed');
    };
  };

  root.addEventListener('click', e => {
    if (e.target.closest('[data-so]')) return soSheet();
    if (e.target.closest('[data-tabs]')) return tabSheet();
    if (e.target.closest('[data-sorter]')) return sorterSheet();
    if (e.target.closest('[data-gpe]')) return gpeSheet();
  });
  render();
}

/* ---------- trends ---------- */
export function mountTrends(root){
  let view = 'balance';
  const render = () => {
    const s = getState();
    let body = '';
    if (view === 'balance'){
      body = `<div class="card"><h2>Projected balance</h2><div class="sub">Based on bills before payday</div>
        <div class="balance rev" style="font-size:26px;margin:4px 0">${fmt(leftToSpend())}</div>
        <div class="sub" style="margin:0 0 10px">left after ${fmt(committedLeft())} of committed bills</div>
        <div id="tbChart"></div></div>`;
    } else if (view === 'spending'){
      body = `<div class="card"><h2>${fmt(spentThisMonth())}</h2>
        <div class="sub">${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}</div>
        <div id="tbDonut"></div></div>
        <div class="card"><h2>Daily activity</h2><div class="sub">Last 8 weeks</div>
        <div class="heat" id="tbHeat"></div></div>`;
    } else {
      body = `<div class="card"><h2>Targets</h2><div class="sub">Flexible categories only</div>
        ${FLEX.map(c => `<div style="margin:10px 0">
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span>${c}</span><span class="rev">${fmt(spentCat(c))} / ${fmt(s.targets[c] || 0)}</span></div>
          ${meter(spentCat(c), s.targets[c] || 0)}
          <input type="number" min="0" step="5" value="${s.targets[c] || 0}" data-target="${c}" class="tinput"></div>`).join('')}
        <button class="btn" data-save style="margin-top:12px">Save targets</button></div>`;
    }
    root.innerHTML = `<div class="h-sec"><h2>Trends</h2></div>
      ${chipRow([{ value: 'balance', label: 'Balance' }, { value: 'spending', label: 'Spending' },
        { value: 'targets', label: 'Targets' }], view, 'tv')}${body}`;

    if (view === 'balance') lineChart(root.querySelector('#tbChart'), balanceSeries(90));
    if (view === 'spending'){
      const parts = FLEX.map(c => ({ k: c, v: spentCat(c) })).filter(p => p.v > 0).sort((a, b) => b.v - a.v);
      donut(root.querySelector('#tbDonut'), parts.length ? parts : [{ k: 'Nothing yet', v: 1 }]);
      const counts = {};
      s.tx.forEach(t => { if (t.amt < 0) counts[t.date] = (counts[t.date] || 0) + Math.abs(t.amt); });
      heatmap(root.querySelector('#tbHeat'), counts);
    }
  };
  root.addEventListener('click', e => {
    const chip = e.target.closest('[data-tv]');
    if (chip){ view = chip.dataset.tv; return render(); }
    if (e.target.closest('[data-save]')){
      root.querySelectorAll('[data-target]').forEach(i => setTarget(i.dataset.target, +i.value || 0));
      render(); toast('Targets saved');
    }
  });
  render();
}

/* ---------- account hub ---------- */
export function mountAccount(root){
  const s = getState();
  const row = (label, sub, attrs) => `<button class="pot" ${attrs}><span class="lg">${label.replace(/&amp;/g, '').slice(0, 3)}</span>
    <span class="mid"><span class="nm">${label}</span><span class="sub">${sub}</span></span></button>`;
  root.innerHTML = `<div class="h-sec"><h2>Account</h2></div>
    <div class="card" style="padding:6px 8px">
      ${row('Your accounts', (1 + s.extraAccounts.length) + ' account' + (s.extraAccounts.length ? 's' : ''), 'data-go="accounts"')}
      ${row('Personal details', 'Name, address, contact', 'data-go="personal"')}
      ${row('Security &amp; privacy', 'Passcode, biometrics, sessions', 'data-go="security"')}
      ${row('Statements', 'PDF and CSV', 'data-go="statements"')}
      ${row('Payees', 'Manage saved payees', 'data-go="payees"')}
      ${row('Cards', 'Virtual cards, freeze', 'data-go="cards"')}
      ${row('Credit insights', plan().scores + ' score' + (plan().scores > 1 ? 's' : ''), 'data-go="credit"')}
      ${row('Connected accounts', s.connected.length ? s.connected.length + ' connected' : 'Other banks', 'data-go="connected"')}
      ${row('Borrowing', 'Flex, loans, overdraft', 'data-go="borrow"')}
      ${row('Plan', plan().name, 'data-go="plan"')}
      ${row('Limits', 'ATM and card limits', 'data-go="limits"')}
      ${row('Insurance', 'Travel, phone, breakdown', 'data-go="insurance"')}
      ${row('Billsback', 'Your bills could be on us', 'data-go="billsback"')}
      ${row('Saving Challenge', '1p to £667.95', 'data-go="challenge"')}
      ${row('Disputes', 'Raised queries', 'data-go="disputes"')}
      ${row('Support', 'Chat to us', 'data-go="chat"')}
      ${row('Appearance', 'Theme, text size, motion', 'data-go="appearance"')}
    </div>
    <button class="btn ghost" data-logout style="margin:0 0 20px">Log out of all devices</button>`;
  root.addEventListener('click', e => {
    if (e.target.closest('[data-logout]')) toast('Logged out of all other devices');
  });
}

/* ---------- current account ---------- */
export function mountAcc(root){
  let limit = 40;
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Current account</h2><button data-add>Add</button></div>
      <div class="card" style="padding:4px 14px"><ul class="txlist">
        ${s.tx.slice(0, limit).map(txRow).join('')}</ul>
        <button class="btn ghost sm" data-more style="margin:8px 0 12px;width:100%">Load more</button></div>`;
    const more = root.querySelector('[data-more]');
    if (more) more.classList.toggle('hide', limit >= s.tx.length);
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-more]')){ limit += 40; return render(); }
    if (e.target.closest('[data-add]')) return addTxSheet();
  });
  render();
}

/* ---------- pots ---------- */
export function mountPots(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Pots</h2><button data-new>Create</button></div>
      <div class="card">${s.pots.length ? s.pots.map(p => potRow(p, plan().ia)).join('') : empty('No pots yet')}</div>
      <p class="note">Savings pots earn interest at your plan rate. Bills pots hold direct debits.</p>`;
  };
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-new]')) return;
    sheet(`<h2>New pot</h2><div class="field"><label>Name</label><input id="npName"></div>
      <div class="field"><label>Type</label><select id="npType">
        <option value="regular">Regular</option><option value="savings">Savings (earns interest)</option>
        <option value="bills">Bills (holds direct debits)</option></select></div>
      <div class="field"><label>Goal</label><input id="npGoal" type="number" min="1" value="500"></div>
      <button class="btn" id="npGo">Create pot</button>`);
    document.getElementById('npGo').onclick = () => {
      const name = document.getElementById('npName').value.trim();
      if (!name) return toast('Name your pot');
      createPot(name, document.getElementById('npType').value, +document.getElementById('npGoal').value || 500);
      closeSheet(); render(); toast('Pot created');
    };
  });
  render();
}

/* ---------- pot detail ---------- */
export function mountPotDetail(root, params){
  const render = () => {
    const p = getState().pots.find(x => x.id === params.id);
    if (!p){ root.innerHTML = empty('Pot not found'); return; }
    const history = getState().tx.filter(t => t.name === p.name).slice(0, 15);
    root.innerHTML = `<div class="h-sec"><h2>${esc(p.name)}</h2><button data-edit>Edit</button></div>
      <div class="card"><div class="balance rev" style="font-size:30px;margin:0 0 4px">${fmt(p.bal)}</div>
        <div class="sub">${Math.round(p.bal / p.goal * 100)}% of ${fmt(p.goal)} goal</div>
        ${meter(p.bal, p.goal)}
        ${p.type === 'savings' ? kv('Interest', plan().ia + '% AER (variable)') : ''}
        <div class="row2" style="margin-top:12px"><button class="btn" data-in>Add money</button>
          <button class="btn ghost" data-out>Withdraw</button></div></div>
      <div class="card" style="padding:6px 8px">
        ${history.length ? history.map(t => kv(esc(t.note || 'Move'),
          `<span class="rev">${t.amt > 0 ? '+' : ''}${fmt(t.amt)}</span>`)).join('') : empty('No activity')}</div>`;
  };
  const amountSheet = dir => {
    const p = getState().pots.find(x => x.id === params.id);
    sheet(`<h2>${dir === 'in' ? 'Add to' : 'Withdraw from'} ${esc(p.name)}</h2>
      <div class="sub">Balance ${fmt(balNow())} · Pot ${fmt(p.bal)}</div>
      <div class="field"><label>Amount</label><input id="amAmt" type="number" min="1"></div>
      ${chipRow([10, 25, 50, 100].map(v => ({ value: v, label: '£' + v })), null, 'quick')}
      <button class="btn" id="amGo">Confirm</button>`);
    document.querySelectorAll('[data-quick]').forEach(b =>
      b.onclick = () => { document.getElementById('amAmt').value = b.dataset.quick; });
    document.getElementById('amGo').onclick = () => {
      const v = +document.getElementById('amAmt').value;
      if (!v || v <= 0) return toast('Enter an amount');
      const res = moveToPot(params.id, round2(v), dir);
      if (!res.ok) return toast(res.msg);
      closeSheet(); render(); toast('Done');
    };
  };
  const editSheet = () => {
    const p = getState().pots.find(x => x.id === params.id);
    sheet(`<h2>Edit pot</h2><div class="field"><label>Name</label><input id="epName" value="${esc(p.name)}"></div>
      <div class="field"><label>Goal</label><input id="epGoal" type="number" min="1" value="${p.goal}"></div>
      <button class="btn" id="epSave">Save</button>`);
    document.getElementById('epSave').onclick = () => {
      updatePot(params.id, { name: document.getElementById('epName').value.trim() || p.name,
        goal: Math.max(1, +document.getElementById('epGoal').value || p.goal) });
      closeSheet(); render(); toast('Pot updated');
    };
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-in]')) return amountSheet('in');
    if (e.target.closest('[data-out]')) return amountSheet('out');
    if (e.target.closest('[data-edit]')) return editSheet();
  });
  render();
}

/* ---------- invest ---------- */
export function mountInvest(root){
  const s = getState();
  const share = isaBal() / TARGET_ISA * 100;
  root.innerHTML = `<div class="card" style="margin-top:16px">
      <div class="sub">Stocks &amp; shares ISA · transferred in October 1992</div>
      <div class="balance rev" style="font-size:30px;margin:4px 0">${fmt(isaBal())}</div>
      ${meter(isaBal(), TARGET_ISA)}
      <div style="font-size:12.5px;color:var(--muted);margin-bottom:8px">${share.toFixed(2)}% of target</div>
      ${kv('Target', `<span class="rev">${fmt(TARGET_ISA)}</span>`)}
      ${kv('Allowance used', `<span class="rev">${fmt(tyUsed())}</span>`)}
      ${kv('Allowance remaining', `<span class="rev">${fmt(Math.max(0, 20000 - tyUsed()))}</span>`)}
      ${kv('Platform fee', plan().cover ? '0.20%' : '0.25%')}</div>
    <div class="card"><h2>Portfolio</h2><div class="sub">Holdings by value</div>
      ${[['Vanguard FTSE Global All Cap', .46], ['Vanguard US Equity Index', .22],
        ['iShares Core MSCI World', .16], ['Vanguard Emerging Markets', .09], ['Cash', .07]]
        .map(([n, w]) => `<div style="margin:8px 0">
          <div style="display:flex;justify-content:space-between;font-size:13px">
            <span>${n}</span><b class="rev">${fmt(isaBal() * w)}</b></div>
          ${meter(w * 100, 100, 'var(--ink)')}</div>`).join('')}</div>
    <div class="card"><h2>Value over time</h2><div class="sub">Since October 1992</div>
      <div id="isaChart"></div></div>
    <div class="h-sec"><h2>Ledger</h2><button data-go="statements">Statements</button></div>
    <div class="card" style="padding:4px 14px"><ul class="txlist">
      ${s.isa.slice(0, 40).map(r => `<li class="tx"><span class="lg">${r.type[0]}</span>
        <span class="mid"><span class="nm">${esc(r.note)}</span>
          <span class="mt">${prettyOf(r.date)} · ${r.type}</span></span>
        <span class="amt rev">${fmt(r.value)}</span></li>`).join('')}</ul></div>
    <p class="note">Lineage: PEP contributions to April 1999, PEP→ISA transfer, TESSA rollover, then ISA subscriptions.
      Distributions reinvested inside the wrapper.</p>`;

  const asc = s.isa.slice().reverse(), step = Math.max(1, Math.floor(asc.length / 140));
  lineChart(root.querySelector('#isaChart'),
    asc.filter((_, i) => i % step === 0).map(r => ({ d: r.date, v: r.value })), { h: 150 });
}

function prettyOf(date){
  const diff = Math.round((new Date(TODAY + 'T12:00:00') - new Date(date + 'T12:00:00')) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  const d = new Date(date + 'T12:00:00');
  return `${d.getDate()} ${MONTHS[d.getMonth()].slice(0, 3)} ${d.getFullYear()}`;
}

/* ---------- statements ---------- */
export function mountStatements(root){
  let kind = 'acc';
  const render = () => {
    const s = getState();
    const src = kind === 'acc' ? s.tx : s.isa;
    const months = [...new Set(src.map(r => r.date.slice(0, 7)))].sort().reverse();
    root.innerHTML = `<div class="h-sec"><h2>Statements</h2></div>
      ${chipRow([{ value: 'acc', label: 'Current account' }, { value: 'isa', label: 'ISA' }], kind, 'stmt')}
      <div class="card">${months.length ? months.map(ym => {
        const [y, m] = ym.split('-');
        return kv(`${MONTHS[+m - 1]} ${y}`,
          `<button class="btn ghost sm" data-pdf="${ym}">PDF</button>
           <button class="btn ghost sm" data-csv="${ym}">CSV</button>`);
      }).join('') : empty('No statements')}</div>`;
  };
  root.addEventListener('click', e => {
    const chip = e.target.closest('[data-stmt]');
    if (chip){ kind = chip.dataset.stmt; return render(); }
    const pdf = e.target.closest('[data-pdf]');
    if (pdf) return download(kind, pdf.dataset.pdf, true);
    const csv = e.target.closest('[data-csv]');
    if (csv) return download(kind, csv.dataset.csv, false);
  });
  render();
}

function download(kind, ym, asPdf){
  const s = getState(), isa = kind === 'isa';
  const rows = isa
    ? s.isa.filter(r => r.date.slice(0, 7) === ym).reverse()
        .map(r => [r.date, r.type, r.contrib.toFixed(2), r.growth.toFixed(2), r.value.toFixed(2), r.note])
    : s.tx.filter(t => t.date.slice(0, 7) === ym).reverse()
        .map(t => [t.date, t.time, t.name, t.cat, t.amt.toFixed(2), t.bal.toFixed(2), t.note]);
  const head = isa ? ['Date', 'Type', 'Contribution', 'Growth', 'Value', 'Note']
    : ['Date', 'Time', 'Description', 'Category', 'Amount', 'Balance', 'Note'];
  const name = `${isa ? 'isa' : 'statement'}-${ym}`;

  if (!asPdf){
    const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = name + '.csv'; a.click();
    URL.revokeObjectURL(url);
    return toast('Downloaded ' + name + '.csv');
  }

  const [y, m] = ym.split('-');
  const w = window.open('', '_blank');
  w.document.write(`<title>${name}</title><style>
    body{font-family:-apple-system,Arial,sans-serif;padding:32px;color:#0b1a26}
    h1{font-size:20px;margin:0 0 2px}.sub{color:#6b7c8a;font-size:13px;margin-bottom:18px}
    table{width:100%;border-collapse:collapse;font-size:12px}
    th,td{text-align:left;padding:6px 4px;border-bottom:1px solid #e6ebef}
    th{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:#6b7c8a}.amt{text-align:right}</style>
    <h1>Monzo — ${isa ? 'ISA' : 'Current account'} statement</h1>
    <div class="sub">${esc(s.profile.name)} · ${esc(s.profile.a1)}, ${esc(s.profile.city)}, ${esc(s.profile.post)} ·
      ${MONTHS[+m - 1]} ${y}</div>
    <table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i === 4 ? 'amt' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <p class="sub" style="margin-top:18px">Monzo Bank Ltd · FSCS protected up to £120,000</p>`);
  w.document.close(); w.focus();
  setTimeout(() => w.print(), 350);
  toast('Statement ready to print');
}
