if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js?v=11', { scope: '/' })
      .then((reg) => {
        console.log('Service Worker registered successfully on scope:', reg.scope);
        // Force an immediate check for SW updates on every page visit
        reg.update();
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
      
    // Auto-reload the page when a new service worker takes over (forces update for returning users stuck on old cache)
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  });
}
