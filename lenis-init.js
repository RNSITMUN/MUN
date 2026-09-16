/**
 * Lenis Smooth Scroll Initialization
 * Provides a buttery smooth momentum scroll to enhance micro-parallax effects.
 */
(function () {
  if (typeof window === 'undefined') return;

  function initLenis() {
    // Ensure Lenis script is loaded
    if (typeof Lenis === 'undefined') {
      setTimeout(initLenis, 50);
      return;
    }

    // Check for user reduced-motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // standard ease-out expo
      direction: 'vertical',
      gestureDirection: 'vertical',
      smooth: true,
      mouseMultiplier: 1,
      smoothTouch: true, // Enabled for mobile and tablets
      touchMultiplier: 2,
      infinite: false,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);

    // Export to window so modals can call window.lenis.stop() / window.lenis.start() if needed
    window.lenis = lenis;

    // FIX: Google Translate alters text nodes which increases the page height significantly.
    // Lenis sometimes fails to detect these deep mutations natively, capping the scroll height prematurely.
    // We use a debounced MutationObserver & ResizeObserver to force Lenis to recalculate the document bounds.
    let resizeTimeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => lenis.resize(), 150);
    };

    const ro = new ResizeObserver(debouncedResize);
    ro.observe(document.body);

    const mo = new MutationObserver(debouncedResize);
    mo.observe(document.body, { childList: true, subtree: true, characterData: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initLenis);
  } else {
    initLenis();
  }
})();
