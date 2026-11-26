/* src/screens-b.js — settings, tools and detail surfaces. */

import {
  getState, commit, esc, fmt, TODAY, round2, plan, PLANS_BANK, CATS, BANKS, BB_CAP,
  setProfile, setPin, setCredId, setTheme, setZoom, setMotion, togglePriv, toggleRoundups,
  addPayee, updatePayee, deletePayee, sendMoney, requestMoney, settleRequest, cancelRequest,
  addVirtualCard, freezeVCard, renameVCard,
  deleteVCard, toggleFreeze, setPlan, setFamily, flexAvail, flexPurchase, flexMonthly,
  settleFlex, arrangeOverdraft, cancelOverdraft, takeLoan, loanMonthly, aprForLoan, overpayLoan,
  challengeSave, restartChallenge, billsbackOptIn, billsbackDraw, bbBills, connectBank,
  removeBank, addExtraAccount, updateExtraAccount, closeExtraAccount, moveToExtraAccount,
  closeAccount, reopenAccount, setActiveAccount,
  takeAura, setAura, payOutCashback, CASHBACK_MIN, raiseDispute, closeDispute,
  creditAction, CREDIT_ACTIONS, pushChat, clearNotifs, markAllRead, updateTx, deleteTx,
  balNow, addTx
} from './core.js';

import {
  go, toast, sheet, closeSheet, logo, kv, badge, empty, txRow, meter, chipRow
} from './ui.js';

export function mountPayees(root){
  const render = () => {
    const s = getState();
    const sorted = s.payees.slice().sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || (b.last || '').localeCompare(a.last || ''));
    root.innerHTML = `<div class="h-sec"><h2>Payees</h2><button data-add>Add</button></div>
      <div class="card" style="padding:6px 8px">${sorted.map(p => `
        <div class="pot"><span class="lg"><span class="lg__i">${esc(p.name.split(' ').map(w => w[0]).join('').slice(0, 2))}</span></span>
          <span class="mid"><span class="nm">${esc(p.name)} ${p.fav ? badge('Fav', 'ok') : ''}${p.last === TODAY ? badge('Recent') : ''}</span>
            <span class="sub">${esc(p.sc)} · ${esc(p.ac)}</span></span>
          <button class="iconbtn" data-send="${p.id}" aria-label="Send">➤</button>
          <button class="iconbtn" data-fav="${p.id}" aria-label="Favourite">${p.fav ? '★' : '☆'}</button>
          <button class="iconbtn" data-edit="${p.id}" aria-label="Edit">✎</button></div>`).join('') || empty('No payees yet')}</div>`;
  };
  const form = id => {
    const p = id ? getState().payees.find(x => x.id === id) : { name: '', sc: '', ac: '' };
    sheet(`<h2>${id ? 'Edit' : 'New'} payee</h2>
      <div class="field"><label>Name</label><input id="pyName" value="${esc(p.name)}"></div>
      <div class="field"><label>Sort code</label><input id="pySc" value="${esc(p.sc)}"></div>
      <div class="field"><label>Account number</label><input id="pyAc" value="${esc(p.ac)}"></div>
      <button class="btn" id="pySave">Save</button>
      ${id ? `<button class="btn ghost" id="pyDel" style="margin-top:10px">Delete</button>` : ''}`);
    document.getElementById('pySave').onclick = () => {
      const name = document.getElementById('pyName').value.trim();
      if (!name) return toast('Enter a name');
      const data = { name, sc: document.getElementById('pySc').value, ac: document.getElementById('pyAc').value };
      if (id) updatePayee(id, data); else addPayee(data);
      closeSheet(); render(); toast('Saved');
    };
    const del = document.getElementById('pyDel');
    if (del) del.onclick = () => { deletePayee(id); closeSheet(); render(); toast('Deleted'); };
  };
  const send = id => {
    const p = getState().payees.find(x => x.id === id);
    if (!p) return;
    sheet(`<h2>Send to ${esc(p.name)}</h2><div class="sub">${esc(p.sc)} · ${esc(p.ac)}</div>
      <div class="field"><label>Amount</label><input id="sdAmt" type="number" min="1"></div>
      <div class="field"><label>Reference</label><input id="sdRef" value="Payment"></div>
      <button class="btn" id="sdNext">Continue</button>`);
    document.getElementById('sdNext').onclick = () => {
      const v = +document.getElementById('sdAmt').value;
      const ref = document.getElementById('sdRef').value || 'Payment';
      if (!v || v <= 0) return toast('Enter an amount');
      sheet(`<h2>Confirm</h2>${kv('To', esc(p.name))}${kv('Sort code', esc(p.sc))}${kv('Account', esc(p.ac))}
        ${kv('Reference', esc(ref))}${kv('Amount', `<span class="rev">${fmt(v)}</span>`)}
        <button class="btn" id="sdGo" style="margin-top:14px">Send ${fmt(v)}</button>
        <button class="btn ghost" id="sdBack" style="margin-top:8px">Back</button>`);
      document.getElementById('sdBack').onclick = () => send(id);
      document.getElementById('sdGo').onclick = () => {
        const res = sendMoney(id, v, ref);
        if (!res.ok) return toast(res.msg);
        closeSheet(); go('home'); toast('Sent');
      };
    };
  };
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-add],[data-send],[data-fav],[data-edit]');
    if (!t) return;
    if (t.hasAttribute('data-add')) return form(null);
    if (t.dataset.send) return send(t.dataset.send);
    if (t.dataset.fav){
      const p = getState().payees.find(x => x.id === t.dataset.fav);
      if (p) updatePayee(p.id, { fav: !p.fav });
      return render();
    }
    if (t.dataset.edit) return form(t.dataset.edit);
  });
  render();
}

export function mountRequest(root){
  let payeeId = '';
  const render = () => {
    const s = getState();
    if (!payeeId && s.payees.length) payeeId = s.payees[0].id;
    root.innerHTML = `<div class="h-sec"><h2>Request money</h2></div>
      <div class="card"><h2>New request</h2>
        <div class="field"><label for="rqWho">From</label><select id="rqWho">
          ${s.payees.map(p => `<option value="${p.id}" ${p.id === payeeId ? 'selected' : ''}>${esc(p.name)}</option>`).join('')}
        </select></div>
        <div class="field"><label for="rqAmt">Amount</label><input id="rqAmt" type="number" min="1" step="0.01"></div>
        <div class="field"><label for="rqNote">What for</label><input id="rqNote" placeholder="Steak night"></div>
        <button class="btn" data-send>Send request</button></div>
      <div class="card"><h2>Outstanding</h2>
        ${s.requests.length ? s.requests.map(r => `<div class="pot"><span class="lg"><span class="lg__i">${esc(r.name[0])}</span></span>
          <span class="mid"><span class="nm">${esc(r.name)}</span><span class="sub">${esc(r.note || 'Request')} · ${esc(r.date)}</span></span>
          <span class="amt rev">${fmt(r.amount)}</span>
          <button class="btn ghost sm" data-paid="${r.id}">Received</button>
          <button class="iconbtn" data-cancel="${r.id}" aria-label="Cancel">✕</button></div>`).join('')
          : empty('Nothing outstanding')}</div>
      <p class="note">Tap Received when the money lands and it is credited to your balance.</p>`;
  };
  root.addEventListener('change', e => { if (e.target.id === 'rqWho') payeeId = e.target.value; });
  root.addEventListener('click', e => {
    if (e.target.closest('[data-send]')){
      const amt = +root.querySelector('#rqAmt').value;
      const note = root.querySelector('#rqNote').value.trim();
      const r = requestMoney(payeeId, amt, note);
      if (!r.ok) return toast(r.msg);
      render(); return toast('Request sent');
    }
    const paid = e.target.closest('[data-paid]');
    if (paid){
      const r = settleRequest(paid.dataset.paid);
      if (!r.ok) return toast(r.msg);
      render(); return toast('Marked received');
    }
    const c = e.target.closest('[data-cancel]');
    if (c){ cancelRequest(c.dataset.cancel); render(); toast('Cancelled'); }
  });
  render();
}

export function mountCards(root){
  const render = () => {
    const s = getState(), p = plan();
    root.innerHTML = `<div class="h-sec"><h2>Cards</h2><button data-new>New virtual</button></div>
      <div class="card">${kv('Physical card · 4000 1234', badge(s.frozen ? 'Frozen' : 'Active', s.frozen ? 'bad' : 'ok'))}
        <button class="btn ghost sm" data-freeze style="margin:10px 0">${s.frozen ? 'Unfreeze' : 'Freeze'}</button>
        ${s.vcards.map(v => `<div class="pot"><span class="lg"><span class="lg__i">${esc(v.label[0])}</span></span>
          <span class="mid"><span class="nm">${esc(v.label)}</span><span class="sub">${esc(v.num)}</span></span>
          <button class="iconbtn" data-vf="${v.id}" aria-label="Freeze">${v.frozen ? '❄' : '✓'}</button>
          <button class="iconbtn" data-vr="${v.id}" aria-label="Rename">✎</button>
          <button class="iconbtn" data-vd="${v.id}" aria-label="Delete">🗑</button></div>`).join('')}</div>
      <p class="note">${p.vcLive ? `${s.vcards.length} of ${p.vcLive} live virtual cards.` : 'Virtual cards need Extra, Perks or Max.'}</p>`;
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-freeze]')){ toggleFreeze(); return render(); }
    if (e.target.closest('[data-new]')){ const r = addVirtualCard(); if (!r.ok) return toast(r.msg); render(); return toast('Card created'); }
    const vf = e.target.closest('[data-vf]');
    if (vf){ freezeVCard(vf.dataset.vf); return render(); }
    const vd = e.target.closest('[data-vd]');
    if (vd){ deleteVCard(vd.dataset.vd); return render(); }
    const vr = e.target.closest('[data-vr]');
    if (vr){
      const v = getState().vcards.find(x => x.id === vr.dataset.vr);
      if (!v) return;
      sheet(`<h2>Rename card</h2><div class="field"><label>Label</label><input id="vcLabel" value="${esc(v.label)}"></div>
        <button class="btn" id="vcSave">Save</button>`);
      document.getElementById('vcSave').onclick = () => {
        renameVCard(v.id, document.getElementById('vcLabel').value.trim() || v.label);
        closeSheet(); render(); toast('Renamed');
      };
    }
  });
  render();
}

export function mountPlan(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Plans</h2></div>` +
      Object.entries(PLANS_BANK()).map(([k, p]) => `
        <div class="card" style="border:2px solid ${k === s.plan ? 'var(--coral)' : 'transparent'}">
          <div style="display:flex;justify-content:space-between"><h2 style="margin:0">${p.name}</h2>
            <b>${p.price ? '£' + p.price + '/mo' : 'Free'}</b></div>
          <div class="sub">${p.age}</div>
          ${kv('Instant Access rate', p.ia + '% AER')}
          ${kv('ATM abroad', '£' + p.atmRow)}
          ${kv('Billsback', p.billsback ? 'Yes' : 'No')}
          ${kv('Insurance', p.cover ? 'Yes' : 'No')}
          ${k === s.plan ? `<div style="margin-top:10px">${badge('Your plan', 'coral')}</div>`
            : `<button class="btn" data-plan="${k}" style="margin-top:10px">Switch to ${p.name}</button>`}</div>`).join('') +
      `<div class="card"><h2>Family add-on</h2><div class="sub">Max only · +£4/month · covers 2 adults and 2 children</div>
        <div class="toggle"><div><div class="t">Cover the household</div></div>
          <button class="sw ${s.family ? 'on' : ''}" data-family aria-label="Family add-on"></button></div></div>`;
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-family]')){
      const r = setFamily(!getState().family);
      if (!r.ok) return toast(r.msg);
      return render();
    }
    const t = e.target.closest('[data-plan]');
    if (!t) return;
    const key = t.dataset.plan, to = PLANS_BANK()[key], from = plan();
    const diff = round2(to.price - from.price);
    sheet(`<h2>Switch to ${to.name}</h2><div class="sub">${to.price ? '£' + to.price + '/month' : 'Free'}</div>
      ${diff > 0 ? kv('Charged today', `<span class="rev">${fmt(diff)}</span>`) : ''}
      ${from.cover && !to.cover ? kv('Insurance', 'Policies end today') : ''}
      ${!from.cover && to.cover ? kv('Insurance', 'Policies start today') : ''}
      <button class="btn" id="spGo">Confirm</button>`);
    document.getElementById('spGo').onclick = () => { setPlan(key); closeSheet(); render(); toast('Plan updated'); };
  });
  render();
}

export function mountLimits(root){
  const render = () => {
    const p = plan(), s = getState();
    const max = p.atmRow;
    const current = Math.min(Number(s.atmLimit) || max, max);
    root.innerHTML = `<div class="h-sec"><h2>Limits</h2></div><div class="card">
      <h2>Daily ATM limit</h2><div class="sub">Your plan allows up to £${max}</div>
      ${chipRow([50, 100, 200, 300, 500, 600].filter(v => v <= max).map(v => ({ value: v, label: '£' + v })), current, 'atm')}
      ${kv('Abroad', '£' + max + ' per 30 days')}
      ${kv('Contactless', '£100/day')}${kv('Card payments', '£5,000/day')}${kv('Transfers', '£10,000/day')}
      ${kv('Cash deposits', p.cover ? '3 free/month' : '£1 each')}</div>`;
  };
  root.addEventListener('click', e => {
    const c = e.target.closest('[data-atm]');
    if (!c) return;
    getState().atmLimit = +c.dataset.atm;
    commit(); render(); toast('Limit set to £' + c.dataset.atm);
  });
  render();
}

export function mountBorrow(root){
  const s = getState();
  root.innerHTML = `<div class="h-sec"><h2>Borrowing</h2></div><div class="card" style="padding:6px 8px">
    <button class="pot" data-go="flex"><span class="lg"><span class="lg__i">FLX</span></span><span class="mid"><span class="nm">Monzo Flex</span>
      <span class="sub">${fmt(flexAvail())} available</span></span><span class="amt">›</span></button>
    <button class="pot" data-go="aura"><span class="lg"><span class="lg__i">AUR</span></span><span class="mid"><span class="nm">Monzo Aura</span>
      <span class="sub">Cashback card</span></span><span class="amt">›</span></button>
    <button class="pot" data-go="overdraft"><span class="lg"><span class="lg__i">OVD</span></span><span class="mid"><span class="nm">Overdraft</span>
      <span class="sub">${s.overdraft.limit ? fmt(s.overdraft.limit) : 'Not arranged'}</span></span><span class="amt">›</span></button>
    <button class="pot" data-go="loans"><span class="lg"><span class="lg__i">LN</span></span><span class="mid"><span class="nm">Loans</span>
      <span class="sub">Up to £35,000</span></span><span class="amt">›</span></button></div>`;
}

export function mountFlex(root){
  let term = 3;
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Monzo Flex</h2></div>
      <div class="card"><div class="sub">Available</div>
        <div class="balance rev" style="font-size:30px;margin:4px 0">${fmt(flexAvail())}</div>
        ${meter(s.flex.used, s.flex.limit)}${kv('Limit', `<span class="rev">${fmt(s.flex.limit)}</span>`)}
        <button class="btn" data-new style="margin-top:12px">Pay with Flex</button></div>
      <div class="card"><h2>Plans</h2>
        ${s.flex.plans.length ? s.flex.plans.map(p => `<div style="padding:9px 0;border-bottom:1px solid var(--line)">
          <div style="display:flex;justify-content:space-between;font-size:14px"><span>${esc(p.name)}</span><b class="rev">${fmt(p.remaining)}</b></div>
          ${meter(round2(p.amount - p.remaining), p.amount)}
          <div style="font-size:12.5px;color:var(--ink2)">${p.term} months · ${fmt(p.monthly)}/mo</div>
          <button class="btn ghost sm" data-settle="${p.id}" style="margin-top:6px">Settle ${fmt(p.remaining)}</button></div>`).join('')
          : empty('No plans')}</div>`;
  };
  const form = () => {
    term = 3;
    sheet(`<h2>Pay with Flex</h2><div class="sub">${fmt(flexAvail())} available</div>
      <div class="field"><label>Where</label><input id="fxName"></div>
      <div class="field"><label>Amount</label><input id="fxAmt" type="number" min="1"></div>
      ${chipRow([{ value: 3, label: '3 months · 0%' }, { value: 6, label: '6 · 29%' }, { value: 12, label: '12 · 29%' }], 3, 'term')}
      ${kv('Monthly', '<span class="rev" id="fxMonthly">—</span>')}
      <button class="btn" id="fxGo" style="margin-top:12px">Confirm</button>`);
    const quote = () => {
      const a = +document.getElementById('fxAmt').value || 0;
      document.getElementById('fxMonthly').textContent = a ? fmt(flexMonthly(a, term)) : '—';
      document.querySelectorAll('[data-term]').forEach(b => b.classList.toggle('on', +b.dataset.term === term));
    };
    document.getElementById('fxAmt').oninput = quote;
    document.querySelectorAll('[data-term]').forEach(b => b.onclick = () => { term = +b.dataset.term; quote(); });
    document.getElementById('fxGo').onclick = () => {
      const n = document.getElementById('fxName').value.trim();
      if (!n) return toast('Where was it?');
      const r = flexPurchase(n, +document.getElementById('fxAmt').value, term);
      if (!r.ok) return toast(r.msg);
      closeSheet(); render(); toast('Flexed');
    };
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-new]')) return form();
    const s = e.target.closest('[data-settle]');
    if (s){ const r = settleFlex(s.dataset.settle); if (!r.ok) return toast(r.msg); render(); toast('Settled'); }
  });
  render();
}

export function mountAura(root){
  const render = () => {
    const a = getState().aura;
    const cash = round2(a.cashback || 0);
    root.innerHTML = `<div class="h-sec"><h2>Monzo Aura</h2></div><div class="card">
      <div class="sub">£15 per month · 1% cashback on card spend</div>
      ${kv('Status', a.active ? badge('Active', 'ok') : badge('Off'))}
      ${kv('Cashback earned', `<span class="rev">${fmt(cash)}</span>`)}
      ${kv('Lounge passes', a.lounge)}${kv('Fast track', a.fast)}
      <div class="row2" style="margin-top:10px">
        <button class="btn ghost sm" data-lounge ${a.lounge ? '' : 'disabled'}>Use lounge pass</button>
        <button class="btn ghost sm" data-fast ${a.fast ? '' : 'disabled'}>Use fast track</button></div>
      <button class="btn ghost sm" data-cashback style="margin-top:10px;width:100%"
        ${cash >= CASHBACK_MIN ? '' : 'disabled'}>Move ${fmt(cash)} to balance</button>
      <div class="toggle" style="margin-top:10px"><div><div class="t">Auto-invest cashback</div></div>
        <button class="sw ${a.auto ? 'on' : ''}" data-auto aria-label="Auto invest"></button></div>
      <button class="btn" data-toggle style="margin-top:14px">${a.active ? 'Close Aura' : 'Take out Aura'}</button></div>
      <p class="note">Cashback accrues at 1% on groceries, eating out, transport, shopping, health, education, entertainment, fitness and kids. £${CASHBACK_MIN} minimum to move out.</p>`;
  };
  root.addEventListener('click', e => {
    const a = getState().aura;
    if (e.target.closest('[data-lounge]') && a.lounge){ setAura({ lounge: a.lounge - 1 }); render(); return toast('Pass used'); }
    if (e.target.closest('[data-fast]') && a.fast){ setAura({ fast: a.fast - 1 }); render(); return toast('Pass used'); }
    if (e.target.closest('[data-auto]')){ setAura({ auto: !a.auto }); return render(); }
    if (e.target.closest('[data-cashback]')){
      const r = payOutCashback();
      if (!r.ok) return toast(r.msg);
      render(); return toast(`${fmt(r.amt)} moved to your balance`);
    }
    if (e.target.closest('[data-toggle]')){ const on = takeAura(); render(); toast(on ? 'Aura active' : 'Closed'); }
  });
  render();
}

export function mountOverdraft(root){
  let pending = 0;
  const render = () => {
    const o = getState().overdraft, bal = balNow();
    root.innerHTML = `<div class="h-sec"><h2>Overdraft</h2></div><div class="card">
      <div class="balance rev" style="font-size:30px;margin:4px 0">${fmt(o.limit)}</div>
      ${kv('Rate', o.rate ? o.rate + '% EAR' : '—')}${kv('Used', `<span class="rev">${fmt(Math.max(0, -bal))}</span>`)}
      ${chipRow([250, 500, 1000, 2000].map(v => ({ value: v, label: '£' + v })), pending || null, 'od')}
      <button class="btn" data-apply style="margin-top:12px">Apply</button>
      ${o.limit ? `<button class="btn ghost" data-cancel style="margin-top:8px">Cancel overdraft</button>` : ''}</div>`;
  };
  root.addEventListener('click', e => {
    const c = e.target.closest('[data-od]');
    if (c){ pending = +c.dataset.od; return render(); }
    if (e.target.closest('[data-apply]')){ if (!pending) return toast('Choose an amount'); arrangeOverdraft(pending); render(); toast('Arranged'); }
    if (e.target.closest('[data-cancel]')){ cancelOverdraft(); render(); toast('Cancelled'); }
  });
  render();
}

export function mountLoans(root){
  const render = () => {
    const amt = +((root.querySelector('#lnAmt') || {}).value) || 8000;
    const term = +((root.querySelector('#lnTerm') || {}).value) || 24;
    const apr = aprForLoan(amt), monthly = loanMonthly(amt, term);
    root.innerHTML = `<div class="h-sec"><h2>Loans</h2></div><div class="card">
      <div class="field"><label>Amount</label><input id="lnAmt" type="number" min="1000" max="35000" step="500" value="${amt}"></div>
      <div class="field"><label>Term</label><select id="lnTerm">${[12,24,36,48,60].map(t => `<option ${t === term ? 'selected' : ''}>${t}</option>`).join('')}</select></div>
      ${kv('APR', apr + '%')}${kv('Monthly', `<span class="rev">${fmt(monthly)}</span>`)}
      ${kv('Total', `<span class="rev">${fmt(round2(monthly * term))}</span>`)}
      <button class="btn" data-apply style="margin-top:12px">Apply</button></div>
      <div class="card"><h2>Your loans</h2>
        ${getState().loans.length ? getState().loans.map(l => `<div style="padding:9px 0;border-bottom:1px solid var(--line)">
          <div style="display:flex;justify-content:space-between;font-size:14px"><span>${fmt(l.amount)}</span><b class="rev">${fmt(l.outstanding)}</b></div>
          ${meter(l.paid, l.term)}
          <button class="btn ghost sm" data-over="${l.id}" style="margin-top:6px">Overpay</button></div>`).join('') : empty('No loans')}</div>`;
    root.querySelector('#lnAmt').oninput = render;
    root.querySelector('#lnTerm').onchange = render;
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-apply]')){
      const r = takeLoan(+root.querySelector('#lnAmt').value, +root.querySelector('#lnTerm').value);
      if (!r.ok) return toast(r.msg);
      render(); return toast('Loan paid in');
    }
    const o = e.target.closest('[data-over]');
    if (o){
      sheet(`<h2>Overpay</h2><div class="field"><label>Amount</label><input id="ovAmt" type="number" min="1"></div>
        <button class="btn" id="ovGo">Pay</button>`);
      document.getElementById('ovGo').onclick = () => {
        const r = overpayLoan(o.dataset.over, +document.getElementById('ovAmt').value);
        if (!r.ok) return toast(r.msg);
        closeSheet(); render(); toast('Paid');
      };
    }
  });
  render();
}

export function mountConnected(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Connected</h2></div>
      <div class="card"><h2>Add a bank</h2>${chipRow(BANKS, null, 'bank')}</div>
      <div class="card"><h2>Connected</h2>
        ${s.connected.length ? s.connected.map(c => `<div class="pot"><span class="lg"><span class="lg__i">${esc(c.bank[0])}</span></span>
          <span class="mid"><span class="nm">${esc(c.bank)}</span><span class="sub">${esc(c.kind)}</span></span>
          <span class="amt rev">${fmt(c.bal)}</span>
          <button class="iconbtn" data-rm="${c.id}" aria-label="Remove">🗑</button></div>`).join('') : empty('None connected')}</div>`;
  };
  root.addEventListener('click', e => {
    const b = e.target.closest('[data-bank]');
    if (b){ const r = connectBank(b.dataset.bank); if (!r.ok) return toast(r.msg); render(); return toast('Connected'); }
    const rm = e.target.closest('[data-rm]');
    if (rm){ removeBank(rm.dataset.rm); render(); toast('Removed'); }
  });
  render();
}

export function mountCredit(root){
  const render = () => {
    const s = getState(), scores = plan().scores;
    root.innerHTML = `<div class="h-sec"><h2>Credit insights</h2></div>
      <div class="card"><div style="display:flex;gap:20px">
        <div style="flex:1"><div class="sub">Equifax</div><div class="score">${s.credit.eq}</div>
          ${badge(s.credit.eq > 650 ? 'Good' : 'Fair', s.credit.eq > 650 ? 'ok' : 'warn')}</div>
        ${scores > 1 ? `<div style="flex:1"><div class="sub">TransUnion</div><div class="score">${s.credit.tu}</div>
          ${badge(s.credit.tu > 650 ? 'Good' : 'Fair', s.credit.tu > 650 ? 'ok' : 'warn')}</div>` : ''}
      </div></div>
      <div class="card"><h2>Boost your score</h2>
        ${CREDIT_ACTIONS.map(a => { const done = s.credit.done.includes(a.key);
          return `<div class="pot"><span class="lg"><span class="lg__i">${done ? '✓' : '+'}</span></span>
            <span class="mid"><span class="nm">${esc(a.label)}</span><span class="sub">+${a.gain} points</span></span>
            ${done ? badge('Done', 'ok') : `<button class="btn ghost sm" data-do="${a.key}">Do it</button>`}</div>`; }).join('')}</div>`;
  };
  root.addEventListener('click', e => {
    const d = e.target.closest('[data-do]');
    if (!d) return;
    const r = creditAction(d.dataset.do);
    if (!r.ok) return toast(r.msg);
    render(); toast('+' + r.gain + ' points');
  });
  render();
}

export function mountChallenge(root){
  const render = () => {
    const c = getState().challenge;
    root.innerHTML = `<div class="h-sec"><h2>Saving Challenge</h2></div>
      <div class="card"><div class="balance rev" style="font-size:30px;margin:4px 0">${fmt(c.saved)}</div>
        ${meter(c.saved, 667.95)}${kv('Day', `${c.day} of 365`)}
        ${kv('Today', `<span class="rev">${fmt(round2((c.day + 1) / 100))}</span>`)}
        <button class="btn" data-save style="margin-top:12px">Save today's amount</button>
        <button class="btn ghost" data-restart style="margin-top:8px">Restart challenge</button></div>`;
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-save]')){ const r = challengeSave(); if (!r.ok) return toast(r.msg); render(); return toast('Saved ' + fmt(r.amt)); }
    if (e.target.closest('[data-restart]')){ restartChallenge(); render(); toast('Challenge reset'); }
  });
  render();
}

export function mountBillsback(root){
  const render = () => {
    const s = getState(), bills = bbBills();
    root.innerHTML = `<div class="h-sec"><h2>Billsback</h2></div>
      <div class="card">${kv('Eligible', plan().billsback ? badge('Yes', 'ok') : badge('Needs Extra', 'bad'))}
        <div class="toggle"><div><div class="t">Opt in</div></div>
          <button class="sw ${s.billsback.optIn ? 'on' : ''}" data-opt aria-label="Opt in"></button></div>
        <button class="btn" data-draw style="margin-top:14px">Enter draw</button></div>
      <div class="card"><h2>Eligible bills</h2>
        ${bills.length ? bills.map(b => kv(`${esc(b.name)} · ${fmt(Math.min(Math.abs(b.amt), BB_CAP))}`, esc(b.date))).join('') : empty('None this month')}</div>
      <div class="card"><h2>Results</h2>
        ${s.billsback.history.length ? s.billsback.history.map(h => kv(`${esc(h.month)}${h.bill ? ' · ' + esc(h.bill) : ''}`,
          h.won ? badge(fmt(h.amount) + ' back', 'ok') : badge('No win'))).join('') : empty('No draws')}</div>`;
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-opt]')){ const r = billsbackOptIn(); if (!r.ok) return toast(r.msg); return render(); }
    if (e.target.closest('[data-draw]')){ const r = billsbackDraw(); if (!r.ok) return toast(r.msg); render(); toast(r.won ? 'You won ' + fmt(r.amount) : 'No win'); }
  });
  render();
}

export function mountInsurance(root){
  const render = () => {
    const s = getState();
    const covered = !!plan().cover;
    const live = s.policies.filter(p => p.status === 'Active').length;
    root.innerHTML = `<div class="h-sec"><h2>Insurance</h2></div>
      ${covered ? '' : `<div class="card"><div class="sub">Not on ${esc(plan().name)} — cover ends when your plan does.</div>
        <button class="btn" data-go="plan" style="margin-top:10px">See plans</button></div>`}
      <div class="card">
        ${s.policies.length ? s.policies.map(p => kv(
          `${esc(p.name)}<br><span style="font-size:12.5px">${esc(p.number)} · ${p.status === 'Active' ? badge('Active', 'ok') : badge(esc(p.status), 'bad')}</span>`,
          `<button class="btn ghost sm" data-pol="${p.id}">Document</button>`)).join('') : empty('No policies')}
        <p class="note">Held with Aviva. ${live} of ${s.policies.length} policies in force. £75 excess per claim on travel and phone.</p></div>`;
  };
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-pol]');
    if (!t) return;
    const s = getState();
    const p = s.policies.find(x => x.id === t.dataset.pol);
    if (!p) return toast('Policy not found');
    const w = window.open('', '_blank');
    if (!w) return toast('Allow pop-ups to print');
    w.document.write(`<title>${esc(p.name)}</title><style>body{font-family:-apple-system,Arial,sans-serif;padding:32px;color:#0b1a26}
      h1{font-size:19px;margin:0 0 4px}.sub{color:#6b7c8a;font-size:13px;margin-bottom:20px}
      .row{display:flex;justify-content:space-between;padding:9px 0;border-bottom:1px solid #e6ebef;font-size:13px}
      .row span:first-child{color:#6b7c8a}.flag{margin-top:18px;padding:10px 12px;border-radius:8px;font-size:13px;
      background:${p.status === 'Active' ? '#eaf7ee' : '#fdecec'};color:${p.status === 'Active' ? '#1c6b31' : '#a3121f'}</style>
      <h1>${esc(p.name)}</h1><div class="sub">Policy ${esc(p.number)} · ${esc(plan().name)} plan</div>
      <div class="row"><span>Policyholder</span><b>${esc(s.profile.name)}</b></div>
      <div class="row"><span>Address</span><b>${esc(s.profile.a1)}, ${esc(s.profile.city)}, ${esc(s.profile.post)}</b></div>
      <div class="row"><span>Insurer</span><b>Aviva Insurance Ltd</b></div>
      <div class="row"><span>Status</span><b>${esc(p.status)}</b></div>
      <div class="row"><span>Cover started</span><b>${esc(p.start)}</b></div>
      ${p.ended ? `<div class="row"><span>Cover ended</span><b>${esc(p.ended)}</b></div>` : ''}
      <div class="row"><span>Excess per claim</span><b>${p.excess ? '£' + p.excess : 'None'}</b></div>
      <div class="row"><span>Emergency line</span><b>0800 051 0021</b></div>
      <div class="flag">${p.status === 'Active'
        ? 'This document confirms cover is in force today.'
        : 'This policy is not currently in force. Cover resumes if you return to a plan that includes insurance.'}</div>
      <p class="sub" style="margin-top:16px">${esc(p.note)}</p>`);
    w.document.close(); w.focus(); setTimeout(() => w.print(), 300);
    toast('Document ready to print');
  });
  render();
}

export function mountAccounts(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Your accounts</h2><button data-add>Add</button></div>
      <div class="card" style="padding:6px 8px">
        <div class="pot"><span class="lg"><span class="lg__i">PCA</span></span>
          <span class="mid"><span class="nm">${esc(s.acctName)} ${s.acctClosed ? badge('Closed', 'bad') : badge('Active', 'ok')}</span>
            <span class="sub">${s.acctClosed ? 'Closed — reopen to use it' : fmt(balNow())}</span></span>
          ${s.acctClosed
            ? `<button class="btn ghost sm" data-reopen>Reopen</button>`
            : `<button class="btn ghost sm" data-switch="personal">Use</button>
               <button class="iconbtn" data-close-personal aria-label="Close account">🗑</button>`}</div>
        <div class="pot"><span class="lg"><span class="lg__i">JNT</span></span><span class="mid"><span class="nm">Joint account</span>
          <span class="sub">With ${esc(s.partner)} · ${fmt(s.jointBal || 0)}</span></span>
          <button class="btn ghost sm" data-go="joint">Open</button></div>
        ${s.extraAccounts.map(a => `<div class="pot"><span class="lg"><span class="lg__i">${esc(a.name[0])}</span></span>
          <span class="mid"><span class="nm">${esc(a.name)}</span><span class="sub">${esc(a.type)} · ${fmt(a.bal || 0)}</span></span>
          <button class="iconbtn" data-fund="${a.id}" aria-label="Add money">＋</button>
          <button class="iconbtn" data-rename="${a.id}" aria-label="Rename">✎</button>
          <button class="iconbtn" data-close-acc="${a.id}" aria-label="Close">🗑</button></div>`).join('')}</div>`;
  };
  root.addEventListener('click', e => {
    const sw = e.target.closest('[data-switch]');
    if (sw){ setActiveAccount(sw.dataset.switch); render(); return toast('Switched'); }

    if (e.target.closest('[data-reopen]')){
      const r = reopenAccount();
      if (!r.ok) return toast(r.msg);
      render(); return toast('Account reopened');
    }

    const pc = e.target.closest('[data-close-personal]');
    if (pc){
      const bal = balNow();
      sheet(`<h2>Close your current account</h2>
        <div class="sub">${bal > 0
          ? `${fmt(bal)} moves to your joint account.`
          : 'Your balance is already £0.'}</div>
        <p class="note">Cards, direct debits and payees stay on file. You can reopen it any time.</p>
        <button class="btn" id="cpGo">Close account</button>`);
      document.getElementById('cpGo').onclick = () => {
        const r = closeAccount();
        if (!r.ok) return toast(r.msg);
        closeSheet(); render();
        toast(r.moved ? `Closed · ${fmt(r.moved)} moved to joint` : 'Account closed');
      };
      return;
    }

    const fund = e.target.closest('[data-fund]');
    if (fund){
      const a = getState().extraAccounts.find(x => x.id === fund.dataset.fund);
      if (!a) return;
      sheet(`<h2>Add to ${esc(a.name)}</h2><div class="sub">From ${esc(getState().acctName)}</div>
        <div class="field"><label>Amount</label><input id="faAmt" type="number" min="1"></div>
        <button class="btn" id="faGo">Move</button>`);
      document.getElementById('faGo').onclick = () => {
        const r = moveToExtraAccount(a.id, +document.getElementById('faAmt').value);
        if (!r.ok) return toast(r.msg);
        closeSheet(); render(); toast('Moved');
      };
      return;
    }

    const rn = e.target.closest('[data-rename]');
    if (rn){
      const a = getState().extraAccounts.find(x => x.id === rn.dataset.rename);
      if (!a) return;
      sheet(`<h2>Rename account</h2><div class="field"><label>Name</label><input id="raName" value="${esc(a.name)}"></div>
        <button class="btn" id="raGo">Save</button>`);
      document.getElementById('raGo').onclick = () => {
        updateExtraAccount(a.id, { name: document.getElementById('raName').value.trim() || a.name });
        closeSheet(); render(); toast('Renamed');
      };
      return;
    }

    const cl = e.target.closest('[data-close-acc]');
    if (cl){
      const a = getState().extraAccounts.find(x => x.id === cl.dataset.closeAcc);
      if (!a) return;
      sheet(`<h2>Close ${esc(a.name)}</h2>
        <div class="sub">${a.bal > 0
          ? `${fmt(a.bal)} will be returned to ${esc(getState().acctName)}.`
          : 'There is no balance to return.'}</div>
        <button class="btn" id="caGo">Close account</button>`);
      document.getElementById('caGo').onclick = () => {
        const r = closeExtraAccount(a.id);
        if (!r.ok) return toast(r.msg);
        closeSheet(); render();
        toast(r.returned > 0 ? `Closed · ${fmt(r.returned)} returned` : 'Account closed');
      };
      return;
    }

    if (!e.target.closest('[data-add]')) return;
    sheet(`<h2>Add an account</h2><div class="field"><label>Type</label><select id="aaType">
      <option>Under 16</option><option>16-17</option><option>Business</option></select></div>
      <div class="field"><label>Name</label><input id="aaName" placeholder="Child or trading name"></div>
      <button class="btn" id="aaGo">Open</button>`);
    document.getElementById('aaGo').onclick = () => {
      const n = document.getElementById('aaName').value.trim();
      if (!n) return toast('Enter a name');
      addExtraAccount(n, document.getElementById('aaType').value);
      closeSheet(); render(); toast('Opened');
    };
  });
  render();
}

export function mountAppearance(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Appearance</h2></div><div class="card">
      <div class="toggle"><div><div class="t">Theme</div></div>
        ${chipRow([{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }, { value: 'auto', label: 'Auto' }], s.theme, 'theme')}</div>
      <div class="toggle"><div><div class="t">Text size</div></div>
        ${chipRow([{ value: 1, label: 'A' }, { value: 1.12, label: 'A+' }, { value: 1.24, label: 'A++' }], s.zoom, 'zoom')}</div>
      <div class="toggle"><div><div class="t">Reduce motion</div></div>
        <button class="sw ${s.motion ? '' : 'on'}" data-motion aria-label="Reduce motion"></button></div></div>`;
  };
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-theme]'); if (t){ setTheme(t.dataset.theme); return render(); }
    const z = e.target.closest('[data-zoom]'); if (z){ setZoom(+z.dataset.zoom); return render(); }
    if (e.target.closest('[data-motion]')){ setMotion(!getState().motion); render(); }
  });
  render();
}

export function mountSearch(root, params){
  let cat = (params && params.cat) || 'All', q = '';
  root.innerHTML = `<div class="h-sec"><h2>Search</h2></div>
    <div class="field"><input id="sq" placeholder="Search" autocomplete="off"></div>
    <div id="schips"></div>
    <div class="card" style="padding:4px 14px"><ul class="txlist" id="sres"></ul></div>`;
  const chips = root.querySelector('#schips'), list = root.querySelector('#sres'), input = root.querySelector('#sq');
  const paintChips = () => { chips.innerHTML = chipRow(['All', ...CATS], cat, 'cat'); };
  const paintList = () => {
    const res = getState().tx.filter(t => (cat === 'All' || t.cat === cat) &&
      (!q || t.name.toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q))).slice(0, 60);
    list.innerHTML = res.length ? res.map(txRow).join('') : '<li class="empty">No matches</li>';
  };
  input.addEventListener('input', () => { q = input.value.toLowerCase(); paintList(); });
  root.addEventListener('click', e => {
    const c = e.target.closest('[data-cat]');
    if (c){ cat = c.dataset.cat; paintChips(); paintList(); }
  });
  paintChips(); paintList();
}

export function mountNotifs(root){
  const render = () => {
    const s = getState();
    const target = n => /salary|paid early/i.test(n.title) ? 'acc'
      : /interest/i.test(n.title) ? 'pots'
      : /flex/i.test(n.title) ? 'flex'
      : /loan/i.test(n.title) ? 'loans'
      : /billsback/i.test(n.title) ? 'billsback'
      : /plan/i.test(n.title) ? 'plan'
      : /dispute/i.test(n.title) ? 'disputes'
      : /account/i.test(n.title) ? 'accounts'
      : /request/i.test(n.title) ? 'request'
      : 'home';
    root.innerHTML = `<div class="h-sec"><h2>Notifications</h2><button data-clear>Clear</button></div>
      <div class="card">${s.notifs.length ? s.notifs.map(n => `<button class="pot" data-notif="${target(n)}">
        <span class="lg"><span class="lg__i">${n.read ? '·' : '●'}</span></span>
        <span class="mid"><span class="nm">${esc(n.title)}</span><span class="sub">${esc(n.body)}</span></span>
        <span class="amt" style="font-size:12px;color:var(--ink3)">${esc(n.time)}</span></button>`).join('')
        : empty('Nothing new')}</div>`;
    markAllRead();
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-clear]')){ clearNotifs(); return render(); }
    const n = e.target.closest('[data-notif]');
    if (n) go(n.dataset.notif);
  });
  render();
}

export function mountChat(root){
  const timers = [];
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Support</h2></div>
      <div class="card">${s.chat.length ? s.chat.map(m => `<div style="margin:9px 0;text-align:${m.who === 'me' ? 'right' : 'left'}">
        <div style="display:inline-block;max-width:82%;padding:10px 14px;border-radius:16px;
          background:${m.who === 'me' ? 'var(--coral)' : 'var(--line)'};color:${m.who === 'me' ? '#fff' : 'var(--ink)'}">${esc(m.text)}</div>
        <div style="font-size:11.5px;color:var(--ink3)">${esc(m.time)}</div></div>`).join('') : empty('Say hello')}</div>
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <input id="chatIn" class="chatinput" placeholder="Type a message">
        <button class="btn sm" data-send>Send</button></div>`;
  };
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-send]')) return;
    const i = root.querySelector('#chatIn'), v = i.value.trim();
    if (!v) return;
    pushChat('me', v); render();
    timers.push(setTimeout(() => {
      pushChat('them', 'Thanks Jason — looking into that now.');
      render();
    }, 900));
  });
  render();
  return () => timers.forEach(clearTimeout);
}

export function mountDisputes(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Disputes</h2></div><div class="card">
      ${s.disputes.length ? s.disputes.map(d => `<div class="pot"><span class="lg"><span class="lg__i">${d.status === 'Open' ? '!' : '✓'}</span></span>
        <span class="mid"><span class="nm">${esc(d.name)}</span><span class="sub">${esc(d.reason)}</span></span>
        ${d.status === 'Open' ? `<button class="btn ghost sm" data-close-d="${d.id}">Close</button>` : badge('Closed', 'ok')}</div>`).join('')
        : empty('No disputes')}</div>`;
  };
  root.addEventListener('click', e => {
    const c = e.target.closest('[data-close-d]');
    if (c){ closeDispute(c.dataset.closeD); render(); toast('Closed'); }
  });
  render();
}

export function mountJoint(root){
  const render = () => {
    const s = getState();
    const income = s.tx.filter(t => t.date.slice(0, 7) === TODAY.slice(0, 7) && t.cat === 'Income').reduce((a, t) => a + t.amt, 0);
    root.innerHTML = `<div class="h-sec"><h2>Joint account</h2></div><div class="card">
      <div class="sub">Shared with ${esc(s.partner)} · FSCS to £240,000</div>
      <div class="balance rev" style="font-size:28px;margin:4px 0">${fmt(s.jointBal || 0)}</div>
      ${kv('Contributions this month', `<span class="rev">${fmt(round2(income * 0.35))}</span>`)}
      ${kv('Joint bills', `<span class="rev">${fmt(1240)}</span>`)}
      <button class="btn" data-contrib style="margin-top:12px">Add money</button></div>`;
  };
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-contrib]')) return;
    sheet(`<h2>Add to joint</h2><div class="sub">From your personal account</div>
      <div class="field"><label>Amount</label><input id="jcAmt" type="number" min="1"></div>
      <button class="btn" id="jcGo">Move</button>`);
    document.getElementById('jcGo').onclick = () => {
      const v = +document.getElementById('jcAmt').value;
      if (!v || v <= 0) return toast('Enter an amount');
      if (v > balNow()) return toast('Not enough in your balance');
      const s = getState();
      s.jointBal = round2((s.jointBal || 0) + v);
      addTx('Joint account', 'Transfers', -v, 'Moved to joint');
      closeSheet(); render(); toast('Moved');
    };
  });
  render();
}

export function mountPersonal(root){
  const p = getState().profile;
  const field = (id, label, v, t = 'text') => `<div class="field"><label for="${id}">${label}</label><input id="${id}" type="${t}" value="${esc(v || '')}"></div>`;
  root.innerHTML = `<div class="h-sec"><h2>Personal details</h2></div><div class="card">
    ${field('pName', 'Full name', p.name)}${field('pDob', 'Date of birth', p.dob, 'date')}
    ${field('pEmail', 'Email', p.email, 'email')}${field('pPhone', 'Phone', p.phone, 'tel')}
    ${field('pAddr1', 'Address line 1', p.a1)}${field('pAddr2', 'Address line 2', p.a2)}
    ${field('pCity', 'Town', p.city)}${field('pPost', 'Postcode', p.post)}
    ${field('pOcc', 'Occupation', p.occ)}${field('pEmp', 'Employer', p.emp)}
    <button class="btn" data-save>Save</button></div>`;
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-save]')) return;
    const v = id => { const el = root.querySelector('#' + id); return el ? el.value : ''; };
    setProfile({ name: v('pName'), dob: v('pDob'), email: v('pEmail'), phone: v('pPhone'),
      a1: v('pAddr1'), a2: v('pAddr2'), city: v('pCity'), post: v('pPost'), occ: v('pOcc'), emp: v('pEmp') });
    toast('Saved');
  });
}

export function mountSecurity(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Security</h2></div><div class="card">
      <div class="toggle"><div><div class="t">Fingerprint</div><div class="d">${s.credId ? 'Enabled' : 'Off'}</div></div>
        <button class="sw ${s.credId ? 'on' : ''}" data-bio aria-label="Fingerprint"></button></div>
      <div class="toggle"><div><div class="t">Privacy mode</div></div>
        <button class="sw ${s.priv ? 'on' : ''}" data-priv aria-label="Privacy mode"></button></div>
      <div class="toggle"><div><div class="t">Round-ups</div></div>
        <button class="sw ${s.roundups ? 'on' : ''}" data-round aria-label="Round-ups"></button></div>
      <div class="field"><label for="newPin">New passcode</label><input id="newPin" maxlength="4" inputmode="numeric"></div>
      <button class="btn" data-pin>Update</button></div>`;
  };
  root.addEventListener('click', async e => {
    if (e.target.closest('[data-priv]')){ togglePriv(); return render(); }
    if (e.target.closest('[data-round]')){ toggleRoundups(); return render(); }
    if (e.target.closest('[data-pin]')){
      const v = root.querySelector('#newPin').value.trim();
      if (!/^\d{4}$/.test(v)) return toast('4 digits');
      setPin(v); return toast('Updated');
    }
    if (e.target.closest('[data-bio]')){
      const s = getState();
      if (s.credId){ setCredId(null); return render(); }
      try {
        const c = await navigator.credentials.create({ publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)), rp: { name: 'Monzo', id: location.hostname },
          user: { id: crypto.getRandomValues(new Uint8Array(16)), name: s.profile.email, displayName: s.profile.name },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' } } });
        setCredId(btoa(String.fromCharCode(...new Uint8Array(c.rawId)))); render(); toast('Enabled');
      } catch { toast('Failed'); }
    }
  });
  render();
}

/* Downscale to a 900px JPEG so a receipt survives a localStorage round trip. */
function readImage(file, done){
  const img = new Image();
  const url = URL.createObjectURL(file);
  img.onload = () => {
    const max = 900;
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * scale));
    c.height = Math.max(1, Math.round(img.height * scale));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    try { done(c.toDataURL('image/jpeg', 0.7)); } catch { done(null); }
  };
  img.onerror = () => { URL.revokeObjectURL(url); done(null); };
  img.src = url;
}

export function mountTxDetail(root, params){
  const render = () => {
    const t = getState().tx.find(x => x.id === params.id);
    if (!t){ root.innerHTML = empty('Not found'); return; }
    const receipt = t.receipt
      ? `<div class="receipt"><img src="${t.receipt.data}" alt="Receipt">
          <span class="mid"><span class="nm">${esc(t.receipt.name)}</span>
            <span class="sub">Attached ${esc(t.receipt.added)}</span></span>
          <button class="iconbtn" data-unreceipt aria-label="Remove receipt">✕</button></div>`
      : '';
    root.innerHTML = `<div class="h-sec"><h2>Transaction</h2></div><div class="card">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">${logo(t.name)}
        <div><div style="font-weight:700">${esc(t.name)}</div><div class="sub">${esc(t.cat)}</div></div></div>
      <div class="balance rev" style="font-size:28px;margin:0 0 12px">${t.amt > 0 ? '+' : ''}${fmt(t.amt)}</div>
      ${kv('Date', t.date)}${kv('Time', esc(t.time))}${kv('Balance after', `<span class="rev">${fmt(t.bal)}</span>`)}
      <div class="field"><label for="txName">Name</label><input id="txName" value="${esc(t.name)}"></div>
      <div class="field"><label for="txCat">Category</label><select id="txCat">${CATS.map(c => `<option ${c === t.cat ? 'selected' : ''}>${c}</option>`).join('')}</select></div>
      <div class="field"><label for="txNote">Note</label><input id="txNote" value="${esc(t.note || '')}"></div>
      <button class="btn" data-save>Save</button>
      <div class="divider"></div>
      <div class="receipt-head">Receipt</div>
      ${receipt || '<p class="note">No receipt attached</p>'}
      <label class="filebtn" style="margin-top:8px">${t.receipt ? 'Replace receipt' : 'Attach receipt'}
        <input type="file" accept="image/*" data-receipt></label>
      <button class="btn ghost" data-split style="margin-top:12px">Split with a tab</button>
      <button class="btn ghost" data-disp style="margin-top:8px">Raise a dispute</button>
      <button class="btn red" data-del style="margin-top:8px">Delete transaction</button></div>`;
  };
  root.addEventListener('change', e => {
    const input = e.target.closest('[data-receipt]');
    if (!input || !input.files || !input.files[0]) return;
    const file = input.files[0];
    readImage(file, data => {
      if (!data) return toast('Could not read that image');
      updateTx(params.id, { receipt: { name: file.name, data, added: TODAY } });
      render(); toast('Receipt attached');
    });
  });
  root.addEventListener('click', e => {
    const t = getState().tx.find(x => x.id === params.id);
    if (!t) return;
    if (e.target.closest('[data-unreceipt]')){
      updateTx(t.id, { receipt: null });
      render(); return toast('Receipt removed');
    }
    if (e.target.closest('[data-save]')){
      updateTx(t.id, { name: root.querySelector('#txName').value.trim() || t.name,
        cat: root.querySelector('#txCat').value, note: root.querySelector('#txNote').value });
      render(); return toast('Saved');
    }
    if (e.target.closest('[data-split]')){
      sheet(`<h2>Split with a tab</h2><div class="field"><label>Total to split</label>
        <input id="spTot" type="number" value="${Math.abs(t.amt)}"></div>
        <div class="field"><label>People</label><input id="spPpl" type="number" min="2" value="2"></div>
        <button class="btn" id="spGo">Create tab</button>`);
      document.getElementById('spGo').onclick = () => {
        const s = getState();
        const tot = +document.getElementById('spTot').value;
        const ppl = Math.max(2, +document.getElementById('spPpl').value || 2);
        s.tabs.push({ id: 't' + Date.now(), name: t.name, total: tot, mine: round2(tot / ppl), people: ppl });
        commit(); closeSheet(); toast('Tab created');
      };
    }
    if (e.target.closest('[data-disp]')){ raiseDispute(t.name, 'Query raised from transaction'); toast('Raised'); go('disputes'); }
    if (e.target.closest('[data-del]')){ deleteTx(t.id); toast('Deleted'); go('acc'); }
  });
  render();
            }
