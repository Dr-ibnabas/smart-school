import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { BACKEND_URL } from '../services/api';

interface UserProfile {
  id?: string | number;
  email: string | null;
  displayName?: string | null;
  nom?: string;
  prenom?: string;
  role?: string;
  matricule?: string;
  lastName?: string;
  firstName?: string;
  school_id?: number | null;
  assignments?: string[];
  subjects?: string[];
  /** Présent uniquement en mode impersonation : l'id du super-admin réel. */
  impersonated_by?: string | number;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (token: string, userData: UserProfile) => void;
  logout: () => void;
  /** Sauve le token courant et bascule sur celui d'un autre user (super-admin only). */
  startImpersonation: (newToken: string, newUser: UserProfile) => void;
  /** Restaure le token super-admin original. */
  stopImpersonation: () => boolean;
  /** True si on est actuellement en mode impersonation. */
  isImpersonating: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  startImpersonation: () => {},
  stopImpersonation: () => false,
  isImpersonating: false,
});

const TOKEN_KEY = 'smartschool_token';
const USER_KEY = 'smartschool_user';
const REAL_TOKEN_KEY = 'smartschool_impersonator_token'; // token original du super-admin
const REAL_USER_KEY = 'smartschool_impersonator_user';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isImpersonating, setIsImpersonating] = useState(false);

  useEffect(() => {
    const checkToken = async () => {
      const token = localStorage.getItem(TOKEN_KEY);
      if (token) {
        try {
          const response = await fetch(`${BACKEND_URL}/api/auth/check`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (response.ok) {
            const result = await response.json();
            setUser(result.user);
            setIsImpersonating(!!localStorage.getItem(REAL_TOKEN_KEY));
          } else {
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setUser(null);
          }
        } catch (error) {
          console.error("Erreur de validation du token :", error);
          const localUser = localStorage.getItem(USER_KEY);
          if (localUser) {
            setUser(JSON.parse(localUser));
          } else {
            setUser(null);
          }
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    checkToken();
  }, []);

  const login = useCallback((token: string, userData: UserProfile) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    // En cas de login direct (pas via impersonation), on nettoie l'éventuel
    // état d'impersonation laissé par une session précédente.
    localStorage.removeItem(REAL_TOKEN_KEY);
    localStorage.removeItem(REAL_USER_KEY);
    setUser(userData);
    setIsImpersonating(false);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    localStorage.removeItem(REAL_TOKEN_KEY);
    localStorage.removeItem(REAL_USER_KEY);
    setUser(null);
    setIsImpersonating(false);
  }, []);

  const startImpersonation = useCallback((newToken: string, newUser: UserProfile) => {
    // Sauvegarde du contexte super-admin actuel
    const currentToken = localStorage.getItem(TOKEN_KEY);
    const currentUser = localStorage.getItem(USER_KEY);
    if (currentToken) localStorage.setItem(REAL_TOKEN_KEY, currentToken);
    if (currentUser)  localStorage.setItem(REAL_USER_KEY, currentUser);

    // Bascule sur la session impersonnée
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    setUser(newUser);
    setIsImpersonating(true);
  }, []);

  const stopImpersonation = useCallback((): boolean => {
    const realToken = localStorage.getItem(REAL_TOKEN_KEY);
    const realUser  = localStorage.getItem(REAL_USER_KEY);
    if (!realToken || !realUser) return false;

    localStorage.setItem(TOKEN_KEY, realToken);
    localStorage.setItem(USER_KEY, realUser);
    localStorage.removeItem(REAL_TOKEN_KEY);
    localStorage.removeItem(REAL_USER_KEY);

    try {
      setUser(JSON.parse(realUser));
    } catch {
      setUser(null);
    }
    setIsImpersonating(false);
    return true;
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, startImpersonation, stopImpersonation, isImpersonating }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
