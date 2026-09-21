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

// --- EB Member Modal Logic ---

const ebProfiles = {
  "Kshitij Saha": {
    desc: "<p>Kshitij Saha is a seasoned veteran of the Bangalore MUN circuit and a respected chair across the city's premier conferences.</p><p>By day, he works as a Cyber Strategy Consultant at KPMG India. In the committee room, Kshitij brings a distinctive blend of meticulous preparation, sharp research instincts, and quirky humour that keeps debates dynamic, inclusive, and thoroughly enjoyable. His deep interest in Human Rights, combined with a talent for uncovering niche angles, allows him to transform even conventional committees into fresh, thought-provoking experiences.</p><p>Known for his keen eye for detail — nothing slips past him — Kshitij is deeply committed to creating a lively, supportive, and enriching environment for both first-time delegates and seasoned MUNers alike. Whether it’s guiding intense crises or fostering meaningful discussion, he ensures every committee is memorable, wholesome, and intellectually rewarding.</p>",
    quote: "",
    song: "",
    insta: ""
  },
  "Sanchya Prathish": {
    desc: "<p>Sanchya Prathish is a BALLB student with a 100% placement record with Best Delegate awards across DISEC, UNSC, UNCSW in numerous prestigious conferences like SLCUMUN, IRMUN, DSIMUN, KJMUN, ECHOMUN, NHMUN. Beyond the conference room, she can be found teaching French, scoring goals or running for no absolute reason.</p>",
    quote: "Ishaan this one's for you lil goat :)",
    song: "",
    insta: "sanchya_prathish"
  },
  "Pranav Sivakumar": {
    desc: "<p>Bio was too goated for the website.</p>",
    quote: "“Dulce bellum inexpertis” ~ Erasmus",
    song: "",
    insta: "therealfakist"
  },
  "Jayanth N": {
    desc: "<p>Jayanth N is currently pursuing his BBA LL.B. at M.S. Ramaiah Institute of Legal Studies, Bengaluru. Since beginning his Model United Nations journey in 2024, he has rapidly established himself as a distinguished figure in the MUN circuit through his dedication, discipline, and mastery of parliamentary procedure.</p><p>With a comprehensive understanding of both United Nations Rules of Procedure and Indian Parliamentary simulations, Jayanth is recognised for his impartial judgment, commanding presence, and exceptional procedural expertise. His ability to maintain order while fostering intellectually rigorous debate has earned him the respect of delegates and organisers alike.</p><p>Beyond the committee room, Jayanth is an organiser, strategist, and institution builder who believes that leadership is measured not by titles, but by the opportunities created for others. His vision extends beyond conferences—to building platforms that inspire excellence, empower young leaders, and redefine the standards of academic diplomacy.</p><p>He did not wait for opportunities to find him; he built them. He did not follow established paths; he created his own. Every challenge became a foundation, every setback a lesson, and every achievement another step towards something greater.</p><p>For Jayanth, Model United Nations is not merely about debate—it is about building leaders capable of shaping the future.</p>",
    quote: "न भीतो मरणादस्मि केवलं दूषितो यशः",
    song: "",
    insta: ""
  },
  "Sathya Shiva": {
    desc: "<p>Sathya, currently pursuing Law at BMS College of Law, Bangalore, has been in the circuit for over 4 years. He comes with a well appreciated adjudication skill along with great legal acumen and is all set to perform his duty as the Vice Chair of UNSC at RNSMUN</p>",
    quote: "Legen-wait for it-dary",
    song: "",
    insta: "S4thya._"
  },
  "Pranathi Naik": {
    desc: "<p>Their lawyer advised against a bio.</p>",
    quote: "Perhaps",
    song: "",
    insta: "pranathinaik.27"
  },
  "Shishir Simha": {
    desc: "<p>We could tell you, but where's the fun in that?</p>",
    quote: "The weapons of our warfare are not carnal",
    song: "",
    insta: "shishir.simha"
  },
  "Adwitiyo Das": {
    desc: "<p>Adwitiyo Das is a Third year Student of International Relations, Public Policy and Journalism at St Joseph's University Bangalore. He serves as the current President of the St Joseph's University MUNSOC.</p>",
    quote: "If you are nothing without the suit, then you shouldn't have it",
    song: "",
    insta: ""
  },
  "Rajath R": {
    desc: "<p>A student of law<br>An enthusiast of politics<br>A follower of God<br>A fan of cricket and much more</p>",
    quote: "Winter is coming",
    song: "",
    insta: "rajathrr_4"
  },
  "Anshuman Pandey": {
    desc: "<p>No bio, unfortunately the aura is indescribable.</p>",
    quote: "",
    song: "",
    insta: "_.anshuman_.07"
  },
  "Sumit Shingare": {
    desc: "<p>Sumit Shingare is a student at Dayananda Sagar College of Engineering studying Data Science. Holding a 100% Placement Record with Best Delegate awards across UNSC, DISEC and UNHRC in numerous prestigious conferences like BITSGOA, CMSMUN, FMUN, DOCMUN, DSIMUN, NMGDC, KJMUN, ROTAMUN, DSBAMUN, UniCon</p><p>Off the committee floor, Sumit is a die-hard Liverpool fan. Whether it’s drafting policies or debating if Lebron is the goat, he brings the same passion.</p>",
    quote: "",
    song: "",
    insta: "sum1t_s"
  },
  "Sahit Bhangre": {
    desc: "<p>Sahit S Bangre is a working professional at EY India. A scholarship student who pursued his PG Diploma in Finance from the University of London. He is also a B.Com graduate from JAIN (Deemed-to-be University) in Bangalore and the ex-President of Jain University MUN Society.</p><p>He was introduced to the world of MUNs as an escape from mundane school life. As they say - \"Love is found in the most unexpected places\", this was a classic example of that and there was no turning back. On the back of 9 years on the circuit, he's explored and experienced the entire length and breadth of MUNs from Press to Chairing but predominantly operates and specializes in the Security Council with an indomitable 100% top 3 placement record in the Security Council.</p><p>Apart from MUNs, he is also a passionate avgeek and religiously follows F1 and football like his life depends on it.</p>",
    quote: "",
    song: "",
    insta: ""
  },
  "Vachan B Hindiskere": {
    desc: "<p>Vachan B Hindiskere is a second-year Computer Science Engineering student at RNSIT and a keen MUNer with a strong interest in Geopolitics and International Law. He particularly enjoys bringing the technical perspective of his degree into MUNs, using research, analytical thinking, and technology to approach complex issues in committee. Beyond MUNs, Vachan enjoys doing hackathons, MMA, and most of all taking a good nap.</p>",
    quote: "「先生の奥義『バイブス採点』を継承する。」",
    song: "",
    insta: ""
  },
  "Tanmay P Shetty": {
    desc: "<p>Tanmay is a second-year engineering student with a deep passion for public speaking and debates. He began participating in Model United Nations (MUN) conferences in the 11th grade and has been balancing them ever since. Outside of his academic routine, he loves dogs, is a huge Formula 1 fan, and is a dedicated supporter of Charles Leclerc.</p>",
    quote: "Life’s but a walking shadow, a poor player,<br>That struts and frets his hour upon the stage,<br>And then is heard no more. It is a tale<br>Told by an idiot, full of sound and fury,<br>Signifying nothing.",
    song: "",
    insta: ""
  },
  "Divya Sharma": {
    desc: "<p>Divya Sharma is a second-year B.Tech student pursuing Electronics and Communication Engineering (ECE) at RNSIT. She is a curious person who loves learning, exploring, and trying things from completely different fields. Fascinated by geopolitics and passionate about public speaking, she enjoys stepping out of her comfort zone and taking on new challenges. Beyond academics and MUNs, badminton is one of her favourite hobbies, while listening to songs and doing adventures are her go-to ways to chill.</p>",
    quote: "keep your face always towards the sunshine, and shadows will fall behind you.",
    song: "",
    insta: ""
  },
  "Nuha Alishba": {
    desc: "<p>Nuha Alishba is a second-year engineering student with a keen interest in international relations, geopolitics, and humanitarian law. Drawn to MUNs by the art of research and diplomacy, she enjoys exploring complex global issues through thoughtful conversations and nuanced perspectives. Beyond committee rooms, she fills journals with poetry, sketches whenever inspiration strikes, and has an eye for aesthetics and photography. A devoted cat lover with an unexpected obsession for Supras and race cars, she believes curiosity and empathy are at the heart of every meaningful conversation & that the smallest details often tell the biggest stories, which is exactly what she hopes to bring to IPC.</p>",
    quote: "Tell your cat i said pspspspsps 😼",
    song: "",
    insta: ""
  },
  "Kapil Pal": {
    desc: "<p>Kapil Pal is a computer science (AI&ML) undergrad at RNSIT who treats Model UN as a fantastic excuse to put on a suit and professionally argue. When he isn’t using calm logic to survive committee chaos, you’ll find him aggressively surfing the internet, casually critiquing everything (especially politics) and disagreeing with most things just for the sport of it. Sarcastic, endlessly curious, and dangerously easy to like.</p>",
    quote: "Shinzou wo Sasageyo",
    song: "",
    insta: "stoic_kapil"
  }
};

// Aliases for robustness
ebProfiles["Sathya"] = ebProfiles["Sathya Shiva"];
ebProfiles["Satya Shiva"] = ebProfiles["Sathya Shiva"];
ebProfiles["Pranav"] = ebProfiles["Pranav Sivakumar"];
ebProfiles["Sivakumar"] = ebProfiles["Pranav Sivakumar"];
ebProfiles["Pranav Shivkumar"] = ebProfiles["Pranav Sivakumar"];
ebProfiles["Sanchya"] = ebProfiles["Sanchya Prathish"];
ebProfiles["Prathish"] = ebProfiles["Sanchya Prathish"];
ebProfiles["Sanchya Pratish"] = ebProfiles["Sanchya Prathish"];
ebProfiles["Adwitiyo"] = ebProfiles["Adwitiyo Das"];
ebProfiles["Adwityo Das"] = ebProfiles["Adwitiyo Das"];
ebProfiles["Adwityo"] = ebProfiles["Adwitiyo Das"];

const ebModal = document.getElementById("ebModal");
const ebModalClose = document.getElementById("ebModalClose");
const ebModalImg = document.getElementById("ebModalImg");
const ebModalName = document.getElementById("ebModalName");
const ebModalRole = document.getElementById("ebModalRole");
const ebModalDesc = document.getElementById("ebModalDesc");
const ebModalMeta = document.getElementById("ebModalMeta");

function formatSongTitle(song) {
  if (!song) return "";
  let s = song.trim();
  s = s.replace(/\s*\(?\d+:\d+.*$/i, "");
  s = s.replace(/\s*From\s+\d+:\d+.*$/i, "");
  s = s.replace(/\s+by\s+/i, " — ");
  s = s.replace(/,\s*(Tyler,\s*the\s*creator)/i, " — Tyler, The Creator");
  return s.trim();
}

const allEbCards = document.querySelectorAll(".eb-card");

allEbCards.forEach(card => {
  const imgWrap = card.querySelector(".eb-image-wrap");
  const img = card.querySelector("img");
  const nameEl = card.querySelector(".eb-name");
  const roleEl = card.querySelector(".eb-role");
  
  if (!imgWrap || !nameEl || !img) return;
  
  imgWrap.addEventListener("click", () => {
    const name = nameEl.textContent.trim();
    const role = roleEl ? roleEl.textContent.trim() : "";
    
    // Set basic info
    ebModalName.textContent = name;
    ebModalImg.src = img.src;

    // Ensure ideal facial framing depending on member photo proportions
    if (name.includes("Kapil")) {
      ebModalImg.style.objectPosition = "center 8%";
    } else if (name.includes("Jayanth")) {
      ebModalImg.style.objectPosition = "center 12%";
    } else if (name.includes("Pranathi")) {
      ebModalImg.style.objectPosition = "center 22%";
    } else if (name.includes("Pranav") || name.includes("Sivakumar")) {
      ebModalImg.style.objectPosition = "center 18%";
    } else if (name.includes("Nuha")) {
      ebModalImg.style.objectPosition = "center 25%";
    } else {
      ebModalImg.style.objectPosition = "center 20%";
    }

    if (role) {
      ebModalRole.textContent = role;
      ebModalRole.style.display = "block";
    } else {
      ebModalRole.textContent = "";
      ebModalRole.style.display = "none";
    }
    
    // Set dynamic background image with blur (via CSS variable)
    ebModal.style.setProperty("--bg-img", `url('${img.src}')`);
    ebModal.style.setProperty("--modal-photo-bg", `url('${img.src}')`);
    const ebModalLeft = ebModal.querySelector(".eb-modal-left");
    if (ebModalLeft) {
      ebModalLeft.style.setProperty("--modal-photo-bg", `url('${img.src}')`);
    }
    
    // Default placeholders
    ebModalDesc.innerHTML = "<p>Description coming soon...</p>";
    ebModalMeta.innerHTML = "";
    
    // Override if data exists
    if (ebProfiles[name]) {
      const data = ebProfiles[name];
      if (data.desc) ebModalDesc.innerHTML = data.desc;
      
      let metaHtml = "";
      if (data.quote && data.quote.trim()) {
        const cleanQuote = data.quote.trim().replace(/^["“]+|["”]+$/g, "");
        metaHtml += `<div class="eb-modal-quote"><p class="eb-quote-text">“${cleanQuote}”</p></div>`;
      }

      let metaRowHtml = "";
      if (data.insta && data.insta.trim()) {
        const handle = data.insta.trim().replace(/^@/, "");
        metaRowHtml += `
          <a href="https://www.instagram.com/${handle}/" target="_blank" rel="noopener noreferrer" class="eb-meta-pill">
            <svg class="eb-meta-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
              <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
              <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
            </svg>
            <span class="eb-meta-val">@${handle}</span>
            <span class="eb-meta-arrow">↗</span>
          </a>`;
      }

      if (metaRowHtml) {
        metaHtml += `<div class="eb-modal-meta-row">${metaRowHtml}</div>`;
      }
      
      ebModalMeta.innerHTML = metaHtml;
      ebModalMeta.style.display = metaHtml ? "flex" : "none";
    } else {
      ebModalMeta.style.display = "none";
    }
    
    if (ebModal) {
      ebModal.classList.add("active");
      document.body.classList.add("modal-open");
      document.body.style.overflow = "hidden";
      document.documentElement.style.overflow = "hidden";
      const ebModalScroll = document.getElementById("ebModalScroll");
      if (ebModalScroll) ebModalScroll.scrollTop = 0;
      if (ebModalDesc) ebModalDesc.scrollTop = 0;
      const ebModalBody = ebModal.querySelector(".eb-modal-body");
      if (ebModalBody) ebModalBody.scrollTop = 0;
    }
  });
});

function closeEbModal() {
  if (ebModal) {
    ebModal.classList.remove("active");
    document.body.classList.remove("modal-open");
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";
  }
}

if (ebModalClose) {
  ebModalClose.addEventListener("click", closeEbModal);
}

if (ebModal) {
  ebModal.addEventListener("click", (e) => {
    if (e.target === ebModal) closeEbModal();
  });
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Escape" && ebModal && ebModal.classList.contains("active")) {
    closeEbModal();
  }
});

// ── Scroll-fade-in: committee blocks + individual cards ──
(function initEbScrollAnimations() {
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReduced) {
    // Just make everything visible immediately
    document.querySelectorAll('.committee-block, .eb-card').forEach(el => el.classList.add('is-visible'));
    return;
  }

  const blockObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        blockObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

  const cardObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry, i) => {
      if (entry.isIntersecting) {
        // Stagger cards within same committee
        const cards = Array.from(entry.target.closest('.eb-grid')?.querySelectorAll('.eb-card') || []);
        const idx = cards.indexOf(entry.target);
        setTimeout(() => {
          entry.target.classList.add('is-visible');
        }, idx * 80);
        cardObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -20px 0px' });

  document.querySelectorAll('.committee-block').forEach(el => blockObserver.observe(el));
  document.querySelectorAll('.eb-card').forEach(el => cardObserver.observe(el));
})();

