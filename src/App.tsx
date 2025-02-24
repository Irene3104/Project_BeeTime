import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from 'react-query';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { Signup } from './pages/Signup';
import { Account } from './pages/Account';  
import { TimeActivity } from './pages/TimeActivity';  
import { Information } from './pages/Information';
import { ForgotPassword } from './pages/ForgotPassword';
import { AdminDashboard } from './pages/admin/MainDashboard';
import { ProtectedRoute } from './components/ProtectedRoute';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { Employees } from './pages/admin/Employees';
import './index.css';


const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <QueryClientProvider client={queryClient}>
        <Router>
          <div className="min-h-screen bg-cream-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/signup" element={<Signup />} />
              <Route 
                path="/dashboard" 
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                } 
              />
              <Route path="/admin/MainDashboard" element={<ProtectedRoute><AdminDashboard /></ProtectedRoute>} />
              <Route path="/admin/employees" element={<ProtectedRoute><Employees /></ProtectedRoute>} />
              <Route path="/account" element={<Account />} />
              <Route path="/time-activity" element={<TimeActivity />} />
              <Route path="/" element={<Navigate to="/login" replace />} />
              <Route path="/information" element={<Information />} />
            </Routes>
          </div>
        </Router>
      </QueryClientProvider>
    </GoogleOAuthProvider>
  );
}

export default App;
