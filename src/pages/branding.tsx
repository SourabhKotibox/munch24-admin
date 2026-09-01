
import { useState } from "react";
import { useLocation } from "wouter";
import { useSettings } from "@/contexts/SettingsContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Upload, Image as ImageIcon, Save, RefreshCw, Palette, ArrowLeft, Sun, Moon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Branding() {
  const [, setLocation] = useLocation();
  const { settings, updateSettings } = useSettings();
  const [platformName, setPlatformName] = useState(settings.platformName);
  const [loginTitle, setLoginTitle] = useState(settings.loginTitle);
  const [loginSubtitle, setLoginSubtitle] = useState(settings.loginSubtitle);
  const [loginButtonText, setLoginButtonText] = useState(settings.loginButtonText);
  const [lightLogoUrl, setLightLogoUrl] = useState(settings.lightLogoUrl);
  const [darkLogoUrl, setDarkLogoUrl] = useState(settings.darkLogoUrl);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      updateSettings({
        platformName,
        loginTitle,
        loginSubtitle,
        loginButtonText,
        lightLogoUrl,
        darkLogoUrl,
        logoUrl: lightLogoUrl || darkLogoUrl
      });
      toast({
        title: "Settings Saved!",
        description: "Your settings have been updated successfully.",
        className: "rounded-2xl border-border/50",
      });
    } catch (error) {
      toast({
        title: "Save Failed",
        description: "Something went wrong while saving your settings.",
        variant: "destructive",
        className: "rounded-2xl border-destructive/50",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = (forType: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingFor(forType);

    try {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          const dataUrl = event.target.result as string;
          if (forType === 'light') {
            setLightLogoUrl(dataUrl);
          } else {
            setDarkLogoUrl(dataUrl);
          }
          toast({
            title: "File Uploaded",
            description: `Your ${forType} logo has been uploaded successfully.`,
            className: "rounded-2xl border-border/50",
          });
        }
        setUploadingFor(null);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: "Failed to upload the image. Please try again.",
        variant: "destructive",
        className: "rounded-2xl border-destructive/50",
      });
      setUploadingFor(null);
    }
  };

  const handleReset = () => {
    setPlatformName("NETFLIX");
    setLoginTitle("Welcome Back");
    setLoginSubtitle("Admin Console");
    setLoginButtonText("Sign In");
    setLightLogoUrl("");
    setDarkLogoUrl("");
    updateSettings({
      logoUrl: "",
      platformName: "NETFLIX",
      loginTitle: "Welcome Back",
      loginSubtitle: "Admin Console",
      loginButtonText: "Sign In",
      darkLogoUrl: "",
      lightLogoUrl: "",
    });
    toast({
      title: "Settings Reset",
      description: "All settings have been reset to default.",
      className: "rounded-2xl border-border/50",
    });
  };

  return (
    <div className="space-y-8">
      <div>
        <Button
          variant="ghost"
          onClick={() => setLocation("/settings")}
          className="h-12 rounded-2xl mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Settings
        </Button>
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-pink-500 bg-clip-text text-transparent">
          Branding
        </h1>
        <p className="text-muted-foreground mt-2 text-lg">Customize your platform branding and login experience</p>
      </div>

      <Card className="border-border/50 bg-gradient-to-br from-card/80 to-card/50 backdrop-blur-xl hover:shadow-xl transition-all duration-300 rounded-3xl overflow-hidden">
        <CardHeader className="pb-6">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Palette className="h-6 w-6 text-primary" />
            Branding Settings
          </CardTitle>
          <CardDescription className="text-base mt-1">
            Update your platform name and customize the admin panel appearance
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 px-8 pb-8">
          {/* Platform Name */}
          <div className="space-y-3">
            <Label htmlFor="platformName" className="text-sm font-semibold">Platform Name</Label>
            <Input
              id="platformName"
              value={platformName}
              onChange={(e) => setPlatformName(e.target.value)}
              placeholder="Enter your platform name"
              className="h-12 bg-background/50 border-border/50 focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl transition-all duration-300"
            />
          </div>

          <div className="border-t border-border/30" />

          {/* Login Page Customization */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Login Page Customization</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="loginTitle">Login Title</Label>
                <Input
                  id="loginTitle"
                  value={loginTitle}
                  onChange={(e) => setLoginTitle(e.target.value)}
                  placeholder="Welcome Back"
                  className="h-12 bg-background/50 border-border/50 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loginSubtitle">Login Subtitle</Label>
                <Input
                  id="loginSubtitle"
                  value={loginSubtitle}
                  onChange={(e) => setLoginSubtitle(e.target.value)}
                  placeholder="Admin Console"
                  className="h-12 bg-background/50 border-border/50 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="loginButtonText">Login Button Text</Label>
                <Input
                  id="loginButtonText"
                  value={loginButtonText}
                  onChange={(e) => setLoginButtonText(e.target.value)}
                  placeholder="Sign In"
                  className="h-12 bg-background/50 border-border/50 rounded-2xl"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-border/30" />

          {/* Logos */}
          <div className="space-y-4">
            <Label className="text-sm font-semibold">Logos</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Light Mode Logo */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Sun className="h-4 w-4" /> Light Mode Logo
                </Label>
                <div className="flex flex-col gap-4">
                  <div className="h-32 w-40 rounded-2xl bg-gradient-to-br from-background/70 to-muted/50 border-2 border-dashed border-border/50 flex items-center justify-center overflow-hidden">
                    {lightLogoUrl ? (
                      <img
                        src={lightLogoUrl}
                        alt="Light Logo Preview"
                        className="h-full w-full object-contain p-4"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImageIcon className="h-10 w-10 opacity-50" />
                        <span className="text-sm font-medium">Preview</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="lightLogoUpload"
                      onChange={handleFileUpload('light')}
                    />
                    <Button
                      asChild
                      variant="secondary"
                      disabled={uploadingFor === 'light'}
                      className="w-full h-12"
                    >
                      <label htmlFor="lightLogoUpload" className="cursor-pointer flex items-center justify-center gap-2">
                        <Upload className="h-4 w-4" />
                        {uploadingFor === 'light' ? "Uploading..." : "Upload Light Logo"}
                      </label>
                    </Button>
                    <Input
                      value={lightLogoUrl}
                      onChange={(e) => setLightLogoUrl(e.target.value)}
                      placeholder="Or enter URL"
                      className="h-12 bg-background/50 border-border/50 rounded-2xl"
                    />
                  </div>
                </div>
              </div>

              {/* Dark Mode Logo */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Moon className="h-4 w-4" /> Dark Mode Logo
                </Label>
                <div className="flex flex-col gap-4">
                  <div className="h-32 w-40 rounded-2xl bg-gradient-to-br from-muted/70 to-background/50 border-2 border-dashed border-border/50 flex items-center justify-center overflow-hidden">
                    {darkLogoUrl ? (
                      <img
                        src={darkLogoUrl}
                        alt="Dark Logo Preview"
                        className="h-full w-full object-contain p-4"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <ImageIcon className="h-10 w-10 opacity-50" />
                        <span className="text-sm font-medium">Preview</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      id="darkLogoUpload"
                      onChange={handleFileUpload('dark')}
                    />
                    <Button
                      asChild
                      variant="secondary"
                      disabled={uploadingFor === 'dark'}
                      className="w-full h-12"
                    >
                      <label htmlFor="darkLogoUpload" className="cursor-pointer flex items-center justify-center gap-2">
                        <Upload className="h-4 w-4" />
                        {uploadingFor === 'dark' ? "Uploading..." : "Upload Dark Logo"}
                      </label>
                    </Button>
                    <Input
                      value={darkLogoUrl}
                      onChange={(e) => setDarkLogoUrl(e.target.value)}
                      placeholder="Or enter URL"
                      className="h-12 bg-background/50 border-border/50 rounded-2xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button
              variant="secondary"
              onClick={handleReset}
              className="h-12 rounded-2xl"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button
              onClick={handleSaveSettings}
              disabled={isSaving || !!uploadingFor}
              className="flex-1 h-12 bg-gradient-to-r from-primary to-pink-500 hover:from-primary/90 hover:to-pink-500/90 shadow-lg shadow-primary/25 rounded-2xl transition-all duration-300"
            >
              {isSaving ? (
                <><RefreshCw className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
              ) : (
                <><Save className="h-4 w-4 mr-2" /> Save Settings</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
