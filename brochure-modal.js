// brochure-modal.js - Ultra-Fast In-Website PDF Viewer with Interactive Embedded Links
const BROCHURE_URL = '/assets/broucher/RNS%20MUN%202026-%20ConferenceBrochure.pdf';

let pdfDoc = null;
let baseTargetWidth = 720;
let currentZoom = 1;
let renderedPages = new Set();
let pageObserver = null;
let isPreloading = false;

// Immediate background warm-up
if (typeof window !== 'undefined') {
  setTimeout(preloadBrochure, 150);

  window.addEventListener('DOMContentLoaded', () => {
    const btn = document.getElementById('hero-brochure-btn');
    if (btn) {
      btn.addEventListener('pointerenter', preloadBrochure, { once: true, passive: true });
      btn.addEventListener('touchstart', preloadBrochure, { once: true, passive: true });
    }
  });
}

async function preloadBrochure() {
  if (pdfDoc || isPreloading) return;
  isPreloading = true;

  try {
    await loadPdfJsScript();
    const lib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    if (lib) {
      lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      const task = lib.getDocument({
        url: BROCHURE_URL,
        rangeChunkSize: 65536 * 4,
        disableAutoFetch: false,
        disableStream: false
      });
      pdfDoc = await task.promise;

      const pageCountTag = document.getElementById('brochure-page-count');
      if (pageCountTag) pageCountTag.textContent = `${pdfDoc.numPages} Pages`;

      // Build DOM slots and eagerly render all pages in the background
      await buildPageSlots();
      renderAllPages(baseTargetWidth || getBasePageWidth());
    }
  } catch (e) {
    console.warn('Background preload skipped, will load on click:', e);
  } finally {
    isPreloading = false;
  }
}

export function openBrochureModal(e) {
  if (e) {
    e.preventDefault();
    e.stopPropagation();
  }

  const modal = document.getElementById('brochure-modal');
  if (!modal) return;

  modal.classList.add('is-open');
  document.documentElement.classList.add('brochure-modal-open');
  document.body.classList.add('brochure-modal-open');
  currentZoom = 1.0;
  applyZoom();
  updateZoomButtonsState();
  loadBrochureContent();
  initPinchToZoom();
}

export function closeBrochureModal() {
  const modal = document.getElementById('brochure-modal');
  if (!modal) return;

  modal.classList.remove('is-open');
  document.documentElement.classList.remove('brochure-modal-open');
  document.body.classList.remove('brochure-modal-open');
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3.0;
const ZOOM_STEP = 0.25;

export function updateZoomButtonsState() {
  const zoomOutBtn = document.getElementById('brochure-zoom-out');
  const zoomInBtn = document.getElementById('brochure-zoom-in');

  if (zoomOutBtn) {
    const isMin = currentZoom <= MIN_ZOOM + 0.01;
    zoomOutBtn.disabled = isMin;
    zoomOutBtn.classList.toggle('is-disabled', isMin);
    zoomOutBtn.setAttribute('aria-disabled', String(isMin));
    zoomOutBtn.title = isMin ? 'Minimum zoom reached (50%)' : `Zoom Out (${Math.round(currentZoom * 100)}%)`;
  }
  if (zoomInBtn) {
    const isMax = currentZoom >= MAX_ZOOM - 0.01;
    zoomInBtn.disabled = isMax;
    zoomInBtn.classList.toggle('is-disabled', isMax);
    zoomInBtn.setAttribute('aria-disabled', String(isMax));
    zoomInBtn.title = isMax ? 'Maximum zoom reached (300%)' : `Zoom In (${Math.round(currentZoom * 100)}%)`;
  }
}

export function zoomInBrochure() {
  if (currentZoom < MAX_ZOOM - 0.01) {
    zoomByDelta(ZOOM_STEP);
  }
}

export function zoomOutBrochure() {
  if (currentZoom > MIN_ZOOM + 0.01) {
    zoomByDelta(-ZOOM_STEP);
  }
}

function zoomByDelta(delta) {
  const modalBody = document.getElementById('brochure-modal-body');
  const container = document.getElementById('brochure-pages-container');
  if (!modalBody || !container) return;

  const prevZoom = currentZoom;
  // Snap to clean 0.25 multiples (0.5, 0.75, 1.0, 1.25, 1.5, 1.75, etc.)
  let nextZoom = Math.round((prevZoom + delta) * 4) / 4;
  nextZoom = Math.min(Math.max(nextZoom, MIN_ZOOM), MAX_ZOOM);
  if (Math.abs(nextZoom - prevZoom) < 0.01) return;

  const bodyRect = modalBody.getBoundingClientRect();
  const viewportCenterY = bodyRect.top + (bodyRect.height / 2);

  // 1. Identify which page slot is currently centered in the viewport
  const slots = container.querySelectorAll('.brochure-page-slot');
  let activeSlot = null;
  let minDistance = Infinity;

  for (const slot of slots) {
    const rect = slot.getBoundingClientRect();
    if (rect.top <= viewportCenterY && rect.bottom >= viewportCenterY) {
      activeSlot = slot;
      break;
    }
    const dist = Math.min(Math.abs(rect.top - viewportCenterY), Math.abs(rect.bottom - viewportCenterY));
    if (dist < minDistance) {
      minDistance = dist;
      activeSlot = slot;
    }
  }

  // 2. Determine relative vertical fraction within that active page slot
  let fraction = 0.5;
  if (activeSlot) {
    const sRect = activeSlot.getBoundingClientRect();
    if (sRect.height > 0) {
      fraction = Math.max(0, Math.min(1, (viewportCenterY - sRect.top) / sRect.height));
    }
  }

  // 3. Apply the new zoom level and update button states
  currentZoom = nextZoom;
  applyZoom();
  updateZoomButtonsState();

  // 4. Anchor scroll directly to the exact focal point without drifting
  const prevTransition = container.style.transition;
  container.style.transition = 'none';
  void container.offsetHeight; // Force layout recalculation

  let targetScrollTop = 0;
  if (activeSlot) {
    const newAnchorY = activeSlot.offsetTop + (activeSlot.offsetHeight * fraction);
    targetScrollTop = Math.max(0, newAnchorY - (modalBody.clientHeight / 2));
  }

  // Horizontally: center page cleanly in viewport
  let targetScrollLeft = 0;
  if (container.offsetWidth > modalBody.clientWidth) {
    targetScrollLeft = Math.max(0, (container.offsetWidth - modalBody.clientWidth) / 2);
  }

  container.style.transition = prevTransition;

  modalBody.scrollTo({
    left: targetScrollLeft,
    top: targetScrollTop,
    behavior: 'smooth'
  });
}

function getBasePageWidth() {
  const modalBody = document.getElementById('brochure-modal-body');
  const isMobile = window.innerWidth <= 768;
  if (isMobile) {
    const bodyWidth = modalBody ? modalBody.clientWidth : window.innerWidth;
    return Math.max(260, (bodyWidth || window.innerWidth) - 20);
  }
  const isDesktop = window.innerWidth >= 900;
  return isDesktop ? Math.min(window.innerWidth * 0.58, 860) : Math.min(window.innerWidth - 32, 700);
}

function applyZoom() {
  const container = document.getElementById('brochure-pages-container');
  if (!container) return;

  const baseWidth = getBasePageWidth();
  baseTargetWidth = baseWidth;
  const newWidth = Math.round(baseWidth * currentZoom);
  container.style.setProperty('--page-width', `${newWidth}px`);
}

// ─── High-Performance Smooth Pinch-to-Zoom & Double-Tap (60/120fps) ───
let isPinching = false;
let pinchStartDist = 0;
let pinchStartZoom = 1;
let pinchDocX = 0;
let pinchDocY = 0;
let lastTapTime = 0;
let rafPending = false;
let pinchInitialized = false;

function initPinchToZoom() {
  if (pinchInitialized) return;
  const modalBody = document.getElementById('brochure-modal-body');
  const container = document.getElementById('brochure-pages-container');
  if (!modalBody || !container) return;
  pinchInitialized = true;

  modalBody.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      isPinching = true;
      const t1 = e.touches[0];
      const t2 = e.touches[1];

      pinchStartDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      pinchStartZoom = currentZoom;

      const midX = (t1.clientX + t2.clientX) / 2;
      const midY = (t1.clientY + t2.clientY) / 2;
      const bodyRect = modalBody.getBoundingClientRect();

      pinchDocX = modalBody.scrollLeft + (midX - bodyRect.left);
      pinchDocY = modalBody.scrollTop + (midY - bodyRect.top);

      modalBody.classList.add('is-pinching');
    } else if (e.touches.length === 1) {
      const now = Date.now();
      if (now - lastTapTime < 280) {
        handleDoubleTap(e.touches[0]);
      }
      lastTapTime = now;
    }
  }, { passive: false });

  modalBody.addEventListener('touchmove', e => {
    if (!isPinching || e.touches.length !== 2) return;
    e.preventDefault(); // Prevent native browser viewport scaling or page bounce

    const t1 = e.touches[0];
    const t2 = e.touches[1];
    const currentDist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);

    if (pinchStartDist > 0) {
      const scale = currentDist / pinchStartDist;
      let targetZoom = pinchStartZoom * scale;
      targetZoom = Math.min(Math.max(targetZoom, MIN_ZOOM), MAX_ZOOM);

      const currentMidX = (t1.clientX + t2.clientX) / 2;
      const currentMidY = (t1.clientY + t2.clientY) / 2;

      if (!rafPending) {
        rafPending = true;
        requestAnimationFrame(() => {
          rafPending = false;
          const ratio = targetZoom / pinchStartZoom;
          currentZoom = targetZoom;
          applyZoom();
          updateZoomButtonsState();

          // Pin the touch point directly under the fingers in real time!
          const bRect = modalBody.getBoundingClientRect();
          const targetDocX = pinchDocX * ratio;
          const targetDocY = pinchDocY * ratio;

          modalBody.scrollLeft = Math.max(0, targetDocX - (currentMidX - bRect.left));
          modalBody.scrollTop = Math.max(0, targetDocY - (currentMidY - bRect.top));
        });
      }
    }
  }, { passive: false });

  const finishPinch = () => {
    if (!isPinching) return;
    isPinching = false;
    modalBody.classList.remove('is-pinching');

    if (currentZoom < MIN_ZOOM) {
      currentZoom = MIN_ZOOM;
      applyZoom();
    }
    updateZoomButtonsState();
  };

  modalBody.addEventListener('touchend', finishPinch);
  modalBody.addEventListener('touchcancel', finishPinch);

  // Trackpad pinch-to-zoom on laptops (wheel + ctrlKey)
  modalBody.addEventListener('wheel', e => {
    if (e.ctrlKey) {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.05 : 0.95;
      currentZoom = Math.min(Math.max(Number((currentZoom * zoomFactor).toFixed(2)), MIN_ZOOM), MAX_ZOOM);
      applyZoom();
      updateZoomButtonsState();
    }
  }, { passive: false });

  window.addEventListener('resize', () => {
    const modal = document.getElementById('brochure-modal');
    if (modal && modal.classList.contains('is-open')) {
      applyZoom();
      updateZoomButtonsState();
    }
  }, { passive: true });
}

function handleDoubleTap(touch) {
  const modalBody = document.getElementById('brochure-modal-body');
  const container = document.getElementById('brochure-pages-container');
  if (!modalBody || !container) return;

  if (currentZoom > 1.15) {
    currentZoom = 1.0;
    applyZoom();
    updateZoomButtonsState();
    modalBody.scrollTo({ left: 0, behavior: 'smooth' });
  } else {
    currentZoom = 1.75;
    applyZoom();
    updateZoomButtonsState();

    setTimeout(() => {
      let targetScrollLeft = 0;
      if (container.offsetWidth > modalBody.clientWidth) {
        targetScrollLeft = Math.max(0, (container.offsetWidth - modalBody.clientWidth) / 2);
      }
      modalBody.scrollTo({
        left: targetScrollLeft,
        behavior: 'smooth'
      });
    }, 40);
  }
}

window.openBrochureModal = openBrochureModal;
window.closeBrochureModal = closeBrochureModal;
window.zoomInBrochure = zoomInBrochure;
window.zoomOutBrochure = zoomOutBrochure;
window.updateZoomButtonsState = updateZoomButtonsState;

async function buildPageSlots() {
  const list = document.getElementById('brochure-pages-container');
  if (!list || list.children.length > 0 || !pdfDoc) return;

  const samplePage = await pdfDoc.getPage(1);
  const sampleViewport = samplePage.getViewport({ scale: 1 });

  for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
    const pageSlot = document.createElement('div');
    pageSlot.className = 'brochure-page-slot';
    pageSlot.dataset.pageNum = pageNum;

    const canvasWrap = document.createElement('div');
    canvasWrap.className = 'brochure-canvas-wrap';

    const canvas = document.createElement('canvas');
    canvas.className = 'brochure-canvas';
    canvas.style.aspectRatio = `${sampleViewport.width} / ${sampleViewport.height}`;

    const annotLayer = document.createElement('div');
    annotLayer.className = 'brochure-annotation-layer';

    canvasWrap.appendChild(canvas);
    canvasWrap.appendChild(annotLayer);

    const pageNumLbl = document.createElement('span');
    pageNumLbl.className = 'brochure-page-number';
    pageNumLbl.textContent = `Page ${pageNum} of ${pdfDoc.numPages}`;

    pageSlot.appendChild(canvasWrap);
    pageSlot.appendChild(pageNumLbl);
    list.appendChild(pageSlot);
  }
}

let isRenderingAll = false;

async function renderAllPages(targetWidth) {
  if (!pdfDoc || isRenderingAll) return;
  isRenderingAll = true;

  try {
    const width = targetWidth || baseTargetWidth || getBasePageWidth();
    for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
      if (!renderedPages.has(pageNum)) {
        await renderPage(pageNum, width);
      }
    }
  } catch (err) {
    console.warn('Sequential page rendering error:', err);
  } finally {
    isRenderingAll = false;
  }
}

let scrollRendererAttached = false;
function setupScrollRenderer(targetWidth) {
  if (scrollRendererAttached) return;
  const modalBody = document.getElementById('brochure-modal-body');
  if (!modalBody) return;
  scrollRendererAttached = true;

  const onScroll = () => {
    const bodyRect = modalBody.getBoundingClientRect();
    const buffer = 1000;
    const slots = modalBody.querySelectorAll('.brochure-page-slot');

    slots.forEach(slot => {
      const pageNum = parseInt(slot.dataset.pageNum, 10);
      if (pageNum && !renderedPages.has(pageNum)) {
        const r = slot.getBoundingClientRect();
        if (r.bottom >= bodyRect.top - buffer && r.top <= bodyRect.bottom + buffer) {
          renderPage(pageNum, targetWidth || baseTargetWidth || getBasePageWidth());
        }
      }
    });
  };

  modalBody.addEventListener('scroll', onScroll, { passive: true });
}

async function loadBrochureContent() {
  const body = document.getElementById('brochure-modal-body');
  if (!body) return;

  let container = document.getElementById('brochure-pages-container');
  if (!container) {
    body.innerHTML = `
      <div class="brochure-loading-state" id="brochure-loader">
        <div class="brochure-spinner"></div>
        <p>Opening brochure...</p>
      </div>
      <div class="brochure-pages-container" id="brochure-pages-container"></div>
    `;
    container = document.getElementById('brochure-pages-container');
  }

  if (!pdfDoc) {
    await loadPdfJsScript();
    const lib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    pdfDoc = await lib.getDocument({
      url: BROCHURE_URL,
      rangeChunkSize: 65536 * 4,
      disableAutoFetch: false,
      disableStream: false
    }).promise;
  }

  const loader = document.getElementById('brochure-loader');
  if (loader) loader.style.display = 'none';

  const pageCountTag = document.getElementById('brochure-page-count');
  if (pageCountTag) pageCountTag.textContent = `${pdfDoc.numPages} Pages`;

  currentZoom = 1.0;
  applyZoom();
  updateZoomButtonsState();

  await buildPageSlots();

  const targetW = baseTargetWidth || getBasePageWidth();

  // Render Page 1 and Page 2 first for instant viewing
  await Promise.all([
    renderPage(1, targetW),
    pdfDoc.numPages >= 2 ? renderPage(2, targetW) : Promise.resolve()
  ]);

  // Eagerly render all remaining pages (3 through 15) in sequential loop
  renderAllPages(targetW);

  setupScrollRenderer(targetW);
  initPinchToZoom();
  applyZoom();
}

async function renderPage(pageNum, targetWidth) {
  if (renderedPages.has(pageNum) || !pdfDoc) return;
  renderedPages.add(pageNum);

  try {
    const page = await pdfDoc.getPage(pageNum);
    const slot = document.querySelector(`.brochure-page-slot[data-page-num="${pageNum}"]`);
    if (!slot) {
      renderedPages.delete(pageNum);
      return;
    }

    const canvas = slot.querySelector('canvas');
    if (!canvas) {
      renderedPages.delete(pageNum);
      return;
    }

    const unscaledViewport = page.getViewport({ scale: 1 });
    const targetW = targetWidth || baseTargetWidth || getBasePageWidth();
    const renderScale = Math.max(1.5, targetW / unscaledViewport.width);
    const viewport = page.getViewport({ scale: renderScale });

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(viewport.width * pixelRatio);
    canvas.height = Math.floor(viewport.height * pixelRatio);

    const ctx = canvas.getContext('2d', { alpha: false });
    ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    await page.render({ canvasContext: ctx, viewport }).promise;

    // Render interactive link annotation layer over the page
    await renderAnnotationLayer(page, slot, unscaledViewport);
  } catch (err) {
    console.warn(`Render error on page ${pageNum}:`, err);
    renderedPages.delete(pageNum);
  }
}

const CONTENTS_PAGE_NUM = 2;

const CONTENTS_PAGE_ITEMS = [
  { title: 'About RNSIT', rect: [25.10, 712.35, 142.0, 736.82], targetPage: 3, numRect: [565.0, 712.35, 578.0, 736.82] },
  { title: 'About RNSIT MUN Society', rect: [25.10, 671.26, 260.0, 695.74], targetPage: 3, numRect: [565.0, 671.26, 578.0, 695.74] },
  { title: 'Letter from the Secretary-General', rect: [25.10, 630.17, 296.0, 654.65], targetPage: 4, numRect: [565.0, 630.17, 578.0, 654.65] },
  { title: 'About RNSMUN 2026', rect: [25.10, 589.45, 216.0, 613.46], targetPage: 5, numRect: [565.0, 589.45, 578.0, 613.46] },
  { title: 'Registration & Eligibility Criteria', rect: [25.10, 547.75, 292.0, 571.76], targetPage: 6, numRect: [565.0, 547.75, 578.0, 571.76] },
  { title: 'Fee Structure', rect: [25.10, 507.52, 145.0, 531.99], targetPage: 6, numRect: [565.0, 507.52, 578.0, 531.99] },
  { title: 'Prize Pool', rect: [25.10, 465.61, 115.0, 490.08], targetPage: 7, numRect: [565.0, 465.61, 578.0, 490.08] },
  { title: 'List of Committees', rect: [25.10, 424.27, 180.0, 448.28], targetPage: 7, numRect: [565.0, 424.27, 578.0, 448.28] },
  { title: 'UNSC', rect: [25.10, 383.43, 86.0, 407.90], targetPage: 8, numRect: [565.0, 383.43, 578.0, 407.90] },
  { title: 'UNHRC', rect: [25.10, 342.34, 105.0, 366.82], targetPage: 9, numRect: [565.0, 342.34, 578.0, 366.82] },
  { title: 'DISEC', rect: [25.10, 301.25, 90.0, 325.73], targetPage: 10, numRect: [565.0, 301.25, 578.0, 325.73] },
  { title: 'LOK SABHA', rect: [25.10, 260.38, 140.0, 284.85], targetPage: 11, numRect: [565.0, 260.38, 578.0, 284.85] },
  { title: 'UNODC', rect: [25.10, 219.08, 106.0, 243.55], targetPage: 12, numRect: [565.0, 219.08, 578.0, 243.55] },
  { title: 'IPC', rect: [25.10, 177.99, 50.0, 202.46], targetPage: 13, numRect: [565.0, 177.99, 578.0, 202.46] },
  { title: 'Payment & Cancellation Policy', rect: [25.10, 136.58, 270.0, 160.59], targetPage: 14, numRect: [565.0, 136.58, 578.0, 160.59] },
  { title: 'Contact Us', rect: [25.10, 95.74, 118.0, 120.21], targetPage: 14, numRect: [565.0, 95.74, 578.0, 120.21] },
  { title: 'Venue', rect: [25.10, 53.80, 80.0, 77.81], targetPage: 15, numRect: [565.0, 53.80, 578.0, 77.81] }
];

async function renderAnnotationLayer(page, slot, unscaledViewport) {
  try {
    const annotLayer = slot.querySelector('.brochure-annotation-layer');
    if (!annotLayer) return;
    annotLayer.innerHTML = '';

    const pageNum = page.pageNumber || Number(slot.dataset.pageNum);

    // Page 2: Table of Contents — render complete, flawless interactive links for every item
    if (pageNum === CONTENTS_PAGE_NUM) {
      CONTENTS_PAGE_ITEMS.forEach(item => {
        // 1. Text Title Link (with standard blue highlight covering full title)
        const [vx1, vy1, vx2, vy2] = unscaledViewport.convertToViewportRectangle(item.rect);
        const left = (Math.min(vx1, vx2) / unscaledViewport.width) * 100;
        const top = (Math.min(vy1, vy2) / unscaledViewport.height) * 100;
        const width = (Math.abs(vx1 - vx2) / unscaledViewport.width) * 100;
        const height = (Math.abs(vy1 - vy2) / unscaledViewport.height) * 100;

        const linkEl = document.createElement('a');
        linkEl.className = 'brochure-pdf-link';
        linkEl.style.left = `${left}%`;
        linkEl.style.top = `${top}%`;
        linkEl.style.width = `${width}%`;
        linkEl.style.height = `${height}%`;
        linkEl.href = '#';
        linkEl.title = `Jump to ${item.title}`;
        linkEl.setAttribute('aria-label', `Jump to ${item.title}`);
        linkEl.addEventListener('click', async e => {
          e.preventDefault();
          if (!renderedPages.has(item.targetPage)) {
            await renderPage(item.targetPage, baseTargetWidth || getBasePageWidth());
          }
          const targetSlot = document.querySelector(`.brochure-page-slot[data-page-num="${item.targetPage}"]`);
          targetSlot?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
        annotLayer.appendChild(linkEl);

        // 2. Page Number Link on the right (clickable too)
        if (item.numRect) {
          const [nx1, ny1, nx2, ny2] = unscaledViewport.convertToViewportRectangle(item.numRect);
          const nLeft = (Math.min(nx1, nx2) / unscaledViewport.width) * 100;
          const nTop = (Math.min(ny1, ny2) / unscaledViewport.height) * 100;
          const nWidth = (Math.abs(nx1 - nx2) / unscaledViewport.width) * 100;
          const nHeight = (Math.abs(ny1 - ny2) / unscaledViewport.height) * 100;

          const numEl = document.createElement('a');
          numEl.className = 'brochure-pdf-link brochure-pdf-link-num';
          numEl.style.left = `${nLeft}%`;
          numEl.style.top = `${nTop}%`;
          numEl.style.width = `${nWidth}%`;
          numEl.style.height = `${nHeight}%`;
          numEl.href = '#';
          numEl.title = `Jump to page ${item.targetPage}`;
          numEl.setAttribute('aria-label', `Jump to page ${item.targetPage}`);
          numEl.addEventListener('click', async e => {
            e.preventDefault();
            if (!renderedPages.has(item.targetPage)) {
              await renderPage(item.targetPage, baseTargetWidth || getBasePageWidth());
            }
            const targetSlot = document.querySelector(`.brochure-page-slot[data-page-num="${item.targetPage}"]`);
            targetSlot?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          });
          annotLayer.appendChild(numEl);
        }
      });
      return;
    }

    const annotations = await page.getAnnotations();
    if (!annotations || !annotations.length) return;

    annotations.forEach(annot => {
      let targetUrl = annot.url || annot.unsafeUrl;

      if (annot.subtype === 'Link' && (targetUrl || annot.dest)) {
        const [vx1, vy1, vx2, vy2] = unscaledViewport.convertToViewportRectangle(annot.rect);
        const left = (Math.min(vx1, vx2) / unscaledViewport.width) * 100;
        const top = (Math.min(vy1, vy2) / unscaledViewport.height) * 100;
        const width = (Math.abs(vx1 - vx2) / unscaledViewport.width) * 100;
        const height = (Math.abs(vy1 - vy2) / unscaledViewport.height) * 100;

        const linkEl = document.createElement('a');
        linkEl.className = 'brochure-pdf-link';
        linkEl.style.left = `${left}%`;
        linkEl.style.top = `${top}%`;
        linkEl.style.width = `${width}%`;
        linkEl.style.height = `${height}%`;

        if (targetUrl) {
          linkEl.href = targetUrl;
          linkEl.target = '_blank';
          linkEl.rel = 'noopener noreferrer';
          linkEl.title = targetUrl;
          linkEl.setAttribute('aria-label', `Open link: ${targetUrl}`);
        } else if (annot.dest) {
          linkEl.href = '#';
          linkEl.title = 'Jump to section';
          linkEl.setAttribute('aria-label', 'Jump to section');
          linkEl.addEventListener('click', async e => {
            e.preventDefault();
            try {
              let pageIndex = null;
              if (typeof annot.dest === 'string') {
                const destObj = await pdfDoc.getDestination(annot.dest);
                if (destObj) {
                  pageIndex = await pdfDoc.getPageIndex(destObj[0]);
                }
              } else if (Array.isArray(annot.dest)) {
                pageIndex = await pdfDoc.getPageIndex(annot.dest[0]);
              }
              if (pageIndex !== null) {
                const targetPageNum = pageIndex + 1;
                if (!renderedPages.has(targetPageNum)) {
                  await renderPage(targetPageNum, baseTargetWidth || getBasePageWidth());
                }
                const targetSlot = document.querySelector(`.brochure-page-slot[data-page-num="${targetPageNum}"]`);
                targetSlot?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }
            } catch (destErr) {
              console.warn('Destination navigation error:', destErr);
            }
          });
        }

        annotLayer.appendChild(linkEl);
      }
    });
  } catch (err) {
    console.warn('Annotation render error:', err);
  }
}

function loadPdfJsScript() {
  return new Promise((resolve, reject) => {
    if (window.pdfjsLib || window['pdfjs-dist/build/pdf']) return resolve();
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
    s.async = true;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

// Keyboard shortcuts for PC
document.addEventListener('keydown', e => {
  const modal = document.getElementById('brochure-modal');
  if (!modal || !modal.classList.contains('is-open')) return;

  if (e.key === 'Escape') {
    closeBrochureModal();
  } else if (e.key === '+' || e.key === '=') {
    zoomInBrochure();
  } else if (e.key === '-' || e.key === '_') {
    zoomOutBrochure();
  }
});
