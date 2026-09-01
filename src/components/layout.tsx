
import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetMe,
  useLogout,
  getImageUrl
} from "../lib/api-client";
import {
  Home,
  Users,
  Settings,
  LogOut,
  Menu,
  Film,
  Globe,
  X,
  FileText,
  ChevronRight,
  ChevronLeft,
  Bell,
  PlaySquare,
  PlusSquare,
  Megaphone,
  Layers,
  Languages,
  Image,
  Tags,
  CreditCard,
  Coins,
  ScrollText,
  Gauge,
  HelpCircle,
  UserRound,
  Clapperboard,
  BellRing,
  MailCheck,
  UserCog,
  Tv2,
  ChevronDown,
  Monitor,
  LayoutList,
  Video,
  Shield,
  CheckCircle,
  Flame,
  MessageSquare,
  Gift,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useLanguage, languages } from "@/contexts/LanguageContext";
import { useSettings } from "@/contexts/SettingsContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "next-themes";
import { HeaderNotifications } from "./HeaderNotifications";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<string[]>(["/tv-shows", "/short-dramas"]);
  const { data: user, isLoading } = useGetMe();
  const { language, setLanguage, t } = useLanguage();
  const { settings } = useSettings();

  const navSections = [
    {
      label: t('nav.main'),
      items: [
        { href: "/dashboard", label: t('nav.dashboard'), icon: Home, permission: null },
        { href: "/media-library", label: t('nav.mediaLibrary'), icon: Image, permission: "mediaLibrary" },
        { href: "/home-sections", label: "App Layout Builder", icon: LayoutList, permission: "categories" },
        { href: "/web-home-sections", label: "Web Layout Builder", icon: LayoutList, permission: "categories" },
        { href: "/new-hot", label: "New & Hot", icon: Flame, permission: "promotions" },
      ],
    },
    {
      label: "ACCESS MANAGEMENT",
      items: [
        { href: "/users", label: t('nav.users'), icon: Users, permission: "subscriptions" },
        { href: "/influencers", label: "Role-Based Access", icon: Shield, permission: "influencers" },
        { href: "/approvals", label: "Approvals", icon: CheckCircle, permission: "movies" },
      ],
    },
    {
      label: t('nav.mediaManagement'),
      items: [
        { href: "/languages", label: t('nav.languages'), icon: Languages, permission: "languages" },
        { href: "/genres", label: t('nav.genres'), icon: Tags, permission: "genres" },
        { href: "/movies", label: t('nav.movies'), icon: Film, permission: "movies" },
        
        {
          href: "/tv-shows",
          label: "TV Shows",
          icon: Tv2,
          permission: "shows",
          children: [
            { href: "/tv-shows", label: "TV Shows", icon: Monitor, permission: "shows" },
            { href: "/seasons", label: "Seasons", icon: LayoutList, permission: "shows" },
            { href: "/episodes", label: "Episodes", icon: Video, permission: "shows" },
          ],
        },
        {
          href: "/short-dramas",
          label: "Short Dramas",
          icon: Clapperboard,
          permission: "shortDramas",
          children: [
            { href: "/short-dramas", label: "Short Dramas", icon: Monitor, permission: "shortDramas" },
            { href: "/short-drama-seasons", label: "Seasons", icon: LayoutList, permission: "shortDramas" },
            { href: "/short-drama-episodes", label: "Episodes", icon: Video, permission: "shortDramas" },
          ],
        },
        {
          href: "/ads-group",
          label: "Ads",
          icon: PlusSquare,
          permission: "ads",
          children: [
            { href: "/ads", label: "Manual Ads", icon: Monitor, permission: "ads" },
            { href: "/google-ads", label: "Ad Networks", icon: Globe, permission: "ads" },
          ],
        },
        { href: "/pages", label: t('nav.pages'), icon: FileText, permission: "pages" },
        { href: "/promotions", label: t('nav.promotions'), icon: Megaphone, permission: "promotions" },
        { href: "/banners", label: t('nav.banners'), icon: Layers, permission: "banners" },
        { href: "/faq", label: t('nav.faq'), icon: HelpCircle, permission: "faqs" },
        { href: "/reviews", label: "Reviews", icon: MessageSquare, permission: "reviews" },
      ],
    },
    {
      label: t('nav.castAndCrew'),
      items: [
        { href: "/actors", label: t('nav.actors'), icon: UserRound, permission: "actors" },
        { href: "/directors", label: t('nav.directors'), icon: Clapperboard, permission: "directors" },
        { href: "/crew", label: "Crew", icon: UserCog, permission: "actors" },
        { href: "/countries", label: "Countries", icon: Globe, permission: "languages" },
      ],
    },
    {
      label: t('nav.subscription'),
      items: [
        { href: "/subscriptions", label: t('nav.subscriptions'), icon: ScrollText, permission: "subscriptions" },
        { href: "/plans", label: t('nav.plans'), icon: CreditCard, permission: "subscriptionPlans" },
        { href: "/coin-packages", label: "Coin Packages", icon: Coins, permission: "subscriptionPlans" },
        { href: "/rewards-management", label: "Rewards & Tasks", icon: Gift, permission: "subscriptionPlans" },
        { href: "/revenue-analytics", label: "Revenue Analytics", icon: TrendingUp, permission: "subscriptionPlans" },
        { href: "/plan-limits", label: t('nav.planLimits'), icon: Gauge, permission: "planLimits" },
      ],
    },
    {
      label: t('nav.notifications'),
      items: [
        { href: "/notifications", label: t('nav.notificationList'), icon: BellRing, permission: "notifications" },
        { href: "/notification-templates", label: t('nav.templates'), icon: MailCheck, permission: "notificationTemplates" },
      ],
    },
    {
      label: t('nav.system'),
      items: [
      { href: "/settings", label: t('nav.settings'), icon: Settings, permission: "settings" },
      ],
    },
  ];

  const navItemsFlat = navSections.flatMap((s) =>
    s.items.flatMap((item) => ("children" in item && item.children ? item.children : [item]))
  );
  const { resolvedTheme } = useTheme();
  const logoutMutation = useLogout();

  useEffect(() => {
    if (!isLoading && user === null) {
      localStorage.removeItem("adminAccessToken");
      localStorage.removeItem("adminRefreshToken");
      setLocation("/admin/login");
    }
  }, [isLoading, user, setLocation]);

  const handleLogout = async () => {
    try {
      await logoutMutation.mutateAsync(undefined);
      setLocation("/admin/login");
    } catch (error) {
      console.error("Logout error:", error);
      setLocation("/admin/login");
    }
  };

  const hasPermission = (permission: string | null): boolean => {
    // Super admin has all permissions
    if (user?.role === "superadmin") return true;
    
    // If no permission required, show it
    if (!permission) return true;
    
    // Check module permissions
    const modulePerms = user?.modulePermissions?.[permission as keyof typeof user.modulePermissions];
    if (!modulePerms) return false;
    
    // Check if user has at least view permission
    return (modulePerms as any).canView || (modulePerms as any).canUpload;
  };

  const getLogoUrl = () => {
    if (resolvedTheme === "dark" && settings.darkLogoUrl)
      return getImageUrl(settings.darkLogoUrl);

    if (resolvedTheme === "light" && settings.lightLogoUrl)
      return getImageUrl(settings.lightLogoUrl);

    return getImageUrl(settings.logoUrl);
  };

  const isItemActive = (href: string) =>
    location === href || location.startsWith(href + "/");

  // Filter nav sections based on permissions
  const filteredNavSections = navSections
    .map(section => ({
      ...section,
      items: section.items.map(item => {
        if ("children" in item && item.children) {
          // Filter children first
          const filteredChildren = item.children.filter(child => hasPermission(child.permission));
          if (filteredChildren.length === 0) return null; // No children left, hide this item
          return { ...item, children: filteredChildren };
        }
        if (!hasPermission(item.permission)) return null;
        return item;
      }).filter(Boolean) as any[]
    }))
    .filter(section => section.items.length > 0);

  // Filter flat items too
  const filteredNavItemsFlat = filteredNavSections.flatMap((s) =>
    s.items.flatMap((item) => ("children" in item && item.children ? item.children : [item]))
  );

  // Expanded nav: sections with group headers
  const NavExpanded = ({ onClose }: { onClose?: () => void }) => (
    <div className="flex flex-col gap-5">
      {filteredNavSections.map((section) => (
        <div key={section.label}>
          <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground mb-1.5 px-3">
            {section.label}
          </p>
          <div className="flex flex-col gap-0.5">
            {section.items.map((item) => {
              const Icon = item.icon;
              const hasChildren = "children" in item && Array.isArray(item.children);

              if (hasChildren) {
                const children = (item as any).children as { href: string; label: string; icon: any }[];
                const isGroupActive = children.some((c) => isItemActive(c.href));
                const isExpanded = expandedGroups.includes(item.href);
                return (
                  <div key={item.href}>
                    <button
                      onClick={() =>
                        setExpandedGroups((prev) =>
                          prev.includes(item.href)
                            ? prev.filter((g) => g !== item.href)
                            : [...prev, item.href]
                        )
                      }
                      className={`group relative w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                        isGroupActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground hover:bg-muted hover:text-foreground"
                      }`}
                    >
                      {isGroupActive && (
                        <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-full bg-primary" />
                      )}
                      <span
                        className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors ${
                          isGroupActive ? "bg-primary/20 text-primary" : "text-muted-foreground group-hover:text-foreground"
                        }`}
                      >
                        <Icon className="h-[17px] w-[17px]" />
                      </span>
                      <span className="flex-1 text-left">{item.label}</span>
                      <ChevronDown
                        className={`h-4 w-4 shrink-0 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                      />
                    </button>
                    {isExpanded && (
                      <div className="ml-4 mt-0.5 flex flex-col gap-0.5 border-l border-border pl-2">
                        {children.map((child) => {
                          const childActive = isItemActive(child.href);
                          const ChildIcon = child.icon;
                          return (
                            <Link
                              key={child.href}
                              href={child.href}
                              onClick={() => onClose?.()}
                              className={`group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                                childActive
                                  ? "bg-muted text-foreground"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
                              }`}
                            >
                              <span
                                className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 transition-colors ${
                                  childActive ? "bg-primary/20 text-primary" : "text-muted-foreground group-hover:text-foreground"
                                }`}
                              >
                                <ChildIcon className="h-4 w-4" />
                              </span>
                              <span>{child.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              }

              const isActive = isItemActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => onClose?.()}
                  className={`group relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-muted text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-[6px] bottom-[6px] w-[3px] rounded-r-full bg-primary" />
                  )}
                  <span
                    className={`flex h-8 w-8 items-center justify-center rounded-lg shrink-0 transition-colors ${
                      isActive
                        ? "bg-primary/20 text-primary"
                        : "text-muted-foreground group-hover:text-foreground"
                    }`}
                  >
                    <Icon className="h-[17px] w-[17px]" />
                  </span>
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );

  // Collapsed nav: flat icon list with tooltips
  const NavCollapsed = () => (
    <div className="flex flex-col gap-1 items-center">
      {filteredNavItemsFlat.map((item) => {
        const isActive = isItemActive(item.href);
        const Icon = item.icon;
        return (
          <TooltipProvider key={item.href} disableHoverableContent>
            <Tooltip>
              <TooltipTrigger asChild>
                <Link
                  href={item.href}
                  className={`relative flex items-center justify-center h-10 w-10 rounded-lg transition-all duration-200 ${
                    isActive
                      ? "bg-muted text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />
                  )}
                  <Icon className="h-[18px] w-[18px]" />
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10} className="bg-popover text-foreground border-border text-xs">
                {item.label}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );

  const LogoComponent = ({ collapsed = false }: { collapsed?: boolean }) => {
    return (
      <div className="flex items-center justify-center gap-3">
        {getLogoUrl() ? (
          <img
            src={getLogoUrl()}
            alt="Logo"
            className="h-9 w-auto object-contain"
          />
        ) : (
          <Film className={`text-primary ${collapsed ? "h-7 w-7" : "h-9 w-9"}`} />
        )}
      </div>
    );
  };

  return (
    <div className="h-screen bg-background text-foreground flex flex-col md:flex-row overflow-hidden">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 border-b border-border bg-sidebar/90 backdrop-blur-xl sticky top-0 z-50">
        <LogoComponent />
        <div className="flex items-center gap-2">
          <Select value={language} onValueChange={(value: string) => setLanguage(value as any)}>
            <SelectTrigger className="w-28 bg-muted border-border text-foreground h-9 rounded-lg">
              <Globe className="h-4 w-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              {Object.entries(languages).map(([code, name]) => (
                <SelectItem key={code} value={code} className="text-foreground">{name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <HeaderNotifications />
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-muted-foreground">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar border-r border-border">
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <LogoComponent />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="text-muted-foreground rounded-lg h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <nav className="px-3 py-4 overflow-y-auto custom-scrollbar h-[calc(100%-140px)]">
                <NavExpanded onClose={() => setMobileMenuOpen(false)} />
              </nav>
              <div className="absolute bottom-0 left-0 right-0 px-4 py-4 border-t border-border bg-sidebar">
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-3 h-10 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted px-3"
                  onClick={handleLogout}
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/20 text-primary shrink-0">
                    <LogOut className="h-4 w-4" />
                  </span>
                  {t('nav.signOut')}
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col fixed left-0 top-0 bottom-0 bg-sidebar border-r border-border z-40 transition-all duration-300 ${
          sidebarCollapsed ? "w-[68px]" : "w-[260px]"
        }`}
      >
        {/* Logo */}
        <div
          className={`flex items-center border-b border-border ${
            sidebarCollapsed ? "justify-center px-3 py-4" : "justify-between px-5 py-4"
          }`}
        >
          <LogoComponent collapsed={sidebarCollapsed} />
          {!sidebarCollapsed && (
            <button
              className="h-7 w-7 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              onClick={() => setSidebarCollapsed(true)}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Nav */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-4 px-2">
          {sidebarCollapsed ? <NavCollapsed /> : <NavExpanded />}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-2 py-3">
          {sidebarCollapsed ? (
            <TooltipProvider disableHoverableContent>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center h-10 w-10 mx-auto rounded-lg text-muted-foreground hover:bg-muted hover:text-primary transition-colors"
                  >
                    <LogOut className="h-[18px] w-[18px]" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" sideOffset={10} className="bg-popover text-foreground border-border text-xs">
                  {t('nav.signOut')}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <>
              <button
                onClick={handleLogout}
                className="group w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 text-primary shrink-0">
                  <LogOut className="h-[17px] w-[17px]" />
                </span>
                {t('nav.signOut')}
              </button>
            </>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main
        className={`flex-1 flex flex-col transition-all duration-300 overflow-y-auto ${
          sidebarCollapsed ? "md:ml-[68px]" : "md:ml-[260px]"
        }`}
      >
        {/* Top Navbar */}
        {!settings.navbarHide && (
        <header className={`hidden md:flex items-center justify-between px-6 py-3.5 border-b border-border z-30 ${
          settings.navbarStyle === 'transparent' ? 'bg-transparent' :
          settings.navbarStyle === 'glass' ? 'bg-sidebar/50 backdrop-blur-md sticky top-0' :
          settings.navbarStyle === 'sticky' ? 'bg-sidebar sticky top-0' :
          'bg-sidebar/90 backdrop-blur-xl sticky top-0' // default
        }`}>
          <div className="flex items-center gap-3">
            {sidebarCollapsed && (
              <button
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                onClick={() => setSidebarCollapsed(false)}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            )}
            <h1 className="text-lg font-bold text-foreground">{t('nav.dashboard')}</h1>
          </div>
          <div className="flex items-center gap-2">
            <Select value={language} onValueChange={(value: string) => setLanguage(value as any)}>
              <SelectTrigger className="w-32 bg-muted border-border text-foreground h-9 rounded-lg text-sm">
                <Globe className="h-4 w-4 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                {Object.entries(languages).map(([code, name]) => (
                  <SelectItem key={code} value={code} className="text-foreground">{name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <HeaderNotifications />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="outline-none ring-0 focus:ring-0">
                  <Avatar className="h-9 w-9 rounded-xl cursor-pointer hover:opacity-90 transition-opacity border-2 border-primary/40 hover:border-primary/70">
                    {user?.avatar && (
                      <AvatarImage src={getImageUrl(user.avatar)} alt={user?.name || "Admin"} className="object-cover" />
                    )}
                    <AvatarFallback className="text-foreground font-bold text-sm bg-gradient-to-br from-primary to-primary/70 rounded-xl">
                      {user?.name?.charAt(0)?.toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-60 bg-card border border-border text-foreground p-0 overflow-hidden rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/50"
              >
                {/* User info header – theme-aware */}
                <div className="px-4 py-4 flex items-center gap-3 border-b border-border">
                  <Avatar className="h-11 w-11 rounded-xl shrink-0 border border-border">
                    {user?.avatar && (
                      <AvatarImage src={getImageUrl(user.avatar)} alt={user?.name || "Admin"} className="object-cover" />
                    )}
                    <AvatarFallback className="text-foreground font-black text-base bg-gradient-to-br from-primary to-primary/70 rounded-xl">
                      {user?.name?.charAt(0)?.toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="overflow-hidden flex-1">
                    <p className="text-foreground font-bold text-sm truncate leading-tight">
                      {user?.name || "Admin"}
                    </p>
                    <p className="text-muted-foreground text-xs truncate mt-0.5">
                      {user?.email || ""}
                    </p>
                    <span className="inline-flex items-center mt-1.5 px-2 py-0.5 rounded-md bg-primary/15 border border-primary/25 text-primary text-[10px] font-bold capitalize">
                      {user?.role || "Admin"}
                    </span>
                  </div>
                </div>
                <div className="py-1">
                  <DropdownMenuItem
                    onClick={() => setLocation("/profile")}
                    className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer focus:bg-muted focus:text-foreground"
                  >
                    <UserCog className="h-4 w-4 text-muted-foreground" />
                    {t('nav.myProfile')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => setLocation("/settings")}
                    className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer focus:bg-muted focus:text-foreground"
                  >
                    <Settings className="h-4 w-4 text-muted-foreground" />
                    {t('nav.settings')}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border my-1" />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-4 py-2.5 text-muted-foreground hover:text-foreground hover:bg-muted cursor-pointer focus:bg-muted focus:text-foreground"
                  >
                    <LogOut className="h-4 w-4 text-muted-foreground" />
                    {t('nav.logout')}
                  </DropdownMenuItem>
                </div>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>)}

        <div className="flex-1 p-4 md:p-6">{children}</div>
      </main>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #3f3f46; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #52525b; }
      `}</style>
    </div>
  );
}
