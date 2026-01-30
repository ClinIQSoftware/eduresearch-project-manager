import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import type { User } from '../types';
import { getCurrentUser } from '../services/api';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isPlatformAdmin: boolean;
  login: (token: string, isPlatformAdmin?: boolean) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string): Record<string, unknown> | null {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [isPlatformAdmin, setIsPlatformAdmin] = useState<boolean>(() => {
    const stored = localStorage.getItem('isPlatformAdmin');
    return stored === 'true';
  });
  const [isLoading, setIsLoading] = useState(true);

  // Guard to prevent useEffect from re-fetching when login() already did
  const loginFetchedRef = useRef(false);

  // Initial token check — fetch user on mount or when token changes
  useEffect(() => {
    if (token) {
      // Skip if login() already fetched the user for this token
      if (loginFetchedRef.current) {
        loginFetchedRef.current = false;
        return;
      }
      const payload = parseJwt(token);
      if (payload?.is_platform_admin) {
        setIsPlatformAdmin(true);
        setIsLoading(false);
      } else {
        fetchUser();
      }
    } else {
      setIsLoading(false);
    }
  }, [token]);

  // Listen for 401 events from the API interceptor
  useEffect(() => {
    function handleUnauthorized() {
      setToken(null);
      setUser(null);
      setIsPlatformAdmin(false);
    }
    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  async function fetchUser() {
    try {
      const response = await getCurrentUser();
      setUser(response.data);
    } catch (error) {
      console.error('Failed to fetch user:', error);
      logout();
    } finally {
      setIsLoading(false);
    }
  }

  async function login(newToken: string, platformAdmin = false) {
    localStorage.setItem('token', newToken);
    localStorage.setItem('isPlatformAdmin', platformAdmin ? 'true' : 'false');

    // Mark that login is handling the fetch — prevents useEffect from double-fetching
    loginFetchedRef.current = true;
    setToken(newToken);
    setIsPlatformAdmin(platformAdmin);

    if (!platformAdmin) {
      await fetchUser();
    } else {
      setIsLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('isPlatformAdmin');
    setToken(null);
    setUser(null);
    setIsPlatformAdmin(false);
  }

  async function refreshUser() {
    if (token && !isPlatformAdmin) {
      await fetchUser();
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user || isPlatformAdmin,
        isPlatformAdmin,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
