import React from "react";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import {
  S1_Hook,
  S2_Onboard,
  S3_Profile,
  S4_CareerTools,
  S_SkillGap,
  S_Coach,
  S5_BrowseJobs,
  S6_ApplyMentor,
  S7_Hired,
} from "./scenes/seeker/Scenes";

const TR = 18;

// Scene durations (frames @ 30fps):
// 1 Hook         150  (5.0s)
// 2 Onboard      130  (4.3s)
// 3 MagicCV      170  (5.7s) — WOW
// 4 CareerTools  220  (7.3s) — WOW
// 5 SkillGap     180  (6.0s) — WOW
// 6 Coach        220  (7.3s) — WOW
// 7 BrowseJobs   140  (4.7s)
// 8 ApplyMentor  180  (6.0s)
// 9 Offer        180  (6.0s)
// Sum = 1570; minus 8 transitions of 18 = 1426 frames = 47.5s
export const SEEKER_DURATION = 1426;

const trFade = () => ({
  presentation: fade(),
  timing: springTiming({ config: { damping: 200 }, durationInFrames: TR }),
});
const trWipeR = () => ({
  presentation: wipe({ direction: "from-right" as const }),
  timing: springTiming({ config: { damping: 200 }, durationInFrames: TR }),
});
const trWipeL = () => ({
  presentation: wipe({ direction: "from-left" as const }),
  timing: springTiming({ config: { damping: 200 }, durationInFrames: TR }),
});
const trWipeB = () => ({
  presentation: wipe({ direction: "from-bottom" as const }),
  timing: springTiming({ config: { damping: 200 }, durationInFrames: TR }),
});

export const SeekerVideo: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={150}><S1_Hook /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...trWipeR()} />
    <TransitionSeries.Sequence durationInFrames={130}><S2_Onboard /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...trFade()} />
    <TransitionSeries.Sequence durationInFrames={170}><S3_Profile /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...trWipeB()} />
    <TransitionSeries.Sequence durationInFrames={220}><S4_CareerTools /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...trFade()} />
    <TransitionSeries.Sequence durationInFrames={180}><S_SkillGap /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...trWipeL()} />
    <TransitionSeries.Sequence durationInFrames={220}><S_Coach /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...trWipeR()} />
    <TransitionSeries.Sequence durationInFrames={140}><S5_BrowseJobs /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...trFade()} />
    <TransitionSeries.Sequence durationInFrames={180}><S6_ApplyMentor /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...trWipeB()} />
    <TransitionSeries.Sequence durationInFrames={180}><S7_Hired /></TransitionSeries.Sequence>
  </TransitionSeries>
);
