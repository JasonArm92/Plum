/* src/screens-b.js — settings and one-off surfaces. */

import {
  getState, esc, fmt, TODAY, round2, plan, PLANS_BANK, CATS, BANKS, BB_CAP,
  setProfile, setPin, setCredId, setTheme, setZoom, setMotion, togglePriv, toggleRoundups,
  addPayee, updatePayee, deletePayee, sendMoney, addVirtualCard, toggleFreeze, setPlan,
  flexAvail, flexPurchase, flexMonthly, arrangeOverdraft, takeLoan, loanMonthly, aprForLoan,
  challengeSave, billsbackOptIn, billsbackDraw, bbBills, connectBank,
  addExtraAccount, takeAura, setAura, raiseDispute, pushChat, clearNotifs
} from './core.js';

import {
  go, toast, sheet, closeSheet, logo, kv, badge, empty, txRow, meter, chipRow
} from './ui.js';

/* ---------- payees ---------- */
export function mountPayees(root){
  const render = () => {
    const s = getState();
    const sorted = s.payees.slice().sort((a, b) =>
      (b.fav ? 1 : 0) - (a.fav ? 1 : 0) || (b.last || '').localeCompare(a.last || ''));
    root.innerHTML = `<div class="h-sec"><h2>Payees</h2><button data-add>Add</button></div>
      <div class="card" style="padding:6px 8px">${sorted.map(p => `
        <div class="pot"><span class="lg">${esc(p.name.split(' ').map(w => w[0]).join('').slice(0, 2))}</span>
          <span class="mid"><span class="nm">${esc(p.name)}
            ${p.fav ? badge('Fav', 'ok') : ''}${p.last === TODAY ? badge('Recent') : ''}</span>
            <span class="sub">${esc(p.sc)} · ${esc(p.ac)}</span></span>
          <button class="iconbtn" data-send="${p.id}" aria-label="Send">➤</button>
          <button class="iconbtn" data-fav="${p.id}" aria-label="Favourite">${p.fav ? '★' : '☆'}</button>
          <button class="iconbtn" data-edit="${p.id}" aria-label="Edit">✎</button></div>`).join('')
        || empty('No payees yet')}</div>`;
  };

  const payeeForm = id => {
    const p = id ? getState().payees.find(x => x.id === id) : { name: '', sc: '', ac: '' };
    sheet(`<h2>${id ? 'Edit' : 'New'} payee</h2>
      <div class="field"><label>Name</label><input id="pyName" value="${esc(p.name)}"></div>
      <div class="field"><label>Sort code</label><input id="pySc" inputmode="numeric" value="${esc(p.sc)}"></div>
      <div class="field"><label>Account number</label><input id="pyAc" inputmode="numeric" value="${esc(p.ac)}"></div>
      <button class="btn" id="pySave">Save</button>
      ${id ? `<button class="btn ghost" id="pyDel" style="margin-top:10px">Delete payee</button>` : ''}`);
    document.getElementById('pySave').onclick = () => {
      const name = document.getElementById('pyName').value.trim();
      if (!name) return toast('Enter a name');
      const data = { name, sc: document.getElementById('pySc').value, ac: document.getElementById('pyAc').value };
      id ? updatePayee(id, data) : addPayee(data);
      closeSheet(); render(); toast('Saved');
    };
    const del = document.getElementById('pyDel');
    if (del) del.onclick = () => { deletePayee(id); closeSheet(); render(); toast('Deleted'); };
  };

  const sendForm = id => {
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
      sheet(`<h2>Confirm</h2><div class="sub">Check the details before sending</div>
        ${kv('To', esc(p.name))}${kv('Sort code', esc(p.sc))}${kv('Account', esc(p.ac))}
        ${kv('Reference', esc(ref))}${kv('Amount', `<span class="rev">${fmt(v)}</span>`)}
        <button class="btn" id="sdGo" style="margin-top:14px">Send ${fmt(v)}</button>
        <button class="btn ghost" id="sdBack" style="margin-top:8px">Back</button>`);
      document.getElementById('sdBack').onclick = () => sendForm(id);
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
    if (t.hasAttribute('data-add')) return payeeForm(null);
    if (t.dataset.send) return sendForm(t.dataset.send);
    if (t.dataset.fav){
      const p = getState().payees.find(x => x.id === t.dataset.fav);
      updatePayee(p.id, { fav: !p.fav });
      return render();
    }
    if (t.dataset.edit) return payeeForm(t.dataset.edit);
  });

  render();
}

/* ---------- cards ---------- */
export function mountCards(root){
  const render = () => {
    const s = getState(), p = plan();
    root.innerHTML = `<div class="h-sec"><h2>Cards</h2><button data-new>New virtual</button></div>
      <div class="card">
        ${kv('Physical card · Hot coral · 4000 1234', badge(s.frozen ? 'Frozen' : 'Active', s.frozen ? 'bad' : 'ok'))}
        <button class="btn ghost sm" data-freeze style="margin:10px 0">
          ${s.frozen ? 'Unfreeze' : 'Freeze'} card</button>
        ${s.vcards.map(v => kv(`${esc(v.label)} · ${esc(v.num)}`,
          badge(v.frozen ? 'Frozen' : 'Active', v.frozen ? 'bad' : 'ok'))).join('')}
      </div>
      <p class="note">${p.vcLive
        ? `${s.vcards.length} of ${p.vcLive} live virtual cards. Up to ${p.vc30} new per 30 days, 100 per year.`
        : 'Virtual cards need Extra, Perks or Max.'}</p>`;
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-freeze]')){ toggleFreeze(); return render(); }
    if (e.target.closest('[data-new]')){
      const res = addVirtualCard();
      if (!res.ok) return toast(res.msg);
      render(); toast('Virtual card created');
    }
  });
  render();
}

/* ---------- plan ---------- */
export function mountPlan(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Plans</h2></div>` +
      Object.entries(PLANS_BANK()).map(([k, p]) => `
        <div class="card" style="border:2px solid ${k === s.plan ? 'var(--coral)' : 'transparent'}">
          <div style="display:flex;justify-content:space-between;align-items:center">
            <h2 style="margin:0">${p.name}</h2><b>${p.price ? '£' + p.price + '/mo' : 'Free'}</b></div>
          <div class="sub">${p.age} · ${p.min ? p.min + ' month minimum' : 'No minimum'}</div>
          ${kv('Instant Access rate', p.ia + '% AER')}
          ${kv('ATM abroad', '£' + p.atmRow)}
          ${kv('Virtual cards', p.vcLive || '—')}
          ${kv('Billsback', p.billsback ? 'Yes' : 'No')}
          ${kv('Travel &amp; phone insurance', p.cover ? 'Yes' : 'No')}
          ${k === s.plan ? `<div style="margin-top:10px">${badge('Your plan', 'coral')}</div>`
            : `<button class="btn" data-plan="${k}" style="margin-top:10px">Switch to ${p.name}</button>`}
        </div>`).join('') + '<p class="note">Max with family is £23/month (+£4).</p>';
  };
  root.addEventListener('click', e => {
    const t = e.target.closest('[data-plan]');
    if (!t) return;
    const key = t.dataset.plan, to = PLANS_BANK()[key], from = plan();
    const diff = round2(to.price - from.price);
    sheet(`<h2>Switch to ${to.name}</h2>
      <div class="sub">${to.price ? '£' + to.price + ' per month' : 'Free'}${to.min ? ' · ' + to.min + ' month minimum' : ''}</div>
      ${diff > 0 ? kv('Charged today', `<span class="rev">${fmt(diff)}</span>`) : ''}
      <button class="btn" id="spGo">Confirm</button>`);
    document.getElementById('spGo').onclick = () => {
      setPlan(key); closeSheet(); render(); toast('Plan updated');
    };
  });
  render();
}

/* ---------- limits ---------- */
export function mountLimits(root){
  const p = plan();
  root.innerHTML = `<div class="h-sec"><h2>Limits</h2></div><div class="card">
    ${kv('ATM abroad (per 30 days)', '£' + p.atmRow)}
    ${kv('ATM UK &amp; EEA (per 30 days)', p.atmUK === Infinity ? 'Unlimited' : '£' + p.atmUK)}
    ${kv('Contactless (per day)', '£100')}
    ${kv('Card payments (per day)', '£5,000')}
    ${kv('Bank transfers (per day)', '£10,000')}
    ${kv('Cash deposits', p.cover ? '3 free/month' : '£1 each')}
  </div>`;
}

/* ---------- borrow hub ---------- */
export function mountBorrow(root){
  const s = getState();
  root.innerHTML = `<div class="h-sec"><h2>Borrowing</h2></div>
    <div class="card" style="padding:6px 8px">
      <button class="pot" data-go="flex"><span class="lg">FLX</span><span class="mid">
        <span class="nm">Monzo Flex</span><span class="sub">${fmt(flexAvail())} available</span></span></button>
      <button class="pot" data-go="aura"><span class="lg">AUR</span><span class="mid">
        <span class="nm">Monzo Aura</span><span class="sub">Auto-investing card</span></span></button>
      <button class="pot" data-go="overdraft"><span class="lg">OVD</span><span class="mid">
        <span class="nm">Overdraft</span><span class="sub">${s.overdraft.limit ? fmt(s.overdraft.limit) + ' arranged' : 'Not arranged'}</span></span></button>
      <button class="pot" data-go="loans"><span class="lg">LN</span><span class="mid">
        <span class="nm">Loans</span><span class="sub">Up to £35,000</span></span></button>
    </div>`;
}

/* ---------- flex ---------- */
export function mountFlex(root){
  let term = 3;
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Monzo Flex</h2></div>
      <div class="card"><div class="sub">Available to spend</div>
        <div class="balance rev" style="font-size:30px;margin:4px 0">${fmt(flexAvail())}</div>
        ${meter(s.flex.used, s.flex.limit)}
        ${kv('Limit', `<span class="rev">${fmt(s.flex.limit)}</span>`)}
        ${kv('Representative APR', '29%')}
        <button class="btn" data-new style="margin-top:12px">Pay with Flex</button></div>
      <div class="card"><h2>Plans</h2><div class="sub">3 months interest free · 6 and 12 at 29%</div>
        ${s.flex.plans.length ? s.flex.plans.map(p => {
          const paid = round2(p.amount - p.remaining);
          return `<div style="padding:9px 0;border-bottom:1px solid var(--line)">
            <div style="display:flex;justify-content:space-between;font-size:14px">
              <span>${esc(p.name)}</span><b class="rev">${fmt(p.remaining)}</b></div>
            ${meter(paid, p.amount)}
            <div style="font-size:12.5px;color:var(--muted)">${fmt(paid)} of ${fmt(p.amount)} · ${p.term} months · ${fmt(p.monthly)}/mo</div>
          </div>`;
        }).join('') : empty('No plans')}</div>`;
  };

  const newForm = () => {
    term = 3;
    sheet(`<h2>Pay with Flex</h2><div class="sub">${fmt(flexAvail())} available · 3 months interest free</div>
      <div class="field"><label>Where</label><input id="fxName"></div>
      <div class="field"><label>Amount</label><input id="fxAmt" type="number" min="1" step="0.01"></div>
      <div class="field"><label>Spread over</label>
        ${chipRow([{ value: 3, label: '3 months · 0%' }, { value: 6, label: '6 months · 29%' },
          { value: 12, label: '12 months · 29%' }], 3, 'term')}</div>
      ${kv('Monthly', '<span class="rev" id="fxMonthly">—</span>')}
      <button class="btn" id="fxGo" style="margin-top:12px">Confirm</button>`);

    const quote = () => {
      const amt = +document.getElementById('fxAmt').value || 0;
      document.getElementById('fxMonthly').textContent = amt ? fmt(flexMonthly(amt, term)) : '—';
      document.querySelectorAll('[data-term]').forEach(b =>
        b.classList.toggle('on', +b.dataset.term === term));
    };
    document.getElementById('fxAmt').oninput = quote;
    document.querySelectorAll('[data-term]').forEach(b => b.onclick = () => { term = +b.dataset.term; quote(); });

    document.getElementById('fxGo').onclick = () => {
      const name = document.getElementById('fxName').value.trim();
      const amt = +document.getElementById('fxAmt').value;
      if (!name) return toast('Where was it?');
      const res = flexPurchase(name, amt, term);
      if (!res.ok) return toast(res.msg);
      closeSheet(); render(); toast(`Flexed over ${term} months`);
    };
  };

  root.addEventListener('click', e => { if (e.target.closest('[data-new]')) newForm(); });
  render();
}

/* ---------- aura ---------- */
export function mountAura(root){
  const render = () => {
    const a = getState().aura;
    root.innerHTML = `<div class="h-sec"><h2>Monzo Aura</h2></div>
      <div class="card"><div class="sub">£15 per month · auto-investing cashback card</div>
        ${kv('Status', a.active ? badge('Active', 'ok') : badge('Not taken out'))}
        ${kv('Cashback this month', `<span class="rev">${fmt(a.cashback)}</span>`)}
        ${kv('Lounge passes left', a.lounge)}
        ${kv('Fast track passes left', a.fast)}
        <div class="toggle"><div><div class="t">Auto-invest cashback</div>
          <div class="d">Into your ISA</div></div>
          <button class="sw ${a.auto ? 'on' : ''}" data-auto aria-label="Auto invest"></button></div>
        <button class="btn" data-toggle style="margin-top:14px">
          ${a.active ? 'Close Aura' : 'Take out Aura for £15/month'}</button></div>
      <p class="note">1% on groceries, 0.5% on everything else. 64.2% representative APR variable.</p>`;
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-auto]')){
      setAura({ auto: !getState().aura.auto }); return render();
    }
    if (e.target.closest('[data-toggle]')){
      const now = takeAura(); render(); toast(now ? 'Aura active' : 'Aura closed');
    }
  });
  render();
}

/* ---------- overdraft ---------- */
export function mountOverdraft(root){
  let pending = 0;
  const render = () => {
    const o = getState().overdraft, bal = getState().tx[0].bal;
    root.innerHTML = `<div class="h-sec"><h2>Overdraft</h2></div>
      <div class="card"><div class="sub">Arranged limit up to £2,000</div>
        <div class="balance rev" style="font-size:30px;margin:4px 0">${fmt(o.limit)}</div>
        ${kv('Rate', o.rate ? o.rate + '% EAR' : '—')}
        ${kv('Used', `<span class="rev">${fmt(Math.max(0, -bal))}</span>`)}
        ${chipRow([250, 500, 1000, 2000].map(v => ({ value: v, label: '£' + v })), pending || null, 'od')}
        <button class="btn" data-apply style="margin-top:12px">Apply</button></div>
      <p class="note">19%, 29% or 39% EAR variable depending on your credit file.</p>`;
  };
  root.addEventListener('click', e => {
    const chip = e.target.closest('[data-od]');
    if (chip){ pending = +chip.dataset.od; return render(); }
    if (e.target.closest('[data-apply]')){
      if (!pending) return toast('Choose an amount');
      arrangeOverdraft(pending); render(); toast('Overdraft arranged');
    }
  });
  render();
}

/* ---------- loans ---------- */
export function mountLoans(root){
  const render = () => {
    const amtInput = root.querySelector('#lnAmt');
    const termSel = root.querySelector('#lnTerm');
    const amt = +(amtInput ? amtInput.value : 8000) || 8000;
    const term = +(termSel ? termSel.value : 24) || 24;
    const apr = aprForLoan(amt), monthly = loanMonthly(amt, term);
    root.innerHTML = `<div class="h-sec"><h2>Loans</h2></div>
      <div class="card"><div class="sub">Borrow £1,000 to £35,000</div>
        <div class="field"><label>Amount</label><input id="lnAmt" type="number" min="1000" max="35000" step="500" value="${amt}"></div>
        <div class="field"><label>Term (months)</label><select id="lnTerm">
          ${[12, 24, 36, 48, 60].map(t => `<option ${t === term ? 'selected' : ''}>${t}</option>`).join('')}
        </select></div>
        ${kv('APR', apr + '%')}
        ${kv('Monthly repayment', `<span class="rev">${fmt(monthly)}</span>`)}
        ${kv('Total repayable', `<span class="rev">${fmt(round2(monthly * term))}</span>`)}
        <button class="btn" data-apply style="margin-top:12px">Apply</button></div>
      <div class="card"><h2>Your loans</h2><div class="sub">Repaid monthly</div>
        ${getState().loans.length ? getState().loans.map(l => `
          <div style="padding:9px 0;border-bottom:1px solid var(--line)">
            <div style="display:flex;justify-content:space-between;font-size:14px">
              <span>${fmt(l.amount)} · ${l.apr}% APR</span><b class="rev">${fmt(l.outstanding)}</b></div>
            ${meter(l.paid, l.term)}
            <div style="font-size:12.5px;color:var(--muted)">${l.paid} of ${l.term} payments · ${fmt(l.monthly)}/mo</div>
          </div>`).join('') : empty('No loans')}</div>`;

    root.querySelector('#lnAmt').oninput = render;
    root.querySelector('#lnTerm').onchange = render;
  };
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-apply]')) return;
    const amt = +root.querySelector('#lnAmt').value;
    const term = +root.querySelector('#lnTerm').value;
    const res = takeLoan(amt, term);
    if (!res.ok) return toast(res.msg);
    render(); toast('Loan paid in');
  });
  render();
}

/* ---------- connected ---------- */
export function mountConnected(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Connected accounts</h2></div>
      <div class="card"><h2>Add a bank</h2><div class="sub">Open Banking · renews every 90 days</div>
        ${chipRow(BANKS, null, 'bank')}</div>
      <div class="card"><h2>Connected</h2><div class="sub">Balances show in Grow</div>
        ${s.connected.length ? s.connected.map(c => kv(`${esc(c.bank)}<br><span style="font-size:12.5px">${esc(c.kind)}</span>`,
          `<span class="rev">${fmt(c.bal)}</span>`)).join('') : empty('No accounts connected')}</div>`;
  };
  root.addEventListener('click', e => {
    const chip = e.target.closest('[data-bank]');
    if (!chip) return;
    const res = connectBank(chip.dataset.bank);
    if (!res.ok) return toast(res.msg);
    render(); toast('Connected to ' + chip.dataset.bank);
  });
  render();
}

/* ---------- credit ---------- */
export function mountCredit(root){
  const s = getState(), scores = plan().scores;
  root.innerHTML = `<div class="h-sec"><h2>Credit insights</h2></div>
    <div class="card"><div style="display:flex;gap:20px">
      <div style="flex:1"><div class="sub" style="margin:0">Equifax</div>
        <div class="score">${s.credit.eq}</div>
        ${badge(s.credit.eq > 650 ? 'Good' : 'Fair', s.credit.eq > 650 ? 'ok' : 'warn')}</div>
      ${scores > 1 ? `<div style="flex:1"><div class="sub" style="margin:0">TransUnion</div>
        <div class="score">${s.credit.tu}</div>
        ${badge(s.credit.tu > 650 ? 'Good' : 'Fair', s.credit.tu > 650 ? 'ok' : 'warn')}</div>` : ''}
    </div><div class="sub" style="margin-top:12px">Updated weekly</div>
    ${scores === 1 ? '<p class="note">Extra adds a second score and credit-boosting actions.</p>' : ''}</div>
    <div class="card"><h2>What's affecting your score</h2>
      ${[['On-time payments', 'Positive', 'ok'], ['Credit utilisation', '29% used', 'warn'],
        ['Account age', '13 years', 'ok'], ['Hard searches', '1 in 6 months', 'ok']]
        .map(([a, b, c]) => kv(a, badge(b, c))).join('')}</div>`;
}

/* ---------- challenge ---------- */
export function mountChallenge(root){
  const render = () => {
    const c = getState().challenge;
    root.innerHTML = `<div class="h-sec"><h2>Saving Challenge</h2></div>
      <div class="card"><div class="sub">Start at 1p, finish at £667.95</div>
        <div class="balance rev" style="font-size:30px;margin:4px 0">${fmt(c.saved)}</div>
        ${meter(c.saved, 667.95)}
        ${kv('Day', `${c.day} of 365`)}
        ${kv("Today's amount", `<span class="rev">${fmt(round2((c.day + 1) / 100))}</span>`)}
        ${kv('Interest', plan().price ? '5% AER' : 'No interest')}
        <button class="btn" data-save style="margin-top:12px">Save today's amount</button></div>
      <p class="note">5% AER variable on challenge savings for Extra, Perks and Max.</p>`;
  };
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-save]')) return;
    const res = challengeSave();
    if (!res.ok) return toast(res.msg);
    render(); toast('Saved ' + fmt(res.amt));
  });
  render();
}

/* ---------- billsback ---------- */
export function mountBillsback(root){
  const render = () => {
    const s = getState(), bills = bbBills();
    root.innerHTML = `<div class="h-sec"><h2>Billsback</h2></div>
      <div class="card"><div class="sub">Your bills could be on us — up to £150 per bill</div>
        ${kv('Eligible', plan().billsback ? badge('Included', 'ok') : badge('Needs Extra', 'bad'))}
        <div class="toggle"><div><div class="t">Opt in this month</div>
          <div class="d">At least 1,000 bills paid back monthly</div></div>
          <button class="sw ${s.billsback.optIn ? 'on' : ''}" data-opt aria-label="Opt in"></button></div>
        <button class="btn" data-draw style="margin-top:14px">Enter this month's draw</button></div>
      <div class="card"><h2>Eligible bills this month</h2><div class="sub">From the agreed provider list</div>
        ${bills.length ? bills.map(b => kv(`${esc(b.name)}<br><span style="font-size:12.5px">${esc(b.date)}</span>`,
          `<span class="rev">${fmt(Math.min(Math.abs(b.amt), BB_CAP))}</span>`)).join('')
          : empty('No eligible bills yet this month')}</div>
      <div class="card"><h2>Results</h2>
        ${s.billsback.history.length ? s.billsback.history.map(h =>
          kv(`${esc(h.month)}${h.bill ? ' · ' + esc(h.bill) : ''}`,
            h.won ? badge(fmt(h.amount) + ' back', 'ok') : badge('No win'))).join('')
          : empty('No draws entered')}</div>`;
  };
  root.addEventListener('click', e => {
    if (e.target.closest('[data-opt]')){
      const res = billsbackOptIn();
      if (!res.ok) return toast(res.msg);
      return render();
    }
    if (e.target.closest('[data-draw]')){
      const res = billsbackDraw();
      if (!res.ok) return toast(res.msg);
      render(); toast(res.won ? 'You won ' + fmt(res.amount) : 'No win this month');
    }
  });
  render();
}

/* ---------- insurance ---------- */
export function mountInsurance(root){
  const covered = plan().cover;
  root.innerHTML = `<div class="h-sec"><h2>Insurance</h2></div>` + (covered ? `
    <div class="card"><div class="sub">Included with Max</div>
      ${[['Worldwide travel insurance', 'POL-TRV-8842190'], ['Worldwide phone insurance', 'POL-PHN-8842191'],
        ['UK &amp; Europe breakdown cover', 'POL-BRK-8842192']]
        .map(([n, pol]) => kv(`${n}<br><span style="font-size:12.5px">${pol}</span>`,
          `<button class="btn ghost sm" data-pol="${pol}">Document</button>`)).join('')}
      <p class="note">Policies held with Aviva. Cover is worldwide, with a £75 excess.</p></div>`
    : `<div class="card"><div class="sub">Not included on ${plan().name}</div>
      <p class="note">Travel, phone and breakdown cover come with Max.</p>
      <button class="btn" data-go="plan">See plans</button></div>`);

  root.addEventListener('click', e => {
    const t = e.target.closest('[data-pol]');
    if (t) toast('Document ' + t.dataset.pol + ' queued');
  });
}

/* ---------- accounts ---------- */
export function mountAccounts(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Your accounts</h2><button data-add>Add</button></div>
      <div class="card" style="padding:6px 8px">
        <div class="pot"><span class="lg">PCA</span><span class="mid">
          <span class="nm">Personal current account</span><span class="sub">04-00-04 · 73829104</span></span>
          ${badge('Active', 'ok')}</div>
        <div class="pot"><span class="lg">JNT</span><span class="mid">
          <span class="nm">Joint account</span><span class="sub">With ${esc(s.partner)}</span></span>
          ${badge('Active', 'ok')}</div>
        ${s.extraAccounts.map(a => `<div class="pot"><span class="lg">${esc(a.name[0])}</span>
          <span class="mid"><span class="nm">${esc(a.name)}</span><span class="sub">${esc(a.type)}</span></span>
          ${badge(a.status)}</div>`).join('')}
      </div>
      <p class="note">Under-16 accounts are managed by you. Business accounts have separate tiers.</p>`;
  };
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-add]')) return;
    sheet(`<h2>Add an account</h2>
      <div class="field"><label>Type</label><select id="aaType">
        <option>Under 16</option><option>16-17</option><option>Business</option></select></div>
      <div class="field"><label>Name</label><input id="aaName"></div>
      <button class="btn" id="aaGo">Open account</button>`);
    document.getElementById('aaGo').onclick = () => {
      const name = document.getElementById('aaName').value.trim();
      if (!name) return toast('Enter a name');
      addExtraAccount(name, document.getElementById('aaType').value);
      closeSheet(); render(); toast('Account opened');
    };
  });
  render();
}

/* ---------- appearance ---------- */
export function mountAppearance(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Appearance</h2></div><div class="card">
      <div class="toggle"><div><div class="t">Theme</div><div class="d">Light, dark or match device</div></div>
        ${chipRow([{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' },
          { value: 'auto', label: 'Auto' }], s.theme, 'theme')}</div>
      <div class="toggle"><div><div class="t">Text size</div><div class="d">Scale the whole app</div></div>
        ${chipRow([{ value: 1, label: 'A' }, { value: 1.12, label: 'A+' }, { value: 1.24, label: 'A++' }], s.zoom, 'zoom')}</div>
      <div class="toggle"><div><div class="t">Reduce motion</div><div class="d">Turn off transitions</div></div>
        <button class="sw ${s.motion ? '' : 'on'}" data-motion aria-label="Reduce motion"></button></div>
    </div>`;
  };
  root.addEventListener('click', e => {
    const theme = e.target.closest('[data-theme]');
    if (theme){ setTheme(theme.dataset.theme); return render(); }
    const zoom = e.target.closest('[data-zoom]');
    if (zoom){ setZoom(+zoom.dataset.zoom); return render(); }
    if (e.target.closest('[data-motion]')){ setMotion(!getState().motion); render(); }
  });
  render();
}

/* ---------- search ---------- */
export function mountSearch(root){
  let cat = 'All', q = '';
  root.innerHTML = `<div class="h-sec"><h2>Search</h2></div>
    <div class="field"><input id="sq" placeholder="Search transactions" autocomplete="off"></div>
    <div id="schips"></div>
    <div class="card" style="padding:4px 14px"><ul class="txlist" id="sres"></ul></div>`;

  const chips = root.querySelector('#schips');
  const list = root.querySelector('#sres');
  const input = root.querySelector('#sq');

  const paintChips = () => { chips.innerHTML = chipRow(['All', ...CATS], cat, 'cat'); };
  const paintList = () => {
    const res = getState().tx.filter(t => (cat === 'All' || t.cat === cat) &&
      (!q || t.name.toLowerCase().includes(q) || t.note.toLowerCase().includes(q))).slice(0, 60);
    list.innerHTML = res.length ? res.map(txRow).join('') : '<li class="empty">No matches</li>';
  };

  /* only the list is rewritten, so the caret stays put */
  input.addEventListener('input', () => { q = input.value.toLowerCase(); paintList(); });
  root.addEventListener('click', e => {
    const chip = e.target.closest('[data-cat]');
    if (!chip) return;
    cat = chip.dataset.cat;
    paintChips();
    paintList();
  });

  paintChips();
  paintList();
}

/* ---------- notifications ---------- */
export function mountNotifs(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Notifications</h2><button data-clear>Clear</button></div>
      <div class="card">${s.notifs.length ? s.notifs.map(n =>
        kv(`${esc(n.title)}<br><span style="font-size:12.5px">${esc(n.body)}</span>`,
          `<span style="font-size:12px;color:var(--muted)">${esc(n.date)} ${esc(n.time)}</span>`)).join('')
        : empty('Nothing new')}</div>`;
  };
  root.addEventListener('click', e => { if (e.target.closest('[data-clear]')){ clearNotifs(); render(); } });
  render();
}

/* ---------- chat ---------- */
export function mountChat(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Support</h2></div>
      <div class="card">${s.chat.length ? s.chat.map(m => `
        <div style="margin:9px 0;text-align:${m.who === 'me' ? 'right' : 'left'}">
          <div style="display:inline-block;max-width:82%;padding:10px 14px;border-radius:16px;
            background:${m.who === 'me' ? 'var(--coral)' : 'var(--line)'};
            color:${m.who === 'me' ? '#fff' : 'var(--ink)'}">${esc(m.text)}</div>
          <div style="font-size:11.5px;color:var(--muted);margin-top:3px">${esc(m.time)}</div></div>`).join('')
        : empty('Say hello — we usually reply in a few minutes')}</div>
      <div style="display:flex;gap:8px;margin-bottom:20px">
        <input id="chatIn" placeholder="Type a message" class="chatinput">
        <button class="btn sm" data-send>Send</button></div>`;
  };
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-send]')) return;
    const input = root.querySelector('#chatIn');
    const text = input.value.trim();
    if (!text) return;
    pushChat('me', text);
    render();
    setTimeout(() => { pushChat('them', 'Thanks Jason — looking into that now.'); render(); }, 900);
  });
  render();
}

/* ---------- disputes ---------- */
export function mountDisputes(root){
  const s = getState();
  root.innerHTML = `<div class="h-sec"><h2>Disputes</h2></div><div class="card">
    ${s.disputes.length ? s.disputes.map(d => kv(
      `${esc(d.name)}<br><span style="font-size:12.5px">${esc(d.reason)}</span>`,
      `${badge('Open', 'warn')}<br><span style="font-size:12px;color:var(--muted)">${esc(d.date)}</span>`)).join('')
      : empty('No open disputes')}</div>`;
}

/* ---------- joint ---------- */
export function mountJoint(root){
  const s = getState();
  const income = s.tx.filter(t => t.date.slice(0, 7) === TODAY.slice(0, 7) && t.cat === 'Income')
    .reduce((a, t) => a + t.amt, 0);
  root.innerHTML = `<div class="h-sec"><h2>Joint account</h2></div>
    <div class="card"><div class="sub">Shared with ${esc(s.partner)} · FSCS to £240,000</div>
      <div class="balance rev" style="font-size:28px;margin:4px 0">${fmt(round2(income * 0.35))}</div>
      ${kv('Contributions this month', `<span class="rev">${fmt(round2(income * 0.35))}</span>`)}
      ${kv('Joint bills', `<span class="rev">${fmt(1240)}</span>`)}</div>`;
}

/* ---------- personal ---------- */
export function mountPersonal(root){
  const p = getState().profile;
  const field = (id, label, value, type = 'text') =>
    `<div class="field"><label for="${id}">${label}</label>
      <input id="${id}" type="${type}" value="${esc(value || '')}"></div>`;
  root.innerHTML = `<div class="h-sec"><h2>Personal details</h2></div><div class="card">
    ${field('pName', 'Full name', p.name)}${field('pDob', 'Date of birth', p.dob, 'date')}
    ${field('pEmail', 'Email', p.email, 'email')}${field('pPhone', 'Phone', p.phone, 'tel')}
    ${field('pAddr1', 'Address line 1', p.a1)}${field('pAddr2', 'Address line 2', p.a2)}
    ${field('pCity', 'Town', p.city)}${field('pPost', 'Postcode', p.post)}
    ${field('pOcc', 'Occupation', p.occ)}${field('pEmp', 'Employer', p.emp)}
    <button class="btn" data-save>Save changes</button></div>`;
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-save]')) return;
    const val = id => root.querySelector('#' + id).value;
    setProfile({ name: val('pName'), dob: val('pDob'), email: val('pEmail'), phone: val('pPhone'),
      a1: val('pAddr1'), a2: val('pAddr2'), city: val('pCity'), post: val('pPost'),
      occ: val('pOcc'), emp: val('pEmp') });
    toast('Details saved');
  });
}

/* ---------- security ---------- */
export function mountSecurity(root){
  const render = () => {
    const s = getState();
    root.innerHTML = `<div class="h-sec"><h2>Security</h2></div><div class="card">
      <div class="toggle"><div><div class="t">Fingerprint unlock</div>
        <div class="d">${s.credId ? 'Enabled' : 'Not set up'}</div></div>
        <button class="sw ${s.credId ? 'on' : ''}" data-bio aria-label="Biometric"></button></div>
      <div class="toggle"><div><div class="t">Privacy mode</div>
        <div class="d">Blur balances until tapped</div></div>
        <button class="sw ${s.priv ? 'on' : ''}" data-priv aria-label="Privacy"></button></div>
      <div class="toggle"><div><div class="t">Round-ups</div>
        <div class="d">Round card spend to the nearest £1</div></div>
        <button class="sw ${s.roundups ? 'on' : ''}" data-round aria-label="Round ups"></button></div>
      <div class="field"><label for="newPin">Change passcode (4 digits)</label>
        <input id="newPin" inputmode="numeric" maxlength="4" placeholder="••••"></div>
      <button class="btn" data-pin>Update passcode</button></div>
      <div class="card"><h2>Active sessions</h2><div class="sub">Where you're signed in</div>
        ${kv('This device · Galaxy S24 Ultra', badge('Current', 'ok'))}
        ${kv('Chrome · Windows', 'Stockton-on-Tees')}
        ${kv('Monzo app · iPad', 'Stockton-on-Tees')}</div>`;
  };
  root.addEventListener('click', async e => {
    if (e.target.closest('[data-priv]')){ togglePriv(); return render(); }
    if (e.target.closest('[data-round]')){ toggleRoundups(); return render(); }
    if (e.target.closest('[data-pin]')){
      const v = root.querySelector('#newPin').value.trim();
      if (!/^\d{4}$/.test(v)) return toast('Passcode must be 4 digits');
      setPin(v); return toast('Passcode updated');
    }
    if (e.target.closest('[data-bio]')){
      const s = getState();
      if (s.credId){ setCredId(null); return render(); }
      if (!window.PublicKeyCredential) return toast('No authenticator available');
      try {
        const cred = await navigator.credentials.create({ publicKey: {
          challenge: crypto.getRandomValues(new Uint8Array(32)),
          rp: { name: 'Monzo', id: location.hostname },
          user: { id: crypto.getRandomValues(new Uint8Array(16)),
            name: s.profile.email, displayName: s.profile.name },
          pubKeyCredParams: [{ type: 'public-key', alg: -7 }, { type: 'public-key', alg: -257 }],
          authenticatorSelection: { authenticatorAttachment: 'platform', userVerification: 'required' },
          timeout: 60000 } });
        setCredId(btoa(String.fromCharCode(...new Uint8Array(cred.rawId))));
        render(); toast('Fingerprint enabled');
      } catch { toast('Could not set up fingerprint'); }
    }
  });
  render();
}

/* ---------- transaction detail ---------- */
export function mountTxDetail(root, params){
  const t = getState().tx.find(x => x.id === params.id);
  if (!t){ root.innerHTML = empty('Transaction not found'); return; }
  root.innerHTML = `<div class="h-sec"><h2>Transaction</h2></div><div class="card">
    <div style="display:flex;gap:12px;align-items:center;margin-bottom:12px">${logo(t.name)}
      <div><div style="font-weight:700">${esc(t.name)}</div><div class="sub" style="margin:0">${esc(t.cat)}</div></div></div>
    <div class="balance rev" style="font-size:28px;margin:0 0 12px">${t.amt > 0 ? '+' : ''}${fmt(t.amt)}</div>
    ${kv('Date', prettyDateOf(t.date))}${kv('Time', esc(t.time))}
    ${kv('Balance after', `<span class="rev">${fmt(t.bal)}</span>`)}
    ${t.note ? kv('Note', esc(t.note)) : ''}
    <button class="btn ghost" data-dispute style="margin-top:14px">Something wrong? Raise a dispute</button></div>`;
  root.addEventListener('click', e => {
    if (!e.target.closest('[data-dispute]')) return;
    raiseDispute(t.name, 'Query raised from transaction');
    toast('Dispute raised'); go('disputes');
  });
}

/* local helper so the import block stays flat */
function prettyDateOf(date){
  const diff = Math.round((new Date(TODAY + 'T12:00:00') - new Date(date + 'T12:00:00')) / 86400000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Yesterday';
  const d = new Date(date + 'T12:00:00');
  return `${d.getDate()} ${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][d.getMonth()]} ${d.getFullYear()}`;
}
