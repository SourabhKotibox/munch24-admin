/**
 * AuthContext — Single source of truth for public (streaming) user auth state.
 *
 * - Same-tab sync:  dispatches / listens to "auth-changed" CustomEvent
 * - Cross-tab sync: listens to the native "storage" event (fires when another
 *   tab writes to localStorage)
 * - Sign-out clears ALL auth storage keys and invalidates the React-Query cache.
 */

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetAppProfile } from "@/lib/api-client";

// ---------------------------------------------------------------------------
// Plan formatting helper — consistent across the application
// free → Free, standard → Standard, vip → VIP, premium → Premium
// ---------------------------------------------------------------------------
export function formatPlanName(plan?: string | null): string {
  if (!plan) return "Free";
  const p = plan.trim().toLowerCase();
  if (p === "vip") return "VIP";
  if (p === "premium") return "Premium";
  if (p === "standard") return "Standard";
  if (p === "basic") return "Basic";
  if (p === "free") return "Free";
  return plan.charAt(0).toUpperCase() + plan.slice(1);
}

// ---------------------------------------------------------------------------
// Storage keys used throughout the app (keep in sync with api-client.ts)
// ---------------------------------------------------------------------------
const USER_KEYS = ["appUser", "user"] as const;
const TOKEN_KEYS = ["appAccessToken", "accessToken", "refreshToken"] as const;
const PROFILE_KEYS = ["ott_active_profile"] as const;

// The canonical key we always write user data to
const CANONICAL_USER_KEY = "appUser";
const CANONICAL_TOKEN_KEY = "appAccessToken";

// Event name used for same-tab notifications
const AUTH_EVENT = "auth-changed";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export interface AppUser {
  id: string;
  name?: string;
  email?: string;
  phone?: string;
  avatar?: string | null;
  subscriptionPlan?: string;
  subscriptionStatus?: string;
  subscription?: boolean;
  downloadAllowed?: boolean;
  canDownload?: boolean;
  profileLimitCount?: number;
  [key: string]: unknown;
}

interface AuthContextValue {
  user: AppUser | null;
  /** Call after successful login/register — stores tokens & user, notifies all tabs */
  signIn: (user: AppUser, token: string, legacyToken?: string) => void;
  /** Clears all auth data, notifies all tabs, invalidates query cache */
  signOut: () => void;
  /** Update the cached user object (e.g. after profile save) */
  updateUser: (partial: Partial<AppUser>) => void;
  /** Global standard RED Kotibox Login/Register modal state */
  isAuthModalOpen: boolean;
  authModalMode: "login" | "register";
  openAuthModal: (mode?: "login" | "register") => void;
  closeAuthModal: () => void;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function readUser(): AppUser | null {
  try {
    const raw =
      localStorage.getItem(CANONICAL_USER_KEY) ||
      localStorage.getItem("user");
    return raw ? (JSON.parse(raw) as AppUser) : null;
  } catch {
    return null;
  }
}

function dispatchAuthChanged() {
  window.dispatchEvent(new CustomEvent(AUTH_EVENT));
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------
const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(readUser);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<"login" | "register">("login");
  const queryClient = useQueryClient();

  const openAuthModal = useCallback((mode: "login" | "register" = "login") => {
    setAuthModalMode(mode);
    setIsAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setIsAuthModalOpen(false);
  }, []);

  // Single source of truth: authenticated user/profile API
  const { data: profileData } = useGetAppProfile();

  useEffect(() => {
    if (profileData?.user) {
      const u = profileData.user;
      setUser((prev) => {
        const updated: AppUser = {
          ...(prev || {}),
          id: u.id || u._id || prev?.id,
          name: u.name || prev?.name,
          email: u.email || prev?.email,
          phone: u.phone || u.mobile || prev?.phone,
          avatar: u.avatar !== undefined ? u.avatar : prev?.avatar,
          subscriptionPlan: u.subscriptionPlan || "free",
          subscriptionStatus: u.subscriptionStatus || "inactive",
          subscription: u.subscription,
          downloadAllowed: u.downloadAllowed === true,
          canDownload: u.canDownload === true,
          profileLimitCount: u.profileLimitCount || prev?.profileLimitCount || 1,
        };
        localStorage.setItem(CANONICAL_USER_KEY, JSON.stringify(updated));
        localStorage.setItem("user", JSON.stringify(updated));
        return updated;
      });
    }
  }, [profileData]);

  // Reload from storage whenever the event fires (same tab or other tab)
  const sync = useCallback(() => {
    setUser(readUser());
  }, []);

  useEffect(() => {
    // Same-tab: custom event
    window.addEventListener(AUTH_EVENT, sync);
    // Cross-tab: storage event (fires in OTHER tabs when localStorage changes)
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(AUTH_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, [sync]);

  const signIn = useCallback(
    (userData: AppUser, token: string, legacyToken?: string) => {
      // Write canonical keys
      localStorage.setItem(CANONICAL_USER_KEY, JSON.stringify(userData));
      localStorage.setItem(CANONICAL_TOKEN_KEY, token);
      // Write legacy keys for backward-compat
      localStorage.setItem("user", JSON.stringify(userData));
      localStorage.setItem("accessToken", legacyToken ?? token);
      // Invalidate app-profile so live backend data is fetched immediately
      queryClient.invalidateQueries({ queryKey: ["app-profile"] });
      // Update state synchronously, then notify other tabs
      setUser(userData);
      setIsAuthModalOpen(false);
      dispatchAuthChanged();
    },
    [queryClient]
  );

  const signOut = useCallback(() => {
    // Clear all auth-related keys
    USER_KEYS.forEach((k) => localStorage.removeItem(k));
    TOKEN_KEYS.forEach((k) => localStorage.removeItem(k));
    PROFILE_KEYS.forEach((k) => localStorage.removeItem(k));
    // Invalidate any user-related query cache
    queryClient.removeQueries({ queryKey: ["app-profile"] });
    queryClient.removeQueries({ queryKey: ["wishlist"] });
    queryClient.removeQueries({ queryKey: ["watch-history"] });
    queryClient.removeQueries({ queryKey: ["downloads"] });
    queryClient.removeQueries({ queryKey: ["wallet"] });
    // Update state synchronously, then notify other tabs
    setUser(null);
    dispatchAuthChanged();
  }, [queryClient]);

  const updateUser = useCallback((partial: Partial<AppUser>) => {
    setUser((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, ...partial };
      localStorage.setItem(CANONICAL_USER_KEY, JSON.stringify(updated));
      localStorage.setItem("user", JSON.stringify(updated));
      dispatchAuthChanged();
      return updated;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        signIn,
        signOut,
        updateUser,
        isAuthModalOpen,
        authModalMode,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
