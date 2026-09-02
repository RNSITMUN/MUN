// Scroll Morph & Dropdown Navigation Handler
import './anti-scrape.js';

(function () {
  function prefetchUrl(href) {
    if (!href || href === window.location.pathname || href.startsWith("#") || href.startsWith("http")) return;
    const linkId = `prefetch-${href.replace(/[^a-zA-Z0-9]/g, "")}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement("link");
      link.id = linkId;
      link.rel = "prefetch";
      link.href = href;
      document.head.appendChild(link);
    }
  }

  function initAnimatedNav() {
    const navPill = document.querySelector(".nav-pill");
    if (!navPill) return;

    // Build DOM structure without wiping existing items
    if (!navPill.querySelector(".nav-items-wrap")) {
      const items = Array.from(navPill.querySelectorAll(".nav-item"));

      // 1. Horizontal links wrapper
      const wrap = document.createElement("div");
      wrap.className = "nav-items-wrap";
      items.forEach((it) => {
        it.addEventListener("mouseenter", () => {
          prefetchUrl(it.getAttribute("href"));
        }, { passive: true });
        wrap.appendChild(it);
      });

      // 2. Collapsed Hamburger / Close button
      const collapsedIcon = document.createElement("button");
      collapsedIcon.type = "button";
      collapsedIcon.className = "nav-collapsed-icon";
      collapsedIcon.setAttribute("aria-label", "Toggle navigation");
      collapsedIcon.innerHTML = `
        <svg class="nav-icon-hamburger" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="7" x2="20" y2="7"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
          <line x1="4" y1="17" x2="20" y2="17"/>
        </svg>
        <svg class="nav-icon-close" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      `;

      // 3. Dropdown Menu for scrolled state
      const dropdown = document.createElement("div");
      dropdown.className = "nav-dropdown";
      items.forEach((it) => {
        const clone = it.cloneNode(true);
        clone.className = "nav-dropdown-item" + (it.classList.contains("active") ? " active" : "");
        clone.addEventListener("mouseenter", () => {
          prefetchUrl(clone.getAttribute("href"));
        }, { passive: true });
        clone.addEventListener("click", () => {
          navPill.classList.remove("is-open");
        });
        dropdown.appendChild(clone);
      });

      navPill.appendChild(wrap);
      navPill.appendChild(collapsedIcon);
      navPill.appendChild(dropdown);
    }

    const collapsedBtn = navPill.querySelector(".nav-collapsed-icon");
    let isScrolled = false;
    const SCROLL_THRESHOLD = 100;

    // Toggle dropdown when clicking collapsed hamburger button
    if (collapsedBtn) {
      collapsedBtn.addEventListener("click", (e) => {
        if (navPill.classList.contains("nav-scrolled")) {
          e.stopPropagation();
          navPill.classList.toggle("is-open");
        }
      });
    }

    // Close dropdown on outside click
    document.addEventListener("click", (e) => {
      if (!navPill.contains(e.target)) {
        navPill.classList.remove("is-open");
      }
    });

    // Close on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        navPill.classList.remove("is-open");
      }
    });

    function handleScroll() {
      if (window.innerWidth <= 768) return;
      const scrollY = window.scrollY || window.pageYOffset;

      if (scrollY > SCROLL_THRESHOLD && !isScrolled) {
        isScrolled = true;
        navPill.classList.add("nav-scrolled");
      } else if (scrollY <= SCROLL_THRESHOLD && isScrolled) {
        isScrolled = false;
        navPill.classList.remove("nav-scrolled", "is-open");
      }
    }

    let ticking = false;
    function onScroll() {
      if (!ticking) {
        requestAnimationFrame(() => {
          handleScroll();
          ticking = false;
        });
        ticking = true;
      }
    }

    // Enable smooth transitions only after initial load to prevent glitching on page navigation
    requestAnimationFrame(() => {
      handleScroll();
      requestAnimationFrame(() => {
        navPill.classList.add("is-animated");
      });
    });

    window.addEventListener("scroll", onScroll, { passive: true });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAnimatedNav);
  } else {
    initAnimatedNav();
  }
})();
