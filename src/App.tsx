import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import ProtectedRoute from "@/components/ProtectedRoute";
import AppRoleGuard from "@/components/AppRoleGuard";
import SystemRoleGuard from "@/components/SystemRoleGuard";
import Welcome from "./pages/Welcome";
import Onboarding from "./pages/Onboarding";
import Signup from "./pages/Signup";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import HomeRedirect from "./pages/HomeRedirect";
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
import PaymentHistory from "./pages/PaymentHistory";
import SeekerFinance from "./pages/SeekerFinance";
import EmployerFinance from "./pages/EmployerFinance";
import MentorFinance from "./pages/MentorFinance";
import AdminFinance from "./pages/AdminFinance";
import Settings from "./pages/Settings";
import EmployerOnboarding from "./pages/EmployerOnboarding";
import EmployerDashboard from "./pages/EmployerDashboard";
import EmployerPostJob from "./pages/EmployerPostJob";
import EmployerJobs from "./pages/EmployerJobs";
import EmployerApplications from "./pages/EmployerApplications";
import EmployerSubscription from "./pages/EmployerSubscription";
import SearchTalent from "./pages/SearchTalent";
import BecomeMentor from "./pages/BecomeMentor";
import MentorDashboard from "./pages/MentorDashboard";
import MentorMentees from "./pages/MentorMentees";
import MentorBookings from "./pages/MentorBookings";
import AdminDashboard from "./pages/AdminDashboard";
import AdminJobQueue from "./pages/AdminJobQueue";
import AdminUsers from "./pages/AdminUsers";
import AdminAnalytics from "./pages/AdminAnalytics";
import ModeratorDashboard from "./pages/ModeratorDashboard";
import AdminPayments from "./pages/AdminPayments";
import AdminEmployers from "./pages/AdminEmployers";
import DelegateAccess from "./pages/DelegateAccess";
import AdminEditGuide from "./pages/AdminEditGuide";
import EmployerEditJob from "./pages/EmployerEditJob";
import PublicProfile from "./pages/PublicProfile";
import EmployerEditCompany from "./pages/EmployerEditCompany";
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
              <Route path="/home" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<HomeRedirect />} />
              <Route path="/jobs" element={<Jobs />} />
              <Route path="/jobs/:id" element={<JobDetail />} />
              <Route path="/jobs/saved" element={<SavedJobs />} />
              <Route path="/applications" element={<Applications />} />
              <Route path="/mentors" element={<Mentors />} />
              <Route path="/mentors/:id" element={<MentorDetail />} />
              <Route path="/mentors/book" element={<MentorBooking />} />
              <Route path="/mentors/mentees" element={<AppRoleGuard allowedRoles={["mentor"]}><MentorMentees /></AppRoleGuard>} />
              <Route path="/mentors/bookings" element={<AppRoleGuard allowedRoles={["mentor"]}><MentorBookings /></AppRoleGuard>} />
              <Route path="/guides" element={<Guides />} />
              <Route path="/guides/:id" element={<GuideDetail />} />
              <Route path="/community" element={<Community />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/profile/edit" element={<EditProfile />} />
              <Route path="/profile/:id" element={<PublicProfile />} />
              <Route path="/messages" element={<Messages />} />
              <Route path="/messages/chat" element={<ChatView />} />
              <Route path="/notifications" element={<Notifications />} />
              <Route path="/ai-tools" element={<AiProfileBuilder />} />
              <Route path="/ai-tools/profile-builder" element={<ProfileBuilder />} />
              <Route path="/ai-tools/cover-letter" element={<CoverLetterGenerator />} />
              <Route path="/ai-tools/skill-gap" element={<SkillGapAnalysis />} />
              <Route path="/premium" element={<Premium />} />
              <Route path="/payments/history" element={<PaymentHistory />} />
              <Route path="/finance" element={<SeekerFinance />} />
              <Route path="/become-mentor" element={<BecomeMentor />} />
              <Route path="/settings" element={<Settings />} />

              {/* Unified dashboard — every role-specific dashboard URL redirects here.
                  /dashboard renders Employer/Mentor/Admin/Moderator/Seeker view dynamically. */}
              <Route path="/employer/dashboard" element={<Navigate to="/dashboard" replace />} />
              <Route path="/mentors/dashboard" element={<Navigate to="/dashboard" replace />} />
              <Route path="/mentor/dashboard" element={<Navigate to="/dashboard" replace />} />
              <Route path="/admin" element={<Navigate to="/dashboard" replace />} />
              <Route path="/moderator" element={<Navigate to="/dashboard" replace />} />
              <Route path="/moderator/dashboard" element={<Navigate to="/dashboard" replace />} />

              {/* Employer Portal */}
              <Route path="/employer/onboarding" element={<AppRoleGuard allowedRoles={["employer"]}><EmployerOnboarding /></AppRoleGuard>} />
              <Route path="/employer/post-job" element={<AppRoleGuard allowedRoles={["employer"]}><EmployerPostJob /></AppRoleGuard>} />
              <Route path="/employer/jobs" element={<AppRoleGuard allowedRoles={["employer"]}><EmployerJobs /></AppRoleGuard>} />
              <Route path="/employer/applications" element={<AppRoleGuard allowedRoles={["employer"]}><EmployerApplications /></AppRoleGuard>} />
              <Route path="/employer/subscription" element={<AppRoleGuard allowedRoles={["employer"]}><EmployerSubscription /></AppRoleGuard>} />
              <Route path="/employer/search" element={<AppRoleGuard allowedRoles={["employer"]}><SearchTalent /></AppRoleGuard>} />
              <Route path="/employer/edit-job/:id" element={<AppRoleGuard allowedRoles={["employer"]}><EmployerEditJob /></AppRoleGuard>} />
              <Route path="/employer/edit-company" element={<AppRoleGuard allowedRoles={["employer"]}><EmployerEditCompany /></AppRoleGuard>} />
              <Route path="/employer/finance" element={<AppRoleGuard allowedRoles={["employer"]}><EmployerFinance /></AppRoleGuard>} />
              <Route path="/mentor/finance" element={<AppRoleGuard allowedRoles={["mentor"]}><MentorFinance /></AppRoleGuard>} />
              <Route path="/admin/finance" element={<SystemRoleGuard allowedRoles={["admin"]}><AdminFinance /></SystemRoleGuard>} />

              {/* Admin sub-pages */}
              <Route path="/admin/jobs" element={<SystemRoleGuard allowedRoles={["admin"]}><AdminJobQueue /></SystemRoleGuard>} />
              <Route path="/admin/edit-job/:id" element={<SystemRoleGuard allowedRoles={["admin"]}><EmployerEditJob /></SystemRoleGuard>} />
              <Route path="/admin/users" element={<SystemRoleGuard allowedRoles={["admin"]}><AdminUsers /></SystemRoleGuard>} />
              <Route path="/admin/analytics" element={<SystemRoleGuard allowedRoles={["admin"]}><AdminAnalytics /></SystemRoleGuard>} />
              <Route path="/admin/payments" element={<SystemRoleGuard allowedRoles={["admin"]}><AdminPayments /></SystemRoleGuard>} />
              <Route path="/admin/employers" element={<SystemRoleGuard allowedRoles={["admin"]}><AdminEmployers /></SystemRoleGuard>} />
              <Route path="/admin/guides/:id" element={<SystemRoleGuard allowedRoles={["admin"]}><AdminEditGuide /></SystemRoleGuard>} />

              {/* Mentor sub-pages */}
              <Route path="/mentor/bookings" element={<Navigate to="/mentors/bookings" replace />} />
              <Route path="/mentor/mentees" element={<Navigate to="/mentors/mentees" replace />} />
              <Route path="/mentor" element={<Navigate to="/mentors" replace />} />
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
