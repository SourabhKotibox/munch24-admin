import { useState, useEffect, useRef } from "react";
import { useSearch, useLocation, useParams } from "wouter";
import {
  Search, X, Loader2, Film, Tv, Smartphone, Crown, Flame,
  SlidersHorizontal, ChevronLeft, ChevronRight, TrendingUp, Sparkles, Star,
} from "lucide-react";
import { PublicHeader, PublicFooter } from "./streaming-home";
import { useGetWebBrowse, useGetGenres } from "@/lib/api-client";
import SubscriptionPlansModal from "@/components/SubscriptionPlansModal";
import { PortraitCard } from "@/components/ContentCard";

type ContentType = "all" | "movie" | "show" | "drama";

const CONTENT_TYPES: { key: ContentType; label: string; icon: React.ReactNode }[] = [
  { key: "all", label: "All", icon: <SlidersHorizontal className="w-4 h-4" /> },
  { key: "movie", label: "Movies", icon: <Film className="w-4 h-4" /> },
  { key: "show", label: "TV Shows", icon: <Tv className="w-4 h-4" /> },
  { key: "drama", label: "Short Drama", icon: <Smartphone className="w-4 h-4" /> },
];

const TAB_TO_TYPE: Record<string, ContentType> = {
  drama: "drama",
  show: "show",
  tvshows: "show",
  movie: "movie",
  movies: "movie",
  all: "all",
  new: "movie",
  trending: "movie",
  "top-rated": "movie",
  action: "movie",
};

export default function CategoriesBrowsePage() {
  const searchString = useSearch();
  const [, setLocation] = useLocation();
  const params = useParams<{ tab?: string }>();
  const [activeTab, setActiveTab] = useState<"home" | "movies" | "tvshows" | "drama" | "new">("home");
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);

  const searchParams = new URLSearchParams(searchString);
  const isTrending = searchParams.has("trending");
  const isNew = searchParams.has("new");
  const isTopRated = searchParams.has("top-rated");
  const isTv = searchParams.has("tv");
  const isAction = searchParams.has("action");
  const isDramaSeries = searchParams.has("drama-series");
  const isShortDrama = searchParams.has("short-drama");
  const genreParam = searchParams.get("genre");

  const initialQ = searchParams.get("q") || "";
  const [searchInput, setSearchInput] = useState(initialQ);
  const [debouncedQ, setDebouncedQ] = useState(initialQ);

  const initialType: ContentType = searchParams.has("trending") || searchParams.has("new")
    ? "all"
    : isTv || isDramaSeries
    ? "show"
    : isShortDrama
    ? "drama"
    : isAction || isTopRated
    ? "movie"
    : (params as any)?.tab
    ? (TAB_TO_TYPE[(params as any).tab] || "all")
    : "all";

  const [contentType, setContentType] = useState<ContentType>(initialType);
  const [activeGenre, setActiveGenre] = useState(genreParam ? genreParam : isAction ? "Action" : isDramaSeries ? "Drama" : "All");
  const [page, setPage] = useState(1);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem("appUser");
    if (stored) try { setUser(JSON.parse(stored)); } catch {}
  }, []);

  // Sync search query from URL
  useEffect(() => {
    const q = new URLSearchParams(searchString).get("q") || "";
    setSearchInput(q);
    setDebouncedQ(q);
    setPage(1);
  }, [searchString]);

  // Sync category state from URL query parameters
  useEffect(() => {
    const searchParams = new URLSearchParams(searchString);
    if (searchParams.has("trending") || searchParams.has("new") || searchParams.has("top-rated")) {
      setContentType("all");
      setActiveGenre("All");
    } else if (searchParams.has("tv")) {
      setContentType("show");
      setActiveGenre("All");
    } else if (searchParams.has("drama-series")) {
      setContentType("show");
      setActiveGenre("Drama");
    } else if (searchParams.has("short-drama")) {
      setContentType("drama");
      setActiveGenre("All");
    } else if (searchParams.has("action")) {
      setContentType("movie");
      setActiveGenre("Action");
    } else if (searchParams.has("top-rated")) {
      setContentType("movie");
      setActiveGenre("All");
    } else if (searchParams.has("genre")) {
      const type = (params as any)?.tab ? TAB_TO_TYPE[(params as any).tab] || "all" : "all";
      setContentType(type);
      setActiveGenre(searchParams.get("genre") || "All");
    } else if ((params as any)?.tab) {
      const type = TAB_TO_TYPE[(params as any).tab] || "all";
      setContentType(type);
      setActiveGenre("All");
    }
    setPage(1);
  }, [searchString, (params as any)?.tab]);

  const getHeading = () => {
    if (isTrending) return "Trending Now";
    if (isNew) return "New Releases";
    if (isTopRated) return "Top Rated Movies";
    if (isTv) return "Popular TV Shows";
    if (isAction) return "Action & Adventure";
    if (isDramaSeries) return "Drama Series";
    if (isShortDrama) return "Short Dramas";
    if (activeGenre !== "All") return activeGenre;
    return CONTENT_TYPES.find(t => t.key === contentType)?.label || "Browse";
  };

  const getHeadingIcon = () => {
    if (isTrending) return <TrendingUp className="w-5 h-5 text-primary" />;
    if (isNew) return <Sparkles className="w-5 h-5 text-primary" />;
    if (isTopRated) return <Star className="w-5 h-5 text-primary" />;
    if (isTv) return <Tv className="w-5 h-5 text-primary" />;
    if (isAction) return <Flame className="w-5 h-5 text-primary" />;
    if (isDramaSeries) return <Film className="w-5 h-5 text-primary" />;
    if (isShortDrama) return <Smartphone className="w-5 h-5 text-primary" />;
    return <TrendingUp className="w-5 h-5 text-primary" />;
  };

  const handleSearchChange = (val: string) => {
    setSearchInput(val);
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedQ(val);
      setLocation(`/browse?q=${encodeURIComponent(val)}`, { replace: true });
    }, 350);
  };

  const { data: genresData } = useGetGenres({ limit: 50 });
  const genres: string[] = ["All", ...((genresData?.data || []).map((g: any) => g.name))];

  const browseOptions = {
    type: contentType,
    genre: activeGenre,
    page,
    search: debouncedQ || undefined,
    limit: 24,
    section: isTrending ? "trending" : isNew ? "new" : isTopRated ? "top-rated" : undefined,
  };

  const { data: browseData, isLoading, isFetching } = useGetWebBrowse(browseOptions);
  const items: any[] = browseData?.items || [];
  const pagination = browseData?.pagination;

  const handlePlay = (item: any) => {
    const id = item.id || item._id;
    const ct = item.contentType || contentType;
    if (ct === "drama") {
      if (item.trailerUrl) {
        setLocation(`/drama/${id}/episode/0`);
      } else {
        setLocation(`/drama/${id}/episode/1`);
      }
    } else if (ct === "show" || ct === "series") {
      setLocation(`/show/${id}`);
    } else {
      setLocation(`/movie/${id}`);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem("appUser");
    localStorage.removeItem("appAccessToken");
    setUser(null);
    window.location.reload();
  };

  return (
    <div className="min-h-screen bg-[#030306] text-white">
      <PublicHeader
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === "tvshows") setLocation("/tv-shows-browse");
          else { setActiveTab(tab); setLocation("/"); }
        }}
        onSignIn={() => setLocation("/login")}
        onSignOut={handleSignOut}
        user={user}
        onSubscribeClick={() => setPlansModalOpen(true)}
      />

      <div className="pt-20 pb-20 min-h-screen">
        {/* Search Hero */}
        <div className="px-4 sm:px-8 lg:px-14 pt-8 pb-6">
          <div className="max-w-2xl">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white" />
              <input
                ref={inputRef}
                autoFocus={!!initialQ}
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search movies, TV shows, short dramas..."
                className="w-full bg-black border border-white/20 focus:border-primary focus:ring-1 focus:ring-primary/30 text-white text-base placeholder:text-white/60 pl-12 pr-12 py-3.5 rounded-2xl transition-all outline-none"
              />
              {searchInput && (
                <button
                  onClick={() => { handleSearchChange(""); inputRef.current?.focus(); }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Type Tabs */}
        <div className="px-4 sm:px-8 lg:px-14 mb-5">
          <div className="flex items-center gap-2 flex-wrap">
            {CONTENT_TYPES.map(({ key, label, icon }) => (
              <button
                key={key}
                onClick={() => { 
                  setContentType(key); 
                  setActiveGenre("All"); 
                  setPage(1); 
                  setLocation("/browse");
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all border ${
                  contentType === key
                    ? "bg-primary border-primary text-white shadow-lg shadow-red-900/30"
                    : "border-white/20 text-white hover:bg-white/10"
                }`}
              >
                {icon} {label}
              </button>
            ))}

            <div className="flex-1" />

            {debouncedQ && (
              <div className="flex items-center gap-2 text-sm text-white">
                <span>Results for</span>
                <span className="text-white font-bold">"{debouncedQ}"</span>
                <span>· {pagination?.total ?? 0} found</span>
              </div>
            )}
          </div>
        </div>

        {/* Genre Filter (hide during search) */}
        {!debouncedQ && (
          <div
            className="flex gap-2 overflow-x-auto px-4 sm:px-8 lg:px-14 pb-2 mb-6"
            style={{ scrollbarWidth: "none" } as React.CSSProperties}
          >
            {genres.map((g) => (
              <button
                key={g}
                onClick={() => { 
                  setActiveGenre(g); 
                  setPage(1); 
                  if (isAction && g !== "Action") {
                    setLocation("/browse");
                  }
                }}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-all border ${
                  activeGenre === g
                    ? "bg-primary border-primary text-white"
                    : "bg-transparent border-white/20 text-white hover:border-white/50"
                }`}
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {/* Results Header */}
        <div className="px-4 sm:px-8 lg:px-14 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {!debouncedQ && (
              <>
                <span className="flex items-center gap-1.5 text-white font-bold text-lg">
                  {getHeadingIcon()}
                  {getHeading()}
                </span>
                {pagination?.total !== undefined && (
                  <span className="text-white text-sm">{pagination.total} titles</span>
                )}
              </>
            )}
          </div>
        </div>

        {/* Content Grid */}
        <div className="px-4 sm:px-8 lg:px-14">
          {isLoading || isFetching ? (
            <div className="flex items-center justify-center py-24">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Search className="w-12 h-12 text-white mb-4" />
              <p className="text-white font-bold text-xl mb-2">
                {debouncedQ ? `No results for "${debouncedQ}"` : "No content found"}
              </p>
              <p className="text-white text-sm">
                {debouncedQ ? "Try different keywords or change the content type" : "Try a different genre or category"}
              </p>
              {debouncedQ && (
                <button
                  onClick={() => handleSearchChange("")}
                  className="mt-6 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all"
                >
                  Clear Search
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((item: any) => (
                <PortraitCard key={item.id || item._id} item={item} onClick={() => handlePlay(item)} fullWidth compactStyle />
              ))}
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10 px-4">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="w-10 h-10 rounded-2xl border border-white/20 text-white hover:border-white/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-1.5">
              {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                let p = i + 1;
                if (pagination.totalPages > 5) {
                  const half = Math.floor(5 / 2);
                  p = Math.max(1, Math.min(page - half + i, pagination.totalPages - 4 + i));
                }
                return (
                  <button
                    key={p}
                    onClick={() => setPage(p)}
                    className={`w-10 h-10 rounded-2xl text-sm font-bold transition-all ${
                      page === p
                        ? "bg-primary text-white border border-primary"
                        : "border border-white/20 text-white hover:border-white/50"
                    }`}
                  >
                    {p}
                  </button>
                );
              })}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              className="w-10 h-10 rounded-2xl border border-white/20 text-white hover:border-white/50 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition-all"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      <PublicFooter />

      <SubscriptionPlansModal
        isOpen={plansModalOpen}
        onClose={() => setPlansModalOpen(false)}
      />

      <style>{`
        * { scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }
        body { background: #030306; }
      `}</style>
    </div>
  );
}
