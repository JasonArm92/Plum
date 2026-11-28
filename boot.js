const BUILD = 45;
const shown = { v: false };

function panel(msg) {
  if (shown.v) return;
  shown.v = true;
  const host = document.getElementById('view') || document.body;
  host.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'center';
  const inner = document.createElement('div');

  const logo = document.createElement('div');
  logo.className = 'logo';
  logo.textContent = '!';
  inner.appendChild(logo);

  const t = document.createElement('div');
  t.className = 'row__t';
  t.textContent = 'The app did not start';
  inner.appendChild(t);

  const h = document.createElement('p');
  h.className = 'hint';
  h.textContent = 'Build ' + BUILD + ' could not load. The detail below names the cause.';
  inner.appendChild(h);

  const pre = document.createElement('pre');
  pre.className = 'errbox';
  pre.textContent = String((msg && (msg.stack || msg.message)) || msg);
  inner.appendChild(pre);

  const reload = document.createElement('button');
  reload.className = 'btn btn--primary';
  reload.style.marginTop = '16px';
  reload.textContent = 'Reload';
  reload.onclick = () => location.reload();
  inner.appendChild(reload);

  const hard = document.createElement('button');
  hard.className = 'btn btn--ghost';
  hard.style.marginTop = '8px';
  hard.textContent = 'Clear cache and reload';
  hard.onclick = async () => {
    try {
      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map(k => caches.delete(k)));
      }
      if ('serviceWorker' in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        await Promise.all(regs.map(r => r.unregister()));
      }
    } catch {}
    location.reload();
  };
  inner.appendChild(hard);

  wrap.appendChild(inner);
  host.appendChild(wrap);
}

window.addEventListener('error', e => panel(e.error || e.message));
window.addEventListener('unhandledrejection', e => panel(e.reason));

import('./main.js?v=' + BUILD).catch(err => panel(err));
