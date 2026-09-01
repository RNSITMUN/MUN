// Liquid Morph Floating Menu for Mobile (< 768px)
(function () {
  const menuItems = [
    { label: "Home", href: "/" },
    { label: "Registration", href: "/registration" },
    { label: "Venue", href: "/venue" },
    { label: "Contact", href: "/stay-connected" },
    { label: "Team", href: "/team" },
    { label: "Equity Policy", href: "/code-of-conduct" },
  ];

  function initFloatingMenu() {
    // Prevent duplicate mounts
    if (document.getElementById("floatingMenuRoot")) return;

    let currentPath = window.location.pathname.replace(/\/$/, "").replace(/\.html$/, "") || "/";
    if (currentPath === "/coc" || currentPath === "/equity-policy") currentPath = "/code-of-conduct";
    if (currentPath === "/contact") currentPath = "/stay-connected";
    if (currentPath === "/teams") currentPath = "/team";

    // Create Root Element
    const root = document.createElement("div");
    root.id = "floatingMenuRoot";
    root.className = "mobile-floating-menu-root";
    root.innerHTML = `
      <div class="floating-menu-container" id="floatingMenuContainer">
        <!-- Yellow background layer -->
        <div class="floating-menu-bg"></div>

        <!-- Dark liquid circle expanding from bottom -->
        <div class="floating-menu-dark-circle"></div>

        <!-- Menu links list -->
        <nav class="floating-menu-links" aria-label="Mobile Navigation">
          ${menuItems
            .map((item, idx) => {
              const isActive =
                currentPath === item.href ||
                (item.href !== "/" && currentPath.startsWith(item.href));

              return `
                <a href="${item.href}" class="floating-menu-item ${isActive ? "is-active" : ""}" style="transition-delay: ${0.12 + idx * 0.04}s" data-index="${idx}">
                  <span>${item.label}</span>
                </a>
              `;
            })
            .join("")}
        </nav>

        <!-- Bottom toggle bar -->
        <div class="floating-menu-bottom-bar" id="floatingMenuToggle" role="button" aria-label="Toggle mobile menu" tabindex="0">
          <span class="floating-menu-label">Menu</span>
          <div class="floating-hamburger-icon">
            <span class="hamburger-bar bar-1"></span>
            <span class="hamburger-bar bar-2"></span>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);

  const container = document.getElementById("floatingMenuContainer");
  const toggle = document.getElementById("floatingMenuToggle");
  let isOpen = false;
  let isClosingFromPop = false;

  function toggleMenu(open) {
    const nextState = typeof open === "boolean" ? open : !isOpen;
    if (nextState === isOpen) return;
    isOpen = nextState;
    if (isOpen) {
      container.classList.add("is-open");
      try {
        window.history.pushState({ munFloatingMenu: true }, "", window.location.href);
      } catch (err) {}
    } else {
      container.classList.remove("is-open");
      if (!isClosingFromPop && window.history.state && window.history.state.munFloatingMenu) {
        window.history.back();
      }
    }
  }

  // Intercept back button to close floating menu if open
  window.addEventListener("popstate", (e) => {
    if (isOpen) {
      isClosingFromPop = true;
      toggleMenu(false);
      setTimeout(() => { isClosingFromPop = false; }, 100);
    }
  });

  // Bottom bar toggle
  toggle.addEventListener("click", (e) => {
    e.stopPropagation();
    toggleMenu();
  });

  // Tap anywhere on collapsed pill opens it
  container.addEventListener("click", (e) => {
    if (!isOpen) {
      e.stopPropagation();
      toggleMenu(true);
    }
  });

  // Close when clicking outside
  document.addEventListener("click", (e) => {
    if (isOpen && !container.contains(e.target)) {
      toggleMenu(false);
    }
  });

  // Close on Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && isOpen) {
      toggleMenu(false);
    }
  });

  // Handle menu item clicks: On mobile, replace location to avoid multi-page back loops
  const items = container.querySelectorAll(".floating-menu-item");
  items.forEach((item) => {
    item.addEventListener("click", (e) => {
      const href = item.getAttribute("href");
      if (href && href !== window.location.pathname) {
        if (window.innerWidth <= 768) {
          e.preventDefault();
          window.location.replace(href);
          return;
        }
      }
      setTimeout(() => toggleMenu(false), 120);
    });
  });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initFloatingMenu);
  } else {
    initFloatingMenu();
  }
})();
