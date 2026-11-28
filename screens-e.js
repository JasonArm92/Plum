import {
  state, save, acc, onboardSet, onboarded, finishOnboard,
  setPin, checkPin, maskEmail, maskPhone
} from './core.js?v=44';
import { ONBOARD_SLIDES, CARD_COLOURS, PIN_KEYS } from './data.js?v=44';
import { el, field, input, toast, haptic, motionOK, cardArt } from './ui.js?v=44';

const rerender = () => document.dispatchEvent(new CustomEvent('render'));

function faceSvg(size = 20) {
  const NS = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.8');
  svg.setAttribute('stroke-linecap', 'round');
  svg.setAttribute('stroke-linejoin', 'round');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<path d="M4 8V6a2 2 0 0 1 2-2h2"/><path d="M16 4h2a2 2 0 0 1 2 2v2"/>' +
    '<path d="M20 16v2a2 2 0 0 1-2 2h-2"/><path d="M8 20H6a2 2 0 0 1-2-2v-2"/>' +
    '<path d="M9 10v1"/><path d="M15 10v1"/><path d="M9.5 15a3.5 3.5 0 0 0 5 0"/>';
  return svg;
}

const ART = {
  card: '<svg viewBox="0 0 240 160" fill="none" aria-hidden="true">' +
    '<rect x="18" y="34" width="204" height="128" rx="18" fill="#ffe9e6"/>' +
    '<rect x="34" y="18" width="204" height="128" rx="18" fill="#ff4f40"/>' +
    '<rect x="50" y="36" width="34" height="26" rx="6" fill="#f6e6b4"/>' +
    '<rect x="50" y="96" width="140" height="10" rx="5" fill="#ffffff" opacity=".85"/>' +
    '<rect x="50" y="116" width="80" height="8" rx="4" fill="#ffffff" opacity=".55"/></svg>',
  pot: '<svg viewBox="0 0 240 160" fill="none" aria-hidden="true">' +
    '<ellipse cx="120" cy="140" rx="76" ry="10" fill="#ffe9e6"/>' +
    '<path d="M74 60h92l-9 68a12 12 0 0 1-12 11H95a12 12 0 0 1-12-11z" fill="#ff4f40"/>' +
    '<rect x="68" y="48" width="104" height="16" rx="8" fill="#e03a2c"/>' +
    '<circle cx="120" cy="102" r="16" fill="#fff" opacity=".9"/>' +
    '<path d="M120 94v16M112 102h16" stroke="#ff4f40" stroke-width="3" stroke-linecap="round"/></svg>',
  chart: '<svg viewBox="0 0 240 160" fill="none" aria-hidden="true">' +
    '<rect x="26" y="30" width="188" height="110" rx="16" fill="#ffe9e6"/>' +
    '<rect x="48" y="96" width="22" height="30" rx="6" fill="#ff4f40" opacity=".45"/>' +
    '<rect x="82" y="76" width="22" height="50" rx="6" fill="#ff4f40" opacity=".65"/>' +
    '<rect x="116" y="58" width="22" height="68" rx="6" fill="#ff4f40" opacity=".85"/>' +
    '<rect x="150" y="42" width="22" height="84" rx="6" fill="#ff4f40"/></svg>',
  flex: '<svg viewBox="0 0 240 160" fill="none" aria-hidden="true">' +
    '<rect x="30" y="40" width="180" height="92" rx="18" fill="#ffe9e6"/>' +
    '<circle cx="72" cy="86" r="18" fill="#ff4f40"/>' +
    '<rect x="104" y="70" width="82" height="10" rx="5" fill="#ff4f40" opacity=".7"/>' +
    '<rect x="104" y="90" width="56" height="10" rx="5" fill="#ff4f40" opacity=".45"/></svg>'
};

function pinPad(onComplete) {
  let value = '';
  const wrap = el('div');
  const dots = el('div', 'pin');
  const paint = () => {
    dots.innerHTML = '';
    for (let i = 0; i < 4; i++) dots.appendChild(el('div', 'pin__d' + (i < value.length ? ' pin__d--on' : '')));
  };
  paint();

  const push = d => {
    if (d === '⌫') value = value.slice(0, -1);
    else if (value.length < 4) value += d;
    paint();
    if (value.length === 4) onComplete(value);
  };

  const pad = el('div', 'keypad');
  for (const k of PIN_KEYS) {
    if (!k.d) { pad.appendChild(el('div', 'key key--blank')); continue; }
    const b = el('button', 'key');
    b.type = 'button';
    b.appendChild(el('span', '', k.d));
    if (k.l) b.appendChild(el('span', 'key__l', k.l));
    b.onclick = () => { haptic(); push(k.d); };
    pad.appendChild(b);
  }

  wrap.appendChild(dots);
  wrap.appendChild(pad);

  return {
    wrap,
    dots,
    reset() { value = ''; paint(); },
    clear() { dots.innerHTML = ''; },
    shake() {
      if (!motionOK()) return;
      dots.classList.remove('pin--bad');
      void dots.offsetWidth;
      dots.classList.add('pin--bad');
    }
  };
}

function faceButton(label) {
  const b = el('button', 'faceid');
  b.type = 'button';
  b.appendChild(faceSvg(20));
  b.appendChild(el('span', '', label));
  return b;
}

function faceScan(pin, pad, onOk, onBad) {
  let i = 0;
  let timer = null;
  pad.reset();
  pad.clear();
  timer = setInterval(() => {
    if (i >= pin.length) {
      clearInterval(timer);
      setTimeout(() => {
        if (checkPin(pin)) onOk();
        else { pad.shake(); onBad(); }
      }, 180);
      return;
    }
    i++;
    const dots = pad.dots;
    dots.innerHTML = '';
    for (let k = 0; k < 4; k++) dots.appendChild(el('div', 'pin__d' + (k < i ? ' pin__d--on' : '')));
  }, 130);
}

function shell(cls) {
  const s = el('section', 'screen');
  s.appendChild(el('div', cls));
  return s;
}

function backLink(host, hash) {
  const b = el('button', 'ob__skip');
  b.type = 'button';
  b.textContent = '←';
  b.onclick = () => { location.hash = hash; };
  const top = el('div', 'ob__top');
  top.appendChild(b);
  host.appendChild(top);
}

export function welcomeScreen() {
  if (!state.onboard.email && state.user.email) onboardSet({email: state.user.email});
  if (!state.onboard.phone && state.user.phone) onboardSet({phone: state.user.phone});

  const s = shell('ob');
  const ob = s.firstChild;

  const top = el('div', 'ob__top');
  const skip = el('button', 'ob__skip', 'Log in');
  skip.type = 'button';
  skip.onclick = () => { location.hash = '#/login'; };
  top.appendChild(skip);
  ob.appendChild(top);

  let i = 0;
  const art = el('div', 'ob__art');
  const body = el('div', 'ob__body');
  const dots = el('div', 'ob__dots');
  const foot = el('div', 'ob__foot');

  const title = el('h2', 'ob__title');
  const text = el('p', 'ob__text');
  body.appendChild(title);
  body.appendChild(text);

  const cta = el('button', 'btn btn--primary btn--block');
  cta.type = 'button';
  const toEmail = el('button', 'ob__link', 'Already have an account? Log in');
  toEmail.type = 'button';
  toEmail.onclick = () => { location.hash = '#/login'; };
  foot.appendChild(cta);
  foot.appendChild(toEmail);

  const paint = () => {
    const slide = ONBOARD_SLIDES[i];
    art.innerHTML = ART[slide.art] || '';
    title.textContent = slide.title;
    text.textContent = slide.body;
    dots.innerHTML = '';
    ONBOARD_SLIDES.forEach((_, k) => dots.appendChild(el('div', 'ob__dot' + (k === i ? ' ob__dot--on' : ''))));
    cta.textContent = i === ONBOARD_SLIDES.length - 1 ? 'Get started' : 'Next';
  };

  cta.onclick = () => {
    haptic();
    if (i < ONBOARD_SLIDES.length - 1) { i++; paint(); return; }
    location.hash = '#/signup-email';
  };

  paint();

  ob.appendChild(art);
  ob.appendChild(body);
  ob.appendChild(dots);
  ob.appendChild(foot);

  return s;
}

export function signupEmailScreen() {
  const s = shell('form');
  const f = s.firstChild;
  backLink(f, '#/welcome');

  const body = el('div', 'form__body');
  body.appendChild(el('h1', 'form__title', "What's your email?"));
  body.appendChild(el('p', 'form__sub', 'We will send your account details here.'));

  const email = input({type: 'email', value: state.onboard.email || '', placeholder: 'you@example.com'});
  body.appendChild(field({label: 'Email', input: email}));
  f.appendChild(body);

  const foot = el('div', 'form__foot');
  const go = el('button', 'btn btn--primary btn--block', 'Continue');
  go.type = 'button';
  foot.appendChild(go);
  f.appendChild(foot);

  go.onclick = () => {
    const v = email.value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return toast('Enter a valid email');
    onboardSet({email: v, step: 'check'});
    location.hash = '#/signup-check';
  };
  setTimeout(() => email.focus(), 80);

  return s;
}

export function signupCheckScreen() {
  const s = shell('form');
  const f = s.firstChild;
  backLink(f, '#/signup-email');

  const body = el('div', 'form__body');
  const mail = el('div', 'mail');
  mail.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>';
  body.appendChild(mail);
  body.appendChild(el('h1', 'form__title', 'Is this right?'));
  body.appendChild(el('p', 'form__sub', 'We will use ' + maskEmail(state.onboard.email || state.user.email) + ' for your account.'));

  body.appendChild(el('p', 'hint', 'Phone ' + maskPhone(state.onboard.phone || state.user.phone)));
  f.appendChild(body);

  const foot = el('div', 'form__foot');
  const go = el('button', 'btn btn--primary btn--block', "Yes, that's right");
  go.type = 'button';
  go.onclick = () => { onboardSet({step: 'phone'}); location.hash = '#/signup-phone'; };
  foot.appendChild(go);
  const edit = el('button', 'btn btn--ghost btn--block', 'Edit email');
  edit.type = 'button';
  edit.onclick = () => { location.hash = '#/signup-email'; };
  foot.appendChild(edit);
  f.appendChild(foot);

  return s;
}

export function signupPhoneScreen() {
  const s = shell('form');
  const f = s.firstChild;
  backLink(f, '#/signup-check');

  const body = el('div', 'form__body');
  body.appendChild(el('h1', 'form__title', "What's your number?"));
  body.appendChild(el('p', 'form__sub', 'We use it for security and to confirm payments.'));

  const phone = input({type: 'tel', value: state.onboard.phone || '', placeholder: '07700 900123'});
  body.appendChild(field({label: 'Mobile', input: phone, hint: 'UK mobile number'}));
  f.appendChild(body);

  const foot = el('div', 'form__foot');
  const go = el('button', 'btn btn--primary btn--block', 'Continue');
  go.type = 'button';
  foot.appendChild(go);
  f.appendChild(foot);

  go.onclick = () => {
    const digits = phone.value.replace(/\D/g, '');
    if (digits.length < 10) return toast('Enter a full mobile number');
    onboardSet({phone: phone.value.trim(), step: 'pin'});
    location.hash = '#/signup-pin';
  };
  setTimeout(() => phone.focus(), 80);

  return s;
}

export function signupPinScreen() {
  const s = shell('form');
  const f = s.firstChild;
  backLink(f, '#/signup-phone');

  let first = null;

  const body = el('div', 'form__body');
  const title = el('h1', 'form__title', 'Choose a PIN');
  const sub = el('p', 'form__sub', 'Four digits. You will use this to open the app.');
  body.appendChild(title);
  body.appendChild(sub);
  f.appendChild(body);

  const pad = pinPad(value => {
    if (first === null) {
      first = value;
      title.textContent = 'Confirm your PIN';
      sub.textContent = 'Type those four digits again.';
      pad.reset();
      return;
    }
    if (value !== first) {
      pad.shake();
      toast('Those did not match');
      first = null;
      title.textContent = 'Choose a PIN';
      sub.textContent = 'Four digits. You will use this to open the app.';
      pad.reset();
      return;
    }
    setPin(value);
    onboardSet({step: 'card'});
    haptic(14);
    location.hash = '#/signup-card';
  });

  f.appendChild(pad.wrap);

  return s;
}

export function signupCardScreen() {
  const s = shell('form');
  const f = s.firstChild;

  const body = el('div', 'form__body');
  body.appendChild(el('h1', 'form__title', 'Pick your card'));
  body.appendChild(el('p', 'form__sub', 'You can change this later.'));

  let choice = CARD_COLOURS[0];
  const preview = el('div');
  preview.style.margin = '8px 0 20px';
  const paintPreview = () => {
    preview.innerHTML = '';
    preview.appendChild(cardArt({last4: '4821', colour: choice.colour}));
  };
  paintPreview();
  body.appendChild(preview);

  const row = el('div', 'colourrow');
  for (const c of CARD_COLOURS) {
    const b = el('button', 'coloursw');
    b.type = 'button';
    b.style.background = c.colour;
    b.setAttribute('aria-label', c.name);
    b.setAttribute('aria-pressed', String(c.id === choice.id));
    b.onclick = () => {
      haptic();
      choice = c;
      row.querySelectorAll('.coloursw').forEach(x => x.setAttribute('aria-pressed', 'false'));
      b.setAttribute('aria-pressed', 'true');
      paintPreview();
    };
    row.appendChild(b);
  }
  body.appendChild(row);
  f.appendChild(body);

  const foot = el('div', 'form__foot');
  const go = el('button', 'btn btn--primary btn--block', 'Create my account');
  go.type = 'button';
  foot.appendChild(go);
  f.appendChild(foot);

  go.onclick = () => {
    acc().card.colour = choice.colour;
    acc().card.label = choice.name;
    state.user.cardColour = choice.colour;
    finishOnboard();
    save();
    sessionStorage.setItem('monzo_auth', '1');
    toast('Welcome to Monzo');
    location.hash = '#/home';
  };

  return s;
}

export function loginScreen() {
  const s = shell('form');
  const f = s.firstChild;

  const body = el('div', 'form__body');
  body.appendChild(el('h1', 'form__title', 'Welcome back'));
  body.appendChild(el('p', 'form__sub', maskEmail(state.user.email || '') + ' · ' + maskPhone(state.user.phone || '')));

  if (!onboarded()) {
    const setup = el('button', 'ob__link', 'Finish setting up');
    setup.type = 'button';
    setup.style.textAlign = 'left';
    setup.onclick = () => { location.hash = '#/welcome'; };
    body.appendChild(setup);
  }
  f.appendChild(body);

  const pin = state.user.pin || '2580';
  let busy = false;

  const done = () => {
    sessionStorage.setItem('monzo_auth', '1');
    haptic(14);
    location.hash = '#/home';
  };

  const pad = pinPad(value => {
    if (busy) return;
    if (checkPin(value)) { done(); return; }
    pad.shake();
    toast('Wrong PIN');
    setTimeout(() => pad.reset(), motionOK() ? 320 : 0);
  });

  f.appendChild(pad.wrap);

  const face = faceButton('Use Face ID');
  face.onclick = () => {
    if (busy) return;
    busy = true;
    face.setAttribute('disabled', '');
    faceScan(pin, pad, () => { busy = false; face.removeAttribute('disabled'); done(); }, () => {
      busy = false;
      face.removeAttribute('disabled');
      toast('Face not recognised');
    });
  };
  f.appendChild(face);

  const forgot = el('button', 'ob__link', 'Forgot PIN?');
  forgot.type = 'button';
  forgot.onclick = () => { location.hash = '#/forgot-pin'; };
  f.appendChild(forgot);

  return s;
}

export function forgotPinScreen() {
  const s = shell('form');
  const f = s.firstChild;
  backLink(f, '#/login');

  const body = el('div', 'form__body');
  body.appendChild(el('h1', 'form__title', 'Reset your PIN'));
  body.appendChild(el('p', 'form__sub', 'Tell us the email on your account and we will send a code.'));

  const email = input({type: 'email', value: state.user.email || '', placeholder: 'you@example.com'});
  body.appendChild(field({label: 'Email', input: email}));
  f.appendChild(body);

  const foot = el('div', 'form__foot');
  const go = el('button', 'btn btn--primary btn--block', 'Send me a code');
  go.type = 'button';
  foot.appendChild(go);
  f.appendChild(foot);

  go.onclick = () => {
    const v = email.value.trim();
    if (!v) return toast('Enter your email');
    onboardSet({email: v});
    location.hash = '#/forgot-sent';
  };

  return s;
}

export function forgotSentScreen() {
  const s = shell('form');
  const f = s.firstChild;
  backLink(f, '#/forgot-pin');

  const body = el('div', 'form__body');
  const mail = el('div', 'mail');
  mail.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3.5 7 8.5 6 8.5-6"/></svg>';
  body.appendChild(mail);
  body.appendChild(el('h1', 'form__title', 'Check your messages'));
  body.appendChild(el('p', 'form__sub', 'We sent a code to ' + maskEmail(state.onboard.email || state.user.email) + '. It lasts ten minutes.'));
  f.appendChild(body);

  const foot = el('div', 'form__foot');
  const go = el('button', 'btn btn--primary btn--block', "I've got the code");
  go.type = 'button';
  go.onclick = () => { location.hash = '#/reset-pin'; };
  foot.appendChild(go);
  f.appendChild(foot);

  return s;
}

export function resetPinScreen() {
  const s = shell('form');
  const f = s.firstChild;
  backLink(f, '#/forgot-sent');

  let first = null;

  const body = el('div', 'form__body');
  const title = el('h1', 'form__title', 'New PIN');
  const sub = el('p', 'form__sub', 'Pick four digits you will remember.');
  body.appendChild(title);
  body.appendChild(sub);
  f.appendChild(body);

  const pad = pinPad(value => {
    if (first === null) {
      first = value;
      title.textContent = 'Confirm new PIN';
      sub.textContent = 'Type those four digits again.';
      pad.reset();
      return;
    }
    if (value !== first) {
      pad.shake();
      toast('Those did not match');
      first = null;
      title.textContent = 'New PIN';
      sub.textContent = 'Pick four digits you will remember.';
      pad.reset();
      return;
    }
    setPin(value);
    sessionStorage.removeItem('monzo_auth');
    haptic(14);
    toast('PIN changed');
    location.hash = '#/login';
  });

  f.appendChild(pad.wrap);

  return s;
}
