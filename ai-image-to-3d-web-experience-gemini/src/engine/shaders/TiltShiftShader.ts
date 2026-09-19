import * as THREE from 'three';

export const TiltShiftShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    focusPos: { value: 0.52 },
    focusWidth: { value: 0.22 },
    blurStrength: { value: 0.0035 },
    resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
    enabled: { value: 1.0 },
    vignetteStrength: { value: 0.25 },
  },

  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float focusPos;
    uniform float focusWidth;
    uniform float blurStrength;
    uniform vec2 resolution;
    uniform float enabled;
    uniform float vignetteStrength;
    varying vec2 vUv;

    void main() {
      if (enabled < 0.5) {
        gl_FragColor = texture2D(tDiffuse, vUv);
        return;
      }

      // Distance from focus line (tilt-shift effect)
      float dist = abs(vUv.y - focusPos);
      float blurFactor = smoothstep(focusWidth * 0.5, focusWidth * 1.5, dist);
      
      vec4 sum = vec4(0.0);
      float totalWeight = 0.0;
      
      // Calculate pixel aspect
      vec2 step = vec2(blurStrength, blurStrength * (resolution.x / max(resolution.y, 1.0))) * blurFactor;

      // 9-tap 2D kernel sample for smooth miniature diorama blur
      vec2 offsets[9];
      offsets[0] = vec2( 0.0,  0.0);
      offsets[1] = vec2(-1.0, -1.0);
      offsets[2] = vec2( 1.0, -1.0);
      offsets[3] = vec2(-1.0,  1.0);
      offsets[4] = vec2( 1.0,  1.0);
      offsets[5] = vec2( 0.0, -1.5);
      offsets[6] = vec2( 0.0,  1.5);
      offsets[7] = vec2(-1.5,  0.0);
      offsets[8] = vec2( 1.5,  0.0);

      float weights[9];
      weights[0] = 0.25;
      weights[1] = 0.09;
      weights[2] = 0.09;
      weights[3] = 0.09;
      weights[4] = 0.09;
      weights[5] = 0.1;
      weights[6] = 0.1;
      weights[7] = 0.1;
      weights[8] = 0.1;

      for (int i = 0; i < 9; i++) {
        vec2 sampleCoord = clamp(vUv + offsets[i] * step, 0.0, 1.0);
        sum += texture2D(tDiffuse, sampleCoord) * weights[i];
        totalWeight += weights[i];
      }

      vec4 color = sum / totalWeight;

      // Subtle diorama toy vignette
      vec2 uvCenter = vUv - vec2(0.5);
      float vignette = 1.0 - dot(uvCenter, uvCenter) * vignetteStrength;
      color.rgb *= clamp(vignette, 0.75, 1.0);

      gl_FragColor = color;
    }
  `
};
