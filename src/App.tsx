import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import HomePage from "./pages/HomePage";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import SavedJobs from "./pages/SavedJobs";
import Applications from "./pages/Applications";
import Mentors from "./pages/Mentors";
import MentorDetail from "./pages/MentorDetail";
import MentorBooking from "./pages/MentorBooking";
import Guides from "./pages/Guides";
import GuideDetail from "./pages/GuideDetail";
import Profile from "./pages/Profile";
import EditProfile from "./pages/EditProfile";
import Community from "./pages/Community";
import Messages from "./pages/Messages";
import ChatView from "./pages/ChatView";
import Notifications from "./pages/Notifications";
import AiProfileBuilder from "./pages/AiProfileBuilder";
import ProfileBuilder from "./pages/ProfileBuilder";
import CoverLetterGenerator from "./pages/CoverLetterGenerator";
import SkillGapAnalysis from "./pages/SkillGapAnalysis";
import Premium from "./pages/Premium";
import Settings from "./pages/Settings";
import EmployerOnboarding from "./pages/EmployerOnboarding";
import EmployerDashboard from "./pages/EmployerDashboard";
import EmployerPostJob from "./pages/EmployerPostJob";
import EmployerApplications from "./pages/EmployerApplications";
import EmployerSubscription from "./pages/EmployerSubscription";
import SearchTalent from "./pages/SearchTalent";
import MentorDashboard from "./pages/MentorDashboard";
import MentorMentees from "./pages/MentorMentees";
import MentorBookings from "./pages/MentorBookings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminJobQueue from "./pages/AdminJobQueue";
import AdminUsers from "./pages/AdminUsers";
import AdminAnalytics from "./pages/AdminAnalytics";
import ModeratorDashboard from "./pages/ModeratorDashboard";
import DelegateAccess from "./pages/DelegateAccess";
import AppLayout from "./components/AppLayout";
import NotFound from "./pages/NotFound";
import SiteGate from "./components/SiteGate";

const queryClient = new QueryClient();

const App = () => (
  <SiteGate>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Auth flow (public) */}
            <Route path="/" element={<Welcome />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />

            {/* All authenticated pages with bottom nav */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/home" element={<HomePage />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/detail" element={<JobDetail />} />
              <Route path="/jobs/saved" element={<SavedJobs />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/mentors" element={<Mentors />} />
              <Route path="/mentors/detail" element={<MentorDetail />} />
              <Route path="/mentors/book" element={<MentorBooking />} />
              <Route path="/mentors/dashboard" element={<MentorDashboard />} />
              <Route path="/mentors/mentees" element={<MentorMentees />} />
              <Route path="/mentors/bookings" element={<MentorBookings />} />
              <Route path="/guides" element={<Guides />} />
              <Route path="/guides/detail" element={<GuideDetail />} />
              <Route path="/community" element={<Community />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/chat" element={<ChatView />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/ai-tools" element={<AiProfileBuilder />} />
              <Route path="/ai-tools/profile-builder" element={<ProfileBuilder />} />
              <Route path="/ai-tools/cover-letter" element={<CoverLetterGenerator />} />
              <Route path="/ai-tools/skill-gap" element={<SkillGapAnalysis />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/settings" element={<Settings />} />

              {/* Employer Portal */}
              <Route path="/employer/onboarding" element={<EmployerOnboarding />} />
              <Route path="/employer/dashboard" element={<EmployerDashboard />} />
              <Route path="/employer/post-job" element={<EmployerPostJob />} />
              <Route path="/employer/applications" element={<EmployerApplications />} />
              <Route path="/employer/subscription" element={<EmployerSubscription />} />
              <Route path="/employer/search" element={<SearchTalent />} />

              {/* Admin */}
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/jobs" element={<AdminJobQueue />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />

              {/* Moderator */}
              <Route path="/moderator" element={<ModeratorDashboard />} />
            </Route>

            {/* Delegate Access (no nav) */}
            <Route path="/access/:token" element={<DelegateAccess />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </SiteGate>
);

export default App;
