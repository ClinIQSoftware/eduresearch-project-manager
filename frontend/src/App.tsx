import { Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { TenantProvider } from './contexts/TenantContext';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import PlatformAdminProtectedRoute from './components/auth/PlatformAdminProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import JoinRequests from './pages/JoinRequests';
import {
  ReportsLayout,
  OverviewTab as ReportsOverviewTab,
  ProjectsTab as ReportsProjectsTab,
  PeopleTab as ReportsPeopleTab,
  TasksTab as ReportsTasksTab,
  ActivityTab as ReportsActivityTab,
} from './pages/reports';
import PendingUsers from './pages/PendingUsers';
import Tasks from './pages/Tasks';
import TimeTracking from './pages/TimeTracking';
import {
  SettingsLayout,
  ProfileTab as SettingsProfileTab,
  SecurityTab as SettingsSecurityTab,
  PreferencesTab as SettingsPreferencesTab,
} from './pages/settings';
import {
  AdminLayout,
  UsersTab,
  OrganizationsTab,
  SecurityTab,
  EmailTab,
  EmailTemplatesTab,
  ImportTab,
  InviteCodesTab,
  EnterpriseSettingsTab,
  IrbAdminBoardsTab,
  IrbAdminQuestionsTab,
  IrbAdminAiSettingsTab,
} from './pages/admin';
import { PlatformAdminLayout, EnterprisesTab, SettingsTab } from './pages/platform-admin';
import Landing from './pages/Landing';
import Join from './pages/Join';
import Onboarding from './pages/Onboarding';
import { BillingSettings, BillingSuccess, BillingCancel } from './pages/billing';
import {
  IrbLayout,
  IrbDashboardTab,
  IrbBoardsTab,
  IrbBoardDetailPage,
  IrbSubmissionsTab,
  IrbSubmissionDetailPage,
  IrbNewSubmissionPage,
  IrbReviewQueue,
  IrbReviewForm,
  IrbDecisionPanel,
} from './pages/irb';

function App() {
  return (
    <TenantProvider>
      <AuthProvider>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#1f2937',
            color: '#f9fafb',
            borderRadius: '0.75rem',
            padding: '1rem',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#f9fafb',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#f9fafb',
            },
          },
        }}
      />
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/join/:code" element={<Join />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <Onboarding />
            </ProtectedRoute>
          }
        />

        {/* Protected routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Layout>
                <Dashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Layout>
                <Projects />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <Layout>
                <ProjectDetail />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/join-requests"
          element={
            <ProtectedRoute>
              <Layout>
                <JoinRequests />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/reports"
          element={
            <ProtectedRoute>
              <Layout>
                <ReportsLayout />
              </Layout>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/reports/overview" replace />} />
          <Route path="overview" element={<ReportsOverviewTab />} />
          <Route path="projects" element={<ReportsProjectsTab />} />
          <Route path="people" element={<ReportsPeopleTab />} />
          <Route path="tasks" element={<ReportsTasksTab />} />
          <Route path="activity" element={<ReportsActivityTab />} />
        </Route>
        <Route
          path="/tasks"
          element={
            <ProtectedRoute>
              <Layout>
                <Tasks />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/time"
          element={
            <ProtectedRoute>
              <Layout>
                <TimeTracking />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/settings"
          element={
            <ProtectedRoute>
              <Layout>
                <SettingsLayout />
              </Layout>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/settings/profile" replace />} />
          <Route path="profile" element={<SettingsProfileTab />} />
          <Route path="security" element={<SettingsSecurityTab />} />
          <Route path="preferences" element={<SettingsPreferencesTab />} />
          <Route path="billing" element={<BillingSettings />} />
        </Route>

        {/* IRB routes */}
        <Route
          path="/irb"
          element={
            <ProtectedRoute>
              <Layout>
                <IrbLayout />
              </Layout>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/irb/dashboard" replace />} />
          <Route path="dashboard" element={<IrbDashboardTab />} />
          <Route path="boards" element={<IrbBoardsTab />} />
          <Route path="submissions" element={<IrbSubmissionsTab />} />
        </Route>
        <Route
          path="/irb/boards/:boardId"
          element={
            <ProtectedRoute>
              <Layout>
                <IrbBoardDetailPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/irb/submissions/new"
          element={
            <ProtectedRoute>
              <Layout>
                <IrbNewSubmissionPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/irb/submissions/:submissionId"
          element={
            <ProtectedRoute>
              <Layout>
                <IrbSubmissionDetailPage />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/irb/reviews"
          element={
            <ProtectedRoute>
              <Layout>
                <IrbReviewQueue />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/irb/reviews/:submissionId"
          element={
            <ProtectedRoute>
              <Layout>
                <IrbReviewForm />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/irb/boards/:boardId/decide/:submissionId"
          element={
            <ProtectedRoute>
              <Layout>
                <IrbDecisionPanel />
              </Layout>
            </ProtectedRoute>
          }
        />

        {/* Billing routes */}
        <Route path="/billing/success" element={<BillingSuccess />} />
        <Route path="/billing/cancel" element={<BillingCancel />} />

        {/* Admin routes */}
        <Route
          path="/pending-users"
          element={
            <ProtectedRoute requireSuperuser>
              <Layout>
                <PendingUsers />
              </Layout>
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireSuperuser>
              <Layout>
                <AdminLayout />
              </Layout>
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/enterprise" replace />} />
          <Route path="enterprise" element={<EnterpriseSettingsTab />} />
          <Route path="users" element={<UsersTab />} />
          <Route path="organizations" element={<OrganizationsTab />} />
          <Route path="security" element={<SecurityTab />} />
          <Route path="email" element={<EmailTab />} />
          <Route path="email-templates" element={<EmailTemplatesTab />} />
          <Route path="invite-codes" element={<InviteCodesTab />} />
          <Route path="import" element={<ImportTab />} />
          <Route path="irb-boards" element={<IrbAdminBoardsTab />} />
          <Route path="irb-questions" element={<IrbAdminQuestionsTab />} />
          <Route path="irb-ai" element={<IrbAdminAiSettingsTab />} />
        </Route>

        {/* Platform Admin Routes */}
        <Route
          path="/platform-admin"
          element={
            <PlatformAdminProtectedRoute>
              <PlatformAdminLayout />
            </PlatformAdminProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/platform-admin/enterprises" replace />} />
          <Route path="enterprises" element={<EnterprisesTab />} />
          <Route path="settings" element={<SettingsTab />} />
          <Route path="*" element={<Navigate to="/platform-admin/enterprises" replace />} />
        </Route>
      </Routes>
      </AuthProvider>
    </TenantProvider>
  );
}

export default App;
