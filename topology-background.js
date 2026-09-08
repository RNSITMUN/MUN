/**
 * Fluid Topographic Contour Lines Background
 * Recreated from shoe-finder shader architecture with lightweight standalone WebGL.
 *
 * Performance tiers:
 *  - Low-end device / battery ≤ 20% → 30 FPS cap, opacity reduced
 *  - Modal open on mobile → rendering paused entirely
 *  - Scroll active on mobile → draw every 4th frame
 *  - Scroll active on desktop → draw every 2nd frame
 *  - Tab hidden → paused
 *  - Canvas off-screen → paused via IntersectionObserver
 */
(function () {
  if (typeof window === 'undefined') return;

  // ─── Battery & Performance State ─────────────────────────────────────────
  let batteryLevel = 1.0;       // 0.0–1.0; assumes full until Battery API responds
  let isCharging = true;
  let targetFPS = 60;           // will be updated based on conditions
  let lastFrameTime = 0;
  let isModalOpen = false;      // set to true by modal observers

  // Detect low-end device heuristics (hardware concurrency + memory)
  const lowEndDevice = (
    (navigator.hardwareConcurrency != null && navigator.hardwareConcurrency <= 4) ||
    (navigator.deviceMemory != null && navigator.deviceMemory <= 2)
  );

  const isMobileDevice = window.innerWidth < 768 || /Mobi|Android/i.test(navigator.userAgent);

  // Battery API – asynchronously update batteryLevel
  if ('getBattery' in navigator) {
    navigator.getBattery().then((battery) => {
      batteryLevel = battery.level;
      isCharging = battery.charging;

      battery.addEventListener('levelchange', () => {
        batteryLevel = battery.level;
        updateTargetFPS();
      });
      battery.addEventListener('chargingchange', () => {
        isCharging = battery.charging;
        updateTargetFPS();
      });

      updateTargetFPS();
    }).catch(() => { /* Battery API not permitted – use defaults */ });
  }

  function updateTargetFPS() {
    const batterySaver = !isCharging && batteryLevel <= 0.20;
    const reducedMode = isMobileDevice || lowEndDevice || (!isCharging && batteryLevel <= 0.40);

    if (batterySaver) {
      targetFPS = 20;       // 20 FPS on very low battery to save power
    } else if (reducedMode) {
      targetFPS = 30;       // 30 FPS on mobile / low-end / mid-battery
    } else {
      targetFPS = 60;       // 60 FPS otherwise (shader is already low-power)
    }
  }

  updateTargetFPS();

  // ─── Modal-Open Detection ─────────────────────────────────────────────────
  // When any committee/registration modal is open on mobile, pause the GPU
  // to ensure 120Hz compositor smoothness for form scrolling.
  if (isMobileDevice && typeof MutationObserver !== 'undefined') {
    const modalObserver = new MutationObserver(() => {
      const modals = document.querySelectorAll(
        '#committee-modal-backdrop.active,' +
        '#registration-modal-backdrop.active,' +
        '#delegation-modal-backdrop.active,' +
        '#delegate-type-modal-backdrop.active'
      );
      isModalOpen = modals.length > 0;
    });
    // Observe body after DOM ready so modals exist
    const startModalObs = () => {
      modalObserver.observe(document.body, {
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    };
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', startModalObs);
    } else {
      startModalObs();
    }
  }

  // ─── Core Renderer ────────────────────────────────────────────────────────
  function initTopologyBackground() {
    if (document.getElementById('topology-bg-canvas')) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'topology-bg-canvas';
    canvas.className = 'topology-bg-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const gl = canvas.getContext('webgl', {
      alpha: true,
      antialias: false,
      powerPreference: 'low-power',
      preserveDrawingBuffer: false
    });

    if (!gl) {
      console.warn('WebGL not supported for topology background');
      return;
    }

    const vsSource = `
      attribute vec2 aPosition;
      varying vec2 vUv;
      void main() {
        vUv = (aPosition + 1.0) * 0.5;
        gl_Position = vec4(aPosition, 0.0, 1.0);
      }
    `;

    const fsSource = `
      precision highp float;
      uniform float uTime;
      uniform vec2 uResolution;
      uniform float uScale;
      uniform float uLineThickness;
      uniform float uOpacity;
      uniform vec3 uColor;
      varying vec2 vUv;

      // Stefan Gustavson Simplex 2D Noise Implementation
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

      float snoise(vec2 v) {
        const vec4 C = vec4(0.211324865405187,
                            0.366025403784439,
                           -0.577350269189626,
                            0.024390243902439);
        vec2 i  = floor(v + dot(v, C.yy) );
        vec2 x0 = v -   i + dot(i, C.xx);
        vec2 i1;
        i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
        vec4 x12 = x0.xyxy + C.xxzz;
        x12.xy -= i1;
        i = mod289(i);
        vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
          + i.x + vec3(0.0, i1.x, 1.0 ));
        vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
        m = m*m ;
        m = m*m ;
        vec3 x = 2.0 * fract(p * C.www) - 1.0;
        vec3 h = abs(x) - 0.5;
        vec3 ox = floor(x + 0.5);
        vec3 a0 = x - ox;
        m *= 1.79284291400159 - 0.85373472095314 * ( a0*a0 + h*h );
        vec3 g;
        g.x  = a0.x  * x0.x  + h.x  * x0.y;
        g.yz = a0.yz * x12.xz + h.yz * x12.yw;
        return 130.0 * dot(m, g);
      }

      void main() {
        vec2 uv = vUv;
        float aspect = uResolution.x / max(uResolution.y, 1.0);
        vec2 noiseUv = uv;
        noiseUv.x *= aspect;

        // Fluid Simplex Topography (Slow, tranquil motion)
        float n1 = snoise(noiseUv * uScale + uTime * 0.012);
        float n2 = snoise(noiseUv * (uScale * 1.5) - uTime * 0.007) * 0.35;
        float n = n1 + n2;

        // Isolines calculation
        float lines = fract(n * 4.5);
        float pattern = smoothstep(0.5 - uLineThickness, 0.5, lines) - smoothstep(0.5, 0.5 + uLineThickness, lines);

        // Subtle organic grain
        float grain = (fract(sin(dot(vUv, vec2(12.9898, 78.233) * 2.0)) * 43758.5453) - 0.5) * 0.06;

        vec3 finalColor = uColor + grain;
        gl_FragColor = vec4(finalColor, pattern * uOpacity);
      }
    `;

    function createShader(gl, type, source) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error('Program link error:', gl.getProgramInfoLog(program));
      return;
    }

    gl.useProgram(program);

    // Full screen quad buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,
      1, -1,
      -1, 1,
      -1, 1,
      1, -1,
      1, 1
    ]), gl.STATIC_DRAW);

    const aPosition = gl.getAttribLocation(program, 'aPosition');
    gl.enableVertexAttribArray(aPosition);
    gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);

    const uTimeLoc = gl.getUniformLocation(program, 'uTime');
    const uResolutionLoc = gl.getUniformLocation(program, 'uResolution');
    const uScaleLoc = gl.getUniformLocation(program, 'uScale');
    const uLineThicknessLoc = gl.getUniformLocation(program, 'uLineThickness');
    const uOpacityLoc = gl.getUniformLocation(program, 'uOpacity');
    const uColorLoc = gl.getUniformLocation(program, 'uColor');

    // Base shader uniforms
    gl.uniform1f(uScaleLoc, 1.8);
    gl.uniform1f(uLineThicknessLoc, 0.030);
    gl.uniform3f(uColorLoc, 0.0, 0.0, 0.0); // Black/charcoal lines matching neo-brutalist theme

    // Initial opacity based on device capability
    const baseOpacity = (isMobileDevice || lowEndDevice) ? 0.065 : 0.065;
    gl.uniform1f(uOpacityLoc, baseOpacity);

    let width = 0;
    let height = 0;

    function resize() {
      const maxDpr = isMobileDevice ? 1.0 : 1.5;
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const newWidth = Math.floor(window.innerWidth * dpr);
      const newHeight = Math.floor(window.innerHeight * dpr);

      if (width !== newWidth || height !== newHeight) {
        width = newWidth;
        height = newHeight;
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
        gl.uniform2f(uResolutionLoc, width, height);
      }
    }

    window.addEventListener('resize', resize, { passive: true });
    resize();

    // ─── Runtime State ──────────────────────────────────────────────────────
    let startTime = performance.now();
    let isVisible = true;
    let isScrolling = false;
    let scrollTimer = null;
    let isCanvasInView = true;

    document.addEventListener('visibilitychange', () => {
      isVisible = document.visibilityState === 'visible';
    });

    window.addEventListener('scroll', () => {
      isScrolling = true;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => { isScrolling = false; }, 150);
    }, { passive: true });

    // IntersectionObserver – pause entirely when canvas scrolled off-screen
    if (typeof IntersectionObserver !== 'undefined') {
      const topoObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          isCanvasInView = entry.isIntersecting;
        }
      }, { rootMargin: '50px' });
      topoObserver.observe(canvas);
    }

    // ─── Render Loop ────────────────────────────────────────────────────────
    let frameCount = 0;

    function render(now) {
      requestAnimationFrame(render);

      frameCount++;

      // 1. Hard pause: tab hidden, canvas off-screen, or modal open on mobile
      if (!isVisible || !isCanvasInView) return;
      if (isMobileDevice && isModalOpen) return;

      // 2. FPS cap: throttle by skipping frames when below target FPS
      //    targetFPS updated by battery listener (20 / 30 / 60)
      const msPerFrame = 1000 / targetFPS;
      if (now - lastFrameTime < msPerFrame - 0.5) return;  // 0.5ms tolerance
      lastFrameTime = now;

      // 3. Scroll throttle on top of FPS cap
      //    Mobile: skip 3 in every 4 frames while actively scrolling
      //    Desktop: skip every other frame while scrolling
      if (isScrolling) {
        const skipMod = isMobileDevice ? 4 : 2;
        if (frameCount % skipMod !== 0) return;
      }

      const currentTime = (now - startTime) * 0.001;
      gl.uniform1f(uTimeLoc, currentTime);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
    }

    requestAnimationFrame(render);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTopologyBackground);
  } else {
    initTopologyBackground();
  }
})();
