// Physics-based Morphing Scroll Navigation (inspired by @larsen66 / 21st.dev)
(function () {
  function initAnimatedNav() {
    const navPill = document.querySelector(".nav-pill");
    if (!navPill) return;

    // Build DOM structure if not already built
    if (!navPill.querySelector(".nav-items-wrap")) {
      const items = Array.from(navPill.querySelectorAll(".nav-item"));

      // Wrapper for nav links
      const wrap = document.createElement("div");
      wrap.className = "nav-items-wrap";
      items.forEach((it) => wrap.appendChild(it));

      // Collapsed center hamburger icon
      const collapsedIcon = document.createElement("div");
      collapsedIcon.className = "nav-collapsed-icon";
      collapsedIcon.setAttribute("aria-label", "Expand navigation");
      collapsedIcon.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="4" y1="7" x2="20" y2="7"/>
          <line x1="4" y1="12" x2="20" y2="12"/>
          <line x1="4" y1="17" x2="20" y2="17"/>
        </svg>
      `;

      navPill.innerHTML = "";
      navPill.appendChild(wrap);
      navPill.appendChild(collapsedIcon);
    }

    let isExpanded = true;
    let lastScrollY = window.scrollY;
    let scrollPositionOnCollapse = 0;
    const EXPAND_SCROLL_THRESHOLD = 80;
    let naturalWidth = 0;

    function measureExpandedWidth() {
      if (window.innerWidth <= 768) return;
      // Temporarily remove collapsed class to measure full content width
      const wasCollapsed = navPill.classList.contains("is-collapsed");
      if (wasCollapsed) navPill.classList.remove("is-collapsed");

      navPill.style.width = "auto";
      naturalWidth = navPill.offsetWidth;

      if (wasCollapsed) {
        navPill.classList.add("is-collapsed");
        navPill.style.width = "48px";
      } else {
        navPill.style.width = `${naturalWidth}px`;
      }
    }

    // Measure on load and resize
    setTimeout(measureExpandedWidth, 50);
    window.addEventListener("resize", () => {
      measureExpandedWidth();
    });

    function setExpanded(expanded) {
      if (window.innerWidth <= 768) return; // Desktop PC only
      if (isExpanded === expanded) return;
      isExpanded = expanded;

      if (isExpanded) {
        if (!naturalWidth) measureExpandedWidth();
        navPill.classList.remove("is-collapsed");
        navPill.style.width = `${naturalWidth}px`;
      } else {
        navPill.classList.add("is-collapsed");
        navPill.style.width = "48px";
      }
    }

    // Expand on click when collapsed
    navPill.addEventListener("click", (e) => {
      if (!isExpanded) {
        e.preventDefault();
        e.stopPropagation();
        setExpanded(true);
      }
    });

    // Scroll listener with threshold detection matching Framer Motion motionValue event
    window.addEventListener(
      "scroll",
      () => {
        if (window.innerWidth <= 768) return;
        const latest = window.scrollY;
        const previous = lastScrollY;

        if (isExpanded && latest > previous && latest > 150) {
          setExpanded(false);
          scrollPositionOnCollapse = latest;
        } else if (
          !isExpanded &&
          latest < previous &&
          scrollPositionOnCollapse - latest > EXPAND_SCROLL_THRESHOLD
        ) {
          setExpanded(true);
        }

        lastScrollY = latest;
      },
      { passive: true }
    );
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initAnimatedNav);
  } else {
    initAnimatedNav();
  }
})();
