/* src/screens-a.js — daily surfaces. */

import {
  getState, commit, esc, fmt, TODAY, THIS_YM, MONTHS, round2, plan, planPrice,
  balNow, isaBal, growTotal, savingsTotal, homeEquity, connTotal, loanOwed,
  spentThisMonth, spentCat, spentToday, committedLeft, leftToSpend, interestThisMonth,
  daysToPayday, balanceSeries, tyUsed, TARGET_ISA, addTx, notif,
  moveToPot, createPot, updatePot, deletePot, togglePotLock, setRoundupPot, clearRoundupPot,
  setHomeEstimate, setPensionMonthly, setTarget, setActiveAccount,
  moveLayoutSection, toggleLayoutSection, addStandingOrder, addSharedTab,
  toggleStandingOrder, settleTab, salaryAmount, setSorter, setSorterOn, sorterTotal,
  getPaidEarly, gpeClaimed, CATS, FLEX
} from './core.js';

import {
  go, currentScreen, toast, sheet, closeSheet, lineChart, donut, heatmap, logo, kv, badge,
  empty, txRow, potRow, meter, chipRow, accCard, spotCard, sectionHead
} from './ui.js';

const LAYOUT_NAMES = { spotlights: 'Spotlights', personal: 'Personal account', joint: 'Joint account',
  pots: 'Pots', invest: 'Investments', latest: 'Latest activity' };

const sections = {
  spotlights(){
    const lt = leftToSpend(), d = daysToPayday();
    return `<div class="spot">
      ${spotCard({ label: 'Left to spend', value: fmt(lt),
        note: d === 0 ? 'Payday today' : d + ' days to payday',
        tone: lt < 150 ? 'bad' : lt < 450 ? 'warn' : 'ok', go: 'trends' })}
      ${spotCard({ label: 'Spent today', value: fmt(spentToday()),
        note: getState().tx.filter(t => t.date === TODAY && t.amt < 0).length + ' payments', go: 'acc' })}
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
    return accCard({ label: 'Joint account', meta: 'With ' + esc(s.partner),
      balance: fmt(s.jointBal || 0), tag: badge('Joint'), go: 'joint' });
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
        <button class="btn ghost sm" data-more style="margin:8px 0 12px;width:100%">Load more</button></div>`;
  }
};

function newPotSheet(){
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
    closeSheet(); go(currentScreen() || 'pots'); toast('Pot created');
  };
}

export function mountHome(root){
  let limit = 12;
  const render = () => {
    const s = getState();
    root.innerHTML = s.layout.filter(x => x.on).map(sec => sections[sec.id] ? sections[sec.id]() : '').join('') +
      `<div class="row2" style="margin:12px 0">
        <button class="btn" data-go="payees">Send</button>
        <button class="btn ghost" data-go="pots">Move to pot</button></div>
      <div class="row2" style="margin:12px 0">
        <button class="btn ghost" data-go="flex">Pay with Flex</button>
        <button class="btn ghost" data-go="search">Search</button></div>
      <button class="btn ghost sm" data-layout style="margin:8px 0 20px;width:100%">Edit layout</button>`;
    const feed = root.querySelector('#feed');
    if (feed){
      feed.innerHTML = s.tx.slice(0, limit).map(txRow).join('');
      const more = root.querySelector('[data-more]');
      if (more) more.classList.toggle('hide', limit >= s.tx.length);
    }
  };
  const layoutSheet = () => {
    const s = getState();
    sheet(`<h2>Edit layout</h2>` + s.layout.map((sec, i) =>
      `<div class="layoutrow"><span class="mini">${i + 1}</span><span class="mid">${LAYOUT_NAMES[sec.id]}</span>
        <button class="iconbtn" data-up="${sec.id}" aria-label="Move up">↑</button>
        <button class="iconbtn" data-down="${sec.id}" aria-label="Move down">↓</button>
        <button class="sw ${sec.on ? 'on' : ''}" data-eye="${sec.id}" aria-label="Show section"></button></div>`).join('') +
      `<button class="btn" style="margin-top:16px" data-close>Done</button>`);
    document.querySelectorAll('[data-up]').forEach(b => b.onclick = () => { moveLayoutSection(b.dataset.up, -1); layoutSheet(); render(); });
    document.querySelectorAll('[data-down]').forEach(b => b.onclick = () => { moveLayoutSection(b.dataset.down, 1); layoutSheet(); render(); });
    document.querySelectorAll('[data-eye]').forEach(b => b.onclick = () => { toggleLayoutSection(b.dataset.eye); layoutSheet(); render(); });
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-more]')){ limit += 20; return render(); }
    if (e.target.closest('[data-layout]')) return layoutSheet();
    if (e.target.closest('[data-add]')) return addTxSheet();
  });
  render();
}

function addTxSheet(){
  sheet(`<h2>Add transaction</h2>
    <div class="field"><label>Description</label><input id="atName"></div>
    <div class="field"><label>Amount</label><input id="atAmt" type="number" min="0" step="0.01"></div>
    <div class="field"><label>Category</label><select id="atCat">
      ${CATS.map(c => `<option ${c === 'Groceries' ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
    <div class="field"><label>Date</label><input id="atDate" type="date" value="${TODAY}" max="${TODAY}"></div>
    <div class="field"><label>Note</label><input id="atNote"></div>
    <button class="btn" id="atGo">Add transaction</button>`);
  document.getElementById('atGo').onclick = () => {
    const name = document.getElementById('atName').value.trim();
    const amt = +document.getElementById('atAmt').value;
    const cat = document.getElementById('atCat').value;
    if (!name) return toast('Enter a description');
    if (!amt || amt <= 0) return toast('Enter an amount');
    const signed = cat === 'Income' || cat === 'Investments' ? amt : -amt;
    if (signed < 0 && Math.abs(signed) > balNow()) return toast('Not enough in your balance');
    addTx(name, cat, signed, document.getElementById('atNote').value, document.getElementById('atDate').value || TODAY);
    closeSheet(); go(currentScreen() || 'home'); toast('Added');
  };
}

export function mountSave(root){
  const render = () => {
    const s = getState();
    const groups = [
      ['Savings pots', 'savings', 'Earns interest at your plan rate'],
      ['Bills pots', 'bills', 'Money set aside for direct debits'],
      ['Regular pots', 'regular', 'Goals without interest']
    ];
    const body = groups.map(([label, type, blurb]) => {
      const items = s.pots.filter(p => p.type === type);
      if (!items.length) return '';
      return `<div class="h-sec"><h2 class="sm">${label}</h2></div>
        <p class="note">${blurb}</p>
        <div class="card" style="padding:6px 14px">${items.map(p => potRow(p, plan().ia)).join('')}</div>`;
    }).join('');
    root.innerHTML = `<div class="h-sec"><h2>Save</h2><button data-new>Create</button></div>
      <div class="card"><div class="sub">Interest this month</div>
        <div class="balance rev">${fmt(interestThisMonth())}</div>
        <div class="sub" style="margin:6px 0 0">${plan().ia}% AER variable on ${s.pots.filter(p => p.type === 'savings').length} savings pots</div></div>
      ${body || empty('No pots yet')}
      <p class="note">Savings pots earn your plan rate. Bills pots hold direct debits. Regular pots are for goals.</p>`;
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-new]')) newPotSheet();
  });
  render();
}

export function mountGrow(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Grow</h2></div>
      <div class="card"><div class="sub">Everything you're building</div>
        <div class="balance rev" style="font-size:30px;margin:4px 0">${fmt(growTotal())}</div>
        <div class="sub" style="margin:0">Net of ${fmt(loanOwed())} owed</div></div>
      <button class="accard" data-go="pots"><div class="accrow"><div><div class="accname">Savings</div>
        <div class="accmeta">${s.pots.filter(p => p.type === 'savings').length} pots · ${plan().ia}% AER</div></div>
        <span class="badge coral">${fmt(savingsTotal())}</span></div></button>
      ${accCard({ label: 'Investments', meta: 'Stocks &amp; shares ISA', balance: fmt(isaBal()), tag: badge('ISA', 'coral'), go: 'invest' })}
      <div class="card"><h2>Pension</h2><div class="sub">SIPP · ${fmt(s.pensionMonthly)}/month</div>
        <div class="balance rev" style="font-size:24px;margin:4px 0">${fmt(s.pension)}</div>
        <div class="field"><label>Monthly contribution</label><input id="pm" type="number" min="0" value="${s.pensionMonthly}"></div>
        <button class="btn" data-pen>Update contribution</button></div>
      ${accCard({ label: 'Home equity', meta: 'Value ' + fmt(s.homeValue) + ' − mortgage ' + fmt(s.mortgage), balance: fmt(homeEquity()), tag: badge('Est.') })}
      <div class="card"><h2>Home</h2>
        <div class="field"><label>Property value</label><input id="hv" type="number" value="${s.homeValue}"></div>
        <div class="field"><label>Mortgage owed</label><input id="hm" type="number" value="${s.mortgage}"></div>
        <button class="btn" data-save>Save</button></div>
      <div class="card"><h2>Connected</h2><div class="sub">${s.connected.length} accounts · ${fmt(connTotal())}</div>
        <button class="btn ghost sm" data-go="connected">Manage</button></div>`;
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-save]')){
      setHomeEstimate(+root.querySelector('#hv').value || 0, +root.querySelector('#hm').value || 0);
      render(); return toast('Saved');
    }
    if (e.target.closest('[data-pen]')){
      setPensionMonthly(+root.querySelector('#pm').value || 0);
      render(); toast('Contribution updated');
    }
  });
  render();
}

export function mountPay(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Pay</h2></div>
      <div class="card" style="padding:6px 8px">
        <button class="pot" data-go="payees"><span class="lg"><span class="lg__i">SND</span></span><span class="mid">
          <span class="nm">Send money</span><span class="sub">To a saved payee</span></span><span class="amt">›</span></button>
        <button class="pot" data-go="request"><span class="lg"><span class="lg__i">RQ</span></span><span class="mid">
          <span class="nm">Request money</span><span class="sub">${s.requests.length} outstanding</span></span><span class="amt">›</span></button>
        <button class="pot" data-so><span class="lg"><span class="lg__i">SO</span></span><span class="mid">
          <span class="nm">Standing orders</span><span class="sub">${s.sos.filter(x => x.active).length} active</span></span><span class="amt">›</span></button>
        <button class="pot" data-tabs><span class="lg"><span class="lg__i">TAB</span></span><span class="mid">
          <span class="nm">Shared tabs</span><span class="sub">${s.tabs.length} open</span></span><span class="amt">›</span></button>
        <button class="pot" data-go="joint"><span class="lg"><span class="lg__i">JNT</span></span><span class="mid">
          <span class="nm">Joint account</span><span class="sub">With ${esc(s.partner)}</span></span><span class="amt">›</span></button>
        <button class="pot" data-sorter><span class="lg"><span class="lg__i">SRT</span></span><span class="mid">
          <span class="nm">Salary sorter</span><span class="sub">${s.sorter.on ? fmt(sorterTotal()) + ' split' : 'Split your pay'}</span></span><span class="amt">›</span></button>
        <button class="pot" data-gpe><span class="lg"><span class="lg__i">GPE</span></span><span class="mid">
          <span class="nm">Get paid early</span><span class="sub">${gpeClaimed() ? 'Claimed this month' : '4pm the day before'}</span></span><span class="amt">›</span></button>
      </div>
      <div class="card"><h2>Standing orders</h2>
        ${s.sos.length ? s.sos.map(x => `<div class="pot"><span class="lg"><span class="lg__i">${esc(x.name[0])}</span></span>
          <span class="mid"><span class="nm">${esc(x.name)}</span><span class="sub">Day ${x.day} · ${fmt(x.amt)}</span></span>
          <button class="sw ${x.active ? 'on' : ''}" data-toggle-so="${x.id}" aria-label="Toggle ${esc(x.name)}"></button></div>`).join('')
          : empty('None set up')}</div>
      <div class="card"><h2>Shared tabs</h2>
        ${s.tabs.length ? s.tabs.map(t => `<div class="pot"><span class="lg"><span class="lg__i">${esc(t.name[0])}</span></span>
          <span class="mid"><span class="nm">${esc(t.name)}</span><span class="sub">${t.people} people · your share ${fmt(t.mine)}</span></span>
          <button class="btn ghost sm" data-settle="${t.id}">Settle</button></div>`).join('')
          : empty('No open tabs')}</div>`;
  };

  const sorterSheet = () => {
    const s = getState();
    const salary = salaryAmount();
    const draft = { ...(s.sorter.splits || {}) };
    const totals = () => {
      const total = round2(Object.values(draft).reduce((a, b) => a + (Number(b) || 0), 0));
      const t = document.getElementById('stTotal'), l = document.getElementById('stLeft');
      if (t) t.textContent = fmt(total);
      if (l) l.textContent = fmt(Math.max(0, salary - total));
      return total;
    };
    sheet(`<h2>Salary sorter</h2>
      <div class="sub">Your next pay is ${fmt(salary)}. Choose what goes where.</div>
      <div class="toggle"><div><div class="t">Split automatically</div>
        <div class="d">Runs when your pay lands</div></div>
        <button class="sw ${s.sorter.on ? 'on' : ''}" data-sorter-on aria-label="Enable sorter"></button></div>
      ${s.pots.length ? s.pots.map(p => `<div class="field"><label for="st_${p.id}">${esc(p.name)}</label>
        <input id="st_${p.id}" data-split="${p.id}" type="number" min="0" step="5"
          value="${(Number(draft[p.id]) || 0).toFixed(2)}"></div>`).join('')
        : empty('Create a pot first')}
      ${kv('To pots', '<span class="rev" id="stTotal">—</span>')}
      ${kv('Left in account', '<span class="rev" id="stLeft">—</span>')}
      <button class="btn" id="stSave" style="margin-top:14px">Save sorter</button>`);
    totals();
    /* the sheet panel lives outside the view node, so this is a document query */
    document.querySelectorAll('[data-split]').forEach(i => i.oninput = () => {
      draft[i.dataset.split] = Math.max(0, +i.value || 0);
      totals();
    });
    const sw = document.querySelector('[data-sorter-on]');
    if (sw) sw.onclick = () => {
      const on = !getState().sorter.on;
      setSorterOn(on);
      sw.classList.toggle('on', on);
    };
    document.getElementById('stSave').onclick = () => {
      const total = totals();
      setSorter(draft, true);
      closeSheet(); render();
      toast(total > salary ? 'Saved — over your salary' : `Saved · ${fmt(total)} split`);
    };
  };

  root.addEventListener('click', e => {
    const so = e.target.closest('[data-toggle-so]');
    if (so){ toggleStandingOrder(so.dataset.toggleSo); return render(); }
    const settle = e.target.closest('[data-settle]');
    if (settle){
      const res = settleTab(settle.dataset.settle);
      if (!res.ok) return toast(res.msg);
      render(); return toast('Tab settled');
    }
    if (e.target.closest('[data-so]')){
      sheet(`<h2>Standing order</h2><div class="field"><label>Payee</label><input id="soName"></div>
        <div class="field"><label>Amount</label><input id="soAmt" type="number" min="1"></div>
        <div class="field"><label>Day of month</label><input id="soDay" type="number" min="1" max="28" value="1"></div>
        <button class="btn" id="soGo">Create</button>`);
      document.getElementById('soGo').onclick = () => {
        const n = document.getElementById('soName').value.trim(), a = +document.getElementById('soAmt').value;
        if (!n || !a) return toast('Fill in both fields');
        addStandingOrder(n, a, +document.getElementById('soDay').value || 1);
        closeSheet(); render(); toast('Created');
      };
    }
    if (e.target.closest('[data-tabs]')){
      sheet(`<h2>Shared tab</h2><div class="field"><label>Name</label><input id="tbName"></div>
        <div class="field"><label>Total</label><input id="tbTot" type="number" min="1"></div>
        <div class="field"><label>People</label><input id="tbPpl" type="number" min="2" value="2"></div>
        <button class="btn" id="tbGo">Create tab</button>`);
      document.getElementById('tbGo').onclick = () => {
        const n = document.getElementById('tbName').value.trim(), tot = +document.getElementById('tbTot').value;
        const ppl = Math.max(2, +document.getElementById('tbPpl').value || 2);
        if (!n || !tot) return toast('Fill in both fields');
        addSharedTab(n, tot, ppl);
        closeSheet(); render(); toast('Tab created');
      };
    }
    if (e.target.closest('[data-sorter]')) return sorterSheet();
    if (e.target.closest('[data-gpe]')){
      const claimed = gpeClaimed();
      sheet(`<h2>Get paid early</h2>
        <div class="sub">${claimed
          ? 'You have already claimed this month. It resets after payday.'
          : `Bring ${fmt(salaryAmount())} forward to now.`}</div>
        ${kv('Salary', `<span class="rev">${fmt(salaryAmount())}</span>`)}
        ${getState().sorter.on ? kv('Sorter', 'Runs on credit') : ''}
        <button class="btn" id="gpeGo" ${claimed ? 'disabled' : ''} style="margin-top:14px">Claim early</button>`);
      document.getElementById('gpeGo').onclick = () => {
        const r = getPaidEarly();
        if (!r.ok) return toast(r.msg);
        closeSheet(); render();
        toast(r.split.length
          ? `Paid early · ${r.split.length} pot${r.split.length > 1 ? 's' : ''} funded`
          : 'Paid early');
      };
    }
  });
  render();
}

export function mountTrends(root){
  let view = 'balance';
  const render = () => {
    const s = getState();
    let body = '';
    if (view === 'balance'){
      body = `<div class="card"><h2>Projected balance</h2><div class="sub">After bills before payday</div>
        <div class="balance rev" style="font-size:26px;margin:4px 0">${fmt(leftToSpend())}</div>
        <div id="tbChart"></div></div>`;
    } else if (view === 'spending'){
      body = `<div class="card"><h2>${fmt(spentThisMonth())}</h2>
        <div class="sub">${MONTHS[new Date().getMonth()]} ${new Date().getFullYear()}</div>
        <div id="tbDonut"></div></div>
        <div class="card"><h2>Daily activity</h2><div class="heat" id="tbHeat"></div></div>
        <div class="card"><h2>Categories</h2>
          ${FLEX.map(c => `<button class="pot" data-drill="${c}"><span class="lg"><span class="lg__i">${c[0]}</span></span>
            <span class="mid"><span class="nm">${c}</span><span class="sub">${fmt(spentCat(c))}</span></span>
            <span class="amt">›</span></button>`).join('')}</div>`;
    } else {
      body = `<div class="card"><h2>Targets</h2><div class="sub">Flexible categories</div>
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
    const drill = e.target.closest('[data-drill]');
    if (drill){ go('search', { cat: drill.dataset.drill }); return; }
    if (e.target.closest('[data-save]')){
      root.querySelectorAll('[data-target]').forEach(i => setTarget(i.dataset.target, +i.value || 0));
      render(); toast('Targets saved');
    }
  });
  render();
}

export function mountAccount(root){
  const s = getState();
  const row = (label, sub, attrs) => `<button class="pot" ${attrs}><span class="lg"><span class="lg__i">${label.replace(/&amp;/g, '').slice(0, 3)}</span></span>
    <span class="mid"><span class="nm">${label}</span><span class="sub">${sub}</span></span><span class="amt">›</span></button>`;
  root.innerHTML = `<div class="h-sec"><h2>Account</h2></div>
    <div class="card" style="padding:6px 8px">
      ${row('Your accounts', (1 + s.extraAccounts.length) + ' accounts', 'data-go="accounts"')}
      ${row('Personal details', esc(s.profile.name), 'data-go="personal"')}
      ${row('Security &amp; privacy', s.credId ? 'Biometrics on' : 'Passcode only', 'data-go="security"')}
      ${row('Statements', 'PDF and CSV', 'data-go="statements"')}
      ${row('Backup', s.lastBackup ? 'Last ' + esc(s.lastBackup) : 'Never exported', 'data-go="backup"')}
      ${row('Payees', s.payees.length + ' saved', 'data-go="payees"')}
      ${row('Cards', s.vcards.length + ' virtual', 'data-go="cards"')}
      ${row('Credit insights', s.credit.eq + ' Equifax', 'data-go="credit"')}
      ${row('Connected accounts', s.connected.length + ' connected', 'data-go="connected"')}
      ${row('Borrowing', 'Flex, loans, overdraft', 'data-go="borrow"')}
      ${row('Plan', plan().name, 'data-go="plan"')}
      ${row('Limits', 'ATM and card', 'data-go="limits"')}
      ${row('Insurance', plan().cover ? 'Active' : 'Not included', 'data-go="insurance"')}
      ${row('Billsback', plan().billsback ? 'Eligible' : 'Needs Extra', 'data-go="billsback"')}
      ${row('Saving Challenge', s.challenge.day + ' of 365 days', 'data-go="challenge"')}
      ${row('Disputes', s.disputes.filter(d => d.status === 'Open').length + ' open', 'data-go="disputes"')}
      ${row('Support', 'Chat to us', 'data-go="chat"')}
      ${row('Appearance', 'Theme, text size', 'data-go="appearance"')}
    </div>
    <button class="btn ghost" data-logout style="margin:0 0 20px">Log out of all devices</button>`;
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-logout]')) return;
    sessionStorage.removeItem('unlocked');
    document.body.classList.add('locked');
    toast('Logged out everywhere');
  });
}

export function mountAcc(root){
  let limit = 40, filter = 'All';
  const render = () => {
    const s = getState();
    const list = filter === 'All' ? s.tx : s.tx.filter(t => t.cat === filter);
    root.innerHTML = `<div class="h-sec"><h2>Current account</h2><button data-add>Add</button></div>
      ${chipRow(['All', 'Groceries', 'Bills', 'Kids', 'Income'], filter, 'filter')}
      <div class="card" style="padding:4px 14px"><ul class="txlist">
        ${list.slice(0, limit).map(txRow).join('') || '<li class="empty">Nothing here</li>'}</ul>
        <button class="btn ghost sm" data-more style="margin:8px 0 12px;width:100%">Load more</button></div>`;
  };
  root.addEventListener('click', e => {
    const f = e.target.closest('[data-filter]');
    if (f){ filter = f.dataset.filter; limit = 40; return render(); }
    if (e.target.closest('[data-more]')){ limit += 40; return render(); }
    if (e.target.closest('[data-add]')) return addTxSheet();
  });
  render();
}

export function mountPots(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Pots</h2><button data-new>Create</button></div>
      <div class="card">${s.pots.length ? s.pots.map(p => potRow(p, plan().ia)).join('') : empty('No pots yet')}</div>
      <p class="note">Savings pots earn ${plan().ia}% AER. Locked pots can't be withdrawn from.</p>`;
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-new]')) newPotSheet();
  });
  render();
}

export function mountPotDetail(root, params){
  const render = () => {
    const p = getState().pots.find(x => x.id === params.id);
    if (!p){ root.innerHTML = empty('Pot not found'); return; }
    const history = getState().tx.filter(t => t.name === p.name).slice(0, 15);
    const isRoundup = getState().roundupPotId === p.id;
    root.innerHTML = `<div class="h-sec"><h2>${esc(p.name)}</h2><button data-edit>Edit</button></div>
      <div class="card"><div class="balance rev" style="font-size:30px;margin:0 0 4px">${fmt(p.bal)}</div>
        <div class="sub">${Math.round(p.bal / p.goal * 100)}% of ${fmt(p.goal)}</div>
        ${meter(p.bal, p.goal)}
        ${p.type === 'savings' ? kv('Interest', plan().ia + '% AER') : ''}
        ${kv('Status', p.locked ? badge('Locked', 'warn') : badge('Unlocked', 'ok'))}
        ${p.autoSave ? kv('Auto-save', fmt(p.autoSave) + ' / month') : ''}
        ${kv('Round-ups', isRoundup
          ? `${badge('This pot', 'ok')} <button class="btn ghost sm" data-roundup-off>Stop</button>`
          : `<button class="btn ghost sm" data-roundup-on>Send here</button>`)}
        <div class="row2" style="margin-top:12px"><button class="btn" data-in>Add money</button>
          <button class="btn ghost" data-out ${p.locked ? 'disabled' : ''}>Withdraw</button></div>
        <div class="row2" style="margin-top:10px">
          <button class="btn ghost" data-lock>${p.locked ? 'Unlock' : 'Lock'} pot</button>
          <button class="btn ghost" data-del>Close pot</button></div></div>
      <div class="card"><h2>History</h2>
        ${history.length ? history.map(t => kv(esc(t.note || 'Move'), `<span class="rev">${t.amt > 0 ? '+' : ''}${fmt(t.amt)}</span>`)).join('') : empty('No activity')}</div>`;
  };
  const amountSheet = dir => {
    const p = getState().pots.find(x => x.id === params.id);
    if (!p) return;
    sheet(`<h2>${dir === 'in' ? 'Add to' : 'Withdraw from'} ${esc(p.name)}</h2>
      <div class="sub">Balance ${fmt(balNow())} · Pot ${fmt(p.bal)}</div>
      <div class="field"><label>Amount</label><input id="amAmt" type="number" min="1"></div>
      ${chipRow([10, 25, 50, 100].map(v => ({ value: v, label: '£' + v })), null, 'quick')}
      <button class="btn" id="amGo">Confirm</button>`);
    document.querySelectorAll('[data-quick]').forEach(b => b.onclick = () => {
      const i = document.getElementById('amAmt'); if (i) i.value = b.dataset.quick;
    });
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
    if (!p) return;
    sheet(`<h2>Edit pot</h2><div class="field"><label>Name</label><input id="epName" value="${esc(p.name)}"></div>
      <div class="field"><label>Goal</label><input id="epGoal" type="number" min="1" value="${p.goal}"></div>
      <div class="field"><label>Monthly auto-save</label><input id="epAuto" type="number" min="0" value="${p.autoSave}"></div>
      <button class="btn" id="epSave">Save</button>`);
    document.getElementById('epSave').onclick = () => {
      updatePot(params.id, { name: document.getElementById('epName').value.trim() || p.name,
        goal: Math.max(1, +document.getElementById('epGoal').value || p.goal),
        autoSave: Math.max(0, +document.getElementById('epAuto').value || 0) });
      closeSheet(); render(); toast('Pot updated');
    };
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-in]')) return amountSheet('in');
    if (e.target.closest('[data-out]')) return amountSheet('out');
    if (e.target.closest('[data-edit]')) return editSheet();
    if (e.target.closest('[data-roundup-on]')){
      const r = setRoundupPot(params.id);
      if (!r.ok) return toast(r.msg);
      render(); return toast('Round-ups go to ' + r.name);
    }
    if (e.target.closest('[data-roundup-off]')){ clearRoundupPot(); return render(); }
    if (e.target.closest('[data-lock]')){
      const res = togglePotLock(params.id);
      if (res.ok){ render(); toast(res.locked ? 'Pot locked' : 'Pot unlocked'); }
    }
    if (e.target.closest('[data-del]')){
      const res = deletePot(params.id);
      if (!res.ok) return toast(res.msg);
      go('pots'); toast('Pot closed');
    }
  });
  render();
}

export function mountInvest(root){
  const render = () => {
    const s = getState();
    const share = isaBal() / TARGET_ISA * 100;
    root.innerHTML = `<div class="card" style="margin-top:16px">
        <div class="sub">Stocks &amp; shares ISA · transferred in October 1992</div>
        <div class="balance rev" style="font-size:30px;margin:4px 0">${fmt(isaBal())}</div>
        ${meter(isaBal(), TARGET_ISA)}
        <div style="font-size:12.5px;color:var(--ink3);margin-bottom:8px">${share.toFixed(2)}% of target</div>
        ${kv('Allowance used', `<span class="rev">${fmt(tyUsed())}</span>`)}
        ${kv('Allowance remaining', `<span class="rev">${fmt(Math.max(0, 20000 - tyUsed()))}</span>`)}
        ${kv('Platform fee', plan().cover ? '0.20%' : '0.25%')}
        <button class="btn" data-contrib style="margin-top:12px">Add to ISA</button></div>
      <div class="card"><h2>Portfolio</h2>
        ${[['Vanguard FTSE Global All Cap', .46], ['Vanguard US Equity Index', .22],
          ['iShares Core MSCI World', .16], ['Vanguard Emerging Markets', .09], ['Cash', .07]]
          .map(([n, w]) => `<div style="margin:8px 0"><div style="display:flex;justify-content:space-between;font-size:13px">
            <span>${n}</span><b class="rev">${fmt(isaBal() * w)}</b></div>${meter(w * 100, 100, 'var(--ink)')}</div>`).join('')}</div>
      <div class="card"><h2>Value over time</h2><div id="isaChart"></div></div>
      <div class="h-sec"><h2>Ledger</h2><button data-go="statements">Statements</button></div>
      <div class="card" style="padding:4px 14px"><ul class="txlist">
        ${s.isa.slice(0, 40).map(r => `<li class="tx"><span class="lg"><span class="lg__i">${r.type[0]}</span></span>
          <span class="mid"><span class="nm">${esc(r.note)}</span><span class="mt">${r.date} · ${r.type}</span></span>
          <span class="amt rev">${fmt(r.value)}</span></li>`).join('')}</ul></div>`;
    const asc = s.isa.slice().reverse(), step = Math.max(1, Math.floor(asc.length / 140));
    lineChart(root.querySelector('#isaChart'), asc.filter((_, i) => i % step === 0).map(r => ({ d: r.date, v: r.value })), { h: 150 });
  };
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-contrib]')) return;
    const left = Math.max(0, 20000 - tyUsed());
    sheet(`<h2>Add to ISA</h2><div class="sub">Remaining allowance ${fmt(left)}</div>
      <div class="field"><label>Amount</label><input id="isaAmt" type="number" min="1"></div>
      <button class="btn" id="isaGo">Move to ISA</button>`);
    document.getElementById('isaGo').onclick = () => {
      const v = +document.getElementById('isaAmt').value;
      if (!v || v <= 0) return toast('Enter an amount');
      if (v > balNow()) return toast('Not enough in your balance');
      if (v > left) return toast('Over your ISA allowance');
      const s = getState();
      s.isa.unshift({ id: 'c' + Date.now(), date: TODAY, type: 'ISA', contrib: v, growth: 0,
        value: round2(isaBal() + v), note: 'ISA subscription' });
      addTx('Vanguard', 'Investments', -v, 'ISA subscription');
      closeSheet(); render(); toast('Added to ISA');
    };
  });
  render();
}

export function mountStatements(root){
  let kind = 'acc', all = false;
  const render = () => {
    const s = getState();
    const src = kind === 'acc' ? s.tx : s.isa;
    const months = [...new Set(src.map(r => r.date.slice(0, 7)))].sort().reverse();
    const rows = all
      ? kv(`All time · ${src.length} rows`,
          `<button class="btn ghost sm" data-pdf="all">PDF</button>
           <button class="btn ghost sm" data-csv="all">CSV</button>`)
      : months.slice(0, 24).map(ym => {
          const [y, m] = ym.split('-');
          return kv(`${MONTHS[+m - 1]} ${y}`,
            `<button class="btn ghost sm" data-pdf="${ym}">PDF</button>
             <button class="btn ghost sm" data-csv="${ym}">CSV</button>`);
        }).join('');
    root.innerHTML = `<div class="h-sec"><h2>Statements</h2></div>
      ${chipRow([{ value: 'acc', label: 'Current account' }, { value: 'isa', label: 'ISA' }], kind, 'stmt')}
      ${chipRow([{ value: 'months', label: 'By month' }, { value: 'all', label: 'All time' }],
        all ? 'all' : 'months', 'range')}
      <div class="card">${rows || empty('No statements')}</div>
      <p class="note">${all
        ? `Everything on this ${kind === 'acc' ? 'account' : 'ISA'} up to ${TODAY}.`
        : `Showing the last ${Math.min(24, months.length)} of ${months.length} months.`}</p>`;
  };
  root.addEventListener('click', e => {
    const chip = e.target.closest('[data-stmt]');
    if (chip){ kind = chip.dataset.stmt; return render(); }
    const range = e.target.closest('[data-range]');
    if (range){ all = range.dataset.range === 'all'; return render(); }
    const pdf = e.target.closest('[data-pdf]');
    if (pdf) return download(kind, pdf.dataset.pdf, true);
    const csv = e.target.closest('[data-csv]');
    if (csv) return download(kind, csv.dataset.csv, false);
  });
  render();
}

function download(kind, ym, asPdf){
  const s = getState(), isa = kind === 'isa';
  const scope = r => ym === 'all' || r.date.slice(0, 7) === ym;
  const rows = isa
    ? s.isa.filter(scope).reverse().map(r => [r.date, r.type, r.contrib.toFixed(2), r.growth.toFixed(2), r.value.toFixed(2), r.note])
    : s.tx.filter(scope).reverse().map(t => [t.date, t.time, t.name, t.cat, t.amt.toFixed(2), t.bal.toFixed(2), t.note]);
  if (!rows.length) return toast('Nothing in that range');
  const head = isa ? ['Date','Type','Contribution','Growth','Value','Note'] : ['Date','Time','Description','Category','Amount','Balance','Note'];
  const stamp = ym === 'all' ? 'all-time' : ym;
  const name = `${isa ? 'isa' : 'statement'}-${stamp}`;
  const [y, m] = ym === 'all' ? ['', ''] : ym.split('-');
  const period = ym === 'all'
    ? `All time · to ${TODAY}`
    : `${MONTHS[+m - 1]} ${y}`;
  if (!asPdf){
    const csv = [head, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a'); a.href = url; a.download = name + '.csv'; a.click();
    URL.revokeObjectURL(url); return toast('Downloaded ' + name + '.csv');
  }
  const w = window.open('', '_blank');
  if (!w) return toast('Allow pop-ups to print');
  w.document.write(`<title>${name}</title><style>body{font-family:-apple-system,Arial,sans-serif;padding:32px;color:#0b1a26}
    h1{font-size:20px;margin:0 0 2px}.sub{color:#6b7c8a;font-size:13px;margin-bottom:18px}
    table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;padding:6px 4px;border-bottom:1px solid #e6ebef}
    th{font-size:11px;text-transform:uppercase;color:#6b7c8a}.amt{text-align:right}</style>
    <h1>Monzo — ${isa ? 'ISA' : 'Current account'} statement</h1>
    <div class="sub">${esc(s.profile.name)} · ${esc(s.profile.a1)}, ${esc(s.profile.city)}, ${esc(s.profile.post)} · ${period}</div>
    <table><thead><tr>${head.map(h => `<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td class="${i === 4 ? 'amt' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
  w.document.close(); w.focus(); setTimeout(() => w.print(), 350);
  toast('Statement ready to print');
}
