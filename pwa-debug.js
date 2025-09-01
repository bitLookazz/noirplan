(function(){
  const bar = document.createElement('div');
  bar.style.cssText='position:fixed;left:8px;right:8px;bottom:8px;padding:8px 10px;border:1px solid rgba(255,255,255,.15);border-radius:12px;background:#12121a;color:#eaeaf0;font-size:12px;z-index:9999';
  bar.textContent='PWA: waiting… (no beforeinstallprompt yet)';
  document.addEventListener('DOMContentLoaded', ()=>document.body.appendChild(bar));

  let fired = false;
  window.addEventListener('beforeinstallprompt', (e)=>{
    fired = true;
    bar.textContent = 'PWA: ready — native install prompt is available. Use menu ⋮ → Install or tap your Install button.';
  }, {once:true});

  const dm = window.matchMedia('(display-mode: standalone)').matches ? 'standalone' : 'browser';
  bar.append('  •  display-mode: '+dm);

  window.addEventListener('appinstalled', ()=>{ bar.textContent='PWA: installed ✅'; });
})();
