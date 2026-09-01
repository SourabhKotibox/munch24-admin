import { useState, useEffect, useRef } from "react";
import { useLocation, Link } from "wouter";
import {
  User, Mail, Lock, Eye, EyeOff, LogOut, Crown, Clock,
  Heart, Shield, Trash2, ChevronRight, Play, Check,
  Loader2, Bell, ArrowLeft, Star, Edit3, Camera, AlertTriangle,
  Bookmark, Settings, CreditCard, Film, Tv, X, Download, BookmarkX,
  Plus, UserCircle2, Wifi, Smartphone, Wallet
} from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useTheme } from "next-themes";
import {
  getImageUrl, updateAppProfile, uploadProfileAvatar, updatePassword, deleteAccount,
  useGetWishlist, useToggleWishlist,
  useGetDownloads, useRemoveDownload, getOfflineVideoUrl, removeOfflineVideo,
  useGetAppProfile, useGetWatchHistory,
} from "@/lib/api-client";
import { PublicFooter } from "@/pages/streaming-home";
import { WebsiteReviews } from "@/components/WebsiteReviews";

// ─── Types ─────────────────────────────────────────────────────────────────────
type ProfileTab = "overview" | "watchlist" | "downloads" | "settings" | "security" | "feedback";

interface OttProfile {
  id: string;
  name: string;
  color: string;
  isMain: boolean;
}

const PROFILE_COLORS = [
  "bg-primary",
  "bg-[#FAFAFA] text-black",
  "bg-zinc-800",
  "bg-zinc-700",
  "bg-zinc-900",
  "bg-[#1a1a1a] text-white",
];

const COLOR_LABELS = ["Red", "White", "Dark Gray", "Gray", "Almost Black", "Black"];

// ─── Sub-components ────────────────────────────────────────────────────────────

function AvatarCircle({ name, avatarUrl, size = "lg" }: { name?: string; avatarUrl?: string; size?: "sm" | "md" | "lg" | "xl" }) {
  const sizeMap = {
    sm: "w-8 h-8 text-xs",
    md: "w-10 h-10 text-sm",
    lg: "w-16 h-16 text-xl",
    xl: "w-24 h-24 text-3xl",
  };
  if (avatarUrl) {
    return (
      <div className={`${sizeMap[size]} rounded-full overflow-hidden flex-shrink-0 shadow-xl shadow-primary/40 bg-zinc-900 border border-white/10`}>
        <img src={getImageUrl(avatarUrl)} alt={name || "Avatar"} className="w-full h-full object-cover" />
      </div>
    );
  }
  return (
    <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br from-primary via-primary/80 to-primary/60 flex items-center justify-center font-black text-white flex-shrink-0 shadow-xl shadow-primary/40`}>
      {name ? name[0].toUpperCase() : <User className="w-1/2 h-1/2" />}
    </div>
  );
}

function ToastAlert({ msg, onClose }: { msg: string; onClose: () => void }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3500);
    return () => clearTimeout(t);
  }, []);
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[300] bg-emerald-950/95 backdrop-blur-xl border border-emerald-500/30 px-5 py-3 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
        <Check className="w-3.5 h-3.5 text-emerald-400" />
      </div>
      <span className="text-emerald-200 text-sm font-semibold">{msg}</span>
      <button onClick={onClose} className="text-emerald-200/50 hover:text-emerald-200 transition-colors ml-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── Multi-profile selector screen ─────────────────────────────────────────────
function ProfileSelectScreen({ mainUserName, profileLimitCount, userId, onSelect }: { mainUserName: string; profileLimitCount: number; userId: string; onSelect: (profile: OttProfile) => void; }) {
  const [profiles, setProfiles] = useState<OttProfile[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");
  const [newProfileColor, setNewProfileColor] = useState(PROFILE_COLORS[1]);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const usedColors = profiles.map((p) => p.color);
  const availableColors = PROFILE_COLORS.filter((c) => !usedColors.includes(c));

  useEffect(() => {
    if (showAddModal && availableColors.length > 0) {
      setNewProfileColor(availableColors[0]);
    }
  }, [showAddModal, profiles]);

  const storageKey = `ott_profiles_${userId}`;

  useEffect(() => {
    if (!userId) return;
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed: OttProfile[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setProfiles(parsed);
          return;
        }
      }
    } catch {}
    const main: OttProfile = { id: "main", name: mainUserName || "Me", color: PROFILE_COLORS[0], isMain: true };
    localStorage.setItem(storageKey, JSON.stringify([main]));
    setProfiles([main]);
  }, [mainUserName, userId, storageKey]);

  const saveProfiles = (updated: OttProfile[]) => {
    localStorage.setItem(storageKey, JSON.stringify(updated));
    setProfiles(updated);
  };

  const handleAddProfile = () => {
    if (!newProfileName.trim() || profiles.length >= profileLimitCount) return;
    const newP: OttProfile = { id: `profile_${Date.now()}`, name: newProfileName.trim(), color: newProfileColor, isMain: false };
    saveProfiles([...profiles, newP]);
    setNewProfileName("");
    setShowAddModal(false);
  };

  const handleDeleteProfile = (id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      saveProfiles(profiles.filter((p) => p.id !== id));
      setDeletingId(null);
    }, 250);
  };

  const canAddMore = profiles.length < profileLimitCount;

  return (
    <div className="dark min-h-screen bg-background text-foreground flex flex-col items-center justify-center px-6 py-12 font-sans relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-radial from-primary/10 via-primary/3 to-transparent rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-gradient-radial from-violet-500/8 to-transparent rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>
      <div className="relative z-10 text-center mb-14">
        <h1 className="text-foreground font-black text-4xl sm:text-5xl mb-3 text-center tracking-tight">Who's watching?</h1>
      </div>
      <div className="relative z-10 flex flex-wrap justify-center gap-6 sm:gap-10 mb-14">
        {profiles.map((profile) => (
          <div key={profile.id} className={`flex flex-col items-center gap-3 group transition-all duration-250 ${deletingId === profile.id ? "scale-75 opacity-0" : "scale-100 opacity-100"}`}>
            <div className="relative">
              <button
                onClick={() => { localStorage.setItem(`ott_active_profile`, JSON.stringify(profile)); onSelect(profile); }}
                className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-full ${profile.color} flex items-center justify-center font-black text-white text-4xl sm:text-5xl shadow-2xl hover:scale-110 active:scale-95 transition-transform duration-200 ring-0 hover:ring-4 hover:ring-white/20`}
              >
                {profile.name[0]?.toUpperCase() ?? "?"}
              </button>
              {!profile.isMain && (
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteProfile(profile.id); }}
                  className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-zinc-900 border border-zinc-700 text-white/70 hover:text-white hover:bg-red-600 hover:border-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 shadow-lg"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-foreground text-sm font-bold text-center">{profile.name}</span>
          </div>
        ))}
        {canAddMore && (
          <div className="flex flex-col items-center gap-3 group">
            <button onClick={() => setShowAddModal(true)} className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-white/[0.04] border-2 border-dashed border-white/15 hover:border-white/35 flex items-center justify-center text-white/65 hover:text-white transition-all duration-200 hover:scale-105 active:scale-95">
              <Plus className="w-9 h-9" />
            </button>
            <span className="text-foreground text-sm font-bold">Add Profile</span>
          </div>
        )}

      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border/40 rounded-3xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-black text-foreground mb-4">Add Profile</h3>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Name</label>
              <input
                type="text"
                autoFocus
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Name"
                className="w-full bg-background border border-border/50 text-foreground px-4 py-3 rounded-xl text-sm font-semibold focus:outline-none focus:border-primary transition-colors"
                maxLength={15}
              />
            </div>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Color</label>
              <div className="flex gap-3 flex-wrap">
                {availableColors.map((color, i) => (
                  <button
                    key={color}
                    onClick={() => setNewProfileColor(color)}
                    className={`w-10 h-10 rounded-full ${color} ${newProfileColor === color ? 'ring-4 ring-primary ring-offset-2 ring-offset-card' : 'hover:scale-110'} transition-all`}
                    title={`Color ${i+1}`}
                  />
                ))}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-border/50 text-muted-foreground font-bold hover:bg-muted/50 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddProfile}
                disabled={!newProfileName.trim()}
                className="flex-1 py-2.5 rounded-xl bg-primary text-white font-bold hover:bg-primary/90 disabled:opacity-50 transition-colors"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function UserProfilePage() {
  const [, setLocation] = useLocation();
  const { settings } = useSettings();
  const { resolvedTheme } = useTheme();

  const [user, setUser] = useState<any>(() => {
    try {
      const stored = localStorage.getItem("appUser");
      return stored ? JSON.parse(stored) : null;
    } catch { return null; }
  });
  const [activeTab, setActiveTab] = useState<ProfileTab>("overview");
  const [toast, setToast] = useState("");

  const { data: profileData, refetch: refetchProfile } = useGetAppProfile();

  useEffect(() => {
    if (profileData?.user) {
      const u = profileData.user;
      const freshUser = {
        id: u.id || u._id,
        name: u.name,
        email: u.email,
        phone: u.phone || u.mobile,
        avatar: u.avatar,
        subscriptionPlan: u.subscriptionPlan || "free",
        subscriptionStatus: u.subscriptionStatus || "inactive",
        profileLimitCount: u.profileLimitCount || 1,
      };
      localStorage.setItem("appUser", JSON.stringify(freshUser));
      setUser(freshUser);
      setEditName(freshUser.name || "");
      setEditEmail(freshUser.email || "");
      setEditPhone(freshUser.phone || "");
    }
  }, [profileData]);

  const [activeProfile, setActiveProfile] = useState<OttProfile | null>(null);

  // Edit profile state
  const [editName, setEditName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editSaving, setEditSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Password state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  // Delete account
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Data Hooks
  const { data: watchHistoryData } = useGetWatchHistory({ limit: 10 });
  const continueWatching = watchHistoryData?.items || [];
  
  const { data: wishlistData, isLoading: wishlistLoading, refetch: refetchWishlist } = useGetWishlist({ limit: 50 });
  const wishlistItems: any[] = wishlistData?.items || [];
  const toggleWishlistMutation = useToggleWishlist();

  const { data: downloadsData, isLoading: downloadsLoading, refetch: refetchDownloads } = useGetDownloads({ limit: 50 });
  const downloadItems: any[] = Array.isArray(downloadsData) ? downloadsData : [];
  const removeDownloadMutation = useRemoveDownload();

  const [offlineCached, setOfflineCached] = useState<Record<string, boolean>>({});

  const getLogoUrl = () => {
    if (resolvedTheme === "dark" && settings.darkLogoUrl) return getImageUrl(settings.darkLogoUrl);
    if (resolvedTheme === "light" && settings.lightLogoUrl) return getImageUrl(settings.lightLogoUrl);
    return settings.logoUrl ? getImageUrl(settings.logoUrl) : "";
  };

  useEffect(() => {
    try {
      const stored = localStorage.getItem("appUser");
      if (stored) {
        const u = JSON.parse(stored);
        setEditName(u.name || "");
        setEditEmail(u.email || "");
        setEditPhone(u.phone || "");
      }
      const savedProfile = localStorage.getItem("ott_active_profile");
      if (savedProfile) setActiveProfile(JSON.parse(savedProfile));
    } catch {}
  }, []);

  useEffect(() => {
    const handleProfileChanged = () => { refetchWishlist(); refetchDownloads(); };
    window.addEventListener('profile-changed', handleProfileChanged);
    return () => window.removeEventListener('profile-changed', handleProfileChanged);
  }, [refetchWishlist, refetchDownloads]);

  useEffect(() => {
    if (downloadItems.length === 0) return;
    const checkCache = async () => {
      if (!('caches' in window)) return;
      const cache = await caches.open('video-offline-cache');
      const results: Record<string, boolean> = {};
      for (const item of downloadItems) {
        const key = item.episodeId ? `episode-${item.episodeId}` : `movie-${item.contentId}`;
        const match = await cache.match(key);
        results[item.id] = !!match;
      }
      setOfflineCached(results);
    };
    checkCache();
  }, [downloadItems.length]);

  const handleSignOut = () => {
    localStorage.removeItem("appUser");
    localStorage.removeItem("appAccessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("ott_active_profile");
    setLocation("/");
    window.location.reload();
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) return;
    setEditSaving(true);
    try {
      await updateAppProfile({ name: editName, email: editEmail, phone: editPhone });
      refetchProfile();
      setToast("Profile updated successfully");
      window.dispatchEvent(new Event("user-updated"));
    } catch (e: any) {
      setToast("Failed to update profile");
    } finally {
      setEditSaving(false);
    }
  };

  const handleAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    try {
      const { avatarUrl } = await uploadProfileAvatar(file);
      await updateAppProfile({ avatar: avatarUrl });
      refetchProfile();
      setToast("Profile photo updated");
      window.dispatchEvent(new Event("user-updated"));
    } catch {
      setToast("Failed to upload photo");
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  const handleChangePassword = async () => {
    setPasswordError("");
    if (!currentPassword || !newPassword || !confirmPassword) return setPasswordError("All fields are required.");
    if (newPassword.length < 6) return setPasswordError("New password must be at least 6 characters.");
    if (newPassword !== confirmPassword) return setPasswordError("New passwords do not match.");
    setPasswordSaving(true);
    try {
      await updatePassword({ currentPassword, newPassword });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
      setToast("Password changed successfully");
    } catch (e: any) {
      setPasswordError(e.message || "Failed to change password.");
    } finally {
      setPasswordSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      localStorage.removeItem("appUser");
      localStorage.removeItem("appAccessToken");
      setLocation("/");
    } catch {
      setDeleting(false); setDeleteConfirm(false);
    }
  };

  const handleRemoveWishlist = async (item: any) => {
    try {
      await toggleWishlistMutation.mutateAsync({ contentId: item.id, contentType: item.type });
      setToast("Removed from wishlist");
      refetchWishlist();
    } catch { setToast("Failed to remove from wishlist"); }
  };

  const handleRemoveDownload = async (item: any) => {
    try {
      await removeDownloadMutation.mutateAsync({ id: item.id, contentId: item.contentId, episodeId: item.episodeId || undefined });
      await removeOfflineVideo(item.contentId, item.episodeId || undefined);
      setToast("Download removed");
      refetchDownloads();
    } catch { setToast("Failed to remove download"); }
  };

  const handlePlayDownload = async (item: any) => {
    const blobUrl = await getOfflineVideoUrl(item.contentId, item.episodeId || undefined);
    if (blobUrl) sessionStorage.setItem(`offline_url_${item.contentId}_${item.episodeId || ''}`, blobUrl);
    handlePlayItem(item);
  };

  const handlePlayItem = (item: any) => {
    const navId = item.contentId || item.id;
    const isDrama = item.type === "drama" || item.contentType === "drama";
    const isShow = item.type === "show" || item.type === "series" || item.contentType === "series";
    if (isDrama) setLocation(`/drama/${navId}/episode/1`);
    else if (isShow) setLocation(`/show/${navId}`);
    else setLocation(`/movie/${navId}`);
  };

  if (!user) {
    const hasToken = typeof window !== "undefined" && !!localStorage.getItem("appAccessToken");
    if (hasToken) return <div className="min-h-screen bg-background flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>;
    return (
      <div className="dark min-h-screen bg-background text-foreground flex flex-col items-center justify-center gap-6 p-6 font-sans">
        <div className="text-center">
          <h2 className="text-foreground font-black text-xl mb-2">You're not signed in</h2>
          <div className="flex items-center gap-3 justify-center mt-6">
            <Link href="/" className="px-5 py-2.5 bg-muted border border-border text-foreground font-bold rounded-xl text-sm transition-all">Back Home</Link>
            <Link href="/login" className="px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all shadow-lg shadow-primary/30">Sign In</Link>
          </div>
        </div>
      </div>
    );
  }

  if (!activeProfile) {
    return <ProfileSelectScreen mainUserName={user.name} profileLimitCount={user.profileLimitCount || 1} userId={user.id || user._id || ""} onSelect={(profile) => { setActiveProfile(profile); window.dispatchEvent(new Event('profile-changed')); }} />;
  }

  const isSubscribed = user.subscriptionStatus === "active" && user.subscriptionPlan !== "free";

  const TABS: { id: ProfileTab; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "overview", label: "Overview", icon: <User className="w-4 h-4" /> },
    { id: "watchlist", label: "Wishlist", icon: <Bookmark className="w-4 h-4" />, count: wishlistItems.length },
    { id: "downloads", label: "Downloads", icon: <Download className="w-4 h-4" />, count: downloadItems.length },
    { id: "settings", label: "Edit Profile", icon: <Settings className="w-4 h-4" /> },
    { id: "security", label: "Security", icon: <Shield className="w-4 h-4" /> },
    { id: "feedback", label: "Rate Us", icon: <Star className="w-4 h-4" /> },
  ];

  return (
    <div className="dark min-h-screen bg-background text-foreground font-sans selection:bg-primary/30 pb-20 lg:pb-0">
      
      {/* ── Top bar ── */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-2xl border-b border-border/40">
        <div className="w-full mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-muted/80 transition-colors group">
              <ArrowLeft className="w-4 h-4 text-foreground group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <div className="flex items-center gap-2">
              {getLogoUrl() ? (
                <img src={getLogoUrl()} alt={settings.platformName} className="h-7 w-auto object-contain" />
              ) : (
                <h1 className="text-foreground font-black text-lg tracking-tight">{settings.platformName || "StreamIT"}</h1>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => { localStorage.removeItem("ott_active_profile"); setActiveProfile(null); }} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all">
              <UserCircle2 className="w-4 h-4" /> <span className="hidden sm:inline">Switch Profile</span>
            </button>
            <button onClick={handleSignOut} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-red-500/10 hover:text-red-500 transition-all">
              <LogOut className="w-4 h-4" /> <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Layout ── */}
      <main className="w-full mx-auto px-4 sm:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left Column */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Profile Card */}
            <div className="relative rounded-3xl overflow-hidden shadow-xl shadow-primary/5 border border-border/40 bg-card">
              <div className="p-6 flex flex-col items-center text-center">
                <div className="relative mb-4">
                  <AvatarCircle name={user.name} avatarUrl={user.avatar} size="xl" />
                  <button onClick={() => avatarInputRef.current?.click()} disabled={avatarUploading} className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white border-4 border-card hover:bg-primary/90 transition-all shadow-lg">
                    {avatarUploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
                  </button>
                  <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
                </div>
                <h2 className="text-xl font-black tracking-tight">{user.name}</h2>
                <p className="text-muted-foreground text-sm font-medium mt-0.5">{user.email || "Member"}</p>
                
                <div className="flex flex-wrap items-center justify-center gap-2 mt-4">
                  {isSubscribed ? (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/20 text-amber-500 rounded-lg text-[11px] font-black uppercase tracking-wider">
                      <Crown className="w-3.5 h-3.5" /> {user.subscriptionPlan} VIP
                    </span>
                  ) : (
                    <span className="flex items-center gap-1.5 px-3 py-1 bg-muted border border-border text-muted-foreground rounded-lg text-[11px] font-black uppercase tracking-wider">
                      Free Member
                    </span>
                  )}
                  <span className="flex items-center gap-1.5 px-3 py-1 bg-primary/10 border border-primary/20 text-primary rounded-lg text-[11px] font-black uppercase tracking-wider">
                    {activeProfile.name}
                  </span>
                </div>

                {/* Quick Action Buttons */}
                <div className="grid grid-cols-2 gap-2 mt-6 w-full">
                  <Link href="/wallet" className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 text-xs font-bold transition-colors">
                    <Wallet className="w-4 h-4" /> Wallet
                  </Link>
                  <Link href="/membership" className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 text-xs font-bold transition-colors">
                    <Crown className="w-4 h-4" /> VIP Plans
                  </Link>
                </div>
              </div>
            </div>

            {/* Navigation Tabs (Vertical on Desktop) */}
            <div className="bg-card/50 border border-border/40 rounded-3xl p-2 hidden lg:block">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 mb-1 last:mb-0 ${
                    activeTab === t.id
                      ? "bg-background text-foreground shadow-sm border border-border/50"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${activeTab === t.id ? "bg-primary/10 text-primary" : "bg-transparent"}`}>
                      {t.icon}
                    </div>
                    <span className="font-bold text-sm">{t.label}</span>
                  </div>
                  {t.count ? (
                    <span className={`min-w-[20px] h-[20px] flex items-center justify-center text-[10px] font-black rounded-full px-1.5 ${activeTab === t.id ? "bg-primary text-white" : "bg-muted-foreground/20 text-muted-foreground"}`}>
                      {t.count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            {/* Navigation Tabs (Horizontal Scroll on Mobile) */}
            <div className="lg:hidden flex items-center gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap transition-all ${
                    activeTab === t.id ? "bg-primary text-white shadow-md shadow-primary/20" : "bg-card border border-border/40 text-muted-foreground"
                  }`}
                >
                  {t.icon} <span className="text-xs font-bold">{t.label}</span>
                </button>
              ))}
            </div>

          </div>

          {/* Right Column (Content Area) */}
          <div className="lg:col-span-8">
            <div className="bg-card/30 border border-border/30 rounded-3xl p-6 md:p-8 min-h-[600px]">

              {/* OVERVIEW TAB */}
              {activeTab === "overview" && (
                <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between border-b border-border/40 pb-4">
                    <h2 className="text-xl font-black text-foreground">Welcome back, {user.name.split(" ")[0]}!</h2>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { icon: <Film className="text-rose-500" />, label: "History", value: continueWatching.length },
                      { icon: <Bookmark className="text-violet-500" />, label: "Wishlist", value: wishlistItems.length },
                      { icon: <Download className="text-emerald-500" />, label: "Downloads", value: downloadItems.length },
                      { icon: <Crown className="text-amber-500" />, label: "Plan", value: isSubscribed ? "VIP" : "Free" },
                    ].map((stat, i) => (
                      <div key={i} className="bg-card/50 border border-border/40 rounded-2xl p-4 flex flex-col items-center text-center">
                        <div className="w-10 h-10 rounded-full bg-background border border-border/50 flex items-center justify-center mb-3">
                          {stat.icon}
                        </div>
                        <span className="text-2xl font-black text-foreground leading-none mb-1">{stat.value}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Continue Watching */}
                  <div>
                    <h3 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" /> Continue Watching
                    </h3>
                    {continueWatching.length === 0 ? (
                      <div className="text-center py-10 bg-card/20 rounded-2xl border border-border/30">
                        <p className="text-muted-foreground text-sm">Nothing to show yet.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        {continueWatching.slice(0, 6).map((item: any) => (
                          <div key={item.id || item._id} onClick={() => handlePlayItem(item)} className="group cursor-pointer">
                            <div className="relative rounded-xl overflow-hidden bg-muted mb-2 aspect-video">
                              <img src={getImageUrl(item.thumbnail || item.poster || "")} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                                <div className="h-full bg-primary" style={{ width: `${Math.round(item.progressPercent || item.progress || 25)}%` }} />
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity">
                                <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
                                  <Play className="w-4 h-4 fill-white ml-0.5" />
                                </div>
                              </div>
                            </div>
                            <p className="text-foreground text-sm font-bold truncate">{item.title}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* WISHLIST TAB */}
              {activeTab === "watchlist" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
                    <h2 className="text-xl font-black text-foreground">My Wishlist</h2>
                    <Link href="/browse" className="text-primary text-sm font-bold hover:underline">Browse</Link>
                  </div>

                  {wishlistLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : wishlistItems.length === 0 ? (
                    <div className="text-center py-20 bg-card/20 rounded-2xl border border-border/30">
                      <Bookmark className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-foreground font-bold">Your wishlist is empty</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {wishlistItems.map((item: any) => (
                        <div key={item.id} onClick={() => handlePlayItem(item)} className="group relative rounded-xl overflow-hidden aspect-[2/3] cursor-pointer">
                          <img src={getImageUrl(item.poster || item.backdrop || "")} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <p className="text-white font-bold text-xs line-clamp-2">{item.title}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveWishlist(item); }} className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* DOWNLOADS TAB */}
              {activeTab === "downloads" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between border-b border-border/40 pb-4 mb-6">
                    <h2 className="text-xl font-black text-foreground">My Downloads</h2>
                  </div>

                  {downloadsLoading ? (
                    <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
                  ) : downloadItems.length === 0 ? (
                    <div className="text-center py-20 bg-card/20 rounded-2xl border border-border/30">
                      <Download className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-foreground font-bold">No downloads yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {downloadItems.map((item: any) => (
                        <div key={item.id} onClick={() => handlePlayDownload(item)} className="group relative rounded-xl overflow-hidden aspect-[2/3] cursor-pointer">
                          <img src={getImageUrl(item.poster || item.thumbnail || "")} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          {offlineCached[item.id] && (
                            <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-600/90 text-[9px] font-bold text-white z-20">
                              <Wifi className="w-2.5 h-2.5" /> Offline
                            </div>
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            {item.parentTitle && <p className="text-white/70 text-[10px] mb-0.5">{item.parentTitle}</p>}
                            <p className="text-white font-bold text-xs line-clamp-2">{item.title}</p>
                          </div>
                          <button onClick={(e) => { e.stopPropagation(); handleRemoveDownload(item); }} className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/60 hover:bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all z-20">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* SETTINGS TAB */}
              {activeTab === "settings" && (
                <div className="max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h2 className="text-xl font-black text-foreground mb-6">Edit Profile</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">Display Name</label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-background border border-border/50 focus:border-primary text-foreground pl-10 pr-4 py-3 rounded-xl text-sm font-semibold focus:outline-none transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">Email Address</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} className="w-full bg-background border border-border/50 focus:border-primary text-foreground pl-10 pr-4 py-3 rounded-xl text-sm font-semibold focus:outline-none transition-all" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">Mobile Number</label>
                      <div className="relative">
                        <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <input type="tel" value={editPhone} onChange={e => setEditPhone(e.target.value)} className="w-full bg-background border border-border/50 focus:border-primary text-foreground pl-10 pr-4 py-3 rounded-xl text-sm font-semibold focus:outline-none transition-all" />
                      </div>
                    </div>
                  </div>
                  <button onClick={handleSaveProfile} disabled={editSaving || !editName.trim()} className="w-full mt-6 py-3 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
                    {editSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {editSaving ? "Saving..." : "Save Changes"}
                  </button>
                </div>
              )}

              {/* SECURITY TAB */}
              {activeTab === "security" && (
                <div className="max-w-md animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
                  <div>
                    <h2 className="text-xl font-black text-foreground mb-6">Security Settings</h2>
                    <div className="space-y-4">
                      {passwordError && <div className="p-3 bg-primary/10 text-primary text-xs font-semibold rounded-xl border border-primary/20">{passwordError}</div>}
                      {[
                        { label: "Current Password", value: currentPassword, setter: setCurrentPassword, show: showCurrent, toggleShow: () => setShowCurrent(!showCurrent) },
                        { label: "New Password", value: newPassword, setter: setNewPassword, show: showNew, toggleShow: () => setShowNew(!showNew) },
                        { label: "Confirm New Password", value: confirmPassword, setter: setConfirmPassword, show: showNew, toggleShow: () => setShowNew(!showNew) },
                      ].map((field) => (
                        <div key={field.label}>
                          <label className="block text-xs font-black text-muted-foreground uppercase tracking-wider mb-2">{field.label}</label>
                          <div className="relative">
                            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input type={field.show ? "text" : "password"} value={field.value} onChange={(e) => field.setter(e.target.value)} className="w-full bg-background border border-border/50 focus:border-primary text-foreground pl-10 pr-10 py-3 rounded-xl text-sm font-semibold focus:outline-none transition-all" />
                            <button type="button" onClick={field.toggleShow} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                              {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                            </button>
                          </div>
                        </div>
                      ))}
                      <button onClick={handleChangePassword} disabled={passwordSaving} className="w-full py-3 bg-primary text-white font-extrabold rounded-xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-primary/20 disabled:opacity-50">
                        {passwordSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />} Update Password
                      </button>
                    </div>
                  </div>

                  {/* Danger Zone */}
                  <div className="border border-primary/20 rounded-2xl p-6 bg-primary/5">
                    <h3 className="text-primary font-black text-sm flex items-center gap-2 mb-2"><AlertTriangle className="w-4 h-4" /> Danger Zone</h3>
                    <p className="text-muted-foreground text-xs mb-5">Permanently delete your account. This action cannot be undone.</p>
                    {!deleteConfirm ? (
                      <button onClick={() => setDeleteConfirm(true)} className="px-5 py-2.5 bg-primary/10 text-primary hover:bg-primary/20 rounded-xl text-xs font-bold transition-all flex items-center gap-2"><Trash2 className="w-3.5 h-3.5" /> Delete Account</button>
                    ) : (
                      <div className="space-y-3">
                        <p className="text-primary text-xs font-bold">Are you absolutely sure?</p>
                        <div className="flex gap-3">
                          <button onClick={handleDeleteAccount} disabled={deleting} className="px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold transition-all">{deleting ? "Deleting..." : "Yes, Delete Forever"}</button>
                          <button onClick={() => setDeleteConfirm(false)} className="px-5 py-2.5 bg-muted text-foreground rounded-xl text-xs font-bold transition-all">Cancel</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* FEEDBACK TAB */}
              {activeTab === "feedback" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="border-b border-border/40 pb-4 mb-6">
                    <h3 className="text-xl font-black text-foreground flex items-center gap-2">
                      <Star className="w-5 h-5 text-primary fill-primary animate-pulse" /> Rate Us
                    </h3>
                  </div>
                  <WebsiteReviews user={user} onSignInRequired={() => setLocation("/login")} />
                </div>
              )}

            </div>
          </div>
        </div>
      </main>
      
      <PublicFooter />
      {toast && <ToastAlert msg={toast} onClose={() => setToast("")} />}
    </div>
  );
}
