/**
 * RNSIT MUN - Anti-Scraper & Bot Shield
 * Protects site content, contact rosters, and assets from automated scraping & AI harvesters.
 */
(function () {
  'use strict';

  // 1. Headless Browser & Automated Scraper Detection
  function isAutomatedScraper() {
    try {
      if (navigator.webdriver) return true;
      if (window.callPhantom || window._phantom || window.__nightmare || window.domAutomation) return true;
      if (window.navigator.userAgent && /headlesschrome|phantomjs|selenium|puppeteer|playwright|bot|crawl|spider/i.test(window.navigator.userAgent)) {
        // Exclude legitimate search engine / social preview bots that don't execute full JS
        const isLegit = /googlebot|bingbot|whatsapp|telegrambot|twitterbot|facebookexternalhit/i.test(window.navigator.userAgent);
        if (!isLegit) return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  }

  if (isAutomatedScraper()) {
    // If an automated scraping framework is detected running scripts, throttle content extraction
    try {
      const style = document.createElement('style');
      style.textContent = '.roster-sensitive, [data-sensitive] { display: none !important; }';
      document.head.appendChild(style);
    } catch (e) {}
  }

  // 2. Email & Phone Harvest Obfuscation Shield
  function protectContactData() {
    const protectedElements = document.querySelectorAll('[data-shield-email], [data-shield-phone]');
    protectedElements.forEach((el) => {
      const email = el.getAttribute('data-shield-email');
      const phone = el.getAttribute('data-shield-phone');
      if (email && !el.getAttribute('href')) {
        el.setAttribute('href', `mailto:${atob(email)}`);
      }
      if (phone && !el.getAttribute('href')) {
        el.setAttribute('href', `tel:${atob(phone)}`);
      }
    });
  }

  // 3. Inject Anti-AI Crawler Meta Tag dynamically
  function injectRobotsDefense() {
    let robotsMeta = document.querySelector('meta[name="robots"]');
    if (!robotsMeta) {
      robotsMeta = document.createElement('meta');
      robotsMeta.name = 'robots';
      robotsMeta.content = 'noai, noimageai, max-snippet:-1, max-image-preview:large, max-video-preview:-1';
      document.head.appendChild(robotsMeta);
    } else if (!robotsMeta.content.includes('noai')) {
      robotsMeta.content += ', noai, noimageai';
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      injectRobotsDefense();
      protectContactData();
    });
  } else {
    injectRobotsDefense();
    protectContactData();
  }
})();
