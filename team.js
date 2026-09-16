const profileRow = document.getElementById("profile-row");
const roleDisplay = document.getElementById("role-display");
const giantTextContainer = document.getElementById("giant-text-container");
const profileContainers = document.querySelectorAll(".profile-img-container");
const teamDots = document.querySelectorAll(".team-dot");

// Manage active names and transitions
let currentActiveIndex = null;
let pendingEntryTimeout = null;

function removeWrapper(w) {
  if (!w) return;
  if (w._removeTimer) {
    clearTimeout(w._removeTimer);
    w._removeTimer = null;
  }
  if (w._ro) {
    w._ro.disconnect();
    w._ro = null;
  }
  if (w.parentNode) {
    w.remove();
  }
}

function setGiantName(name, isActiveMember) {
  // Cancel any pending delayed entry from a prior call
  if (pendingEntryTimeout) {
    clearTimeout(pendingEntryTimeout);
    pendingEntryTimeout = null;
  }

  // Find all current wrappers
  const wrappers = Array.from(giantTextContainer.querySelectorAll(".name-wrapper"));

  // If the latest wrapper is already displaying the same name, do nothing
  if (wrappers.length > 0) {
    const latest = wrappers[wrappers.length - 1];
    if (latest.dataset.name === name && !latest.classList.contains("slide-out")) {
      return;
    }
  }

  // Process existing wrappers. We never remove a slide-out wrapper mid-animation —
  // doing so would cause an abrupt visual jump. Instead we let it finish and wait for it.
  let hasActiveSlideOut = false;
  wrappers.forEach((w, i) => {
    if (i < wrappers.length - 1) {
      // Superseded by a later wrapper — safe to kill immediately (already invisible)
      removeWrapper(w);
    } else if (w.classList.contains("slide-out")) {
      // Already mid-exit animation — do NOT remove it now; let it finish naturally.
      // Re-arm its removal timer so it is cleaned up after the animation completes.
      hasActiveSlideOut = true;
      if (w._removeTimer) clearTimeout(w._removeTimer);
      w._removeTimer = setTimeout(() => { removeWrapper(w); }, 600);
    } else {
      // Visible slide-in wrapper — begin its exit, then wait before showing next name.
      hasActiveSlideOut = true;
      w.classList.remove("slide-in");
      w.classList.add("slide-out");
      if (w._removeTimer) clearTimeout(w._removeTimer);
      // 600ms safely outlasts the 0.28s exit transition + max stagger (~0.14s)
      w._removeTimer = setTimeout(() => { removeWrapper(w); }, 600);
      
      const bgName = document.getElementById("bg-name");
      if (bgName) bgName.classList.add("fade-out");
    }
  });

  // Function to create and slide in the new name
  const createNew = () => {
    pendingEntryTimeout = null;

    const newWrapper = document.createElement("div");
    newWrapper.className = "name-wrapper";
    newWrapper.dataset.name = name;

    const h1 = document.createElement("h1");
    h1.className = `giant-name ${isActiveMember ? "active-member" : "default"}`;

    const chars = Array.from(name);
    let html = "";
    chars.forEach((char, index) => {
      // Stagger: centre-outward, original timing preserved
      const delay = 0.035 * Math.abs(index - Math.floor(chars.length / 2));
      const letterClass = char === " " ? "letter space" : "letter";
      const letterVal = char === " " ? "&nbsp;" : char;
      html += `<span class="${letterClass}" style="transition-delay: ${delay}s">${letterVal}</span>`;
    });

    h1.innerHTML = html;
    newWrapper.appendChild(h1);
    giantTextContainer.appendChild(newWrapper);

    // Fit overlong text dynamically (ResizeObserver handles Google Translate mutations too).
    // scaleY is now applied via CSS on .name-wrapper, not here, so we only scale X if needed.
    const ro = new ResizeObserver(() => {
      const maxWidth = window.innerWidth * 0.92;
      const currentWidth = h1.scrollWidth;
      if (currentWidth > maxWidth && currentWidth > 0) {
        h1.style.transform = `scaleX(${maxWidth / currentWidth})`;
      } else {
        h1.style.transform = '';
      }
    });
    ro.observe(h1);
    newWrapper._ro = ro;

    // Force reflow then trigger slide-in
    newWrapper.offsetHeight;
    newWrapper.classList.add("slide-in");

    // Update background text
    const bgName = document.getElementById("bg-name");
    if (bgName) {
      bgName.textContent = name;
      if (isActiveMember) {
        bgName.classList.add("is-active-member");
      } else {
        bgName.classList.remove("is-active-member");
      }
      bgName.classList.remove("fade-out");
    }
  };

  if (hasActiveSlideOut) {
    // 500ms: original value; safely longer than the 0.28s exit + max stagger (~0.14s)
    pendingEntryTimeout = setTimeout(createNew, 500);
  } else {
    createNew();
  }
}

// Initialize default name
setGiantName("RNSMUN", false);

// Set helper label text
roleDisplay.textContent = "TAP A MEMBER TO VIEW ROLE";

// Helper: check if we are on a mobile viewport or a touch screen
const isTouchOrMobile = () => {
  return window.innerWidth < 768 || window.matchMedia("(pointer: coarse)").matches;
};

// Function to update the magnetic ripple sizes and positions
function updateMagneticRipple(activeIndex) {
  const isMobile = window.innerWidth < 768;
  const isPhone = window.innerWidth < 480;
  const isSmallPhone = window.innerWidth <= 360;
  
  if (activeIndex === null) {
    profileContainers.forEach(container => {
      container.style.removeProperty("--profile-scale");
      container.style.removeProperty("--profile-tx");
      container.style.removeProperty("opacity");
    });
    return;
  }

  // On Mobile: Maintain clean 2-row layout without horizontal row-shifting
  if (isMobile) {
    profileContainers.forEach((container, i) => {
      container.style.removeProperty("--profile-tx");
      if (i === activeIndex) {
        container.style.setProperty("--profile-scale", "1.12");
        container.style.setProperty("opacity", "1");
      } else {
        container.style.setProperty("--profile-scale", "0.94");
        container.style.setProperty("opacity", "0.76");
      }
    });
    return;
  }
  
  const baseSize = 125;
  
  // 1. Calculate the scale for each profile container
  const scales = [];
  profileContainers.forEach((container, i) => {
    const distance = Math.abs(i - activeIndex);
    if (distance === 0) {
      const activeSize = 175;
      scales.push(activeSize / baseSize);
    } else {
      const size = 125 - (distance * 6);
      scales.push(size / 125);
    }
  });

  // 2. Compute translation offsets recursively to guarantee 100% equal visual spacing
  const txs = new Array(profileContainers.length).fill(0);
  const buffer = 28; // Extra spacing buffer around focused image
  
  // Right side of active card
  for (let k = activeIndex + 1; k < profileContainers.length; k++) {
    const extra = (k === activeIndex + 1) ? buffer : 0;
    txs[k] = txs[k - 1] + baseSize * (scales[k - 1] + scales[k] - 2) / 2 + extra;
  }
  
  // Left side of active card
  for (let k = activeIndex - 1; k >= 0; k--) {
    const extra = (k === activeIndex - 1) ? buffer : 0;
    txs[k] = txs[k + 1] - baseSize * (scales[k] + scales[k + 1] - 2) / 2 - extra;
  }

  // 3. Center the entire active row within viewport bounds by applying a global alignment shift
  const globalShift = (txs[0] + txs[profileContainers.length - 1]) / 2;

  // 4. Apply the styles
  profileContainers.forEach((container, i) => {
    container.style.setProperty("--profile-scale", String(scales[i]));
    const finalTx = txs[i] - globalShift;
    const unit = isMobile ? "vw" : "px";
    container.style.setProperty("--profile-tx", `${finalTx}${unit}`);
    container.style.setProperty("opacity", "1");
  });
}

// Function to activate a team member profile
function activateMember(container, index, firstName, fullName, role) {
  currentActiveIndex = index;
  
  // Add active class to selected container
  profileContainers.forEach(c => c.classList.remove("active"));
  container.classList.add("active");

  // Update dots indicator
  teamDots.forEach((dot, i) => {
    dot.classList.toggle("active", i === index);
  });

  // Apply fluid magnetic ripple sizes and translates
  updateMagneticRipple(index);

  // Update displays
  roleDisplay.textContent = `${role} • ${fullName}`;
  roleDisplay.classList.add("is-active-member");
  roleDisplay.style.opacity = "1";
  setGiantName(firstName, true);
}

// Function to deactivate and revert to RNSMUN default
function deactivateAll() {
  currentActiveIndex = null;
  profileContainers.forEach(c => c.classList.remove("active"));
  
  // Clear dots indicator
  teamDots.forEach(dot => dot.classList.remove("active"));

  // Revert all profile translations and sizes back to original layout
  updateMagneticRipple(null);

  roleDisplay.textContent = "TAP A MEMBER TO VIEW ROLE";
  roleDisplay.classList.remove("is-active-member");
  setGiantName("RNSMUN", false);
}

// Function to activate member by index with automatic loop-around
function activateMemberByIndex(targetIndex) {
  if (profileContainers.length === 0) return;
  if (targetIndex < 0) targetIndex = profileContainers.length - 1;
  if (targetIndex >= profileContainers.length) targetIndex = 0;

  const container = profileContainers[targetIndex];
  if (!container) return;

  const firstName = container.getAttribute("data-first-name");
  const fullName = container.getAttribute("data-full-name");
  const role = container.getAttribute("data-role");
  activateMember(container, targetIndex, firstName, fullName, role);
}

// Attach listeners to profile images
profileContainers.forEach((container) => {
  const index = parseInt(container.getAttribute("data-index"));
  const firstName = container.getAttribute("data-first-name");
  const fullName = container.getAttribute("data-full-name");
  const role = container.getAttribute("data-role");

  // Pointer Enter (Desktop Hover only)
  container.addEventListener("pointerenter", () => {
    if (isTouchOrMobile()) return;
    activateMember(container, index, firstName, fullName, role);
  });

  // Pointer Leave (Desktop Hover only)
  container.addEventListener("pointerleave", () => {
    if (isTouchOrMobile()) return;
    setTimeout(() => {
      if (currentActiveIndex === index) {
        deactivateAll();
      }
    }, 50);
  });

  // Click / Tap (Mobile Touch support & click toggle)
  container.addEventListener("click", (e) => {
    e.stopPropagation(); // Avoid triggering document click revert
    if (currentActiveIndex === index) {
      deactivateAll();
    } else {
      activateMember(container, index, firstName, fullName, role);
    }
  });
});

// Attach click listeners to dots indicator
teamDots.forEach((dot, dotIndex) => {
  dot.addEventListener("click", (e) => {
    e.stopPropagation();
    if (currentActiveIndex === dotIndex) {
      deactivateAll();
    } else {
      activateMemberByIndex(dotIndex);
    }
  });
});

// Revert to default when tapping/clicking anywhere outside the profile row
document.addEventListener("click", (e) => {
  if (currentActiveIndex !== null && !profileRow.contains(e.target)) {
    deactivateAll();
  }
});

// Touch Swipe Gesture Recognition for Mobile & Tablets
let touchStartX = 0;
let touchStartY = 0;
let touchStartTime = 0;
let isTrackingTouch = false;

const teamViewport = document.querySelector(".team-viewport") || document.body;

teamViewport.addEventListener(
  "touchstart",
  (e) => {
    if (e.touches.length !== 1) return;
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
    touchStartTime = Date.now();
    isTrackingTouch = true;
  },
  { passive: true }
);

teamViewport.addEventListener(
  "touchend",
  (e) => {
    if (!isTrackingTouch || e.changedTouches.length !== 1) return;
    isTrackingTouch = false;

    const deltaX = e.changedTouches[0].clientX - touchStartX;
    const deltaY = e.changedTouches[0].clientY - touchStartY;
    const elapsed = Date.now() - touchStartTime;

    // Must be a definitive horizontal gesture (min 36px, horizontal dominance > 1.3x, within 600ms)
    if (Math.abs(deltaX) >= 36 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3 && elapsed < 600) {
      if (deltaX < 0) {
        // Swiped Left -> Advance to next member
        const next = currentActiveIndex === null ? 0 : currentActiveIndex + 1;
        activateMemberByIndex(next);
      } else {
        // Swiped Right -> Return to previous member
        const prev = currentActiveIndex === null ? profileContainers.length - 1 : currentActiveIndex - 1;
        activateMemberByIndex(prev);
      }
    }
  },
  { passive: true }
);

// Keyboard Left / Right arrow navigation for desktop accessibility
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowRight") {
    const next = currentActiveIndex === null ? 0 : currentActiveIndex + 1;
    activateMemberByIndex(next);
  } else if (e.key === "ArrowLeft") {
    const prev = currentActiveIndex === null ? profileContainers.length - 1 : currentActiveIndex - 1;
    activateMemberByIndex(prev);
  } else if (e.key === "Escape") {
    deactivateAll();
  }
});
