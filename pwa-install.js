document.addEventListener('DOMContentLoaded', ()=>{
  const actions = document.querySelector('.home-actions');
  if (actions && !document.getElementById('pwaInstallBtn')) {
    const btn = document.createElement('button');
    btn.className = 'home-btn';
    btn.id = 'pwaInstallBtn';
    btn.textContent = '⬇️ Install';
    btn.style.display = 'none';         // only show when installable
    actions.appendChild(btn);
  }
});

let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.style.display = 'inline-flex';
});

window.addEventListener('appinstalled', () => {
  const btn = document.getElementById('pwaInstallBtn');
  if (btn) btn.style.display = 'none';
});

// Click handler (with fallback)
document.addEventListener('click', async (e) => {
  if (e.target && e.target.id === 'pwaInstallBtn') {
    const btn = e.target;
    if (deferredPrompt) {
      btn.disabled = true;
      try {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch (_) {}
      deferredPrompt = null;
      btn.style.display = 'none';
      btn.disabled = false;
    } else {
      alert('To install: open the menu (⋮) → "Install app" or "Add to Home screen".');
    }
  }
});

// Note: If already installed (standalone), Chrome won’t fire beforeinstallprompt.
