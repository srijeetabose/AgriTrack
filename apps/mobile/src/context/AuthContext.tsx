import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

export interface User {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  district?: string;
  state?: string;
  village?: string;
  farm_size?: number;
  green_certified?: boolean;
  green_credits?: number;
  crops?: string[];
  role: 'farmer' | 'admin' | 'manager';
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (phone: string, pin: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load saved auth on mount
  useEffect(() => {
    const savedToken = localStorage.getItem('agritrack_token');
    const savedUser = localStorage.getItem('agritrack_user');

    if (savedToken && savedUser) {
      setToken(savedToken);
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = async (phone: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${API_URL}/auth/farmer/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ phone, pin }),
      });

      const data = await response.json();

      if (!response.ok) {
        return { success: false, error: data.error || 'Login failed' };
      }

      // Save to state and localStorage
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem('agritrack_token', data.token);
      localStorage.setItem('agritrack_user', JSON.stringify(data.user));

      return { success: true };
    } catch (error) {
      console.error('Login error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('agritrack_token');
    localStorage.removeItem('agritrack_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
        isAuthenticated: !!token && !!user,
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
