import React, { useState, useEffect, useRef, useMemo, Suspense } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { motion, useScroll, useTransform, useInView, AnimatePresence } from "framer-motion";
import * as THREE from "three";

/* ═══════════════════════════════════════════════
   PALETTE — Dark Navy / Cyan / Pearl White
   ═══════════════════════════════════════════════ */
const C = {
  navy: "#0b1d36",
  navyLight: "#112745",
  navyMid: "#0e2240",
  panel: "#0f1f38",
  panelLight: "#132b4d",
  border: "#1a3358",
  borderSoft: "#1e3a62",
  
  cyan: "#00c2e0",
  cyanMuted: "#0098b8",
  cyanGlow: "#00e8ff",
  cyanDark: "#007a99",
  
  pearl: "#f0f3f7",
  pearlWarm: "#e8ecf2",
  pearlMid: "#d0d8e4",
  white: "#ffffff",
  
  silver: "#8ea0b8",
  muted: "#5c7490",
  dark: "#060e1c",
  black: "#030a14",
};

const F = {
  display: "'Playfair Display', serif",
  heading: "'Syne', sans-serif",
  body: "'DM Sans', sans-serif",
  mono: "'JetBrains Mono', monospace",
};

/* ═══════════ GLOBAL STYLES ═══════════ */
const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Syne:wght@400..800&family=DM+Sans:opsz,wght@9..40,100..1000&family=JetBrains+Mono:wght@300;400;500&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    html { scroll-behavior:smooth; }
    body { background:${C.navy}; color:${C.pearl}; font-family:${F.body}; overflow-x:hidden; -webkit-font-smoothing:antialiased; }
    ::-webkit-scrollbar { width:4px; }
    ::-webkit-scrollbar-track { background:${C.dark}; }
    ::-webkit-scrollbar-thumb { background:${C.cyan}; border-radius:4px; }
    ::selection { background:${C.cyan}; color:${C.navy}; }
    a { color:inherit; text-decoration:none; }
    @keyframes marquee { 0%{transform:translateX(0)} 100%{transform:translateX(-50%)} }
    @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
    @media(max-width:900px){
      .desk{display:none!important}
      .mcol{grid-template-columns:1fr!important}
    }
    @media(min-width:901px){.mob{display:none!important}}
  `}</style>
);

/* ═══════════════════════════════════════════════
   3D PRODUCT MODELS — Aquaphor-inspired
   RO system, UF filters, cartridge housings
   ═══════════════════════════════════════════════ */

// Shared materials
const matNav = { color: C.navyLight, metalness: 0.85, roughness: 0.18, transparent: true, opacity: 0.85 };
const matCyan = { color: C.cyanDark, metalness: 0.8, roughness: 0.2 };
const matSteel = { color: "#5c7a9a", metalness: 0.92, roughness: 0.08 };
const matWhite = { color: "#dce4ee", metalness: 0.2, roughness: 0.4 };
const matGlow = { color: C.cyanGlow };

function WaterDrops({ count = 100 }) {
  const ref = useRef();
  const pos = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      p[i*3] = (Math.random()-0.5)*8;
      p[i*3+1] = (Math.random()-0.5)*8;
      p[i*3+2] = (Math.random()-0.5)*8;
    }
    return p;
  }, [count]);

  useFrame(({ clock }) => {
    const a = ref.current.geometry.attributes.position.array;
    for (let i = 0; i < count; i++) {
      a[i*3+1] -= 0.01;
      if (a[i*3+1] < -4) a[i*3+1] = 4;
      a[i*3] += Math.sin(clock.getElapsedTime()*0.4+i)*0.001;
    }
    ref.current.geometry.attributes.position.needsUpdate = true;
  });

  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" array={pos} count={count} itemSize={3} />
      </bufferGeometry>
      <pointsMaterial size={0.025} color={C.cyanGlow} transparent opacity={0.35} sizeAttenuation />
    </points>
  );
}

// Aquaphor-style RO filter cartridge — tall slim cylinder with bands
function ROCartridge({ position = [0,0,0], height = 1.8, radius = 0.18, color = C.cyanDark }) {
  const ref = useRef();
  useFrame(({ clock }) => {
    if (ref.current) ref.current.rotation.y = Math.sin(clock.getElapsedTime()*0.2)*0.05;
  });
  return (
    <group ref={ref} position={position}>
      {/* Main body */}
      <mesh>
        <cylinderGeometry args={[radius, radius, height, 24]} />
        <meshPhysicalMaterial color={color} metalness={0.7} roughness={0.25} />
      </mesh>
      {/* Top cap */}
      <mesh position={[0, height/2+0.03, 0]}>
        <cylinderGeometry args={[radius+0.02, radius+0.02, 0.06, 24]} />
        <meshPhysicalMaterial color="#3a5a7a" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Bottom cap */}
      <mesh position={[0, -height/2-0.03, 0]}>
        <cylinderGeometry args={[radius+0.02, radius+0.02, 0.06, 24]} />
        <meshPhysicalMaterial color="#3a5a7a" metalness={0.9} roughness={0.1} />
      </mesh>
      {/* Decorative bands */}
      {[-0.3, 0, 0.3].map((y, i) => (
        <mesh key={i} position={[0, y, 0]}>
          <torusGeometry args={[radius+0.005, 0.01, 8, 24]} />
          <meshPhysicalMaterial color={C.cyan} metalness={0.8} roughness={0.15} transparent opacity={0.6} />
        </mesh>
      ))}
      {/* Glow ring at top */}
      <mesh position={[0, height/2+0.06, 0]} rotation={[Math.PI/2, 0, 0]}>
        <torusGeometry args={[radius-0.04, 0.008, 8, 24]} />
        <meshBasicMaterial color={C.cyanGlow} transparent opacity={0.4} />
      </mesh>
    </group>
  );
}

// Aquaphor-style RO housing — white tank with blue trim
function ROHousing({ position = [0,0,0] }) {
  return (
    <group position={position}>
      {/* White housing body */}
      <mesh>
        <cylinderGeometry args={[0.35, 0.32, 2.4, 24]} />
        <meshPhysicalMaterial color="#dce4ee" metalness={0.15} roughness={0.4} />
      </mesh>
      {/* Blue accent band at top */}
      <mesh position={[0, 0.9, 0]}>
        <cylinderGeometry args={[0.36, 0.36, 0.2, 24]} />
        <meshPhysicalMaterial color={C.cyan} metalness={0.6} roughness={0.2} />
      </mesh>
      {/* Blue base */}
      <mesh position={[0, -1.2, 0]}>
        <cylinderGeometry args={[0.36, 0.34, 0.12, 24]} />
        <meshPhysicalMaterial color={C.cyanDark} metalness={0.7} roughness={0.2} />
      </mesh>
      {/* Handle */}
      <mesh position={[0, 1.35, 0]}>
        <boxGeometry args={[0.2, 0.08, 0.06]} />
        <meshPhysicalMaterial color={C.cyan} metalness={0.7} roughness={0.2} />
      </mesh>
    </group>
  );
}

// Blue big-blue style filter housing (Aquaphor-like)
function BigBlueHousing({ position = [0,0,0], height = 2.2 }) {
  return (
    <group position={position}>
      <mesh>
        <cylinderGeometry args={[0.28, 0.28, height, 24]} />
        <meshPhysicalMaterial color="#1a4a7a" metalness={0.6} roughness={0.25} transparent opacity={0.85} />
      </mesh>
      <mesh position={[0, height/2+0.04, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.08, 24]} />
        <meshPhysicalMaterial color="#0a2a4a" metalness={0.8} roughness={0.15} />
      </mesh>
      <mesh position={[0, -height/2-0.04, 0]}>
        <cylinderGeometry args={[0.3, 0.3, 0.08, 24]} />
        <meshPhysicalMaterial color="#0a2a4a" metalness={0.8} roughness={0.15} />
      </mesh>
      {/* Pressure gauge */}
      <group position={[0.28, height/2-0.2, 0]} rotation={[0, 0, Math.PI/2]}>
        <mesh>
          <cylinderGeometry args={[0.06, 0.06, 0.03, 12]} />
          <meshPhysicalMaterial {...matSteel} />
        </mesh>
        <mesh position={[0, 0, 0.02]}>
          <circleGeometry args={[0.045, 12]} />
          <meshBasicMaterial color="#111" />
        </mesh>
      </group>
    </group>
  );
}

function PipeSegment({ start, end, radius = 0.04 }) {
  const s = new THREE.Vector3(...start);
  const e = new THREE.Vector3(...end);
  const d = new THREE.Vector3().subVectors(e, s);
  const l = d.length();
  const m = s.clone().add(d.clone().multiplyScalar(0.5));
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0), d.normalize());
  return (
    <mesh position={m} quaternion={q}>
      <cylinderGeometry args={[radius, radius, l, 8]} />
      <meshPhysicalMaterial color="#5c7a9a" metalness={0.9} roughness={0.1} />
    </mesh>
  );
}

// Complete filtration skid — Aquaphor product style
function FiltrationSystem() {
  const group = useRef();
  useFrame(({ clock }) => {
    if (!group.current) return;
    group.current.rotation.y = clock.getElapsedTime() * 0.12;
    group.current.position.y = Math.sin(clock.getElapsedTime()*0.35)*0.06;
  });

  return (
    <group ref={group} scale={[0.65, 0.65, 0.65]}>
      {/* Stainless steel base frame */}
      <mesh position={[0, -1.5, 0]}>
        <boxGeometry args={[5.5, 0.06, 2.8]} />
        <meshPhysicalMaterial color="#4a6a8a" metalness={0.95} roughness={0.05} />
      </mesh>
      {/* Frame legs */}
      {[[-2.5,-1.2,-1.2],[-2.5,-1.2,1.2],[2.5,-1.2,-1.2],[2.5,-1.2,1.2]].map((p,i) => (
        <mesh key={i} position={p}>
          <boxGeometry args={[0.06, 0.6, 0.06]} />
          <meshPhysicalMaterial color="#4a6a8a" metalness={0.9} roughness={0.1} />
        </mesh>
      ))}

      {/* RO Cartridges — 3 in a row (Aquaphor style) */}
      <ROCartridge position={[-1.8, 0, 0]} height={2} radius={0.2} color="#0a3a6a" />
      <ROCartridge position={[-1.8, 0, 0.7]} height={2} radius={0.2} color="#0a3a6a" />
      <ROCartridge position={[-1.8, 0, -0.7]} height={2} radius={0.2} color="#0a3a6a" />

      {/* White RO housing (Aquaphor RO-101S style) */}
      <ROHousing position={[0, 0, 0]} />

      {/* Big Blue pre-filter */}
      <BigBlueHousing position={[1.5, 0, 0.5]} height={2} />
      <BigBlueHousing position={[1.5, 0, -0.5]} height={2} />

      {/* Piping */}
      <PipeSegment start={[-1.8, 1, 0]} end={[0, 1.1, 0]} />
      <PipeSegment start={[0, 1.1, 0]} end={[1.5, 1, 0.5]} />
      <PipeSegment start={[-1.8, -1, 0]} end={[0, -1.1, 0]} />
      <PipeSegment start={[0, -1.1, 0]} end={[1.5, -1, -0.5]} />
      <PipeSegment start={[-1.8, 1, 0.7]} end={[-1.8, 1, 0]} radius={0.035} />
      <PipeSegment start={[-1.8, 1, -0.7]} end={[-1.8, 1, 0]} radius={0.035} />
      <PipeSegment start={[1.5, 1, 0.5]} end={[1.5, 1, -0.5]} radius={0.035} />

      {/* Pump motor */}
      <group position={[-0.5, -1.15, 1]}>
        <mesh>
          <boxGeometry args={[0.6, 0.5, 0.5]} />
          <meshPhysicalMaterial color={C.navyMid} metalness={0.7} roughness={0.3} />
        </mesh>
        <mesh rotation={[0,0,Math.PI/2]}>
          <cylinderGeometry args={[0.18, 0.18, 0.65, 12]} />
          <meshPhysicalMaterial color={C.cyanDark} metalness={0.8} roughness={0.2} />
        </mesh>
      </group>

      {/* Control panel */}
      <group position={[2.4, 0.2, 0]}>
        <mesh>
          <boxGeometry args={[0.3, 1.2, 0.12]} />
          <meshPhysicalMaterial color={C.panel} metalness={0.5} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0.35, 0.065]}>
          <boxGeometry args={[0.2, 0.12, 0.01]} />
          <meshBasicMaterial color={C.cyanGlow} />
        </mesh>
        <mesh position={[0, 0.15, 0.065]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color="#00ff88" />
        </mesh>
        <mesh position={[0.08, 0.15, 0.065]}>
          <sphereGeometry args={[0.02, 8, 8]} />
          <meshBasicMaterial color={C.cyanGlow} />
        </mesh>
      </group>
    </group>
  );
}

function HeroScene() {
  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight position={[5,6,5]} intensity={0.8} color="#a0c0e8" />
      <directionalLight position={[-3,3,-2]} intensity={0.3} color={C.cyan} />
      <pointLight position={[0,2,4]} intensity={0.5} color={C.cyanGlow} distance={12} />
      <pointLight position={[-3,-1,2]} intensity={0.2} color={C.cyan} distance={10} />
      <FiltrationSystem />
      <WaterDrops count={150} />
      <fog attach="fog" args={[C.navy, 5, 15]} />
    </>
  );
}

// Showcase 3D model — switches between product types
function ProductModel({ type = 0 }) {
  const group = useRef();
  useFrame(({ clock }) => {
    if (group.current) group.current.rotation.y = clock.getElapsedTime() * 0.25;
  });

  return (
    <group ref={group}>
      {type === 0 && <>
        <ROCartridge position={[-0.5, 0, 0]} height={2.2} radius={0.22} color="#0a3a6a" />
        <ROCartridge position={[0.5, 0, 0]} height={2.2} radius={0.22} color="#0a3a6a" />
        <ROCartridge position={[0, 0, 0.5]} height={2.2} radius={0.22} color="#0a3a6a" />
        <PipeSegment start={[-0.5, 1.1, 0]} end={[0.5, 1.1, 0]} />
      </>}
      {type === 1 && <ROHousing position={[0, 0, 0]} />}
      {type === 2 && <>
        <BigBlueHousing position={[-0.4, 0, 0]} height={1.8} />
        <BigBlueHousing position={[0.4, 0, 0]} height={1.8} />
      </>}
      {type === 3 && <>
        <ROHousing position={[-0.6, 0, 0]} />
        <BigBlueHousing position={[0.6, 0, 0]} height={2} />
      </>}
      {type === 4 && <>
        <mesh><sphereGeometry args={[0.5, 24, 24]} /><meshPhysicalMaterial color={C.cyanDark} metalness={0.7} roughness={0.2} transparent opacity={0.6} /></mesh>
        <mesh><sphereGeometry args={[0.35, 24, 24]} /><meshBasicMaterial color={C.cyanGlow} transparent opacity={0.15} /></mesh>
      </>}
      {type === 5 && <>
        <ROCartridge position={[-0.6, 0, 0]} height={1.6} radius={0.16} color="#1a4a7a" />
        <ROCartridge position={[0, 0, 0]} height={1.6} radius={0.16} color="#1a4a7a" />
        <ROCartridge position={[0.6, 0, 0]} height={1.6} radius={0.16} color="#1a4a7a" />
        <mesh position={[0, -1, 0]}><boxGeometry args={[2, 0.05, 0.6]} /><meshPhysicalMaterial {...matSteel} /></mesh>
      </>}
    </group>
  );
}

/* ═══════════ UTILITY COMPONENTS ═══════════ */
const Reveal = ({ children, delay = 0, style }) => {
  const ref = useRef();
  const iv = useInView(ref, { once: true, margin: "-80px" });
  return (
    <motion.div ref={ref} initial={{ opacity:0, y:40 }} animate={iv ? { opacity:1, y:0 } : {}}
      transition={{ duration:0.8, delay, ease:[0.25,0.1,0.25,1] }} style={style}
    >{children}</motion.div>
  );
};

const Wrap = ({ children, style }) => (
  <div style={{ maxWidth:1300, margin:"0 auto", padding:"0 clamp(24px,5vw,72px)", ...style }}>{children}</div>
);

const Label = ({ children }) => (
  <div style={{ fontFamily:F.mono, fontSize:11, color:C.cyan, letterSpacing:3, textTransform:"uppercase", marginBottom:16, display:"flex", alignItems:"center", gap:12 }}>
    <div style={{ width:28, height:2, background:C.cyan }} />{children}
  </div>
);

const Heading = ({ children, light }) => (
  <h2 style={{
    fontFamily:F.display, fontSize:"clamp(2rem,4.5vw,3.4rem)", fontWeight:400, fontStyle:"italic",
    color: light ? C.navy : C.pearl, lineHeight:1.12, letterSpacing:-0.5, marginBottom:20, maxWidth:700,
  }}>{children}</h2>
);

const Divider = () => <div style={{ width:48, height:3, background:C.cyan, borderRadius:2, marginBottom:24 }} />;

/* ═══════════ NAVBAR ═══════════ */
const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => { const h = () => setScrolled(window.scrollY > 60); window.addEventListener("scroll",h); return () => window.removeEventListener("scroll",h); }, []);

  const links = [
    { label:"Solutions", n:"01", href:"#solutions" },
    { label:"Systems", n:"02", href:"#systems" },
    { label:"Industries", n:"03", href:"#industries" },
    { label:"Contact", n:"04", href:"#contact" },
  ];

  return (
    <>
      <motion.header initial={{opacity:0}} animate={{opacity:1}} transition={{duration:0.8,delay:0.2}}
        style={{
          position:"fixed", top:0, left:0, right:0, zIndex:100, height:72,
          display:"flex", alignItems:"center", justifyContent:"space-between",
          padding:"0 clamp(24px,4vw,56px)",
          background: scrolled ? "rgba(11,29,54,0.95)" : "transparent",
          backdropFilter: scrolled ? "blur(16px)" : "none",
          borderBottom: scrolled ? `1px solid ${C.border}` : "none",
          transition:"all 0.4s",
        }}
      >
        <a href="#" style={{ display:"flex", alignItems:"center", gap:10 }}>
          <img src="/images/afwt-logo.png" alt="AFWT" style={{ height:36, objectFit:"contain" }} />
        </a>

        <div style={{ display:"flex", alignItems:"center", gap:32 }} className="desk">
          {links.map(l => (
            <a key={l.label} href={l.href} style={{ display:"flex", alignItems:"center", gap:6, fontSize:13, fontWeight:500, color:C.silver, transition:"color 0.3s" }}
              onMouseEnter={e => e.currentTarget.style.color = C.cyan}
              onMouseLeave={e => e.currentTarget.style.color = C.silver}
            ><span style={{ fontFamily:F.mono, fontSize:10, color:C.muted }}>{l.n}</span>{l.label}</a>
          ))}
          <motion.a href="#contact" whileHover={{scale:1.02}} whileTap={{scale:0.98}}
            style={{ padding:"10px 24px", background:C.cyan, color:C.navy, borderRadius:100, fontSize:12, fontWeight:700, letterSpacing:0.5 }}
          >Get a Quote</motion.a>
        </div>

        <button className="mob" onClick={() => setMenuOpen(!menuOpen)}
          style={{ background:"none", border:"none", cursor:"pointer", padding:6 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={C.cyan} strokeWidth="1.5">
            {menuOpen ? <path d="M6 6l12 12M6 18L18 6" /> : <path d="M3 7h18M3 12h18M3 17h18" />}
          </svg>
        </button>
      </motion.header>

      <AnimatePresence>
        {menuOpen && (
          <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:0.3}}
            style={{ position:"fixed", inset:0, zIndex:99, background:C.navy, display:"flex", flexDirection:"column", justifyContent:"center", padding:"0 40px", gap:12 }}>
            {links.map((l,i) => (
              <motion.a key={l.label} href={l.href} onClick={() => setMenuOpen(false)}
                initial={{opacity:0,x:-20}} animate={{opacity:1,x:0}} transition={{delay:i*0.06}}
                style={{ fontFamily:F.display, fontSize:42, fontStyle:"italic", color:C.pearl, display:"flex", alignItems:"baseline", gap:16, padding:"8px 0" }}
              ><span style={{ fontFamily:F.mono, fontSize:11, color:C.muted }}>{l.n}</span>{l.label}</motion.a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

/* ═══════════ HERO ═══════════ */
const Hero = () => {
  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.15], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.2], [0, -60]);

  return (
    <section style={{ position:"relative", height:"100vh", minHeight:700, display:"flex", alignItems:"center", background:C.navy, overflow:"hidden" }}>
      <div style={{ position:"absolute", inset:0, zIndex:0 }}>
        <Canvas camera={{ position:[0,0.5,5.5], fov:45 }} gl={{ antialias:true, alpha:true }}>
          <Suspense fallback={null}><HeroScene /></Suspense>
        </Canvas>
      </div>

      {/* Gradient veils */}
      <div style={{ position:"absolute", inset:0, zIndex:1, background:`radial-gradient(ellipse 70% 55% at 60% 50%, transparent 0%, ${C.navy} 70%)` }} />
      <div style={{ position:"absolute", inset:0, zIndex:1, background:`linear-gradient(180deg, ${C.navy} 0%, transparent 18%, transparent 82%, ${C.navy} 100%)` }} />

      <motion.div style={{ opacity, y, position:"relative", zIndex:2, width:"100%" }}>
        <Wrap>
          <motion.div initial={{opacity:0,y:50}} animate={{opacity:1,y:0}} transition={{duration:1,delay:0.5,ease:[0.25,0.1,0.25,1]}} style={{ maxWidth:720 }}>
            <Label>Advanced Filtration & Water Treatment</Label>
            <h1 style={{
              fontFamily:F.display, fontSize:"clamp(2.8rem,7vw,5.5rem)", fontWeight:400, fontStyle:"italic",
              lineHeight:0.95, letterSpacing:-2, color:C.pearl, marginBottom:28,
            }}>
              Engineered<br/><span style={{ color:C.cyan }}>water</span> solutions
            </h1>
            <p style={{ fontSize:17, color:C.silver, maxWidth:440, lineHeight:1.75, marginBottom:44, fontWeight:400 }}>
              We design and build advanced filtration, RO, UF, and water treatment systems for industrial performance across Australia.
            </p>
            <div style={{ display:"flex", gap:14, flexWrap:"wrap" }}>
              <motion.a href="#solutions" whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                style={{ padding:"15px 34px", background:C.cyan, color:C.navy, borderRadius:100, fontSize:13, fontWeight:700, letterSpacing:0.5 }}
              >Explore Solutions</motion.a>
              <motion.a href="#contact" whileHover={{scale:1.02}} whileTap={{scale:0.97}}
                style={{ padding:"15px 34px", border:`1.5px solid ${C.border}`, color:C.pearl, borderRadius:100, fontSize:13, fontWeight:600, letterSpacing:0.5 }}
              >Contact Us</motion.a>
            </div>
          </motion.div>
        </Wrap>
      </motion.div>

      <div style={{ position:"absolute", bottom:0, left:0, right:0, height:1, background:`linear-gradient(90deg, transparent, ${C.cyan}40, transparent)`, zIndex:3 }} />
    </section>
  );
};

/* ═══════════ INTRO ═══════════ */
const Intro = () => (
  <section style={{ padding:"140px 0", background:C.navy, borderBottom:`1px solid ${C.border}` }}>
    <Wrap>
      <Reveal>
        <p style={{
          fontFamily:F.display, fontSize:"clamp(1.8rem,4vw,3.2rem)", fontWeight:400, fontStyle:"italic",
          lineHeight:1.3, color:C.pearl, maxWidth:850, letterSpacing:-0.5,
        }}>
          AFWT is an engineering-led water treatment company{" "}
          <span style={{ color:C.cyan }}>elevating</span> industrial performance using advanced filtration and{" "}
          <span style={{ color:C.cyan }}>technology.</span>
        </p>
      </Reveal>
    </Wrap>
  </section>
);

/* ═══════════ IMAGE STRIP ═══════════ */
const ImageStrip = () => (
  <section style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", height:"clamp(200px,28vw,380px)", overflow:"hidden" }} className="mcol">
    {[
      { src:"/images/hero-technicians.png", l:"Installation" },
      { src:"/images/residential-filtration.png", l:"Residential" },
      { src:"/images/engineers-planning.png", l:"Engineering" },
    ].map((img,i) => (
      <Reveal key={i} delay={i*0.1} style={{ overflow:"hidden", position:"relative" }}>
        <motion.div whileHover={{scale:1.03}} transition={{duration:0.5}} style={{ width:"100%", height:"100%", overflow:"hidden" }}>
          <img src={img.src} alt={img.l} style={{ width:"100%", height:"100%", objectFit:"cover", display:"block", filter:"brightness(0.8)", transition:"filter 0.4s" }}
            onMouseEnter={e => e.target.style.filter="brightness(1)"} onMouseLeave={e => e.target.style.filter="brightness(0.8)"} />
        </motion.div>
        <div style={{ position:"absolute", bottom:16, left:16, fontFamily:F.mono, fontSize:10, color:"rgba(255,255,255,0.5)", letterSpacing:2, textTransform:"uppercase" }}>{img.l}</div>
      </Reveal>
    ))}
  </section>
);

/* ═══════════ SERVICES ACCORDION ═══════════ */
const Services = () => {
  const [active, setActive] = useState(null);
  const items = [
    { n:"01", title:"Reverse Osmosis", desc:"High-rejection membrane systems for demineralisation, process water, and potable reuse. Available from 500 L/hr to 500,000+ L/hr.", tags:["TDS >99.5%","Energy Recovery","CIP Automation"] },
    { n:"02", title:"Ultrafiltration", desc:"Hollow-fibre and ceramic UF membranes for turbidity removal, pre-treatment, and tertiary filtration applications.", tags:["0.02µm Pore","Auto Backwash","Low Fouling"] },
    { n:"03", title:"Chemical Dosing", desc:"Precision metering pumps and integrated dosing skids for pH, chlorine, coagulant, antiscalant, and specialty chemicals.", tags:["Multi-Stream","Flow-Proportional","Containment"] },
    { n:"04", title:"Containerised Systems", desc:"Factory-built, plug-and-play water treatment plants in 20ft or 40ft ISO containers for rapid deployment anywhere.", tags:["Self-Contained","Relocatable","Remote-Ready"] },
    { n:"05", title:"Remote Monitoring", desc:"Cloud-based SCADA with real-time dashboards, trend logging, alarm notifications, and predictive analytics.", tags:["24/7 Access","Mobile Alerts","Data Analytics"] },
    { n:"06", title:"Service & Maintenance", desc:"Preventive maintenance programs, membrane replacements, performance audits, and 24/7 emergency support.", tags:["Scheduled","Spare Parts","Audits"] },
  ];

  return (
    <section id="solutions" style={{ padding:"140px 0", background:C.navy, borderBottom:`1px solid ${C.border}` }}>
      <Wrap>
        <Reveal><Label>01 — Solutions</Label><Heading>We engineer unconventional solutions.</Heading><Divider /></Reveal>
        <div style={{ marginTop:56 }}>
          {items.map((s,i) => (
            <Reveal key={i} delay={i*0.04}>
              <motion.div onClick={() => setActive(active===i ? null : i)}
                style={{ borderTop:`1px solid ${C.border}`, padding:"28px 0", cursor:"pointer" }}
                whileHover={{ backgroundColor:"rgba(0,194,224,0.03)" }}
              >
                <div style={{ display:"flex", alignItems:"baseline", justifyContent:"space-between", gap:20 }}>
                  <div style={{ display:"flex", alignItems:"baseline", gap:18, flex:1 }}>
                    <span style={{ fontFamily:F.mono, fontSize:12, color:C.muted, minWidth:26 }}>{s.n}</span>
                    <h3 style={{
                      fontFamily:F.display, fontSize:"clamp(1.5rem,2.8vw,2.2rem)", fontWeight:400, fontStyle:"italic",
                      color: active===i ? C.cyan : C.pearl, transition:"color 0.3s", letterSpacing:-0.5,
                    }}>{s.title}</h3>
                  </div>
                  <motion.div animate={{rotate:active===i?45:0}} transition={{duration:0.3}} style={{ color:C.muted, fontSize:22, lineHeight:1 }}>+</motion.div>
                </div>
                <AnimatePresence>
                  {active===i && (
                    <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.3}} style={{ overflow:"hidden" }}>
                      <div style={{ paddingTop:16, paddingLeft:44, maxWidth:560 }}>
                        <p style={{ fontSize:15, color:C.silver, lineHeight:1.7, marginBottom:14 }}>{s.desc}</p>
                        <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                          {s.tags.map((t,ti) => (
                            <span key={ti} style={{ fontFamily:F.mono, fontSize:10, color:C.cyan, padding:"4px 12px", border:`1px solid ${C.border}`, borderRadius:100, letterSpacing:0.5 }}>{t}</span>
                          ))}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </Reveal>
          ))}
          <div style={{ borderTop:`1px solid ${C.border}` }} />
        </div>
      </Wrap>
    </section>
  );
};

/* ═══════════ PEARL WHITE SECTION — Benefits ═══════════ */
const BenefitsWhite = () => {
  const items = [
    { title:"Lower Operating Cost", desc:"Efficient automated treatment reduces chemical, energy, and maintenance spend." },
    { title:"Better Water Quality", desc:"Consistently exceed treated water specs for process and compliance." },
    { title:"Reduced Downtime", desc:"Redundant systems with predictive maintenance minimise unplanned outages." },
    { title:"Modular & Scalable", desc:"Containerised platforms that grow with your operation and can relocate." },
    { title:"Automation Ready", desc:"PLC/HMI control and cloud SCADA for hands-off, data-driven operation." },
    { title:"Turnkey Delivery", desc:"From concept through commissioning — fully integrated and site-ready." },
  ];

  return (
    <section style={{ padding:"120px 0", background:C.pearl }}>
      <Wrap>
        <Reveal><Label>Why AFWT</Label><Heading light>Measurable performance, long-term value.</Heading>
          <div style={{ width:48, height:3, background:C.cyanDark, borderRadius:2, marginBottom:24 }} />
        </Reveal>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(340px, 1fr))", gap:16, marginTop:40 }}>
          {items.map((b,i) => (
            <Reveal key={i} delay={i*0.05}>
              <motion.div whileHover={{ y:-4, boxShadow:"0 12px 40px rgba(11,29,54,0.1)" }}
                style={{ padding:32, borderRadius:12, background:C.white, border:`1px solid ${C.pearlWarm}`, transition:"all 0.3s", cursor:"default" }}>
                <div style={{ fontFamily:F.mono, fontSize:10, color:C.cyanDark, letterSpacing:2, marginBottom:14 }}>0{i+1}</div>
                <h3 style={{ fontFamily:F.heading, fontSize:17, fontWeight:700, color:C.navy, marginBottom:10 }}>{b.title}</h3>
                <p style={{ fontSize:14, color:C.muted, lineHeight:1.65 }}>{b.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </Wrap>
    </section>
  );
};

/* ═══════════ 3D PRODUCT SHOWCASE ═══════════ */
const Showcase = () => {
  const [active, setActive] = useState(0);
  const products = [
    { title:"Reverse Osmosis", desc:"High-rejection membrane systems for demineralisation, process water, and potable reuse.", tags:["TDS >99.5%","Energy Recovery"] },
    { title:"Ultrafiltration", desc:"Hollow-fibre UF membranes for turbidity removal and pre-treatment.", tags:["0.02µm","Auto Backwash"] },
    { title:"Chemical Dosing", desc:"Precision metering pumps and integrated dosing skids.", tags:["Multi-Stream","Flow-Proportional"] },
    { title:"Containerised", desc:"Plug-and-play water treatment in ISO containers.", tags:["Self-Contained","Relocatable"] },
    { title:"Remote Monitoring", desc:"Cloud SCADA with real-time dashboards and alerts.", tags:["24/7","Predictive"] },
    { title:"Service", desc:"Preventive maintenance and 24/7 emergency support.", tags:["Scheduled","Performance"] },
  ];

  return (
    <section id="systems" style={{ padding:"140px 0", background:C.navyLight, borderTop:`1px solid ${C.border}`, borderBottom:`1px solid ${C.border}` }}>
      <Wrap>
        <Reveal><Label>02 — Systems</Label><Heading>Built for performance.</Heading><Divider /></Reveal>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:48, marginTop:56, alignItems:"center" }} className="mcol">
          <Reveal delay={0.1}>
            <div style={{ height:440, borderRadius:16, overflow:"hidden", background:C.navy, border:`1px solid ${C.border}`, position:"relative" }}>
              <Canvas camera={{position:[0,0.5,4.5],fov:45}} gl={{antialias:true,alpha:true}}>
                <Suspense fallback={null}>
                  <ambientLight intensity={0.25} />
                  <directionalLight position={[3,4,5]} intensity={0.8} color="#a0c0e8" />
                  <pointLight position={[-2,2,3]} intensity={0.4} color={C.cyan} distance={10} />
                  <ProductModel type={active} />
                  <WaterDrops count={50} />
                  <fog attach="fog" args={[C.navy,4,12]} />
                </Suspense>
              </Canvas>
              <div style={{ position:"absolute", bottom:16, left:16, fontFamily:F.mono, fontSize:10, color:C.muted, letterSpacing:2 }}>INTERACTIVE 3D</div>
            </div>
          </Reveal>
          <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
            {products.map((p,i) => (
              <Reveal key={i} delay={0.1+i*0.04}>
                <motion.div onClick={() => setActive(i)} whileHover={{x:4}}
                  style={{
                    padding:"14px 16px", borderRadius:8, cursor:"pointer",
                    background: active===i ? `rgba(0,194,224,0.08)` : "transparent",
                    borderLeft: active===i ? `3px solid ${C.cyan}` : "3px solid transparent",
                    transition:"all 0.3s",
                  }}>
                  <h4 style={{ fontFamily:F.heading, fontSize:15, fontWeight:700, color: active===i ? C.cyan : C.silver, marginBottom: active===i ? 6 : 0, transition:"all 0.3s" }}>{p.title}</h4>
                  <AnimatePresence>
                    {active===i && (
                      <motion.div initial={{height:0,opacity:0}} animate={{height:"auto",opacity:1}} exit={{height:0,opacity:0}} transition={{duration:0.25}} style={{overflow:"hidden"}}>
                        <p style={{ fontSize:13, color:C.silver, lineHeight:1.6, marginBottom:8 }}>{p.desc}</p>
                        <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                          {p.tags.map((t,ti) => <span key={ti} style={{ fontFamily:F.mono, fontSize:10, color:C.cyan, padding:"3px 10px", border:`1px solid ${C.border}`, borderRadius:100 }}>{t}</span>)}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </Reveal>
            ))}
          </div>
        </div>
      </Wrap>
    </section>
  );
};

/* ═══════════ INDUSTRIES ═══════════ */
const Industries = () => {
  const items = [
    { name:"Food & Beverage", desc:"CIP water, product water, and wastewater for food-safe compliance." },
    { name:"Manufacturing", desc:"Process water, cooling towers, boiler feed, and effluent treatment." },
    { name:"Healthcare", desc:"Purified water and renal dialysis to pharmacopoeia standards." },
    { name:"Commercial", desc:"Cooling tower treatment, potable filtration, and greywater recycling." },
    { name:"Industrial", desc:"High-purity water for chemical, pharmaceutical, and semiconductor." },
    { name:"Utilities", desc:"Municipal drinking water, wastewater reuse, and remote supply." },
  ];

  return (
    <section id="industries" style={{ padding:"140px 0", background:C.navy, borderBottom:`1px solid ${C.border}` }}>
      <Wrap>
        <Reveal><Label>03 — Industries</Label><Heading>Trusted across sectors.</Heading><Divider /></Reveal>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", marginTop:56 }} className="mcol">
          {items.map((item,i) => (
            <Reveal key={i} delay={i*0.04}>
              <motion.div whileHover={{backgroundColor:"rgba(0,194,224,0.03)"}}
                style={{ padding:"36px 28px", borderTop:`1px solid ${C.border}`, borderRight:(i%3<2)?`1px solid ${C.border}`:"none", transition:"background 0.3s", cursor:"default", minHeight:170 }}>
                <div style={{ fontFamily:F.mono, fontSize:10, color:C.muted, letterSpacing:2, marginBottom:14 }}>0{i+1}</div>
                <h3 style={{ fontFamily:F.heading, fontSize:17, fontWeight:700, color:C.pearl, marginBottom:8 }}>{item.name}</h3>
                <p style={{ fontSize:14, color:C.muted, lineHeight:1.6 }}>{item.desc}</p>
              </motion.div>
            </Reveal>
          ))}
        </div>
      </Wrap>
    </section>
  );
};

/* ═══════════ CASE STUDY ═══════════ */
const CaseStudy = () => {
  const ref = useRef();
  const iv = useInView(ref, { once:true, margin:"-80px" });
  const stats = [
    { value:"500", unit:"kL/day", label:"Capacity" },
    { value:"99.8", unit:"%", label:"Uptime" },
    { value:"40", unit:"%", label:"Cost Saved" },
    { value:"24/7", unit:"", label:"Monitoring" },
  ];

  return (
    <section ref={ref} style={{ padding:"120px 0", background:C.pearl }}>
      <Wrap>
        <Reveal><Label>Case Study</Label><Heading light>Containerised micro-filtration replacing legacy infrastructure.</Heading>
          <div style={{ width:48, height:3, background:C.cyanDark, borderRadius:2, marginBottom:24 }} />
        </Reveal>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:56, marginTop:40, alignItems:"start" }} className="mcol">
          <Reveal delay={0.1}>
            <div style={{ borderRadius:12, overflow:"hidden", boxShadow:"0 20px 60px rgba(11,29,54,0.12)" }}>
              <img src="/images/engineers-planning.png" alt="AFWT" style={{ width:"100%", display:"block" }} />
            </div>
          </Reveal>
          <div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:28, marginBottom:40 }}>
              {stats.map((s,i) => (
                <motion.div key={i} initial={{opacity:0,y:15}} animate={iv?{opacity:1,y:0}:{}} transition={{duration:0.5,delay:0.3+i*0.1}}>
                  <div style={{ fontFamily:F.display, fontSize:"clamp(2rem,3.5vw,2.6rem)", fontWeight:400, fontStyle:"italic", color:C.navy, letterSpacing:-1 }}>
                    {s.value}<span style={{ fontSize:"0.45em", color:C.cyanDark, marginLeft:2 }}>{s.unit}</span>
                  </div>
                  <div style={{ fontFamily:F.mono, fontSize:10, color:C.muted, letterSpacing:2, marginTop:2, textTransform:"uppercase" }}>{s.label}</div>
                </motion.div>
              ))}
            </div>
            <Reveal delay={0.35}>
              <p style={{ fontSize:15, color:C.muted, lineHeight:1.75, marginBottom:20 }}>
                An industrial facility required replacement of ageing clarifiers and sand filters causing downtime and inconsistent water quality.
              </p>
              <p style={{ fontSize:15, color:C.muted, lineHeight:1.75 }}>
                AFWT delivered a containerised micro-filtration plant in a 40ft ISO container — fully automated with CIP, chemical dosing, PLC/HMI control, and cloud SCADA for 24/7 remote monitoring.
              </p>
            </Reveal>
          </div>
        </div>
      </Wrap>
    </section>
  );
};

/* ═══════════ MARQUEE ═══════════ */
const Marquee = () => {
  const t = ["Reverse Osmosis","Ultrafiltration","Chemical Dosing","Containerised Systems","Remote Monitoring","Automation","Service","Water Treatment"].map(x => `${x}  ·  `).join("");
  return (
    <div style={{ overflow:"hidden", padding:"18px 0", borderBottom:`1px solid ${C.border}`, background:C.navy }}>
      <div style={{ display:"flex", animation:"marquee 28s linear infinite", whiteSpace:"nowrap", width:"fit-content" }}>
        {[0,1].map(n => <span key={n} style={{ fontFamily:F.display, fontSize:"clamp(0.9rem,1.8vw,1.3rem)", fontStyle:"italic", color:C.muted, letterSpacing:1 }}>{t}</span>)}
      </div>
    </div>
  );
};

/* ═══════════ CONTACT ═══════════ */
const Contact = () => (
  <section id="contact" style={{ padding:"140px 0", background:C.navy, borderBottom:`1px solid ${C.border}` }}>
    <Wrap>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:72, alignItems:"start" }} className="mcol">
        <div>
          <Reveal>
            <Label>04 — Contact</Label>
            <h2 style={{ fontFamily:F.display, fontSize:"clamp(2.6rem,5.5vw,4.5rem)", fontWeight:400, fontStyle:"italic", color:C.pearl, lineHeight:1, letterSpacing:-2, marginBottom:28 }}>
              Let's work<br/>together.
            </h2>
          </Reveal>
          <Reveal delay={0.1}>
            <p style={{ fontSize:16, color:C.silver, lineHeight:1.7, maxWidth:360 }}>
              Whether you need a new filtration system, an upgrade, or ongoing service — our engineers are ready.
            </p>
          </Reveal>
          <Reveal delay={0.2}>
            <div style={{ marginTop:40, display:"flex", flexDirection:"column", gap:10 }}>
              {["Australian Owned & Operated","ISO 9001 Certified","24/7 Emergency Support","National Coverage"].map((t,i) => (
                <div key={i} style={{ display:"flex", alignItems:"center", gap:10, fontSize:13, color:C.muted }}>
                  <div style={{ width:5, height:5, borderRadius:"50%", background:C.cyan }} />{t}
                </div>
              ))}
            </div>
          </Reveal>
        </div>
        <Reveal delay={0.15}>
          <div style={{ display:"flex", flexDirection:"column", gap:0 }}>
            {[{l:"Full Name",p:"John Smith"},{l:"Email",p:"john@company.com"},{l:"Company",p:"Company name"},{l:"Message",p:"Tell us about your project...",ta:true}].map((f,i) => (
              <div key={i} style={{ borderBottom:`1px solid ${C.border}`, paddingBottom:14, marginBottom:22 }}>
                <label style={{ fontFamily:F.mono, fontSize:10, color:C.muted, letterSpacing:2, textTransform:"uppercase", display:"block", marginBottom:8 }}>{f.l}</label>
                {f.ta
                  ? <textarea placeholder={f.p} rows={3} style={{ width:"100%", background:"transparent", border:"none", outline:"none", color:C.pearl, fontFamily:F.body, fontSize:16, resize:"none", lineHeight:1.6 }} />
                  : <input placeholder={f.p} style={{ width:"100%", background:"transparent", border:"none", outline:"none", color:C.pearl, fontFamily:F.body, fontSize:16 }} />
                }
              </div>
            ))}
            <motion.button whileHover={{scale:1.02}} whileTap={{scale:0.98}}
              style={{ padding:"15px 32px", background:C.cyan, border:"none", borderRadius:100, color:C.navy, fontFamily:F.body, fontSize:14, fontWeight:700, cursor:"pointer", alignSelf:"flex-start", letterSpacing:0.5 }}
            >Send Message</motion.button>
          </div>
        </Reveal>
      </div>
    </Wrap>
  </section>
);

/* ═══════════ FOOTER ═══════════ */
const Footer = () => (
  <footer style={{ padding:"40px 0 28px", background:C.dark }}>
    <Wrap>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end", flexWrap:"wrap", gap:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <img src="/images/afwt-logo.png" alt="AFWT" style={{ height:28, objectFit:"contain" }} />
        </div>
        <div style={{ fontFamily:F.mono, fontSize:10, color:C.muted, letterSpacing:1 }}>© {new Date().getFullYear()} AFWT Group. All rights reserved.</div>
      </div>
    </Wrap>
  </footer>
);

/* ═══════════ APP ═══════════ */
export default function AFWTWebsite() {
  return (
    <div style={{ background:C.navy }}>
      <GlobalStyles />
      <Navbar />
      <Hero />
      <Intro />
      <ImageStrip />
      <Services />
      <BenefitsWhite />
      <Showcase />
      <Industries />
      <CaseStudy />
      <Marquee />
      <Contact />
      <Footer />
    </div>
  );
}
