/**
 * RNSMUN 2026 — THE DISPATCH (BLOG)
 * Minimalist Editorial, Interactive Sticker Engine & Modal Reader
 */

// Full Editorial Database
const ARTICLES_DATA = [
  {
    id: "unmod-caucus-art",
    title: "The Art of the Unmoderated Caucus: How Coalitions Are Built When the Microphones Go Silent",
    category: "Diplomatic Strategy",
    categorySlug: "strategy",
    readTime: "6 min read",
    date: "04 October 2026",
    author: "Secretariat Research Bureau",
    authorRole: "Directorate of Delegate Affairs",
    authorInitials: "SR",
    stickerType: "holo",
    stickerLabel: "DRAFT RESOLUTION // SPONSORED",
    excerpt: "The most enduring resolutions aren't drafted behind the plenary podium—they are forged in whispered corridors, margin scribbles, and impromptu coalition circles during ten-minute unmods.",
    featured: true,
    content: `
      <p class="lead-dropcap">Every seasoned delegate knows that formal debate is theater; the unmoderated caucus is where statecraft actually happens. When the chair taps the gavel and announces a ten-minute unmoderated caucus, the room abruptly fractures into kinetic entropy. Briefcases open, legal pads emerge, and thirty diplomats converge into five distinct gravity wells.</p>
      
      <p>The amateur mistakes unmods for social intervals. The tactician treats them as tactical sprints where sovereignty is bargained, clauses are horse-traded, and the intellectual architecture of the working paper is decided in under six hundred seconds.</p>

      <div class="reader-pull-quote">
        “Power in an unmoderated caucus does not belong to the loudest voice in the circle—it belongs to the delegate holding the pen who can synthesize four competing viewpoints into a single sentence.”
        <cite>— RNSMUN Council on Multilateral Dynamics</cite>
      </div>

      <h3 class="reader-section-heading">1. The Principle of the Centripetal Circle</h3>
      <p>Watch any high-level committee during an unmod: the dominant bloc invariably forms a tight circle. Position yourself not on the outer rim trying to peer over shoulders, but at the physical pivot point. Anchor your stance, maintain an open chest posture, and hold your legal pad where at least three neighbouring delegates can read your headings.</p>

      <h3 class="reader-section-heading">2. Sponsoring Without Dictating</h3>
      <p>The fastest way to fracture a budding coalition is territorial arrogance. Veteran delegates rarely announce, <em>“This is my resolution.”</em> Instead, they employ inclusive phraseology: <em>“As France, Brazil, and Japan just highlighted, our joint operative clause guarantees humanitarian corridors while preserving jurisdictional autonomy.”</em> By validating other delegates' egos in the draft, you turn potential adversaries into fiercely loyal signatories.</p>

      <h3 class="reader-section-heading">3. The Three-Minute Pivot</h3>
      <p>Never remain stranded in an unproductive circle past minute three. If a discussion devolves into semantic bickering over preambulatory phrasing, delegate a working draft to a second delegate, excuse yourself with diplomatic grace, and bridge the aisle to court the undecided neutral bloc.</p>
    `
  },
  {
    id: "sanctions-sovereignty-unsc",
    title: "Decoding Sanctions & Sovereignty: A Masterclass in UNSC Crisis Simulation",
    category: "Crisis & UNSC",
    categorySlug: "crisis",
    readTime: "8 min read",
    date: "02 October 2026",
    author: "Security Council Directorate",
    authorRole: "Executive Board, UNSC",
    authorInitials: "SC",
    stickerType: "postage",
    stickerLabel: "POINT OF ORDER",
    excerpt: "From targeted smart sanctions to Chapter VII military enforcement, understanding the delicate tension between sovereign borders and collective security defines the elite diplomat.",
    featured: false,
    content: `
      <p class="lead-dropcap">In the hallowed chambers of the United Nations Security Council, idealism collides violently with geopolitical realism. Article 2(7) of the UN Charter shields sovereign nations from intervention, yet Chapter VII grants the Council unprecedented coercive mandate to maintain international peace. Navigating this razor's edge is what separates a novice from a gavel winner.</p>

      <div class="reader-pull-quote">
        “A veto unused is a sword sheathed; a veto threatened in unmoderated caucus is the supreme instrument of diplomatic leverage.”
        <cite>— Dispatch on Security Architecture</cite>
      </div>

      <h3 class="reader-section-heading">Targeted 'Smart' Sanctions vs. Blanket Embargoes</h3>
      <p>Modern crises rarely permit blunt economic blockades that impoverish civilian populations. Sophisticated delegates draft tiered sanctions: asset freezes on specific military oligarchs, dual-use technology import bans, and maritime interdiction mechanisms with verified multilateral oversight.</p>

      <h3 class="reader-section-heading">The Art of the Pre-emptive Concession</h3>
      <p>When drafting a crisis resolution that risks a Permanent Member's veto (P5), embed an 'escape clause'—an independent review panel or a renewable sunset clause. This allows the objecting superpower to save face domestically while granting the council operational consensus.</p>
    `
  },
  {
    id: "quiet-psychology-attire",
    title: "The Quiet Psychology of Diplomatic Attire & Executive Presence",
    category: "Protocol & Presence",
    categorySlug: "protocol",
    readTime: "4 min read",
    date: "29 September 2026",
    author: "Equity & Protocol Committee",
    authorRole: "Office of the Secretary General",
    authorInitials: "EP",
    stickerType: "washi",
    stickerLabel: "PROTOCOL // APPROVED",
    excerpt: "Poise, tailoring, and understated elegance are not superficial formalities; they communicate respect for the dais and project instinctive command over the chamber.",
    featured: false,
    content: `
      <p class="lead-dropcap">Long before you speak your first point of inquiry, your posture and presentation have delivered an opening statement. Diplomatic protocol has evolved over centuries not out of vanity, but out of necessity: in rooms where high-stakes geopolitical tensions simmer, rigid decorum prevents visceral escalation.</p>

      <div class="reader-pull-quote">
        “Executive presence is not loud or flamboyant. It is the steady composure that does not fidget when challenging points of information are raised.”
        <cite>— Protocol Notes for Young Diplomats</cite>
      </div>

      <h3 class="reader-section-heading">Subtle Confidence Over Flashiness</h3>
      <p>Whether choosing sharp Western formal tailoring or heritage traditional formal attire, simplicity and structure prevail. Clean lines, neutral palates (charcoal, midnight navy, deep burgundy, crisp ivory), and muted accents allow your argumentation—not your accessories—to command attention.</p>

      <h3 class="reader-section-heading">The Micro-Gestures of the Podium</h3>
      <p>Watch how world leaders position their hands during speeches: thumbs lightly resting against podium edges, open palms during appeals for consensus, and measured eye contact that divides the room into three distinct arcs. When you finish speaking, do not rush back to your seat; hold your poise for one measured second before yielding your time.</p>
    `
  },
  {
    id: "chatham-house-candor",
    title: "The Chatham House Rule in Collegiate MUN: Fostering Radically Honest Discourse",
    category: "Diplomatic Strategy",
    categorySlug: "strategy",
    readTime: "5 min read",
    date: "26 September 2026",
    author: "International Press Corps Bureau",
    authorRole: "Chief of Bureau",
    authorInitials: "IP",
    stickerType: "washi",
    stickerLabel: "OFF THE RECORD // CHATHAM HOUSE",
    excerpt: "Why creating low-stakes, high-candor committee moments unlocks creative foreign policy solutions that rehearsed monologues could never achieve.",
    featured: false,
    content: `
      <p class="lead-dropcap">Established in 1927 in London, the Chatham House Rule provides that participants are free to use the information received, but neither the identity nor the affiliation of the speaker may be revealed. In simulated diplomacy, adopting this mindset during informal side-talks dismantles ideological paralysis.</p>

      <div class="reader-pull-quote">
        “Diplomats cannot negotiate with their public talking points. Breakthroughs happen only when negotiators admit their red lines in complete privacy.”
        <cite>— IPC Investigative Dossier</cite>
      </div>

      <h3 class="reader-section-heading">Escaping Rehearsed Rhetoric</h3>
      <p>Many first-time delegates become trapped in the public persona of their state, refusing to budge on indefensible stances. The elite delegate knows how to signal in private: <em>“Off the record, my domestic constituency forbids concession on border tariffs, but we can offer total reciprocity on digital infrastructure investments.”</em></p>
    `
  },
  {
    id: "midnight-directive-mastery",
    title: "Mastering the Directive: Speed, Subtlety, and Sabotage in Continuous Crisis",
    category: "Crisis & UNSC",
    categorySlug: "crisis",
    readTime: "7 min read",
    date: "22 September 2026",
    author: "Crisis Backroom Cell",
    authorRole: "Joint Crisis Directorate",
    authorInitials: "CB",
    stickerType: "caffeine",
    stickerLabel: "CAFFEINE & CRISIS // 03:42 AM",
    excerpt: "How to draft personal directives and clandestine backroom orders that pass scrutiny while keeping rival factions completely in the dark.",
    featured: false,
    content: `
      <p class="lead-dropcap">Continuous Crisis Committees (CCC) operate on a different rhythm than General Assembly bodies. While the GA deliberates for hours over a single modifier, the crisis room burns through three regime changes before lunch. Here, your primary instrument is not the microphone—it is the handwritten crisis directive dispatched to the backroom.</p>

      <div class="reader-pull-quote">
        “A sloppy directive creates chaos; an elegant directive creates a chain of plausible deniability that reshapes the entire simulation.”
        <cite>— Crisis Simulation Manual</cite>
      </div>

      <h3 class="reader-section-heading">The Four Cardinal Rules of Crisis Directives</h3>
      <p><strong>1. Actionable Specificity:</strong> Never write 'Deploy special forces to secure the border.' Name the battalion, specify their transit route, define rules of engagement, and provide funding mechanisms.</p>
      <p><strong>2. Plausible Deniability:</strong> Always state secondary objectives that conceal your genuine geopolitical intent from backroom intelligence leaks.</p>
      <p><strong>3. Contingency Triggers:</strong> Include 'If-Then' clauses for crisis directors: 'If ambushed, fall back to depot Delta and initiate encrypted radio silence.'</p>
      <p><strong>4. Speed vs. Depth:</strong> The first directive received by the backroom after a crisis update sets the initial narrative. Speed is vital, but clarity is lethal.</p>
    `
  },
  {
    id: "novice-to-best-delegate",
    title: "From Novice to Best Delegate: 7 Micro-Habits of Veteran MUN Champions",
    category: "Veteran Wisdom",
    categorySlug: "wisdom",
    readTime: "6 min read",
    date: "18 September 2026",
    author: "Alumni Council & EB Fellows",
    authorRole: "RNSMUN Hall of Fame",
    authorInitials: "AC",
    stickerType: "wax",
    stickerLabel: "PASSED BY CONSENSUS",
    excerpt: "Notice how veteran debaters never argue to defeat an opponent; they argue to bring the undecided bloc into their conceptual orbit.",
    featured: false,
    content: `
      <p class="lead-dropcap">Winning Best Delegate is rarely a fluke of exceptional oratory. Rather, it is the compounding result of micro-disciplines executed consistently across twelve hours of grueling committee sessions. Here are the seven non-negotiable habits observed in championship delegations.</p>

      <div class="reader-pull-quote">
        “The best delegate in the room is not the smartest person; it is the person who makes everyone else feel like they are doing their best work.”
        <cite>— Reflections of an Outgoing Secretary General</cite>
      </div>

      <h3 class="reader-section-heading">The Seven Disciplines</h3>
      <p><strong>1. The Name Recall Advantage:</strong> Memorize the country assignments and actual first names of at least twenty delegates before session one concludes. Addressing a diplomat by name creates immediate psychological rapport.</p>
      <p><strong>2. The 30-Second Rule:</strong> Every speech must conclude with an actionable invitation: <em>“I invite Argentina, Kenya, and Norway to meet us by the second column immediately upon recess.”</em></p>
      <p><strong>3. Notes as Currency:</strong> Use committee pages to pass handwritten, targeted chits with specific clause suggestions, rather than vague pleasantries.</p>
      <p><strong>4. Chair Empathy:</strong> Understand that the Executive Board is exhausted and reading hundreds of pages. Make their job easy with impeccably formatted resolutions.</p>
      <p><strong>5. Zero Personal Hostility:</strong> Attack arguments fiercely; affirm delegates graciously. Never humiliate an inexperienced speaker on a point of order.</p>
      <p><strong>6. The Master Binder:</strong> Organize your research into tabbed dossiers: Treaties, Historical Precedents, UN Voting Records, and Draft Clauses.</p>
      <p><strong>7. Staying Generous:</strong> True diplomacy is generative. When your coalition passes a resolution, ensure every co-sponsor receives public recognition during plenary.</p>
    `
  }
];

// Available Sticker Types for Interactive Dispensary
const STICKER_TEMPLATES = [
  {
    id: "mun-seal",
    type: "img",
    src: "/assets/blog/sticker-mun-seal.jpg",
    alt: "Holographic MUN Seal",
    class: "sticker-img-badge",
    tilt: -4
  },
  {
    id: "point-of-order",
    type: "img",
    src: "/assets/blog/sticker-point-of-order.jpg",
    alt: "Point of Order Stamp",
    class: "sticker-postage-badge",
    tilt: 5
  },
  {
    id: "draft-resolution",
    type: "html",
    html: `<div class="sticker-holographic">DRAFT RESOLUTION // SPONSORED</div>`,
    tilt: -2
  },
  {
    id: "chatham-house",
    type: "html",
    html: `<div class="sticker-washi-tape">OFF THE RECORD // CHATHAM HOUSE</div>`,
    tilt: 3
  },
  {
    id: "wax-seal",
    type: "html",
    html: `<div class="sticker-wax-seal" title="Passed by Consensus">❖</div>`,
    tilt: -6
  },
  {
    id: "caffeine-crisis",
    type: "html",
    html: `<div class="sticker-caffeine-pill">☕ CAFFEINE & CRISIS // 03:42 AM</div>`,
    tilt: 4
  },
  {
    id: "vox-diplomatica",
    type: "html",
    html: `<div class="sticker-mono-stamp">VOX DIPLOMATICA • RNSMUN</div>`,
    tilt: -3
  }
];

// State
let activeCategory = "all";
let searchQuery = "";
let currentArticleId = null;

// Initialize on DOM load
document.addEventListener("DOMContentLoaded", () => {
  initOrganicStickers();
  renderArticles();
  setupFilterHandlers();
  setupSearchHandler();
  setupReaderModal();
  setupNewsletterForm();
  checkUrlHashForArticle();
});

// Initialize organically placed stickers with smooth dragging
function initOrganicStickers() {
  const stickers = document.querySelectorAll(".organic-sticker");
  stickers.forEach(el => {
    makeStickerDraggable(el);
  });
}

// Make any sticker smoothly draggable across the viewport/canvas
function makeStickerDraggable(el) {
  let isDragging = false;
  let startX, startY;
  let initialLeft, initialTop;

  const onPointerDown = (e) => {
    if (e.button && e.button !== 0) return;
    isDragging = true;
    startX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX);
    startY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY);

    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);

    if (style.position === "fixed") {
      initialLeft = rect.left;
      initialTop = rect.top;
      el.style.left = `${initialLeft}px`;
      el.style.top = `${initialTop}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
    } else {
      const parentRect = el.offsetParent ? el.offsetParent.getBoundingClientRect() : { left: 0, top: 0 };
      initialLeft = rect.left - parentRect.left;
      initialTop = rect.top - parentRect.top;
      el.style.left = `${initialLeft}px`;
      el.style.top = `${initialTop}px`;
      el.style.right = "auto";
      el.style.bottom = "auto";
    }

    el.style.zIndex = "9999";
    el.style.cursor = "grabbing";
  };

  const onPointerMove = (e) => {
    if (!isDragging) return;
    const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0].clientX);
    const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0].clientY);
    const dx = clientX - startX;
    const dy = clientY - startY;

    el.style.left = `${initialLeft + dx}px`;
    el.style.top = `${initialTop + dy}px`;
  };

  const onPointerUp = () => {
    if (isDragging) {
      isDragging = false;
      el.style.zIndex = "30";
      el.style.cursor = "grab";
    }
  };

  el.addEventListener("mousedown", onPointerDown);
  window.addEventListener("mousemove", onPointerMove);
  window.addEventListener("mouseup", onPointerUp);

  el.addEventListener("touchstart", onPointerDown, { passive: true });
  window.addEventListener("touchmove", onPointerMove, { passive: true });
  window.addEventListener("touchend", onPointerUp);
}

// Render Articles Grid & Featured Card
function renderArticles() {
  const grid = document.getElementById("articlesGrid");
  const featuredWrap = document.getElementById("featuredDispatchWrap");
  if (!grid) return;

  const filtered = ARTICLES_DATA.filter(art => {
    const matchesCat = activeCategory === "all" || art.categorySlug === activeCategory;
    const matchesSearch = !searchQuery || 
      art.title.toLowerCase().includes(searchQuery) ||
      art.excerpt.toLowerCase().includes(searchQuery) ||
      art.category.toLowerCase().includes(searchQuery) ||
      art.author.toLowerCase().includes(searchQuery);
    return matchesCat && matchesSearch;
  });

  // Featured Lead Story
  const featured = filtered.find(a => a.featured) || filtered[0];

  if (featuredWrap) {
    if (featured && !searchQuery && activeCategory === "all") {
      featuredWrap.style.display = "block";
      featuredWrap.innerHTML = `
        <article class="featured-dispatch" onclick="openArticleReader('${featured.id}')">
          <div class="featured-dispatch-grid">
            <div class="featured-media-wrap">
              <img src="/assets/blog/hero.jpg" alt="${featured.title}" class="featured-media-img" loading="eager">
              <div class="featured-sticker-overlay">
                <div class="sticker-postage-badge" style="transform: rotate(-3deg); box-shadow: var(--blog-shadow-md);">
                  <img src="/assets/blog/sticker-point-of-order.jpg" alt="Point of Order Stamp">
                </div>
                <div class="sticker-holographic" style="transform: rotate(2deg);">FEATURED DOSSIER</div>
              </div>
            </div>
            <div class="featured-content-wrap">
              <div>
                <div class="dispatch-category-row">
                  <span class="dispatch-tag">❖ ${featured.category}</span>
                  <span class="dispatch-read-time">${featured.readTime}</span>
                </div>
                <h2 class="featured-headline">${featured.title}</h2>
                <p class="featured-excerpt">${featured.excerpt}</p>
              </div>
              <div class="dispatch-footer-row">
                <div class="author-chip">
                  <div class="author-avatar">${featured.authorInitials}</div>
                  <div>
                    <div class="author-info-name">${featured.author}</div>
                    <div class="author-info-role">${featured.authorRole} • ${featured.date}</div>
                  </div>
                </div>
                <button type="button" class="btn-read-dispatch" onclick="event.stopPropagation(); openArticleReader('${featured.id}')">
                  <span>Read Dispatch</span>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
                </button>
              </div>
            </div>
          </div>
        </article>
      `;
    } else {
      featuredWrap.style.display = "none";
    }
  }

  // Remaining Grid Articles
  const nonFeatured = (!searchQuery && activeCategory === "all") 
    ? filtered.filter(a => a.id !== (featured ? featured.id : null))
    : filtered;

  if (nonFeatured.length === 0 && (!featured || featuredWrap.style.display === "none")) {
    grid.innerHTML = `
      <div class="blog-empty-state">
        <h3 class="blog-empty-state-title">No Dispatches Found</h3>
        <p class="blog-empty-state-text">No articles matched your filter or search query. Try resetting filters.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = nonFeatured.map((art, idx) => {
    const rot = (idx % 2 === 0 ? -3 : 3);
    return `
      <article class="article-card" onclick="openArticleReader('${art.id}')">
        <div class="article-sticker-pin">
          ${getMiniStickerHtml(art.stickerType, art.stickerLabel, rot)}
        </div>
        <div class="article-card-header">
          <div class="dispatch-category-row">
            <span class="dispatch-tag">${art.category}</span>
            <span class="dispatch-read-time">${art.readTime}</span>
          </div>
          <h3 class="article-title">${art.title}</h3>
          <p class="article-excerpt">${art.excerpt}</p>
        </div>
        <div class="article-card-footer">
          <div class="article-author-info">
            <div class="author-avatar" style="width:32px; height:32px; font-size:0.75rem;">${art.authorInitials}</div>
            <div>
              <div class="article-author-name">${art.author}</div>
              <div class="article-date-meta">${art.date}</div>
            </div>
          </div>
          <div class="article-arrow-pill" aria-hidden="true">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function getMiniStickerHtml(type, label, rot) {
  switch (type) {
    case "postage":
      return `<div class="mun-sticker" style="transform: rotate(${rot}deg);"><div class="sticker-postage-badge"><img src="/assets/blog/sticker-point-of-order.jpg" alt="Point of Order" style="width:48px;height:48px;"></div></div>`;
    case "holo":
      return `<div class="mun-sticker" style="transform: rotate(${rot}deg);"><div class="sticker-holographic">${label}</div></div>`;
    case "washi":
      return `<div class="mun-sticker" style="transform: rotate(${rot}deg);"><div class="sticker-washi-tape">${label}</div></div>`;
    case "caffeine":
      return `<div class="mun-sticker" style="transform: rotate(${rot}deg);"><div class="sticker-caffeine-pill">${label}</div></div>`;
    case "wax":
      return `<div class="mun-sticker" style="transform: rotate(${rot}deg);"><div class="sticker-wax-seal">❖</div></div>`;
    default:
      return `<div class="mun-sticker" style="transform: rotate(${rot}deg);"><div class="sticker-mono-stamp">${label}</div></div>`;
  }
}

// Category filter pills
function setupFilterHandlers() {
  const pills = document.querySelectorAll(".filter-pill");
  pills.forEach(pill => {
    pill.addEventListener("click", () => {
      pills.forEach(p => p.classList.remove("is-active"));
      pill.classList.add("is-active");
      activeCategory = pill.getAttribute("data-category");
      renderArticles();
    });
  });
}

// Live Search
function setupSearchHandler() {
  const searchInput = document.getElementById("blogSearchInput");
  if (!searchInput) return;

  searchInput.addEventListener("input", (e) => {
    searchQuery = e.target.value.trim().toLowerCase();
    renderArticles();
  });
}

// Open Article Reader Modal
window.openArticleReader = function(articleId) {
  const article = ARTICLES_DATA.find(a => a.id === articleId);
  if (!article) return;

  currentArticleId = articleId;
  const overlay = document.getElementById("readerModalOverlay");
  const readerCategory = document.getElementById("readerCategory");
  const readerTitle = document.getElementById("readerTitle");
  const readerAuthorName = document.getElementById("readerAuthorName");
  const readerAuthorRole = document.getElementById("readerAuthorRole");
  const readerAuthorAvatar = document.getElementById("readerAuthorAvatar");
  const readerBody = document.getElementById("readerProseBody");
  const readerScroll = document.getElementById("readerBodyScroll");
  const progressBar = document.getElementById("readerProgressBar");

  if (!overlay) return;

  readerCategory.textContent = `❖ ${article.category} • ${article.readTime}`;
  readerTitle.textContent = article.title;
  readerAuthorName.textContent = article.author;
  readerAuthorRole.textContent = `${article.authorRole} • Published on ${article.date}`;
  readerAuthorAvatar.textContent = article.authorInitials;
  readerBody.innerHTML = article.content;

  // Reset scroll
  if (readerScroll) readerScroll.scrollTop = 0;
  if (progressBar) progressBar.style.width = "0%";

  overlay.classList.add("is-open");
  document.body.style.overflow = "hidden";

  // Update URL hash without reload
  history.replaceState(null, null, `#dispatch-${articleId}`);
};

// Close Reader Modal
window.closeArticleReader = function() {
  const overlay = document.getElementById("readerModalOverlay");
  if (!overlay) return;
  overlay.classList.remove("is-open");
  document.body.style.overflow = "";
  history.replaceState(null, null, window.location.pathname);
};

// Setup Reader Modal Events & Scroll Progress
function setupReaderModal() {
  const overlay = document.getElementById("readerModalOverlay");
  const readerScroll = document.getElementById("readerBodyScroll");
  const progressBar = document.getElementById("readerProgressBar");

  if (readerScroll && progressBar) {
    readerScroll.addEventListener("scroll", () => {
      const scrollHeight = readerScroll.scrollHeight - readerScroll.clientHeight;
      if (scrollHeight > 0) {
        const progress = (readerScroll.scrollTop / scrollHeight) * 100;
        progressBar.style.width = `${progress}%`;
      }
    });
  }

  // Backdrop click
  if (overlay) {
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeArticleReader();
      }
    });
  }

  // Escape key
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && overlay && overlay.classList.contains("is-open")) {
      closeArticleReader();
    }
  });
}

// Share helpers
window.shareArticle = function(platform) {
  if (!currentArticleId) return;
  const article = ARTICLES_DATA.find(a => a.id === currentArticleId);
  const url = `${window.location.origin}/blog#dispatch-${currentArticleId}`;
  const text = `Read "${article.title}" on RNSMUN The Dispatch:`;

  if (platform === "copy") {
    navigator.clipboard.writeText(url).then(() => {
      showBlogToast("Link copied to clipboard!");
    }).catch(() => {
      showBlogToast("URL: " + url);
    });
  } else if (platform === "whatsapp") {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + " " + url)}`, "_blank");
  } else if (platform === "twitter") {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
  }
};

// Reaction buttons inside reader
window.handleReaderReaction = function(btn, type) {
  if (btn.classList.contains("reacted")) return;
  btn.classList.add("reacted");
  
  const countEl = btn.querySelector(".reaction-count");
  if (countEl) {
    const cur = parseInt(countEl.textContent, 10) || 0;
    countEl.textContent = cur + 1;
  }
  showBlogToast(`Thank you! Stamp recorded for "${type}".`);
};

// Newsletter Form
function setupNewsletterForm() {
  const form = document.getElementById("blogNewsletterForm");
  if (!form) return;

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const input = document.getElementById("newsletterEmailInput");
    if (!input || !input.value.trim()) return;

    input.value = "";
    showBlogToast("Subscribed! You will receive future diplomatic dispatches.");
  });
}

// Toast Feedback
function showBlogToast(msg) {
  let toast = document.getElementById("blogToast");
  if (!toast) {
    toast = document.createElement("div");
    toast.id = "blogToast";
    toast.className = "blog-toast";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add("show");
  setTimeout(() => {
    toast.classList.remove("show");
  }, 2800);
}

// Check URL Hash for deep-linking
function checkUrlHashForArticle() {
  const hash = window.location.hash;
  if (hash && hash.startsWith("#dispatch-")) {
    const id = hash.replace("#dispatch-", "");
    setTimeout(() => {
      openArticleReader(id);
    }, 150);
  }
}
