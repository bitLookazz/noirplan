(function(){
  // Register SW and force an update check on load; no caching logic here.
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/noirplan/sw.js', {
          scope: '/noirplan/',
          updateViaCache: 'none'
        });
        // Always check for a newer SW
        reg.update().catch(()=>{});
        // If a new worker is waiting, activate it right away
        if (reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        // Reload once when controller changes so new files show up immediately
        let reloaded = false;
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (!reloaded) { reloaded = true; location.reload(); }
        });
      } catch (e) { /* ignore */ }
    });
  }
})();
