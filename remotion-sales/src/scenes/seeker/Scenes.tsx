import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { C, inter, display } from "../../components/theme";
import { StageBg, Caption, Logo, PhoneFrame, AppHeader, BottomNav, Tap, Pill } from "../../components/Phone";

/* ===== Helpers ===== */
const fadeIn = (frame: number, start: number, dur = 14) =>
  interpolate(frame - start, [0, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

const Sparkle: React.FC<{ x: number; y: number; delay: number; size?: number; color?: string }> = ({ x, y, delay, size = 18, color = C.gold }) => {
  const frame = useCurrentFrame();
  const t = frame - delay;
  if (t < 0 || t > 40) return null;
  const op = interpolate(t, [0, 8, 40], [0, 1, 0]);
  const sc = interpolate(t, [0, 20, 40], [0.4, 1.4, 0.6]);
  return (
    <div style={{ position: "absolute", left: x, top: y, width: size, height: size, opacity: op, transform: `translate(-50%, -50%) scale(${sc}) rotate(${t * 6}deg)` }}>
      <div style={{ position: "absolute", inset: 0, background: color, clipPath: "polygon(50% 0%, 60% 40%, 100% 50%, 60% 60%, 50% 100%, 40% 60%, 0% 50%, 40% 40%)" }} />
    </div>
  );
};

/* =========================================================================
   SCENE 1 — Hook (high-energy promise)
   ========================================================================= */
export const S1_Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: frame - 4, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill>
      <StageBg tone="navy" />
      {/* floating sparkles */}
      {[[200, 200, 0], [1600, 260, 8], [1700, 800, 16], [180, 820, 22], [960, 120, 30]].map(([x, y, d], i) => (
        <Sparkle key={i} x={x} y={y} delay={d} size={28} />
      ))}
      <AbsoluteFill style={{ padding: 120, justifyContent: "center" }}>
        <div style={{ opacity: interpolate(k, [0, 1], [0, 1]), transform: `translateY(${interpolate(k, [0, 1], [12, 0])}px)`, marginBottom: 30 }}>
          <Logo color={C.paper} size={32} />
        </div>
        <div style={{ fontFamily: inter, fontSize: 22, fontWeight: 800, letterSpacing: 4, color: C.gold, textTransform: "uppercase", marginBottom: 18, opacity: fadeIn(frame, 10) }}>For Job Seekers</div>
        <div style={{ fontFamily: display, fontSize: 124, fontWeight: 700, color: C.paper, lineHeight: 0.95, letterSpacing: -3, maxWidth: 1500, opacity: fadeIn(frame, 16, 18) }}>
          Land the job<br />
          of your <span style={{ color: C.gold, fontStyle: "italic" }}>dreams.</span>
        </div>
        <div style={{ fontFamily: inter, fontSize: 30, color: "rgba(250,247,242,0.78)", marginTop: 28, maxWidth: 1100, lineHeight: 1.35, opacity: fadeIn(frame, 38) }}>
          A personal coach, magical career tools and verified APAC jobs — all in one app.
        </div>
        <div style={{ marginTop: 44, display: "flex", gap: 14, opacity: fadeIn(frame, 56) }}>
          <Pill bg={C.gold} fg={C.navy}>1:1 interview coaching</Pill>
          <Pill bg="rgba(255,255,255,0.12)" fg={C.paper}>Magical CV & cover letters</Pill>
          <Pill bg="rgba(255,255,255,0.12)" fg={C.paper}>Verified jobs across APAC</Pill>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =========================================================================
   SCENE 2 — Onboard (kept tight, energetic)
   ========================================================================= */
export const S2_Onboard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <StageBg tone="paper" />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 140px", gap: 80 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.gold, letterSpacing: 3, textTransform: "uppercase" }}>30-second setup</div>
          <div style={{ fontFamily: display, fontSize: 92, fontWeight: 700, color: C.ink, lineHeight: 0.98, marginTop: 12, letterSpacing: -2 }}>
            Sign up.<br />Be matched.
          </div>
          <div style={{ fontFamily: inter, fontSize: 24, color: C.muted, marginTop: 22, maxWidth: 560, lineHeight: 1.4 }}>
            English or Burmese. Phone or email. Tell us your dream — we take it from there.
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <PhoneFrame width={460} delay={6} rotate={-2}>
            <AppHeader title="What brings you here?" sub="Pick what fits — change anytime" />
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { t: "Find a job abroad", d: "Verified APAC roles", on: true, e: "✦" },
                { t: "Get interview coaching", d: "From real industry mentors", on: true, e: "✦" },
                { t: "Polish my CV & LinkedIn", d: "Career Tools do the work", on: true, e: "✦" },
                { t: "Just exploring", d: "Browse safely, no pressure", on: false, e: "" },
              ].map((r, i) => {
                const a = fadeIn(frame, 10 + i * 6);
                return (
                  <div key={r.t} style={{ padding: 16, borderRadius: 14, border: `2px solid ${r.on ? C.gold : C.border}`, background: r.on ? "#FFF7E5" : "#fff", opacity: a, transform: `translateY(${interpolate(a, [0, 1], [10, 0])}px)`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontWeight: 800, color: C.ink, fontSize: 16 }}>{r.t}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{r.d}</div>
                    </div>
                    <div style={{ width: 26, height: 26, borderRadius: 8, background: r.on ? C.gold : "transparent", border: `2px solid ${r.on ? C.gold : C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.navy, fontWeight: 900 }}>{r.on ? "✓" : ""}</div>
                  </div>
                );
              })}
              <div style={{ marginTop: 14, padding: 16, background: C.navy, color: C.paper, borderRadius: 14, textAlign: "center", fontWeight: 800, fontSize: 16 }}>Continue →</div>
            </div>
            <Tap x={230} y={680} delay={56} />
          </PhoneFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =========================================================================
   SCENE 3 — Magic CV parse + auto-translate (WOW)
   ========================================================================= */
export const S3_Profile: React.FC = () => {
  const frame = useCurrentFrame();
  const fillPct = interpolate(frame, [10, 80], [10, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <AbsoluteFill>
      <StageBg tone="navy" />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 140px", gap: 80 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.gold, letterSpacing: 3, textTransform: "uppercase" }}>The Magic Begins</div>
          <div style={{ fontFamily: display, fontSize: 92, fontWeight: 700, color: C.paper, lineHeight: 0.98, marginTop: 12, letterSpacing: -2 }}>
            Drop your CV.<br />Watch it <span style={{ color: C.gold, fontStyle: "italic" }}>transform.</span>
          </div>
          <div style={{ fontFamily: inter, fontSize: 24, color: "rgba(250,247,242,0.75)", marginTop: 22, maxWidth: 560, lineHeight: 1.4 }}>
            Skills, roles, and education extracted in seconds. Auto-translated to English & Burmese. Polished for global recruiters.
          </div>
          <div style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap", opacity: fadeIn(frame, 50) }}>
            <Pill bg={C.gold} fg={C.navy}>✓ 18 skills extracted</Pill>
            <Pill bg="rgba(255,255,255,0.12)" fg={C.paper}>✓ Translated to မြန်မာ</Pill>
            <Pill bg="rgba(255,255,255,0.12)" fg={C.paper}>✓ ATS-optimized</Pill>
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center", position: "relative" }}>
          <PhoneFrame width={460} delay={4}>
            <AppHeader title="Build profile" sub="Drop your existing CV — we'll do the rest" />
            <div style={{ padding: 22 }}>
              <div style={{ borderRadius: 14, border: `2px dashed ${C.gold}`, background: "#FFF7E5", padding: 20, textAlign: "center" }}>
                <div style={{ width: 56, height: 70, borderRadius: 6, background: "#fff", border: `2px solid ${C.goldDeep}`, margin: "0 auto 8px", display: "flex", alignItems: "flex-end", padding: 6 }}>
                  <div style={{ fontSize: 9, fontWeight: 800, color: C.goldDeep, letterSpacing: 1 }}>PDF</div>
                </div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>resume_kyaw_2026.pdf</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{fillPct < 100 ? "Reading your story…" : "Done · 1.2s"}</div>
                <div style={{ marginTop: 12, height: 8, borderRadius: 4, background: "#fff", overflow: "hidden" }}>
                  <div style={{ width: `${fillPct}%`, height: "100%", background: C.gold }} />
                </div>
              </div>

              <div style={{ marginTop: 16, fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>Detected · Auto-filled</div>
              {[
                { l: "Role", v: "Software Engineer" },
                { l: "Experience", v: "4 years · Yangon → Bangkok" },
                { l: "Skills", v: "React · Python · SQL · AWS · Docker" },
                { l: "Languages", v: "English · မြန်မာ · ภาษาไทย" },
                { l: "Visa-ready", v: "Singapore · Malaysia · Thailand" },
              ].map((row, i) => {
                const a = fadeIn(frame, 50 + i * 7);
                return (
                  <div key={row.l} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${C.border}`, opacity: a, transform: `translateY(${interpolate(a, [0, 1], [6, 0])}px)`, gap: 10 }}>
                    <span style={{ fontSize: 11, color: C.muted, flexShrink: 0 }}>{row.l}</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: C.ink, textAlign: "right" }}>{row.v}</span>
                  </div>
                );
              })}
            </div>
            <BottomNav active={4} />
          </PhoneFrame>
          {/* sparkles around phone */}
          <Sparkle x={250} y={300} delay={45} size={24} />
          <Sparkle x={750} y={420} delay={52} size={28} />
          <Sparkle x={220} y={620} delay={62} size={22} />
          <Sparkle x={770} y={720} delay={70} size={26} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =========================================================================
   SCENE 4 — Career Tools: ONE click, MANY outputs (WOW)
   ========================================================================= */
export const S4_CareerTools: React.FC = () => {
  const frame = useCurrentFrame();
  // Three docs typing in parallel, slightly staggered
  const Doc: React.FC<{ title: string; tag: string; lines: string[]; rotate: number; delay: number; bg: string }> = ({ title, tag, lines, rotate, delay, bg }) => {
    const text = lines.join("\n");
    const speed = 1.6;
    const visible = Math.max(0, Math.min(text.length, Math.floor((frame - delay) * speed)));
    const slice = text.slice(0, visible);
    const enter = spring({ frame: frame - delay + 6, fps: 30, config: { damping: 18 } });
    return (
      <div style={{
        width: 320, minHeight: 380, background: "#fff", borderRadius: 18, padding: 18,
        boxShadow: "0 30px 60px rgba(15,11,34,0.18)",
        border: `1px solid ${C.border}`,
        transform: `rotate(${rotate}deg) translateY(${interpolate(enter, [0, 1], [40, 0])}px) scale(${interpolate(enter, [0, 1], [0.9, 1])})`,
        opacity: enter,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontFamily: display, fontWeight: 700, fontSize: 16, color: C.ink }}>{title}</div>
          <div style={{ background: bg, color: "#fff", fontSize: 9, fontWeight: 800, padding: "4px 8px", borderRadius: 999, letterSpacing: 1 }}>{tag}</div>
        </div>
        <div style={{ height: 4, background: bg, borderRadius: 2, marginBottom: 12, opacity: 0.4 }} />
        <div style={{ fontFamily: inter, fontSize: 11, lineHeight: 1.55, color: C.ink, whiteSpace: "pre-wrap", minHeight: 280 }}>
          {slice}
          {visible < text.length && <span style={{ background: C.ink, width: 6, display: "inline-block", height: 11, marginLeft: 1, opacity: Math.sin(frame / 4) > 0 ? 1 : 0 }} />}
        </div>
      </div>
    );
  };

  return (
    <AbsoluteFill>
      <StageBg tone="paper" />
      <AbsoluteFill style={{ padding: "60px 100px", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 30 }}>
          <div>
            <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.goldDeep, letterSpacing: 3, textTransform: "uppercase" }}>One tap. Three documents.</div>
            <div style={{ fontFamily: display, fontSize: 78, fontWeight: 700, color: C.ink, lineHeight: 1, marginTop: 8, letterSpacing: -1.5, maxWidth: 1100 }}>
              Career Tools that <span style={{ color: C.goldDeep, fontStyle: "italic" }}>actually</span> write for you.
            </div>
          </div>
          <div style={{ background: C.navy, color: C.paper, padding: "14px 22px", borderRadius: 999, fontFamily: inter, fontWeight: 800, fontSize: 16, opacity: fadeIn(frame, 6) }}>
            ✦ Generate for: Senior Engineer @ Globe Telecom
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 30, alignItems: "flex-start", marginTop: 10 }}>
          <Doc
            title="Tailored CV"
            tag="CV"
            bg={C.navy}
            rotate={-3}
            delay={20}
            lines={[
              "KYAW MIN HTUT",
              "Senior Software Engineer",
              "",
              "EXPERIENCE",
              "• Led React migration cutting",
              "  load time by 47% (Bangkok)",
              "• Shipped payments at scale",
              "  for 2M+ users (Yangon)",
              "",
              "SKILLS",
              "React · TypeScript · AWS",
              "Python · PostgreSQL · Docker",
            ]}
          />
          <Doc
            title="Cover Letter"
            tag="LETTER"
            bg={C.goldDeep}
            rotate={1}
            delay={28}
            lines={[
              "Dear Hiring Team,",
              "",
              "I'm thrilled to apply for the",
              "Senior Engineer role at Globe",
              "Telecom. With 4 years scaling",
              "platforms across Yangon and",
              "Bangkok, I bring a track record",
              "of shipping reliably under",
              "tight constraints — and the",
              "calm to mentor a growing team.",
              "",
              "Best,",
              "Kyaw",
            ]}
          />
          <Doc
            title="LinkedIn Headline"
            tag="SOCIAL"
            bg={C.emeraldDeep}
            rotate={3}
            delay={36}
            lines={[
              "Senior Software Engineer",
              "→ React · Python · AWS",
              "",
              "ABOUT",
              "I build resilient platforms",
              "that scale from Yangon to",
              "the world. 4 yrs across",
              "fintech, telecom, payments.",
              "",
              "Open to roles in:",
              "Singapore · Bangkok · KL",
              "Remote · Hybrid",
            ]}
          />
        </div>

        <div style={{ marginTop: 30, textAlign: "center", opacity: fadeIn(frame, 90) }}>
          <div style={{ fontFamily: inter, fontSize: 22, color: C.muted, fontWeight: 600 }}>
            Personalised for <span style={{ fontWeight: 800, color: C.ink }}>every job you apply to.</span> In under 30 seconds.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =========================================================================
   SCENE 5 — Skill-gap analysis (radar) → curated guides (NEW WOW)
   ========================================================================= */
export const S_SkillGap: React.FC = () => {
  const frame = useCurrentFrame();
  // animated radar polygon
  const cx = 230, cy = 230, r = 170;
  const skills = [
    { name: "React", current: 0.9, target: 0.95 },
    { name: "System Design", current: 0.45, target: 0.85 },
    { name: "Behavioural", current: 0.55, target: 0.9 },
    { name: "Salary Talk", current: 0.3, target: 0.8 },
    { name: "English", current: 0.7, target: 0.9 },
    { name: "AWS", current: 0.6, target: 0.8 },
  ];
  const angle = (i: number) => (Math.PI * 2 * i) / skills.length - Math.PI / 2;
  const grow = interpolate(frame, [10, 70], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const targetGrow = interpolate(frame, [60, 110], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const polyPoints = (radii: number[]) =>
    radii.map((rr, i) => {
      const a = angle(i);
      const x = cx + Math.cos(a) * r * rr;
      const y = cy + Math.sin(a) * r * rr;
      return `${x},${y}`;
    }).join(" ");

  return (
    <AbsoluteFill>
      <StageBg tone="navy" />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 120px", gap: 60 }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center" }}>
          <div style={{ background: "#fff", borderRadius: 24, padding: 30, boxShadow: "0 40px 80px rgba(0,0,0,0.3)", opacity: fadeIn(frame, 4) }}>
            <div style={{ fontFamily: display, fontWeight: 700, fontSize: 22, color: C.ink, marginBottom: 4 }}>Your Skill Map</div>
            <div style={{ fontFamily: inter, fontSize: 12, color: C.muted, marginBottom: 14 }}>vs Senior Engineer @ APAC fintechs</div>
            <svg width={460} height={460}>
              {/* grid rings */}
              {[0.25, 0.5, 0.75, 1].map((rr) => (
                <polygon key={rr} points={polyPoints(skills.map(() => rr))} fill="none" stroke={C.border} strokeWidth={1} />
              ))}
              {/* axes */}
              {skills.map((_, i) => {
                const a = angle(i);
                return <line key={i} x1={cx} y1={cy} x2={cx + Math.cos(a) * r} y2={cy + Math.sin(a) * r} stroke={C.border} strokeWidth={1} />;
              })}
              {/* target ring (gold dotted) */}
              <polygon
                points={polyPoints(skills.map(s => s.target * targetGrow))}
                fill={C.gold} fillOpacity={0.12} stroke={C.goldDeep} strokeWidth={2} strokeDasharray="6 4"
              />
              {/* current */}
              <polygon
                points={polyPoints(skills.map(s => s.current * grow))}
                fill={C.navy} fillOpacity={0.25} stroke={C.navy} strokeWidth={2.5}
              />
              {/* labels */}
              {skills.map((s, i) => {
                const a = angle(i);
                const lx = cx + Math.cos(a) * (r + 28);
                const ly = cy + Math.sin(a) * (r + 28);
                return (
                  <text key={s.name} x={lx} y={ly} fontFamily={inter} fontSize={12} fontWeight={800} fill={C.ink} textAnchor="middle" dominantBaseline="middle">
                    {s.name}
                  </text>
                );
              })}
            </svg>
            <div style={{ display: "flex", gap: 14, marginTop: 8, fontSize: 11, fontFamily: inter, color: C.muted }}>
              <span><span style={{ display: "inline-block", width: 12, height: 12, background: C.navy, borderRadius: 3, marginRight: 6, verticalAlign: "middle" }} />You today</span>
              <span><span style={{ display: "inline-block", width: 12, height: 12, background: C.gold, borderRadius: 3, marginRight: 6, verticalAlign: "middle" }} />Where you need to be</span>
            </div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.gold, letterSpacing: 3, textTransform: "uppercase" }}>Know your gap</div>
          <div style={{ fontFamily: display, fontSize: 78, fontWeight: 700, color: C.paper, lineHeight: 0.98, marginTop: 12, letterSpacing: -2 }}>
            See exactly<br />what's <span style={{ color: C.gold, fontStyle: "italic" }}>missing.</span>
          </div>
          <div style={{ fontFamily: inter, fontSize: 22, color: "rgba(250,247,242,0.75)", marginTop: 18, lineHeight: 1.4, maxWidth: 540 }}>
            Compare your profile to real hiring bars at top APAC companies. Get a focused 4-week plan.
          </div>
          <div style={{ marginTop: 26, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { t: "System Design crash-course", d: "12 lessons · 3 hrs · Free", a: 80 },
              { t: "Behavioural interview deck", d: "STAR templates · 18 stories", a: 95 },
              { t: "Salary negotiation script", d: "APAC market data · MMK + USD", a: 110 },
            ].map((g, i) => {
              const a = fadeIn(frame, g.a);
              return (
                <div key={g.t} style={{ background: "rgba(255,255,255,0.08)", border: `1px solid rgba(255,190,92,0.3)`, borderRadius: 14, padding: 14, opacity: a, transform: `translateX(${interpolate(a, [0, 1], [-20, 0])}px)`, display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: C.gold, color: C.navy, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>★</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: inter, fontWeight: 800, color: C.paper, fontSize: 16 }}>{g.t}</div>
                    <div style={{ fontFamily: inter, fontSize: 12, color: "rgba(250,247,242,0.6)" }}>{g.d}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =========================================================================
   SCENE 6 — 1:1 Interview Coaching (NEW WOW — video call mock)
   ========================================================================= */
export const S_Coach: React.FC = () => {
  const frame = useCurrentFrame();
  const confidence = interpolate(frame, [20, 130], [42, 92], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const feedback = [
    { t: 30, txt: "Great STAR structure", color: C.emerald },
    { t: 55, txt: "Slow down 10%", color: C.gold },
    { t: 80, txt: "Quantify impact — add numbers", color: C.gold },
    { t: 105, txt: "Confident tone — perfect", color: C.emerald },
  ];
  // Mentor talking pulse
  const pulse = 1 + Math.sin(frame / 6) * 0.04;

  return (
    <AbsoluteFill>
      <StageBg tone="paper" />
      <AbsoluteFill style={{ padding: "60px 100px", flexDirection: "column", alignItems: "center" }}>
        <div style={{ textAlign: "center", marginBottom: 28, opacity: fadeIn(frame, 0) }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.goldDeep, letterSpacing: 3, textTransform: "uppercase" }}>The Unfair Advantage</div>
          <div style={{ fontFamily: display, fontSize: 78, fontWeight: 700, color: C.ink, lineHeight: 1, marginTop: 8, letterSpacing: -1.5, maxWidth: 1300 }}>
            Practice with mentors who've <span style={{ color: C.goldDeep, fontStyle: "italic" }}>been there.</span>
          </div>
        </div>

        {/* Video call mock */}
        <div style={{ display: "flex", gap: 24, alignItems: "stretch", opacity: fadeIn(frame, 16) }}>
          {/* Mentor (large) */}
          <div style={{ width: 720, height: 460, borderRadius: 24, background: `linear-gradient(135deg, ${C.navy}, ${C.navyDeep})`, position: "relative", overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,0.25)" }}>
            <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 40%, rgba(255,190,92,0.18), transparent 60%)` }} />
            {/* avatar */}
            <div style={{ position: "absolute", left: "50%", top: "42%", transform: `translate(-50%,-50%) scale(${pulse})`, width: 200, height: 200, borderRadius: "50%", background: `linear-gradient(135deg, ${C.gold}, ${C.goldDeep})`, display: "flex", alignItems: "center", justifyContent: "center", color: C.navy, fontFamily: display, fontSize: 84, fontWeight: 700, boxShadow: "0 0 0 8px rgba(255,190,92,0.18)" }}>A</div>
            {/* name plate */}
            <div style={{ position: "absolute", left: 20, bottom: 20, background: "rgba(0,0,0,0.4)", color: "#fff", padding: "8px 14px", borderRadius: 10, fontFamily: inter, fontSize: 14, fontWeight: 700 }}>
              Aye Chan · Eng. Manager @ Grab
            </div>
            <div style={{ position: "absolute", right: 20, top: 20, background: "rgba(255,75,75,0.9)", color: "#fff", padding: "6px 12px", borderRadius: 999, fontFamily: inter, fontSize: 11, fontWeight: 800, letterSpacing: 1 }}>● LIVE · 12:47</div>
            {/* mock interview bubble */}
            <div style={{ position: "absolute", left: 30, top: 30, background: "rgba(255,255,255,0.95)", color: C.ink, padding: "10px 14px", borderRadius: 14, maxWidth: 360, fontFamily: inter, fontSize: 13, fontWeight: 600, opacity: fadeIn(frame, 24), boxShadow: "0 10px 30px rgba(0,0,0,0.15)" }}>
              "Walk me through a time you shipped under a tight deadline."
            </div>
          </div>

          {/* Side panel: live coaching feedback + confidence */}
          <div style={{ width: 380, display: "flex", flexDirection: "column", gap: 14 }}>
            {/* You (small tile) */}
            <div style={{ height: 140, borderRadius: 18, background: `linear-gradient(135deg, ${C.emerald}, ${C.emeraldDeep})`, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontFamily: display, fontWeight: 700, fontSize: 60, position: "relative" }}>
              K
              <div style={{ position: "absolute", left: 12, bottom: 12, fontFamily: inter, fontSize: 12, fontWeight: 700, background: "rgba(0,0,0,0.3)", padding: "4px 10px", borderRadius: 8 }}>You</div>
            </div>
            {/* Confidence meter */}
            <div style={{ background: "#fff", borderRadius: 18, padding: 18, border: `1px solid ${C.border}`, boxShadow: "0 14px 40px rgba(0,0,0,0.08)" }}>
              <div style={{ fontFamily: inter, fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>Interview Confidence</div>
              <div style={{ fontFamily: display, fontSize: 44, fontWeight: 700, color: C.ink, lineHeight: 1, marginTop: 4 }}>{Math.round(confidence)}%</div>
              <div style={{ marginTop: 10, height: 10, borderRadius: 5, background: C.border, overflow: "hidden" }}>
                <div style={{ width: `${confidence}%`, height: "100%", background: `linear-gradient(90deg, ${C.gold}, ${C.emerald})` }} />
              </div>
              <div style={{ fontFamily: inter, fontSize: 11, color: C.muted, marginTop: 8 }}>Based on tone, structure & clarity</div>
            </div>
            {/* live feedback bubbles */}
            <div style={{ background: "#fff", borderRadius: 18, padding: 14, border: `1px solid ${C.border}`, boxShadow: "0 14px 40px rgba(0,0,0,0.08)", flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
              <div style={{ fontFamily: inter, fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: 1, textTransform: "uppercase", marginBottom: 4 }}>Coach feedback</div>
              {feedback.map((f, i) => {
                const a = fadeIn(frame, f.t);
                return (
                  <div key={i} style={{ opacity: a, transform: `translateY(${interpolate(a, [0, 1], [10, 0])}px)`, display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: f.color === C.emerald ? "#E6F8EF" : "#FFF7E5", borderRadius: 10 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: f.color }} />
                    <div style={{ fontFamily: inter, fontSize: 13, fontWeight: 700, color: C.ink }}>{f.txt}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 24, fontFamily: inter, fontSize: 20, color: C.muted, opacity: fadeIn(frame, 130), textAlign: "center" }}>
          Mock interviews · CV reviews · Visa & legal · Salary negotiation · Company culture
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =========================================================================
   SCENE 7 — Browse verified jobs (compact)
   ========================================================================= */
export const S5_BrowseJobs: React.FC = () => {
  const frame = useCurrentFrame();
  const scrollY = interpolate(frame, [10, 110], [0, -180], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const jobs = [
    { t: "Senior React Engineer", c: "Globe Telecom", l: "Singapore · Remote", s: "$5,200 / mo", safe: true },
    { t: "Full-Stack Developer", c: "GoTo Group", l: "Jakarta · Hybrid", s: "$4,100 / mo", safe: true },
    { t: "Backend Engineer", c: "Sea Group", l: "Bangkok · On-site", s: "$4,800 / mo", safe: true },
    { t: "Mobile Engineer (iOS)", c: "Grab", l: "Singapore · Hybrid", s: "$5,600 / mo", safe: true },
    { t: "Data Engineer", c: "Lazada", l: "Kuala Lumpur · Remote", s: "$4,400 / mo", safe: true },
  ];
  return (
    <AbsoluteFill>
      <StageBg tone="navy" />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 140px", gap: 80 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.gold, letterSpacing: 3, textTransform: "uppercase" }}>Verified · Scam-screened</div>
          <div style={{ fontFamily: display, fontSize: 92, fontWeight: 700, color: C.paper, lineHeight: 0.98, marginTop: 12, letterSpacing: -2 }}>
            Real jobs.<br />Real <span style={{ color: C.gold, fontStyle: "italic" }}>salaries.</span>
          </div>
          <div style={{ fontFamily: inter, fontSize: 22, color: "rgba(250,247,242,0.75)", marginTop: 22, maxWidth: 560, lineHeight: 1.4 }}>
            Diaspora-safe roles across Singapore, Bangkok, KL, Jakarta. Every employer verified by our moderators.
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <PhoneFrame width={460} delay={4}>
            <AppHeader title="Jobs for you" sub="142 new this week · matched to your skills" />
            <div style={{ padding: 18, paddingBottom: 80, overflow: "hidden", height: 740 }}>
              <div style={{ transform: `translateY(${scrollY}px)`, display: "flex", flexDirection: "column", gap: 12 }}>
                {jobs.map((j) => (
                  <div key={j.t} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.border}`, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: C.ink }}>{j.t}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{j.c} · {j.l}</div>
                      </div>
                      {j.safe && <Pill bg="#D6F5E8" fg={C.emeraldDeep}>VERIFIED</Pill>}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 13, fontWeight: 800, color: C.goldDeep }}>{j.s}</div>
                  </div>
                ))}
              </div>
            </div>
            <BottomNav active={1} />
            <Tap x={230} y={420} delay={120} />
          </PhoneFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =========================================================================
   SCENE 8 — Apply with one tap + booked mentor (compact)
   ========================================================================= */
export const S6_ApplyMentor: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <StageBg tone="paper" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", padding: "60px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.goldDeep, letterSpacing: 3, textTransform: "uppercase" }}>Apply in seconds</div>
          <div style={{ fontFamily: display, fontSize: 76, fontWeight: 700, color: C.ink, lineHeight: 1, marginTop: 8, letterSpacing: -1.5 }}>
            Apply, then prep with a mentor.
          </div>
        </div>
        <div style={{ display: "flex", gap: 50, alignItems: "center" }}>
          <PhoneFrame width={400} delay={10} rotate={-3}>
            <AppHeader title="Apply" sub="Senior React @ Globe" />
            <div style={{ padding: 22 }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Auto-attached</div>
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: C.ink }}>■ Tailored CV.pdf</div>
                <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: C.ink }}>■ Cover Letter.pdf</div>
              </div>
              <div style={{ marginTop: 16, padding: 16, background: C.navy, color: C.paper, borderRadius: 12, textAlign: "center", fontWeight: 800 }}>Submit Application</div>
              <div style={{ marginTop: 14, padding: 12, background: "#D6F5E8", color: C.emeraldDeep, borderRadius: 12, textAlign: "center", fontWeight: 800, fontSize: 13, opacity: fadeIn(frame, 50, 18) }}>
                ✓ Sent · Recruiter notified
              </div>
            </div>
          </PhoneFrame>

          <div style={{ fontFamily: display, fontSize: 60, color: C.muted, opacity: fadeIn(frame, 60) }}>→</div>

          <PhoneFrame width={400} delay={70} rotate={3}>
            <AppHeader title="Book mock interview" sub="Tomorrow with Aye Chan" />
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { t: "Wed 7:00 PM", d: "30 min · $25" },
                { t: "Thu 8:30 PM", d: "30 min · $25", on: true },
                { t: "Sat 10:00 AM", d: "30 min · $25" },
              ].map((s, i) => {
                const a = fadeIn(frame, 90 + i * 8);
                return (
                  <div key={s.t} style={{ padding: 14, borderRadius: 12, border: `2px solid ${s.on ? C.gold : C.border}`, background: s.on ? "#FFF7E5" : "#fff", opacity: a, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{s.t}</div>
                      <div style={{ fontSize: 11, color: C.muted }}>{s.d}</div>
                    </div>
                    {s.on && <div style={{ width: 22, height: 22, borderRadius: "50%", background: C.gold, color: C.navy, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>✓</div>}
                  </div>
                );
              })}
              <div style={{ marginTop: 6, padding: 14, background: C.gold, color: C.navy, borderRadius: 12, textAlign: "center", fontWeight: 800, fontSize: 13, opacity: fadeIn(frame, 130) }}>
                Confirm booking
              </div>
            </div>
          </PhoneFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =========================================================================
   SCENE 9 — Offer letter close (replaces blunt "hired")
   ========================================================================= */
export const S7_Hired: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const big = spring({ frame: frame - 4, fps, config: { damping: 12, stiffness: 120 } });
  const confetti = Array.from({ length: 50 }).map((_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const x = (seed % 1920);
    const colors = [C.gold, C.emerald, C.paper, C.goldDeep];
    const color = colors[i % colors.length];
    const fall = interpolate(frame - i * 1.2, [0, 130], [-100, 1100], { extrapolateLeft: "clamp" });
    const sway = Math.sin((frame + i * 5) / 12) * 30;
    return <div key={i} style={{ position: "absolute", left: x + sway, top: fall, width: 12, height: 18, background: color, transform: `rotate(${frame * 4 + i * 30}deg)`, borderRadius: 2 }} />;
  });
  return (
    <AbsoluteFill>
      <StageBg tone="emerald" />
      {confetti}
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 140px", gap: 60 }}>
        {/* Offer letter mock */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <div style={{
            width: 460, background: "#fff", borderRadius: 16, padding: 36,
            boxShadow: "0 50px 100px rgba(0,0,0,0.35)",
            transform: `scale(${interpolate(big, [0, 1], [0.85, 1])}) rotate(-4deg)`,
            opacity: big,
          }}>
            <div style={{ fontFamily: inter, fontSize: 11, fontWeight: 800, color: C.goldDeep, letterSpacing: 2, textTransform: "uppercase" }}>Globe Telecom · Singapore</div>
            <div style={{ fontFamily: display, fontSize: 36, fontWeight: 700, color: C.ink, lineHeight: 1.05, marginTop: 8 }}>Offer of Employment</div>
            <div style={{ height: 3, width: 60, background: C.gold, marginTop: 12, marginBottom: 18 }} />
            <div style={{ fontFamily: inter, fontSize: 13, color: C.ink, lineHeight: 1.6 }}>
              Dear <b>Kyaw Min Htut</b>,<br /><br />
              We are delighted to offer you the position of <b>Senior Software Engineer</b>, starting 1 July 2026.
            </div>
            <div style={{ marginTop: 18, padding: 14, background: "#FFF7E5", borderRadius: 12, border: `1px solid ${C.gold}` }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: inter, fontSize: 12, color: C.muted }}><span>Base salary</span><b style={{ color: C.ink }}>SGD 7,200 / mo</b></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: inter, fontSize: 12, color: C.muted, marginTop: 6 }}><span>Sign-on bonus</span><b style={{ color: C.ink }}>SGD 8,000</b></div>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: inter, fontSize: 12, color: C.muted, marginTop: 6 }}><span>Relocation</span><b style={{ color: C.ink }}>Covered</b></div>
            </div>
            <div style={{ marginTop: 16, fontFamily: display, fontSize: 24, color: C.goldDeep, fontStyle: "italic" }}>Welcome aboard.</div>
          </div>
        </div>

        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: inter, fontSize: 18, fontWeight: 800, color: C.paper, letterSpacing: 4, textTransform: "uppercase", opacity: fadeIn(frame, 30) }}>From sign-up to offer letter</div>
          <div style={{ fontFamily: display, fontSize: 132, fontWeight: 700, color: C.paper, lineHeight: 0.9, marginTop: 14, letterSpacing: -3, opacity: fadeIn(frame, 40) }}>
            All in <span style={{ fontStyle: "italic" }}>one</span><br />app.
          </div>
          <div style={{ marginTop: 36, opacity: fadeIn(frame, 80) }}>
            <Logo color={C.paper} size={36} />
          </div>
          <div style={{ marginTop: 14, fontFamily: inter, fontSize: 18, color: "rgba(255,255,255,0.7)", opacity: fadeIn(frame, 90) }}>
            thwesat.com
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
