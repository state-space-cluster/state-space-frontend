import { useState, useEffect, useCallback } from 'react';
import {
  getToken,
  setToken as persistToken,
  clearToken,
  login as apiLogin,
  SESSION_EXPIRED_EVENT,
} from '../api/client';
import type { AuthTokenRequest } from '../types';

export interface UseAuthReturn {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (credentials: AuthTokenRequest) => Promise<void>;
  logout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listen for 401 → session-expired events from the API client
  useEffect(() => {
    const handleExpired = () => {
      setToken(null);
      setError('Your session has expired. Please log in again.');
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handleExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handleExpired);
  }, []);

  const login = useCallback(async (credentials: AuthTokenRequest) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await apiLogin(credentials);
      persistToken(result.token);
      setToken(result.token);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Login failed. Please check your credentials.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setError(null);
  }, []);

  return {
    token,
    isAuthenticated: token !== null,
    isLoading,
    error,
    login,
    logout,
  };
}
