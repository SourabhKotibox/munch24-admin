import { useState, useEffect } from "react";
import { Globe, Smartphone, MonitorPlay, Save, Info, TrendingUp, Eye, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useUpdateSettings } from "@/lib/api-client";
import { useSettings } from "@/contexts/SettingsContext";

export default function GoogleAdsPage() {
  const { toast } = useToast();
  const { settings, refreshSettings } = useSettings();
  const updateSettingsMutation = useUpdateSettings();

  const [formData, setFormData] = useState({
    adNetworkEnabled: false,
    adMobPublisherId: "",
    adMobAppIdAndroid: "",
    adMobAppIdIos: "",
    adMobBannerAndroid: "",
    adMobBannerIos: "",
    adMobInterstitialAndroid: "",
    adMobInterstitialIos: "",
    vastPrerollUrl: "",
    vastMidrollUrl: "",
  });

  useEffect(() => {
    if (settings) {
      setFormData({
        adNetworkEnabled: settings.adNetworkEnabled || false,
        adMobPublisherId: settings.adMobPublisherId || "",
        adMobAppIdAndroid: settings.adMobAppIdAndroid || "",
        adMobAppIdIos: settings.adMobAppIdIos || "",
        adMobBannerAndroid: settings.adMobBannerAndroid || "",
        adMobBannerIos: settings.adMobBannerIos || "",
        adMobInterstitialAndroid: settings.adMobInterstitialAndroid || "",
        adMobInterstitialIos: settings.adMobInterstitialIos || "",
        vastPrerollUrl: settings.vastPrerollUrl || "",
        vastMidrollUrl: settings.vastMidrollUrl || "",
      });
    }
  }, [settings]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleToggle = (checked: boolean) => {
    setFormData({ ...formData, adNetworkEnabled: checked });
  };

  const handleSave = async () => {
    try {
      await updateSettingsMutation.mutateAsync(formData);
      await refreshSettings();
      toast({ title: "Ad Networks saved successfully!" });
    } catch (error: any) {
      toast({ title: "Failed to save settings", description: error.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 text-foreground bg-transparent">
      <div className="flex items-center justify-between bg-card border border-border rounded-xl p-4 px-6 mb-6">
        <div>
          <h2 className="text-xl font-bold text-foreground">Google Ads Settings</h2>
          <p className="text-foreground/70 text-sm">Configure AdSense & AdMob integration</p>
        </div>
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/20" disabled={updateSettingsMutation.isPending}>
          <Save className="mr-2 h-4 w-4" />
          {updateSettingsMutation.isPending ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="max-w-4xl space-y-8">
        {/* Global Master Switch */}
        <div className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
                <Globe className="h-5 w-5 text-blue-500" />
                Global Ad Networks
              </h2>
              <p className="text-sm text-foreground/70 mt-1">Enable or disable third-party automated ad networks across the entire platform.</p>
            </div>
            <Switch checked={formData.adNetworkEnabled} onCheckedChange={handleToggle} />
          </div>
        </div>

        {/* Google AdMob Settings */}
        <div className={`space-y-6 transition-opacity duration-200 ${!formData.adNetworkEnabled ? 'opacity-50 pointer-events-none' : ''}`}>
          <div className="bg-card border border-border rounded-xl p-6">
            <h3 className="text-lg font-medium text-foreground flex items-center gap-2 mb-6">
              <Smartphone className="h-5 w-5 text-emerald-500" />
              Google AdMob (Mobile Apps)
            </h3>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="text-muted-foreground">Publisher ID</Label>
                <Input 
                  name="adMobPublisherId" 
                  value={formData.adMobPublisherId} 
                  onChange={handleChange} 
                  placeholder="pub-xxxxxxxxxxxxxxxx" 
                  className="bg-background border-border text-foreground" 
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Android App ID</Label>
                  <Input name="adMobAppIdAndroid" value={formData.adMobAppIdAndroid} onChange={handleChange} placeholder="ca-app-pub-xxx~xxx" className="bg-background border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">iOS App ID</Label>
                  <Input name="adMobAppIdIos" value={formData.adMobAppIdIos} onChange={handleChange} placeholder="ca-app-pub-xxx~xxx" className="bg-background border-border text-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Android Banner Ad Unit</Label>
                  <Input name="adMobBannerAndroid" value={formData.adMobBannerAndroid} onChange={handleChange} placeholder="ca-app-pub-xxx/xxx" className="bg-background border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">iOS Banner Ad Unit</Label>
                  <Input name="adMobBannerIos" value={formData.adMobBannerIos} onChange={handleChange} placeholder="ca-app-pub-xxx/xxx" className="bg-background border-border text-foreground" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">Android Interstitial Ad Unit</Label>
                  <Input name="adMobInterstitialAndroid" value={formData.adMobInterstitialAndroid} onChange={handleChange} placeholder="ca-app-pub-xxx/xxx" className="bg-background border-border text-foreground" />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">iOS Interstitial Ad Unit</Label>
                  <Input name="adMobInterstitialIos" value={formData.adMobInterstitialIos} onChange={handleChange} placeholder="ca-app-pub-xxx/xxx" className="bg-background border-border text-foreground" />
                </div>
              </div>

              <div className="space-y-2 pt-4 border-t border-border">
                <Label className="text-muted-foreground flex items-center gap-2">
                  <MonitorPlay className="w-4 h-4 text-purple-500" />
                  VAST Pre-roll URL (Video Player Ads)
                </Label>
                <Input 
                  name="vastPrerollUrl" 
                  value={formData.vastPrerollUrl} 
                  onChange={handleChange} 
                  placeholder="https://..." 
                  className="bg-background border-border text-foreground" 
                />
                <p className="text-xs text-muted-foreground mt-1">Provide a VAST URL to show automated pre-roll ads in the video player before content starts.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Setup Guide */}
        <div className="bg-card border border-border rounded-xl p-6">
          <h3 className="text-lg font-medium text-foreground flex items-center gap-2 mb-4">
            <Info className="h-5 w-5 text-blue-400" />
            Google AdSense Setup Guide
          </h3>
          <ol className="list-decimal list-inside space-y-3 text-sm text-foreground/80">
            <li>Create a Google AdSense account at <a href="https://adsense.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">adsense.google.com</a>.</li>
            <li>Add your streaming platform website to your AdSense account and wait for approval.</li>
            <li>Once approved, go to <strong>Ads &gt; By ad unit</strong> and create a Display ad.</li>
            <li>Copy your Publisher ID (format: <code>pub-xxxxxxxxxxxxxxxx</code>) and paste it in the field above.</li>
            <li>Enable the <strong>Global Ad Networks</strong> switch at the top of this page and click Save.</li>
            <li>Ads will automatically appear on the streaming home page.</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
