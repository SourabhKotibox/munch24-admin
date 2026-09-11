import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Building2,
  SlidersHorizontal,
  Paintbrush,
  Mail,
  DollarSign,
  HardDrive,
  Search,
  Upload,
  Moon,
  Sun,
  ImageIcon,
  X,
  UserX,
  CreditCard,
  Eye,
  EyeOff,
  Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useDeleteAccount, useUpdateSettings, useUploadSettingsLogos, useGetEmailStatus, useTestEmail, getImageUrl, applyStorageCors } from "@/lib/api-client";
import { useSettings, applyColorTheme, applyBodyClasses } from "@/contexts/SettingsContext";
import { useTheme } from "next-themes";
import MediaPicker from "@/components/MediaPicker";

const SECTIONS = [
  { id: "business", label: "Business Settings", icon: Building2 },
  { id: "misc", label: "Misc Settings", icon: SlidersHorizontal },
  { id: "customization", label: "Customization", icon: Paintbrush },
  { id: "mail", label: "Mail Settings", icon: Mail },
  { id: "currency", label: "Currency Settings", icon: DollarSign },
  { id: "payment", label: "Payment Settings", icon: CreditCard },
  { id: "subscription", label: "Subscription Settings", icon: Crown },
  { id: "storage", label: "Storage Settings", icon: HardDrive },
  { id: "seo", label: "SEO Settings", icon: Search },
] as const;

type SectionId = (typeof SECTIONS)[number]["id"];

const COLOR_THEMES = [
  { id: "blue-green", a: "#3b82f6", b: "#10b981" },
  { id: "orange-yellow", a: "#f97316", b: "#eab308" },
  { id: "pink-purple", a: "#ec4899", b: "#a855f7" },
  { id: "purple-orange", a: "#8b5cf6", b: "#f97316" },
  { id: "green-pink", a: "#22c55e", b: "#ec4899" },
];

const inputCls =
  "bg-background border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-11 rounded-lg";
const labelCls = "text-foreground text-sm font-medium";

// Reusable secret input with show/hide eye toggle
function SecretInput({
  value, onChange, placeholder, className,
}: {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
  className?: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className={`${className ?? ""} pr-10`}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function SectionTitle({ icon: Icon, label }: { icon: any; label: string }) {
  return (
    <h2 className="text-xl font-semibold text-foreground flex items-center gap-2 mb-6">
      <Icon className="h-5 w-5 text-primary" />
      {label}
    </h2>
  );
}

function SaveBtn({ saving, onClick }: { saving: boolean; onClick: () => void }) {
  return (
    <div className="flex justify-end mt-8 pt-6 border-t border-border">
      <Button
        onClick={onClick}
        disabled={saving}
        className="bg-primary hover:bg-primary/90 text-white h-11 px-10 rounded-lg font-semibold"
      >
        {saving ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}

export default function Settings() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const deleteAccountMutation = useDeleteAccount();
  const { settings: ctxSettings, updateSettings: updateCtx, refreshSettings } = useSettings();
  const updateSettingsMutation = useUpdateSettings();
  const uploadLogosMutation = useUploadSettingsLogos();
  const { data: emailStatus, refetch: refetchEmailStatus } = useGetEmailStatus();
  const testEmailMutation = useTestEmail();
  const { resolvedTheme, setTheme } = useTheme();
  const [activeSection, setActiveSection] = useState<SectionId>("business");
  const [saving, setSaving] = useState(false);
  const seoImageRef = useRef<HTMLInputElement>(null);
  const lightLogoRef = useRef<HTMLInputElement>(null);
  const darkLogoRef = useRef<HTMLInputElement>(null);
  const faviconRef = useRef<HTMLInputElement>(null);

  const handleSave = () => {
    // Dispatch to the active section's handler
    switch (activeSection) {
      case "business": return handleSaveBusiness();
      case "misc": return handleSaveMisc();
      case "customization": return handleSaveCustomization();
      case "mail": return handleSaveMail();
      case "currency": return handleSaveCurrency();
      case "payment": return handleSavePayment();
      case "subscription": return handleSaveSubscription();
      case "storage": return handleSaveStorage();
      case "seo": return handleSaveSeo();
    }
  };

  // ── Business Settings ──────────────────────────────────────────────────
  const [business, setBusiness] = useState({
    platformName: ctxSettings.platformName,
    contactNo: ctxSettings.contactNo,
    inquiryEmail: ctxSettings.inquiryEmail,
    siteDescription: ctxSettings.siteDescription,
    copyrightText: ctxSettings.copyrightText,
    facebookUrl: ctxSettings.facebookUrl,
    twitterUrl: ctxSettings.twitterUrl,
    instagramUrl: ctxSettings.instagramUrl,
    youtubeUrl: ctxSettings.youtubeUrl,
    logoStyle: ctxSettings.logoStyle,
  });

  useEffect(() => {
    setBusiness({
      platformName: ctxSettings.platformName,
      contactNo: ctxSettings.contactNo,
      inquiryEmail: ctxSettings.inquiryEmail,
      siteDescription: ctxSettings.siteDescription,
      copyrightText: ctxSettings.copyrightText,
      facebookUrl: ctxSettings.facebookUrl,
      twitterUrl: ctxSettings.twitterUrl,
      instagramUrl: ctxSettings.instagramUrl,
      youtubeUrl: ctxSettings.youtubeUrl,
      logoStyle: ctxSettings.logoStyle,
    });
  }, [
    ctxSettings.platformName,
    ctxSettings.contactNo,
    ctxSettings.inquiryEmail,
    ctxSettings.siteDescription,
    ctxSettings.copyrightText,
    ctxSettings.facebookUrl,
    ctxSettings.twitterUrl,
    ctxSettings.instagramUrl,
    ctxSettings.youtubeUrl,
    ctxSettings.logoStyle,
  ]);

  // logo preview states
  const [lightLogoPreview, setLightLogoPreview] = useState<string>(ctxSettings.lightLogoUrl || "");
  const [darkLogoPreview, setDarkLogoPreview] = useState<string>(ctxSettings.darkLogoUrl || "");
  const [faviconPreview, setFaviconPreview] = useState<string>(ctxSettings.faviconUrl || "");

  type LogoType = "lightLogo" | "darkLogo" | "favicon" | null;
  const [mediaPickerType, setMediaPickerType] = useState<LogoType>(null);

  useEffect(() => {
    setLightLogoPreview(ctxSettings.lightLogoUrl || "");
  }, [ctxSettings.lightLogoUrl]);

  useEffect(() => {
    setDarkLogoPreview(ctxSettings.darkLogoUrl || "");
  }, [ctxSettings.darkLogoUrl]);

  useEffect(() => {
    setFaviconPreview(ctxSettings.faviconUrl || "");
  }, [ctxSettings.faviconUrl]);

  const handleSaveBusiness = async () => {
    setSaving(true);
    try {
      // 1. Save text fields and URLs
      await updateSettingsMutation.mutateAsync({
        platformName: business.platformName,
        contactNo: business.contactNo,
        inquiryEmail: business.inquiryEmail,
        siteDescription: business.siteDescription,
        copyrightText: business.copyrightText,
        facebookUrl: business.facebookUrl,
        twitterUrl: business.twitterUrl,
        instagramUrl: business.instagramUrl,
        youtubeUrl: business.youtubeUrl,
        logoStyle: business.logoStyle,
        lightLogoUrl: lightLogoPreview !== ctxSettings.lightLogoUrl ? lightLogoPreview : undefined,
        darkLogoUrl: darkLogoPreview !== ctxSettings.darkLogoUrl ? darkLogoPreview : undefined,
        faviconUrl: faviconPreview !== ctxSettings.faviconUrl ? faviconPreview : undefined,
      });
      updateCtx({ ...business });
      await refreshSettings();
      toast({ title: "Business settings saved!" });
    } catch (err: any) {
      toast({ title: err?.message || "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };





  // ── Misc Settings ──────────────────────────────────────────────────────
  const [misc, setMisc] = useState({
    maintenanceMode: ctxSettings.maintenanceMode ?? false,
    userRegistration: ctxSettings.userRegistration ?? true,
    socialLogin: ctxSettings.socialLogin ?? true,
    twoFactorAuth: ctxSettings.twoFactorAuth ?? false,
    emailVerification: ctxSettings.emailVerification ?? true,
    googleClientId: ctxSettings.googleClientId || '',
    appleClientId: ctxSettings.appleClientId || '',
    appleTeamId: ctxSettings.appleTeamId || '',
    appleKeyId: ctxSettings.appleKeyId || '',
  });

  useEffect(() => {
    setMisc({
      maintenanceMode: ctxSettings.maintenanceMode ?? false,
      userRegistration: ctxSettings.userRegistration ?? true,
      socialLogin: ctxSettings.socialLogin ?? true,
      twoFactorAuth: ctxSettings.twoFactorAuth ?? false,
      emailVerification: ctxSettings.emailVerification ?? true,
      googleClientId: ctxSettings.googleClientId || '',
      appleClientId: ctxSettings.appleClientId || '',
      appleTeamId: ctxSettings.appleTeamId || '',
      appleKeyId: ctxSettings.appleKeyId || '',
    });
  }, [
    ctxSettings.maintenanceMode,
    ctxSettings.userRegistration,
    ctxSettings.socialLogin,
    ctxSettings.twoFactorAuth,
    ctxSettings.emailVerification,
    ctxSettings.googleClientId,
    ctxSettings.appleClientId,
    ctxSettings.appleTeamId,
    ctxSettings.appleKeyId,
  ]);

  const handleSaveMisc = async () => {
    setSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        maintenanceMode: misc.maintenanceMode,
        userRegistration: misc.userRegistration,
        socialLogin: misc.socialLogin,
        twoFactorAuth: misc.twoFactorAuth,
        emailVerification: misc.emailVerification,
        googleClientId: misc.googleClientId.trim(),
        appleClientId: misc.appleClientId.trim(),
        appleTeamId: misc.appleTeamId.trim(),
        appleKeyId: misc.appleKeyId.trim(),
      });
      updateCtx({
        maintenanceMode: misc.maintenanceMode,
        userRegistration: misc.userRegistration,
        socialLogin: misc.socialLogin,
        twoFactorAuth: misc.twoFactorAuth,
        emailVerification: misc.emailVerification,
        googleClientId: misc.googleClientId.trim(),
        appleClientId: misc.appleClientId.trim(),
        appleTeamId: misc.appleTeamId.trim(),
        appleKeyId: misc.appleKeyId.trim(),
      });
      await refreshSettings();
      toast({ title: "Misc settings saved!" });
    } catch (err: any) {
      toast({ title: err?.message || "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Customization ──────────────────────────────────────────────────────
  const [custom, setCustom] = useState({
    colorTheme: ctxSettings.colorTheme || "blue-green",
    navbarStyle: ctxSettings.navbarStyle || "Default",
    navbarHide: ctxSettings.navbarHide ?? false,
    cardStyle: ctxSettings.cardStyle || "Default",
    menuStyle: ctxSettings.menuStyle || "Mini",
    activeMenuStyle: ctxSettings.activeMenuStyle || "Left Bordered",
    footerStyle: ctxSettings.footerStyle || "default",
  });

  useEffect(() => {
    setCustom({
      colorTheme: ctxSettings.colorTheme || "blue-green",
      navbarStyle: ctxSettings.navbarStyle || "Default",
      navbarHide: ctxSettings.navbarHide ?? false,
      cardStyle: ctxSettings.cardStyle || "Default",
      menuStyle: ctxSettings.menuStyle || "Mini",
      activeMenuStyle: ctxSettings.activeMenuStyle || "Left Bordered",
      footerStyle: ctxSettings.footerStyle || "default",
    });
  }, [
    ctxSettings.colorTheme,
    ctxSettings.navbarStyle,
    ctxSettings.navbarHide,
    ctxSettings.cardStyle,
    ctxSettings.menuStyle,
    ctxSettings.activeMenuStyle,
    ctxSettings.footerStyle,
  ]);

  // Live Preview Effect
  useEffect(() => {
    applyColorTheme(custom.colorTheme);
    applyBodyClasses(custom.cardStyle.toLowerCase(), custom.menuStyle.toLowerCase());
    
    return () => {
      // Cleanup to revert to saved settings if unmounted without saving
      applyColorTheme(ctxSettings.colorTheme || "blue-green");
      applyBodyClasses((ctxSettings.cardStyle || "default").toLowerCase(), (ctxSettings.menuStyle || "mini").toLowerCase());
    };
  }, [custom.colorTheme, custom.cardStyle, custom.menuStyle, ctxSettings]);

  const handleSaveCustomization = async () => {
    setSaving(true);
    try {
      const customSettings = {
        colorTheme: custom.colorTheme,
        navbarStyle: custom.navbarStyle.toLowerCase() as any,
        navbarHide: custom.navbarHide,
        cardStyle: custom.cardStyle.toLowerCase() as any,
        menuStyle: custom.menuStyle.toLowerCase() as any,
        activeMenuStyle: custom.activeMenuStyle.toLowerCase(),
        footerStyle: custom.footerStyle,
      };
      
      await updateSettingsMutation.mutateAsync(customSettings);
      updateCtx(customSettings);
      await refreshSettings();
      
      toast({ title: "Customization settings saved!" });
    } catch (err: any) {
      toast({ title: err?.message || "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Mail Settings ──────────────────────────────────────────────────────
  const [mail, setMail] = useState({
    email: ctxSettings.mailEmail || "",
    mailDriver: ctxSettings.mailDriver || "smtp",
    mailHost: ctxSettings.mailHost || "",
    mailPort: ctxSettings.mailPort || "",
    mailEncryption: ctxSettings.mailEncryption || "tls",
    mailUsername: ctxSettings.mailUsername || "",
    password: "",
    mailFrom: ctxSettings.mailFrom || "",
    fromName: ctxSettings.mailFromName || "",
  });

  useEffect(() => {
    setMail({
      email: ctxSettings.mailEmail || "",
      mailDriver: ctxSettings.mailDriver || "smtp",
      mailHost: ctxSettings.mailHost || "",
      mailPort: ctxSettings.mailPort || "",
      mailEncryption: ctxSettings.mailEncryption || "tls",
      mailUsername: ctxSettings.mailUsername || "",
      password: "",
      mailFrom: ctxSettings.mailFrom || "",
      fromName: ctxSettings.mailFromName || "",
    });
  }, [
    ctxSettings.mailEmail,
    ctxSettings.mailDriver,
    ctxSettings.mailHost,
    ctxSettings.mailPort,
    ctxSettings.mailEncryption,
    ctxSettings.mailUsername,
    ctxSettings.mailFrom,
    ctxSettings.mailFromName,
  ]);

  const handleSaveMail = async () => {
    setSaving(true);
    try {
      const mailPayload: Record<string, any> = {
        mailEmail: mail.email,
        mailDriver: mail.mailDriver,
        mailHost: mail.mailHost,
        mailPort: mail.mailPort,
        mailEncryption: mail.mailEncryption,
        mailUsername: mail.mailUsername,
        mailFrom: mail.mailFrom,
        mailFromName: mail.fromName,
      };
      // Only update password if user typed a new one — empty means "keep existing"
      if (mail.password.trim()) {
        mailPayload.mailPassword = mail.password;
      }
      await updateSettingsMutation.mutateAsync(mailPayload);
      updateCtx({
        mailEmail: mail.email,
        mailDriver: mail.mailDriver,
        mailHost: mail.mailHost,
        mailPort: mail.mailPort,
        mailEncryption: mail.mailEncryption,
        mailUsername: mail.mailUsername,
        ...(mail.password.trim() ? { mailPassword: mail.password } : {}),
        mailFrom: mail.mailFrom,
        mailFromName: mail.fromName,
      });
      await refreshSettings();
      toast({ title: "Mail settings saved!" });
    } catch (err: any) {
      toast({ title: err?.message || "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };



  // ── Currency Settings ──────────────────────────────────────────────────
  const [currency, setCurrency] = useState({
    currency: ctxSettings.currencyCode || "USD",
    currencySymbol: ctxSettings.currencySymbol || "$",
    currencyPosition: ctxSettings.currencyPosition === "after" ? "right" : "left",
    decimalPlaces: ctxSettings.decimalPlaces?.toString() || "2",
  });

  useEffect(() => {
    setCurrency({
      currency: ctxSettings.currencyCode || "USD",
      currencySymbol: ctxSettings.currencySymbol || "$",
      currencyPosition: ctxSettings.currencyPosition === "after" ? "right" : "left",
      decimalPlaces: ctxSettings.decimalPlaces?.toString() || "2",
    });
  }, [
    ctxSettings.currencyCode,
    ctxSettings.currencySymbol,
    ctxSettings.currencyPosition,
    ctxSettings.decimalPlaces,
  ]);

  const handleSaveCurrency = async () => {
    setSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        currencyCode: currency.currency,
        currencySymbol: currency.currencySymbol,
        currencyPosition: currency.currencyPosition === "right" ? "after" : "before",
        decimalPlaces: parseInt(currency.decimalPlaces, 10),
      });
      updateCtx({
        currencyCode: currency.currency,
        currencySymbol: currency.currencySymbol,
        currencyPosition: currency.currencyPosition === "right" ? "after" : "before" as any,
        decimalPlaces: parseInt(currency.decimalPlaces, 10),
      });
      await refreshSettings();
      toast({ title: "Currency settings saved!" });
    } catch (err: any) {
      toast({ title: err?.message || "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Subscription Settings ─────────────────────────────────────────────
  const [subscriptionSettings, setSubscriptionSettings] = useState({
    vipTitle: ctxSettings.vipTitle || "Unlock the",
    vipHighlight: ctxSettings.vipHighlight || "Ultimate Experience",
    vipSubtitle: ctxSettings.vipSubtitle || "Get unlimited ad-free streaming, offline downloads, and exclusive access to our premium catalog.",
  });

  useEffect(() => {
    setSubscriptionSettings({
      vipTitle: ctxSettings.vipTitle || "Unlock the",
      vipHighlight: ctxSettings.vipHighlight || "Ultimate Experience",
      vipSubtitle: ctxSettings.vipSubtitle || "Get unlimited ad-free streaming, offline downloads, and exclusive access to our premium catalog.",
    });
  }, [
    ctxSettings.vipTitle,
    ctxSettings.vipHighlight,
    ctxSettings.vipSubtitle,
  ]);

  const handleSaveSubscription = async () => {
    setSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        ...subscriptionSettings,
      });
      updateCtx({ ...subscriptionSettings });
      await refreshSettings();
      toast({ title: "Subscription settings saved!" });
    } catch (err: any) {
      toast({ title: err?.message || "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Storage Settings ───────────────────────────────────────────────────
  const [storage, setStorage] = useState({
    storageDriver: ctxSettings.storageDriver || 'local',
    awsAccessKeyId: ctxSettings.awsAccessKeyId || '',
    awsSecretAccessKey: ctxSettings.awsSecretAccessKey || '',
    awsRegion: ctxSettings.awsRegion || '',
    awsBucket: ctxSettings.awsBucket || '',
    awsPathStyleEndpoint: ctxSettings.awsPathStyleEndpoint ?? false,
    doAccessKey: ctxSettings.doAccessKey || '',
    doSecretKey: ctxSettings.doSecretKey || '',
    doRegion: ctxSettings.doRegion || 'nyc3',
    doBucket: ctxSettings.doBucket || '',
    doCdnUrl: ctxSettings.doCdnUrl || '',
    doPathStyle: ctxSettings.doPathStyle ?? true,
    bunnyStorageZone: ctxSettings.bunnyStorageZone || '',
    bunnyAccessKey: ctxSettings.bunnyAccessKey || '',
    bunnyCdnUrl: ctxSettings.bunnyCdnUrl || '',
  });

  useEffect(() => {
    setStorage({
      storageDriver: ctxSettings.storageDriver || 'local',
      awsAccessKeyId: ctxSettings.awsAccessKeyId || '',
      awsSecretAccessKey: ctxSettings.awsSecretAccessKey || '',
      awsRegion: ctxSettings.awsRegion || '',
      awsBucket: ctxSettings.awsBucket || '',
      awsPathStyleEndpoint: ctxSettings.awsPathStyleEndpoint ?? false,
      doAccessKey: ctxSettings.doAccessKey || '',
      doSecretKey: ctxSettings.doSecretKey || '',
      doRegion: ctxSettings.doRegion || 'nyc3',
      doBucket: ctxSettings.doBucket || '',
      doCdnUrl: ctxSettings.doCdnUrl || '',
      doPathStyle: ctxSettings.doPathStyle ?? true,
      bunnyStorageZone: ctxSettings.bunnyStorageZone || '',
      bunnyAccessKey: ctxSettings.bunnyAccessKey || '',
      bunnyCdnUrl: ctxSettings.bunnyCdnUrl || '',
    });
  }, [
    ctxSettings.storageDriver,
    ctxSettings.awsAccessKeyId,
    ctxSettings.awsSecretAccessKey,
    ctxSettings.awsRegion,
    ctxSettings.awsBucket,
    ctxSettings.awsPathStyleEndpoint,
    ctxSettings.doAccessKey,
    ctxSettings.doSecretKey,
    ctxSettings.doRegion,
    ctxSettings.doBucket,
    ctxSettings.doCdnUrl,
    ctxSettings.doPathStyle,
    ctxSettings.bunnyStorageZone,
    ctxSettings.bunnyAccessKey,
    ctxSettings.bunnyCdnUrl,
  ]);

  const handleSaveStorage = async () => {
    setSaving(true);
    try {
      const savedSettings = await updateSettingsMutation.mutateAsync(storage);
      updateCtx({
        storageDriver: savedSettings.storageDriver ?? storage.storageDriver,
        awsAccessKeyId: savedSettings.awsAccessKeyId ?? storage.awsAccessKeyId,
        awsSecretAccessKey: savedSettings.awsSecretAccessKey ?? storage.awsSecretAccessKey,
        awsRegion: savedSettings.awsRegion ?? storage.awsRegion,
        awsBucket: savedSettings.awsBucket ?? storage.awsBucket,
        awsPathStyleEndpoint: savedSettings.awsPathStyleEndpoint ?? storage.awsPathStyleEndpoint,
        doAccessKey: savedSettings.doAccessKey ?? storage.doAccessKey,
        doSecretKey: savedSettings.doSecretKey ?? storage.doSecretKey,
        doRegion: savedSettings.doRegion ?? storage.doRegion,
        doBucket: savedSettings.doBucket ?? storage.doBucket,
        doCdnUrl: savedSettings.doCdnUrl ?? storage.doCdnUrl,
        doPathStyle: savedSettings.doPathStyle ?? storage.doPathStyle,
        bunnyStorageZone: savedSettings.bunnyStorageZone ?? storage.bunnyStorageZone,
        bunnyAccessKey: savedSettings.bunnyAccessKey ?? storage.bunnyAccessKey,
        bunnyCdnUrl: savedSettings.bunnyCdnUrl ?? storage.bunnyCdnUrl,
      });
      toast({ title: "Storage settings saved!" });
    } catch (err: any) {
      toast({ title: err?.message || "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── SEO Settings ───────────────────────────────────────────────────────
  const [seo, setSeo] = useState({
    seoImage: ctxSettings.seoImage || null,
    metaTitle: ctxSettings.metaTitle || "",
    metaKeywords: ctxSettings.metaKeywords || "",
    googleVerification: ctxSettings.googleVerification || "",
    canonicalUrl: ctxSettings.canonicalUrl || "",
    metaDescription: ctxSettings.metaDescription || "",
  });

  useEffect(() => {
    setSeo({
      seoImage: ctxSettings.seoImage || null,
      metaTitle: ctxSettings.metaTitle || "",
      metaKeywords: ctxSettings.metaKeywords || "",
      googleVerification: ctxSettings.googleVerification || "",
      canonicalUrl: ctxSettings.canonicalUrl || "",
      metaDescription: ctxSettings.metaDescription || "",
    });
  }, [
    ctxSettings.seoImage,
    ctxSettings.metaTitle,
    ctxSettings.metaKeywords,
    ctxSettings.googleVerification,
    ctxSettings.canonicalUrl,
    ctxSettings.metaDescription,
  ]);

  const handleSaveSeo = async () => {
    setSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        metaTitle: seo.metaTitle,
        metaDescription: seo.metaDescription,
        metaKeywords: seo.metaKeywords,
        googleAnalyticsId: ctxSettings.googleAnalyticsId || "",
        seoImage: seo.seoImage || "",
        googleVerification: seo.googleVerification,
        canonicalUrl: seo.canonicalUrl,
      });
      updateCtx({
        metaTitle: seo.metaTitle,
        metaDescription: seo.metaDescription,
        metaKeywords: seo.metaKeywords,
        googleAnalyticsId: ctxSettings.googleAnalyticsId || "",
        seoImage: seo.seoImage || "",
        googleVerification: seo.googleVerification,
        canonicalUrl: seo.canonicalUrl,
      });
      await refreshSettings();
      toast({ title: "SEO settings saved!" });
    } catch (err: any) {
      toast({ title: err?.message || "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Payment Settings ───────────────────────────────────────────────────
  const [payment, setPayment] = useState({
    razorpayEnabled: ctxSettings.razorpayEnabled ?? false,
    razorpayKeyId: ctxSettings.razorpayKeyId || "",
    razorpayKeySecret: ctxSettings.razorpayKeySecret || "",
  });

  useEffect(() => {
    setPayment({
      razorpayEnabled: ctxSettings.razorpayEnabled ?? false,
      razorpayKeyId: ctxSettings.razorpayKeyId || "",
      razorpayKeySecret: ctxSettings.razorpayKeySecret || "",
    });
  }, [
    ctxSettings.razorpayEnabled,
    ctxSettings.razorpayKeyId,
    ctxSettings.razorpayKeySecret,
  ]);

  const handleSavePayment = async () => {
    setSaving(true);
    try {
      await updateSettingsMutation.mutateAsync({
        razorpayEnabled: payment.razorpayEnabled,
        razorpayKeyId: payment.razorpayKeyId,
        razorpayKeySecret: payment.razorpayKeySecret,
      });
      updateCtx({
        razorpayEnabled: payment.razorpayEnabled,
        razorpayKeyId: payment.razorpayKeyId,
        razorpayKeySecret: payment.razorpayKeySecret,
      });
      await refreshSettings();
      toast({ title: "Payment settings saved!" });
    } catch (err: any) {
      toast({ title: err?.message || "Save failed", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // ── Section renderers ──────────────────────────────────────────────────

  const LogoUploadBox = ({
    label,
    preview,
    onClick,
  }: {
    label: string;
    preview: string;
    onClick: () => void;
  }) => (
    <div className="space-y-2">
      <Label className={labelCls}>{label}</Label>
      <div
        className="relative flex flex-col items-center justify-center h-28 rounded-lg border-2 border-dashed border-border bg-muted/30 dark:bg-zinc-800/40 cursor-pointer hover:border-primary/60 transition-colors overflow-hidden"
        onClick={onClick}
      >
        {preview ? (
          <>
            <img src={getImageUrl(preview)} alt={label} className="h-full w-full object-contain p-2" />
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
              <Upload className="h-5 w-5 text-foreground" />
            </div>
          </>
        ) : (
          <>
            <Upload className="h-5 w-5 text-muted-foreground mb-1" />
            <p className="text-xs text-muted-foreground">Click to upload</p>
          </>
        )}
      </div>
    </div>
  );

  const renderBusiness = () => (
    <div>
      <SectionTitle icon={Building2} label="Business Settings" />

      {/* Logo uploads */}
      <div className="mb-6">
        <p className="text-sm font-semibold text-foreground mb-4">Logos & Favicon</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <LogoUploadBox
            label="Light Theme Logo"
            preview={lightLogoPreview}
            onClick={() => setMediaPickerType("lightLogo")}
          />
          <LogoUploadBox
            label="Dark Theme Logo"
            preview={darkLogoPreview}
            onClick={() => setMediaPickerType("darkLogo")}
          />
          <LogoUploadBox
            label="Favicon"
            preview={faviconPreview}
            onClick={() => setMediaPickerType("favicon")}
          />
        </div>
      </div>

      <MediaPicker
        open={mediaPickerType !== null}
        onClose={() => setMediaPickerType(null)}
        onSelect={(media) => {
          if (mediaPickerType === "lightLogo") setLightLogoPreview(media.url);
          else if (mediaPickerType === "darkLogo") setDarkLogoPreview(media.url);
          else if (mediaPickerType === "favicon") setFaviconPreview(media.url);
          setMediaPickerType(null);
        }}
        source="settings"
        accept="image/*"
      />

      {/* Theme toggle */}
      <div className="mb-6 flex items-center justify-between p-4 rounded-lg border border-border bg-card">
        <div className="flex items-center gap-3">
          {resolvedTheme === "dark" ? (
            <Moon className="h-4 w-4 text-muted-foreground" />
          ) : (
            <Sun className="h-4 w-4 text-yellow-400" />
          )}
          <div>
            <p className="text-sm text-foreground font-medium">Dark Mode</p>
            <p className="text-xs text-muted-foreground mt-0.5">Toggle between dark and light theme</p>
          </div>
        </div>
        <Switch
          checked={resolvedTheme === "dark"}
          onCheckedChange={(v) => setTheme(v ? "dark" : "light")}
          className="data-[state=checked]:bg-primary"
        />
      </div>

      {/* Basic fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        {[
          { key: "platformName", label: "App Name", placeholder: "StreamVault", req: false },
          { key: "contactNo", label: "Contact No", placeholder: "+1 234 567 8900", req: true },
          { key: "inquiryEmail", label: "Inquiry Email", placeholder: "hello@example.com", req: true },
          { key: "copyrightText", label: "Copyright Text", placeholder: "© 2026 StreamVault. All Rights Reserved.", req: false },
        ].map(({ key, label, placeholder, req }) => (
          <div key={key} className="space-y-2">
            <Label className={labelCls}>
              {label} {req && <span className="text-primary">*</span>}
            </Label>
            <Input
              value={business[key as keyof typeof business]}
              onChange={(e) => setBusiness({ ...business, [key]: e.target.value })}
              placeholder={placeholder}
              className={inputCls}
            />
          </div>
        ))}
        <div className="space-y-2 md:col-span-2">
          <Label className={labelCls}>Site Description <span className="text-primary">*</span></Label>
          <Textarea
            value={business.siteDescription}
            onChange={(e) => setBusiness({ ...business, siteDescription: e.target.value })}
            placeholder="StreamVault: Your Ultimate Destination for Unlimited Movies and Shows!"
            className="bg-background border-border text-foreground focus:border-primary rounded-lg resize-none"
            rows={3}
          />
        </div>
      </div>

      {/* Social URLs */}
      <div className="mb-5">
        <p className="text-sm font-semibold text-foreground mb-4">Social Media Links</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[
            { key: "facebookUrl", label: "Facebook URL", placeholder: "https://facebook.com/yourpage" },
            { key: "twitterUrl", label: "X (Twitter) URL", placeholder: "https://twitter.com/yourhandle" },
            { key: "instagramUrl", label: "Instagram URL", placeholder: "https://instagram.com/yourpage" },
            { key: "youtubeUrl", label: "YouTube URL", placeholder: "https://youtube.com/@yourchannel" },
          ].map(({ key, label, placeholder }) => (
            <div key={key} className="space-y-2">
              <Label className={labelCls}>{label}</Label>
              <Input
                value={business[key as keyof typeof business]}
                onChange={(e) => setBusiness({ ...business, [key]: e.target.value })}
                placeholder={placeholder}
                className={inputCls}
              />
            </div>
          ))}
        </div>
      </div>



      <SaveBtn saving={saving} onClick={handleSaveBusiness} />
    </div>
  );



  const renderMisc = () => (
    <div>
      <SectionTitle icon={SlidersHorizontal} label="Misc Settings" />

      {/* Toggle switches */}
      <div className="space-y-3 mb-7">
        {([
          { key: "maintenanceMode", label: "Maintenance Mode", desc: "Block login & registration — users see a maintenance message" },
          { key: "userRegistration", label: "User Registration", desc: "Allow new users to create accounts on the web" },
          { key: "socialLogin", label: "Social Login", desc: "Show Google / Apple sign-in buttons on the web auth page" },
          { key: "twoFactorAuth", label: "Two Factor Authentication", desc: "Enable 2FA for extra security (coming soon)" },
          { key: "emailVerification", label: "Email Verification", desc: "Require email verification for new users" },
        ] as const).map(({ key, label, desc }) => (
          <div key={key} className="flex items-center justify-between p-4 rounded-lg border border-border bg-card">
            <div>
              <p className="text-sm text-foreground font-medium">{label}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{desc}</p>
            </div>
            <Switch
              checked={misc[key]}
              onCheckedChange={(v) => setMisc({ ...misc, [key]: v })}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        ))}
      </div>

      {/* Social OAuth Credentials — shown when socialLogin is on */}
      {misc.socialLogin && (
        <div className="mb-7 rounded-lg border border-border bg-card p-5">
          <p className="text-sm font-bold text-foreground mb-1 flex items-center gap-2">
            <span className="w-2 h-4 rounded-full bg-primary inline-block" />
            Social Login Credentials
          </p>
          <p className="text-xs text-muted-foreground mb-4">
            Enter OAuth credentials for each provider. Leave blank to disable that provider's button.
          </p>

          {/* Google */}
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              <span className="text-sm font-semibold text-foreground">Google Sign In</span>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Google Client ID</Label>
              <SecretInput
                value={misc.googleClientId}
                onChange={(e) => setMisc({ ...misc, googleClientId: e.target.value })}
                placeholder="123456789-abc.apps.googleusercontent.com"
                className={inputCls}
              />
              <p className="text-xs text-muted-foreground">From Google Cloud Console → APIs & Services → Credentials</p>
            </div>
          </div>

          {/* Apple */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <svg viewBox="0 0 24 24" className="w-4 h-4 fill-foreground">
                <path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.54 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701"/>
              </svg>
              <span className="text-sm font-semibold text-foreground">Apple Sign In</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className={labelCls}>Apple Client ID (Services ID)</Label>
                <SecretInput
                  value={misc.appleClientId}
                  onChange={(e) => setMisc({ ...misc, appleClientId: e.target.value })}
                  placeholder="com.example.app"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Team ID</Label>
                <SecretInput
                  value={misc.appleTeamId}
                  onChange={(e) => setMisc({ ...misc, appleTeamId: e.target.value })}
                  placeholder="ABCDE12345"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className={labelCls}>Key ID</Label>
                <SecretInput
                  value={misc.appleKeyId}
                  onChange={(e) => setMisc({ ...misc, appleKeyId: e.target.value })}
                  placeholder="XYZABC1234"
                  className={inputCls}
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">From Apple Developer → Certificates, Identifiers & Profiles → Keys</p>
          </div>
        </div>
      )}

      <SaveBtn saving={saving} onClick={handleSaveMisc} />
    </div>
  );

  const renderCustomization = () => (
    <div>
      <SectionTitle icon={Paintbrush} label="Customization" />

      {/* Color Customizer */}
      <div className="space-y-3 mb-7">
        <div className="flex items-center justify-between">
          <Label className="text-foreground font-medium">Color Customizer</Label>
          <label className="text-sm text-primary hover:text-primary/80 font-medium cursor-pointer flex items-center gap-2">
            Custom ✨
            <input 
              type="color" 
              className="w-6 h-6 p-0 border-0 rounded cursor-pointer"
              value={custom.colorTheme?.startsWith('#') ? custom.colorTheme : '#ff0000'}
              onChange={(e) => setCustom({ ...custom, colorTheme: e.target.value })}
            />
          </label>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          {COLOR_THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setCustom({ ...custom, colorTheme: t.id })}
              className={`h-14 w-24 rounded-lg border-2 overflow-hidden relative transition-all ${
                custom.colorTheme === t.id ? "border-primary shadow-lg shadow-primary/20" : "border-border hover:border-primary"
              }`}
            >
              <div className="absolute inset-0 flex">
                <div className="w-1/2 h-full" style={{ background: t.a }} />
                <div className="w-1/2 h-full" style={{ background: t.b }} />
              </div>
              <div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-8 w-8 rounded-full border-2 border-white/30"
                style={{ background: `conic-gradient(${t.a} 50%, ${t.b} 50%)` }}
              />
            </button>
          ))}
        </div>
      </div>

      {/* Navbar Style */}
      <div className="space-y-3 mb-7">
        <Label className="text-foreground font-medium">Navbar Style</Label>
        <div className="flex flex-wrap gap-3">
          {["Glass", "Sticky", "Transparent", "Default"].map((s) => (
            <button
              key={s}
              onClick={() => setCustom({ ...custom, navbarStyle: s })}
              className={`px-6 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                custom.navbarStyle === s
                  ? "bg-primary border-red-600 text-white"
                  : "border-border text-foreground hover:border-primary hover:text-foreground bg-card"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Navbar Hide */}
      <div className="flex items-center justify-between py-4 border-t border-b border-border mb-7">
        <Label className="text-foreground font-medium">Navbar Hide</Label>
        <Switch
          checked={custom.navbarHide}
          onCheckedChange={(v) => setCustom({ ...custom, navbarHide: v })}
          className="data-[state=checked]:bg-primary"
        />
      </div>

      {/* Card Style */}
      <div className="space-y-3 mb-7">
        <Label className="text-foreground font-medium">Card Style</Label>
        <div className="flex flex-wrap gap-3">
          {["Default", "Glass", "Transparent"].map((s) => (
            <button
              key={s}
              onClick={() => setCustom({ ...custom, cardStyle: s })}
              className={`px-6 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                custom.cardStyle === s
                  ? "bg-primary border-red-600 text-white"
                  : "border-border text-foreground hover:border-primary hover:text-foreground bg-card"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Style */}
      <div className="space-y-3 mb-7">
        <Label className="text-foreground font-medium">Menu Style</Label>
        <div className="flex flex-wrap gap-3">
          {["Mini", "Hover", "Boxed", "Soft"].map((s) => (
            <button
              key={s}
              onClick={() => setCustom({ ...custom, menuStyle: s })}
              className={`px-6 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                custom.menuStyle === s
                  ? "bg-primary border-red-600 text-white"
                  : "border-border text-foreground hover:border-primary hover:text-foreground bg-card"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Active Menu Style */}
      <div className="space-y-3 mb-7">
        <Label className="text-foreground font-medium">Active Menu Style</Label>
        <div className="flex flex-wrap gap-3">
          {["Rounded One Side", "Rounded All", "Pill One Side", "Pill All", "Left Bordered", "Full Width"].map((s) => (
            <button
              key={s}
              onClick={() => setCustom({ ...custom, activeMenuStyle: s })}
              className={`px-5 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                custom.activeMenuStyle === s
                  ? "bg-primary border-red-600 text-white"
                  : "border-border text-foreground hover:border-primary hover:text-foreground bg-card"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="space-y-3">
        <Label className="text-foreground font-medium">Footer</Label>
        <div className="flex flex-wrap gap-3">
          {["Default", "Sticky"].map((s) => (
            <button
              key={s}
              onClick={() => setCustom({ ...custom, footerStyle: s.toLowerCase() as any })}
              className={`px-6 py-2.5 rounded-lg border text-sm font-medium transition-all ${
                custom.footerStyle === s.toLowerCase()
                  ? "bg-primary border-red-600 text-white"
                  : "border-border text-foreground hover:border-primary hover:text-foreground bg-card"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <SaveBtn saving={saving} onClick={handleSaveCustomization} />
    </div>
  );

  const renderMail = () => (
    <div>
      <SectionTitle icon={Mail} label="Mail Settings" />

      {/* Email Status */}
      <div className="mb-6 p-4 rounded-lg border border-border bg-card">
        <p className="text-sm font-semibold text-foreground mb-3">Email Configuration Status</p>
        <div className="flex items-center gap-3">
          <div className={`h-3 w-3 rounded-full ${emailStatus?.data?.configured ? 'bg-green-500' : 'bg-primary'}`} />
          <span className="text-sm text-foreground">
            {emailStatus?.data?.configured ? 'Email is configured' : 'Email is NOT configured — credentials will not be sent via email'}
          </span>
        </div>
        {!emailStatus?.data?.configured && (
          <p className="text-xs text-muted-foreground mt-2">
            Set <strong>Mail Username</strong> and <strong>Password</strong> below, then click Save.
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Mail Driver Selector */}
        <div className="space-y-2 md:col-span-2">
          <Label className={labelCls}>
            Mail Driver <span className="text-primary">*</span>
          </Label>
          <Select
            value={mail.mailDriver}
            onValueChange={(v) => setMail({ ...mail, mailDriver: v })}
          >
            <SelectTrigger className={`${inputCls} h-11`}>
              <SelectValue placeholder="Select Mail Driver" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="smtp">SMTP</SelectItem>
              <SelectItem value="sendmail">Sendmail</SelectItem>
              <SelectItem value="log">Log</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* SMTP-specific fields */}
        {mail.mailDriver === "smtp" && (
          <>
            <div className="space-y-2">
              <Label className={labelCls}>
                Mail Host <span className="text-primary">*</span>
              </Label>
              <Input
                value={mail.mailHost}
                onChange={(e) => setMail({ ...mail, mailHost: e.target.value })}
                placeholder="smtp.gmail.com"
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>
                Mail Port <span className="text-primary">*</span>
              </Label>
              <Input
                value={mail.mailPort}
                onChange={(e) => setMail({ ...mail, mailPort: e.target.value })}
                placeholder="587"
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>
                Mail Encryption <span className="text-primary">*</span>
              </Label>
              <Select
                value={mail.mailEncryption}
                onValueChange={(v) => setMail({ ...mail, mailEncryption: v })}
              >
                <SelectTrigger className={`${inputCls} h-11`}>
                  <SelectValue placeholder="Select Encryption" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="tls">TLS</SelectItem>
                  <SelectItem value="ssl">SSL</SelectItem>
                  <SelectItem value="none">None</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>
                Mail Username <span className="text-primary">*</span>
              </Label>
              <Input
                value={mail.mailUsername}
                onChange={(e) => setMail({ ...mail, mailUsername: e.target.value })}
                placeholder="youremail@gmail.com"
                className={inputCls}
              />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>
                Password <span className="text-primary">*</span>
              </Label>
              <SecretInput
                value={mail.password}
                onChange={(e) => setMail({ ...mail, password: e.target.value })}
                placeholder={ctxSettings.mailPassword ? "••••••••  (saved — leave blank to keep)" : "Enter SMTP password"}
                className={inputCls}
              />
            </div>
          </>
        )}

        {/* Common Mail fields */}
        <div className="space-y-2">
          <Label className={labelCls}>
            From Email <span className="text-primary">*</span>
          </Label>
          <Input
            value={mail.email}
            onChange={(e) => setMail({ ...mail, email: e.target.value })}
            placeholder="info@example.com"
            className={inputCls}
          />
        </div>
        <div className="space-y-2">
          <Label className={labelCls}>
            From Name <span className="text-primary">*</span>
          </Label>
          <Input
            value={mail.fromName}
            onChange={(e) => setMail({ ...mail, fromName: e.target.value })}
            placeholder="NETFLIX"
            className={inputCls}
          />
        </div>
      </div>

      {/* Test Email */}
      <div className="mt-6 p-4 rounded-lg border border-border bg-muted/20">
        <p className="text-sm font-semibold text-foreground mb-3">Test Email Configuration</p>
        <div className="flex gap-3">
          <Input
            value={mail.email}
            placeholder="Enter test email address"
            className={inputCls}
            onChange={(e) => setMail({ ...mail, email: e.target.value })}
          />
          <Button
            variant="outline"
            onClick={async () => {
              try {
                const result = await testEmailMutation.mutateAsync(mail.email);
                toast({ title: result.message || "Test email sent!" });
              } catch (error: any) {
                toast({ title: error?.message || "Test email failed", variant: "destructive" });
              }
            }}
            disabled={testEmailMutation.isPending || !mail.email}
            className="border-border text-foreground hover:bg-muted whitespace-nowrap"
          >
            {testEmailMutation.isPending ? "Sending..." : "Send Test Email"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Sends a test email to verify your SMTP configuration is working.
        </p>
      </div>

      <SaveBtn saving={saving} onClick={handleSaveMail} />
    </div>
  );



  const renderCurrency = () => (
    <div>
      <SectionTitle icon={DollarSign} label="Currency Settings" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <Label className={labelCls}>
            Currency <span className="text-primary">*</span>
          </Label>
          <Select
            value={currency.currency}
            onValueChange={(v) => setCurrency({ ...currency, currency: v })}
          >
            <SelectTrigger className={`${inputCls} h-11`}>
              <SelectValue placeholder="Select Currency" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="USD">USD - US Dollar</SelectItem>
              <SelectItem value="EUR">EUR - Euro</SelectItem>
              <SelectItem value="GBP">GBP - British Pound</SelectItem>
              <SelectItem value="INR">INR - Indian Rupee</SelectItem>
              <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
              <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
              <SelectItem value="JPY">JPY - Japanese Yen</SelectItem>
              <SelectItem value="CNY">CNY - Chinese Yuan</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={labelCls}>
            Currency Symbol <span className="text-primary">*</span>
          </Label>
          <Input
            value={currency.currencySymbol}
            onChange={(e) => setCurrency({ ...currency, currencySymbol: e.target.value })}
            placeholder="$"
            className={inputCls}
          />
        </div>
        <div className="space-y-2">
          <Label className={labelCls}>Currency Position</Label>
          <Select
            value={currency.currencyPosition}
            onValueChange={(v) => setCurrency({ ...currency, currencyPosition: v })}
          >
            <SelectTrigger className={`${inputCls} h-11`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="left">Left ($10)</SelectItem>
              <SelectItem value="right">Right (10$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className={labelCls}>Decimal Places</Label>
          <Input
            type="number"
            value={currency.decimalPlaces}
            onChange={(e) => setCurrency({ ...currency, decimalPlaces: e.target.value })}
            placeholder="2"
            className={inputCls}
          />
        </div>
      </div>
      <SaveBtn saving={saving} onClick={handleSaveCurrency} />
    </div>
  );

  const renderSubscription = () => (
    <div>
      <SectionTitle icon={Crown} label="Subscription Settings" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="space-y-2">
          <Label className={labelCls}>VIP Title (Base Text)</Label>
          <Input
            value={subscriptionSettings.vipTitle}
            onChange={(e) => setSubscriptionSettings({ ...subscriptionSettings, vipTitle: e.target.value })}
            placeholder="Unlock the"
            className={inputCls}
          />
        </div>
        <div className="space-y-2">
          <Label className={labelCls}>VIP Title (Highlighted Text)</Label>
          <Input
            value={subscriptionSettings.vipHighlight}
            onChange={(e) => setSubscriptionSettings({ ...subscriptionSettings, vipHighlight: e.target.value })}
            placeholder="Ultimate Experience"
            className={inputCls}
          />
        </div>
      </div>
      <div className="space-y-2 mb-6">
        <Label className={labelCls}>VIP Subtitle</Label>
        <Textarea
          value={subscriptionSettings.vipSubtitle}
          onChange={(e) => setSubscriptionSettings({ ...subscriptionSettings, vipSubtitle: e.target.value })}
          placeholder="Get unlimited ad-free streaming..."
          className={`${inputCls} h-24 py-3 resize-none`}
        />
      </div>
      <SaveBtn saving={saving} onClick={handleSaveSubscription} />
    </div>
  );

  const renderStorage = () => (
    <div>
      <SectionTitle icon={HardDrive} label="Storage Settings" />
      <div className="space-y-6">
        <div className="space-y-2">
          <Label className={labelCls}>Storage Driver</Label>
          <Select
            value={storage.storageDriver}
            onValueChange={(v) => setStorage({ ...storage, storageDriver: v as 'local' | 's3' | 'digitalocean' | 'bunny' })}
          >
            <SelectTrigger className={`${inputCls} h-11`}>
              <SelectValue placeholder="Select Storage Driver" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="local">Local Storage</SelectItem>
              <SelectItem value="s3">Amazon S3</SelectItem>
              <SelectItem value="digitalocean">DigitalOcean Spaces</SelectItem>
              <SelectItem value="bunny">Bunny.net Storage</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {storage.storageDriver === 's3' && (
          <div className="space-y-4 p-4 rounded-lg border border-border bg-card animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-sm font-semibold text-foreground mb-2">Amazon S3 Configuration</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelCls}>Access Key ID</Label>
                <Input
                  value={storage.awsAccessKeyId}
                  onChange={(e) => setStorage({ ...storage, awsAccessKeyId: e.target.value })}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Secret Access Key</Label>
                <Input
                  type="password"
                  value={storage.awsSecretAccessKey}
                  onChange={(e) => setStorage({ ...storage, awsSecretAccessKey: e.target.value })}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Region</Label>
                <Input
                  value={storage.awsRegion}
                  onChange={(e) => setStorage({ ...storage, awsRegion: e.target.value })}
                  placeholder="us-east-1"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Bucket Name</Label>
                <Input
                  value={storage.awsBucket}
                  onChange={(e) => setStorage({ ...storage, awsBucket: e.target.value })}
                  placeholder="my-bucket"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className={labelCls}>Path Style Endpoint</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={storage.awsPathStyleEndpoint}
                    onCheckedChange={(v) => setStorage({ ...storage, awsPathStyleEndpoint: v })}
                    className="data-[state=checked]:bg-primary"
                  />
                  <span className="text-sm text-muted-foreground">Enable path-style addressing</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {storage.storageDriver === 'digitalocean' && (
          <div className="space-y-4 p-4 rounded-lg border border-border bg-card animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-sm font-semibold text-foreground mb-2">DigitalOcean Spaces Configuration</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelCls}>Access Key</Label>
                <Input
                  value={storage.doAccessKey}
                  onChange={(e) => setStorage({ ...storage, doAccessKey: e.target.value })}
                  placeholder="DO00XXXXXXXXXXXXXXXXXX"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Secret Key</Label>
                <Input
                  type="password"
                  value={storage.doSecretKey}
                  onChange={(e) => setStorage({ ...storage, doSecretKey: e.target.value })}
                  placeholder="your-secret-key"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Region</Label>
                <Select
                  value={storage.doRegion}
                  onValueChange={(v) => setStorage({ ...storage, doRegion: v })}
                >
                  <SelectTrigger className={`${inputCls} h-11`}>
                    <SelectValue placeholder="Select Region" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover border-border text-foreground">
                    <SelectItem value="nyc3">NYC3</SelectItem>
                    <SelectItem value="nyc1">NYC1</SelectItem>
                    <SelectItem value="ams3">AMS3</SelectItem>
                    <SelectItem value="sgp1">SGP1</SelectItem>
                    <SelectItem value="fra1">FRA1</SelectItem>
                    <SelectItem value="blr1">BLR1</SelectItem>
                    <SelectItem value="sfo2">SFO2</SelectItem>
                    <SelectItem value="sfo3">SFO3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Bucket Name</Label>
                <Input
                  value={storage.doBucket}
                  onChange={(e) => setStorage({ ...storage, doBucket: e.target.value })}
                  placeholder="my-space"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className={labelCls}>CDN URL (optional)</Label>
                <Input
                  value={storage.doCdnUrl}
                  onChange={(e) => setStorage({ ...storage, doCdnUrl: e.target.value })}
                  placeholder="https://cdn.example.com"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className={labelCls}>Path Style Endpoint</Label>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={storage.doPathStyle}
                    onCheckedChange={(v) => setStorage({ ...storage, doPathStyle: v })}
                    className="data-[state=checked]:bg-primary"
                  />
                  <span className="text-sm text-muted-foreground">Enable path-style addressing</span>
                </div>
              </div>
              <div className="md:col-span-2">
                <Button
                  type="button"
                  variant="outline"
                  className="border-border"
                  onClick={async () => {
                    try {
                      const result = await applyStorageCors();
                      toast({ title: result?.data?.message || "Storage CORS updated for browser uploads" });
                    } catch (error: any) {
                      toast({ title: "Could not apply Spaces CORS", description: error.message, variant: "destructive" });
                    }
                  }}
                >
                  Enable browser direct uploads (CORS)
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Required so large movies upload from the admin browser straight to DigitalOcean Spaces. Secrets stay on the server.
                </p>
              </div>
            </div>
          </div>
        )}

        {storage.storageDriver === 'bunny' && (
          <div className="space-y-4 p-4 rounded-lg border border-border bg-card animate-in fade-in slide-in-from-top-2 duration-300">
            <p className="text-sm font-semibold text-foreground mb-2">Bunny.net Configuration</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className={labelCls}>Storage Zone</Label>
                <Input
                  value={storage.bunnyStorageZone}
                  onChange={(e) => setStorage({ ...storage, bunnyStorageZone: e.target.value })}
                  placeholder="my-storage-zone"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2">
                <Label className={labelCls}>Access Key</Label>
                <Input
                  type="password"
                  value={storage.bunnyAccessKey}
                  onChange={(e) => setStorage({ ...storage, bunnyAccessKey: e.target.value })}
                  placeholder="bunny-access-key"
                  className={inputCls}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className={labelCls}>CDN URL</Label>
                <Input
                  value={storage.bunnyCdnUrl}
                  onChange={(e) => setStorage({ ...storage, bunnyCdnUrl: e.target.value })}
                  placeholder="https://my-zone.b-cdn.net"
                  className={inputCls}
                />
              </div>
            </div>
          </div>
        )}
      </div>
      <SaveBtn saving={saving} onClick={handleSaveStorage} />
    </div>
  );

  const renderSeo = () => (
    <div>
      <SectionTitle icon={Search} label="SEO Settings" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-5">
        <div className="space-y-2">
          <Label className={labelCls}>
            Meta Title <span className="text-primary">*</span>
          </Label>
          <div className="flex items-center justify-between">
            <Input
              value={seo.metaTitle}
              onChange={(e) => setSeo({ ...seo, metaTitle: e.target.value.slice(0, 100) })}
              placeholder="Enter Meta Title"
              className={inputCls}
            />
            <span className="text-xs text-muted-foreground ml-2">{seo.metaTitle.length}/100</span>
          </div>
        </div>

        <div className="space-y-2">
          <Label className={labelCls}>
            Meta Keywords <span className="text-primary">*</span>
          </Label>
          <Input
            value={seo.metaKeywords}
            onChange={(e) => setSeo({ ...seo, metaKeywords: e.target.value })}
            placeholder="Type and press enter"
            className={inputCls}
          />
        </div>

        <div className="space-y-2">
          <Label className={labelCls}>
            Google Site Verification <span className="text-primary">*</span>
          </Label>
          <Input
            value={seo.googleVerification}
            onChange={(e) => setSeo({ ...seo, googleVerification: e.target.value })}
            placeholder="Enter Google site verification"
            className={inputCls}
          />
        </div>

        <div className="space-y-2">
          <Label className={labelCls}>
            Global Canonical URL <span className="text-primary">*</span>
          </Label>
          <Input
            value={seo.canonicalUrl}
            onChange={(e) => setSeo({ ...seo, canonicalUrl: e.target.value })}
            placeholder="Enter Global Canonical url"
            className={inputCls}
          />
        </div>
      </div>

      {/* Meta description */}
      <div className="space-y-2 mb-5">
        <div className="flex items-center justify-between">
          <Label className={labelCls}>
            Site Meta Description <span className="text-primary">*</span>
          </Label>
          <span className="text-xs text-muted-foreground">{seo.metaDescription.length}/200</span>
        </div>
        <Textarea
          value={seo.metaDescription}
          onChange={(e) => setSeo({ ...seo, metaDescription: e.target.value.slice(0, 200) })}
          placeholder="Enter Meta Description"
          className="bg-card border-border text-foreground placeholder:text-muted-foreground focus:border-primary rounded-lg resize-none"
          rows={4}
        />
      </div>

      {/* SEO Image */}
      <div className="space-y-2">
        <Label className={labelCls}>
          SEO Image <span className="text-primary">*</span>
        </Label>
        <div
          onClick={() => seoImageRef.current?.click()}
          className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-card hover:border-primary/60 cursor-pointer transition-all overflow-hidden"
          style={{ minHeight: "168px" }}
        >
          {seo.seoImage ? (
            <div className="relative w-full bg-gray-800 rounded-lg" style={{ height: "168px" }}>
              <img src={getImageUrl(seo.seoImage) || seo.seoImage} alt="SEO" className="w-full h-full object-contain" />
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSeo({ ...seo, seoImage: null });
                }}
                className="absolute top-2 right-2 h-6 w-6 rounded-full bg-primary hover:bg-primary/90 flex items-center justify-center z-10"
              >
                <X className="h-3.5 w-3.5 text-foreground" />
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 py-8">
              <ImageIcon className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground text-center px-4">Choose Media to Upload</p>
            </div>
          )}
        </div>
        <input
          ref={seoImageRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = (ev) => setSeo({ ...seo, seoImage: ev.target?.result as string });
            r.readAsDataURL(f);
          }}
        />
      </div>

      <SaveBtn saving={saving} onClick={handleSaveSeo} />
    </div>
  );

  const renderPayment = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <SectionTitle icon={CreditCard} label="Payment Settings (Razorpay)" />

      <div className="grid grid-cols-1 gap-6">
        <div className="flex items-center justify-between p-4 border border-border rounded-lg bg-background/50">
          <div className="space-y-0.5">
            <Label className="text-base text-foreground font-semibold">Enable Razorpay</Label>
            <p className="text-sm text-muted-foreground">
              Turn on to allow users to pay using Razorpay gateway.
            </p>
          </div>
          <Switch
            checked={payment.razorpayEnabled}
            onCheckedChange={(c) => setPayment({ ...payment, razorpayEnabled: c })}
            className="data-[state=checked]:bg-primary"
          />
        </div>

        {payment.razorpayEnabled && (
          <div className="space-y-4 p-4 border border-border rounded-lg bg-background/50 animate-in fade-in slide-in-from-top-2 duration-300">
            <div className="space-y-2">
              <Label className={labelCls}>Razorpay Key ID</Label>
              <Input
                value={payment.razorpayKeyId}
                onChange={(e) => setPayment({ ...payment, razorpayKeyId: e.target.value })}
                placeholder="rzp_test_..."
                className={inputCls}
              />
              <p className="text-xs text-muted-foreground">Public key ID from your Razorpay Dashboard</p>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Razorpay Key Secret</Label>
              <SecretInput
                value={payment.razorpayKeySecret}
                onChange={(e) => setPayment({ ...payment, razorpayKeySecret: e.target.value })}
                placeholder="Enter Key Secret"
                className={inputCls}
              />
              <p className="text-xs text-muted-foreground">Keep this secure. Do not share it publicly.</p>
            </div>
          </div>
        )}
      </div>

      <SaveBtn saving={saving} onClick={handleSavePayment} />
    </div>
  );

  const renderSection = () => {
    switch (activeSection) {
      case "business": return renderBusiness();
      case "misc": return renderMisc();
      case "customization": return renderCustomization();
      case "mail": return renderMail();
      case "currency": return renderCurrency();
      case "payment": return renderPayment();
      case "subscription": return renderSubscription();
      case "storage": return renderStorage();
      case "seo": return renderSeo();
    }
  };

  const activeLabel = SECTIONS.find((s) => s.id === activeSection)?.label ?? "";

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-muted-foreground">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Settings</span>
        {activeSection !== "business" && (
          <>
            <span>/</span>
            <span className="text-muted-foreground">{activeLabel}</span>
          </>
        )}
      </div>

      {/* Two-panel layout */}
      <div className="flex flex-col md:flex-row gap-6 items-start">
        {/* Left: Sub-navigation */}
        <div className="w-full md:w-64 flex-shrink-0">
          <div className="rounded-xl border border-border bg-card/50 overflow-hidden">
            {SECTIONS.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium transition-all border-b border-border last:border-b-0 text-left ${
                    isActive
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4 flex-shrink-0" />
                  {section.label}
                </button>
              );
            })}

            {/* Danger Zone in sidebar */}
            <div className="border-t border-border mt-1 pt-1">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-medium text-primary hover:bg-primary/10 hover:text-primary/80 transition-all text-left">
                    <UserX className="h-4 w-4 flex-shrink-0" />
                    Deactivate Account
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent className="bg-card border border-border text-foreground">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="text-foreground">Deactivate Account?</AlertDialogTitle>
                    <AlertDialogDescription className="text-muted-foreground">
                      This action cannot be undone. You will lose access to this admin panel.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="bg-muted border-border text-foreground hover:bg-muted hover:text-foreground">
                      Cancel
                    </AlertDialogCancel>
                    <AlertDialogAction
                      onClick={async () => {
                        try {
                          await deleteAccountMutation.mutateAsync(undefined);
                          toast({ title: "Account deactivated successfully" });
                          setLocation("/login");
                        } catch {
                          toast({ title: "Failed to deactivate account", variant: "destructive" });
                        }
                      }}
                      disabled={deleteAccountMutation.isPending}
                      className="bg-primary hover:bg-primary/90 text-white border-0"
                    >
                      {deleteAccountMutation.isPending ? "Deactivating..." : "Yes, Deactivate"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>

        {/* Right: Form content */}
        <div className="flex-1 min-w-0">
          <div className="rounded-xl border border-border bg-card/50 p-6">
            {renderSection()}
          </div>
        </div>
      </div>
    </div>
  );
}
