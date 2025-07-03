import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import Layout from './components/Layout';
import Home from './pages/Home';
import VoterRegistration from './pages/VoterRegistration';
import Polls from './pages/Polls';
import AdminDashboard from './pages/AdminDashboard';
import VoterDashboard from './pages/VoterDashboard';
import Results from './pages/Results';
import AdminLogin from './pages/AdminLogin';
import VoterLogin from './pages/VoterLogin';
import { AccountProvider, useAccountContext } from './context/AccountContext.jsx';

// PrivateRoute component now uses the context
const PrivateRoute = ({ children, isAdmin = false }) => {
  const { account, loading } = useAccountContext();

  if (loading) {
    // You can render a loading spinner here
    return <div className="flex justify-center items-center h-screen">Loading session...</div>;
  }

  if (!account) {
    // If not logged in, redirect to the admin login page for admin routes, or home for others
    return <Navigate to={isAdmin ? "/admin/login" : "/login"} replace />;
  }

  if (isAdmin && !account.isAdmin) {
    // If a non-admin tries to access an admin route, redirect to their dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

function App() {
  return (
    <AccountProvider>
      <Router>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="register" element={<VoterRegistration />} />
              <Route path="admin/login" element={<AdminLogin />} />
              <Route path="login" element={<VoterLogin />} />
              
              {/* Protected Routes */}
              <Route 
                path="polls" 
                element={
                  <PrivateRoute>
                    <Polls />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="results" 
                element={
                  <PrivateRoute>
                    <Results />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="dashboard" 
                element={
                  <PrivateRoute>
                    <VoterDashboard />
                  </PrivateRoute>
                } 
              />
              <Route 
                path="admin/dashboard" 
                element={
                  <PrivateRoute isAdmin>
                    <AdminDashboard />
                  </PrivateRoute>
                } 
              />
            </Route>
          </Routes>
        </AnimatePresence>
      </Router>
    </AccountProvider>
  );
}

export default App;
