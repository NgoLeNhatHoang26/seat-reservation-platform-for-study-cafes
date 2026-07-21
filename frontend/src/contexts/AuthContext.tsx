import {
  createContext,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { queryClient } from '../lib/queryClient';
import * as authService from '../services/authService';
import { setupAuthCallbacks } from '../services/axiosInstance';
import type {
  CustomerProfile,
  LoginPayload,
  RegisterCustomerPayload,
  RegisterOwnerPayload,
  RegisterOwnerResponse,
  User,
  UserRole,
} from '../types/auth.types';

export interface AuthContextValue {
  currentUser: User | null;
  customerProfile: CustomerProfile | null;
  /** True while the app is performing its initial refresh-token → /me check. */
  isInitializing: boolean;
  isAuthenticated: boolean;
  /** Resolves with the authenticated User so callers can navigate by role. */
  login: (payload: LoginPayload) => Promise<User>;
  logout: () => Promise<void>;
  /** Resolves with the newly registered User. */
  register: (payload: RegisterCustomerPayload) => Promise<User>;
  /** Submits owner registration; account requires admin approval before login. */
  registerOwner: (payload: RegisterOwnerPayload) => Promise<RegisterOwnerResponse>;
  /** Sync read of the in-memory access token (used by the Axios interceptor). */
  getAccessToken: () => string | null;
  refreshMe: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

const REFRESH_TOKEN_KEY = 'refreshToken';

/** Role → default post-login route */
export const ROLE_HOME: Record<UserRole, string> = {
  CUSTOMER: '/cafes',
  OWNER: '/owner/dashboard',
  ADMIN: '/admin/dashboard',
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [customerProfile, setCustomerProfile] = useState<CustomerProfile | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const accessTokenRef = useRef<string | null>(null);

  const getAccessToken = useCallback(() => accessTokenRef.current, []);

  const setAccessToken = useCallback((token: string | null) => {
    accessTokenRef.current = token;
  }, []);

  const clearAuth = useCallback(() => {
    accessTokenRef.current = null;
    localStorage.removeItem(REFRESH_TOKEN_KEY);
    setCurrentUser(null);
    setCustomerProfile(null);
  }, []);

  const clearSession = useCallback(() => {
    clearAuth();
    queryClient.clear();
  }, [clearAuth]);

  // Register Axios interceptor callbacks once on mount.
  useEffect(() => {
    setupAuthCallbacks(
      getAccessToken,
      setAccessToken,
      () => {
        clearSession();
        window.location.href = '/login';
      },
    );
  }, [getAccessToken, setAccessToken, clearSession]);

  useEffect(() => {
    const storedRefresh = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!storedRefresh) {
      setIsInitializing(false);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const { tokens } = await authService.refresh(storedRefresh);
        if (cancelled) return;

        accessTokenRef.current = tokens.accessToken;
        localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);

        const { user, profile } = await authService.getMe();
        if (cancelled) return;

        setCurrentUser(user);
        setCustomerProfile(profile ?? null);
      } catch {
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setIsInitializing(false);
      }
    })();

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const login = useCallback(async (payload: LoginPayload): Promise<User> => {
    const { tokens } = await authService.login(payload);
    accessTokenRef.current = tokens.accessToken;
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);

    const { user, profile } = await authService.getMe();
    setCurrentUser(user);
    setCustomerProfile(profile ?? null);
    return user;
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (refreshToken) {
      try {
        await authService.logout(refreshToken);
      } catch {
      }
    }
    clearSession();
  }, [clearSession]);

  const register = useCallback(async (payload: RegisterCustomerPayload): Promise<User> => {
    const { tokens } = await authService.register(payload);
    accessTokenRef.current = tokens.accessToken;
    localStorage.setItem(REFRESH_TOKEN_KEY, tokens.refreshToken);

    const me = await authService.getMe();
    setCurrentUser(me.user);
    setCustomerProfile(me.profile ?? null);
    return me.user;
  }, []);

  const registerOwner = useCallback(async (payload: RegisterOwnerPayload): Promise<RegisterOwnerResponse> => {
    return authService.registerOwner(payload);
  }, []);

  const refreshMe = useCallback(async (): Promise<void> => {
    try {
      const { user, profile } = await authService.getMe();
      setCurrentUser(user);
      setCustomerProfile(profile ?? null);
    } catch {
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        customerProfile,
        isInitializing,
        isAuthenticated: currentUser !== null,
        login,
        logout,
        register,
        registerOwner,
        getAccessToken,
        refreshMe,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
