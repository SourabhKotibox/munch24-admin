
import { Switch, Route, Router as WouterRouter, useLocation } from "wouter";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "next-themes";
import { useEffect, useState } from "react";

import { Layout } from "@/components/layout";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { SettingsProvider, useSettings } from "@/contexts/SettingsContext";
import { useGetMe } from "@/lib/api-client";

// Helper to convert hex to HSL
function hexToHSL(hex: string): { h: number; s: number; l: number } {
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  let max = Math.max(r, g, b);
  let min = Math.min(r, g, b);
  let h = 0, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // achromatic
  } else {
    let d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h = Math.round(h * 60);
  }
  s = Math.round(s * 100);
  l = Math.round(l * 100);
  return { h, s, l };
}

// Color themes data
const COLOR_THEMES = [
  { id: "blue-green", a: "#3b82f6", b: "#10b981" },
  { id: "orange-yellow", a: "#f97316", b: "#eab308" },
  { id: "pink-purple", a: "#ec4899", b: "#a855f7" },
  { id: "purple-orange", a: "#8b5cf6", b: "#f97316" },
  { id: "green-pink", a: "#22c55e", b: "#ec4899" },
];

// Component to apply custom theme
function ThemeApplier() {
  const { settings } = useSettings();
  const [location] = useLocation();
  
  useEffect(() => {
    const root = document.documentElement;
    
    // Find selected color theme
    const theme = COLOR_THEMES.find(t => t.id === settings.colorTheme);
    let primaryColor = settings.primaryColor;
    
    if (theme && !settings.primaryColor) {
      primaryColor = theme.a;
    }
    
    // Convert primary color to HSL
    const hsl = hexToHSL(primaryColor || "#e50914");
    root.style.setProperty("--primary", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    root.style.setProperty("--sidebar-primary", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    root.style.setProperty("--destructive", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    root.style.setProperty("--ring", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
    root.style.setProperty("--chart-1", `${hsl.h} ${hsl.s}% ${hsl.l}%`);
  }, [settings.colorTheme, settings.primaryColor]);

  useEffect(() => {
    const name = settings.platformName || "Flipshorts";
    
    // Convert path to a readable page name
    const pathSegments = location.split('/').filter(Boolean);
    let pageName = "Home";
    
    if (pathSegments.length > 0) {
      const firstSegment = pathSegments[0];
      // Convert e.g., "user-profile" to "User Profile"
      pageName = firstSegment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    }
    
    // Identify frontend routes
    const frontendPrefixes = [
      "/wallet", "/membership", "/account", "/wishlist", 
      "/help-support", "/browse", "/tv-shows-browse", 
      "/drama", "/show", "/movie", "/page", "/login", "/register"
    ];
    
    const isFrontend = location === "/" || location === "" || frontendPrefixes.some(p => location.startsWith(p));
    const suffix = isFrontend ? name : `${name} Admin`;
    
    // Check if it's the root
    if (location === "/" || location === "") {
      document.title = `Home | ${name}`;
    } else {
      document.title = `${pageName} | ${suffix}`;
    }
  }, [settings.platformName, location]);

  return null;
}

import NotFound from "@/pages/not-found";
import Login from "@/pages/login";
import Dashboard from "@/pages/dashboard";
import UsersList from "@/pages/users-list";
import UserDetail from "@/pages/user-detail";
import LanguagesList from "@/pages/languages-list";
import PromotionsList from "@/pages/promotions-list";
import PromotionForm from "@/pages/promotion-form";
import BannersPage from "@/pages/banners";
import BannerForm from "@/pages/banner-form";
import BannerShowDetail from "@/pages/banner-show-detail";
import ShowsPage from "@/pages/shows";
import ShowForm from "@/pages/show-form";
import ShowDetail from "@/pages/show-detail";
import PagesPage from "@/pages/pages";
import PageForm from "@/pages/page-form";
import AdsPage from "@/pages/ads";
import AdForm from "@/pages/ad-form";
import Settings from "@/pages/settings";
import Branding from "@/pages/branding";
import IconsPage from "@/pages/icons";
import MediaLibraryPage from "@/pages/media-library";
import GenresPage from "@/pages/genres";
import GenreFormPage from "@/pages/genre-form";
import PlansPage from "@/pages/plans";
import PlanFormPage from "@/pages/plan-form";
import SubscriptionsListPage from "@/pages/subscriptions-list";
import SubscriptionFormPage from "@/pages/subscription-form";
import PlanLimitsPage from "@/pages/plan-limits";
import PlanLimitFormPage from "@/pages/plan-limit-form";
import FaqListPage from "@/pages/faq-list";
import FaqFormPage from "@/pages/faq-form";
import ActorsListPage from "@/pages/actors-list";
import ActorFormPage from "@/pages/actor-form";
import DirectorsListPage from "@/pages/directors-list";
import DirectorFormPage from "@/pages/director-form";
import CrewListPage from "@/pages/crew-list";
import CrewFormPage from "@/pages/crew-form";
import CountriesListPage from "@/pages/countries-list";
import CountryFormPage from "@/pages/country-form";
import NotificationListPage from "@/pages/notification-list";
import NotificationTemplatesPage from "@/pages/notification-templates";
import NotificationTemplateFormPage from "@/pages/notification-template-form";
import ProfilePage from "@/pages/profile";
import AppManagement from "@/pages/app-management";
import HomeSections from "@/pages/home-sections";
import WebHomeSections from "@/pages/web-home-sections";
import MoviesPage from "@/pages/movies";
import MovieForm from "@/pages/movie-form";
import TvShowsPage from "@/pages/tv-shows";
import TvShowForm from "@/pages/tv-show-form";
import SeasonsPage from "@/pages/seasons";
import SeasonForm from "@/pages/season-form";
import EpisodesPage from "@/pages/episodes";
import EpisodeForm from "@/pages/episode-form";
import StreamingHomePage from "@/pages/streaming-home";
import MovieDetailPage from "@/pages/movie-detail";
import EpisodeDetailPage from "@/pages/episode-detail";
import TVShowDetailPage from "@/pages/tv-show-detail";
import ShortDramaPlayer from "@/pages/short-drama-player";
import CoinPackagesPage from "@/pages/coin-packages";
import CategoriesBrowsePage from "@/pages/categories-browse";
import PublicAuthPage from "@/pages/public-auth";
import TvShowsPublicPage from "@/pages/tv-shows-public";
import UserProfilePage from "@/pages/user-profile";
import WalletPage from "@/pages/wallet";
import MembershipPage from "@/pages/membership";
import PublicPagePage from "@/pages/public-page";
import WishlistPage from "@/pages/wishlist";
import HelpSupportPage from "@/pages/help-support";
import InfluencersPage from "@/pages/influencers";
import ApprovalsPage from "@/pages/approvals";
import ShortDramasPage from "@/pages/short-dramas";
import ShortDramaForm from "@/pages/short-drama-form";
import ShortDramaDetail from "@/pages/short-drama-detail";
import ShortDramaSeasonsPage from "@/pages/short-drama-seasons";
import ShortDramaEpisodesPage from "@/pages/short-drama-episodes";
import GoogleAdsPage from "@/pages/google-ads";
import NewHotManagement from "@/pages/new-hot-management";
import Reviews from "@/pages/reviews";
import RewardsManagementPage from "@/pages/rewards-management";
import RevenueAnalyticsPage from "@/pages/revenue-analytics";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Route to permission map
const routePermissions: Record<string, string | null> = {
  "/dashboard": null,
  "/media-library": "mediaLibrary",
  "/app-management": null,
  "/home-sections": "categories",
  "/influencers": "influencers",
  "/approvals": "movies",
  "/users": "subscriptions",
  "/languages": "languages",
  "/genres": "genres",
  "/movies": "movies",
  "/shows": "shows",
  "/tv-shows": "shows",
  "/seasons": "shows",
  "/episodes": "shows",
  "/categories": "categories",
  "/ads": "ads",
  "/google-ads": "ads",
  "/pages": "pages",
  "/promotions": "promotions",
  "/banners": "banners",
  "/reviews": "reviews",
  "/faq": "faqs",
  "/actors": "actors",
  "/directors": "directors",
  "/crew": "actors",
  "/countries": "languages",
  "/subscriptions": "subscriptions",
  "/plans": "subscriptionPlans",
  "/plan-limits": "planLimits",
  "/notifications": "notifications",
  "/notification-templates": "notificationTemplates",
  "/settings": "settings",
  "/settings/branding": "settings",
  "/settings/icons": "settings",
  "/profile": null,
  "/short-dramas": "shortDramas",
  "/short-drama-seasons": "shortDramas",
  "/short-drama-episodes": "shortDramas",
  "/coin-packages": "subscriptionPlans",
  "/rewards-management": "subscriptionPlans",
  "/revenue-analytics": "subscriptionPlans",
};

const hasPermissionForRoute = (path: string, user: any): boolean => {
  if (user?.role === "superadmin") return true;
  
  // Find matching route (check exact first, then prefixes)
  let permission: string | null = null;
  for (const [route, perm] of Object.entries(routePermissions)) {
    if (path === route || path.startsWith(route + "/")) {
      permission = perm;
      break;
    }
  }
  
  if (permission === null) return true;
  
  const modulePerms = user?.modulePermissions?.[permission as keyof typeof user.modulePermissions];
  if (!modulePerms) return false;
  
  return (modulePerms as any).canView || (modulePerms as any).canUpload;
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const token = localStorage.getItem("adminAccessToken");
  const { data: user, isLoading, error } = useGetMe();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!token) {
      setLocation("/admin/login");
    } else if (!isLoading && error) {
      localStorage.removeItem("adminAccessToken");
      localStorage.removeItem("adminRefreshToken");
      queryClient.clear();
      setLocation("/admin/login");
    } else if (!isLoading && user === null) {
      localStorage.removeItem("adminAccessToken");
      localStorage.removeItem("adminRefreshToken");
      queryClient.clear();
      setLocation("/admin/login");
    }
  }, [token, isLoading, error, user, setLocation, queryClient]);

  if (!token) return null;
  
  if (isLoading) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  
  if (error) {
    console.error("Error fetching user:", error);
    // While redirecting, show nothing or a subtle message instead of an error block
    return <div className="min-h-screen flex items-center justify-center">Session expired. Redirecting...</div>;
  }

  if (user === null) {
    return <div className="min-h-screen flex items-center justify-center">Session expired. Redirecting...</div>;
  }
  
  // Check permission
  const currentPath = location;
  if (!hasPermissionForRoute(currentPath, user)) {
    return <div className="min-h-screen flex items-center justify-center">Access Denied</div>;
  }

  return <>{children}</>;
}


function AdminRoutes() {
  return (
    <Layout>
      <ProtectedRoute>
      <Switch>
        <Route path="/dashboard" component={Dashboard} />
              <Route path="/users" component={UsersList} />
              <Route path="/users/:id" component={UserDetail} />
              <Route path="/languages" component={LanguagesList} />
              <Route path="/promotions/new" component={PromotionForm} />
              <Route path="/promotions/:id" component={PromotionForm} />
              <Route path="/promotions" component={PromotionsList} />
              <Route path="/banners/new" component={BannerForm} />
              <Route path="/banners/:id" component={BannerForm} />
              <Route path="/banners/shows/:contentId" component={BannerShowDetail} />
              <Route path="/banners" component={BannersPage} />
              <Route path="/shows/new" component={ShowForm} />
              <Route path="/shows/:id/edit" component={ShowForm} />
              <Route path="/shows/:id" component={ShowDetail} />
              <Route path="/shows" component={ShowsPage} />
              <Route path="/movies/new" component={MovieForm} />
              <Route path="/movies/:id/edit" component={MovieForm} />
              <Route path="/movies" component={MoviesPage} />
              <Route path="/tv-shows/new" component={TvShowForm} />
              <Route path="/tv-shows/:id/edit" component={TvShowForm} />
              <Route path="/tv-shows" component={TvShowsPage} />
              <Route path="/seasons/new" component={SeasonForm} />
              <Route path="/seasons/:id/edit" component={SeasonForm} />
              <Route path="/seasons" component={SeasonsPage} />
              <Route path="/episodes/new" component={EpisodeForm} />
              <Route path="/episodes/:id/edit" component={EpisodeForm} />
              <Route path="/episodes" component={EpisodesPage} />
              <Route path="/ads/:id" component={AdForm} />
              <Route path="/ads" component={AdsPage} />
              <Route path="/google-ads" component={GoogleAdsPage} />
              <Route path="/pages/:id" component={PageForm} />
              <Route path="/pages" component={PagesPage} />
              <Route path="/media-library" component={MediaLibraryPage} />
              <Route path="/genres/new" component={GenreFormPage} />
              <Route path="/genres/:id/edit" component={GenreFormPage} />
              <Route path="/genres" component={GenresPage} />
              <Route path="/plans/new" component={PlanFormPage} />
              <Route path="/plans/:id/edit" component={PlanFormPage} />
              <Route path="/plans" component={PlansPage} />
              <Route path="/subscriptions/new" component={SubscriptionFormPage} />
              <Route path="/subscriptions/:id/edit" component={SubscriptionFormPage} />
              <Route path="/subscriptions" component={SubscriptionsListPage} />
              <Route path="/plan-limits/new" component={PlanLimitFormPage} />
              <Route path="/plan-limits/:id/edit" component={PlanLimitFormPage} />
              <Route path="/plan-limits" component={PlanLimitsPage} />
              <Route path="/faq/new" component={FaqFormPage} />
              <Route path="/faq/:id/edit" component={FaqFormPage} />
              <Route path="/faq" component={FaqListPage} />
              <Route path="/actors/new" component={ActorFormPage} />
              <Route path="/actors/:id/edit" component={ActorFormPage} />
              <Route path="/actors" component={ActorsListPage} />
              <Route path="/directors/new" component={DirectorFormPage} />
              <Route path="/directors/:id/edit" component={DirectorFormPage} />
              <Route path="/directors" component={DirectorsListPage} />
              <Route path="/crew/new" component={CrewFormPage} />
              <Route path="/crew/:id/edit" component={CrewFormPage} />
              <Route path="/crew" component={CrewListPage} />
              <Route path="/countries/new" component={CountryFormPage} />
              <Route path="/countries/:id/edit" component={CountryFormPage} />
              <Route path="/countries" component={CountriesListPage} />
              <Route path="/profile" component={ProfilePage} />
              <Route path="/notifications" component={NotificationListPage} />
              <Route path="/notification-templates/:id/edit" component={NotificationTemplateFormPage} />
              <Route path="/notification-templates" component={NotificationTemplatesPage} />
              <Route path="/settings/icons" component={IconsPage} />
              <Route path="/settings/branding" component={Branding} />
              <Route path="/settings" component={Settings} />
              <Route path="/app-management" component={AppManagement} />
              <Route path="/home-sections" component={HomeSections} />
              <Route path="/web-home-sections" component={WebHomeSections} />
              <Route path="/reviews" component={Reviews} />
              <Route path="/new-hot" component={NewHotManagement} />
              <Route path="/influencers" component={InfluencersPage} />
              <Route path="/approvals" component={ApprovalsPage} />
              <Route path="/short-dramas/new" component={ShortDramaForm} />
              <Route path="/short-dramas/:id/edit" component={ShortDramaForm} />
              <Route path="/short-dramas/:id" component={ShortDramaDetail} />
              <Route path="/short-dramas" component={ShortDramasPage} />
              <Route path="/short-drama-seasons/new" component={SeasonForm} />
              <Route path="/short-drama-seasons/:id/edit" component={SeasonForm} />
              <Route path="/short-drama-seasons/:id" component={SeasonForm} />
              <Route path="/short-drama-seasons" component={ShortDramaSeasonsPage} />
              <Route path="/short-drama-episodes/new" component={EpisodeForm} />
              <Route path="/short-drama-episodes/:id/edit" component={EpisodeForm} />
              <Route path="/short-drama-episodes/:id" component={EpisodeForm} />
              <Route path="/short-drama-episodes" component={ShortDramaEpisodesPage} />
              <Route path="/coin-packages" component={CoinPackagesPage} />
              <Route path="/rewards-management" component={RewardsManagementPage} />
              <Route path="/revenue-analytics" component={RevenueAnalyticsPage} />
        <Route component={NotFound} />
      </Switch>
    </ProtectedRoute>
    </Layout>
  );
}


function Router() {
  const token = localStorage.getItem("adminAccessToken");
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (token && location === "/admin/login") {
      setLocation("/dashboard");
    }
  }, [token, location, setLocation]);

  return (
    <Switch>
      {/* Admin routes */}
      <Route path="/admin/login" component={Login} />

      {/* Public streaming routes */}
      <Route path="/" component={StreamingHomePage} />
      <Route path="/login" component={PublicAuthPage} />
      <Route path="/register" component={PublicAuthPage} />
      <Route path="/movie/:id" component={MovieDetailPage} />
      <Route path="/show/:id" component={TVShowDetailPage} />
      <Route path="/show/:showTitle/episode/:epNum" component={EpisodeDetailPage} />
      <Route path="/drama/:id/episode/:epNum" component={ShortDramaPlayer} />
      <Route path="/browse/:tab" component={CategoriesBrowsePage} />
      <Route path="/browse" component={CategoriesBrowsePage} />
      <Route path="/tv-shows-browse" component={TvShowsPublicPage} />
      <Route path="/account" component={UserProfilePage} />
      <Route path="/wishlist" component={WishlistPage} />
      <Route path="/help-support" component={HelpSupportPage} />
      <Route path="/page/:slug" component={PublicPagePage} />
      <Route path="/wallet" component={WalletPage} />
      <Route path="/membership" component={MembershipPage} />
      
      {/* Admin catch-all route (must be at the end) */}
      <Route>
        <AdminRoutes />
      </Route>
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="dark" enableSystem={false}>
      <LanguageProvider>
        <SettingsProvider>
          <ThemeApplier />
          <QueryClientProvider client={queryClient}>
            <TooltipProvider>
              <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
                <Router />
              </WouterRouter>
              <Toaster />
            </TooltipProvider>
          </QueryClientProvider>
        </SettingsProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;
