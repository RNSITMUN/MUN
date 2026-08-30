/**
 * Fluid Topographic Contour Lines Background
 * Recreated from shoe-finder shader architecture with lightweight standalone WebGL.
 */
(function () {
  if (typeof window === 'undefined') return;

  function initTopologyBackground() {
    // Avoid double initialization
    if (document.getElementById('topology-bg-canvas')) return;

    const canvas = document.createElement('canvas');
    canvas.id = 'topology-bg-canvas';
    canvas.className = 'topology-bg-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    document.body.prepend(canvas);

    const gl = canvas.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' });
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
      -1,  1,
      -1,  1,
       1, -1,
       1,  1
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

    // Shader uniforms
    gl.uniform1f(uScaleLoc, 1.8);
    gl.uniform1f(uLineThicknessLoc, 0.030);
    gl.uniform1f(uOpacityLoc, 0.060); // Fine-tuned opacity
    gl.uniform3f(uColorLoc, 0.0, 0.0, 0.0); // Black/charcoal lines matching neo-brutalist theme

    let width = 0;
    let height = 0;

    function resize() {
      const isMobile = window.innerWidth < 768;
      const maxDpr = isMobile ? 1.0 : 1.5;
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

    let startTime = performance.now();
    let isVisible = true;
    let isScrolling = false;
    let scrollTimer = null;
    let isCanvasInView = true; // Track if canvas is in viewport (mobile optimization)
    const isMobileDevice = window.innerWidth < 768;

    document.addEventListener('visibilitychange', () => {
      isVisible = document.visibilityState === 'visible';
    });

    window.addEventListener('scroll', () => {
      isScrolling = true;
      if (scrollTimer) clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        isScrolling = false;
      }, 120);
    }, { passive: true });

    // On mobile, use IntersectionObserver to completely pause rendering when scrolled away
    if (isMobileDevice && typeof IntersectionObserver !== 'undefined') {
      const topoObserver = new IntersectionObserver((entries) => {
        for (const entry of entries) {
          isCanvasInView = entry.isIntersecting;
        }
      }, { rootMargin: '50px' });
      topoObserver.observe(canvas);
    }

    let frameCount = 0;
    function render() {
      frameCount++;
      if (isVisible && isCanvasInView) {
        // Mobile: during active scroll, draw every 4th frame to free GPU for compositor
        // Desktop: during active scroll, draw every 2nd frame
        const skipRatio = isMobileDevice ? 4 : 2;
        if (!isScrolling || frameCount % skipRatio === 0) {
          const currentTime = (performance.now() - startTime) * 0.001;
          gl.uniform1f(uTimeLoc, currentTime);
          gl.drawArrays(gl.TRIANGLES, 0, 6);
        }
      }
      requestAnimationFrame(render);
    }

    render();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTopologyBackground);
  } else {
    initTopologyBackground();
  }
})();
