import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, spring } from "remotion";
import { C, inter, display } from "../../components/theme";
import { StageBg, Caption, Logo, PhoneFrame, AppHeader, BottomNav, Tap, Pill } from "../../components/Phone";

/* SCENE 1 — Hook */
export const A1_Hook: React.FC = () => {
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
        <Caption kicker="For Recruiting Agents" title={"Post jobs.\nPlace talent.\nGet paid."} delay={14} />
        <div style={{ marginTop: 36, display: "flex", gap: 14, opacity: interpolate(spring({ frame: frame - 50, fps }), [0, 1], [0, 1]) }}>
          <Pill bg={C.paper} fg={C.navy}>Verified employers</Pill>
          <Pill bg="rgba(255,255,255,0.12)" fg={C.paper}>Quality candidates</Pill>
          <Pill bg="rgba(255,255,255,0.12)" fg={C.paper}>Placement fees</Pill>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* SCENE 2 — Onboard as Agent */
export const A2_Onboard: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <StageBg tone="paper" />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 140px", gap: 80 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.gold, letterSpacing: 2, textTransform: "uppercase" }}>Step 01</div>
          <div style={{ fontFamily: display, fontSize: 76, fontWeight: 700, color: C.ink, lineHeight: 1, marginTop: 10, letterSpacing: -1.5 }}>
            Sign up as<br />a Recruiting Agent.
          </div>
          <div style={{ fontFamily: inter, fontSize: 22, color: C.muted, marginTop: 22, maxWidth: 540, lineHeight: 1.4 }}>
            Verify agency. Add team. Start posting jobs in minutes.
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <PhoneFrame width={460} delay={6} rotate={-2}>
            <AppHeader title="Agency Setup" sub="Tell us about your agency" />
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { l: "Agency Name", v: "Mandalay Talent Co." },
                { l: "Country", v: "Myanmar → APAC" },
                { l: "Specialisation", v: "Tech · Finance · Healthcare" },
                { l: "Team Size", v: "8 recruiters" },
              ].map((row, i) => {
                const a = interpolate(frame - (10 + i * 7), [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return (
                  <div key={row.l} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 12, padding: 14, opacity: a, transform: `translateY(${interpolate(a, [0, 1], [10, 0])}px)` }}>
                    <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{row.l}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: C.ink, marginTop: 4 }}>{row.v}</div>
                  </div>
                );
              })}
              <div style={{ marginTop: 8, padding: 14, background: C.navy, color: C.paper, borderRadius: 12, textAlign: "center", fontWeight: 800 }}>Verify & continue →</div>
              {frame > 80 && (
                <div style={{ padding: 10, background: "#D6F5E8", color: C.emeraldDeep, borderRadius: 10, textAlign: "center", fontWeight: 800, fontSize: 12, opacity: interpolate(frame, [80, 100], [0, 1], { extrapolateRight: "clamp" }) }}>
                  ✓ Agency verified
                </div>
              )}
            </div>
          </PhoneFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* SCENE 3 — Post a job */
export const A3_PostJob: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <StageBg tone="navy" />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 140px", gap: 80 }}>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <PhoneFrame width={460} delay={4}>
            <AppHeader title="Post a Job" sub="On behalf of: Globe Telecom" />
            <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { l: "Title", v: "Senior React Engineer" },
                { l: "Location", v: "Singapore · Remote OK" },
                { l: "Salary", v: "$5,000 – $5,500 / mo" },
                { l: "Skills", v: "React · TypeScript · AWS" },
                { l: "Diaspora-safe", v: "Yes — visa sponsored", check: true },
              ].map((row, i) => {
                const a = interpolate(frame - (8 + i * 7), [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return (
                  <div key={row.l} style={{ background: "#fff", border: `1px solid ${C.border}`, borderRadius: 10, padding: 12, opacity: a, transform: `translateY(${interpolate(a, [0, 1], [8, 0])}px)`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <div style={{ fontSize: 10, color: C.muted, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase" }}>{row.l}</div>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.ink, marginTop: 2 }}>{row.v}</div>
                    </div>
                    {row.check && <div style={{ width: 20, height: 20, borderRadius: 4, background: C.emerald, color: "#fff", fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>✓</div>}
                  </div>
                );
              })}
              <div style={{ marginTop: 6, padding: 14, background: C.gold, color: C.navy, borderRadius: 12, textAlign: "center", fontWeight: 800 }}>Submit for review</div>
            </div>
            <Tap x={230} y={780} delay={90} />
          </PhoneFrame>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.gold, letterSpacing: 2, textTransform: "uppercase" }}>Step 02</div>
          <div style={{ fontFamily: display, fontSize: 76, fontWeight: 700, color: C.paper, lineHeight: 1, marginTop: 10, letterSpacing: -1.5 }}>
            Post a job<br />in 90 seconds.
          </div>
          <div style={{ fontFamily: inter, fontSize: 22, color: "rgba(250,247,242,0.7)", marginTop: 22, maxWidth: 540, lineHeight: 1.4 }}>
            Title, location, salary, skills. Auto-translated to Burmese. Goes straight to admin review.
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* SCENE 4 — Admin approval moment */
export const A4_AdminApproval: React.FC = () => {
  const frame = useCurrentFrame();
  const stamp = spring({ frame: frame - 80, fps: 30, config: { damping: 8, stiffness: 150 } });
  return (
    <AbsoluteFill>
      <StageBg tone="paper" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80, flexDirection: "column" }}>
        <div style={{ textAlign: "center", marginBottom: 30 }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.goldDeep, letterSpacing: 2, textTransform: "uppercase" }}>Behind the scenes</div>
          <div style={{ fontFamily: display, fontSize: 70, fontWeight: 700, color: C.ink, marginTop: 10, letterSpacing: -1.5, lineHeight: 1 }}>
            Admin reviews every job.
          </div>
          <div style={{ fontFamily: inter, fontSize: 20, color: C.muted, marginTop: 16 }}>
            Trust by design — no scams reach candidates.
          </div>
        </div>

        {/* admin desktop card */}
        <div style={{ width: 1100, background: "#fff", borderRadius: 18, border: `1px solid ${C.border}`, boxShadow: "0 30px 80px rgba(15,11,34,0.18)", overflow: "hidden", position: "relative" }}>
          <div style={{ background: C.navy, color: C.paper, padding: "14px 22px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontFamily: display, fontSize: 18, fontWeight: 700 }}>Admin · Job Queue</div>
            <Pill bg={C.gold} fg={C.navy}>3 pending</Pill>
          </div>
          <div style={{ padding: 22, display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { t: "Senior React Engineer", c: "Globe Telecom · via Mandalay Talent Co.", new: true },
              { t: "Backend Engineer", c: "Sea Group · via Yangon Recruiters", new: false },
              { t: "Mobile Engineer", c: "Grab · via APAC Talent Hub", new: false },
            ].map((j, i) => {
              const a = interpolate(frame - (10 + i * 10), [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
              return (
                <div key={j.t} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 18px", background: j.new ? "#FFF7E5" : "#FAF7F2", borderRadius: 12, border: `1px solid ${j.new ? C.gold : C.border}`, opacity: a, transform: `translateY(${interpolate(a, [0, 1], [10, 0])}px)` }}>
                  <div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: C.ink, fontFamily: inter }}>{j.t}</div>
                    <div style={{ fontSize: 13, color: C.muted, marginTop: 2 }}>{j.c}</div>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Pill bg="#fff" fg={C.muted}>Reject</Pill>
                    <Pill bg={C.emerald} fg="#fff">Approve</Pill>
                  </div>
                </div>
              );
            })}
          </div>
          {/* Approved stamp */}
          <div style={{ position: "absolute", top: 80, right: 80, transform: `rotate(-12deg) scale(${stamp})`, opacity: stamp, padding: "10px 20px", border: `4px solid ${C.emeraldDeep}`, borderRadius: 12, color: C.emeraldDeep, fontFamily: display, fontWeight: 700, fontSize: 28, letterSpacing: 2 }}>
            APPROVED
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* SCENE 5 — Candidates apply */
export const A5_Candidates: React.FC = () => {
  const frame = useCurrentFrame();
  const cands = [
    { n: "Kyaw M.", role: "4y · React · SG-based", match: 96 },
    { n: "Nilar W.", role: "5y · Full-stack · Yangon", match: 91 },
    { n: "Thant Z.", role: "3y · Frontend · Bangkok", match: 88 },
    { n: "Su Lwin", role: "6y · Senior Eng · Singapore", match: 85 },
  ];
  return (
    <AbsoluteFill>
      <StageBg tone="navy" />
      <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", padding: "0 140px", gap: 80 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: C.gold, letterSpacing: 2, textTransform: "uppercase" }}>Step 03</div>
          <div style={{ fontFamily: display, fontSize: 76, fontWeight: 700, color: C.paper, lineHeight: 1, marginTop: 10, letterSpacing: -1.5 }}>
            Candidates<br />come to you.
          </div>
          <div style={{ fontFamily: inter, fontSize: 22, color: "rgba(250,247,242,0.7)", marginTop: 22, maxWidth: 540, lineHeight: 1.4 }}>
            Pre-screened, profile-complete applicants with parsed CVs and skill matches. Shortlist in one tap.
          </div>
        </div>
        <div style={{ flex: 1, display: "flex", justifyContent: "center" }}>
          <PhoneFrame width={460} delay={4} rotate={2}>
            <AppHeader title="Applicants" sub="Senior React Engineer · 24 applied" />
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 10 }}>
              {cands.map((c, i) => {
                const a = interpolate(frame - (10 + i * 10), [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
                return (
                  <div key={c.n} style={{ background: "#fff", borderRadius: 12, border: `1px solid ${C.border}`, padding: 12, display: "flex", alignItems: "center", gap: 12, opacity: a, transform: `translateY(${interpolate(a, [0, 1], [10, 0])}px)` }}>
                    <div style={{ width: 40, height: 40, borderRadius: "50%", background: C.navy, color: C.gold, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center" }}>{c.n[0]}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: C.ink }}>{c.n}</div>
                      <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>{c.role}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 16, fontWeight: 900, color: C.emeraldDeep }}>{c.match}%</div>
                      <div style={{ fontSize: 9, color: C.muted, fontWeight: 700, letterSpacing: 1 }}>MATCH</div>
                    </div>
                  </div>
                );
              })}
            </div>
            <BottomNav active={1} />
            <Tap x={230} y={300} delay={90} />
          </PhoneFrame>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* SCENE 6 — Submit & track */
export const A6_Track: React.FC = () => {
  const frame = useCurrentFrame();
  const stages = [
    { l: "Submitted", at: 0, color: C.muted },
    { l: "Reviewed", at: 30, color: C.blue },
    { l: "Interviewed", at: 70, color: C.gold },
    { l: "Offer", at: 110, color: C.goldDeep },
    { l: "Hired", at: 150, color: C.emerald },
  ];
  return (
    <AbsoluteFill>
      <StageBg tone="paper" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80, flexDirection: "column" }}>
        <Caption kicker="Step 04" title="Track every placement live." color={C.ink} delay={4} align="center" />
        <div style={{ marginTop: 60, width: 1300, background: "#fff", borderRadius: 20, padding: 40, border: `1px solid ${C.border}`, boxShadow: "0 30px 80px rgba(15,11,34,0.12)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 30 }}>
            <div>
              <div style={{ fontFamily: display, fontSize: 28, fontWeight: 700, color: C.ink }}>Kyaw M. → Globe Telecom</div>
              <div style={{ fontSize: 14, color: C.muted, marginTop: 4 }}>Senior React Engineer · Singapore</div>
            </div>
            <Pill bg={C.gold} fg={C.navy}>Live</Pill>
          </div>
          {/* progress bar */}
          <div style={{ position: "relative", height: 6, background: C.border, borderRadius: 3, marginBottom: 50 }}>
            <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${interpolate(frame, [10, 170], [10, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" })}%`, background: `linear-gradient(90deg, ${C.gold}, ${C.emerald})`, borderRadius: 3 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            {stages.map((s, i) => {
              const active = frame > s.at + 10;
              const pop = spring({ frame: frame - (s.at + 10), fps: 30, config: { damping: 12 } });
              return (
                <div key={s.l} style={{ textAlign: "center", flex: 1 }}>
                  <div style={{ width: 60, height: 60, borderRadius: "50%", margin: "0 auto", background: active ? s.color : C.border, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22, transform: `scale(${active ? pop : 1})` }}>
                    {active ? "✓" : i + 1}
                  </div>
                  <div style={{ marginTop: 12, fontSize: 16, fontWeight: 800, color: active ? C.ink : C.muted, fontFamily: inter }}>{s.l}</div>
                </div>
              );
            })}
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* SCENE 7 — Placement fee + admin payout */
export const A7_Payout: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const big = spring({ frame: frame - 80, fps, config: { damping: 10, stiffness: 130 } });
  return (
    <AbsoluteFill>
      <StageBg tone="emerald" />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", padding: 80, flexDirection: "column" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontFamily: inter, fontSize: 16, fontWeight: 800, color: "rgba(255,255,255,0.85)", letterSpacing: 2, textTransform: "uppercase" }}>Step 05 · Get paid</div>
          <div style={{ fontFamily: display, fontSize: 90, fontWeight: 700, color: C.paper, lineHeight: 1, marginTop: 12, letterSpacing: -2 }}>
            Placement fee, settled.
          </div>
        </div>

        <div style={{ marginTop: 50, display: "flex", gap: 30, alignItems: "center" }}>
          {/* Payment proof card */}
          <div style={{ background: "#fff", borderRadius: 18, padding: 26, width: 380, boxShadow: "0 30px 80px rgba(0,0,0,0.25)", opacity: interpolate(frame, [10, 30], [0, 1], { extrapolateRight: "clamp" }), transform: `translateY(${interpolate(frame, [10, 30], [12, 0], { extrapolateRight: "clamp" })}px)` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.muted, letterSpacing: 1.5, textTransform: "uppercase" }}>Payment Proof</div>
            <div style={{ fontFamily: display, fontSize: 38, fontWeight: 700, color: C.ink, marginTop: 8 }}>$1,800</div>
            <div style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Globe Telecom · Bank transfer</div>
            <div style={{ marginTop: 16, height: 110, background: "#FAF7F2", borderRadius: 10, border: `1px dashed ${C.border}`, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, fontSize: 12 }}>📎 receipt.png uploaded</div>
            <div style={{ marginTop: 14, padding: 10, background: "#FFF7E5", color: C.goldDeep, borderRadius: 8, fontSize: 12, fontWeight: 800, textAlign: "center" }}>Pending admin verification…</div>
          </div>

          <div style={{ fontFamily: display, fontSize: 50, color: C.paper, opacity: interpolate(frame, [40, 60], [0, 1], { extrapolateRight: "clamp" }) }}>→</div>

          {/* Admin approves */}
          <div style={{ background: C.navy, borderRadius: 18, padding: 26, width: 380, boxShadow: "0 30px 80px rgba(0,0,0,0.35)", color: C.paper, opacity: interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp" }), transform: `translateY(${interpolate(frame, [50, 70], [12, 0], { extrapolateRight: "clamp" })}px)` }}>
            <div style={{ fontSize: 11, fontWeight: 800, color: C.gold, letterSpacing: 1.5, textTransform: "uppercase" }}>Admin · Payments</div>
            <div style={{ fontFamily: display, fontSize: 24, fontWeight: 700, marginTop: 8 }}>Mandalay Talent Co.</div>
            <div style={{ fontSize: 13, opacity: 0.7, marginTop: 4 }}>Placement: Kyaw M. → Globe</div>
            <div style={{ marginTop: 14, padding: 12, background: "rgba(255,255,255,0.08)", borderRadius: 10, fontSize: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ opacity: 0.7 }}>Fee</span><span style={{ fontWeight: 800 }}>$1,800</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}><span style={{ opacity: 0.7 }}>Platform cut</span><span style={{ fontWeight: 800 }}>$180</span></div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, color: C.gold }}><span style={{ opacity: 0.85 }}>Agency payout</span><span style={{ fontWeight: 900 }}>$1,620</span></div>
            </div>
            <div style={{ marginTop: 14, padding: 10, background: C.emerald, color: "#fff", borderRadius: 8, fontSize: 13, fontWeight: 800, textAlign: "center", transform: `scale(${big})` }}>✓ Approved & paid out</div>
          </div>
        </div>

        <div style={{ marginTop: 50, opacity: interpolate(frame, [120, 150], [0, 1], { extrapolateRight: "clamp" }) }}>
          <Logo color={C.paper} size={32} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
