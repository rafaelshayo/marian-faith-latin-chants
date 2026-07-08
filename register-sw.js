// Registers the service worker so the app works offline. Loaded on every main page.
if('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('sw.js').catch(function(e) {
      console.log('Service worker registration failed:', e);
    });
  });
}
