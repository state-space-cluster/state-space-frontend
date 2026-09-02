import { useState, useEffect, useCallback } from 'react';
import {
  getToken,
  setToken as persistToken,
  clearToken,
  login as apiLogin,
  register as apiRegister,
  SESSION_EXPIRED_EVENT,
} from '../api/client';
import type { AuthTokenRequest, RegisterRequest } from '../types';

export interface UseAuthReturn {
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isRegistering: boolean;
  error: string | null;
  login: (credentials: AuthTokenRequest) => Promise<void>;
  register: (data: RegisterRequest) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export function useAuth(): UseAuthReturn {
  const [token, setToken] = useState<string | null>(() => getToken());
  const [isLoading,     setIsLoading]     = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);
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

  const register = useCallback(async (data: RegisterRequest) => {
    setIsRegistering(true);
    setError(null);
    try {
      const result = await apiRegister(data);
      persistToken(result.token);
      setToken(result.token);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Registration failed. Please try again.';
      setError(message);
    } finally {
      setIsRegistering(false);
    }
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setToken(null);
    setError(null);
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return {
    token,
    isAuthenticated: token !== null,
    isLoading,
    isRegistering,
    error,
    login,
    register,
    logout,
    clearError,
  };
}
