import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import Projects from './pages/Projects';
import ProjectDetail from './pages/ProjectDetail';
import JoinRequests from './pages/JoinRequests';
import Reports from './pages/Reports';
import AdminDashboard from './pages/AdminDashboard';
import Tasks from './pages/Tasks';
import TimeTracking from './pages/TimeTracking';

function App() {
  return (
    <AuthProvider>
      <Routes>
        {/* Public routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/auth/callback" element={<AuthCallback />} />

        {/* Protected routes */}
        <Route
          path="/"
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
                <Reports />
              </Layout>
            </ProtectedRoute>
          }
        />
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

        {/* Admin routes */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute requireSuperuser>
              <Layout>
                <AdminDashboard />
              </Layout>
            </ProtectedRoute>
          }
        />
      </Routes>
    </AuthProvider>
  );
}

export default App;
