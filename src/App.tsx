import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

import AppLayout from "@/components/AppLayout";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import Dashboard from "@/pages/Dashboard";
import YieldPrediction from "@/pages/YieldPrediction";
import DiseaseDetection from "@/pages/DiseaseDetection";
import Recommendations from "@/pages/Recommendations";
import Profile from "@/pages/Profile";
import CropPlanner from "@/pages/CropPlanner";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <div className="flex items-center justify-center h-screen"><span>Loading...</span></div>;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
};

const PublicRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated } = useAuth();
  if (isAuthenticated) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
            <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
            <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/predict" element={<ProtectedRoute><YieldPrediction /></ProtectedRoute>} />
            <Route path="/disease" element={<ProtectedRoute><DiseaseDetection /></ProtectedRoute>} />
            <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
            <Route path="/planner" element={<ProtectedRoute><CropPlanner /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
