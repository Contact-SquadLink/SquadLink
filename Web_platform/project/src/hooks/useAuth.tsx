import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { Role, User } from '@/types';
import { authApi, type RegisterPayload } from '@/api/auth';
import { clearToken, getToken, setToken } from '@/api/client';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (
    identifier: string,
    password: string,
    expectedRole?: Role
  ) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function normalizeUser(user: User): User {
  return {
    ...user,
    phone: user.phone ?? user.phoneNumber ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async (): Promise<User | null> => {
    const token = getToken();

    if (!token) {
      setUser(null);
      return null;
    }

    try {
      const response = await authApi.me();
      const me = response.data;

      const updatedUser: User = {
        id: me.id || me.userId,
        email: me.email ?? null,
        phoneNumber: me.phoneNumber ?? null,
        phone: me.phoneNumber ?? undefined,
        firstName: me.firstName ?? undefined,
        lastName: me.lastName ?? undefined,
        role: me.role as Role,
      };

      setUser(updatedUser);
      return updatedUser;
    } catch {
      clearToken();
      setUser(null);
      return null;
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initializeAuth() {
      if (!getToken()) {
        if (mounted) {
          setUser(null);
          setIsLoading(false);
        }
        return;
      }

      try {
        const response = await authApi.me();

        if (!mounted) return;

        const me = response.data;

        setUser({
          id: me.id || me.userId,
          email: me.email ?? null,
          phoneNumber: me.phoneNumber ?? null,
          phone: me.phoneNumber ?? undefined,
          firstName: me.firstName ?? undefined,
          lastName: me.lastName ?? undefined,
          role: me.role as Role,
        });
      } catch {
        if (mounted) {
          clearToken();
          setUser(null);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    initializeAuth();

    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(
    async (
      identifier: string,
      password: string,
      expectedRole?: Role
    ): Promise<User> => {
      const response = await authApi.login({
        identifier,
        password,
      });

      const authenticatedUser = normalizeUser(response.data.user);

      if (expectedRole && authenticatedUser.role !== expectedRole) {
        queryClient.clear();
        clearToken();
        setUser(null);
        throw new Error(
          `This account is not registered as a ${expectedRole.toLowerCase().replace('_', ' ')} account.`
        );
      }

      queryClient.clear();
      setToken(response.data.accessToken);
      setUser(authenticatedUser);

      return authenticatedUser;
    },
    [queryClient]
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<User> => {
      await authApi.register(payload);

      const identifier = payload.email || payload.phoneNumber || payload.phone || '';
      const loginResponse = await authApi.login({
        identifier,
        password: payload.password,
      });

      const authenticatedUser = normalizeUser(loginResponse.data.user);
      queryClient.clear();
      setToken(loginResponse.data.accessToken);
      setUser(authenticatedUser);

      // Verify and refresh full profile state via me endpoint
      try {
        const meResponse = await authApi.me();
        const me = meResponse.data;
        const fullyLoadedUser: User = {
          id: me.id || me.userId,
          email: me.email ?? null,
          phoneNumber: me.phoneNumber ?? null,
          phone: me.phoneNumber ?? undefined,
          firstName: me.firstName ?? undefined,
          lastName: me.lastName ?? undefined,
          role: me.role as Role,
        };
        setUser(fullyLoadedUser);
        return fullyLoadedUser;
      } catch {
        return authenticatedUser;
      }
    },
    [queryClient]
  );

  const logout = useCallback(() => {
    queryClient.clear();
    clearToken();
    setUser(null);
  }, [queryClient]);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: user !== null,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);

  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }

  return ctx;
}