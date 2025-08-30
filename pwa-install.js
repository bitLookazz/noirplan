(function(){
  let deferredPrompt = null;

  function ensureButton(){
    // Home is rendered dynamically; wait for .home-actions
    const actions = document.querySelector('.home-actions');
    if (!actions) return;

    let btn = document.getElementById('pwaInstallBtn');
    if (!btn) {
      btn = document.createElement('button');
      btn.className = 'home-btn';
      btn.id = 'pwaInstallBtn';
      btn.textContent = '⬇️ Install';
      // ALWAYS visible
      actions.appendChild(btn);
    }
  }

  // Observe DOM for SPA route changes so we can insert the button when Home renders
  const obs = new MutationObserver(() => ensureButton());
  document.addEventListener('DOMContentLoaded', () => {
    ensureButton();
    try { obs.observe(document.body, { subtree:true, childList:true }); } catch(_) {}
  });

  // Capture install prompt if/when available
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Button already visible; nothing else to do
  });

  // Click handler (works with or without the prompt)
  document.addEventListener('click', async (e) => {
    const btn = e.target && e.target.id === 'pwaInstallBtn' ? e.target : null;
    if (!btn) return;

    if (deferredPrompt) {
      try {
        btn.disabled = true;
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch(_) {}
      deferredPrompt = null;
      btn.disabled = false;
    } else {
      // Fallback instructions
      const ua = navigator.userAgent || '';
      if (/Android/i.test(ua)) {
        alert('To install: open the menu (⋮) → "Install app" or "Add to Home screen".');
      } else if (/iPhone|iPad|iPod/i.test(ua)) {
        alert('To install: Share button → "Add to Home Screen".');
      } else {
        alert('On desktop Chrome: address bar install icon (monitor with down-arrow) or menu → Install.');
      }
    }
  });
})();
