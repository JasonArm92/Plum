/* src/data.js — inert constants and history generation. Imports nothing. */

export const TARGET_ISA = 934745.32;
export const BB_CAP = 150;

export const PLANS = {
  free:  { name:'Free',  price:0,  ia:2.75, atmUK:400,      atmRow:200, vcLive:0, vc30:0, billsback:false, cover:false, scores:1, min:0, age:'16+' },
  extra: { name:'Extra', price:3,  ia:3.00, atmUK:Infinity, atmRow:200, vcLive:5, vc30:9, billsback:true,  cover:false, scores:2, min:0, age:'18+' },
  perks: { name:'Perks', price:9,  ia:3.25, atmUK:Infinity, atmRow:600, vcLive:5, vc30:9, billsback:true,  cover:false, scores:2, min:0, age:'18+' },
  max:   { name:'Max',   price:19, ia:3.50, atmUK:Infinity, atmRow:600, vcLive:5, vc30:9, billsback:true,  cover:true,  scores:2, min:3, age:'18–69' }
};

export const CATS = ['Groceries','Eating out','Transport','Shopping','Bills','Rent','Health','Education',
  'Subscriptions','Entertainment','Fitness','Income','Transfers','Savings','Investments'];

export const FLEX = ['Groceries','Eating out','Transport','Shopping','Health','Education','Entertainment','Fitness'];
export const COMMITTED = ['Rent','Bills','Subscriptions'];

export const DEFAULT_TARGETS = { Groceries:420, 'Eating out':140, Transport:120, Shopping:180,
  Health:60, Education:90, Entertainment:70, Fitness:35 };

export const BANKS = ['Barclays','HSBC','Lloyds','NatWest','Santander','Nationwide','Starling','Chase'];

export const BB_PROVIDERS = ['British Gas','Northumbrian Water','Virgin Media','EE','Aviva',
  'Stockton Council','OpenRent','Blue Skies Lets','Pointens'];

export const DOMAINS = {
  'Tesco':'tesco.com','Aldi':'aldi.co.uk','Asda':'asda.com','Morrisons':'morrisons.com','Lidl':'lidl.co.uk',
  "Sainsbury's":'sainsburys.co.uk','Iceland':'iceland.co.uk','Costa':'costa.co.uk','Greggs':'greggs.co.uk',
  'The Masham':'masham.co.uk','Hope & Union':'hopeandunion.co.uk','Cena':'cena.co.uk','Borge':'borgerestaurant.co.uk',
  'The Twisted Peel':'thetwistedpeel.co.uk',"McDonald's":'mcdonalds.com','KFC':'kfc.co.uk',"Domino's":'dominos.co.uk',
  "Nando's":'nandos.co.uk','Stagecoach':'stagecoachbus.com','Arriva':'arrivabus.co.uk','BP':'bp.com','Shell':'shell.co.uk',
  'Amazon':'amazon.co.uk','Argos':'argos.co.uk','Matalan':'matalan.co.uk','Sports Direct':'sportsdirect.com',
  'B&M':'bmstores.co.uk','Home Bargains':'homebargains.co.uk','Screwfix':'screwfix.com','Boots':'boots.com',
  'Specsavers':'specsavers.co.uk','PureGym':'puregym.com','Odeon':'odeon.co.uk','Cineworld':'cineworld.co.uk',
  'Steam':'steampowered.com','Netflix':'netflix.com','Spotify':'spotify.com','Monzo':'monzo.com','Twinkl':'twinkl.co.uk',
  'The Works':'theworks.co.uk','Clarks':'clarks.co.uk',"St Aidan's School":'staidans.co.uk','British Gas':'britishgas.co.uk',
  'Northumbrian Water':'nwl.co.uk','Virgin Media':'virginmedia.com','EE':'ee.co.uk','Aviva':'aviva.co.uk',
  'Stockton Council':'stockton.gov.uk','Kingdom Services Group':'kingdom.co.uk','Vanguard':'vanguardinvestor.co.uk',
  'Pointens':'pointens.co.uk','OpenRent':'openrent.co.uk','Blue Skies Lets':'blueskieslets.co.uk',
  'Barclays':'barclays.co.uk','HSBC':'hsbc.co.uk','Lloyds':'lloydsbank.com','NatWest':'natwest.com',
  'Santander':'santander.co.uk','Nationwide':'nationwide.co.uk','Starling':'starlingbank.com','Chase':'chase.co.uk',
  'Monzo Flex':'monzo.com','Monzo Aura':'monzo.com','Monzo Loans':'monzo.com','Monzo Billsback':'monzo.com',
  'Saving Challenge':'monzo.com'
};

export const POTS0 = [
  { name:'Rainy Day',      goal:5000, bal:2410.55, type:'regular' },
  { name:'Rent buffer',    goal:1700, bal:1700,    type:'bills'   },
  { name:'Holiday',        goal:2500, bal:842.20,  type:'savings' },
  { name:'Home education', goal:1200, bal:310,     type:'savings' },
  { name:'Emergency',      goal:3000, bal:1000,    type:'savings' }
];

/* ---------- deterministic RNG ---------- */
let seed = 0x9e3779b9;
export function rnd(){
  seed |= 0; seed = seed + 0x6D2B79F5 | 0;
  let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
  t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
}
export const ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
export const pick = a => a[Math.floor(rnd() * a.length)];

/* ---------- local date helpers (data is self-contained) ---------- */
const p2 = n => String(n).padStart(2, '0');
const isoS = d => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const asDate = s => new Date(s + 'T12:00:00');
const monthLen = (y, m) => new Date(y, m + 1, 0).getDate();
const domS = (y, m, day) => `${y}-${p2(m + 1)}-${p2(Math.min(day, monthLen(y, m)))}`;

/* ---------- ISA ledger ---------- */
export function buildISA(now){
  const months = [];
  let d = new Date(1992, 9, 1);
  const end = new Date(now.getFullYear(), now.getMonth(), 1);
  while (d <= end){ months.push(new Date(d)); d = new Date(d.getFullYear(), d.getMonth() + 1, 1); }

  const contrib = y => y < 1999 ? 50 : y < 2005 ? 100 : y < 2010 ? 200 : y < 2015 ? 350 : y < 2020 ? 500 : 600;
  const simulate = r => {
    let v = 0; const rows = [];
    months.forEach(m => { const c = contrib(m.getFullYear()); const g = v * r; v = v + g + c; rows.push({ c, g }); });
    return { v, rows };
  };

  let lo = -0.008, hi = 0.02;
  for (let i = 0; i < 90; i++){ const mid = (lo + hi) / 2; if (simulate(mid).v < TARGET_ISA) lo = mid; else hi = mid; }
  const rows = simulate((lo + hi) / 2).rows;
  const total = rows.reduce((a, b) => a + b.c + b.g, 0);
  rows[rows.length - 1].g = Math.round((rows[rows.length - 1].g + (TARGET_ISA - total)) * 100) / 100;

  let v = 0;
  return rows.map((row, i) => {
    v = Math.round((v + row.g + row.c) * 100) / 100;
    const m = months[i], y = m.getFullYear(), mo = m.getMonth();
    const type = y < 1999 ? 'PEP' : i === 78 ? 'Transfer' : y === 1999 ? 'TESSA' : 'ISA';
    const quarterly = [2, 5, 8, 11].includes(mo);
    return {
      id: uid(), date: isoS(new Date(y, mo, 1)), type,
      contrib: row.c, growth: row.g, value: v,
      note: type === 'PEP' ? 'Personal Equity Plan contribution'
          : type === 'Transfer' ? 'PEP transferred to ISA wrapper'
          : type === 'TESSA' ? 'TESSA rollover'
          : quarterly ? 'Quarterly distribution (reinvested)'
          : 'ISA subscription'
    };
  }).reverse();
}

/* ---------- current account history ---------- */
export function buildAccount(now){
  const today = isoS(now);
  const tx = [];
  let bal = 1400;
  const add = (date, time, name, cat, amt, note) => {
    bal = Math.round((bal + amt) * 100) / 100;
    tx.push({ id: uid(), date, time, name, cat, amt, bal, note: note || '' });
  };

  const projects = [];
  for (let y = 2020; y <= now.getFullYear(); y++){
    const n = ri(3, 4);
    for (let k = 0; k < n; k++){
      const m = ri(0, 11), day = ri(4, 26), date = domS(y, m, day);
      if (asDate(date) > now) continue;
      const client = pick(['Halcyon Digital','Bede & Co','Northgate Studio','Teesside Tyres',
        'Cleveland Vets','Kirkby Web','Quayside Media']);
      projects.push({ date, amt: ri(2000, 8000), client });
      for (let r = 1; r <= 12; r++){
        const rd = new Date(y, m + r, day);
        projects.push({ date: isoS(rd), amt: ri(120, 350), client: client + ' retainer', retainer: true });
      }
    }
  }
  const byMonth = {};
  projects.forEach(p => {
    if (asDate(p.date) <= now){ const k = p.date.slice(0, 7); (byMonth[k] ||= []).push(p); }
  });

  const months = [];
  let d = new Date(2019, 0, 1);
  while (d <= now){ months.push(new Date(d.getFullYear(), d.getMonth(), 1)); d = new Date(d.getFullYear(), d.getMonth() + 1, 1); }

  months.forEach(m0 => {
    const y = m0.getFullYear(), m = m0.getMonth(), last = domS(y, m, 31);
    const day = (n, time, name, cat, amt, note) => {
      const date = domS(y, m, n);
      if (asDate(date) > now) return;
      add(date, time, name, cat, amt, note);
    };

    day(1, '07:12', 'Monzo', 'Subscriptions', -19, 'Max plan');
    if (y >= 2021) day(1, '08:40', 'Spotify', 'Subscriptions', -11.99, 'Premium Duo');
    if (y >= 2022) day(1, '09:05', 'Netflix', 'Subscriptions', -10.99, 'Standard');
    if (y >= 2023){
      day(2, '06:30', 'British Gas', 'Bills', -ri(74, 132), 'Energy');
      day(2, '06:31', 'Northumbrian Water', 'Bills', -38.20, 'Water');
      day(4, '07:00', 'Virgin Media', 'Bills', -32.00, 'Broadband');
      day(4, '07:02', 'EE', 'Bills', -22.00, 'Mobile');
      day(5, '07:15', 'Aviva', 'Bills', -24.40, 'Contents insurance');
    }
    if (y >= 2024) day(2, '06:35', 'Stockton Council', 'Bills', -148.00, 'Council tax');

    const first = domS(y, m, 1);
    if (first >= '2024-03-01' && first < '2025-03-01') day(1, '09:00', 'Pointens', 'Rent', -1300, 'Rent');
    else if (first >= '2025-03-01' && first < '2026-09-01') day(1, '09:00', 'OpenRent', 'Rent', -799, 'Rent');
    else if (first >= '2026-09-01') day(12, '09:00', 'Blue Skies Lets', 'Rent', -850, 'Rent');

    day(28, '06:00', 'Kingdom Services Group', 'Income', 2850, 'Net salary');

    [6, 13, 20, 27].forEach(dd => day(dd, '17:40',
      pick(['Tesco','Aldi','Asda','Morrisons','Lidl',"Sainsbury's",'Iceland']), 'Groceries', -ri(28, 96)));
    day(8, '19:20', pick(['The Masham','Hope & Union','Cena','Borge','The Twisted Peel',"Nando's","Domino's"]),
      'Eating out', -ri(16, 44));
    day(8, '13:05', 'Greggs', 'Eating out', -ri(4, 9));
    day(9, '08:15', pick(['Stagecoach','Arriva','BP','Shell']), 'Transport', -ri(9, 32));
    day(11, '12:30', pick(['Amazon','Argos','Matalan','Sports Direct','B&M','Home Bargains','Screwfix']),
      'Shopping', -ri(14, 74));
    day(14, '07:45', 'PureGym', 'Fitness', -24.99, 'Membership');
    day(16, '11:10', pick(['Boots','Specsavers']), 'Health', -ri(6, 34));
    day(19, '20:00', pick(['Odeon','Cineworld','Steam']), 'Entertainment', -ri(8, 26));

    if (last < '2026-07-01'){
      day(3, '09:00', "St Aidan's School", 'Education', -45, 'School costs');
      if (m === 7) day(20, '10:00', 'Clarks', 'Education', -ri(38, 62), 'School shoes');
    } else {
      day(7, '10:00', 'Twinkl', 'Education', -8.99, 'Home education resources');
      day(21, '11:30', 'The Works', 'Education', -ri(9, 22), 'Home education resources');
    }

    (byMonth[first.slice(0, 7)] || []).forEach(p =>
      add(p.date, '14:20', p.client, 'Income', p.amt, p.retainer ? 'Maintenance retainer' : 'Website build'));

    if (last <= today && bal > 2100) add(last, '20:00', 'Rainy Day', 'Transfers', -(Math.round((bal - 2000) * 100) / 100), 'Monthly sweep');
  });

  return tx.reverse();
}

export function buildSeed(now){
  return { tx: buildAccount(now), isa: buildISA(now) };
}

/* ---------- ids ---------- */
export function uid(){
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
