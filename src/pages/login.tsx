
import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin, setupAdmin } from "../lib/api-client";
import { Film, Lock, Mail, Loader2, KeyRound, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from "@/contexts/SettingsContext";
import { useTheme } from "next-themes";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "reset">("login");
  const [resetForm, setResetForm] = useState({ setupKey: "", email: "", password: "", confirmPassword: "" });
  const [resetting, setResetting] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { settings } = useSettings();
  const { resolvedTheme } = useTheme();
  const loginMutation = useLogin();

  const getLogoUrl = () => {
    if (resolvedTheme === "dark" && settings.darkLogoUrl) return settings.darkLogoUrl;
    if (resolvedTheme === "light" && settings.lightLogoUrl) return settings.lightLogoUrl;
    return settings.logoUrl;
  };

  const hasAppName = !!settings.platformName;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loginMutation.mutate({ email, password }, {
      onSuccess: () => setLocation("/dashboard"),
      onError: (err: any) => {
        toast({
          title: "Login failed",
          description: err?.message || "Invalid credentials. Please try again.",
          variant: "destructive",
        });
      }
    });
  };

  const handleResetAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (resetForm.password !== resetForm.confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    if (resetForm.password.length < 6) {
      toast({ title: "Password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setResetting(true);
    try {
      await setupAdmin({
        setupKey: resetForm.setupKey,
        email: resetForm.email,
        password: resetForm.password,
        name: "Super Admin",
      });
      toast({ title: "Admin account reset successfully! You can now log in." });
      setEmail(resetForm.email);
      setPassword(resetForm.password);
      setMode("login");
    } catch (err: any) {
      toast({ title: err?.message || "Reset failed. Check your setup key.", variant: "destructive" });
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="min-h-screen bg-card flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-red-600/30 via-red-500/20 to-transparent blur-[120px] animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute -bottom-[30%] -left-[10%] w-[70%] h-[70%] rounded-full bg-gradient-to-br from-red-500/20 via-red-600/10 to-transparent blur-[120px] animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }} />
      </div>

      <div className="z-10 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="inline-flex items-center justify-center mb-6 bg-muted border border-border rounded-3xl shadow-2xl px-6 py-3">
            {getLogoUrl() ? (
              <img
                src={getLogoUrl()}
                alt="Logo"
                className="max-h-32 max-w-xs w-auto h-auto object-contain"
              />
            ) : (
              <Film className="h-12 w-12 text-primary" />
            )}
          </div>

          <p className="text-muted-foreground mt-2 text-lg">{settings.loginSubtitle}</p>
        </div>

        <Card className="border-border shadow-2xl bg-muted/80 rounded-3xl transition-all duration-500 hover:shadow-3xl hover:shadow-red-500/10">
          {mode === "login" ? (
            <>
              <CardHeader className="space-y-2 text-center pb-8 pt-8">
                <CardTitle className="text-3xl font-bold text-foreground">{settings.loginTitle}</CardTitle>
                <CardDescription className="text-base text-muted-foreground">
                  Sign in to access your {settings.platformName || "admin"} panel
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8">
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-medium ml-1 text-foreground">Email Address</Label>
                    <div className="relative group">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/65 group-focus-within:text-primary transition-colors duration-300" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-12 h-14 bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary focus:ring-2 focus:ring-red-500/20 rounded-2xl transition-all duration-300"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="password" className="text-sm font-medium ml-1 text-foreground">Password</Label>
                    <div className="relative group">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-foreground/65 group-focus-within:text-primary transition-colors duration-300" />
                      <Input
                        id="password"
                        type="password"
                        className="pl-12 h-14 bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary focus:ring-2 focus:ring-red-500/20 rounded-2xl transition-all duration-300"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full mt-2 h-14 text-base font-semibold bg-gradient-to-r from-red-600 via-red-700 to-red-600 hover:from-red-600/90 hover:via-red-700/90 hover:to-red-600/90 shadow-lg shadow-red-500/25 hover:shadow-xl hover:shadow-red-500/35 transition-all duration-300 rounded-2xl"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? (
                      <><Loader2 className="mr-3 h-5 w-5 animate-spin" /> Authenticating...</>
                    ) : settings.loginButtonText}
                  </Button>
                </form>
                <div className="mt-6 text-center">
                  <button
                    type="button"
                    onClick={() => setMode("reset")}
                    className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1.5 mx-auto"
                  >
                    <KeyRound className="h-3.5 w-3.5" />
                    Can't login? Reset admin account
                  </button>
                </div>
              </CardContent>
            </>
          ) : (
            <>
              <CardHeader className="space-y-2 text-center pb-6 pt-8">
                <CardTitle className="text-2xl font-bold text-foreground">Reset Admin Account</CardTitle>
                <CardDescription className="text-sm text-muted-foreground">
                  Use the setup key from your <code className="bg-muted px-1 rounded text-xs">.env</code> file (<code className="bg-muted px-1 rounded text-xs">ADMIN_SETUP_KEY</code>)
                </CardDescription>
              </CardHeader>
              <CardContent className="px-8">
                <form onSubmit={handleResetAdmin} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Setup Key</Label>
                    <Input
                      type="password"
                      placeholder="ADMIN_SETUP_KEY from .env"
                      className="h-12 bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary rounded-xl"
                      value={resetForm.setupKey}
                      onChange={(e) => setResetForm({ ...resetForm, setupKey: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">New Admin Email</Label>
                    <Input
                      type="email"
                      placeholder="admin@example.com"
                      className="h-12 bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary rounded-xl"
                      value={resetForm.email}
                      onChange={(e) => setResetForm({ ...resetForm, email: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">New Password</Label>
                    <Input
                      type="password"
                      placeholder="Minimum 6 characters"
                      className="h-12 bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary rounded-xl"
                      value={resetForm.password}
                      onChange={(e) => setResetForm({ ...resetForm, password: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-foreground">Confirm Password</Label>
                    <Input
                      type="password"
                      placeholder="Repeat new password"
                      className="h-12 bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary rounded-xl"
                      value={resetForm.confirmPassword}
                      onChange={(e) => setResetForm({ ...resetForm, confirmPassword: e.target.value })}
                      required
                    />
                  </div>
                  <Button
                    type="submit"
                    disabled={resetting}
                    className="w-full h-12 font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-red-600/90 hover:to-red-700/90 rounded-xl"
                  >
                    {resetting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Resetting...</> : "Reset Admin Account"}
                  </Button>
                </form>
                <div className="mt-5 text-center">
                  <button
                    type="button"
                    onClick={() => setMode("login")}
                    className="text-sm text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1.5 mx-auto"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                    Back to login
                  </button>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
