import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { useAuth } from "./AuthContext";
import { TokenService, Token } from "../services/tokenService";
import { useToast } from "./ToastContext";

interface TokenContextType {
  token: Token | null;
  hasToken: boolean;
  loading: boolean;
  refreshToken: () => Promise<void>;
  createToken: (tokenData: {
    token: string;
    package: string;
    type: string;
    features?: any[];
    addons?: any[];
    expiredAt?: string;
  }) => Promise<void>;
  activateExistingToken: (tokenString: string) => Promise<void>;
  deactivateToken: () => Promise<void>;
}

const TokenContext = createContext<TokenContextType | undefined>(undefined);

interface TokenProviderProps {
  children: ReactNode;
}

export function TokenProvider({ children }: TokenProviderProps) {
  const [token, setToken] = useState<Token | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { error, success } = useToast();

  const refreshToken = async () => {
    if (!user?.id) {
      setToken(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const userToken = await TokenService.getUserToken(user.id);
      setToken(userToken);
    } catch (err) {
      console.error("Error refreshing token:", err);
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const createToken = async (tokenData: {
    token: string;
    package: string;
    type: string;
    features?: any[];
    addons?: any[];
    expiredAt?: string;
  }) => {
    if (!user?.id) {
      error("User not authenticated", "Please sign in to create a token");
      return;
    }

    try {
      setLoading(true);
      const newToken = await TokenService.createToken(user.id, tokenData);
      setToken(newToken);
      success("Token activated!", "Your token has been successfully activated");
    } catch (err) {
      console.error("Error creating token:", err);
      error("Failed to create token", "Please try again");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const activateExistingToken = async (tokenString: string) => {
    if (!user?.id) {
      error("User not authenticated", "Please sign in to activate token");
      return;
    }

    try {
      setLoading(true);
      const activatedToken = await TokenService.validateAndActivateToken(
        user.id,
        tokenString
      );
      setToken(activatedToken);
      success("Token activated!", "Your token has been successfully activated");
    } catch (err: any) {
      console.error("Error activating token:", err);
      error(
        "Failed to activate token",
        err.message || "Please check your token and try again"
      );
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deactivateToken = async () => {
    if (!user?.id) {
      error("User not authenticated", "Please sign in to deactivate token");
      return;
    }

    try {
      setLoading(true);
      await TokenService.deactivateToken(user.id);
      setToken(null);
      success("Token deactivated", "Your token has been deactivated");
    } catch (err) {
      console.error("Error deactivating token:", err);
      error("Failed to deactivate token", "Please try again");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Refresh token when user changes
  useEffect(() => {
    refreshToken();
  }, [user?.id]);

  const value: TokenContextType = {
    token,
    hasToken: token !== null,
    loading,
    refreshToken,
    createToken,
    activateExistingToken,
    deactivateToken,
  };

  return (
    <TokenContext.Provider value={value}>{children}</TokenContext.Provider>
  );
}

export function useToken() {
  const context = useContext(TokenContext);
  if (context === undefined) {
    throw new Error("useToken must be used within a TokenProvider");
  }
  return context;
}
