import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { apiClient, type UserProfile as ApiUserProfile } from "@/lib/api";

export interface UserProfile extends ApiUserProfile {
  id?: number;
}

interface AuthContextType {
  user: UserProfile | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  signup: (profile: UserProfile, password: string) => Promise<boolean>;
  logout: () => void;
  updateProfile: (profile: UserProfile) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize auth on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = apiClient.getToken();
        if (token) {
          const currentUser = await apiClient.getCurrentUser();
          setUser(currentUser);
        }
      } catch {
        // Token invalid or expired, clear it
        apiClient.setToken(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const login = useCallback(async (identifier: string, password: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);
      const response = await apiClient.login(identifier, password);
      apiClient.setToken(response.access_token);
      setUser(response.user);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Login failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const signup = useCallback(async (profile: UserProfile, password: string): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);
      const response = await apiClient.signup({
        email: profile.email,
        username: profile.username,
        name: profile.name,
        password,
        phone: profile.seller_phone,
        location: profile.location,
        latitude: profile.latitude,
        longitude: profile.longitude,
      });
      apiClient.setToken(response.access_token);
      setUser(response.user);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Signup failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);


  const logout = useCallback(() => {
    apiClient.setToken(null);
    setUser(null);
    setError(null);
  }, []);

  const updateProfile = useCallback(async (profile: UserProfile): Promise<boolean> => {
    try {
      setError(null);
      setLoading(true);
      const updated = await apiClient.updateProfile(profile);
      setUser(updated);
      return true;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Profile update failed";
      setError(message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isAuthenticated: !!user, loading, error, login, signup, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
};
