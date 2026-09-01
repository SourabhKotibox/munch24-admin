import { useState, useRef, useEffect } from "react";
import {
  User, KeyRound, X, Loader2, Camera, Shield, Mail, Eye, EyeOff,
  CalendarDays, Crown, Activity, Film, Users, Star, Check,
  Clock, Lock,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  useUpdateProfile, useUpdatePassword, getImageUrl, useGetMe,
  uploadAdminAvatar, useGetDashboardStats,
} from "@/lib/api-client";

type Tab = "personal" | "password";

function fmtDate(d?: string) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

function roleBadgeColor(role?: string) {
  if (!role) return "bg-zinc-700/40 text-foreground/70 border-zinc-700/40";
  const r = role.toLowerCase();
  if (r === "superadmin" || r === "super_admin") return "bg-amber-500/10 text-amber-400 border-amber-500/20";
  if (r === "admin") return "bg-primary/10 text-primary border-primary/20";
  return "bg-zinc-700/40 text-foreground/70 border-zinc-700/40";
}

export default function ProfilePage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("personal");

  const { data: user, isLoading } = useGetMe();
  const { data: stats } = useGetDashboardStats();

  const [form, setForm] = useState({ name: "", email: "", avatar: "" });
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [passwords, setPasswords] = useState({
    currentPassword: "", newPassword: "", confirmPassword: "",
  });
  const [showPw, setShowPw] = useState({ current: false, new_: false, confirm: false });

  const updateProfileMutation = useUpdateProfile();
  const updatePasswordMutation = useUpdatePassword();

  useEffect(() => {
    if (user) {
      setForm({ name: user.name || "", email: user.email || "", avatar: user.avatar || "" });
      // Only set preview for a real saved avatar path (not empty string)
      const url = user.avatar ? getImageUrl(user.avatar) : null;
      setPhotoPreview(url && url.length > 10 ? url : null);
    }
  }, [user]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    const reader = new FileReader();
    reader.onload = () => setPhotoPreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    try {
      const updateData: { name?: string; email?: string; avatar?: string } = {
        name: form.name, email: form.email,
      };
      if (photoFile) {
        setUploadingPhoto(true);
        const { avatarUrl } = await uploadAdminAvatar(photoFile);
        updateData.avatar = avatarUrl;
        // Show the final saved URL in the preview (replaces local blob URL)
        setPhotoPreview(avatarUrl);
        setPhotoFile(null);
        setUploadingPhoto(false);
      }
      await updateProfileMutation.mutateAsync(updateData);
      const userStr = localStorage.getItem("appUser");
      if (userStr) {
        localStorage.setItem("user", JSON.stringify({ ...JSON.parse(userStr), ...updateData }));
      }
      window.dispatchEvent(new Event("user-updated"));
      toast({ title: "Profile updated successfully" });
    } catch (error: any) {
      setUploadingPhoto(false);
      toast({ title: error?.message || "Failed to update profile", variant: "destructive" });
    }
  };

  const handleChangePassword = async () => {
    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      toast({ title: "Please fill all fields", variant: "destructive" }); return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      toast({ title: "New passwords don't match", variant: "destructive" }); return;
    }
    if (passwords.newPassword.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" }); return;
    }
    try {
      await updatePasswordMutation.mutateAsync({
        currentPassword: passwords.currentPassword, newPassword: passwords.newPassword,
      });
      toast({ title: "Password changed successfully" });
      setPasswords({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error: any) {
      toast({ title: error?.message || "Failed to change password", variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary/40" />
      </div>
    );
  }

  const statCards = [
    { label: "Total Users", value: stats?.totalUsers ?? "—", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Total Content", value: stats?.restContent ?? "—", icon: Film, color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
    { label: "Active Subscribers", value: stats?.totalSubscribers ?? "—", icon: Crown, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { label: "Total Reviews", value: stats?.totalReviews ?? "—", icon: Star, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ── Profile hero card ───────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        {/* Gradient accent */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(229,9,20,0.08),transparent_60%)] pointer-events-none" />

        <div className="relative p-6 flex flex-col sm:flex-row items-start sm:items-center gap-5">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden border-2 border-border bg-muted cursor-pointer group"
              onClick={() => fileInputRef.current?.click()}
            >
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={() => { setPhotoPreview(null); setPhotoFile(null); }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <User className="w-10 h-10 text-primary/60" />
                </div>
              )}
              <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl">
                <Camera className="w-6 h-6 text-foreground" />
              </div>
            </div>
            {uploadingPhoto && (
              <div className="absolute inset-0 bg-black/60 rounded-2xl flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-foreground animate-spin" />
              </div>
            )}
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-foreground font-black text-2xl tracking-tight">
                {user?.name || "Admin"}
              </h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-lg border text-[11px] font-bold capitalize ${roleBadgeColor(user?.role)}`}>
                {user?.role || "Admin"}
              </span>
            </div>
            <p className="text-foreground/80 text-sm font-medium flex items-center gap-1.5">
              <Mail className="w-3.5 h-3.5" /> {user?.email || "—"}
            </p>
            <div className="flex flex-wrap items-center gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-xs text-foreground/80">
                <CalendarDays className="w-3.5 h-3.5" />
                Member since {fmtDate(user?.createdAt)}
              </span>
              {user?.lastLogin && (
                <span className="flex items-center gap-1.5 text-xs text-foreground/80">
                  <Clock className="w-3.5 h-3.5" />
                  Last login {fmtDate(user?.lastLogin)}
                </span>
              )}
              <span className="flex items-center gap-1.5 text-xs text-emerald-400">
                <Activity className="w-3.5 h-3.5" />
                Active
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats row ───────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className={`rounded-2xl border border-border p-4 bg-card ${s.bg} flex flex-col gap-2`}>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-widest text-foreground/80">{s.label}</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.bg}`}>
                <s.icon className={`w-4 h-4 ${s.color}`} />
              </div>
            </div>
            <p className={`text-2xl font-black ${s.color}`}>
              {typeof s.value === "number" ? s.value.toLocaleString() : s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Edit section ────────────────────────────────────────── */}
      <div className="flex flex-col lg:flex-row gap-5 items-start">
        {/* Sidebar tabs */}
        <div className="w-full lg:w-56 shrink-0 space-y-1.5">
          {[
            { id: "personal" as Tab, label: "Personal Info", icon: User },
            { id: "password" as Tab, label: "Change Password", icon: KeyRound },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all ${
                activeTab === id
                  ? "bg-primary/15 border border-primary/30 text-primary"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </button>
          ))}

          {/* Permissions card */}
          {user?.permissions && user.permissions.length > 0 && (
            <div className="mt-4 p-4 rounded-xl border border-border bg-card space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-foreground/65 flex items-center gap-1.5">
                <Shield className="w-3 h-3" /> Permissions
              </p>
              <div className="flex flex-wrap gap-1.5">
                {user.permissions.slice(0, 8).map((p: string) => (
                  <span key={p} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-muted border border-border text-foreground/70 capitalize">
                    {p.replace(/([A-Z])/g, ' $1').trim()}
                  </span>
                ))}
                {user.permissions.length > 8 && (
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-muted border border-border text-foreground/65">
                    +{user.permissions.length - 8} more
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Content panel */}
        <div className="flex-1 rounded-2xl border border-border bg-card p-6 w-full">
          {activeTab === "personal" ? (
            <>
              <h2 className="text-foreground font-black text-base mb-5 flex items-center gap-2">
                <User className="h-4 w-4 text-primary" /> Personal Information
              </h2>

              <div className="flex flex-col lg:flex-row gap-6">
                {/* Form fields */}
                <div className="flex-1 space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-foreground/70 text-xs font-bold uppercase tracking-widest">
                      Display Name <span className="text-primary">*</span>
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        className="bg-background border-border text-foreground focus:border-primary h-11 pl-10"
                        placeholder="Your display name"
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-foreground/70 text-xs font-bold uppercase tracking-widest">
                      Email Address <span className="text-primary">*</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        className="bg-background border-border text-foreground focus:border-primary h-11 pl-10"
                        placeholder="admin@example.com"
                      />
                    </div>
                  </div>
                  {/* Read-only info */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {[
                      { label: "Role", value: user?.role || "—" },
                      { label: "Status", value: "Active" },
                      { label: "Member Since", value: fmtDate(user?.createdAt) },
                      { label: "Last Login", value: fmtDate(user?.lastLogin) },
                    ].map(({ label, value }) => (
                      <div key={label} className="p-3 rounded-xl bg-muted/40 border border-border">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
                        <p className="text-sm font-semibold text-foreground capitalize truncate">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Photo upload */}
                <div className="shrink-0 flex flex-col items-center gap-3">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="w-36 h-36 border-2 border-dashed border-border rounded-2xl flex items-center justify-center relative cursor-pointer hover:border-primary/50 transition-colors overflow-hidden bg-muted/20"
                  >
                    {photoPreview ? (
                      <>
                        <img
                          src={photoPreview}
                          alt=""
                          className="w-full h-full object-cover"
                          onError={() => { setPhotoPreview(null); setPhotoFile(null); }}
                        />
                        <button
                          onClick={(e) => { e.stopPropagation(); setPhotoPreview(null); setPhotoFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                          className="absolute top-1.5 right-1.5 h-5 w-5 bg-primary rounded-full flex items-center justify-center hover:bg-primary/90 transition-colors z-10"
                        >
                          <X className="h-3 w-3 text-foreground" />
                        </button>
                      </>
                    ) : (
                      <div className="text-center px-3">
                        <Camera className="h-8 w-8 text-muted-foreground/80 mx-auto mb-2" />
                        <span className="text-muted-foreground/80 text-xs font-semibold">Upload Photo</span>
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-muted-foreground/80 font-medium text-center">
                    JPG, PNG · Max 5MB
                  </p>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-border">
                <Button
                  onClick={handleSave}
                  disabled={updateProfileMutation.isPending || uploadingPhoto}
                  className="bg-primary hover:bg-primary/90 text-white px-8 h-11 font-bold rounded-xl"
                >
                  {(updateProfileMutation.isPending || uploadingPhoto) ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Saving…</>
                  ) : (
                    <><Check className="h-4 w-4 mr-2" />Save Changes</>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-foreground font-black text-base mb-5 flex items-center gap-2">
                <Lock className="h-4 w-4 text-primary" /> Change Password
              </h2>

              <div className="space-y-4 max-w-md">
                {[
                  { label: "Current Password", key: "currentPassword", show: showPw.current, toggle: () => setShowPw(p => ({ ...p, current: !p.current })) },
                  { label: "New Password", key: "newPassword", show: showPw.new_, toggle: () => setShowPw(p => ({ ...p, new_: !p.new_ })) },
                  { label: "Confirm New Password", key: "confirmPassword", show: showPw.confirm, toggle: () => setShowPw(p => ({ ...p, confirm: !p.confirm })) },
                ].map((field) => (
                  <div key={field.key} className="space-y-1.5">
                    <Label className="text-foreground/70 text-xs font-bold uppercase tracking-widest">{field.label}</Label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/80" />
                      <Input
                        type={field.show ? "text" : "password"}
                        value={passwords[field.key as keyof typeof passwords]}
                        onChange={(e) => setPasswords({ ...passwords, [field.key]: e.target.value })}
                        className="bg-background border-border text-foreground focus:border-primary h-11 pl-10 pr-10"
                        placeholder="••••••••"
                      />
                      <button
                        type="button"
                        onClick={field.toggle}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-foreground/65 hover:text-foreground transition-colors"
                      >
                        {field.show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}

                <div className="p-3.5 rounded-xl bg-muted/50 border border-border text-xs text-muted-foreground flex items-start gap-2 mt-2">
                  <Shield className="w-3.5 h-3.5 text-primary mt-0.5 flex-shrink-0" />
                  Use at least 6 characters with a mix of letters and numbers for a strong password.
                </div>
              </div>

              <div className="flex justify-end mt-6 pt-5 border-t border-border">
                <Button
                  onClick={handleChangePassword}
                  disabled={updatePasswordMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-white px-8 h-11 font-bold rounded-xl"
                >
                  {updatePasswordMutation.isPending ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Updating…</>
                  ) : (
                    <><Shield className="h-4 w-4 mr-2" />Update Password</>
                  )}
                </Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
