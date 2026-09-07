import { useState, useEffect, useRef, Fragment, useMemo, useCallback } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useSettings } from "@/contexts/SettingsContext";
import { useTheme } from "next-themes";
import { getImageUrl, useGetPublicAds, recordAdInteraction } from "@/lib/api-client";
import { HomeBannerAd, GoogleAdsenseBanner, PlayerPrerollAd } from "@/components/AdComponents";
import {
  Play, Pause, Search, ChevronLeft, ChevronRight, X,
  ChevronDown, User, Star, Plus, Info, Film, Tv,
  TrendingUp, Flame, Sparkles, Smartphone, Lock, Crown, Bell,
  Loader2, Clock, Check, EyeOff, AlertCircle, ListPlus, Send, Eye, Clapperboard, Bookmark,
  Volume2, VolumeX, ExternalLink, SkipForward,
} from "lucide-react";
import {
  useGetWebHome, useGetWebBrowse, loginClient, registerClient, useGetPages,
  useGetGenres, useGetPublicNotifications, useGetWebSubscriptionPlans,
  useGetWatchHistory, useGetSections, useGetWebAllContent,
} from "@/lib/api-client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { WebsiteReviews } from "@/components/WebsiteReviews";
import { HOME_CARD_CONTAINER_CLASS, PortraitCard, LandscapeCard } from "@/components/ContentCard";
import SubscriptionPlansModal from "@/components/SubscriptionPlansModal";

/* ─── TYPES ─── */
interface ContentItem {
  id: string;
  title: string;
  poster: string;
  backdrop: string;
  type: "movie" | "show";
  year?: string;
  duration?: string;
  imdbRating?: string;
  ageRating?: string;
  description?: string;
  language?: string;
  badge?: "NEW" | "TOP" | "HOT" | "TRENDING" | "EXCLUSIVE";
  genres?: string[];
  seasons?: number;
  contentType?: string;
  _id?: string;
  isPremium?: boolean;
  releaseDate?: string;
}

interface ShortDrama {
  id: string;
  title: string;
  poster: string;
  backdrop?: string;
  rating: string;
  totalEpisodes: number;
  freeEpisodes: number;
  language?: string;
  badge?: string;
  _id?: string;
  contentType?: string;
}

type Tab = "home" | "movies" | "tvshows" | "drama" | "new";

/* ─── HELPERS ─── */
const getContinueWatching = () => {
  try {
    const data = JSON.parse(localStorage.getItem("continue_watching") || "[]");
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
};

const formatRelativeTime = (dateStr?: string) => {
  if (!dateStr) return "";
  const ts = new Date(dateStr).getTime();
  const diff = Date.now() - ts;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
};

/* ─── BADGES ─── */
function ImdbBadge({ rating }: { rating?: string }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-1 bg-amber-400/15 border border-amber-400/40 text-amber-400 text-[11px] font-bold px-2 py-0.5 rounded">
      <Star className="w-2.5 h-2.5 fill-amber-400" />
      {rating}
    </span>
  );
}

function PremiumBadge() {
  return (
    <span className="flex items-center gap-1 bg-[#f5a623] text-black text-[9px] font-black px-2 py-[2px] rounded-sm uppercase tracking-wide">
      <Crown className="w-2.5 h-2.5" /> Premium
    </span>
  );
}

function FreeBadge() {
  return (
    <span className="flex items-center gap-1 bg-[#00c2a8] text-black text-[9px] font-black px-2 py-[2px] rounded-sm uppercase tracking-wide">
      Free
    </span>
  );
}

function ContentBadge({ badge }: { badge?: ContentItem["badge"] }) {
  if (!badge) return null;
  const map: Record<string, string> = {
    NEW: "bg-emerald-500 text-white",
    TOP: "bg-[#f5a623] text-black",
    HOT: "bg-orange-500 text-white",
    TRENDING: "bg-red-600 text-white",
    EXCLUSIVE: "bg-purple-600 text-white",
  };
  return (
    <span className={`absolute top-2 left-2 z-10 px-1.5 py-[2px] text-[9px] font-black rounded-sm uppercase tracking-wider ${map[badge]}`}>
      {badge}
    </span>
  );
}

function AgeBadge({ rating }: { rating?: string }) {
  if (!rating) return null;
  return (
    <span className="px-1.5 py-[2px] text-[9px] font-black border border-white/10 text-white bg-black/40 backdrop-blur-md rounded">
      {rating}
    </span>
  );
}

/* ─── SECTION HEADER ─── */
function SectionHeader({ title, icon, onSeeAll, count }: { title: string; icon?: React.ReactNode; onSeeAll?: () => void; count?: number }) {
  return (
    <div className="flex items-center gap-3 mb-4 px-4 sm:px-8 lg:px-12">
      {icon && <div className="text-red-500">{icon}</div>}
      <h2 className="text-white font-bold text-lg sm:text-xl tracking-tight">{title}</h2>
      {count !== undefined && count > 0 && (
        <span className="text-[10px] font-bold px-2 py-0.5 bg-zinc-800 border border-zinc-700 text-white/80 rounded-full">
          {count}
        </span>
      )}
      <div className="flex-1" />
      {onSeeAll && (
        <button onClick={onSeeAll} className="text-white/80 hover:text-white text-xs font-semibold transition-colors flex items-center gap-1 group">
          See all <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform text-red-500" />
        </button>
      )}
    </div>
  );
}

/* ─── FEATURED CARD wrapper (delegates to LandscapeCard) ─── */
function FeaturedCard({ item, onPlay, size = "md", homeStyle = false }: { item: ContentItem; onPlay: (item: ContentItem) => void; size?: "sm" | "md" | "lg"; homeStyle?: boolean }) {
  return <LandscapeCard item={item} onClick={() => onPlay(item)} size={size} homeStyle={homeStyle} />;
}

/* ─── CONTENT CARD wrapper (delegates to PortraitCard for grids, LandscapeCard for rows) ─── */
function ContentCard({ item, onPlay, size = "md", fullWidth = false, homeStyle = false, compactStyle = false }: { item: ContentItem; onPlay: (item: ContentItem) => void; size?: "sm" | "md" | "lg"; fullWidth?: boolean; homeStyle?: boolean; compactStyle?: boolean }) {
  return <PortraitCard item={item} onClick={() => onPlay(item)} size={size} fullWidth={fullWidth} homeStyle={homeStyle} compactStyle={compactStyle} />;
}

/* ─── SHORT DRAMA CARD (9:16) ─── */
const DRAMA_BADGE_MAP: Record<string, string> = {
  NEW: "bg-emerald-500 text-white",
  HOT: "bg-orange-500 text-white",
  TRENDING: "bg-red-600 text-white",
  EXCLUSIVE: "bg-purple-600 text-white",
};

const HOME_DRAMA_CARD_WIDTH = "w-[150px] sm:w-[180px] lg:w-[200px]";
const COMPACT_DRAMA_CARD_WIDTH = "w-[120px] sm:w-[135px] lg:w-[150px]";

function ShortDramaCard({ drama, onClick, fullWidth, homeStyle = false, compactStyle = false }: { drama: ShortDrama; onClick: () => void; fullWidth?: boolean; homeStyle?: boolean; compactStyle?: boolean }) {
  const isSubscribed = (() => {
    try {
      const stored = localStorage.getItem("appUser");
      if (stored) {
        const u = JSON.parse(stored);
        return u.subscriptionStatus === "active" && u.subscriptionPlan !== "free";
      }
    } catch {}
    return false;
  })();

  return (
    <div
      className={`group relative flex-shrink-0 cursor-pointer ${fullWidth ? "w-full" : compactStyle ? COMPACT_DRAMA_CARD_WIDTH : homeStyle ? HOME_DRAMA_CARD_WIDTH : "w-[160px] sm:w-[180px] lg:w-[200px]"}`}
      onClick={onClick}
    >
      <div
         className={`relative bg-zinc-900 transition-all duration-300 ${compactStyle ? "rounded-[6px] overflow-hidden group-hover:ring-1 group-hover:ring-purple-500/60 shadow-lg" : homeStyle ? `${HOME_CARD_CONTAINER_CLASS} shadow-lg shadow-black/30 group-hover:shadow-xl group-hover:shadow-black/50 group-hover:ring-1 group-hover:ring-purple-500/60` : "rounded-xl overflow-hidden group-hover:ring-2 group-hover:ring-purple-500/60 shadow-lg"}`}
        style={{ aspectRatio: "9/16" }}
      >
        <img
          src={drama.poster ? getImageUrl(drama.poster) : drama.backdrop || ""}
          alt={drama.title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.style.display = "none";
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
        {drama.badge && (
          <span className={`absolute top-2 left-2 z-10 text-[9px] font-black px-1.5 py-[2px] rounded-sm uppercase tracking-wider ${DRAMA_BADGE_MAP[drama.badge] || "bg-zinc-700 text-white"}`}>
            {drama.badge}
          </span>
        )}
        {drama.freeEpisodes > 0 && !isSubscribed && (
          <span className="absolute top-2 right-2 z-10 text-[9px] font-bold px-1.5 py-[2px] rounded-sm bg-emerald-600/90 text-white">
            {drama.freeEpisodes} FREE
          </span>
        )}
        {/* Play button — bottom-right corner */}
        <div className="absolute bottom-10 right-2 z-10 opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-300">
          <div className="w-9 h-9 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
            <Play className="w-3.5 h-3.5 text-white fill-white ml-0.5" />
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2">
          <p className="text-white text-[11px] font-bold leading-tight line-clamp-2">{drama.title}</p>
          <p className="text-white/80 text-[10px] mt-0.5">{drama.totalEpisodes} EPs</p>
        </div>
      </div>
    </div>
  );
}

/* ─── HORIZONTAL ROWS ─── */
function useRowScroll() {
  const rowRef = useRef<HTMLDivElement>(null);
  const scroll = (dir: "left" | "right", amount = 800) => {
    if (!rowRef.current) return;
    rowRef.current.scrollBy({ left: dir === "left" ? -amount : amount, behavior: "smooth" });
  };
  return { rowRef, scroll };
}

function FeaturedRow({ title, icon, items, onPlay, size = "md", onSeeAll, homeStyle = false }: {
  title: string; icon?: React.ReactNode; items: ContentItem[]; onPlay: (item: ContentItem) => void; size?: "sm" | "md" | "lg"; onSeeAll?: () => void; homeStyle?: boolean;
}) {
  const { rowRef, scroll } = useRowScroll();
  if (!items.length) return null;
  return (
    <div className="mb-10">
      <SectionHeader title={title} icon={icon} onSeeAll={onSeeAll} count={items.length} />
      <div className="relative group/row">
        <button onClick={() => scroll("left", 1200)} className="hidden lg:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-black/80 border border-zinc-700/60 text-white opacity-0 group-hover/row:opacity-100 hover:bg-red-600 hover:border-red-600 transition-all shadow-xl">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => scroll("right", 1200)} className="hidden lg:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-black/80 border border-zinc-700/60 text-white opacity-0 group-hover/row:opacity-100 hover:bg-red-600 hover:border-red-600 transition-all shadow-xl">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div ref={rowRef} className="flex gap-4 overflow-x-auto px-4 sm:px-8 lg:px-12 pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
          {items.map((item) => (
            <FeaturedCard key={item.id || item._id} item={item} onPlay={onPlay} size={size} homeStyle={homeStyle} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ContentRow({ title, icon, items, onPlay, size = "md", onSeeAll, homeStyle = false }: {
  title: string; icon?: React.ReactNode; items: ContentItem[]; onPlay: (item: ContentItem) => void; size?: "sm" | "md" | "lg"; onSeeAll?: () => void; homeStyle?: boolean;
}) {
  const { rowRef, scroll } = useRowScroll();
  if (!items.length) return null;
  return (
    <div className="mb-10">
      <SectionHeader title={title} icon={icon} onSeeAll={onSeeAll} count={items.length} />
      <div className="relative group/row">
        <button onClick={() => scroll("left", 900)} className="hidden lg:flex absolute left-2 top-[38%] -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-black/80 border border-zinc-700/60 text-white opacity-0 group-hover/row:opacity-100 hover:bg-red-600 hover:border-red-600 transition-all shadow-xl">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => scroll("right", 900)} className="hidden lg:flex absolute right-2 top-[38%] -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-black/80 border border-zinc-700/60 text-white opacity-0 group-hover/row:opacity-100 hover:bg-red-600 hover:border-red-600 transition-all shadow-xl">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div ref={rowRef} className="flex gap-4 overflow-x-auto px-4 sm:px-8 lg:px-12 pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
          {items.map((item) => (
            <ContentCard key={item.id || item._id} item={item} onPlay={onPlay} size={size} homeStyle={homeStyle} />
          ))}
        </div>
      </div>
    </div>
  );
}

function ShortDramaRow({ title, icon, items, onSelect, onSeeAll, homeStyle = false }: {
  title: string; icon?: React.ReactNode; items: ShortDrama[]; onSelect: (d: ShortDrama) => void; onSeeAll?: () => void; homeStyle?: boolean;
}) {
  const { rowRef, scroll } = useRowScroll();
  if (!items.length) return null;
  return (
    <div className="mb-10">
      <SectionHeader title={title} icon={icon} count={items.length} onSeeAll={onSeeAll} />
      <div className="relative group/row">
        <button onClick={() => scroll("left", 800)} className="hidden lg:flex absolute left-2 top-[40%] -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-black/80 border border-zinc-700/60 text-white opacity-0 group-hover/row:opacity-100 hover:bg-purple-700 hover:border-purple-600 transition-all shadow-xl">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <button onClick={() => scroll("right", 800)} className="hidden lg:flex absolute right-2 top-[40%] -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-black/80 border border-zinc-700/60 text-white opacity-0 group-hover/row:opacity-100 hover:bg-purple-700 hover:border-purple-600 transition-all shadow-xl">
          <ChevronRight className="w-4 h-4" />
        </button>
        <div ref={rowRef} className="flex gap-4 overflow-x-auto px-4 sm:px-8 lg:px-12 pb-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
          {items.map((d) => (
            <ShortDramaCard key={d.id || d._id} drama={d} onClick={() => onSelect(d)} homeStyle={homeStyle} />
          ))}
        </div>
      </div>
    </div>
  );
}



/* ─── HERO BANNER ─── */
function Hero({ activeTab, onPlay, onSubscribeClick, isSubscribed }: { activeTab: Tab; onPlay: (item: ContentItem) => void; onSubscribeClick: () => void; isSubscribed?: boolean }) {
  const { data: homeData, isLoading } = useGetWebHome();
  
  const heroContent = useMemo(() => {
    const raw = homeData?.heroContent || [];
    if (activeTab === "drama") {
      return raw.filter((item: any) => item.contentType === "drama");
    }
    if (activeTab === "movies") {
      return raw.filter((item: any) => item.type === "movie" || item.contentType === "movie");
    }
    if (activeTab === "tvshows") {
      return raw.filter((item: any) => item.type !== "movie" && item.contentType !== "movie");
    }
    return raw;
  }, [homeData?.heroContent, activeTab]);

  const [current, setCurrent] = useState(0);
  const [fading, setFading] = useState(false);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    setCurrent(0);
  }, [activeTab, heroContent.length]);

  const go = (index: number) => {
    if (index === current) return;
    setFading(true);
    setTimeout(() => { setCurrent(index); setFading(false); }, 400);
  };

  useEffect(() => {
    if (heroContent.length === 0 || isPaused) return;
    const timer = setInterval(() => go((current + 1) % heroContent.length), 6000);
    return () => clearInterval(timer);
  }, [current, heroContent.length, isPaused]);

  if (isLoading) {
    return <div className="flex items-center justify-center w-full bg-[#030306]" style={{ height: "85vh", minHeight: 480 }}><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>;
  }
  if (!heroContent.length) return null;

  const item = heroContent[current];
  const isPremium = item.isPremium || item.badge === "TOP" || item.badge === "EXCLUSIVE";

  return (
    <div
      className="relative w-full overflow-hidden bg-[#030306] mt-[60px] lg:mt-[68px]"
      style={{ height: "85vh", minHeight: 480 }}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 transition-opacity duration-500 ${fading ? "opacity-0" : "opacity-100"}`}>
        <img
          src={getImageUrl(item.backdrop || item.poster) || ""}
          alt={item.title}
          className="w-full h-full object-cover object-center"
          onError={(e) => {
            const target = e.target as HTMLImageElement;
            target.onerror = null;
            target.src = `https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200&h=675&fit=crop&q=80`;
          }}
        />
      </div>

      {/* Gradients */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#030306] via-[#030306]/20 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-[50%] bg-gradient-to-t from-[#030306] to-transparent" />
      <div className="absolute top-0 left-0 right-0 h-[20%] bg-gradient-to-b from-[#030306]/30 to-transparent" />
      <div className="absolute inset-0 bg-[#030306]/5" />

      {/* Content */}
      <div className="absolute bottom-14 sm:bottom-16 left-0 px-6 sm:px-10 lg:px-14 max-w-2xl w-full">
        <div className={`transition-all duration-500 ${fading ? "opacity-0 translate-y-4" : "opacity-100 translate-y-0"}`}>
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {isPremium && !isSubscribed ? <PremiumBadge /> : null}
            <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${
              item.type === "movie"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : item.contentType === "drama"
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
            }`}>
              {item.type === "movie" ? <Film className="w-3 h-3" /> : item.contentType === "drama" ? <Smartphone className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
              {item.type === "movie" ? "Movie" : item.contentType === "drama" ? "Short Drama" : "TV Show"}
            </span>
            {[...new Set<string>(item.genres || [])].slice(0, 2).map((g) => (
              <span key={g} className="text-white text-xs bg-zinc-900/80 border border-zinc-800 px-2 py-1 rounded-lg font-semibold">{g}</span>
            ))}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white leading-tight mb-3 tracking-tight drop-shadow-lg">
            {item.title}
          </h1>

          <div className="flex items-center gap-3 mb-3 flex-wrap">
            <ImdbBadge rating={item.imdbRating} />
            <AgeBadge rating={item.ageRating} />
            {item.duration && <span className="text-white/80 text-xs font-semibold">{item.duration}</span>}
            {item.year && <span className="text-white/80 text-xs font-semibold">{item.year}</span>}
            {item.language && <span className="text-white text-xs font-semibold">{item.language}</span>}
          </div>

          <p className="text-white text-sm sm:text-base leading-relaxed mb-6 max-w-lg line-clamp-3">
            {item.description}
          </p>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => onPlay(item)}
              className="flex items-center gap-2.5 px-8 py-3.5 bg-white hover:bg-zinc-200 text-black font-bold rounded-full text-sm tracking-wide transition-all active:scale-95 shadow-xl"
            >
              <Play className="w-4 h-4 fill-black" />
              Watch Now
            </button>
            {isPremium && !isSubscribed && (
              <button
                onClick={onSubscribeClick}
                className="flex items-center gap-2.5 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full text-sm tracking-wide transition-all active:scale-95 shadow-lg shadow-red-950/30"
              >
                <Crown className="w-4 h-4" /> Subscribe
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Progress dots */}
      <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2">
        {heroContent.map((_, i) => (
          <button
            key={i}
            onClick={() => go(i)}
            className={`transition-all duration-300 rounded-full ${i === current ? "w-8 h-[5px] bg-red-600" : "w-2 h-2 bg-white/30 hover:bg-white/60"}`}
          />
        ))}
      </div>

      {/* Arrow controls */}
      <button
        onClick={() => go((current - 1 + heroContent.length) % heroContent.length)}
        className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/80 text-white border border-zinc-800 hover:border-zinc-600 transition-all"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>
      <button
        onClick={() => go((current + 1) % heroContent.length)}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-black/50 hover:bg-black/80 text-white border border-zinc-800 hover:border-zinc-600 transition-all"
      >
        <ChevronRight className="w-5 h-5" />
      </button>
    </div>
  );
}

/* ─── GENRE FILTER ─── */
function GenreFilter({ active, onChange }: { active: string; onChange: (g: string) => void }) {
  const { data: genresData } = useGetGenres({ limit: 50 });
  const genres: string[] = ["All", ...((genresData?.data || []).map((g: any) => g.name))];

  return (
    <div className="flex gap-2 overflow-x-auto px-4 sm:px-8 lg:px-12 pb-2 mb-6" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
      {genres.map((g) => (
        <button
          key={g}
          onClick={() => onChange(g)}
          className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
            active === g
              ? "bg-red-600 border-red-600 text-white"
              : "bg-transparent border-zinc-700 text-white/80 hover:border-zinc-500 hover:text-white"
          }`}
        >
          {g}
        </button>
      ))}
    </div>
  );
}

/* ─── SUBSCRIBE BANNER (Dynamic from API) ─── */
function SubscribeBanner({ onSubscribeClick }: { onSubscribeClick: () => void }) {
  const { settings } = useSettings();
  const { data: plansData } = useGetWebSubscriptionPlans();
  const plans = plansData?.data || [];
  const cheapest = plans.length > 0
    ? plans.reduce((a: any, b: any) => (a.price < b.price ? a : b), plans[0])
    : null;

  const formatCurrency = (val: number | string) => {
    const num = Number(val && typeof val === "string" ? val.replace(/[^0-9.-]+/g,"") : val) || 0;
    return settings?.currencyPosition === "before" 
      ? `${settings?.currencySymbol || '₹'}${num.toFixed(settings?.decimalPlaces ?? 2)}` 
      : `${num.toFixed(settings?.decimalPlaces ?? 2)} ${settings?.currencySymbol || '₹'}`;
  };

  return (
    <div className="mx-4 sm:mx-8 lg:mx-12 mb-10 rounded-xl overflow-hidden relative">
      <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, #0a1628 0%, #0f2044 50%, #091830 100%)" }} />
      <div className="absolute inset-0 bg-gradient-to-r from-[#0a1628]/95 via-[#0a1628]/70 to-transparent" />

      <div className="relative z-10 px-6 sm:px-10 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 rounded-md bg-red-600 flex items-center justify-center">
              <Crown className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-red-500 font-bold text-sm uppercase tracking-wider">Premium Plan</span>
          </div>
          <h3 className="text-white font-bold text-xl sm:text-2xl mb-1">Unlock All Premium Content</h3>
          <p className="text-white/80 text-sm">4K Ultra HD · No Ads · Download & Watch · Multi-Screen</p>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          {cheapest && (
            <div className="text-right">
              {cheapest.originalPrice && cheapest.originalPrice > cheapest.price && (
                <p className="text-white text-xs line-through">{formatCurrency(cheapest.originalPrice)}</p>
              )}
              <p className="text-white font-bold text-xl">
                {formatCurrency(cheapest.price)}<span className="text-white/80 text-sm font-normal">/{cheapest.interval || "mo"}</span>
              </p>
            </div>
          )}
          <button
            onClick={onSubscribeClick}
            className="px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full text-sm transition-all shadow-lg shadow-red-900/40 whitespace-nowrap"
          >
            Subscribe Now
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── MOVIES GRID TAB ─── */
function MoviesTab({ onPlay }: { onPlay: (item: ContentItem) => void }) {
  const [activeGenre, setActiveGenre] = useState("All");
  const { data: browseData, isLoading } = useGetWebBrowse({ type: "movie", genre: activeGenre });
  const filtered = browseData?.items || [];

  return (
    <div className="pt-6 pb-20">
      <div className="px-4 sm:px-8 lg:px-12 mb-6">
        <h2 className="text-white font-bold text-2xl tracking-tight">Movies</h2>
        <p className="text-white text-xs sm:text-sm mt-1">{isLoading ? "Loading..." : `${browseData?.pagination?.total || 0} movies available`}</p>
      </div>
      <GenreFilter active={activeGenre} onChange={setActiveGenre} />
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>
      ) : (
        <div className="px-4 sm:px-8 lg:px-12 flex flex-wrap gap-4">
          {filtered.map((item: any) => (
            <ContentCard key={item.id || item._id} item={item} onPlay={onPlay} compactStyle />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── TV SHOWS GRID TAB ─── */
function TVShowsTab({ onPlay }: { onPlay: (item: ContentItem) => void }) {
  const [activeGenre, setActiveGenre] = useState("All");
  const { data: browseData, isLoading } = useGetWebBrowse({ type: "show", genre: activeGenre });
  const filtered = browseData?.items || [];

  return (
    <div className="pt-6 pb-20">
      <div className="px-4 sm:px-8 lg:px-12 mb-6">
        <h2 className="text-white font-bold text-2xl tracking-tight">TV Shows</h2>
        <p className="text-white text-xs sm:text-sm mt-1">{isLoading ? "Loading..." : `${browseData?.pagination?.total || 0} shows available`}</p>
      </div>
      <GenreFilter active={activeGenre} onChange={setActiveGenre} />
      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>
      ) : (
        <div className="px-4 sm:px-8 lg:px-12 flex flex-wrap gap-4">
          {filtered.map((item: any) => (
            <ContentCard key={item.id || item._id} item={item} onPlay={onPlay} compactStyle />
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── NEW & HOT TAB ─── */
function NewHotTab({ onPlay }: { onPlay: (item: ContentItem) => void }) {
  const { data: homeData, isLoading } = useGetWebHome();

  if (isLoading || !homeData) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>;

  const newReleases = homeData.newReleases || [];
  const trendingNow = homeData.trendingNow || [];
  const newDramas = homeData.newDramas || [];
  const featuredDramas = homeData.featuredDramas || [];
  const allItems = [...newReleases, ...trendingNow, ...newDramas, ...featuredDramas]
    .filter((v, i, a) => a.findIndex(t => t.id === v.id) === i)
    .sort((a, b) => {
      const dateA = new Date(a.releaseDate || a.year || 0).getTime();
      const dateB = new Date(b.releaseDate || b.year || 0).getTime();
      return dateB - dateA;
    });

  const badgeColorMap: Record<string, string> = {
    NEW: "bg-emerald-500/15 border-emerald-500/30 text-emerald-400",
    HOT: "bg-orange-500/15 border-orange-500/30 text-orange-400",
    TRENDING: "bg-red-500/15 border-red-500/30 text-red-400",
    EXCLUSIVE: "bg-purple-500/15 border-purple-500/30 text-purple-400",
    TOP: "bg-amber-500/15 border-amber-500/30 text-amber-400",
  };

  return (
    <div className="pt-6 pb-20 mt-[60px] lg:mt-[68px]">
      <div className="mb-8 px-4 sm:px-8 lg:px-12">
        <h2 className="text-white font-bold text-2xl sm:text-3xl tracking-tight">New &amp; Hot</h2>
        <p className="text-white/60 text-xs sm:text-sm mt-1.5 font-medium">
          Follow the latest titles and trending releases.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 px-4 sm:px-8 lg:px-12">
        {allItems.map((item: any) => {
          const badge = item.badge || "NEW";

          return (
            <div
              key={item.id || item._id || ""}
              className="group relative rounded-2xl overflow-hidden bg-gradient-to-b from-zinc-900/60 to-zinc-900/40 border border-zinc-800/30 hover:border-zinc-700/50 hover:shadow-2xl hover:shadow-black/40 transition-all duration-300 cursor-pointer"
              onClick={() => onPlay(item)}
            >
              {/* CardHeader — badge centered */}
              <div className="flex justify-center px-4 pt-3 pb-2">
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-full border ${
                    badgeColorMap[badge] || "bg-zinc-700/20 border-zinc-700/30 text-white/60"
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
                  {badge}
                </span>
              </div>

              {/* CardMedia */}
              <div className="relative px-4 mb-4">
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-zinc-900 group-hover:scale-[1.02] transition-transform duration-500">
                  <img
                    src={getImageUrl(item.backdrop || item.poster)}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onPlay(item);
                    }}
                    className="absolute top-1/2 left-1/2 -translate-1/2 w-14 h-14 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 shadow-lg shadow-black/30"
                  >
                    <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                  </button>
                </div>
              </div>

              {/* CardContent */}
              <div className="px-4 mb-4">
                <h3 className="text-white text-lg sm:text-xl font-bold leading-tight mb-2 line-clamp-2 group-hover:text-red-400 transition-colors">
                  {item.title}
                </h3>
                {item.description && (
                  <p className="text-white/60 text-sm leading-relaxed line-clamp-3">
                    {item.description}
                  </p>
                )}
              </div>

              {/* CardFooter */}
              <div className="flex items-center justify-between gap-4 px-4 pb-4 pt-3 border-t border-zinc-800/40">
                <div className="flex items-center gap-2.5">
                  {item.imdbRating && (
                    <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 text-xs font-bold rounded">
                      <Star className="w-3 h-3 fill-amber-400" /> {item.imdbRating}
                    </span>
                  )}
                  {(item.genres || []).slice(0, 2).map((g: string) => (
                    <span
                      key={g}
                      className="text-[10px] font-bold px-2 py-0.5 bg-zinc-800/50 text-white/50 border border-zinc-800/60 rounded-full uppercase tracking-wider"
                    >
                      {g}
                    </span>
                  ))}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onPlay(item);
                  }}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-gradient-to-r from-red-600 to-red-700 text-white text-xs font-bold hover:from-red-700 hover:to-red-800 transition-all shadow-lg shadow-red-600/20"
                >
                  <Play className="w-3.5 h-3.5 fill-white" />
                  Watch Now
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── SHORT DRAMA TAB ─── */
function ShortDramaTab({ onSelect }: { onSelect: (d: ShortDrama) => void }) {
  const { data: homeData, isLoading } = useGetWebHome();
  const allDramas = [...(homeData?.featuredDramas || []), ...(homeData?.newDramas || [])];

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>;

  return (
    <div className="pt-6 pb-20">
      <div className="px-4 sm:px-8 lg:px-12 mb-8">
        <h2 className="text-white font-bold text-2xl tracking-tight">Short Drama</h2>
        <p className="text-white text-sm mt-1">{allDramas.length} series · Portrait 9:16 · Episode-based</p>
      </div>

      <div className="px-4 sm:px-8 lg:px-12 flex flex-wrap gap-4 mb-10">
        {allDramas.map((d: any) => (
          <ShortDramaCard key={d.id || d._id} drama={d} onClick={() => onSelect(d)} compactStyle />
        ))}
      </div>

      <div className="px-4 sm:px-8 lg:px-12 mb-8">
        <div className="bg-[#0f1a2e]/80 border border-red-500/10 rounded-2xl p-5 flex flex-wrap gap-6">
          {[
            { icon: <Smartphone className="w-5 h-5 text-red-500" />, label: "Portrait 9:16", desc: "Optimized for mobile viewing" },
            { icon: <Play className="w-5 h-5 text-emerald-400" />, label: "First Episodes Free", desc: "Start watching without subscription" },
            { icon: <Lock className="w-5 h-5 text-amber-400" />, label: "Premium Episodes", desc: "Subscribe to unlock all episodes" },
            { icon: <Crown className="w-5 h-5 text-yellow-400" />, label: "VIP Access", desc: "Unlimited streaming for subscribers" },
          ].map(({ icon, label, desc }) => (
            <div key={label} className="flex items-start gap-3 min-w-[160px]">
              <div className="w-9 h-9 rounded-xl bg-zinc-800/80 flex items-center justify-center flex-shrink-0">{icon}</div>
              <div>
                <p className="text-white font-bold text-sm">{label}</p>
                <p className="text-white/80 text-xs mt-0.5">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function getSectionItems(section: any, movies: any[], dramas: any[], homeData: any) {
  if (section.content && section.content.length > 0) return section.content;
  if (section.category && homeData && homeData[section.category] && homeData[section.category].length > 0) return homeData[section.category];
  
  let sourceItems = section.contentType === 'movie' ? movies : section.contentType === 'drama' ? dramas : [...movies, ...dramas];
  
  let filteredItems = [...sourceItems];
  if (section.contentSelection === 'dynamic' || section.contentSelection === 'mixed') {
    if (section.filterKey && section.filterKey !== 'none') {
       const fKey = section.filterKey;
       const fVal = section.filter?.[fKey] || section.filterValue; // Fallback to raw filterValue if filter obj is missing
       if (fKey === 'genres') {
          filteredItems = filteredItems.filter(i => i.genres?.includes(fVal));
       } else if (fKey === 'isNewContent' || fKey === 'trending' || fKey === 'featured') {
          filteredItems = filteredItems.filter(i => i[fKey] === (fVal === 'true' || fVal === true));
       } else {
          filteredItems = filteredItems.filter(i => i[fKey] === fVal);
       }
    }
  }

  if (section.contentSelection === 'manual') {
    filteredItems = sourceItems.filter(item => section.manualContentIds?.includes(item._id));
  } else if (section.contentSelection === 'mixed') {
    const manualItems = sourceItems.filter(item => section.manualContentIds?.includes(item._id));
    // Combine manual items with filtered items, avoiding duplicates
    const manualIds = new Set(manualItems.map(i => i._id));
    filteredItems = [...manualItems, ...filteredItems.filter(i => !manualIds.has(i._id))];
  }

  if (section.sortBy) {
    const sKey = Object.keys(section.sortBy)[0] || section.sortKey;
    const sDir = section.sortBy[sKey] || section.sortDir || -1;
    filteredItems = [...filteredItems].sort((a, b) => {
       if (a[sKey] < b[sKey]) return -1 * sDir;
       if (a[sKey] > b[sKey]) return 1 * sDir;
       return 0;
    });
  }

  if (section.limit) {
    filteredItems = filteredItems.slice(0, section.limit);
  }

  return filteredItems;
}

/* ─── HOME TAB ─── */
function HomeTab({ onPlay, onSelectDrama, onSubscribeClick, isSubscribed }: {
  onPlay: (item: ContentItem) => void;
  onSelectDrama: (d: ShortDrama) => void;
  onSubscribeClick: () => void;
  isSubscribed?: boolean;
}) {
  const [, setLocation] = useLocation();
  const { data: homeData, isLoading: isHomeLoading } = useGetWebHome();
  const { data: watchHistoryData } = useGetWatchHistory({ limit: 10 });
  const { data: sectionsData, isLoading: isSectionsLoading } = useGetSections({ platform: 'web', activeOnly: true });
  const { data: allContentRes, isLoading: isAllContentLoading } = useGetWebAllContent();
  
  const cw = watchHistoryData?.items || [];
  const webSections = (sectionsData?.data || []).sort((a: any, b: any) => (a.position || 0) - (b.position || 0));
  const movies = allContentRes?.movies || [];
  const dramas = allContentRes?.dramas || [];

  if (isHomeLoading || isSectionsLoading || isAllContentLoading || !homeData) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-red-600" /></div>;

  return (
    <div className="pb-20 space-y-12 pt-8">
      {cw.length > 0 && (
        <section className="px-4 sm:px-8 lg:px-12">
          <SectionHeader title="Continue Watching" icon={<Clock className="w-4 h-4" />} />
          <div className="flex gap-4 overflow-x-auto pb-3" style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}>
            {cw.map((item: any) => (
              <div
                key={item.id}
                className="group relative flex-shrink-0 w-[240px] sm:w-[280px] cursor-pointer"
                onClick={() => onPlay(item)}
              >
                {/* Card */}
                 <div className={`relative bg-zinc-900 shadow-lg shadow-black/30 group-hover:shadow-xl transition-shadow ${HOME_CARD_CONTAINER_CLASS}`} style={{ aspectRatio: "16/9" }}>
                  <img
                    src={getImageUrl(item.backdrop || item.poster || item.posterImage || item.thumbnail) || ""}
                    alt={item.title || ""}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => { (e.target as HTMLImageElement).style.backgroundColor = "#111"; }}
                  />
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                  {/* Play button */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <div className="w-12 h-12 rounded-full bg-red-600/95 flex items-center justify-center shadow-xl scale-90 group-hover:scale-100 transition-transform duration-200">
                      <Play className="w-5 h-5 text-white fill-white ml-0.5" />
                    </div>
                  </div>
                  {/* Title */}
                  <div className="absolute bottom-0 left-0 right-0 px-3 pb-4 pt-8">
                    <p className="text-white font-bold text-sm truncate leading-tight">
                      {item.showTitle || item.title}
                    </p>
                    {item.showTitle && (
                      <p className="text-white/80 text-[11px] truncate mt-0.5">
                        {item.title}
                      </p>
                    )}
                  </div>
                  {/* Progress bar */}
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-700/60">
                    <div className="h-full bg-red-600 rounded-r-full transition-all" style={{ width: `${Math.min(100, Math.round(item.progressPercent || 0))}%` }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {webSections.length > 0 ? (
        webSections.map((section: any, index: number) => {
          if (section.layout === 'ad') {
            return (
              <Fragment key={section._id || index}>
                {section.itemType === 'google-adsense' ? <GoogleAdsenseBanner /> : <HomeBannerAd adId={section.manualContentIds?.[0]} />}
              </Fragment>
            );
          }

          let rowContent = null;
          const items = getSectionItems(section, movies, dramas, homeData);
          
          if (items.length === 0) return null;

          if (section.layout === 'grid') {
            rowContent = (
              <div className="mb-10">
                <SectionHeader title={section.title} onSeeAll={() => setLocation(`/browse?section=${section._id}`)} count={items.length} />
                <div className="px-4 sm:px-8 lg:px-12 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 pt-2">
                  {items.map((item: any) => (
                    <Fragment key={item.id || item._id}>
                      {section.itemType === 'landscape' ? (
                        <LandscapeCard item={item} onClick={() => onPlay(item)} fullWidth homeStyle />
                      ) : section.itemType === 'drama' ? (
                        <ShortDramaCard drama={item} onClick={() => onSelectDrama(item)} fullWidth homeStyle />
                      ) : (
                        <PortraitCard item={item} onClick={() => onPlay(item)} fullWidth homeStyle />
                      )}
                    </Fragment>
                  ))}
                </div>
              </div>
            );
          } else {
            if (section.itemType === 'landscape') {
              rowContent = <FeaturedRow title={section.title} items={items} onPlay={onPlay} homeStyle onSeeAll={() => setLocation(`/browse?section=${section._id}`)} />;
            } else if (section.itemType === 'drama') {
              rowContent = <ShortDramaRow title={section.title} items={items} onSelect={onSelectDrama} homeStyle onSeeAll={() => setLocation(`/browse?section=${section._id}`)} />;
            } else {
              rowContent = <ContentRow title={section.title} items={items} onPlay={onPlay} size="lg" homeStyle onSeeAll={() => setLocation(`/browse?section=${section._id}`)} />;
            }
          }
          
          return (
            <Fragment key={section._id || index}>
              {rowContent}
            </Fragment>
          );
        })
      ) : (
        <>
          {/* HARDCODED FALLBACK START */}
          {homeData.featuredDramas?.length > 0 && (
            <ShortDramaRow title="Short Drama — Hot Now" icon={<Smartphone className="w-4 h-4" />} items={homeData.featuredDramas} onSelect={onSelectDrama} homeStyle onSeeAll={() => setLocation("/browse?short-drama")} />
          )}
          {homeData.newDramas?.length > 0 && (
            <ShortDramaRow title="New Short Drama" icon={<Crown className="w-4 h-4" />} items={homeData.newDramas} onSelect={onSelectDrama} homeStyle onSeeAll={() => setLocation("/browse?short-drama")} />
          )}
          {homeData.trendingNow?.length > 0 && (
            <FeaturedRow title="Trending Now" icon={<TrendingUp className="w-4 h-4" />} items={homeData.trendingNow} onPlay={onPlay} homeStyle onSeeAll={() => setLocation("/browse?trending")} />
          )}

          {/* ── HOME PAGE AD BANNER ── */}
          <HomeBannerAd />

          {homeData.newReleases?.length > 0 && (
            <FeaturedRow title="New Releases" icon={<Sparkles className="w-4 h-4" />} items={homeData.newReleases} onPlay={onPlay} homeStyle onSeeAll={() => setLocation("/browse?new")} />
          )}

          {/* ── GOOGLE ADSENSE BANNER ── */}
          <GoogleAdsenseBanner />

          {!isSubscribed && <SubscribeBanner onSubscribeClick={onSubscribeClick} />}

          {homeData.topRated?.length > 0 && (
            <ContentRow title="Top Rated Movies" icon={<Star className="w-4 h-4" />} items={homeData.topRated} onPlay={onPlay} size="lg" homeStyle onSeeAll={() => setLocation("/browse?top-rated")} />
          )}
          {homeData.tvShows?.length > 0 && (
            <FeaturedRow title="Popular TV Shows" icon={<Tv className="w-4 h-4" />} items={homeData.tvShows.slice(0, 10)} onPlay={onPlay} homeStyle onSeeAll={() => setLocation("/browse?tv")} />
          )}

          {/* ── SECOND AD BANNER (mid-content) ── */}
          <HomeBannerAd />

          {homeData.actionMovies?.length > 0 && (
            <FeaturedRow title="Action & Adventure" icon={<Flame className="w-4 h-4" />} items={homeData.actionMovies} onPlay={onPlay} homeStyle onSeeAll={() => setLocation("/browse?action")} />
          )}
          
          {/* ── SECOND GOOGLE ADSENSE BANNER ── */}
          <GoogleAdsenseBanner />

          {homeData.dramaShows?.length > 0 && (
            <FeaturedRow title="Drama Series" icon={<Film className="w-4 h-4" />} items={homeData.dramaShows} onPlay={onPlay} homeStyle onSeeAll={() => setLocation("/browse?drama-series")} />
          )}

          {/* ── THIRD AD BANNER (bottom) ── */}
          <HomeBannerAd />
          {/* HARDCODED FALLBACK END */}
        </>
      )}

      {/* Subscribe Banner if there are dynamic sections, to ensure it always renders at bottom if not shown in hardcoded fallback */}
      {webSections.length > 0 && !isSubscribed && <SubscribeBanner onSubscribeClick={onSubscribeClick} />}
    </div>
  );
}

/* ─── USER DROPDOWN ─── */
function UserDropdown({ onSignIn, onSignOut, user }: { onSignIn: () => void; onSignOut?: () => void; user?: any }) {
  const [, setLocation] = useLocation();

  return (
    <div className="absolute top-[calc(100%+8px)] right-0 w-[260px] bg-[#0a0a10] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
      <div className="p-4 flex items-center gap-3 border-b border-zinc-800">
        {user && user.avatar ? (
          <img
            src={getImageUrl(user.avatar)}
            alt={user.name || "User"}
            className="w-10 h-10 rounded-full object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-red-600 to-red-900 flex items-center justify-center flex-shrink-0 uppercase font-bold text-sm text-white">
            {user ? user.name?.[0] || "U" : <User className="w-4 h-4 text-white" />}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="text-white font-bold text-sm truncate leading-none">{user ? user.name || "User" : "Guest User"}</p>
            {user && <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-500 flex-shrink-0" />}
          </div>
          <p className="text-white text-[11px] truncate mt-1 leading-none font-medium">
            {user ? "Premium Member" : "Sign in for full access"}
          </p>
        </div>
      </div>

      <div className="p-1.5 space-y-0.5">
        {[
          { label: "Account Settings", href: "/account", icon: <User className="w-4 h-4" /> },
          { label: "My Watchlist", href: "/wishlist", icon: <Bookmark className="w-4 h-4" /> },
          { label: "Help & Support", href: "/help-support", icon: <AlertCircle className="w-4 h-4" /> },
        ].map((opt) => (
          <button
            key={opt.label}
            onClick={() => setLocation(opt.href)}
                 className="w-full flex items-center gap-3 px-3 py-2 text-white/80 hover:text-white hover:bg-white/5 rounded-2xl text-left text-xs font-semibold transition-all"
          >
            {opt.icon}
            {opt.label}
          </button>
        ))}
      </div>

      <div className="p-3 border-t border-zinc-800 bg-zinc-950/50">
        {user ? (
          <button
            onClick={onSignOut}
            className="w-full py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white hover:text-white font-bold rounded-2xl text-xs transition-all text-center"
          >
            Sign Out
          </button>
        ) : (
          <button
            onClick={onSignIn}
            className="w-full py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-2xl text-xs transition-all text-center shadow-md shadow-red-900/20"
          >
            Log In / Register
          </button>
        )}
      </div>
    </div>
  );
}

/* ─── SIGN IN MODAL ─── */
function SignInModal({ onClose }: { onClose: () => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [usePhone, setUsePhone] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const { settings } = useSettings();
  const { resolvedTheme } = useTheme();

  const getLogoUrl = () => {
    if (resolvedTheme === "dark" && settings.darkLogoUrl) return getImageUrl(settings.darkLogoUrl);
    if (resolvedTheme === "light" && settings.lightLogoUrl) return getImageUrl(settings.lightLogoUrl);
    return settings.logoUrl ? getImageUrl(settings.logoUrl) : "";
  };
  const logoUrl = getLogoUrl();

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (isLogin) {
        // Phone login: pass phone number as the email field — server handles phone vs email
        const loginIdentifier = usePhone ? phone : email;
        const res = await loginClient({ email: loginIdentifier, password });
        localStorage.setItem("appAccessToken", res.accessToken);
        localStorage.setItem("accessToken", res.accessToken); // legacy compat
        localStorage.setItem("appUser", JSON.stringify({
          id: res.userId,
          name: res.name || email.split("@")[0],
          avatar: res.avatar || null,
          subscriptionPlan: res.subscriptionPlan || "free",
          subscriptionStatus: res.subscriptionStatus || "inactive",
        }));
        localStorage.setItem("user", JSON.stringify({
          id: res.userId,
          name: res.name || email.split("@")[0],
          avatar: res.avatar || null,
          subscriptionPlan: res.subscriptionPlan || "free",
          subscriptionStatus: res.subscriptionStatus || "inactive",
        }));
        window.location.reload();
      } else {
        const res = await registerClient({ email, password, name, phone: phone || undefined });
        localStorage.setItem("appAccessToken", res.accessToken);
        localStorage.setItem("accessToken", res.accessToken); // legacy compat
        localStorage.setItem("appUser", JSON.stringify({
          id: res.userId,
          name,
          avatar: res.avatar || null,
          subscriptionPlan: res.subscriptionPlan || "free",
          subscriptionStatus: res.subscriptionStatus || "inactive",
        }));
        localStorage.setItem("user", JSON.stringify({
          id: res.userId,
          name,
          avatar: res.avatar || null,
          subscriptionPlan: res.subscriptionPlan || "free",
          subscriptionStatus: res.subscriptionStatus || "inactive",
        }));
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />

      <div className="relative z-10 w-full max-w-[520px] bg-[#0c0c14] border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex max-h-[92vh]">
        <div className="hidden sm:flex w-[180px] flex-shrink-0 relative overflow-hidden bg-black flex-col justify-between p-6">
          <div className="absolute inset-0 bg-gradient-to-br from-red-600/30 via-black/90 to-[#030306]/95 z-0" />
          <div className="relative z-10 flex flex-col items-center justify-center h-full gap-3">
            {logoUrl ? (
              <img src={logoUrl} alt={settings.platformName || "StreamIT"} className="h-16 w-auto object-contain drop-shadow-2xl" />
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/50">
                  <Play className="w-6 h-6 text-white fill-white ml-0.5" />
                </div>
                <span className="text-white font-bold text-[15px] tracking-tight mt-2">{settings.platformName || "StreamIT"}</span>
              </>
            )}
            <p className="text-[10px] text-white/80 text-center font-medium mt-3 leading-relaxed">Your portal to premium cinematic experiences.</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col p-8 overflow-y-auto">
          <button onClick={onClose} className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full text-white hover:text-white hover:bg-white/5 transition-all z-10">
            <X className="w-4 h-4" />
          </button>

          <h2 className="text-white font-bold text-xl sm:text-2xl tracking-tight mb-1 pr-6">{isLogin ? "Welcome Back" : "Create Account"}</h2>
          <p className="text-white text-xs sm:text-sm mb-6 font-medium">
            {isLogin ? "New to the platform? " : "Already have an account? "}
            <button onClick={() => setIsLogin(!isLogin)} className="text-red-500 hover:underline font-bold transition-all">
              {isLogin ? "Sign Up Free" : "Log In"}
            </button>
          </p>

          {error && <div className="mb-4 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-500 text-xs font-semibold leading-snug">{error}</div>}

          {/* Phone / Email toggle for login */}
          {isLogin && (
            <div className="flex gap-1 mb-1 bg-zinc-900/60 rounded-full p-1">
              <button
                type="button"
                onClick={() => setUsePhone(false)}
                className={`flex-1 py-1.5 rounded-full text-[11px] font-bold transition-all ${!usePhone ? "bg-red-600 text-white" : "text-white hover:text-white"}`}
              >Email</button>
              <button
                type="button"
                onClick={() => setUsePhone(true)}
                className={`flex-1 py-1.5 rounded-full text-[11px] font-bold transition-all ${usePhone ? "bg-red-600 text-white" : "text-white hover:text-white"}`}
              >Phone</button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3.5">
            {!isLogin && (
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Full Name"
                className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder:text-white/80 px-4 py-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
              />
            )}

            {/* Email field — shown in register, or in login when not using phone */}
            {(!isLogin || !usePhone) && (
              <input
                type={isLogin ? "text" : "email"}
                required={!usePhone}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email Address"
                className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder:text-white/80 px-4 py-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
              />
            )}

            {/* Phone field — always shown in register (optional), or in login when phone tab active */}
            {(usePhone || !isLogin) && (
              <input
                type="tel"
                required={usePhone && isLogin}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={isLogin ? "Phone Number" : "Phone Number (optional — links app account)"}
                className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder:text-white/80 px-4 py-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all"
              />
            )}

            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full bg-zinc-900 border border-zinc-800 text-white placeholder:text-white/80 px-4 py-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-red-600 focus:ring-1 focus:ring-red-600 transition-all pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white hover:text-white transition-colors"
              >
                {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
            </div>
            <button disabled={loading} type="submit" className="w-full mt-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full transition-all text-xs flex justify-center items-center h-[44px] shadow-lg shadow-red-900/20 hover:-translate-y-0.5 active:translate-y-0">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (isLogin ? "Log In" : "Register")}
            </button>
          </form>

          <div className="mt-6 space-y-4">
            <div className="flex items-center gap-3 text-white/80 text-[10px] font-bold uppercase tracking-widest">
              <div className="flex-1 h-px bg-zinc-800" />
              <span>Or connect with</span>
              <div className="flex-1 h-px bg-zinc-800" />
            </div>
            <div className="flex items-center gap-2">
              <button className="flex-1 py-2 bg-zinc-950 border border-zinc-800 text-white/80 hover:text-white rounded-full text-[11px] font-bold transition-all hover:bg-zinc-900 flex items-center justify-center gap-1.5">
                Google
              </button>
              <button className="flex-1 py-2 bg-zinc-950 border border-zinc-800 text-white/80 hover:text-white rounded-full text-[11px] font-bold transition-all hover:bg-zinc-900 flex items-center justify-center gap-1.5">
                Apple
              </button>
            </div>
          </div>

          <p className="text-white/80 text-[10px] text-center leading-relaxed mt-6 font-medium">
            By continuing, you accept our <a href="#" className="text-white/80 hover:underline">Terms of Service</a> & <a href="#" className="text-white/80 hover:underline">Privacy Policy</a>.
          </p>
        </div>
      </div>
    </div>
  );
}

/* ─── HEADER ─── */
const NAV_TABS: { label: string; tab: Tab; icon: React.ReactNode }[] = [
  { label: "Home", tab: "home", icon: null },
  { label: "Short Drama", tab: "drama", icon: <Smartphone className="w-3.5 h-3.5" /> },
  { label: "Movies", tab: "movies", icon: <Film className="w-3.5 h-3.5" /> },
  { label: "TV Shows", tab: "tvshows", icon: <Tv className="w-3.5 h-3.5" /> },
  { label: "New & Hot", tab: "new", icon: <Flame className="w-3.5 h-3.5" /> },
];

export function PublicHeader({ activeTab, setActiveTab, onSignIn, onSignOut, user, onSubscribeClick }: {
  activeTab: Tab; setActiveTab: (t: Tab) => void; onSignIn: () => void; onSignOut?: () => void; user?: any; onSubscribeClick?: () => void;
}) {
  const [scrolled, setScrolled] = useState(false);
  const isSubscribed = user?.subscriptionStatus === "active" && user?.subscriptionPlan !== "free";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [, setLocation] = useLocation();
  const searchString = useSearch();

  const currentQuery = new URLSearchParams(searchString).get("q") || "";
  const [searchTerm, setSearchTerm] = useState(currentQuery);
  const isBrowsePage = typeof window !== "undefined" && window.location.pathname.startsWith("/browse");
  const [searchOpen, setSearchOpen] = useState(() => !!currentQuery || isBrowsePage);

  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [readNotifications, setReadNotifications] = useState<Set<string>>(new Set());
  const { data: notifData } = useGetPublicNotifications();

  const avatarRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const { settings } = useSettings();
  const { resolvedTheme } = useTheme();

  const getLogoUrl = () => {
    if (resolvedTheme === "dark" && settings.darkLogoUrl) return getImageUrl(settings.darkLogoUrl);
    if (resolvedTheme === "light" && settings.lightLogoUrl) return getImageUrl(settings.lightLogoUrl);
    return settings.logoUrl ? getImageUrl(settings.logoUrl) : "";
  };
  const logoUrl = getLogoUrl();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    setSearchTerm(currentQuery);
    if (currentQuery || isBrowsePage) setSearchOpen(true);
  }, [currentQuery, isBrowsePage]);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target as Node)) setUserDropdownOpen(false);
      if (notificationsRef.current && !notificationsRef.current.contains(e.target as Node)) setNotificationsOpen(false);
      const searchContainer = document.getElementById("public-search-container");
      if (searchContainer && !searchContainer.contains(e.target as Node) && !searchTerm.trim() && !isBrowsePage) {
        setSearchOpen(false);
      }
    };
    if (userDropdownOpen || searchOpen || notificationsOpen) document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, [userDropdownOpen, searchOpen, notificationsOpen, searchTerm, isBrowsePage]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchTerm(val);
    setLocation(`/browse?q=${encodeURIComponent(val)}`, { replace: true });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      if (searchTerm.trim()) {
        setLocation(`/browse?q=${encodeURIComponent(searchTerm.trim())}`);
      } else {
        setLocation("/browse");
      }
    }
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    if (!isBrowsePage) setSearchOpen(false);
    setLocation("/browse");
  };

  const notifications: any[] = notifData?.data || [];
  const unreadCount = notifications.filter((n: any) => !readNotifications.has(n._id || n.id)).length;

  const handleToggleNotifications = () => {
    setNotificationsOpen((o) => !o);
    if (!notificationsOpen) {
      const allIds = new Set(notifications.map((n: any) => n._id || n.id));
      setReadNotifications(allIds);
    }
  };

  return (
    <>
      <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${scrolled ? "bg-[#0a0a10]/95 backdrop-blur-md shadow-[0_2px_24px_rgba(0,0,0,0.85)] border-b border-white/5" : "bg-gradient-to-b from-[#030306]/95 via-[#030306]/40 to-transparent"}`}>
        <div className="px-4 sm:px-6 lg:px-10 xl:px-14">
          <div className="flex items-center justify-between h-[60px] lg:h-[68px]">
            <div className="flex items-center gap-6 lg:gap-8">
              <Link href="/" className="flex items-center gap-2.5 flex-shrink-0 group">
                {logoUrl ? (
                  <img src={logoUrl} alt={settings.platformName || "StreamIT"} className="h-8 w-auto object-contain group-hover:scale-105 transition-transform" />
                ) : (
                  <>
                    <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/50 group-hover:scale-105 transition-transform">
                      <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                    </div>
                    <span className="text-white font-bold text-xl tracking-tight hidden sm:block">{settings.platformName || "StreamIT"}</span>
                  </>
                )}
              </Link>

              <nav className="hidden lg:flex items-center gap-1">
                {NAV_TABS.map(({ label, tab, icon }) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`relative flex items-center gap-1.5 px-3.5 py-2 text-[13.5px] font-bold rounded-full transition-all duration-200 text-white hover:bg-white/10`}
                  >
                    {icon}
                    {label}
                    {activeTab === tab && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-[2px] bg-red-600 rounded-full" />
                    )}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2.5" id="public-search-container">
              <div className="relative flex items-center">
                <div className={`flex items-center overflow-hidden transition-all duration-300 rounded-full border ${searchOpen ? "w-44 sm:w-52 bg-black/80 border-zinc-800" : "w-9 h-9 border-transparent"}`}>
                  {searchOpen && <Search className="absolute left-3 w-3.5 h-3.5 text-white/80 pointer-events-none" />}
                  {searchOpen ? (
                    <input
                      autoFocus
                      value={searchTerm}
                      onChange={handleSearchChange}
                      onKeyDown={handleSearchKeyDown}
                      placeholder="Search titles..."
                      className="w-full bg-transparent text-white text-xs pl-8 pr-7 py-2 focus:outline-none placeholder:text-white"
                    />
                  ) : (
                    <button onClick={() => { setSearchOpen(true); setLocation("/browse"); }} className="w-9 h-9 flex items-center justify-center text-white hover:text-white transition-colors rounded-full hover:bg-white/5">
                      <Search className="w-[17px] h-[17px]" />
                    </button>
                  )}
                  {searchOpen && <button onMouseDown={handleClearSearch} className="absolute right-2.5 text-white hover:text-white"><X className="w-3 h-3" /></button>}
                </div>
              </div>

              <div className="relative" ref={notificationsRef}>
                <button
                  onClick={handleToggleNotifications}
                  className="relative w-9 h-9 flex items-center justify-center text-white hover:text-white rounded-full hover:bg-white/5 transition-all"
                >
                  <Bell className="w-[17px] h-[17px]" />
                  {unreadCount > 0 && (
                    <span className="absolute top-1.5 right-1.5 min-w-[14px] h-[14px] bg-red-600 rounded-full border border-black flex items-center justify-center text-[8px] font-bold text-white px-0.5">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  )}
                </button>
                {notificationsOpen && (
                  <div className="absolute top-[calc(100%+8px)] right-0 w-[300px] bg-[#0a0a0a] border border-border rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-3.5 border-b border-border flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">Notifications</span>
                        {unreadCount > 0 && <span className="bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">{unreadCount} new</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            const allIds = new Set(notifications.map((n: any) => n._id || n.id));
                            setReadNotifications(allIds);
                          }}
                           className="text-white/70 hover:text-white text-[10px] font-medium px-2 py-1 rounded-full hover:bg-white/5 transition-colors"
                        >
                          Mark all as read
                        </button>
                        <button onClick={() => setNotificationsOpen(false)} className="text-white/70 hover:text-white"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                    <div className="max-h-[300px] overflow-y-auto divide-y divide-border/60">
                      {notifications.length === 0 ? (
                        <div className="p-6 text-center">
                          <Bell className="w-8 h-8 text-white/60 mx-auto mb-2" />
                          <p className="text-white/70 text-xs font-medium">No notifications yet</p>
                        </div>
                      ) : (
                        notifications.map((n: any) => {
                          const nid = n._id || n.id;
                          const isRead = readNotifications.has(nid);
                          const timeStr = formatRelativeTime(n.createdAt);
                          return (
                            <div key={nid} className={`p-3.5 transition-colors cursor-pointer ${isRead ? "hover:bg-white/5" : "bg-primary/5 hover:bg-primary/10"}`} onClick={() => setNotificationsOpen(false)}>
                              {!isRead && <span className="inline-block w-1.5 h-1.5 bg-primary rounded-full mr-1.5 mb-0.5 align-middle" />}
                              <p className="text-white text-xs font-bold leading-tight inline">{n.title}</p>
                              {n.text && <p className="text-white/70 text-[11px] mt-1 leading-relaxed line-clamp-2">{n.text}</p>}
                              {timeStr && <p className="text-white/65 text-[10px] mt-1.5 font-medium">{timeStr}</p>}
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden sm:block w-px h-5 bg-zinc-800 mx-0.5" />

              {!isSubscribed && (
                <button
                  onClick={onSubscribeClick || (() => setLocation("/browse"))}
                   className="hidden sm:flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full text-xs transition-all shadow-md shadow-red-900/20 hover:-translate-y-0.5 active:translate-y-0"
                >
                  <Crown className="w-3.5 h-3.5" />
                  Subscribe
                </button>
              )}

              <div className="relative" ref={avatarRef}>
                <button
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="flex items-center gap-2 pl-1 pr-1.5 py-1 rounded-full hover:bg-white/5 transition-all ml-1"
                >
                  {user && user.avatar ? (
                    <img
                      src={getImageUrl(user.avatar)}
                      alt={user.name || "User"}
                      className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-red-600 to-red-900 flex items-center justify-center flex-shrink-0 uppercase font-bold text-xs text-white">
                      {user ? user.name?.[0] || "U" : <User className="w-4 h-4 text-white" />}
                    </div>
                  )}
                  <ChevronDown className={`w-3 h-3 text-white/80 hidden sm:block transition-transform duration-200 ${userDropdownOpen ? "rotate-180" : ""}`} />
                </button>
                {userDropdownOpen && <UserDropdown onSignIn={onSignIn} onSignOut={onSignOut} user={user} />}
              </div>

              <button className="lg:hidden ml-0.5 w-9 h-9 flex items-center justify-center text-white hover:text-white rounded-full hover:bg-white/5 transition-all" onClick={() => setMobileOpen(!mobileOpen)}>
                <div className="flex flex-col gap-[5px] w-5">
                  <span className={`block h-[1.5px] bg-current rounded-full transition-all duration-300 ${mobileOpen ? "rotate-45 translate-y-[6.5px]" : ""}`} />
                  <span className={`block h-[1.5px] bg-current rounded-full transition-all duration-300 ${mobileOpen ? "opacity-0 scale-x-0" : ""}`} />
                  <span className={`block h-[1.5px] bg-current rounded-full transition-all duration-300 ${mobileOpen ? "-rotate-45 -translate-y-[6.5px]" : ""}`} />
                </div>
              </button>
            </div>
          </div>
        </div>

        <div className={`lg:hidden overflow-hidden transition-all duration-300 ${mobileOpen ? "max-h-80 opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="bg-[#0a0a10] border-t border-zinc-800 px-4 py-4 space-y-2">
            {NAV_TABS.map(({ label, tab, icon }) => (
              <button
                key={tab}
                onClick={() => { setActiveTab(tab); setMobileOpen(false); }}
                 className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-full text-sm font-bold transition-all ${activeTab === tab ? "bg-red-600/15 text-white" : "text-white hover:bg-white/10"}`}
              >
                {activeTab === tab && <span className="w-1.5 h-1.5 rounded-full bg-red-600 flex-shrink-0" />}
                {icon}
                {label}
              </button>
            ))}
            {!isSubscribed && (
              <button
                onClick={onSubscribeClick || (() => { setLocation("/browse"); setMobileOpen(false); })}
                 className="w-full mt-2 py-3 bg-red-600 hover:bg-red-700 text-white font-bold rounded-full text-sm transition-all flex items-center justify-center gap-2"
              >
                <Crown className="w-4 h-4" /> Subscribe Now
              </button>
            )}
          </div>
        </div>
      </header>
    </>
  );
}

/* ─── FOOTER ─── */
export function PublicFooter() {
  const { settings } = useSettings();
  const { resolvedTheme } = useTheme();
  const [, setLocation] = useLocation();

  const { data: pagesData } = useGetPages({ limit: 50 });
  const pages: any[] = (pagesData?.data || []).filter((p: any) => 
    (p.status === "published" || !p.status) &&
    p.title && p.title.trim() !== "" &&
    p.slug && p.slug.trim() !== "" &&
    p.slug !== "faq" && p.slug !== "help"
  );

  const getLogoUrl = () => {
    if (resolvedTheme === "dark" && settings.darkLogoUrl) return getImageUrl(settings.darkLogoUrl);
    if (resolvedTheme === "light" && settings.lightLogoUrl) return getImageUrl(settings.lightLogoUrl);
    return settings.logoUrl ? getImageUrl(settings.logoUrl) : "";
  };
  const logoUrl = getLogoUrl();

  const socialLinks = [
    { label: "Facebook", d: "M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z", url: settings.facebookUrl },
    { label: "Twitter", d: "M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z", url: settings.twitterUrl },
    { label: "YouTube", d: "M22.54 6.42a2.78 2.78 0 0 0-1.95-1.97C18.88 4 12 4 12 4s-6.88 0-8.59.47A2.78 2.78 0 0 0 1.46 6.42 29 29 0 0 0 1 12a29 29 0 0 0 .46 5.58 2.78 2.78 0 0 0 1.95 1.97C5.12 20 12 20 12 20s6.88 0 8.59-.47a2.78 2.78 0 0 0 1.95-1.97A29 29 0 0 0 23 12a29 29 0 0 0-.46-5.58zM9.75 15.02V8.98L15.5 12l-5.75 3.02z", url: settings.youtubeUrl },
    { label: "Instagram", d: "M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37zM17.5 6.5h.01M7.5 2h9A5.5 5.5 0 0 1 2 7.5v9a5.5 5.5 0 0 1-5.5 5.5h-9A5.5 5.5 0 0 1 2 16.5v-9A5.5 5.5 0 0 1 7.5 2z", url: settings.instagramUrl },
  ].filter(link => link.url && link.url.trim() !== "");

  return (
    <footer className="bg-[#040407] border-t border-zinc-900 mt-20 pt-16 pb-10">
      <div className="px-6 sm:px-10 lg:px-14 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 lg:gap-8 mb-12">
          <div className="space-y-4">
            <div className="flex items-center gap-2.5">
              {logoUrl ? (
                <img src={logoUrl} alt={settings.platformName || "StreamIT"} className="h-9 w-auto object-contain" />
              ) : (
                <>
                  <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center shadow-lg shadow-red-600/40">
                    <Play className="w-4 h-4 text-white fill-white ml-0.5" />
                  </div>
                  <span className="text-white font-bold text-xl tracking-tight">{settings.platformName || "StreamIT"}</span>
                </>
              )}
            </div>
            <p className="text-white text-xs leading-relaxed max-w-xs">{settings.siteDescription || "Your premium OTT destination for movies, TV shows, and exclusive short dramas."}</p>
            <div className="flex items-center gap-2 pt-2">
              {socialLinks.map((s) => (
                <a key={s.label} href={s.url} target="_blank" rel="noopener noreferrer" aria-label={s.label}                  className="w-8 h-8 flex items-center justify-center rounded-full border border-zinc-800 text-white hover:border-red-600 hover:bg-red-600/5 transition-all">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round">
                    <path d={s.d} />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-bold text-[11px] tracking-widest uppercase">Browse Catalog</h4>
            <ul className="space-y-2.5">
              {[
                { label: "Movies", href: "/browse" },
                { label: "TV Shows", href: "/browse" },
                { label: "Short Dramas", href: "/browse" },
                { label: "New & Hot", href: "/browse" },
              ].map((itm) => (
                <li key={itm.label}>
                  <button onClick={() => setLocation(itm.href)} className="text-white hover:text-white text-xs font-semibold transition-colors text-left">{itm.label}</button>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 space-y-4">
            <h4 className="text-white font-bold text-[11px] tracking-widest uppercase">Help & Info</h4>
            <ul className="grid grid-cols-2 gap-x-6 gap-y-2.5">
              {pages.length > 0 ? pages.map((p: any) => (
                <li key={p.slug || p.id}>
                  <button 
                    onClick={() => {
                      if (p.slug === "faq" || p.slug === "help") {
                        setLocation("/help-support");
                      } else {
                        setLocation(`/page/${p.slug}`);
                      }
                    }} 
                    className="text-white hover:text-white text-xs font-semibold transition-colors text-left truncate max-w-full" 
                    title={p.title}
                  >
                    {p.title}
                  </button>
                </li>
              )) : (
                <li className="text-white text-xs col-span-2">No pages available</li>
              )}
            </ul>
          </div>

          <div className="space-y-4">
            <h4 className="text-white font-bold text-[11px] tracking-widest uppercase">Contact Info</h4>
            <ul className="space-y-3 text-white text-xs">
              {settings.contactNo && (
                <li className="flex flex-col gap-0.5">
                  <span className="text-white/75 font-semibold uppercase tracking-wider text-[9px]">Phone</span>
                  <span className="font-medium text-white/80 text-[11px]">{settings.contactNo}</span>
                </li>
              )}
              {settings.inquiryEmail && (
                <li className="flex flex-col gap-0.5">
                  <span className="text-white/75 font-semibold uppercase tracking-wider text-[9px]">Email</span>
                  <a href={`mailto:${settings.inquiryEmail}`} className="font-medium text-white/80 text-[11px] hover:text-primary transition-colors truncate block max-w-full">{settings.inquiryEmail}</a>
                </li>
              )}
              <li className="text-white text-[10px] mt-2 font-medium leading-relaxed pt-2 border-t border-zinc-900">
                Support Hours:<br />
                Mon - Sat: 9:00 AM - 6:00 PM
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-zinc-900 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-white/80 text-xs font-medium">{settings.copyrightText || "2025 StreamIT. All Rights Reserved."}</p>
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-x-5 gap-y-2">
            {pages.map((p: any) => (
              <button 
                key={p.slug || p.id} 
                onClick={() => {
                  if (p.slug === "faq" || p.slug === "help") {
                    setLocation("/help-support");
                  } else {
                    setLocation(`/page/${p.slug}`);
                  }
                }} 
                className="text-white/80 hover:text-white text-[11px] font-bold transition-colors whitespace-nowrap"
              >
                {p.title}
              </button>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}

/* ─── MAIN PAGE ─── */
export default function StreamingHomePage() {
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showSignIn, setShowSignIn] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [toastMsg, setToastMsg] = useState("");
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [pendingPlay, setPendingPlay] = useState<any>(null);
  const [showPreroll, setShowPreroll] = useState(false);

  // Prefetch player ads so we know if pre-roll exists before showing it
  const { data: playerAdsData } = useGetPublicAds({ placement: 'Player' });
  const { settings } = useSettings();
  const hasPlayerAds = (playerAdsData?.data?.length ?? 0) > 0 || !!settings?.vastPrerollUrl;

  const { data: homeData } = useGetWebHome();
  const rawBanners = homeData?.heroContent || [];
  const hasHeroForTab = useMemo(() => {
    if (activeTab === "home") return rawBanners.length > 0;
    if (activeTab === "drama") return rawBanners.some((b: any) => b.contentType === "drama");
    if (activeTab === "movies") return rawBanners.some((b: any) => b.type === "movie" || b.contentType === "movie");
    if (activeTab === "tvshows") return rawBanners.some((b: any) => b.type === "show" || b.contentType === "series");
    return false;
  }, [rawBanners, activeTab]);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 3500);
  };

  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem("appUser") || localStorage.getItem("user");
        if (storedUser) setUser(JSON.parse(storedUser));
        else setUser(null);
      } catch (e) { /* ignore */ }
    };
    loadUser();
    window.addEventListener("user-updated", loadUser);
    return () => window.removeEventListener("user-updated", loadUser);
  }, []);

  useEffect(() => {
    const tabNames: Record<string, string> = {
      home: "Home",
      drama: "Short Dramas",
      movies: "Movies",
      tvshows: "TV Shows",
      new: "New & Hot",
    };
    const titleName = tabNames[activeTab] || "Home";
    const appName = settings?.platformName || "Flipshorts";
    document.title = `${titleName} | ${appName}`;
  }, [activeTab, settings?.platformName]);

  const handleSignOut = () => {
    localStorage.removeItem("appUser");
    localStorage.removeItem("appAccessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    setUser(null);
    window.location.reload();
  };

  const isSubscribed = user?.subscriptionStatus === "active" && user?.subscriptionPlan !== "free";

  const navigateToContent = useCallback((item: any) => {
    const id = item.contentId || item.id || item._id;
    const contentType = (item.contentType || "").toLowerCase();
    const type = (item.type || "").toLowerCase();
    const isDrama = contentType === "drama";
    const isMovie = type === "movie" || contentType === "movie";
    const isShow = type === "show" || type === "series" || contentType === "series";
    if (isDrama) {
      setLocation(item.trailerUrl ? `/drama/${id}/episode/0` : `/drama/${id}/episode/1`);
    } else if (isMovie) {
      setLocation(`/movie/${id}`);
    } else if (isShow) {
      setLocation(`/show/${id}`);
    } else {
      setLocation(`/movie/${id}`);
    }
  }, [setLocation]);

  const handlePlay = useCallback((item: any) => {
    // Show pre-roll ad before navigation (only for non-subscribers)
    if (hasPlayerAds && !isSubscribed) {
      setPendingPlay(item);
      setShowPreroll(true);
    } else {
      navigateToContent(item);
    }
  }, [hasPlayerAds, isSubscribed, navigateToContent]);

  const handlePrerollFinished = useCallback(() => {
    setShowPreroll(false);
    if (pendingPlay) {
      navigateToContent(pendingPlay);
      setPendingPlay(null);
    }
  }, [pendingPlay, navigateToContent]);

  const handleSelectDrama = useCallback((drama: any) => {
    const id = drama.id || drama._id;
    if (hasPlayerAds && !isSubscribed) {
      setPendingPlay({ ...drama, contentType: 'drama', trailerUrl: drama.trailerUrl });
      setShowPreroll(true);
    } else {
      setLocation(drama.trailerUrl ? `/drama/${id}/episode/0` : `/drama/${id}/episode/1`);
    }
  }, [hasPlayerAds, isSubscribed, setLocation]);

  return (
    <div className="min-h-screen bg-[#030306] font-sans selection:bg-red-600/30 text-white pb-20 sm:pb-0">
      <PublicHeader
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSignIn={() => setShowSignIn(true)}
        onSignOut={handleSignOut}
        user={user}
        onSubscribeClick={() => setPlansModalOpen(true)}
      />

      <main>
        {activeTab !== "new" && (
          <>
            <Hero activeTab={activeTab} onPlay={handlePlay} onSubscribeClick={() => setPlansModalOpen(true)} isSubscribed={isSubscribed} />
            {!hasHeroForTab && <div className="h-20" />}
          </>
        )}

        {activeTab === "home" && (
          <HomeTab onPlay={handlePlay} onSelectDrama={handleSelectDrama} onSubscribeClick={() => setPlansModalOpen(true)} isSubscribed={isSubscribed} />
        )}
        {activeTab === "movies" && (
          <MoviesTab onPlay={handlePlay} />
        )}
        {activeTab === "tvshows" && (
          <TVShowsTab onPlay={handlePlay} />
        )}
        {activeTab === "drama" && (
          <ShortDramaTab onSelect={handleSelectDrama} />
        )}
        {activeTab === "new" && <NewHotTab onPlay={handlePlay} />}
      </main>

      <PublicFooter />

      {/* ── PRE-ROLL AD OVERLAY ── */}
      {showPreroll && (
        <div className="fixed inset-0 z-[400] bg-black">
          <PlayerPrerollAd onFinished={handlePrerollFinished} />
        </div>
      )}

      {showSignIn && <SignInModal onClose={() => setShowSignIn(false)} />}

      <SubscriptionPlansModal
        isOpen={plansModalOpen}
        onClose={() => setPlansModalOpen(false)}
      />

      {toastMsg && (
        <div className="fixed bottom-6 right-6 z-[300] bg-[#0c0c14]/95 border border-red-600/40 px-5 py-3.5 rounded-xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="w-2 h-2 rounded-full bg-red-600 animate-ping" />
          <span className="text-white text-xs font-bold">{toastMsg}</span>
        </div>
      )}

      <style>{`
        html { scroll-behavior: smooth; }
        * { scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }
        body { background: #030306; }
      `}</style>
    </div>
  );
}
