import React, { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";

const AppLayout = lazy(() => import("@/components/AppLayout"));
const Login = lazy(() => import("@/pages/Login"));
const Signup = lazy(() => import("@/pages/Signup"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const YieldPrediction = lazy(() => import("@/pages/YieldPrediction"));
const DiseaseDetection = lazy(() => import("@/pages/DiseaseDetection"));
const Recommendations = lazy(() => import("@/pages/Recommendations"));
const Profile = lazy(() => import("@/pages/Profile"));
const CropPlanner = lazy(() => import("@/pages/CropPlanner"));
const News = lazy(() => import("@/pages/News"));
const Marketplace = lazy(() => import("@/pages/Marketplace"));
const MarketplaceModeration = lazy(() => import("@/pages/MarketplaceModeration"));
const MarketplacePolicy = lazy(() => import("@/pages/MarketplacePolicy"));
const MarketplaceTerms = lazy(() => import("@/pages/MarketplaceTerms"));
const NotFound = lazy(() => import("@/pages/NotFound"));

const queryClient = new QueryClient();

const AppShellSkeleton = () => (
  <div className="min-h-screen bg-background p-4 md:p-8">
    <div className="mx-auto max-w-6xl space-y-4">
      <Skeleton className="h-9 w-52" />
      <Skeleton className="h-5 w-72" />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} className="h-28 rounded-2xl" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-44 rounded-2xl" />
        <Skeleton className="h-44 rounded-2xl" />
      </div>
    </div>
  </div>
);

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, loading } = useAuth();
  if (loading) return <AppShellSkeleton />;
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
          <Suspense fallback={<AppShellSkeleton />}>
            <Routes>
              <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
              <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/predict" element={<ProtectedRoute><YieldPrediction /></ProtectedRoute>} />
              <Route path="/disease" element={<ProtectedRoute><DiseaseDetection /></ProtectedRoute>} />
              <Route path="/recommendations" element={<ProtectedRoute><Recommendations /></ProtectedRoute>} />
              <Route path="/planner" element={<ProtectedRoute><CropPlanner /></ProtectedRoute>} />
              <Route path="/news" element={<ProtectedRoute><News /></ProtectedRoute>} />
              <Route path="/marketplace" element={<Navigate to="/marketplace/buy" replace />} />
              <Route path="/marketplace/:section" element={<ProtectedRoute><Marketplace /></ProtectedRoute>} />
              <Route path="/my-listings" element={<Navigate to="/marketplace/sell" replace />} />
              <Route path="/marketplace/moderation" element={<ProtectedRoute><MarketplaceModeration /></ProtectedRoute>} />
              <Route path="/marketplace/policy" element={<ProtectedRoute><MarketplacePolicy /></ProtectedRoute>} />
              <Route path="/marketplace/terms" element={<ProtectedRoute><MarketplaceTerms /></ProtectedRoute>} />
              <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
