import React from "react";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { S1_Hook, S2_Onboard, S3_Profile, S4_CareerTools, S5_BrowseJobs, S6_ApplyMentor, S7_Hired } from "./scenes/seeker/Scenes";

const D = 180;       // 6s at 30fps per scene (7 scenes = 42s)
const TR = 18;       // ~0.6s overlap
const SCENES = 7;
// Total frames: SCENES*D - (SCENES-1)*TR
export const SEEKER_DURATION = SCENES * D - (SCENES - 1) * TR; // = 1260 - 108 = 1152 (~38.4s)
// Bump first/last scenes a bit so it lands at ~42s
export const SEEKER_TOTAL = SEEKER_DURATION + 60; // Add buffer to last scene

const tr = () => ({
  presentation: fade(),
  timing: springTiming({ config: { damping: 200 }, durationInFrames: TR }),
});

export const SeekerVideo: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={D + 30}><S1_Hook /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={wipe({ direction: "from-right" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: TR })} />
    <TransitionSeries.Sequence durationInFrames={D}><S2_Onboard /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...tr()} />
    <TransitionSeries.Sequence durationInFrames={D}><S3_Profile /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...tr()} />
    <TransitionSeries.Sequence durationInFrames={D + 20}><S4_CareerTools /></TransitionSeries.Sequence>
    <TransitionSeries.Transition presentation={wipe({ direction: "from-bottom" })} timing={springTiming({ config: { damping: 200 }, durationInFrames: TR })} />
    <TransitionSeries.Sequence durationInFrames={D}><S5_BrowseJobs /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...tr()} />
    <TransitionSeries.Sequence durationInFrames={D + 30}><S6_ApplyMentor /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...tr()} />
    <TransitionSeries.Sequence durationInFrames={D + 30}><S7_Hired /></TransitionSeries.Sequence>
  </TransitionSeries>
);

// Recompute exact: scenes durations: [D+30, D, D, D+20, D, D+30, D+30] = D*7 + 110 = 1260+110 = 1370; transitions: 6*TR = 108; total = 1370 - 108 = 1262
export { };
