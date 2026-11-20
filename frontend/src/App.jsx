import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { useContext } from 'react';
import axios from 'axios';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Sales from './pages/Sales';
import Finance from './pages/Finance';
import Accounts from './pages/Accounts';
import HR from './pages/HR';
import EmployeeDashboard from './pages/EmployeeDashboard';
import Projects from './pages/Projects';
import TeamManagement from './pages/TeamManagement';
import CeoDashboard from './pages/CeoDashboard';
import Settings from './pages/Settings';
import CalendarView from './pages/CalendarView';
import Billing from './pages/Billing';
import LeadForm from './pages/LeadForm';
import AssignTaskPage from './pages/AssignTaskPage';
import EmployeeFormPage from './pages/EmployeeFormPage';
import Students from './pages/Students';
import LandingPage from './pages/LandingPage';

// Global Axios Interceptor for 402 Payment Required
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 402) {
      if (window.location.pathname !== '/billing') {
        window.location.href = '/billing';
      }
    }
    return Promise.reject(error);
  }
);

const isEmployee = (u) => u && u.role !== 'Admin' && u.role !== 'CEO';

const ProtectedRoute = ({ children, adminOnly = false, employeeOnly = false, ceoOnly = false, requiredModule = null }) => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (ceoOnly && user.role !== 'CEO') {
    return <Navigate to={isEmployee(user) ? '/employee-dashboard' : '/dashboard'} replace />;
  }

  // Admin-only routes (e.g., Settings, Billing)
  if (adminOnly && isEmployee(user)) {
    return <Navigate to="/employee-dashboard" replace />;
  }

  // Employee-only routes (e.g., Employee Dashboard)
  if (employeeOnly && !isEmployee(user)) {
    return <Navigate to={user.role === 'CEO' ? '/ceo-dashboard' : '/dashboard'} replace />;
  }

  // If Employee tries to access main Admin Dashboard
  if (requiredModule === 'dashboard' && isEmployee(user)) {
    return <Navigate to="/employee-dashboard" replace />;
  }

  // Employee module-specific restrictions
  if (requiredModule && isEmployee(user)) {
    const modules = user.activeModules || [];
    if (!modules.includes(requiredModule)) {
      return <Navigate to="/employee-dashboard" replace />;
    }
  }

  return children;
};

const HomeRedirect = () => {
  const { user, loading } = useContext(AuthContext);
  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" replace />;
  if (user.role === 'CEO') return <Navigate to="/ceo-dashboard" replace />;
  if (isEmployee(user)) return <Navigate to="/employee-dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
};

const savedTheme = localStorage.getItem('app-theme') || 'default';
if (savedTheme !== 'default') {
  document.documentElement.setAttribute('data-theme', savedTheme);
}
const savedBgStyle = localStorage.getItem('app-bg-style') || 'solid';
if (savedBgStyle !== 'solid') {
  document.documentElement.setAttribute('data-bg-style', savedBgStyle);
}

function App() {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
        <Router>
          <Routes>
            <Route path="/login" element={<Navigate to="/" replace />} />
            <Route path="/billing" element={<ProtectedRoute adminOnly><Billing /></ProtectedRoute>} />
            <Route path="/settings" element={<ProtectedRoute adminOnly><Settings /></ProtectedRoute>} />
            <Route path="/ceo-dashboard" element={<ProtectedRoute ceoOnly><CeoDashboard /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute requiredModule="dashboard"><Dashboard /></ProtectedRoute>} />
            <Route path="/calendar" element={<ProtectedRoute requiredModule="calendar"><CalendarView /></ProtectedRoute>} />
            <Route path="/employee-dashboard" element={<ProtectedRoute employeeOnly><EmployeeDashboard /></ProtectedRoute>} />
            <Route path="/sales" element={<ProtectedRoute requiredModule="sales"><Sales /></ProtectedRoute>} />
            <Route path="/students" element={<ProtectedRoute><Students /></ProtectedRoute>} />
            <Route path="/sales/lead/add" element={<ProtectedRoute requiredModule="sales"><LeadForm /></ProtectedRoute>} />
            <Route path="/sales/lead/edit/:id" element={<ProtectedRoute requiredModule="sales"><LeadForm /></ProtectedRoute>} />
            <Route path="/finance" element={<ProtectedRoute requiredModule="finance"><Finance /></ProtectedRoute>} />
            <Route path="/accounts" element={<ProtectedRoute requiredModule="finance"><Accounts /></ProtectedRoute>} />
            <Route path="/hr" element={<ProtectedRoute requiredModule="hr"><HR /></ProtectedRoute>} />
            <Route path="/hr/employee/add" element={<ProtectedRoute requiredModule="hr"><EmployeeFormPage /></ProtectedRoute>} />
            <Route path="/hr/employee/edit/:id" element={<ProtectedRoute requiredModule="hr"><EmployeeFormPage /></ProtectedRoute>} />
            <Route path="/hr/assign-task" element={<ProtectedRoute requiredModule="hr"><AssignTaskPage /></ProtectedRoute>} />
            <Route path="/team-management" element={<ProtectedRoute requiredModule="projects"><TeamManagement /></ProtectedRoute>} />
            <Route path="/projects" element={<Navigate to="/team-management" replace />} />
            <Route path="/" element={<LandingPage />} />
          </Routes>
        </Router>
      </div>
    </AuthProvider>
  );
}

export default App;
