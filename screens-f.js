import { state } from './core.js?v=45';
import {
  el, screen, row, list, section, empty, toast, sheet, input, pill, haptic
} from './ui.js?v=45';

const rerender = () => document.dispatchEvent(new CustomEvent('render'));

const HELP_GROUPS = [
  {id:'card', label:'Card and payments'},
  {id:'account', label:'Account and details'},
  {id:'borrowing', label:'Borrowing'},
  {id:'saving', label:'Pots and savings'},
  {id:'security', label:'Security and access'},
  {id:'plans', label:'Plans and benefits'}
];

const HELP_TOPICS = [
  {id:'card-lost', group:'card', label:'Lost or stolen card', blurb:'Freeze it now, order a replacement'},
  {id:'card-declined', group:'card', label:'Card declined', blurb:'Why a payment did not go through'},
  {id:'refunds', group:'card', label:'Refunds', blurb:'How long they take to land'},
  {id:'transfer-late', group:'card', label:'A transfer has not arrived', blurb:'Bank transfers and timings'},
  {id:'details-change', group:'account', label:'Change your details', blurb:'Name, address, email and phone'},
  {id:'statement', group:'account', label:'Get a statement', blurb:'Download a PDF for any month'},
  {id:'flex', group:'borrowing', label:'Flex a purchase', blurb:'Split a payment into months'},
  {id:'loan', group:'borrowing', label:'Personal loans', blurb:'Rates, terms and eligibility'},
  {id:'overdraft', group:'borrowing', label:'Overdraft', blurb:'Limits and daily charges'},
  {id:'pots', group:'saving', label:'Pots', blurb:'Setting one up and moving money'},
  {id:'interest', group:'saving', label:'Interest on savings', blurb:'How 4% AER is paid'},
  {id:'pin', group:'security', label:'Change your PIN', blurb:'Reset it if you have forgotten it'},
  {id:'face-id', group:'security', label:'Face ID', blurb:'Turning biometrics on or off'},
  {id:'app-lock', group:'security', label:'App lock', blurb:'Keeping the app shut'},
  {id:'virtual-cards', group:'plans', label:'Virtual cards', blurb:'Cards that spend from a pot'}
];

const HELP_ARTICLES = {
  'card-lost-a': {
    topic:'card-lost',
    title:'Your card is lost or stolen',
    summary:'Freeze the card first. Nothing leaves your account while it is frozen.',
    sections:[
      {h:'Freeze it straight away',
       p:'Open Account, tap your card, then Freeze card. The card stops working for taps, online and cash machines within seconds.'},
      {h:'Order a replacement',
       p:'From the same screen choose Replace card. A new one arrives in three to five working days and the old one is cancelled for good.'},
      {h:'While you wait',
       p:'Add the replacement to Apple Pay as soon as it appears in the app. Your account number and sort code stay the same.'}
    ],
    related:['card-declined', 'refunds']
  },
  'card-declined-a': {
    topic:'card-declined',
    title:'Why your card was declined',
    summary:'Most declines are the merchant, the terminal or a limit rather than your balance.',
    sections:[
      {h:'Check the obvious first',
       p:'Is the card frozen? Is the balance in that account enough? Has the same payment already gone through twice?'},
      {h:'Contactless limits',
       p:'Contactless stops asking for a PIN after a set number of taps or a spend threshold. Put the card in and use your PIN to reset it.'},
      {h:'If it still fails',
       p:'Some merchants block prepaid ranges or foreign cards. Try another card, then open a chat and we will look at the decline code.'}
    ],
    related:['card-lost-a', 'transfer-late-a']
  },
  'refunds-a': {
    topic:'refunds',
    title:'Where is my refund?',
    summary:'Refunds are controlled by the merchant, not by us. We cannot speed one up.',
    sections:[
      {h:'Card refunds',
       p:'Once the merchant sends it, a card refund lands in two to five working days. It appears in your feed as money in.'},
      {h:'Pending refunds',
       p:'If the merchant has not released the funds yet, nothing shows in the app. Keep their confirmation email as proof.'}
    ],
    related:['card-declined-a']
  },
  'transfer-late-a': {
    topic:'transfer-late',
    title:'A bank transfer has not arrived',
    summary:'Faster Payments usually land in seconds, but can take up to two hours.',
    sections:[
      {h:'Check the details',
       p:'Open the receipt and confirm the sort code and account number. A wrong digit sends the money to a real but different account.'},
      {h:'Timings',
       p:'Transfers sent after 4pm, at weekends or on bank holidays can be held. They still arrive, just later than the estimate.'},
      {h:'If it is over two hours',
       p:'Open a chat with the receipt reference. We can trace a Faster Payment and recall it if the receiving bank agrees.'}
    ],
    related:['card-declined-a']
  },
  'details-change-a': {
    topic:'details-change',
    title:'Change your name or address',
    summary:'Name changes need a document. Address changes are instant.',
    sections:[
      {h:'Address',
       p:'Settings, Personal details, Address. It updates straight away and is used for statements and card delivery.'},
      {h:'Name',
       p:'Upload a passport, driving licence or marriage certificate. Name changes are reviewed within one working day.'}
    ],
    related:['statement-a']
  },
  'details-change-b': {
    topic:'details-change',
    title:'Change your email or phone number',
    summary:'Both are used for security, so we confirm the new one before switching.',
    sections:[
      {h:'Email',
       p:'Settings, Personal details, Email. You will get a code to the new address. The old one keeps working until you enter it.'},
      {h:'Phone',
       p:'Same route. A text goes to the new number, and the old number stops receiving login codes once confirmed.'}
    ],
    related:['details-change-a', 'pin-a']
  },
  'statement-a': {
    topic:'statement',
    title:'Download a statement',
    summary:'Any of the last twelve months, as a PDF, in two taps.',
    sections:[
      {h:'From Settings',
       p:'Settings, Documents, Statements. Pick the month and the PDF saves to your device.'},
      {h:'What is on it',
       p:'Opening balance, every transaction in date order, running balance and closing balance. It reconciles to the penny.'}
    ],
    related:['details-change-a']
  },
  'flex-a': {
    topic:'flex',
    title:'How Flex works',
    summary:'Split a purchase from £100 over three, six or twelve months.',
    sections:[
      {h:'Three months is interest free',
       p:'Any amount from £100 split over three months costs exactly the same as paying once. Longer terms are 29% APR.'},
      {h:'Your limit',
       p:'Flex has its own limit, separate from your balance. You can see what is available on the Borrowing tab.'}
    ],
    related:['flex-b', 'loan-a']
  },
  'flex-b': {
    topic:'flex',
    title:'Settle a Flex plan early',
    summary:'Paying a plan off early saves 2% of what is left.',
    sections:[
      {h:'How',
       p:'Borrowing, Flex, then the plan. Choose Settle early and confirm. The remaining instalments are cancelled.'},
      {h:'Where the money comes from',
       p:'Your Personal balance. If it is short, move money across first or settle a smaller plan.'}
    ],
    related:['flex-a']
  },
  'loan-a': {
    topic:'loan',
    title:'Personal loan rates and terms',
    summary:'£1,000 to £25,000 over one to five years. The APR depends on the amount.',
    sections:[
      {h:'Rates',
       p:'Smaller loans cost more because the fixed cost of lending is spread thinner. The quote updates as you move the slider.'},
      {h:'Eligibility',
       p:'Offers are based on your Monzo history. Accepting runs a hard search, which shows on your credit file for twelve months.'}
    ],
    related:['flex-a', 'overdraft-a']
  },
  'overdraft-a': {
    topic:'overdraft',
    title:'Overdraft charges',
    summary:'39% EAR, charged daily, and only on the amount you actually use.',
    sections:[
      {h:'How it is worked out',
       p:'The daily charge is the limit multiplied by 39%, divided by 365. A full £500 limit costs about 53p a day.'},
      {h:'Switching it off',
       p:'Turn the overdraft off any time. If you are already overdrawn, it stays on until the balance is back above zero.'}
    ],
    related:['loan-a']
  },
  'pots-a': {
    topic:'pots',
    title:'Create and use a pot',
    summary:'Pots keep money out of reach of your card, but still in your account.',
    sections:[
      {h:'Making one',
       p:'Home, New pot. Give it a name, a target, an icon and a colour. Up to twenty pots.'},
      {h:'Moving money',
       p:'Add or withdraw from the pot screen. Both are instant and neither counts as spending in Trends.'}
    ],
    related:['interest-a']
  },
  'interest-a': {
    topic:'interest',
    title:'Interest on savings pots',
    summary:'4% AER on savings pots, paid monthly on the balance.',
    sections:[
      {h:'How it is paid',
       p:'Interest is calculated daily and paid into the pot on the first of the month. It compounds.'},
      {h:'Which pots count',
       p:'Savings pots only. Locked pots earn the same rate, and locking does not reduce it.'}
    ],
    related:['pots-a']
  },
  'pin-a': {
    topic:'pin',
    title:'Change or reset your PIN',
    summary:'Change it in the app, or reset it from the login screen if you are locked out.',
    sections:[
      {h:'Changing it',
       p:'Settings, Security and privacy, Change PIN. Enter the new four digits twice.'},
      {h:'Forgotten it',
       p:'On the login screen tap Forgot PIN. We send a code to your email, then you choose a new one.'}
    ],
    related:['face-id-a', 'app-lock-a']
  },
  'face-id-a': {
    topic:'face-id',
    title:'Turn Face ID on or off',
    summary:'Face ID lets you skip the PIN without weakening the lock.',
    sections:[
      {h:'Turning it on',
       p:'Settings, Security and privacy, Biometrics. Your device asks for permission the first time.'},
      {h:'When it fails',
       p:'Two failed attempts in a row fall back to the PIN. The PIN always works, even with Face ID on.'}
    ],
    related:['pin-a']
  },
  'app-lock-a': {
    topic:'app-lock',
    title:'App lock',
    summary:'App lock asks for your PIN every time the app opens or comes back from the background.',
    sections:[
      {h:'What it does',
       p:'With app lock on, the app hides your balances behind the PIN screen the moment you switch away.'},
      {h:'Turning it off',
       p:'Settings, Security and privacy, App lock. Worth leaving on if anyone else uses your phone.'}
    ],
    related:['pin-a', 'face-id-a']
  },
  'virtual-cards-a': {
    topic:'virtual-cards',
    title:'Create a virtual card',
    summary:'A virtual card can only spend what is in the pot it is tied to. Plus and above.',
    sections:[
      {h:'Making one',
       p:'Open the pot, then Virtual card, then Create. The card number is separate from your real one.'},
      {h:'Single use',
       p:'Flip Single use on and the card destroys itself after the first payment. Good for free trials.'}
    ],
    related:['pots-a', 'refunds-a']
  }
};

function topicById(id) {
  return HELP_TOPICS.find(t => t.id === id) || null;
}

function articlesFor(topicId) {
  return Object.entries(HELP_ARTICLES)
    .filter(([, a]) => a.topic === topicId)
    .map(([id, a]) => Object.assign({id}, a));
}

function searchArticles(q) {
  const needle = String(q || '').trim().toLowerCase();
  if (!needle) return [];
  return Object.entries(HELP_ARTICLES)
    .filter(([, a]) => {
      const t = topicById(a.topic);
      const hay = (a.title + ' ' + (t ? t.label : '') + ' ' + a.summary).toLowerCase();
      return hay.includes(needle);
    })
    .map(([id, a]) => Object.assign({id}, a));
}

export function helpScreen() {
  const body = el('div');

  const box = el('div', 'card card--flat');
  box.style.cssText = 'display:flex;align-items:center;gap:10px';
  box.appendChild(el('span', 'helpsearch__ico', '⌕'));
  const q = input({placeholder: 'Search help'});
  q.style.border = '0';
  q.style.background = 'transparent';
  q.style.padding = '4px 0';
  q.setAttribute('aria-label', 'Search help');
  box.appendChild(q);
  body.appendChild(box);

  const results = el('div');
  body.appendChild(results);

  const hub = el('div');
  body.appendChild(hub);

  const popular = el('div');
  popular.appendChild(section('Popular right now'));
  const pl = el('div', 'list list--boxed');
  for (const id of ['card-lost-a', 'refunds-a', 'pin-a', 'virtual-cards-a']) {
    const a = HELP_ARTICLES[id];
    pl.appendChild(row({
      title: a.title,
      sub: a.summary,
      onClick: () => { location.hash = '#/help-article/' + id; }
    }));
  }
  popular.appendChild(pl);
  hub.appendChild(popular);

  for (const g of HELP_GROUPS) {
    const topics = HELP_TOPICS.filter(t => t.group === g.id);
    if (!topics.length) continue;
    hub.appendChild(section(g.label));
    const l = el('div', 'list list--boxed');
    for (const t of topics) {
      l.appendChild(row({
        title: t.label,
        sub: t.blurb,
        onClick: () => { location.hash = '#/help-topic/' + t.id; }
      }));
    }
    hub.appendChild(l);
  }

  const chat = el('button', 'btn btn--primary btn--block', 'Chat with us');
  chat.style.marginTop = '8px';
  chat.onclick = () => helpChatSheet();
  hub.appendChild(chat);

  hub.appendChild(el('p', 'hint', 'Support is answered 24 hours a day. Priority plans skip the queue.'));

  const run = () => {
    const hits = searchArticles(q.value);
    results.innerHTML = '';
    if (!q.value.trim()) {
      hub.style.display = '';
      return;
    }
    hub.style.display = 'none';
    if (!hits.length) {
      results.appendChild(empty('Nothing matched', 'Try a different word, or open a chat'));
      return;
    }
    results.appendChild(section(hits.length + (hits.length === 1 ? ' article' : ' articles')));
    const l = el('div', 'list list--boxed');
    for (const a of hits) {
      l.appendChild(row({
        title: a.title,
        sub: a.summary,
        onClick: () => { location.hash = '#/help-article/' + a.id; }
      }));
    }
    results.appendChild(l);
  };

  q.oninput = run;

  return screen('help', {title: 'Help', back: '#/account', body});
}

export function helpTopicScreen(id) {
  const t = topicById(id);
  if (!t) return screen('help-topic', {title: 'Help', back: '#/help', body: empty('Not found')});

  const body = el('div');
  const arts = articlesFor(id);
  const l = el('div', 'list list--boxed');
  for (const a of arts) {
    l.appendChild(row({
      title: a.title,
      sub: a.summary,
      onClick: () => { location.hash = '#/help-article/' + a.id; }
    }));
  }
  body.appendChild(l);

  const chat = el('button', 'btn btn--ghost btn--block', 'Ask us about this');
  chat.onclick = () => helpChatSheet(t.label);
  body.appendChild(chat);

  return screen('help-topic-' + id, {title: t.label, back: '#/help', body});
}

export function helpArticleScreen(id) {
  const a = HELP_ARTICLES[id];
  if (!a) return screen('help-article', {title: 'Help', back: '#/help', body: empty('Not found')});

  const t = topicById(a.topic);
  const body = el('div');

  const head = el('div', 'card');
  head.appendChild(pill(t ? t.label.toUpperCase() : 'HELP', 'coral'));
  head.appendChild(el('div', 'art__t', a.title));
  head.appendChild(el('p', 'art__sum', a.summary));
  body.appendChild(head);

  for (const s of a.sections) {
    body.appendChild(el('h2', 'art__h', s.h));
    body.appendChild(el('p', 'art__p', s.p));
  }

  body.appendChild(section('Was this helpful?'));
  const fb = el('div');
  fb.style.cssText = 'display:flex;gap:8px';
  for (const [label, msg] of [['Yes', 'Thanks, noted'], ['Not really', 'Thanks, we will look at this article']]) {
    const b = el('button', 'btn btn--ghost btn--sm');
    b.style.flex = '1';
    b.textContent = label;
    b.onclick = () => { haptic(); toast(msg); };
    fb.appendChild(b);
  }
  body.appendChild(fb);

  const chat = el('button', 'btn btn--primary btn--block', 'Chat with us');
  chat.onclick = () => helpChatSheet(a.title);
  body.appendChild(chat);

  const rel = a.related.filter(r => HELP_ARTICLES[r]);
  if (rel.length) {
    body.appendChild(section('Related'));
    const l = el('div', 'list list--boxed');
    for (const r of rel) {
      l.appendChild(row({
        title: HELP_ARTICLES[r].title,
        sub: HELP_ARTICLES[r].summary,
        onClick: () => { location.hash = '#/help-article/' + r; }
      }));
    }
    body.appendChild(l);
  }

  body.appendChild(el('p', 'hint', 'This is a clone. Articles are written for the demo and nothing here contacts a real bank.'));

  return screen('help-article-' + id, {
    title: t ? t.label : 'Help',
    back: t ? '#/help-topic/' + t.id : '#/help',
    body
  });
}

export function helpChatSheet(subject = '') {
  const body = el('div');
  const log = el('div', 'chat__log');

  const opening = subject
    ? 'You are looking at ' + subject + '. Tell me what has happened and I will pick it up.'
    : 'Hello ' + (state.user.first || 'there') + '. Tell me what has happened and I will pick it up.';

  log.appendChild(el('div', 'chat__b chat__b--them', opening));
  body.appendChild(log);

  const form = el('div', 'chat__form');
  const field = input({placeholder: 'Type a message'});
  field.style.flex = '1';
  const send = el('button', 'btn btn--primary btn--sm', 'Send');
  send.type = 'button';
  form.appendChild(field);
  form.appendChild(send);
  body.appendChild(form);

  const sh = sheet({title: 'Chat with us', body});

  let waiting = false;

  const replies = [
    'Thanks, I can see that on your account.',
    'Give me a moment while I check the details.',
    'That is done. Anything else?',
    'I have made a note on your file.'
  ];
  let replyIndex = 0;

  const post = () => {
    const text = field.value.trim();
    if (!text || waiting) return;
    log.appendChild(el('div', 'chat__b chat__b--me', text));
    field.value = '';
    log.scrollTop = log.scrollHeight;
    waiting = true;
    setTimeout(() => {
      log.appendChild(el('div', 'chat__b chat__b--them', replies[replyIndex % replies.length]));
      replyIndex++;
      log.scrollTop = log.scrollHeight;
      waiting = false;
    }, 900);
  };

  send.onclick = post;
  field.onkeydown = e => { if (e.key === 'Enter') post(); };

  setTimeout(() => field.focus(), 120);

  return sh;
}
