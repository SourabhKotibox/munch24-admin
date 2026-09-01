
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import {
  Play, Star, ChevronRight, Tv, Loader2, Search, X,
  SlidersHorizontal, ChevronDown, Layers, Clock,
  TrendingUp, Flame, Sparkles, ArrowLeft, Eye,
} from "lucide-react";
import { useGetWebBrowse, useGetWebHome, getImageUrl, useGetWatchHistory } from "@/lib/api-client";
import { PublicHeader, PublicFooter } from "@/pages/streaming-home";
import { useSettings } from "@/contexts/SettingsContext";
import SubscriptionPlansModal from "@/components/SubscriptionPlansModal";
import { PortraitCard } from "@/components/ContentCard";

type Tab = "home" | "movies" | "tvshows" | "drama" | "new";

const GENRES = ["All", "Action", "Drama", "Comedy", "Thriller", "Romance", "Horror", "Sci-Fi", "Fantasy", "Crime", "Documentary"];
const SORT_OPTIONS = [
  { label: "Popular", value: "popular" },
  { label: "New Releases", value: "new" },
  { label: "Top Rated", value: "rated" },
  { label: "A–Z", value: "az" },
];

function ShowCard({ item, onPlay }: { item: any; onPlay: (item: any) => void }) {
  return <PortraitCard item={item} onClick={() => onPlay(item)} />;
}

function FeaturedShowBanner({ item, onPlay }: { item: any; onPlay: (item: any) => void }) {
  const [, setLocation] = useLocation();
  if (!item) return null;

  return (
    <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: "21/9" }}>
      <img
        src={item.backdrop ? getImageUrl(item.backdrop) : (item.poster ? getImageUrl(item.poster) : '')}
        alt={item.title}
        className="w-full h-full object-cover"
        onError={(e) => {
          const t = e.target as HTMLImageElement;
          t.onerror = null;
          t.style.backgroundColor = '#111';
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-r from-[#030306] via-[#030306]/60 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#030306]/80 via-transparent to-transparent" />

      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-10 max-w-xl">
        <div className="flex items-center gap-2 mb-3">
          <Tv className="w-3.5 h-3.5 text-primary" />
          <span className="text-primary text-[11px] font-black tracking-widest uppercase">Featured Series</span>
        </div>
        <h2 className="text-white font-black text-2xl sm:text-4xl tracking-tight leading-none mb-2">{item.title}</h2>
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="flex items-center gap-1 text-amber-400 text-xs font-bold">
            <Star className="w-3 h-3 fill-amber-400" /> {item.imdbRating}
          </span>
          {item.seasons && <span className="text-white/80 text-xs font-semibold">{item.seasons} Seasons</span>}
          <span className="text-white/80">·</span>
          <span className="text-white/80 text-xs font-semibold">{item.year}</span>
          {item.genres?.slice(0, 2).map((g: string) => (
            <span key={g} className="text-[10px] px-2 py-0.5 rounded-full border border-zinc-800 text-white/80 font-semibold">{g}</span>
          ))}
        </div>
        <p className="text-white/80 text-xs sm:text-sm leading-relaxed line-clamp-2 mb-5 max-w-md">{item.description}</p>
        <div className="flex items-center gap-3">
          <button
            onClick={() => onPlay(item)}
            className="flex items-center gap-2 px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-primary/30 hover:-translate-y-0.5"
          >
            <Play className="w-4 h-4 fill-white" /> Watch Now
          </button>
          <button
            onClick={() => setLocation(`/show/${item.id || item._id}`)}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/15 backdrop-blur-sm text-white font-bold rounded-xl text-sm border border-white/10 transition-all"
          >
            <Eye className="w-4 h-4" /> More Info
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TvShowsPublicPage() {
  const [, setLocation] = useLocation();
  const [activeTab] = useState<Tab>("tvshows");
  const [activeGenre, setActiveGenre] = useState("All");
  const [sortBy, setSortBy] = useState("popular");
  const [sortOpen, setSortOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [page, setPage] = useState(1);

  const { data: browseData, isLoading } = useGetWebBrowse({ type: "show", genre: activeGenre, page });
  const { data: homeData } = useGetWebHome();
  const { data: watchHistoryData } = useGetWatchHistory({ limit: 20 });

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("appUser");
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch {}
  }, []);

  const handlePlay = (item: any) => {
    const id = item.contentId || item.id || item._id;
    const type = (item.type || item.contentType || "").toLowerCase();
    const isDrama = type === "drama";
    const isShow = type === "show" || type === "series";
    if (isDrama) {
      if (item.trailerUrl) {
        setLocation(`/drama/${id}/episode/0`);
      } else {
        setLocation(`/drama/${id}/episode/1`);
      }
    } else if (isShow) {
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

  const allShows: any[] = browseData?.items || [];
  const featuredShow = homeData?.tvShows?.[0] || allShows[0];
  const totalShows = browseData?.pagination?.total || 0;

  const filtered = searchTerm.trim()
    ? allShows.filter((s) => s.title?.toLowerCase().includes(searchTerm.toLowerCase()))
    : allShows;

  return (
    <div className="min-h-screen bg-[#030306] font-sans text-white selection:bg-primary/30">
      <PublicHeader
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab === "home") setLocation("/");
          else if (tab === "movies") setLocation("/browse?type=movie");
          else if (tab === "drama") setLocation("/browse?type=drama");
          else if (tab === "new") setLocation("/browse?type=new");
        }}
        onSignIn={() => setLocation("/login")}
        onSignOut={handleSignOut}
        user={user}
        onSubscribeClick={() => setPlansModalOpen(true)}
      />

      {/* Page Scroll Content */}
      <div className="pt-[68px]">

        {/* Hero Section */}
        <div className="relative overflow-hidden pb-8">
          {/* Background gradient */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(229,9,20,0.15),transparent_60%)] pointer-events-none" />
          <div className="px-4 sm:px-8 lg:px-14 pt-8 pb-4">

            {/* Page title row */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <button onClick={() => setLocation("/")} className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-white/80 hover:text-white hover:bg-white/10 transition-all">
                  <ArrowLeft className="w-4 h-4" />
                </button>
                <div>
                  <div className="flex items-center gap-2">
                    <Tv className="w-5 h-5 text-primary" />
                    <h1 className="text-white font-black text-xl sm:text-2xl tracking-tight">TV Shows & Series</h1>
                  </div>
                  <p className="text-white/75 text-xs mt-0.5">{isLoading ? "Loading..." : `${totalShows} series available`}</p>
                </div>
              </div>

              {/* Stats pills */}
              <div className="hidden md:flex items-center gap-2">
                {[
                  { icon: <TrendingUp className="w-3.5 h-3.5 text-primary" />, label: "Trending" },
                  { icon: <Flame className="w-3.5 h-3.5 text-orange-400" />, label: "Popular" },
                  { icon: <Sparkles className="w-3.5 h-3.5 text-amber-400" />, label: "New" },
                ].map(({ icon, label }) => (
                  <span key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 text-[11px] font-bold">
                    {icon} {label}
                  </span>
                ))}
              </div>
            </div>

            {/* Featured Show Banner */}
            {featuredShow && <FeaturedShowBanner item={featuredShow} onPlay={handlePlay} />}
          </div>
        </div>

        {/* Filters Row */}
        <div className="sticky top-[68px] z-30 bg-[#030306]/95 backdrop-blur-md border-b border-white/5 px-4 sm:px-8 lg:px-14 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Genre filter pills */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none flex-1 min-w-0 pb-0.5">
              {GENRES.map((genre) => (
                <button
                  key={genre}
                  onClick={() => { setActiveGenre(genre); setPage(1); }}
                  className={`flex-shrink-0 px-3.5 py-1.5 rounded-full text-[11.5px] font-bold transition-all ${
                    activeGenre === genre
                      ? "bg-primary text-white shadow-lg shadow-primary/30"
                      : "bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>

            {/* Sort dropdown */}
            <div className="relative flex-shrink-0">
              <button
                onClick={() => setSortOpen(!sortOpen)}
                className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-white/80 hover:text-white text-[11.5px] font-bold transition-all"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {SORT_OPTIONS.find((s) => s.value === sortBy)?.label}
                <ChevronDown className={`w-3 h-3 transition-transform ${sortOpen ? "rotate-180" : ""}`} />
              </button>
              {sortOpen && (
                <div className="absolute right-0 top-full mt-2 w-40 bg-[#0a0a10] border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                  {SORT_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => { setSortBy(opt.value); setSortOpen(false); }}
                      className={`w-full px-4 py-2.5 text-left text-xs font-semibold transition-colors ${
                        sortBy === opt.value ? "text-primary bg-primary/5" : "text-white/80 hover:text-white hover:bg-white/5"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Search */}
            <div className={`flex items-center gap-2 transition-all rounded-full border ${searchOpen ? "bg-black/60 border-zinc-800 w-44" : "border-transparent w-8"}`}>
              {searchOpen ? (
                <>
                  <Search className="w-3.5 h-3.5 text-white/80 ml-3 flex-shrink-0" />
                  <input
                    autoFocus
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search series..."
                    className="flex-1 bg-transparent text-white text-xs py-1.5 pr-2 focus:outline-none placeholder:text-white/80 min-w-0"
                  />
                  <button onClick={() => { setSearchTerm(""); setSearchOpen(false); }} className="mr-2 text-white/75 hover:text-white">
                    <X className="w-3 h-3" />
                  </button>
                </>
              ) : (
                <button onClick={() => setSearchOpen(true)} className="w-8 h-8 flex items-center justify-center text-white/80 hover:text-white rounded-full hover:bg-white/5 transition-all">
                  <Search className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Content Grid */}
        <div className="px-4 sm:px-8 lg:px-14 py-8">

          {/* Section header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-white font-black text-lg tracking-tight">
                {activeGenre === "All" ? "All Series" : `${activeGenre} Series`}
                {searchTerm && ` · "${searchTerm}"`}
              </h2>
              <p className="text-white/80 text-xs mt-0.5">{filtered.length} results</p>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-3.5 h-3.5 text-white/75" />
              <span className="text-white/75 text-xs font-semibold">Grid view</span>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4">
              <div className="relative">
                <div className="w-12 h-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <Tv className="w-5 h-5 text-primary absolute inset-0 m-auto" />
              </div>
              <p className="text-white/75 text-sm font-semibold">Loading series...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
                <Tv className="w-8 h-8 text-white/80" />
              </div>
              <div>
                <p className="text-white font-bold text-base">No series found</p>
                <p className="text-white/75 text-sm mt-1">Try a different genre or search term</p>
              </div>
              <button onClick={() => { setActiveGenre("All"); setSearchTerm(""); }} className="px-5 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all">
                Clear filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
              {filtered.map((item: any) => (
                <ShowCard key={item.id} item={item} onPlay={handlePlay} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!isLoading && filtered.length > 0 && browseData?.pagination && (
            <div className="flex items-center justify-center gap-3 mt-12">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Previous
              </button>
              <span className="text-white/75 text-xs font-semibold">
                Page {page} of {Math.ceil((browseData.pagination.total || 0) / (browseData.pagination.limit || 20))}
              </span>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page >= Math.ceil((browseData.pagination.total || 0) / (browseData.pagination.limit || 20))}
                className="px-5 py-2 rounded-xl bg-white/5 border border-white/10 text-white/80 hover:text-white hover:bg-white/10 text-xs font-bold disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Continue Watching Row */}
        {(() => {
          const cw = watchHistoryData?.items || [];
          const showCw = cw.filter((i: any) => i.type === "series");
          if (!showCw.length) return null;
          return (
            <div className="px-4 sm:px-8 lg:px-14 pb-8">
              <div className="border-t border-white/5 pt-8">
                <h3 className="text-white font-black text-base tracking-tight mb-4 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary" /> Continue Watching
                </h3>
                <div className="flex gap-4 overflow-x-auto scrollbar-none pb-2">
                  {showCw.map((item: any) => (
                    <div key={item.id || item._id} className="flex-shrink-0 w-[160px] cursor-pointer group" onClick={() => handlePlay(item)}>
                      <div className="relative rounded-xl overflow-hidden bg-zinc-900" style={{ aspectRatio: "2/3" }}>
                        <img src={getImageUrl(item.thumbnail || item.poster || item.backdrop)} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          onError={(e) => { (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=300&h=450&fit=crop"; }} />
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${item.progressPercent || 30}%` }} />
                        </div>
                      </div>
                      <p className="text-white text-xs font-bold truncate mt-2">{item.title}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

      </div>

      <PublicFooter />

      <SubscriptionPlansModal isOpen={plansModalOpen} onClose={() => setPlansModalOpen(false)} />

      <style>{`
        html { scroll-behavior: smooth; }
        * { scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }
        body { background: #030306; }
      `}</style>
    </div>
  );
}
