import {
  state, fmt, save, acc, onboardSet, onboarded, finishOnboard,
  setPin, checkPin, maskEmail, maskPhone, notify
} from './core.js?v=44';
import { ONBOARD_SLIDES, CARD_COLOURS, PIN_KEYS } from './data.js?v=44';
import {
  el, screen, row, list, toast, sheet, field, input, haptic, icon, catIcon
} from './ui.js?v=44';

const rerender = () => document.dispatchEvent(new CustomEvent('render'));

const ART = {
  card: '<svg viewBox="0 0 200 150" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><rect x="20" y="38" width="160" height="96" rx="14" stroke="var(--coral)"/><path d="M20 68h160" stroke="var(--coral)"/><rect x="36" y="86" width="34" height="24" rx="5" stroke="var(--coral)" opacity=".6"/><path d="M36 130h60" stroke="var(--coral)" opacity=".4"/></svg>',
  pot: '<svg viewBox="0 0 200 150" fill="none" stroke="var(--coral)" stroke-width="3" stroke-linecap="round"><path d="M56 54h88l-8 66a12 12 0 0 1-12 11H76a12 12 0 0 1-12-11Z"/><path d="M80 54V42a20 20 0 0 1 40 0v12"/><circle cx="100" cy="96" r="14"/></svg>',
  chart: '<svg viewBox="0 0 200 150" fill="none" stroke="var(--coral)" stroke-width="3" stroke-linecap="round"><path d="M28 122h144"/><rect x="44" y="86" width="22" height="36" rx="4"/><rect x="80" y="62" width="22" height="60" rx="4"/><rect x="116" y="92" width="22" height="30" rx="4"/><rect x="152" y="46" width="22" height="76" rx="4"/></svg>',
  flex: '<svg viewBox="0 0 200 150" fill="none" stroke="var(--coral)" stroke-width="3" stroke-linecap="round"><circle cx="100" cy="76" r="42"/><path d="M100 52v48"/><path d="M86 64h22a10 10 0 0 1 0 20h-16a10 10 0 0 0 0 20h22"/></svg>'
};

function foot(title, sub) {
  const wrap = el('div');
  const t = el('h1', 'ob__title', title);
  const p = el('p', 'ob__text', sub);
  wrap.appendChild(t);
  wrap.appendChild(p);
  return wrap;
}

export function welcomeScreen() {
  let i = 0;
  const body = el('div', 'ob');

  const top = el('div', 'ob__top');
  const skip = el('button', 'ob__skip', 'Log in');
  skip.onclick = () => {
    finishOnboard();
    location.hash = '#/login';
  };
  top.appendChild(skip);
  body.appendChild(top);

  const art = el('div', 'ob__art');
  const copy = el('div', 'ob__body');
  const dots = el('div', 'ob__dots');
  const footWrap = el('div', 'ob__foot');

  const go = el('button', 'btn btn--primary btn--block', 'Get started');
  go.onclick = () => {
    if (i < ONBOARD_SLIDES.length - 1) {
      i++;
      paint();
      return;
    }
    location.hash = '#/signup-email';
  };
  const next = el('button', 'btn btn--ghost btn--block', 'Next');
  next.onclick = () => {
    if (i < ONBOARD_SLIDES.length - 1) { i++; paint(); }
    else location.hash = '#/signup-email';
  };

  footWrap.appendChild(go);
  footWrap.appendChild(next);

  const paint = () => {
    const s = ONBOARD_SLIDES[i];
    art.innerHTML = ART[s.art] || ART.card;
    copy.innerHTML = '';
    copy.appendChild(foot(s.title, s.body));
    dots.innerHTML = '';
    for (let k = 0; k < ONBOARD_SLIDES.length; k++) {
      dots.appendChild(el('span', 'ob__dot' + (k === i ? ' ob__dot--on' : '')));
    }
    go.textContent = i === ONBOARD_SLIDES.length - 1 ? 'Get started' : 'Continue';
    next.textContent = i === ONBOARD_SLIDES.length - 1 ? 'Log in instead' : 'Next';
    next.onclick = () => {
      if (i < ONBOARD_SLIDES.length - 1) { i++; paint(); }
      else { finishOnboard(); location.hash = '#/login'; }
    };
  };

  body.appendChild(art);
  body.appendChild(dots);
  body.appendChild(copy);
  body.appendChild(footWrap);
  paint();

  const wrap = el('div');
  wrap.appendChild(body);
  return wrap;
}

export function signupEmailScreen() {
  const body = el('div', 'form');
  const main = el('div', 'form__body');
  main.appendChild(el('h1', 'form__title', 'What is your email?'));
  main.appendChild(el('p', 'form__sub', 'We will send a link to confirm it is you.'));

  const email = input({type: 'email', value: state.onboard.email || state.user.email || '', placeholder: 'you@example.com'});
  email.setAttribute('autocomplete', 'email');
  main.appendChild(field({label: 'Email', input: email}));
  body.appendChild(main);

  const footWrap = el('div', 'form__foot');
  const go = el('button', 'btn btn--primary btn--block', 'Continue');
  footWrap.appendChild(go);
  const back = el('button', 'btn btn--ghost btn--block', 'Back');
  back.onclick = () => { location.hash = '#/welcome'; };
  footWrap.appendChild(back);
  body.appendChild(footWrap);

  go.onclick = () => {
    const v = email.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) return toast('Enter a valid email');
    onboardSet({email: v, step: 'check'});
    location.hash = '#/signup-check';
  };

  setTimeout(() => email.focus(), 60);
  const wrap = el('div');
  wrap.appendChild(body);
  return wrap;
}

export function signupCheckScreen() {
  const body = el('div', 'form');
  const main = el('div', 'form__body');
  const mail = el('div', 'mail');
  mail.appendChild(icon('payments', 30));
  main.appendChild(mail);
  main.appendChild(el('h1', 'form__title', 'Check your email'));
  main.appendChild(el('p', 'form__sub', 'We sent a link to ' + maskEmail(state.onboard.email) + '. Open it to carry on.'));

  const card = el('div', 'card card--flat');
  card.appendChild(el('div', 'row__t', 'Nothing arrived?'));
  card.appendChild(el('div', 'hint', 'Give it a minute, then check spam. The link works for 10 minutes.'));
  main.appendChild(card);
  body.appendChild(main);

  const footWrap = el('div', 'form__foot');
  const open = el('button', 'btn btn--primary btn--block', 'Open the link');
  open.onclick = () => { location.hash = '#/signup-phone'; };
  footWrap.appendChild(open);
  const again = el('button', 'btn btn--ghost btn--block', 'Send it again');
  again.onclick = () => toast('Link sent');
  footWrap.appendChild(again);
  body.appendChild(footWrap);

  const wrap = el('div');
  wrap.appendChild(body);
  return wrap;
}

export function signupPhoneScreen() {
  const body = el('div', 'form');
  const main = el('div', 'form__body');
  main.appendChild(el('h1', 'form__title', 'What is your phone number?'));
  main.appendChild(el('p', 'form__sub', 'We use it for security and to reach you about your account.'));

  const phone = input({type: 'tel', value: state.onboard.phone || state.user.phone || '', placeholder: '07700 900123'});
  phone.setAttribute('autocomplete', 'tel');
  main.appendChild(field({label: 'Mobile', input: phone, hint: 'UK numbers only in this clone'}));
  body.appendChild(main);

  const footWrap = el('div', 'form__foot');
  const go = el('button', 'btn btn--primary btn--block', 'Continue');
  footWrap.appendChild(go);
  const back = el('button', 'btn btn--ghost btn--block', 'Back');
  back.onclick = () => { location.hash = '#/signup-email'; };
  footWrap.appendChild(back);
  body.appendChild(footWrap);

  go.onclick = () => {
    const digits = phone.value.replace(/\D/g, '');
    if (digits.length < 10) return toast('Enter a full phone number');
    onboardSet({phone: phone.value.trim(), step: 'pin'});
    state.user.phone = phone.value.trim();
    state.user.email = state.onboard.email;
    save();
    location.hash = '#/signup-pin';
  };

  setTimeout(() => phone.focus(), 60);
  const wrap = el('div');
  wrap.appendChild(body);
  return wrap;
}

export function signupPinScreen() {
  let stage = 'create';
  let first = '';
  let entered = '';

  const body = el('div', 'form');
  const main = el('div', 'form__body');
  const title = el('h1', 'form__title', 'Create a PIN');
  const sub = el('p', 'form__sub', 'Four digits. You will use it every time you open Monzo.');
  main.appendChild(title);
  main.appendChild(sub);

  const dots = el('div', 'pin');
  for (let i = 0; i < 4; i++) dots.appendChild(el('div', 'pin__d'));
  main.appendChild(dots);

  const pad = el('div', 'keypad');
  for (const k of PIN_KEYS) {
    if (!k.d) {
      pad.appendChild(el('button', 'key key--blank'));
      continue;
    }
    const b = el('button', 'key');
    b.type = 'button';
    b.appendChild(el('span', '', k.d));
    if (k.l) b.appendChild(el('span', 'key__l', k.l));
    b.onclick = () => press(k.d);
    pad.appendChild(b);
  }
  main.appendChild(pad);
  body.appendChild(main);

  const paint = () => {
    dots.querySelectorAll('.pin__d').forEach((d, i) => {
      d.classList.toggle('pin__d--on', i < entered.length);
    });
  };

  const reset = () => {
    entered = '';
    paint();
  };

  const press = (k) => {
    haptic(5);
    if (k === '⌫') entered = entered.slice(0, -1);
    else if (entered.length < 4) entered += k;
    paint();
    if (entered.length === 4) done();
  };

  const done = () => {
    if (stage === 'create') {
      first = entered;
      stage = 'confirm';
      title.textContent = 'Confirm your PIN';
      sub.textContent = 'Type the same four digits again.';
      reset();
      return;
    }
    if (entered !== first) {
      toast('Those did not match');
      dots.classList.add('pin--bad');
      setTimeout(() => dots.classList.remove('pin--bad'), 320);
      stage = 'create';
      first = '';
      title.textContent = 'Create a PIN';
      sub.textContent = 'Four digits. You will use it every time you open Monzo.';
      reset();
      return;
    }
    setPin(entered);
    onboardSet({step: 'card'});
    location.hash = '#/signup-card';
  };

  const wrap = el('div');
  wrap.appendChild(body);
  return wrap;
}

export function signupCardScreen() {
  let colour = CARD_COLOURS[0];
  const body = el('div', 'form');
  const main = el('div', 'form__body');
  main.appendChild(el('h1', 'form__title', 'Pick your card'));
  main.appendChild(el('p', 'form__sub', 'Coral is the classic. You can change it later for a fee.'));

  const art = el('div', 'cardart');
  art.style.margin = '0 0 var(--s5)';
  const paintArt = () => {
    art.style.background = 'linear-gradient(145deg,' + colour.colour + 'cc 0%,' + colour.colour + ' 45%,' + colour.colour + 'aa 100%)';
    art.innerHTML =
      '<div class="cardart__top"><div class="cardart__chip"></div><div class="cardart__brand">monzo</div></div>' +
      '<div class="cardart__num">•••• •••• •••• 4821</div>' +
      '<div class="cardart__row"><span>' + String(state.user.name).toUpperCase() + '</span><div class="cardart__dots"><i></i><i></i></div></div>';
  };
  paintArt();
  main.appendChild(art);

  const rowWrap = el('div', 'colourrow');
  for (const c of CARD_COLOURS) {
    const b = el('button', 'coloursw');
    b.type = 'button';
    b.style.background = c.colour;
    b.setAttribute('aria-label', c.name);
    b.setAttribute('aria-pressed', String(c.id === colour.id));
    b.onclick = () => {
      colour = c;
      haptic();
      rowWrap.querySelectorAll('button').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      paintArt();
    };
    rowWrap.appendChild(b);
  }
  main.appendChild(field({label: 'Colour', input: rowWrap}));
  body.appendChild(main);

  const footWrap = el('div', 'form__foot');
  const go = el('button', 'btn btn--primary btn--block', 'Order card and finish');
  go.onclick = () => {
    const card = state.cards.find(c => !c.virtual) || state.cards[0];
    if (card) { card.label = colour.name; card.colour = colour.colour; }
    state.onboard.step = 'done';
    finishOnboard();
    save();
    sessionStorage.setItem('monzo_auth', '1');
    notify('Welcome to Monzo', 'Your card is on its way');
    toast('Card ordered');
    location.hash = '#/home';
    rerender();
  };
  footWrap.appendChild(go);
  const back = el('button', 'btn btn--ghost btn--block', 'Back');
  back.onclick = () => { location.hash = '#/signup-pin'; };
  footWrap.appendChild(back);
  body.appendChild(footWrap);

  const wrap = el('div');
  wrap.appendChild(body);
  return wrap;
}

export function loginScreen() {
  let entered = '';
  const body = el('div', 'form');
  const main = el('div', 'form__body');

  const logo = el('div', 'logo', 'M');
  main.appendChild(logo);
  main.appendChild(el('h1', 'form__title', 'Welcome back, ' + (state.user.first || 'Jason')));
  main.appendChild(el('p', 'form__sub', 'Enter your PIN to continue.'));

  const dots = el('div', 'pin');
  for (let i = 0; i < 4; i++) dots.appendChild(el('div', 'pin__d'));
  main.appendChild(dots);

  const bio = el('button', 'faceid');
  bio.appendChild(icon('account', 20));
  bio.appendChild(el('span', '', 'Use Face ID'));
  if (!state.settings.biometrics) bio.setAttribute('disabled', 'disabled');
  bio.onclick = () => {
    if (!state.settings.biometrics) return;
    bio.setAttribute('disabled', 'disabled');
    setTimeout(() => {
      const pin = state.user.pin || '2580';
      let n = 0;
      const tick = setInterval(() => {
        n++;
        entered = pin.slice(0, n);
        paint();
        if (n >= 4) {
          clearInterval(tick);
          setTimeout(succeed, 120);
        }
      }, 70);
    }, 260);
  };
  main.appendChild(bio);

  const pad = el('div', 'keypad');
  for (const k of PIN_KEYS) {
    if (!k.d) {
      pad.appendChild(el('button', 'key key--blank'));
      continue;
    }
    const b = el('button', 'key');
    b.type = 'button';
    b.appendChild(el('span', '', k.d));
    if (k.l) b.appendChild(el('span', 'key__l', k.l));
    b.onclick = () => press(k.d);
    pad.appendChild(b);
  }
  main.appendChild(pad);

  const forgot = el('button', 'ob__link', 'Forgot your PIN?');
  forgot.onclick = () => { location.hash = '#/forgot-pin'; };
  main.appendChild(forgot);

  const footNote = el('p', 'hint');
  footNote.style.textAlign = 'center';
  footNote.style.marginTop = 'var(--s4)';
  footNote.textContent = 'build 44';
  main.appendChild(footNote);

  body.appendChild(main);

  const paint = () => {
    dots.querySelectorAll('.pin__d').forEach((d, i) => {
      d.classList.toggle('pin__d--on', i < entered.length);
    });
  };

  const succeed = () => {
    sessionStorage.setItem('monzo_auth', '1');
    location.hash = '#/home';
    rerender();
  };

  const press = (k) => {
    haptic(5);
    if (k === '⌫') entered = entered.slice(0, -1);
    else if (entered.length < 4) entered += k;
    paint();
    if (entered.length === 4) {
      if (checkPin(entered)) {
        succeed();
      } else {
        toast('Wrong PIN');
        dots.classList.add('pin--bad');
        setTimeout(() => dots.classList.remove('pin--bad'), 320);
        entered = '';
        paint();
      }
    }
  };

  const wrap = el('div');
  wrap.appendChild(body);
  return wrap;
}

export function forgotPinScreen() {
  const body = el('div', 'form');
  const main = el('div', 'form__body');
  main.appendChild(el('h1', 'form__title', 'Reset your PIN'));
  main.appendChild(el('p', 'form__sub', 'We will email a link to ' + maskEmail(state.user.email) + '. Open it to choose a new PIN.'));

  const card = el('div', 'card card--flat');
  card.appendChild(el('div', 'row__t', 'Why we do this'));
  card.appendChild(el('div', 'hint', 'A PIN reset can move money, so we confirm it by email first.'));
  main.appendChild(card);
  body.appendChild(main);

  const footWrap = el('div', 'form__foot');
  const go = el('button', 'btn btn--primary btn--block', 'Send the link');
  go.onclick = () => {
    onboardSet({email: state.user.email, step: 'forgot'});
    toast('Link sent');
    location.hash = '#/forgot-sent';
  };
  footWrap.appendChild(go);
  const back = el('button', 'btn btn--ghost btn--block', 'Back to PIN');
  back.onclick = () => { location.hash = '#/login'; };
  footWrap.appendChild(back);
  body.appendChild(footWrap);

  const wrap = el('div');
  wrap.appendChild(body);
  return wrap;
}

export function forgotSentScreen() {
  const body = el('div', 'form');
  const main = el('div', 'form__body');
  const mail = el('div', 'mail');
  mail.appendChild(icon('payments', 30));
  main.appendChild(mail);
  main.appendChild(el('h1', 'form__title', 'Check your email'));
  main.appendChild(el('p', 'form__sub', 'The link goes to ' + maskEmail(state.user.email) + ' and works once.'));
  body.appendChild(main);

  const footWrap = el('div', 'form__foot');
  const open = el('button', 'btn btn--primary btn--block', 'Open the link');
  open.onclick = () => { location.hash = '#/reset-pin'; };
  footWrap.appendChild(open);
  body.appendChild(footWrap);

  const wrap = el('div');
  wrap.appendChild(body);
  return wrap;
}

export function resetPinScreen() {
  let stage = 'create';
  let first = '';
  let entered = '';

  const body = el('div', 'form');
  const main = el('div', 'form__body');
  const title = el('h1', 'form__title', 'Choose a new PIN');
  const sub = el('p', 'form__sub', 'Four digits. Pick something you will remember.');
  main.appendChild(title);
  main.appendChild(sub);

  const dots = el('div', 'pin');
  for (let i = 0; i < 4; i++) dots.appendChild(el('div', 'pin__d'));
  main.appendChild(dots);

  const pad = el('div', 'keypad');
  for (const k of PIN_KEYS) {
    if (!k.d) {
      pad.appendChild(el('button', 'key key--blank'));
      continue;
    }
    const b = el('button', 'key');
    b.type = 'button';
    b.appendChild(el('span', '', k.d));
    if (k.l) b.appendChild(el('span', 'key__l', k.l));
    b.onclick = () => press(k.d);
    pad.appendChild(b);
  }
  main.appendChild(pad);
  body.appendChild(main);

  const paint = () => {
    dots.querySelectorAll('.pin__d').forEach((d, i) => {
      d.classList.toggle('pin__d--on', i < entered.length);
    });
  };

  const reset = () => { entered = ''; paint(); };

  const press = (k) => {
    haptic(5);
    if (k === '⌫') entered = entered.slice(0, -1);
    else if (entered.length < 4) entered += k;
    paint();
    if (entered.length === 4) done();
  };

  const done = () => {
    if (stage === 'create') {
      first = entered;
      stage = 'confirm';
      title.textContent = 'Confirm your new PIN';
      sub.textContent = 'Type it once more.';
      reset();
      return;
    }
    if (entered !== first) {
      toast('Those did not match');
      stage = 'create';
      first = '';
      title.textContent = 'Choose a new PIN';
      sub.textContent = 'Four digits. Pick something you will remember.';
      reset();
      return;
    }
    setPin(entered);
    toast('PIN changed');
    location.hash = '#/login';
  };

  const wrap = el('div');
  wrap.appendChild(body);
  return wrap;
    }
