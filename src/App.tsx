import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import HomePage from "./pages/HomePage";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import SavedJobs from "./pages/SavedJobs";
import Applications from "./pages/Applications";
import Mentors from "./pages/Mentors";
import MentorDetail from "./pages/MentorDetail";
import Guides from "./pages/Guides";
import GuideDetail from "./pages/GuideDetail";
import Profile from "./pages/Profile";
import Community from "./pages/Community";
import Messages from "./pages/Messages";
import ChatView from "./pages/ChatView";
import Notifications from "./pages/Notifications";
import AiProfileBuilder from "./pages/AiProfileBuilder";
import Premium from "./pages/Premium";
import Settings from "./pages/Settings";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          {/* Auth flow */}
          <Route path="/" element={<Welcome />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/login" element={<Login />} />

          {/* Main app with bottom nav */}
          <Route element={<AppLayout />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/jobs" element={<Jobs />} />
            <Route path="/mentors" element={<Mentors />} />
            <Route path="/guides" element={<Guides />} />
            <Route path="/community" element={<Community />} />
            <Route path="/profile" element={<Profile />} />
          </Route>

          {/* Detail pages (no bottom nav) */}
          <Route path="/jobs/detail" element={<JobDetail />} />
          <Route path="/jobs/saved" element={<SavedJobs />} />
          <Route path="/applications" element={<Applications />} />
          <Route path="/mentors/detail" element={<MentorDetail />} />
          <Route path="/guides/detail" element={<GuideDetail />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/messages/chat" element={<ChatView />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/ai-tools" element={<AiProfileBuilder />} />
          <Route path="/premium" element={<Premium />} />
          <Route path="/settings" element={<Settings />} />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
