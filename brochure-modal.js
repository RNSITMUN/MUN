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

  document.documentElement.classList.add('brochure-modal-open');
  document.body.classList.add('brochure-modal-open');
  modal.classList.add('is-open');

  loadBrochureContent();
}

export function closeBrochureModal() {
  const modal = document.getElementById('brochure-modal');
  if (!modal) return;

  modal.classList.remove('is-open');
  document.documentElement.classList.remove('brochure-modal-open');
  document.body.classList.remove('brochure-modal-open');
}

export function zoomInBrochure() {
  if (currentZoom < 2.0) {
    currentZoom += 0.15;
    applyZoom();
  }
}

export function zoomOutBrochure() {
  if (currentZoom > 0.45) {
    currentZoom -= 0.15;
    applyZoom();
  }
}

function applyZoom() {
  const container = document.getElementById('brochure-pages-container');
  if (container) {
    const newWidth = Math.round(baseTargetWidth * currentZoom);
    container.style.setProperty('--page-width', `${newWidth}px`);
  }
}

window.openBrochureModal = openBrochureModal;
window.closeBrochureModal = closeBrochureModal;
window.zoomInBrochure = zoomInBrochure;
window.zoomOutBrochure = zoomOutBrochure;

async function loadBrochureContent() {
  const body = document.getElementById('brochure-modal-body');
  if (!body) return;

  const container = document.getElementById('brochure-pages-container');
  if (container && container.children.length > 0) {
    return;
  }

  if (!pdfDoc) {
    body.innerHTML = `
      <div class="brochure-loading-state" id="brochure-loader">
        <div class="brochure-spinner"></div>
        <p>Opening brochure...</p>
      </div>
      <div class="brochure-pages-container" id="brochure-pages-container"></div>
    `;

    await preloadBrochure();
  } else {
    body.innerHTML = `
      <div class="brochure-pages-container" id="brochure-pages-container"></div>
    `;
  }

  if (!pdfDoc) {
    await loadPdfJsScript();
    const lib = window['pdfjs-dist/build/pdf'] || window.pdfjsLib;
    lib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    pdfDoc = await lib.getDocument(BROCHURE_URL).promise;
  }

  const loader = document.getElementById('brochure-loader');
  if (loader) loader.style.display = 'none';

  const pageCountTag = document.getElementById('brochure-page-count');
  if (pageCountTag) pageCountTag.textContent = `${pdfDoc.numPages} Pages`;

  const list = document.getElementById('brochure-pages-container');
  if (!list) return;

  const isDesktop = window.innerWidth >= 900;
  baseTargetWidth = isDesktop ? Math.min(window.innerWidth * 0.58, 860) : Math.min(window.innerWidth - 24, 680);
  currentZoom = 1;
  list.style.setProperty('--page-width', `${baseTargetWidth}px`);

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

  renderPage(1, baseTargetWidth);

  if (pdfDoc.numPages >= 2) {
    renderPage(2, baseTargetWidth);
  }
  if (isDesktop && pdfDoc.numPages >= 3) {
    renderPage(3, baseTargetWidth);
  }

  setupIntersectionObserver(baseTargetWidth, isDesktop);
}

function setupIntersectionObserver(targetWidth, isDesktop) {
  if (pageObserver) pageObserver.disconnect();

  const scrollContainer = document.getElementById('brochure-modal-body');
  const aheadMargin = isDesktop ? '600px 0px 600px 0px' : '350px 0px 350px 0px';

  pageObserver = new IntersectionObserver(entries => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const pageNum = parseInt(entry.target.dataset.pageNum, 10);
        if (pageNum && !renderedPages.has(pageNum)) {
          renderPage(pageNum, targetWidth);
        }
      }
    });
  }, {
    root: scrollContainer,
    rootMargin: aheadMargin,
    threshold: 0.01
  });

  const slots = document.querySelectorAll('.brochure-page-slot');
  slots.forEach(slot => pageObserver.observe(slot));
}

async function renderPage(pageNum, targetWidth) {
  if (renderedPages.has(pageNum) || !pdfDoc) return;
  renderedPages.add(pageNum);

  try {
    const page = await pdfDoc.getPage(pageNum);
    const slot = document.querySelector(`.brochure-page-slot[data-page-num="${pageNum}"]`);
    if (!slot) return;

    const canvas = slot.querySelector('canvas');
    if (!canvas) return;

    const unscaledViewport = page.getViewport({ scale: 1 });
    const renderScale = Math.max(1.5, targetWidth / unscaledViewport.width);
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
  }
}

async function renderAnnotationLayer(page, slot, unscaledViewport) {
  try {
    const annotations = await page.getAnnotations();
    if (!annotations || !annotations.length) return;

    const annotLayer = slot.querySelector('.brochure-annotation-layer');
    if (!annotLayer) return;

    annotLayer.innerHTML = '';

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
                const targetSlot = document.querySelector(`.brochure-page-slot[data-page-num="${pageIndex + 1}"]`);
                targetSlot?.scrollIntoView({ behavior: 'smooth' });
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
