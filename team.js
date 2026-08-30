const profileRow = document.getElementById("profile-row");
const roleDisplay = document.getElementById("role-display");
const giantTextContainer = document.getElementById("giant-text-container");
const profileContainers = document.querySelectorAll(".profile-img-container");

// Manage active names and transitions
let currentActiveIndex = null;
let pendingEntryTimeout = null;

function setGiantName(name, isActiveMember) {
  if (pendingEntryTimeout) {
    clearTimeout(pendingEntryTimeout);
    pendingEntryTimeout = null;
  }

  // Find all current wrappers
  const wrappers = giantTextContainer.querySelectorAll(".name-wrapper");
  
  // If the latest wrapper is already displaying the same name, do nothing
  if (wrappers.length > 0) {
    const latest = wrappers[wrappers.length - 1];
    if (latest.dataset.name === name && !latest.classList.contains("slide-out")) {
      return;
    }
  }

  // Mark all existing wrappers as slide-out
  wrappers.forEach((w, i) => {
    w.classList.remove("slide-in");
    w.classList.add("slide-out");
    
    // If there are multiple wrappers, remove older ones immediately to prevent clumping
    if (i < wrappers.length - 1) {
      w.remove();
    } else {
      setTimeout(() => {
        w.remove();
      }, 600);
    }
  });

  // Function to create and slide in the new name
  const createNew = () => {
    const newWrapper = document.createElement("div");
    newWrapper.className = "name-wrapper"; // Start without slide-in to trigger transition
    newWrapper.dataset.name = name;

    const h1 = document.createElement("h1");
    h1.className = `giant-name ${isActiveMember ? "active-member" : "default"}`;

    const chars = Array.from(name);
    let html = "";
    chars.forEach((char, index) => {
      // Stagger transition starting from the center outward
      const delay = 0.035 * Math.abs(index - Math.floor(chars.length / 2));
      const letterClass = char === " " ? "letter space" : "letter";
      const letterVal = char === " " ? "&nbsp;" : char;
      html += `<span class="${letterClass}" style="transition-delay: ${delay}s">${letterVal}</span>`;
    });

    h1.innerHTML = html;
    newWrapper.appendChild(h1);
    giantTextContainer.appendChild(newWrapper);

    // Force reflow and activate slide-in transition
    newWrapper.offsetHeight;
    newWrapper.classList.add("slide-in");
  };

  // If there was an existing name transitioning out, delay the entry of the new name until it is completely hidden
  if (wrappers.length > 0) {
    pendingEntryTimeout = setTimeout(createNew, 500); // 500ms delay balances snappiness with complete clearance
  } else {
    createNew();
  }
}

// Initialize default name
setGiantName("RNS'MUN", false);

// Set helper label text dynamically based on viewport size
if (window.innerWidth < 768) {
  roleDisplay.textContent = "Tap a member to view role";
}

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
  
  const baseSize = isMobile ? (isSmallPhone ? 15 : (isPhone ? 15.5 : 16)) : 95;
  
  // 1. Calculate the scale for each profile container
  const scales = [];
  profileContainers.forEach((container, i) => {
    const distance = Math.abs(i - activeIndex);
    if (distance === 0) {
      const activeSize = isMobile ? (isSmallPhone ? 21 : (isPhone ? 23 : 24.5)) : 150;
      scales.push(activeSize / baseSize);
    } else {
      if (isMobile) {
        const size = Math.max(11, baseSize - (distance * 1.3));
        scales.push(size / baseSize);
      } else {
        const size = 95 - (distance * 5);
        scales.push(size / 95);
      }
    }
  });

  // 2. Compute translation offsets recursively to guarantee 100% equal visual spacing
  const txs = new Array(profileContainers.length).fill(0);
  const buffer = isMobile ? (isSmallPhone ? 1.6 : (isPhone ? 2.0 : 2.4)) : 24; // Extra spacing buffer around focused image
  
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

  // Apply fluid magnetic ripple sizes and translates
  updateMagneticRipple(index);

  // Update displays
  roleDisplay.textContent = `${role} • ${fullName}`;
  roleDisplay.style.opacity = "1";
  setGiantName(firstName, true);
}

// Function to deactivate and revert to RNS'MUN default
function deactivateAll() {
  currentActiveIndex = null;
  profileContainers.forEach(c => c.classList.remove("active"));
  
  // Revert all profile translations and sizes back to original layout
  updateMagneticRipple(null);

  roleDisplay.textContent = isTouchOrMobile() ? "Tap a member to view role" : "Hover a member to view role";
  setGiantName("RNS'MUN", false);
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

// Revert to default when tapping/clicking anywhere outside the profile row
document.addEventListener("click", (e) => {
  if (currentActiveIndex !== null && !profileRow.contains(e.target)) {
    deactivateAll();
  }
});
