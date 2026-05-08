import React from "react";
import { TransitionSeries, springTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { wipe } from "@remotion/transitions/wipe";
import { A1_Hook, A2_Onboard, A3_PostJob, A4_AdminApproval, A5_Candidates, A6_Track, A7_Payout } from "./scenes/agent/Scenes";

const TR = 18;
// scenes: 210 + 180 + 180 + 200 + 180 + 200 + 220 = 1370; minus 6*18 = 1262 frames (~42s)
export const AGENT_DURATION = 1262;

const fadeT = () => ({
  presentation: fade(),
  timing: springTiming({ config: { damping: 200 }, durationInFrames: TR }),
});
const wipeT = (dir: "from-right" | "from-bottom" | "from-left") => ({
  presentation: wipe({ direction: dir }),
  timing: springTiming({ config: { damping: 200 }, durationInFrames: TR }),
});

export const AgentVideo: React.FC = () => (
  <TransitionSeries>
    <TransitionSeries.Sequence durationInFrames={210}><A1_Hook /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...wipeT("from-right")} />
    <TransitionSeries.Sequence durationInFrames={180}><A2_Onboard /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...fadeT()} />
    <TransitionSeries.Sequence durationInFrames={180}><A3_PostJob /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...wipeT("from-bottom")} />
    <TransitionSeries.Sequence durationInFrames={200}><A4_AdminApproval /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...fadeT()} />
    <TransitionSeries.Sequence durationInFrames={180}><A5_Candidates /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...fadeT()} />
    <TransitionSeries.Sequence durationInFrames={200}><A6_Track /></TransitionSeries.Sequence>
    <TransitionSeries.Transition {...fadeT()} />
    <TransitionSeries.Sequence durationInFrames={220}><A7_Payout /></TransitionSeries.Sequence>
  </TransitionSeries>
);
