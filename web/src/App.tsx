import { BrowserRouter, Routes, Route } from "react-router-dom";
import type { ReactNode } from "react";

import TabLayout from "@/components/layout/TabLayout";
import AuthScreen from "@/components/AuthScreen";
import SplashScreen from "@/components/SplashScreen";
import { AuthProvider, useAuth } from "@/lib/AuthContext";
import Dashboard from "@/pages/Dashboard";
import Accounts from "@/pages/Accounts";
import Stocks from "@/pages/Stocks";
import Profile from "@/pages/Profile";
import AccountDetail from "@/pages/AccountDetail";
import Projection from "@/pages/Projection";
import NotFound from "@/pages/NotFound";

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  if (!user) return <AuthScreen />;
  return <>{children}</>;
}

function Shell() {
  const { loading } = useAuth();
  // Session restore (auth refresh against a cold backend) can take a while;
  // keep the logo + disclaimer on screen instead of a blank plate.
  if (loading) return <SplashScreen />;
  return (
    <Routes>
      <Route
        element={
          <ProtectedRoute>
            <TabLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="accounts" element={<Accounts />} />
        <Route path="stocks" element={<Stocks />} />
        <Route path="profile" element={<Profile />} />
        <Route path="projection" element={<Projection />} />
      </Route>
      <Route
        path="account/:id"
        element={
          <ProtectedRoute>
            <AccountDetail />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Shell />
      </AuthProvider>
    </BrowserRouter>
  );
}
