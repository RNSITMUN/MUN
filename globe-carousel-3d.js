// Globe Carousel 3D (Sphere Orbit)
// Clean, dependency-free vanilla JS implementation extracted from Framer component.

// ───────────────────────────────────────────────────────── core/math

/** Deterministic pseudo-random between 0 and 1. Same input, same output. */
function hash01(a, b) {
  const h = Math.sin(a * 127.1 + b * 311.7) * 43758.5453;
  return h - Math.floor(h);
}

/** Smooth 0→1 ramp. Avoids the hard edge a linear fade produces. */
function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

function clamp(x, min, max) {
  return Math.min(max, Math.max(min, x));
}

/**
 * Positive modulo. In JS `-10 % 3` is `-1`; we want `2`.
 * This is the heart of any infinitely wrapping grid.
 */
function wrap(value, size) {
  return ((value % size) + size) % size;
}

function identity() {
  return [1, 0, 0, 0, 1, 0, 0, 0, 1];
}

/** a × b */
function multiply(a, b) {
  return [
    a[0] * b[0] + a[1] * b[3] + a[2] * b[6],
    a[0] * b[1] + a[1] * b[4] + a[2] * b[7],
    a[0] * b[2] + a[1] * b[5] + a[2] * b[8],
    a[3] * b[0] + a[4] * b[3] + a[5] * b[6],
    a[3] * b[1] + a[4] * b[4] + a[5] * b[7],
    a[3] * b[2] + a[4] * b[5] + a[5] * b[8],
    a[6] * b[0] + a[7] * b[3] + a[8] * b[6],
    a[6] * b[1] + a[7] * b[4] + a[8] * b[7],
    a[6] * b[2] + a[7] * b[5] + a[8] * b[8]
  ];
}

function rotationX(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [1, 0, 0, 0, c, -s, 0, s, c];
}

function rotationY(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, 0, s, 0, 1, 0, -s, 0, c];
}

function rotationZ(a) {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [c, -s, 0, s, c, 0, 0, 0, 1];
}

/** Applies the matrix to a point. Writes into `out` to avoid allocating. */
function transform(m, x, y, z, out) {
  out.x = m[0] * x + m[1] * y + m[2] * z;
  out.y = m[3] * x + m[4] * y + m[5] * z;
  out.z = m[6] * x + m[7] * y + m[8] * z;
}

/**
 * Gram-Schmidt: makes the rows perpendicular and unit length again.
 */
function orthonormalize(m) {
  let [ax, ay, az, bx, by, bz] = m;
  let la = Math.hypot(ax, ay, az) || 1;
  ax /= la;
  ay /= la;
  az /= la;

  // make b perpendicular to a
  const dot = bx * ax + by * ay + bz * az;
  bx -= ax * dot;
  by -= ay * dot;
  bz -= az * dot;
  const lb = Math.hypot(bx, by, bz) || 1;
  bx /= lb;
  by /= lb;
  bz /= lb;

  // c follows from the cross product, so it is correct by construction
  const cx = ay * bz - az * by;
  const cy = az * bx - ax * bz;
  const cz = ax * by - ay * bx;
  return [ax, ay, az, bx, by, bz, cx, cy, cz];
}

/** Always produces a clean list, without empty entries. */
function normalizeImages(input) {
  if (!input) return [];
  const out = [];
  for (const item of input) {
    if (!item) continue;
    if (typeof item === "string") {
      if (item) out.push({ src: item });
      continue;
    }
    if (item.src) out.push({ src: item.src, srcSet: item.srcSet, alt: item.alt });
  }
  return out;
}

/**
 * Update sizes attribute based on width.
 */
function updateSizes(img, cssPx) {
  const bucket = Math.max(50, Math.ceil(cssPx / 50) * 50);
  const value = `${bucket}px`;
  if (img.getAttribute("sizes") !== value) img.sizes = value;
}

/** Sets source, srcset and alt at once, touching nothing that hasn't changed. */
function applyImage(img, source, cssPx) {
  if (cssPx !== undefined) updateSizes(img, cssPx);

  img.onerror = () => {
    const currentSrc = img.src || "";
    if (currentSrc.includes("/globe/")) {
      const cleanUrl = currentSrc.split(/[?#]/)[0];
      const match = cleanUrl.match(/\.(jpg|png|webp|jpeg)$/i);
      if (match) {
        const ext = match[1].toLowerCase();
        let nextSrc = "";
        if (ext === "jpg") {
          nextSrc = currentSrc.replace(/\.jpg([?#]|$)/i, ".png$1");
        } else if (ext === "png") {
          nextSrc = currentSrc.replace(/\.png([?#]|$)/i, ".webp$1");
        } else if (ext === "webp") {
          nextSrc = currentSrc.replace(/\.webp([?#]|$)/i, ".jpeg$1");
        } else if (ext === "jpeg") {
          if (source.fallback) nextSrc = source.fallback;
        }
        if (nextSrc && img.src !== nextSrc) {
          img.src = nextSrc;
          return;
        }
      }
    }
    if (source.fallback && img.src !== source.fallback) {
      img.src = source.fallback;
    }
  };

  if (img.getAttribute("src") !== source.src) img.src = source.src;
  const srcSet = source.srcSet || "";
  if (img.getAttribute("srcset") !== srcSet) {
    if (srcSet) img.srcset = srcSet;
    else img.removeAttribute("srcset");
  }
  const alt = source.alt || "";
  if (img.alt !== alt) img.alt = alt;
}

/** Stable key for detecting whether the image list actually changed. */
function imagesKey(images) {
  return images.map(i => i.src).join("|");
}

/**
 * Stand-in tiles for when no images are set yet.
 */
function placeholderImages(count = 12) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
    `<stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#ececed"/>` +
    `</linearGradient></defs>` +
    `<rect width="400" height="400" fill="url(#g)"/>` +
    `<rect x="1" y="1" width="398" height="398" fill="none" stroke="#000000" stroke-opacity=".07" stroke-width="2"/>` +
    `</svg>`;
  const src = "data:image/svg+xml;utf8," + encodeURIComponent(svg);
  return Array.from({ length: count }, () => ({ src, alt: "" }));
}

// ───────────────────────────────────────────────────────── core/a11y

function prefersReducedMotion() {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function onReducedMotionChange(cb) {
  if (typeof window === "undefined" || !window.matchMedia) return () => { };
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  const handler = () => cb(mq.matches);
  mq.addEventListener("change", handler);
  return () => mq.removeEventListener("change", handler);
}

const FOCUS_RING = "inset 0 0 0 3px #fff, inset 0 0 0 5px rgba(0,0,0,.55)";
const SOFT_TILE_SHADOW = "0px 8px 30px 0px rgba(0,0,0,0.45)";
const DEFAULT_OPEN_SHADOW = "0px 30px 80px 0px rgba(0,0,0,0.6)";

function composeShadow(base, focused) {
  if (!focused) return base || "none";
  return base ? `${base}, ${FOCUS_RING}` : FOCUS_RING;
}

// ────────────────────────────────────────────────────── core/pointer

const TAP_SLOP = 6;
const TAP_TIMEOUT = 500;

function createTapTracker() {
  let downX = 0;
  let downY = 0;
  let downT = 0;
  let travelled = 0;
  let hit = null;
  return {
    down(e, target) {
      downX = e.clientX;
      downY = e.clientY;
      downT = performance.now();
      travelled = 0;
      hit = target;
    },
    move(e) {
      travelled = Math.hypot(e.clientX - downX, e.clientY - downY);
    },
    up() {
      const was = hit;
      hit = null;
      if (!was) return null;
      if (travelled >= TAP_SLOP) return null;
      if (performance.now() - downT >= TAP_TIMEOUT) return null;
      return was;
    }
  };
}

// ────────────────────────────────────────────────────── core/lightbox

const lightboxDefaults = {
  openScale: 0.8,
  openDuration: 520,
  backdropOpacity: 0.72,
  backdropBlur: 10,
  cornerRadius: 6,
  openShadow: DEFAULT_OPEN_SHADOW,
  respectReducedMotion: true
};

const BACKDROP_Z = 999998;
const DETAIL_Z = 999999;

function createLightbox(root, userOptions = {}) {
  let o = { ...lightboxDefaults, ...userOptions };
  let detail = null;
  let detailImg = null;
  let backdrop = null;
  let current = null;
  let returnFocusTo = null;
  let closeTimer = null;

  function ensureOverlay() {
    if (detail) return;
    backdrop = document.createElement("div");
    backdrop.style.cssText = `position:absolute;inset:0;z-index:${BACKDROP_Z};opacity:0;pointer-events:none;` +
      "cursor:zoom-out;backdrop-filter:blur(8px);-webkit-backdrop-filter:blur(8px);will-change:opacity;" +
      "transition:opacity var(--lb-dur) cubic-bezier(0.16, 1, 0.3, 1)";
    backdrop.addEventListener("click", onBackdropClick);
    backdrop.setAttribute("aria-hidden", "true");
    root.appendChild(backdrop);

    detail = document.createElement("div");
    detail.style.cssText = `position:absolute;z-index:${DETAIL_Z};overflow:hidden;opacity:0;pointer-events:none;` +
      "will-change:transform,opacity;transform-origin:top left";
    detail.setAttribute("role", "dialog");
    detail.setAttribute("aria-modal", "true");
    detail.tabIndex = -1;

    detailImg = document.createElement("img");
    detailImg.style.cssText = "width:100%;height:100%;object-fit:contain;display:block;pointer-events:none";
    detailImg.draggable = false;
    detailImg.decoding = "async";
    detailImg.alt = "";
    detail.appendChild(detailImg);
    root.appendChild(detail);
  }

  function relativeRect(el) {
    const a = el.getBoundingClientRect();
    const b = root.getBoundingClientRect();
    return {
      left: a.left - b.left,
      top: a.top - b.top,
      w: a.width,
      h: a.height
    };
  }

  function targetRect(img) {
    const W = root.clientWidth;
    const H = root.clientHeight;
    const ar = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 1;
    const maxW = W * o.openScale;
    const maxH = H * o.openScale;
    let w = maxW;
    let h = w / ar;
    if (h > maxH) {
      h = maxH;
      w = h * ar;
    }
    return {
      left: (W - w) / 2,
      top: (H - h) / 2,
      w,
      h
    };
  }

  function applyRect(el, r) {
    el.style.left = `${r.left}px`;
    el.style.top = `${r.top}px`;
    el.style.width = `${r.w}px`;
    el.style.height = `${r.h}px`;
  }

  function onBackdropClick() {
    close();
  }

  function onKeyDown(e) {
    if (e.key === "Escape" && current) close();
  }

  document.addEventListener("keydown", onKeyDown);

  function open(el, image, index) {
    if (current || !image?.src) return;
    if (closeTimer) {
      clearTimeout(closeTimer);
      closeTimer = null;
    }
    ensureOverlay();
    if (!detail || !detailImg || !backdrop) return;

    document.body.classList.add("globe-lightbox-open");
    root.classList.add("lightbox-active");

    const start = relativeRect(el);
    current = el;
    returnFocusTo = document.activeElement ?? null;
    const dur = o.respectReducedMotion && prefersReducedMotion() ? 0 : 420;

    detail.style.setProperty("--lb-dur", `${dur}ms`);
    backdrop.style.setProperty("--lb-dur", `${dur}ms`);
    backdrop.style.background = `rgba(0,0,0,${o.backdropOpacity})`;

    applyImage(detailImg, image, Math.round(root.clientWidth * o.openScale));
    detail.setAttribute("aria-label", image.alt || `Image ${index + 1}`);
    detail.style.borderRadius = `${o.cornerRadius}px`;
    detail.style.boxShadow = o.openShadow || "none";

    const target = targetRect(detailImg);
    // Set target dimensions once without animating layout properties
    detail.style.left = `${target.left}px`;
    detail.style.top = `${target.top}px`;
    detail.style.width = `${target.w}px`;
    detail.style.height = `${target.h}px`;

    // Invert: GPU hardware-accelerated transform from starting thumbnail
    const scaleX = Math.max(0.01, start.w / target.w);
    const scaleY = Math.max(0.01, start.h / target.h);
    const transX = start.left - target.left;
    const transY = start.top - target.top;

    detail.style.transformOrigin = "top left";
    detail.style.transition = "none";
    detail.style.transform = `translate3d(${transX}px, ${transY}px, 0) scale(${scaleX}, ${scaleY})`;
    detail.style.opacity = "1";

    // Play smoothly on GPU compositor
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ease = "cubic-bezier(0.16, 1, 0.3, 1)";
        detail.style.transition = `transform ${dur}ms ${ease}, opacity ${Math.round(dur * 0.4)}ms ease`;
        detail.style.transform = "translate3d(0, 0, 0) scale(1, 1)";

        backdrop.style.opacity = "1";
        backdrop.style.pointerEvents = "auto";
        detail.style.pointerEvents = "auto";
        detail.focus({ preventScroll: true });
      });
    });

    o.onOpen?.(index, image.src);
  }

  function close(animate = true) {
    if (!current || !detail || !backdrop) return;

    const el = current;
    backdrop.style.opacity = "0";
    backdrop.style.pointerEvents = "none";
    detail.style.pointerEvents = "none";
    detail.removeAttribute("aria-label");

    returnFocusTo?.focus({ preventScroll: true });
    returnFocusTo = null;

    if (!animate) {
      document.body.classList.remove("globe-lightbox-open");
      root.classList.remove("lightbox-active");
      detail.style.transition = "none";
      detail.style.opacity = "0";
      detail.style.transform = "";
      current = null;
      o.onClose?.();
      return;
    }

    const target = targetRect(detailImg);
    const nowRect = relativeRect(el);
    const endScaleX = Math.max(0.01, nowRect.w / target.w);
    const endScaleY = Math.max(0.01, nowRect.h / target.h);
    const endTransX = nowRect.left - target.left;
    const endTransY = nowRect.top - target.top;
    const dur = o.respectReducedMotion && prefersReducedMotion() ? 0 : 360;

    const ease = "cubic-bezier(0.16, 1, 0.3, 1)";
    detail.style.transition = `transform ${dur}ms ${ease}, opacity ${dur}ms ease`;
    detail.style.transform = `translate3d(${endTransX}px, ${endTransY}px, 0) scale(${endScaleX}, ${endScaleY})`;
    detail.style.opacity = "0";

    closeTimer = setTimeout(() => {
      document.body.classList.remove("globe-lightbox-open");
      root.classList.remove("lightbox-active");
      if (detail) {
        detail.style.transform = "";
        detail.style.transition = "none";
        detail.style.opacity = "0";
      }
      current = null;
      closeTimer = null;
      o.onClose?.();
    }, dur);
  }

  return {
    open,
    close,
    get openElement() {
      return current;
    },
    update(next) {
      o = { ...o, ...next };
    },
    destroy() {
      if (closeTimer) clearTimeout(closeTimer);
      document.removeEventListener("keydown", onKeyDown);
      backdrop?.removeEventListener("click", onBackdropClick);
      backdrop?.remove();
      detail?.remove();
      backdrop = null;
      detail = null;
      detailImg = null;
      current = null;
    }
  };
}

// ────────────────────────────────────────────────────── sphere orbit

const sphereDefaults = {
  images: [],
  label: "Rotating image sphere",
  keyboard: true,
  count: 40,
  radius: 300,
  autoFit: true,
  tileWidth: 75,
  tileHeight: 94,
  distance: 750,
  tilt: 0,
  autoRotate: true,
  axis: "y",
  speed: 14,
  direction: 1,
  depthFade: 0.8,
  hideBack: false,
  interactive: true,
  draggable: true,
  friction: 0.94,
  openable: true,
  ...lightboxDefaults,
  cornerRadius: 4,
  tileShadow: ""
};

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));
const DEG = Math.PI / 180;
const FIT_REFERENCE = 760;

export function createSphereOrbit(root, userOptions = {}) {
  let o = { ...sphereDefaults, ...userOptions };
  const withFallback = list => {
    const normalized = normalizeImages(list);
    return normalized.length > 0 ? normalized : placeholderImages();
  };

  let pics = withFallback(o.images);
  let W = 0;
  let H = 0;
  let tiles = [];
  let R = identity();
  let velYaw = 0;
  let velPitch = 0;
  let spun = 0;

  const pt = { x: 0, y: 0, z: 0 };
  let dragging = false;
  let lastX = 0;
  let lastY = 0;
  let lastT = 0;
  let lastFrame = 0;
  let raf = 0;
  let destroyed = false;

  const tap = createTapTracker();
  const tileByEl = new WeakMap();
  let lightbox = null;
  let ro = null;
  let focusEl = null;
  let stilstaan = o.respectReducedMotion && prefersReducedMotion();

  const stopMotionWatch = onReducedMotionChange(reduced => {
    stilstaan = o.respectReducedMotion && reduced;
  });

  const prevPosition = root.style.position;
  if (getComputedStyle(root).position === "static") root.style.position = "relative";
  const prevOverflow = root.style.overflow;
  const prevTouch = root.style.touchAction;
  const prevSelect = root.style.userSelect;

  root.style.overflow = "hidden";
  root.style.touchAction = "pan-y";
  root.style.userSelect = "none";
  root.style.outline = "none";
  root.setAttribute("role", "group");
  root.setAttribute("aria-label", o.label);
  root.setAttribute("aria-roledescription", "rotatable image sphere");

  let cachedTileW = 0;
  let cachedTileH = 0;
  let cachedRadius = 0;
  let cachedDist = 0;

  function updateDimensions() {
    W = root.clientWidth;
    H = root.clientHeight;
    const fit = o.autoFit
      ? (Math.min(W, H) < 500 ? Math.min(W, H) / 520 : Math.min(W, H) / FIT_REFERENCE)
      : 1;
    cachedRadius = o.radius * fit;
    cachedTileW = o.tileWidth * fit;
    cachedTileH = o.tileHeight * fit;
    cachedDist = Math.max(o.distance * fit, cachedRadius * 1.05);

    // Apply fixed base dimensions to all tile elements once
    for (let i = 0; i < tiles.length; i++) {
      tiles[i].el.style.width = `${cachedTileW}px`;
      tiles[i].el.style.height = `${cachedTileH}px`;
    }
  }

  function build() {
    W = root.clientWidth;
    H = root.clientHeight;
    for (const t of tiles) t.el.remove();
    tiles = [];
    focusEl = null;
    const n = Math.max(1, Math.floor(o.count));

    for (let i = 0; i < n; i++) {
      const uy = n === 1 ? 0 : 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(Math.max(0, 1 - uy * uy));
      const theta = i * GOLDEN_ANGLE;

      const el = document.createElement("div");
      el.style.cssText = "position:absolute;top:0;left:0;overflow:hidden;will-change:transform,opacity;" +
        `border-radius:${o.cornerRadius}px;box-shadow:${o.tileShadow || "none"}`;

      const img = document.createElement("img");
      img.style.cssText = "width:100%;height:100%;object-fit:cover;display:block;pointer-events:none";
      img.draggable = false;
      img.alt = "";
      img.decoding = "async";

      el.style.cursor = o.openable && o.interactive ? "zoom-in" : "";
      el.setAttribute("role", "img");
      el.appendChild(img);
      root.appendChild(el);

      const tile = {
        el,
        img,
        index: -1,
        lastZi: -1,
        lastOp: -1,
        ux: Math.cos(theta) * r,
        uy,
        uz: Math.sin(theta) * r
      };
      tileByEl.set(el, tile);
      tiles.push(tile);
    }
    updateDimensions();
  }

  function layout() {
    if (tiles.length === 0 || pics.length === 0) return;
    const cx = W / 2;
    const cy = H / 2;

    const radius = cachedRadius;
    const tileW = cachedTileW;
    const tileH = cachedTileH;
    const dist = cachedDist;

    const M = o.tilt ? multiply(rotationX(o.tilt * DEG), R) : R;

    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      transform(M, t.ux, t.uy, t.uz, pt);
      const z2 = pt.z;
      const wx = pt.x * radius;
      const wy = pt.y * radius;
      const wz = pt.z * radius;

      const scale = dist / (dist - wz);
      const x = cx + wx * scale - tileW / 2;
      const y = cy + wy * scale - tileH / 2;

      const front = (z2 + 1) / 2;
      const s = t.el.style;

      // Pure GPU transform - no width/height layout recalculation during rotation!
      s.transform = `translate3d(${x}px, ${y}px, 0) scale(${scale})`;

      const zi = Math.round(front * 1e3);
      if (t.lastZi !== zi) {
        s.zIndex = String(zi);
        t.lastZi = zi;
      }

      const isHidden = t.el === lightbox?.openElement;
      const op = isHidden ? 0 : Math.round((o.hideBack ? (z2 >= 0 ? 1 : 0) : 1 - o.depthFade * (1 - front)) * 100) / 100;
      if (t.lastOp !== op) {
        s.opacity = String(op);
        t.lastOp = op;
      }

      const idx = i % pics.length;
      if (idx !== t.index) {
        t.index = idx;
        applyImage(t.img, pics[idx], tileW * 1.5);
      }
    }
  }

  let isGlobeVisible = true;
  let globeObserver = null;
  if (typeof IntersectionObserver !== "undefined") {
    globeObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        isGlobeVisible = entry.isIntersecting;
        if (isGlobeVisible && !raf && !destroyed) {
          lastFrame = performance.now();
          raf = requestAnimationFrame(frame);
        }
      }
    }, { rootMargin: "100px" });
    globeObserver.observe(root);
  }

  function frame(now) {
    if (destroyed) return;
    if (!isGlobeVisible) {
      raf = 0;
      return;
    }

    // Cap dt to 0.033s to eliminate large jumps or hitches on page refresh / tab wakeup
    const dt = lastFrame ? Math.min(0.033, (now - lastFrame) / 1e3) : 0.016;
    lastFrame = now;

    // Pause globe layout computations while an image is open in lightbox for 100% smooth modal animation
    if (lightbox?.openElement) {
      raf = requestAnimationFrame(frame);
      return;
    }

    if (!dragging) {
      if (o.autoRotate && !stilstaan) {
        const a = o.speed * DEG * o.direction * dt;
        if (o.axis === "x") R = multiply(R, rotationX(a));
        else if (o.axis === "z") R = multiply(R, rotationZ(a));
        else if (o.axis === "tumble") {
          R = multiply(multiply(R, rotationY(a)), rotationX(a * 0.618));
        } else R = multiply(R, rotationY(a));
      }

      if (velYaw || velPitch) {
        R = multiply(multiply(rotationY(velYaw * dt), rotationX(velPitch * dt)), R);
        const decay = Math.pow(o.friction, dt * 60);
        velYaw *= decay;
        velPitch *= decay;
        if (Math.abs(velYaw) < 5e-4) velYaw = 0;
        if (Math.abs(velPitch) < 5e-4) velPitch = 0;
      }

      if (++spun % 240 === 0) R = orthonormalize(R);
    }

    layout();
    if (o.keyboard && document.activeElement === root) {
      markFocus();
    }
    raf = requestAnimationFrame(frame);
  }

  const onDown = e => {
    if (lightbox?.openElement) return;

    const hit = e.target?.closest?.("div");
    const tile = hit ? tileByEl.get(hit) ?? null : null;
    if (!tile) return;

    lastX = e.clientX;
    lastY = e.clientY;
    lastT = performance.now();
    velYaw = 0;
    velPitch = 0;

    if (o.draggable) {
      dragging = true;
      root.style.cursor = "grabbing";
      try {
        root.setPointerCapture(e.pointerId);
      } catch { }
    }

    tap.down(e, tile);
  };

  const onMove = e => {
    tap.move(e);
    if (!dragging) return;

    const now = performance.now();
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    const dt = Math.max(1, now - lastT) / 1e3;

    // Use a constant reference width (1500) so dragging speed is identical on both PC and mobile viewports
    const perPx = Math.PI / 1500;
    const ay = dx * perPx;
    const ax = dy * perPx;

    R = multiply(multiply(rotationY(ay), rotationX(ax)), R);

    // Smooth inertia tracking with exponential moving average (EMA)
    const instantYaw = ay / dt;
    const instantPitch = ax / dt;
    velYaw = velYaw ? velYaw * 0.3 + instantYaw * 0.7 : instantYaw;
    velPitch = velPitch ? velPitch * 0.3 + instantPitch * 0.7 : instantPitch;

    lastX = e.clientX;
    lastY = e.clientY;
    lastT = now;
  };

  const onUp = () => {
    if (dragging) {
      dragging = false;
      root.style.cursor = "default";
    }
    const tile = tap.up();
    if (!tile || !o.openable || lightbox?.openElement) return;
    if (tile.index < 0 || !pics[tile.index]) return;
    if (tile.lastOp < 0.35) return;

    velYaw = 0;
    velPitch = 0;
    lightbox?.open(tile.el, pics[tile.index], tile.index);
  };

  function frontTile() {
    let beste = null;
    let besteZ = -Infinity;
    for (let i = 0; i < tiles.length; i++) {
      const t = tiles[i];
      if (t.index < 0) continue;
      if (t.lastZi > besteZ) {
        besteZ = t.lastZi;
        beste = t;
      }
    }
    return beste;
  }

  function markFocus() {
    const target = document.activeElement === root ? frontTile() : null;
    const el = target?.el ?? null;
    if (el === focusEl) return;
    if (focusEl) focusEl.style.boxShadow = composeShadow(o.tileShadow, false);
    if (el) el.style.boxShadow = composeShadow(o.tileShadow, true);
    focusEl = el;
  }

  function refreshShadows() {
    for (const t of tiles) {
      t.el.style.boxShadow = composeShadow(o.tileShadow, t.el === focusEl);
    }
  }

  const onKey = e => {
    if (!o.keyboard || lightbox?.openElement) return;
    const stap = (e.shiftKey ? 24 : 8) * DEG;
    switch (e.key) {
      case "ArrowLeft":
        R = multiply(rotationY(-stap), R);
        break;
      case "ArrowRight":
        R = multiply(rotationY(stap), R);
        break;
      case "ArrowUp":
        R = multiply(rotationX(-stap), R);
        break;
      case "ArrowDown":
        R = multiply(rotationX(stap), R);
        break;
      case "Enter":
      case " ": {
        if (!o.openable) return;
        const t = frontTile();
        if (!t || t.index < 0 || !pics[t.index]) return;
        velYaw = 0;
        velPitch = 0;
        lightbox?.open(t.el, pics[t.index], t.index);
        break;
      }
      default:
        return;
    }
    e.preventDefault();
    velYaw = 0;
    velPitch = 0;
  };

  function attach() {
    root.style.outline = "none";
    root.style.cursor = "default";
    root.tabIndex = 0;
    root.addEventListener("keydown", onKey);
    root.addEventListener("pointerdown", onDown);
    root.addEventListener("pointermove", onMove);
    root.addEventListener("pointerup", onUp);
    root.addEventListener("pointercancel", onUp);
  }

  function detach() {
    root.style.cursor = "";
    root.removeAttribute("tabindex");
    root.removeEventListener("keydown", onKey);
    root.removeEventListener("pointerdown", onDown);
    root.removeEventListener("pointermove", onMove);
    root.removeEventListener("pointerup", onUp);
    root.removeEventListener("pointercancel", onUp);
  }

  function start() {
    if (o.interactive) {
      attach();
      if (o.openable && !lightbox) lightbox = createLightbox(root, o);
      lastFrame = 0;
      raf = requestAnimationFrame(frame);
    } else {
      layout();
    }
  }

  build();
  start();

  ro = new ResizeObserver(() => {
    lightbox?.close(false);
    updateDimensions();
    if (!o.interactive) layout();
  });
  ro.observe(root);

  return {
    update(next) {
      const needsRebuild =
        (next.count !== undefined && next.count !== o.count) ||
        (next.cornerRadius !== undefined && next.cornerRadius !== o.cornerRadius);
      const wasInteractive = o.interactive;
      const imagesChanged = next.images !== undefined && next.images !== o.images;
      const shadowChanged = next.tileShadow !== undefined && next.tileShadow !== o.tileShadow;

      o = { ...o, ...next };

      if (shadowChanged) refreshShadows();
      if (imagesChanged) {
        pics = withFallback(o.images);
        for (const t of tiles) t.index = -1;
      }

      lightbox?.update(o);

      if (needsRebuild) {
        lightbox?.close(false);
        build();
      } else {
        updateDimensions();
      }

      if (o.interactive !== wasInteractive) {
        lightbox?.close(false);
        cancelAnimationFrame(raf);
        detach();
        start();
      } else if (!o.interactive) {
        layout();
      }
    },
    resize() {
      lightbox?.close(false);
      updateDimensions();
      if (!o.interactive) layout();
    },
    destroy() {
      destroyed = true;
      cancelAnimationFrame(raf);
      ro?.disconnect();
      detach();
      lightbox?.destroy();
      lightbox = null;
      for (const t of tiles) t.el.remove();
      tiles = [];
      stopMotionWatch();
      root.style.position = prevPosition;
      root.style.overflow = prevOverflow;
      root.style.touchAction = prevTouch;
      root.style.userSelect = prevSelect;
      root.style.cursor = "";
      root.removeAttribute("tabindex");
      root.removeAttribute("role");
      root.removeAttribute("aria-label");
      root.removeAttribute("aria-roledescription");
    }
  };
}