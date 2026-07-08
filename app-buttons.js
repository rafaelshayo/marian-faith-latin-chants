// Powers the "Weka app hii kwenye simu yako" (install) and "Share app hii" (share) buttons.
(function() {
  var deferredPrompt = null;   // saved install prompt (Android/desktop Chrome & Edge)
  var installBtn = null;

  // Capture the install prompt as early as possible (it can fire before the DOM is ready).
  window.addEventListener('beforeinstallprompt', function(e) {
    e.preventDefault();
    deferredPrompt = e;
    if(installBtn) installBtn.style.display = '';
  });
  window.addEventListener('appinstalled', function() {
    deferredPrompt = null;
    if(installBtn) installBtn.style.display = 'none';
  });

  function flash(btn, msg) {
    var orig = btn.innerHTML;
    btn.innerHTML = msg;
    setTimeout(function() { btn.innerHTML = orig; }, 1800);
  }

  document.addEventListener('DOMContentLoaded', function() {
    installBtn = document.getElementById('btnInstallApp');
    var shareBtn = document.getElementById('btnShareApp');
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    // ---- Install ----
    if(installBtn) {
      // Already installed and running as an app: no need for the button.
      // Otherwise show it if the browser offered a prompt, or on iPhone/iPad (manual add).
      if(!isStandalone && (isIOS || deferredPrompt)) installBtn.style.display = '';

      installBtn.addEventListener('click', function() {
        if(deferredPrompt) {
          deferredPrompt.prompt();
          deferredPrompt.userChoice.then(function() {
            deferredPrompt = null;
            installBtn.style.display = 'none';
          });
        } else if(isIOS) {
          alert("Kufunga app kwenye iPhone: bonyeza kitufe cha Share (mstatili wenye mshale kwenda juu) chini ya skrini, kisha chagua “Add to Home Screen”.\n\nOn iPhone: tap the Share button at the bottom, then choose “Add to Home Screen”.");
        } else {
          alert("Ili kuweka app: fungua menyu ya kivinjari (⋮ au ⋯) kisha chagua “Install app” au “Add to Home screen”.\n\nOpen your browser menu (⋮) and choose “Install app” or “Add to Home screen”.");
        }
      });
    }

    // ---- Share ----
    if(shareBtn) {
      shareBtn.addEventListener('click', function() {
        var url = location.origin + '/';
        var data = {
          title: 'Marian Faith Chant Tools',
          text: 'Ratiba za Misa na nyimbo za Kigregori kwa Kiswahili — Kwaya ya Mtakatifu Cecilia',
          url: url
        };
        if(navigator.share) {
          navigator.share(data).catch(function() {});
        } else if(navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(
            function() { flash(shareBtn, "<span class='glyphicon glyphicon-ok'></span> Kiungo kimenakiliwa / Link copied"); },
            function() { window.prompt("Copy this link:", url); }
          );
        } else {
          window.prompt("Copy this link:", url);
        }
      });
    }
  });
})();
