import { useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'

const vertexShader = /* glsl */`
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`

const fragmentShader = /* glsl */`
  uniform float uTime;
  varying vec2 vUv;

  vec3 permute(vec3 x) {
    return mod(((x * 34.0) + 1.0) * x, 289.0);
  }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
             -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy) );
    vec2 x0 = v -   i + dot(i, C.xx);
    vec2 i1;
    i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute( permute( i.y + vec3(0.0, i1.y, 1.0 ))
    + i.x + vec3(0.0, i1.x, 1.0 ));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
      dot(x12.zw,x12.zw)), 0.0);
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

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(0.8, 0.6, -0.6, 0.8);
    // 2 octaves for high performance
    v += a * snoise(p); p = rot * p * 2.0; a *= 0.5;
    v += a * snoise(p);
    return v;
  }

  void main() {
    // Faster, more noticeable movement
    float t = uTime * 0.33;

    // Base noise layers
    float n1 = fbm(vUv * 2.0 + vec2(t * 0.3, t * 0.2));
    float n2 = fbm(vUv * 3.0 - vec2(t * 0.2, t * 0.4));
    
    // Combine noise
    float combined = (n1 + n2) * 0.5;
    
    // Smooth threshold for the blobs
    float blob = smoothstep(-0.2, 0.4, combined);

    // Deep, dark blue colors so text stands out
    vec3 darkBg = vec3(0.01, 0.015, 0.02);
    vec3 deepBlue = vec3(0.02, 0.08, 0.15);
    vec3 subtleHighlight = vec3(0.04, 0.12, 0.22);

    // Color gradient based on slow noise
    float colorNoise = fbm(vUv * 1.5 + t * 0.1);
    vec3 blobColor = mix(deepBlue, subtleHighlight, colorNoise * 0.5 + 0.5);

    vec3 finalColor = mix(darkBg, blobColor, blob);

    // Vignette effect to darken the edges and unify the full screen
    vec2 center = vUv - 0.5;
    float dist = length(center);
    float vignette = smoothstep(0.8, 0.2, dist);
    finalColor *= vignette;

    gl_FragColor = vec4(finalColor, 1.0);
  }
`

function ShaderPlane() {
  const materialRef = useRef()

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime()
    }
  })

  return (
    <mesh>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={{ uTime: { value: 0 } }}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}

export default function ShaderBackground() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
      <Canvas
        frameloop="always"
        gl={{ alpha: false, antialias: false, powerPreference: 'high-performance' }}
        camera={{ position: [0, 0, 1], near: 0.1, far: 10 }}
        style={{ width: '100%', height: '100%', display: 'block' }}
      >
        <ShaderPlane />
      </Canvas>
    </div>
  )
}
