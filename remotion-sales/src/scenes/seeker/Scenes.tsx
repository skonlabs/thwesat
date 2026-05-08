import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring, Sequence } from "remotion";
import { C, inter, display } from "../../components/theme";
import { StageBg, Caption, Logo, PhoneFrame, AppHeader, BottomNav, Tap, Pill } from "../../components/Phone";

/* =========================================================================
   SCENE 1 — Hook
   ========================================================================= */
export const S1_Hook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const k = spring({ frame: frame - 4, fps, config: { damping: 14 } });
  return (
    <AbsoluteFill>
      <StageBg tone="navy" />
      <AbsoluteFill style={{ padding: 120, justifyContent: "center" }}>
        <div style={{ opacity: interpolate(k, [0, 1], [0, 1]), transform: `translateY(${interpolate(k, [0, 1], [12, 0])}px)`, marginBottom: 30 }}>
          <Logo color={C.paper} size={32} />
        </div>
        <Caption kicker="For Job Seekers" title={"Land your next role.\n3× faster."} delay={14} />
        <div style={{ marginTop: 36, display: "flex", gap: 14, opacity: interpolate(spring({ frame: frame - 50, fps }), [0, 1], [0, 1]) }}>
          <Pill bg={C.paper} fg={C.navy}>Verified jobs</Pill>
          <Pill bg="rgba(255,255,255,0.12)" fg={C.paper}>1:1 mentors</Pill>
          <Pill bg="rgba(255,255,255,0.12)" fg={C.paper}>Career tools</Pill>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =========================================================================
   SCENE 2 — Onboard & sign up
   ========================================================================= */
export const S2_Onboard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <StageBg tone="paper" />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 140px", gap: 80 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.gold, letterSpacing: 2, textTransform: "uppercase" }}>Step 01</div>
          <div style={{ fontFamily: display, fontSize: 76, fontWeight: 700, color: C.ink, lineHeight: 1, marginTop: 10, letterSpacing: -1.5 }}>
            Sign up.<br />Pick your role.
          </div>
          <div style={{ fontFamily: inter, fontSize: 22, color: C.muted, marginTop: 22, maxWidth: 540, lineHeight: 1.4 }}>
            English or Burmese. Phone or email. 30 seconds to first value.
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <PhoneFrame width={460} delay={6} rotate={-2}>
            <AppHeader title="Welcome" sub="Choose how you'll use ThweSone" />
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 14 }}>
              {[
                { t: "Job Seeker", d: "Find a role abroad", on: true },
                { t: "Employer", d: "Hire global talent", on: false },
                { t: "Recruiting Agent", d: "Place candidates", on: false },
                { t: "Mentor", d: "Coach & earn", on: false },
              ].map((r, i) => {
                const appear = interpolate(frame - (10 + i * 6), [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return (
                  <div
                    key={r.t}
                    style={{
                      padding: 16,
                      borderRadius: 14,
                      border: `2px solid ${r.on ? C.gold : C.border}`,
                      background: r.on ? "#FFF7E5" : "#fff",
                      opacity: appear,
                      transform: `translateY(${interpolate(appear, [0, 1], [10, 0])}px)`,
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800, color: C.ink, fontSize: 16 }}>{r.t}</div>
                      <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{r.d}</div>
                    </div>
                    <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${r.on ? C.gold : C.border}`, background: r.on ? C.gold : "transparent" }} />
                  </div>
                );
              })}
              <div style={{ marginTop: 16, padding: 16, background: C.navy, color: C.paper, borderRadius: 14, textAlign: "center", fontWeight: 800, fontSize: 16 }}>Continue →</div>
            </div>
            <Tap x={230} y={650} delay={42} />
          </PhoneFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =========================================================================
   SCENE 3 — Build profile (CV upload + parse)
   ========================================================================= */
export const S3_Profile: React.FC = () => {
  const frame = useCurrentFrame();
  const fillPct = Math.min(95, interpolate(frame, [10, 100], [25, 95], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <AbsoluteFill>
      <StageBg tone="navy" />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 140px", gap: 80 }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <PhoneFrame width={460} delay={4}>
            <AppHeader title="My Profile" sub="Upload your CV — we'll extract everything" />
            <div style={{ padding: 24 }}>
              <div style={{ borderRadius: 14, border: `2px dashed ${C.gold}`, background: "#FFF7E5", padding: 22, textAlign: "center" }}>
                <div style={{ fontSize: 30, marginBottom: 6 }}>📄</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: C.ink }}>resume_kyaw_2026.pdf</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>Parsing skills, roles, education…</div>
                <div style={{ marginTop: 14, height: 8, borderRadius: 4, background: "#fff", overflow: "hidden" }}>
                  <div style={{ width: `${fillPct}%`, height: "100%", background: C.gold }} />
                </div>
              </div>

              <div style={{ marginTop: 18, fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: 1, textTransform: "uppercase" }}>Detected</div>
              {[
                { l: "Role", v: "Software Engineer" },
                { l: "Skills", v: "React · Python · SQL · AWS" },
                { l: "Years", v: "4 years" },
                { l: "Languages", v: "English, Burmese, Thai" },
              ].map((row, i) => {
                const a = interpolate(frame - (40 + i * 8), [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return (
                  <div key={row.l} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${C.border}`, opacity: a, transform: `translateY(${interpolate(a, [0, 1], [6, 0])}px)` }}>
                    <span style={{ fontSize: 12, color: C.muted }}>{row.l}</span>
                    <span style={{ fontSize: 12, fontWeight: 700, color: C.ink }}>{row.v}</span>
                  </div>
                );
              })}
            </div>
            <BottomNav active={4} />
          </PhoneFrame>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.gold, letterSpacing: 2, textTransform: "uppercase" }}>Step 02</div>
          <div style={{ fontFamily: display, fontSize: 76, fontWeight: 700, color: C.paper, lineHeight: 1, marginTop: 10, letterSpacing: -1.5 }}>
            Upload CV.<br />Profile builds itself.
          </div>
          <div style={{ fontFamily: inter, fontSize: 22, color: "rgba(250,247,242,0.7)", marginTop: 22, maxWidth: 540, lineHeight: 1.4 }}>
            Skills, experience, languages — extracted in seconds. Translated to English & Burmese automatically.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =========================================================================
   SCENE 4 — Career Tools (cover letter generation)
   ========================================================================= */
export const S4_CareerTools: React.FC = () => {
  const frame = useCurrentFrame();
  const lines = [
    "Dear hiring team,",
    "",
    "I'm excited to apply for the Senior",
    "Engineer role at Globe Telecom.",
    "With 4 years building scalable",
    "platforms in Yangon and Bangkok…",
  ];
  const charsPerFrame = 1.4;
  const totalChars = lines.join("\n").length;
  const visibleChars = Math.min(totalChars, Math.floor((frame - 18) * charsPerFrame));
  const text = lines.join("\n").slice(0, Math.max(0, visibleChars));

  return (
    <AbsoluteFill>
      <StageBg tone="paper" />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 140px", gap: 80 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.goldDeep, letterSpacing: 2, textTransform: "uppercase" }}>Step 03</div>
          <div style={{ fontFamily: display, fontSize: 76, fontWeight: 700, color: C.ink, lineHeight: 1, marginTop: 10, letterSpacing: -1.5 }}>
            Career Tools<br />do the work.
          </div>
          <div style={{ fontFamily: inter, fontSize: 22, color: C.muted, marginTop: 22, maxWidth: 540, lineHeight: 1.4 }}>
            Tailored cover letters, polished CVs, LinkedIn summaries, skill-gap plans — generated for every job in 30 seconds.
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <PhoneFrame width={460} delay={4} rotate={2}>
            <AppHeader title="Cover Letter" sub="For: Senior Engineer @ Globe" />
            <div style={{ padding: 24 }}>
              <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
                <Pill bg={C.navy} fg={C.paper}>Cover Letter</Pill>
                <Pill bg="#fff" fg={C.muted}>CV</Pill>
                <Pill bg="#fff" fg={C.muted}>LinkedIn</Pill>
              </div>
              <div
                style={{
                  background: "#fff",
                  border: `1px solid ${C.border}`,
                  borderRadius: 14,
                  padding: 18,
                  fontFamily: inter,
                  fontSize: 13,
                  color: C.ink,
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                  minHeight: 240,
                }}
              >
                {text}
                {visibleChars < totalChars && <span style={{ background: C.ink, width: 8, display: "inline-block", height: 14, marginLeft: 1, opacity: Math.sin(frame / 4) > 0 ? 1 : 0 }} />}
              </div>
              <div style={{ marginTop: 16, padding: 14, background: C.gold, color: C.navy, borderRadius: 12, textAlign: "center", fontWeight: 800, fontSize: 14 }}>
                Use this letter →
              </div>
            </div>
            <BottomNav active={2} />
          </PhoneFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =========================================================================
   SCENE 5 — Browse jobs
   ========================================================================= */
export const S5_BrowseJobs: React.FC = () => {
  const frame = useCurrentFrame();
  const scrollY = interpolate(frame, [10, 110], [0, -180], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const jobs = [
    { t: "Senior React Engineer", c: "Globe Telecom", l: "Singapore · Remote", s: "$5,200 / mo", safe: true },
    { t: "Full-Stack Developer", c: "GoTo Group", l: "Jakarta · Hybrid", s: "$4,100 / mo", safe: true },
    { t: "Backend Engineer", c: "Sea Group", l: "Bangkok · On-site", s: "$4,800 / mo", safe: false },
    { t: "Mobile Engineer (iOS)", c: "Grab", l: "Singapore · Hybrid", s: "$5,600 / mo", safe: true },
    { t: "Data Engineer", c: "Lazada", l: "Kuala Lumpur · Remote", s: "$4,400 / mo", safe: true },
  ];
  return (
    <AbsoluteFill>
      <StageBg tone="navy" />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 140px", gap: 80 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.gold, letterSpacing: 2, textTransform: "uppercase" }}>Step 04</div>
          <div style={{ fontFamily: display, fontSize: 76, fontWeight: 700, color: C.paper, lineHeight: 1, marginTop: 10, letterSpacing: -1.5 }}>
            Verified jobs.<br />One-tap apply.
          </div>
          <div style={{ fontFamily: inter, fontSize: 22, color: "rgba(250,247,242,0.7)", marginTop: 22, maxWidth: 540, lineHeight: 1.4 }}>
            Diaspora-safe roles across APAC. Transparent salary. Remote-friendly. Scam-screened by our moderators.
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <PhoneFrame width={460} delay={4}>
            <AppHeader title="Jobs" sub="142 new this week" />
            <div style={{ padding: 18, paddingBottom: 80, overflow: "hidden", height: 740 }}>
              <div style={{ transform: `translateY(${scrollY}px)`, display: "flex", flexDirection: "column", gap: 12 }}>
                {jobs.map((j, i) => (
                  <div key={j.t} style={{ background: "#fff", borderRadius: 14, border: `1px solid ${C.border}`, padding: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 8 }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: C.ink }}>{j.t}</div>
                        <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{j.c} · {j.l}</div>
                      </div>
                      {j.safe && <Pill bg="#D6F5E8" fg={C.emeraldDeep}>SAFE</Pill>}
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
   SCENE 6 — Apply + Book mentor
   ========================================================================= */
export const S6_ApplyMentor: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <StageBg tone="paper" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", padding: "60px 80px" }}>
        <Caption kicker="Step 05" title="Apply. Then prep with a mentor." color={C.ink} delay={4} align="center" />
        <div style={{ display: "flex", gap: 60, marginTop: 50, alignItems: "center" }}>
          <PhoneFrame width={400} delay={20} rotate={-3}>
            <AppHeader title="Apply" sub="Senior React Engineer @ Globe" />
            <div style={{ padding: 22 }}>
              <div style={{ background: "#fff", borderRadius: 12, padding: 14, border: `1px solid ${C.border}` }}>
                <div style={{ fontSize: 11, color: C.muted, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>Attached</div>
                <div style={{ marginTop: 8, fontSize: 13, fontWeight: 700, color: C.ink }}>📄 Tailored CV.pdf</div>
                <div style={{ marginTop: 4, fontSize: 13, fontWeight: 700, color: C.ink }}>✉️ Cover Letter.pdf</div>
              </div>
              <div style={{ marginTop: 16, padding: 16, background: C.navy, color: C.paper, borderRadius: 12, textAlign: "center", fontWeight: 800 }}>Submit Application</div>
              {frame > 50 && (
                <div style={{ marginTop: 14, padding: 12, background: "#D6F5E8", color: C.emeraldDeep, borderRadius: 12, textAlign: "center", fontWeight: 800, fontSize: 13, opacity: interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" }) }}>
                  ✓ Application sent
                </div>
              )}
            </div>
          </PhoneFrame>

          <div style={{ fontFamily: display, fontSize: 60, color: C.muted, opacity: interpolate(frame, [60, 80], [0, 1], { extrapolateRight: "clamp" }) }}>→</div>

          <PhoneFrame width={400} delay={70} rotate={3}>
            <AppHeader title="Book a Mentor" sub="Boost odds with 1:1 prep" />
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
              {[
                { n: "Aye Chan, Eng. Mgr @ Grab", t: "Mock interviews", p: "$25 / 30 min" },
                { n: "Min Htut, Sr Engineer @ Sea", t: "System design prep", p: "$30 / 30 min" },
                { n: "Su Lwin, Recruiter @ Globe", t: "Salary negotiation", p: "$20 / 30 min" },
              ].map((m, i) => {
                const a = interpolate(frame - (90 + i * 8), [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return (
                  <div key={m.n} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`, padding: 12, opacity: a, transform: `translateY(${interpolate(a, [0, 1], [8, 0])}px)`, display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ width: 36, height: 36, borderRadius: "50%", background: C.gold, color: C.navy, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{m.n[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 12, fontWeight: 800, color: C.ink }}>{m.n}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{m.t}</div>
                    </div>
                    <div style={{ fontSize: 11, fontWeight: 800, color: C.goldDeep }}>{m.p}</div>
                  </div>
                );
              })}
              {frame > 150 && (
                <div style={{ marginTop: 6, padding: 12, background: C.gold, color: C.navy, borderRadius: 12, textAlign: "center", fontWeight: 800, fontSize: 13, opacity: interpolate(frame, [150, 170], [0, 1], { extrapolateRight: "clamp" }) }}>
                  Booked · Tomorrow 7pm
                </div>
              )}
            </div>
          </PhoneFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* =========================================================================
   SCENE 7 — Hired
   ========================================================================= */
export const S7_Hired: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const big = spring({ frame: frame - 4, fps, config: { damping: 12, stiffness: 120 } });
  // Confetti
  const confetti = Array.from({ length: 40 }).map((_, i) => {
    const seed = (i * 9301 + 49297) % 233280;
    const x = (seed % 1920);
    const colors = [C.gold, C.emerald, C.paper, C.goldDeep];
    const color = colors[i % colors.length];
    const fall = interpolate(frame - i * 1.2, [0, 120], [-100, 1100], { extrapolateLeft: "clamp" });
    const sway = Math.sin((frame + i * 5) / 12) * 30;
    return <div key={i} style={{ position: "absolute", left: x + sway, top: fall, width: 12, height: 18, background: color, transform: `rotate(${frame * 4 + i * 30}deg)`, borderRadius: 2 }} />;
  });
  return (
    <AbsoluteFill>
      <StageBg tone="emerald" />
      {confetti}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", flexDirection: "column", textAlign: "center", padding: 80 }}>
        <div style={{ transform: `scale(${big})`, fontSize: 140 }}>🎉</div>
        <div style={{ fontFamily: display, fontSize: 110, fontWeight: 700, color: C.paper, letterSpacing: -2, lineHeight: 1, opacity: interpolate(frame, [20, 40], [0, 1], { extrapolateRight: "clamp" }), marginTop: 10 }}>
          You're hired.
        </div>
        <div style={{ fontFamily: inter, fontSize: 26, color: "rgba(255,255,255,0.85)", marginTop: 22, maxWidth: 900, opacity: interpolate(frame, [40, 70], [0, 1], { extrapolateRight: "clamp" }) }}>
          From sign-up to offer letter — all in one app.
        </div>
        <div style={{ marginTop: 50, opacity: interpolate(frame, [70, 100], [0, 1], { extrapolateRight: "clamp" }) }}>
          <Logo color={C.paper} size={36} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
