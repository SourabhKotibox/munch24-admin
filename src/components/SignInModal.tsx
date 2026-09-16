import { useState, useEffect, useCallback } from "react";
import { useLocation, Link } from "wouter";
import { Play, X, Loader2, ArrowLeft } from "lucide-react";
import { useSettings, getResponsiveLogoStyle } from "@/contexts/SettingsContext";
import { useTheme } from "next-themes";
import { useAuth } from "@/contexts/AuthContext";
import { getImageUrl, sendOtpApp, verifyOtpApp } from "@/lib/api-client";

// Helper to dynamically load external scripts for Google / Apple auth
function loadScript(src: string, id: string): Promise<void> {
  return new Promise((resolve) => {
    if (document.getElementById(id)) { resolve(); return; }
    const script = document.createElement("script");
    script.id = id;
    script.src = src;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

const baseUrl = (import.meta as any).env?.VITE_API_URL || "";

async function socialAuthRequest(provider: "google" | "apple", idToken: string, user?: any) {
  const token = localStorage.getItem("appAccessToken");
  const res = await fetch(`${baseUrl}/api/app/auth/${provider}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify({ idToken, ...(user ? { user } : {}) }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || `${provider} sign-in failed`);
  return json;
}

export interface SignInModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  initialMode?: "login";
  onSuccess?: (user?: any) => void;
  isPage?: boolean;
}

export default function SignInModal({
  isOpen = true,
  onClose,
  onSuccess,
  isPage = false,
}: SignInModalProps) {
  // ── OTP Login state ───────────────────────────────────────────────────────
  const [otpPhone, setOtpPhone] = useState("");
  const [otpStep, setOtpStep] = useState<"phone" | "otp">("phone");
  const [verificationId, setVerificationId] = useState("");
  const [otp, setOtp] = useState("");
  const [resendTimer, setResendTimer] = useState(0);
  const [resending, setResending] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<"google" | "apple" | null>(null);

  const { settings } = useSettings();
  const { resolvedTheme } = useTheme();
  const { signIn } = useAuth();
  const [, setLocation] = useLocation();

  const getLogoUrl = () => {
    if (resolvedTheme === "dark" && settings.darkLogoUrl) return getImageUrl(settings.darkLogoUrl);
    if (resolvedTheme === "light" && settings.lightLogoUrl) return getImageUrl(settings.lightLogoUrl);
    return settings.logoUrl ? getImageUrl(settings.logoUrl) : "";
  };
  const logoUrl = getLogoUrl();

  useEffect(() => {
    if (!isPage && isOpen) {
      document.body.style.overflow = "hidden";
      return () => { document.body.style.overflow = ""; };
    }
  }, [isPage, isOpen]);

  // Countdown timer for Resend OTP cooldown (30s)
  useEffect(() => {
    if (resendTimer <= 0) return;
    const interval = setInterval(() => {
      setResendTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [resendTimer]);

  const handleAuthSuccess = useCallback((res: any) => {
    const userData = {
      id: res.userId,
      name: res.name || `User`,
      email: res.email || null,
      phone: res.phone || null,
      avatar: res.avatar || null,
      subscriptionPlan: res.subscriptionPlan || "free",
      subscriptionStatus: res.subscriptionStatus || "inactive",
      subscriptionExpiry: res.subscriptionExpiry || null,
      walletBalance: res.walletBalance || 0,
      profileLimitCount: res.profileLimitCount || 1,
    };
    signIn(userData, res.accessToken);
    if (onSuccess) {
      onSuccess(userData);
    }
    if (onClose) {
      onClose();
    }
    if (isPage) {
      setLocation("/");
    }
  }, [signIn, onSuccess, onClose, isPage, setLocation]);

  // ── OTP Login: Step 1 — Send OTP ──────────────────────────────────────────
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (loading || resending) return;
    setError("");
    const digits = otpPhone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setLoading(true);
    try {
      const res = await sendOtpApp(digits);
      if (!res.success) {
        const msg = res.message || "Failed to send OTP.";
        if (msg.includes("REQUEST_ALREADY_EXISTS") || msg.includes("wait a few seconds") || res.code === 506) {
          setError("Please wait a few seconds before requesting another OTP.");
        } else {
          setError(msg);
        }
        return;
      }
      setVerificationId(res.verificationId || "");
      setOtpStep("otp");
      const cooldown = typeof res.timeout === "number" && res.timeout > 0 ? res.timeout : 30;
      setResendTimer(cooldown);
    } catch (err: any) {
      const msg = err.message || "Failed to send OTP. Please try again.";
      if (msg.includes("REQUEST_ALREADY_EXISTS") || msg.includes("wait a few seconds")) {
        setError("Please wait a few seconds before requesting another OTP.");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  // ── OTP Login: Resend OTP ──────────────────────────────────────────────────
  const handleResendOtp = async (e?: React.MouseEvent) => {
    if (e) e.preventDefault();
    if (loading || resending || resendTimer > 0) return;
    setError("");
    const digits = otpPhone.replace(/\D/g, "");
    if (digits.length !== 10) {
      setError("Please enter a valid 10-digit mobile number.");
      return;
    }
    setResending(true);
    try {
      const res = await sendOtpApp(digits);
      if (!res.success) {
        const msg = res.message || "Failed to send OTP.";
        if (msg.includes("REQUEST_ALREADY_EXISTS") || msg.includes("wait a few seconds") || res.code === 506) {
          setError("Please wait a few seconds before requesting another OTP.");
          setResendTimer((prev) => (prev > 0 ? prev : 30));
        } else {
          setError(msg);
        }
        return;
      }
      if (res.verificationId) {
        setVerificationId(res.verificationId);
      }
      setError("");
      const cooldown = typeof res.timeout === "number" && res.timeout > 0 ? res.timeout : 30;
      setResendTimer(cooldown);
    } catch (err: any) {
      const msg = err.message || "Failed to send OTP. Please try again.";
      if (msg.includes("REQUEST_ALREADY_EXISTS") || msg.includes("wait a few seconds")) {
        setError("Please wait a few seconds before requesting another OTP.");
        setResendTimer((prev) => (prev > 0 ? prev : 30));
      } else {
        setError(msg);
      }
    } finally {
      setResending(false);
    }
  };

  // ── OTP Login: Step 2 — Verify OTP ───────────────────────────────────────
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!otp.trim()) { setError("Please enter the OTP."); return; }
    setLoading(true);
    try {
      const digits = otpPhone.replace(/\D/g, "");
      const res = await verifyOtpApp({ mobileNumber: digits, verificationId, otp: otp.trim() });
      if (!res.success) throw new Error(res.message || "OTP verification failed.");
      handleAuthSuccess(res);
    } catch (err: any) {
      setError(err.message || "OTP verification failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // ── Google Sign In ─────────────────────────────────────────────────────────
  const handleGoogleSignIn = useCallback(async () => {
    if (!settings.googleClientId) return;
    setSocialLoading("google");
    setError("");
    try {
      await loadScript("https://accounts.google.com/gsi/client", "gsi-client");
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error("Google Sign In timed out")), 10000);
        window.google?.accounts.id.initialize({
          client_id: settings.googleClientId,
          callback: async (response: { credential: string }) => {
            clearTimeout(timeout);
            try {
              const res = await socialAuthRequest("google", response.credential);
              handleAuthSuccess(res);
              resolve();
            } catch (err: any) {
              setError(err?.message || "Google sign-in failed.");
              reject(err);
            }
          },
          cancel_on_tap_outside: true,
          use_fedcm_for_prompt: false,
        });
        window.google?.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            clearTimeout(timeout);
            resolve();
          }
        });
      });
    } catch (err: any) {
      if (err?.message !== "Google Sign In timed out") setError(err?.message || "Google sign-in failed.");
    } finally {
      setSocialLoading(null);
    }
  }, [settings.googleClientId, handleAuthSuccess]);

  // ── Apple Sign In ──────────────────────────────────────────────────────────
  const handleAppleSignIn = useCallback(async () => {
    if (!settings.appleClientId) return;
    setSocialLoading("apple");
    setError("");
    try {
      await loadScript(
        "https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js",
        "apple-auth-js"
      );
      window.AppleID?.auth.init({
        clientId: settings.appleClientId,
        scope: "name email",
        redirectURI: window.location.origin,
        usePopup: true,
      });
      const response = await window.AppleID?.auth.signIn();
      const idToken = response?.authorization?.id_token;
      if (!idToken) throw new Error("Apple sign-in cancelled");
      const res = await socialAuthRequest("apple", idToken, response?.user);
      handleAuthSuccess(res);
    } catch (err: any) {
      if (err?.error !== "popup_closed_by_user") setError(err?.message || "Apple sign-in failed.");
    } finally {
      setSocialLoading(null);
    }
  }, [settings.appleClientId, handleAuthSuccess]);

  if (!isOpen) return null;

  const cardContent = (
    <div className="relative z-10 w-full max-w-[520px] bg-[#0c0c14] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex max-h-[90vh] sm:max-h-[92vh] my-auto">
      {/* ── Left Red/Black Banner ── */}
      <div className="hidden sm:flex w-[160px] md:w-[180px] flex-shrink-0 relative overflow-hidden bg-black flex-col justify-between p-5 md:p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-red-600/30 via-black/90 to-[#030306]/95 z-0" />
        <div className="relative z-10 flex flex-col items-center justify-center h-full gap-3">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={settings.platformName || "StreamIT"}
              style={
                getResponsiveLogoStyle(
                  resolvedTheme === "dark" && settings.darkLogoUrl
                    ? settings.darkLogoWidth
                    : resolvedTheme === "light" && settings.lightLogoUrl
                    ? settings.lightLogoWidth
                    : undefined
                )
              }
              className="h-14 md:h-16 w-auto object-contain drop-shadow-2xl"
            />
          ) : (
            <>
              <div className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/50">
                <Play className="w-5 h-5 md:w-6 md:h-6 text-white fill-white ml-0.5" />
              </div>
              <span className="text-white font-bold text-sm md:text-[15px] tracking-tight mt-2">{settings.platformName || "StreamIT"}</span>
            </>
          )}
          <p className="text-[10px] text-white/80 text-center font-medium mt-3 leading-relaxed">Your portal to premium cinematic experiences.</p>
        </div>
      </div>

      {/* ── Right Content Panel ── */}
      <div className="flex-1 flex flex-col p-5 sm:p-7 md:p-8 overflow-y-auto max-w-full">
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 w-8 h-8 flex items-center justify-center rounded-full text-white hover:text-white hover:bg-white/5 transition-all z-10 touch-manipulation"
          >
            <X className="w-4 h-4" />
          </button>
        )}

        <h2 className="text-white font-bold text-lg sm:text-xl md:text-2xl tracking-tight mb-1 pr-7">
          Welcome Back
        </h2>
        <p className="text-white/75 text-xs sm:text-sm mb-4 sm:mb-6 font-medium leading-relaxed">
          Enjoy unlimited access to premium OTT content.
        </p>

        {error && (
          <div className="mb-4 p-3 sm:p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-semibold leading-snug break-words [overflow-wrap:anywhere] max-w-full">
            {error}
          </div>
        )}

        {/* ── LOGIN: Phone + OTP ── */}
        {otpStep === "phone" ? (
          <form onSubmit={handleSendOtp} className="flex flex-col gap-3 sm:gap-3.5">
            <div>
              <label className="block text-[11px] font-bold text-white/60 mb-1.5 uppercase tracking-wider">Mobile Number</label>
              <input
                type="tel"
                required
                value={otpPhone}
                onChange={(e) => setOtpPhone(e.target.value.replace(/[^\d]/g, "").slice(0, 10))}
                placeholder="10-digit mobile number"
                inputMode="numeric"
                className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder:text-white/80 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
              />
            </div>
            <button
              disabled={loading}
              type="submit"
              className="w-full mt-1.5 sm:mt-2 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all text-xs flex justify-center items-center min-h-[42px] sm:h-[44px] shadow-lg shadow-red-900/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Send OTP"}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="flex flex-col gap-3 sm:gap-3.5">
            <p className="text-white/70 text-[11px] font-semibold break-words">
              OTP sent to <span className="text-white">+91 {otpPhone}</span>.{" "}
              <button
                type="button"
                onClick={() => { setOtpStep("phone"); setOtp(""); setVerificationId(""); setError(""); setResendTimer(0); setResending(false); }}
                className="text-red-500 hover:underline"
              >
                Change
              </button>
            </p>
            <div>
              <label className="block text-[11px] font-bold text-white/60 mb-1.5 uppercase tracking-wider">Enter OTP</label>
              <input
                type="text"
                required
                inputMode="numeric"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/[^\d]/g, "").slice(0, 6))}
                placeholder="Enter OTP"
                className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder:text-white/80 px-3.5 sm:px-4 py-2.5 sm:py-3 rounded-xl text-xs font-semibold tracking-[0.2em] sm:tracking-[0.3em] focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
              />
            </div>
            <button
              disabled={loading || resending}
              type="submit"
              className="w-full mt-1.5 sm:mt-2 py-2.5 sm:py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all text-xs flex justify-center items-center min-h-[42px] sm:h-[44px] shadow-lg shadow-red-900/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Verify OTP"}
            </button>
            <button
              type="button"
              disabled={loading || resending || resendTimer > 0}
              onClick={handleResendOtp}
              className="text-center text-[11px] text-white/60 hover:text-white transition-colors py-1 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Didn't receive OTP?{" "}
              {resending ? (
                <span className="text-white/50 font-semibold inline-flex items-center gap-1">
                  <Loader2 className="w-3 h-3 animate-spin inline" /> Resending...
                </span>
              ) : resendTimer > 0 ? (
                <span className="text-white/50 font-semibold">Resend OTP in {resendTimer}s</span>
              ) : (
                <span className="text-red-500 font-bold hover:underline">Resend OTP</span>
              )}
            </button>
          </form>
        )}

        {/* ── Social Login ── */}
        {settings.socialLogin && (
          <div className="mt-5 sm:mt-6 space-y-3.5 sm:space-y-4">
            <div className="flex items-center gap-3 text-white/80 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex-1 h-px bg-zinc-800" />
              <span>Or connect with</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={socialLoading !== null}
                className="flex-1 py-2 px-2 bg-zinc-950 border border-zinc-800 text-white/80 hover:text-white rounded-full text-[11px] font-bold transition-all hover:bg-zinc-900 flex items-center justify-center gap-1.5 min-w-0 touch-manipulation disabled:opacity-50"
              >
                {socialLoading === "google" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span className="truncate">Google</span>
              </button>
              <button
                type="button"
                onClick={handleAppleSignIn}
                disabled={socialLoading !== null}
                className="flex-1 py-2 px-2 bg-zinc-950 border border-zinc-800 text-white/80 hover:text-white rounded-full text-[11px] font-bold transition-all hover:bg-zinc-900 flex items-center justify-center gap-1.5 min-w-0 touch-manipulation disabled:opacity-50"
              >
                {socialLoading === "apple" ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span className="truncate">Apple</span>
              </button>
            </div>
          </div>
        )}

        <p className="text-white/80 text-[10px] text-center leading-relaxed mt-5 sm:mt-6 font-medium break-words">
          By continuing, you accept our <a href="#" className="text-white/80 hover:underline">Terms of Service</a> &amp; <a href="#" className="text-white/80 hover:underline">Privacy Policy</a>.
        </p>
      </div>
    </div>
  );

  // If used as a standalone page (e.g. /login or /register)
  if (isPage) {
    return (
      <div className="min-h-screen bg-[#030306] flex flex-col items-center justify-center p-3 sm:p-4 py-16 sm:py-12 relative overflow-x-hidden font-sans selection:bg-red-600/30">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(229,9,20,0.12),transparent_50%)] pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_right,rgba(139,92,246,0.08),transparent_50%)] pointer-events-none" />

        <Link
          href="/"
          className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-1.5 sm:gap-2 text-xs font-semibold text-white/70 hover:text-white transition-all bg-white/5 border border-zinc-900 hover:border-zinc-800 px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl z-20"
        >
          <ArrowLeft className="w-3.5 h-3.5" /> Back to Home
        </Link>

        {cardContent}
      </div>
    );
  }

  // If used as an inline modal/popup
  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200 overflow-y-auto">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      {cardContent}
    </div>
  );
}
