// Liquid Morph Floating Menu for Mobile (< 768px)
(function () {
  const menuItems = [
    { label: "Home", href: "/" },
    { label: "Registration", href: "/registration" },
    { label: "Contact", href: "/stay-connected" },
    { label: "Team", href: "/team" },
  ];

  // Prevent duplicate mounts
  if (document.getElementById("floatingMenuRoot")) return;

  const currentPath = window.location.pathname.replace(/\/$/, "") || "/";

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

  function toggleMenu(open) {
    isOpen = typeof open === "boolean" ? open : !isOpen;
    if (isOpen) {
      container.classList.add("is-open");
    } else {
      container.classList.remove("is-open");
    }
  }

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

  // Close menu upon item click
  const items = container.querySelectorAll(".floating-menu-item");
  items.forEach((item) => {
    item.addEventListener("click", () => {
      setTimeout(() => toggleMenu(false), 120);
    });
  });
})();
