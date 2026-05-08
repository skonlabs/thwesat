import { Composition } from "remotion";
import { SeekerVideo, SEEKER_DURATION } from "./SeekerVideo";
import { AgentVideo, AGENT_DURATION } from "./AgentVideo";

export const RemotionRoot: React.FC = () => (
  <>
    <Composition
      id="seeker"
      component={SeekerVideo}
      durationInFrames={SEEKER_DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
    <Composition
      id="agent"
      component={AgentVideo}
      durationInFrames={AGENT_DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
  </>
);
