
import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getSettings, getImageUrl } from "@/lib/api-client";

export interface AppSettings {
  logoUrl: string;
  darkLogoUrl: string;
  lightLogoUrl: string;
  faviconUrl: string;
  logoStyle: 'icon' | 'fill';
  platformName: string;
  contactNo: string;
  inquiryEmail: string;
  siteDescription: string;
  copyrightText: string;
  facebookUrl: string;
  twitterUrl: string;
  instagramUrl: string;
  youtubeUrl: string;
  loginTitle: string;
  loginSubtitle: string;
  loginButtonText: string;
  headerCode: string;
  footerCode: string;
  moduleUsers: boolean;
  moduleLanguages: boolean;
  moduleAds: boolean;
  modulePromotions: boolean;
  moduleBanners: boolean;
  modulePages: boolean;
  moduleMovies: boolean;
  moduleTvShows: boolean;
  moduleLiveTV: boolean;
  moduleVideos: boolean;
  moduleCastCrew: boolean;
  moduleAdsManager: boolean;
  moduleSubscriptions: boolean;
  modulePlans: boolean;
  maintenanceMode: boolean;
  userRegistration: boolean;
  socialLogin: boolean;
  twoFactorAuth: boolean;
  emailVerification: boolean;
  googleClientId: string;
  appleClientId: string;
  appleTeamId: string;
  appleKeyId: string;
  vipTitle: string;
  vipHighlight: string;
  vipSubtitle: string;
  primaryColor: string;
  colorTheme: string;
  navbarStyle: 'glass' | 'sticky' | 'transparent' | 'default';
  navbarHide: boolean;
  cardStyle: 'default' | 'glass' | 'transparent';
  menuStyle: 'mini' | 'hover' | 'boxed' | 'soft';
  activeMenuStyle: string;
  footerStyle: 'default' | 'sticky';
  // Mail
  mailEmail: string;
  mailDriver: string;
  mailHost: string;
  mailPort: string;
  mailEncryption: string;
  mailUsername: string;
  mailPassword: string;
  mailFrom: string;
  mailFromName: string;
  // Notifications
  fcmServerKey: string;
  fcmSenderId: string;
  firebaseApiKey: string;
  firebaseProjectId: string;
  firebaseAppId: string;
  // Language
  defaultLanguage: string;
  rtlSupport: boolean;
  // Notification Configuration
  notifNewUser: boolean;
  notifNewSubscription: boolean;
  notifNewContent: boolean;
  notifPaymentSuccess: boolean;
  notifPaymentFailed: boolean;
  notifContentExpiry: boolean;
  // Currency
  currencyCode: string;
  currencySymbol: string;
  currencyPosition: 'before' | 'after';
  decimalPlaces: number;
  // Storage
  storageDriver: 'local' | 's3' | 'digitalocean' | 'bunny';
  awsAccessKeyId: string;
  awsSecretAccessKey: string;
  awsRegion: string;
  awsBucket: string;
  awsPathStyleEndpoint: boolean;
  doAccessKey: string;
  doSecretKey: string;
  doRegion: string;
  doBucket: string;
  doCdnUrl: string;
  doPathStyle: boolean;
  bunnyStorageZone: string;
  bunnyAccessKey: string;
  bunnyCdnUrl: string;
  // SEO
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  googleAnalyticsId: string;
  seoImage: string;
  googleVerification: string;
  canonicalUrl: string;
  // Ad Networks
  adNetworkEnabled: boolean;
  adMobPublisherId: string;
  adMobAppIdAndroid: string;
  adMobAppIdIos: string;
  adMobBannerAndroid: string;
  adMobBannerIos: string;
  adMobInterstitialAndroid: string;
  adMobInterstitialIos: string;
  vastPrerollUrl: string;
  vastMidrollUrl: string;
  // Payments
  razorpayEnabled: boolean;
  razorpayKeyId: string;
  razorpayKeySecret: string;
}

const DEFAULT: AppSettings = {
  logoUrl: "https://i.imgur.com/45cG5Kc.png",
  darkLogoUrl: "https://i.imgur.com/45cG5Kc.png",
  lightLogoUrl: "https://i.imgur.com/45cG5Kc.png",
  faviconUrl: "",
  logoStyle: "fill",
  platformName: "Triple Minds",
  contactNo: "",
  inquiryEmail: "",
  siteDescription: "",
  copyrightText: "© 2026 Triple Minds. All Rights Reserved.",
  facebookUrl: "",
  twitterUrl: "",
  instagramUrl: "",
  youtubeUrl: "",
  loginTitle: "Welcome Back",
  loginSubtitle: "Admin Console",
  loginButtonText: "Sign In",
  headerCode: "",
  footerCode: "",
  moduleUsers: true,
  moduleLanguages: true,
  moduleAds: true,
  modulePromotions: true,
  moduleBanners: true,
  modulePages: true,
  moduleMovies: true,
  moduleTvShows: true,
  moduleLiveTV: true,
  moduleVideos: true,
  moduleCastCrew: true,
  moduleAdsManager: true,
  moduleSubscriptions: true,
  modulePlans: true,
  maintenanceMode: false,
  userRegistration: true,
  socialLogin: true,
  twoFactorAuth: false,
  emailVerification: true,
  googleClientId: '',
  appleClientId: '',
  appleTeamId: '',
  appleKeyId: '',
  vipTitle: "Unlock the",
  vipHighlight: "Ultimate Experience",
  vipSubtitle: "Get unlimited ad-free streaming, offline downloads, and exclusive access to our premium catalog.",
  primaryColor: "#e50914",
  colorTheme: "blue-green",
  navbarStyle: 'default',
  navbarHide: false,
  cardStyle: 'default',
  menuStyle: 'hover',
  activeMenuStyle: 'left-bordered',
  footerStyle: 'default',
  // Mail
  mailEmail: "info@tripleminds.com",
  mailDriver: "smtp",
  mailHost: "smtp.gmail.com",
  mailPort: "587",
  mailEncryption: "tls",
  mailUsername: "",
  mailPassword: "",
  mailFrom: "info@tripleminds.com",
  mailFromName: "Triple Minds",
  // Notifications
  fcmServerKey: "",
  fcmSenderId: "",
  firebaseApiKey: "",
  firebaseProjectId: "",
  firebaseAppId: "",
  // Language
  defaultLanguage: "en",
  rtlSupport: false,
  // Notification Configuration
  notifNewUser: true,
  notifNewSubscription: true,
  notifNewContent: false,
  notifPaymentSuccess: true,
  notifPaymentFailed: true,
  notifContentExpiry: false,
  // Currency
  currencyCode: "USD",
  currencySymbol: "$",
  currencyPosition: 'before',
  decimalPlaces: 2,
  // Storage
   storageDriver: 'local',
   awsAccessKeyId: "",
   awsSecretAccessKey: "",
   awsRegion: "",
   awsBucket: "",
   awsPathStyleEndpoint: false,
   doAccessKey: "",
   doSecretKey: "",
   doRegion: "nyc3",
   doBucket: "",
   doCdnUrl: "",
   doPathStyle: true,
   bunnyStorageZone: "",
  bunnyAccessKey: "",
  bunnyCdnUrl: "",
  // SEO
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  googleAnalyticsId: "",
  seoImage: "",
  googleVerification: "",
  canonicalUrl: "",
  // Ad Networks
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
  // Payments
  razorpayEnabled: false,
  razorpayKeyId: "",
  razorpayKeySecret: "",
};

const STORAGE_KEY = "tripleMindesSettings";

function mapApiData(api: any): AppSettings {
  const img = (v: string) => (v ? getImageUrl(v) : "");
  return {
    logoUrl: img(api.logoUrl),
    darkLogoUrl: img(api.darkLogoUrl),
    lightLogoUrl: img(api.lightLogoUrl),
    faviconUrl: img(api.faviconUrl),
    logoStyle: api.logoStyle || DEFAULT.logoStyle,
    platformName: api.platformName || "",
    contactNo: api.contactNo || "",
    inquiryEmail: api.inquiryEmail || "",
    siteDescription: api.siteDescription || "",
    copyrightText: api.copyrightText || "",
    facebookUrl: api.facebookUrl || "",
    twitterUrl: api.twitterUrl || "",
    instagramUrl: api.instagramUrl || "",
    youtubeUrl: api.youtubeUrl || "",
    loginTitle: api.loginTitle || DEFAULT.loginTitle,
    loginSubtitle: api.loginSubtitle || DEFAULT.loginSubtitle,
    loginButtonText: api.loginButtonText || DEFAULT.loginButtonText,
    headerCode: api.headerCode || "",
    footerCode: api.footerCode || "",
    moduleUsers: api.moduleUsers ?? DEFAULT.moduleUsers,
    moduleLanguages: api.moduleLanguages ?? DEFAULT.moduleLanguages,
    moduleAds: api.moduleAds ?? DEFAULT.moduleAds,
    modulePromotions: api.modulePromotions ?? DEFAULT.modulePromotions,
    moduleBanners: api.moduleBanners ?? DEFAULT.moduleBanners,
    modulePages: api.modulePages ?? DEFAULT.modulePages,
    moduleMovies: api.moduleMovies ?? DEFAULT.moduleMovies,
    moduleTvShows: api.moduleTvShows ?? DEFAULT.moduleTvShows,
    moduleLiveTV: api.moduleLiveTV ?? DEFAULT.moduleLiveTV,
    moduleVideos: api.moduleVideos ?? DEFAULT.moduleVideos,
    moduleCastCrew: api.moduleCastCrew ?? DEFAULT.moduleCastCrew,
    moduleAdsManager: api.moduleAdsManager ?? DEFAULT.moduleAdsManager,
    moduleSubscriptions: api.moduleSubscriptions ?? DEFAULT.moduleSubscriptions,
    modulePlans: api.modulePlans ?? DEFAULT.modulePlans,
    maintenanceMode: api.maintenanceMode ?? DEFAULT.maintenanceMode,
    userRegistration: api.userRegistration ?? DEFAULT.userRegistration,
    socialLogin: api.socialLogin ?? DEFAULT.socialLogin,
    twoFactorAuth: api.twoFactorAuth ?? DEFAULT.twoFactorAuth,
    emailVerification: api.emailVerification ?? DEFAULT.emailVerification,
    googleClientId: api.googleClientId || '',
    appleClientId: api.appleClientId || "",
    appleTeamId: api.appleTeamId || "",
    appleKeyId: api.appleKeyId || "",
    vipTitle: api.vipTitle || DEFAULT.vipTitle,
    vipHighlight: api.vipHighlight || DEFAULT.vipHighlight,
    vipSubtitle: api.vipSubtitle || DEFAULT.vipSubtitle,
    primaryColor: api.primaryColor || DEFAULT.primaryColor,
    colorTheme: api.colorTheme || DEFAULT.colorTheme,
    navbarStyle: api.navbarStyle || DEFAULT.navbarStyle,
    navbarHide: api.navbarHide ?? DEFAULT.navbarHide,
    cardStyle: api.cardStyle || DEFAULT.cardStyle,
    menuStyle: api.menuStyle || DEFAULT.menuStyle,
    activeMenuStyle: api.activeMenuStyle || DEFAULT.activeMenuStyle,
    footerStyle: api.footerStyle || DEFAULT.footerStyle,
    // Mail
    mailEmail: api.mailEmail || "",
    mailDriver: api.mailDriver || DEFAULT.mailDriver,
    mailHost: api.mailHost || DEFAULT.mailHost,
    mailPort: api.mailPort || DEFAULT.mailPort,
    mailEncryption: api.mailEncryption || DEFAULT.mailEncryption,
    mailUsername: api.mailUsername || "",
    mailPassword: api.mailPassword || "",
    mailFrom: api.mailFrom || "",
    mailFromName: api.mailFromName || DEFAULT.mailFromName,
    // Notifications
    fcmServerKey: api.fcmServerKey || "",
    fcmSenderId: api.fcmSenderId || "",
    firebaseApiKey: api.firebaseApiKey || "",
    firebaseProjectId: api.firebaseProjectId || "",
    firebaseAppId: api.firebaseAppId || "",
    // Language
    defaultLanguage: api.defaultLanguage || DEFAULT.defaultLanguage,
    rtlSupport: api.rtlSupport ?? DEFAULT.rtlSupport,
    // Notification Configuration
    notifNewUser: api.notifNewUser ?? DEFAULT.notifNewUser,
    notifNewSubscription: api.notifNewSubscription ?? DEFAULT.notifNewSubscription,
    notifNewContent: api.notifNewContent ?? DEFAULT.notifNewContent,
    notifPaymentSuccess: api.notifPaymentSuccess ?? DEFAULT.notifPaymentSuccess,
    notifPaymentFailed: api.notifPaymentFailed ?? DEFAULT.notifPaymentFailed,
    notifContentExpiry: api.notifContentExpiry ?? DEFAULT.notifContentExpiry,
    // Currency
    currencyCode: api.currencyCode || DEFAULT.currencyCode,
    currencySymbol: api.currencySymbol || DEFAULT.currencySymbol,
    currencyPosition: api.currencyPosition || DEFAULT.currencyPosition,
    decimalPlaces: api.decimalPlaces ?? DEFAULT.decimalPlaces,
    // Storage
     storageDriver: api.storageDriver || DEFAULT.storageDriver,
     awsAccessKeyId: api.awsAccessKeyId || "",
     awsSecretAccessKey: api.awsSecretAccessKey || "",
     awsRegion: api.awsRegion || "",
     awsBucket: api.awsBucket || "",
     awsPathStyleEndpoint: api.awsPathStyleEndpoint || false,
     doAccessKey: api.doAccessKey || "",
     doSecretKey: api.doSecretKey || "",
     doRegion: api.doRegion || "nyc3",
     doBucket: api.doBucket || "",
     doCdnUrl: api.doCdnUrl || "",
     doPathStyle: api.doPathStyle ?? true,
     bunnyStorageZone: api.bunnyStorageZone || "",
    bunnyAccessKey: api.bunnyAccessKey || "",
    bunnyCdnUrl: api.bunnyCdnUrl || "",
    // SEO
    metaTitle: api.metaTitle || "",
    metaDescription: api.metaDescription || "",
    metaKeywords: api.metaKeywords || "",
    googleAnalyticsId: api.googleAnalyticsId || "",
    seoImage: img(api.seoImage),
    googleVerification: api.googleVerification || "",
    canonicalUrl: api.canonicalUrl || "",
    // Ad Networks
    adNetworkEnabled: api.adNetworkEnabled ?? DEFAULT.adNetworkEnabled,
    adMobPublisherId: api.adMobPublisherId || "",
    adMobAppIdAndroid: api.adMobAppIdAndroid || "",
    adMobAppIdIos: api.adMobAppIdIos || "",
    adMobBannerAndroid: api.adMobBannerAndroid || "",
    adMobBannerIos: api.adMobBannerIos || "",
    adMobInterstitialAndroid: api.adMobInterstitialAndroid || "",
    adMobInterstitialIos: api.adMobInterstitialIos || "",
    vastPrerollUrl: api.vastPrerollUrl || "",
    vastMidrollUrl: api.vastMidrollUrl || "",
    // Payments
    razorpayEnabled: api.razorpayEnabled ?? DEFAULT.razorpayEnabled,
    razorpayKeyId: api.razorpayKeyId || "",
    razorpayKeySecret: api.razorpayKeySecret || "",
  };
}

function applyFavicon(url: string) {
  if (!url) return;
  let link = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

function hexToHsl(hex: string) {
  hex = hex.replace(/^#/, '');
  if (hex.length === 3) hex = hex.split('').map(x => x + x).join('');
  let r = parseInt(hex.substring(0, 2), 16) / 255;
  let g = parseInt(hex.substring(2, 4), 16) / 255;
  let b = parseInt(hex.substring(4, 6), 16) / 255;
  let max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function applyColorTheme(theme: string) {
  const root = document.documentElement;
  
  // Base primary colors in HSL for Tailwind
  const themeMap: Record<string, string> = {
    "blue-green": "217 91% 60%", // #3b82f6
    "orange-yellow": "24 95% 53%", // #f97316
    "pink-purple": "330 81% 60%", // #ec4899
    "purple-orange": "258 90% 66%", // #8b5cf6
    "green-pink": "142 71% 45%", // #22c55e
  };

  let hsl = themeMap[theme] || "357 93% 47%"; // Default to red
  if (theme && theme.startsWith('#')) {
    hsl = hexToHsl(theme);
  }
  
  root.style.setProperty('--primary', hsl);
  root.style.setProperty('--ring', hsl);
  root.style.setProperty('--sidebar-primary', hsl);
  root.style.setProperty('--sidebar-ring', hsl);
}

export function applyBodyClasses(cardStyle: string, menuStyle: string) {
  const body = document.body;
  
  // Clean up old classes
  body.classList.remove('card-style-default', 'card-style-glass', 'card-style-transparent');
  body.classList.remove('menu-style-mini', 'menu-style-hover', 'menu-style-boxed', 'menu-style-soft');
  
  // Apply new classes
  if (cardStyle) body.classList.add(`card-style-${cardStyle}`);
  if (menuStyle) body.classList.add(`menu-style-${menuStyle}`);
}


interface SettingsContextType {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;
  refreshSettings: () => Promise<void>;
  isLoading: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
         const parsed = JSON.parse(raw);
         // Clear stale logo URLs from external services (imgur, S3)
         const cleanupStaleUrl = (v: string) => {
           if (!v) return v;
           if (v.includes("imgur.com")) return "";
           if (v.includes("amazonaws.com")) return "";
           return v;
         };
         parsed.logoUrl = cleanupStaleUrl(parsed.logoUrl);
         parsed.darkLogoUrl = cleanupStaleUrl(parsed.darkLogoUrl);
         parsed.lightLogoUrl = cleanupStaleUrl(parsed.lightLogoUrl);
         parsed.faviconUrl = cleanupStaleUrl(parsed.faviconUrl);
         parsed.seoImage = cleanupStaleUrl(parsed.seoImage);
        const s = { ...DEFAULT, ...parsed };
        applyColorTheme(s.colorTheme);
        applyBodyClasses(s.cardStyle, s.menuStyle);
        return s;
      }
    } catch {}
    return DEFAULT;
  });
  const [isLoading, setIsLoading] = useState(false);

  const persist = (s: AppSettings) => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
  };

  const refreshSettings = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await getSettings();
      const mapped = mapApiData(data);
      setSettings(mapped);
      persist(mapped);
      applyFavicon(mapped.faviconUrl);
      applyColorTheme(mapped.colorTheme);
      applyBodyClasses(mapped.cardStyle, mapped.menuStyle);
      applyColorTheme(mapped.colorTheme);
      applyBodyClasses(mapped.cardStyle, mapped.menuStyle);
    } catch (e) {
      console.warn("Settings fetch failed, using cached values:", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      persist(next);
      if (patch.faviconUrl) applyFavicon(patch.faviconUrl);
      return next;
    });
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, refreshSettings, isLoading }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used within SettingsProvider");
  return ctx;
}
