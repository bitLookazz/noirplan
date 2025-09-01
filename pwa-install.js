(function(){
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt',(e)=>{ e.preventDefault(); deferredPrompt = e; });
  document.addEventListener('click',(e)=>{
    if (!e.target.closest('#pwaInstallBtn')) return;
    if (deferredPrompt){
      deferredPrompt.prompt();
      deferredPrompt.userChoice.finally(()=>{ deferredPrompt=null; });
    } else {
      alert('If no native prompt: Chrome menu (⋮) → "Install app" / "Add to Home screen".');
    }
  });
})();
