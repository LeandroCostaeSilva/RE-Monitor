import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useGetMe } from "@workspace/api-client-react";

interface AuthUser {
  id: string;
  nome: string;
  email: string;
  perfil: string;
  ativo: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("anvisa_token"));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data: meData, isError } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
    },
  });

  useEffect(() => {
    if (meData) {
      setUser(meData as AuthUser);
      setIsLoading(false);
    } else if (isError || !token) {
      setUser(null);
      setIsLoading(false);
    }
  }, [meData, isError, token]);

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem("anvisa_token", newToken);
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("anvisa_token");
    setToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
