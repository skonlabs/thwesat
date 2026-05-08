import React from "react";
import { useCurrentFrame, interpolate, spring, useVideoConfig } from "remotion";
import { C, inter, display } from "./theme";

/** Phone frame, 9:19.5 aspect, ~520x1100. Anchored center. */
export const PhoneFrame: React.FC<{
  children: React.ReactNode;
  width?: number;
  delay?: number;
  rotate?: number;
}> = ({ children, width = 520, delay = 0, rotate = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 140 } });
  const height = width * 2.05;
  return (
    <div
      style={{
        width,
        height,
        borderRadius: width * 0.12,
        background: "#0a0612",
        padding: 14,
        boxShadow: "0 60px 120px rgba(15,11,34,0.45), 0 0 0 2px rgba(255,255,255,0.06) inset",
        transform: `scale(${interpolate(enter, [0, 1], [0.92, 1])}) translateY(${interpolate(enter, [0, 1], [40, 0])}px) rotate(${rotate}deg)`,
        opacity: enter,
        position: "relative",
      }}
    >
      <div
        style={{
          width: "100%",
          height: "100%",
          borderRadius: width * 0.1,
          background: C.paper,
          overflow: "hidden",
          position: "relative",
          fontFamily: inter,
        }}
      >
        {/* notch */}
        <div
          style={{
            position: "absolute",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            width: width * 0.3,
            height: 26,
            background: "#0a0612",
            borderRadius: 14,
            zIndex: 30,
          }}
        />
        {children}
      </div>
    </div>
  );
};

/** Status bar mock */
export const StatusBar: React.FC<{ title?: string }> = ({ title }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 24px 0", fontSize: 13, color: C.ink, fontWeight: 600 }}>
    <span>9:41</span>
    <span style={{ opacity: 0 }}>{title}</span>
    <span>● ●●●</span>
  </div>
);

/** App header mock */
export const AppHeader: React.FC<{ title: string; sub?: string }> = ({ title, sub }) => (
  <div style={{ padding: "44px 24px 12px", borderBottom: `1px solid ${C.border}` }}>
    <div style={{ fontSize: 11, fontWeight: 700, color: C.gold, textTransform: "uppercase", letterSpacing: 1.2 }}>ThweSone</div>
    <div style={{ fontSize: 22, fontWeight: 800, color: C.ink, marginTop: 2, fontFamily: display }}>{title}</div>
    {sub && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{sub}</div>}
  </div>
);

/** Bottom nav mock */
export const BottomNav: React.FC<{ active?: number }> = ({ active = 0 }) => {
  const items = ["Home", "Jobs", "Mentors", "Inbox", "Me"];
  return (
    <div
      style={{
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 64,
        background: "#fff",
        borderTop: `1px solid ${C.border}`,
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        paddingBottom: 8,
      }}
    >
      {items.map((it, i) => (
        <div key={it} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: i === active ? C.navy : C.border }} />
          <div style={{ fontSize: 9, fontWeight: 700, color: i === active ? C.navy : C.muted }}>{it}</div>
        </div>
      ))}
    </div>
  );
};

/** Big top caption */
export const Caption: React.FC<{
  kicker?: string;
  title: string;
  delay?: number;
  align?: "left" | "center" | "right";
  color?: string;
}> = ({ kicker, title, delay = 0, align = "left", color = C.paper }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - delay, fps, config: { damping: 18 } });
  const op = interpolate(s, [0, 1], [0, 1]);
  const y = interpolate(s, [0, 1], [16, 0]);
  return (
    <div style={{ textAlign: align, opacity: op, transform: `translateY(${y}px)` }}>
      {kicker && (
        <div
          style={{
            fontFamily: inter,
            fontSize: 20,
            fontWeight: 800,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: C.gold,
            marginBottom: 14,
          }}
        >
          {kicker}
        </div>
      )}
      <div
        style={{
          fontFamily: display,
          fontSize: 86,
          fontWeight: 700,
          lineHeight: 1.02,
          color,
          letterSpacing: -1.5,
          maxWidth: 1100,
          whiteSpace: "pre-line",
        }}
      >
        {title}
      </div>
    </div>
  );
};

/** A pill stat badge */
export const Pill: React.FC<{ children: React.ReactNode; bg?: string; fg?: string }> = ({ children, bg = C.gold, fg = C.navy }) => (
  <span style={{ background: bg, color: fg, padding: "6px 12px", borderRadius: 999, fontSize: 12, fontWeight: 800, fontFamily: inter, letterSpacing: 0.4 }}>{children}</span>
);

/** Animated background grid + blobs */
export const StageBg: React.FC<{ tone?: "navy" | "paper" | "gold" | "emerald" }> = ({ tone = "navy" }) => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 60) * 30;
  const bg =
    tone === "navy"
      ? `radial-gradient(circle at 20% 30%, ${C.navy} 0%, ${C.navyDeep} 100%)`
      : tone === "gold"
      ? `linear-gradient(135deg, ${C.gold} 0%, ${C.goldDeep} 100%)`
      : tone === "emerald"
      ? `linear-gradient(135deg, ${C.emerald} 0%, ${C.emeraldDeep} 100%)`
      : C.paper;
  return (
    <div style={{ position: "absolute", inset: 0, background: bg, overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: tone === "navy" ? C.gold : C.navy,
          opacity: 0.08,
          top: -200 + drift,
          right: -200,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          width: 600,
          height: 600,
          borderRadius: "50%",
          background: tone === "navy" ? C.emerald : C.gold,
          opacity: 0.06,
          bottom: -150 - drift,
          left: -100,
          filter: "blur(40px)",
        }}
      />
      {/* dot grid */}
      <svg width="100%" height="100%" style={{ position: "absolute", inset: 0, opacity: 0.06 }}>
        <defs>
          <pattern id={`dots-${tone}`} width="40" height="40" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.5" fill={tone === "paper" ? C.ink : "#fff"} />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${tone})`} />
      </svg>
    </div>
  );
};

/** Tap ripple at given x/y */
export const Tap: React.FC<{ x: number; y: number; delay: number }> = ({ x, y, delay }) => {
  const frame = useCurrentFrame();
  const t = frame - delay;
  if (t < 0 || t > 30) return null;
  const scale = interpolate(t, [0, 30], [0.5, 2.5]);
  const op = interpolate(t, [0, 30], [0.7, 0]);
  return (
    <div
      style={{
        position: "absolute",
        left: x,
        top: y,
        width: 80,
        height: 80,
        borderRadius: "50%",
        background: C.gold,
        opacity: op,
        transform: `translate(-50%, -50%) scale(${scale})`,
        pointerEvents: "none",
        zIndex: 50,
      }}
    />
  );
};

/** Logo lockup */
export const Logo: React.FC<{ color?: string; size?: number }> = ({ color = C.paper, size = 28 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: display, fontWeight: 700, color, fontSize: size, letterSpacing: -0.5 }}>
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 8,
        background: C.gold,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: C.navy,
        fontWeight: 900,
        fontSize: size * 0.6,
      }}
    >
      ★
    </div>
    ThweSone
  </div>
);
