
import { useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import {
  Play, Plus, Share2, Heart, Star, Calendar, Globe, Clock, Film,
  ChevronLeft, Crown, Tv,
  Check, ChevronRight, Loader2, Download
} from "lucide-react";
import { useGetWebDetail, getImageUrl, useGetWishlist, useToggleWishlist, useGetAppProfile, useToggleLike, useRequestDownload, useRemoveDownload, useGetDownloads, cacheDownloadedVideo, removeOfflineVideo, useRecordShare } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { PublicHeader, PublicFooter } from "@/pages/streaming-home";
import SubscriptionPlansModal from "@/components/SubscriptionPlansModal";
import { PortraitCard, LandscapeCard } from "@/components/ContentCard";

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
export default function MovieDetailPage() {
  const [, params] = useRoute("/movie/:id");
  const [, setLocation] = useLocation();
  const id = (params as any)?.id;
  const { toast } = useToast();

  const recordShareMutation = useRecordShare();

  const [user, setUser] = useState<any>(null);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [dlProgress, setDlProgress] = useState<number | null>(null);

  const { data: detailData, isLoading } = useGetWebDetail(id || "");
  const item = detailData;

  useEffect(() => {
    const loadUser = () => {
      try {
        const storedUser = localStorage.getItem("appUser");
        if (storedUser) setUser(JSON.parse(storedUser));
        else setUser(null);
      } catch (e) {}
    };
    loadUser();
    window.addEventListener("user-updated", loadUser);
    return () => window.removeEventListener("user-updated", loadUser);
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("appUser");
    localStorage.removeItem("appAccessToken");
    setUser(null);
    window.location.reload();
  };

  const related = detailData?.related || [];
  const similarContent = detailData?.related || [];
  const episodes: any[] = detailData?.episodes || [];

  const [selectedSeason, setSelectedSeason] = useState(1);

  const { data: profileData } = useGetAppProfile();

  const isLiked = profileData?.likeRecords?.some((l: any) => l.contentId === id && !l.episodeId) || false;
  const toggleLikeMutation = useToggleLike();

  // Downloads — use web endpoint as single source of truth (cross-device consistent)
  const { data: downloadsData } = useGetDownloads({ limit: 200 });
  const downloadItems: any[] = Array.isArray(downloadsData) ? downloadsData : [];
  const downloadRecord = downloadItems.find((d: any) => d.contentId === id && !d.episodeId);
  const isDownloaded = !!downloadRecord;
  const requestDownloadMutation = useRequestDownload();
  const removeDownloadMutation = useRemoveDownload();

  // Wishlist — real API
  const { data: wishlistData } = useGetWishlist({ limit: 100 });
  const wishlistItems: any[] = wishlistData?.items || [];
  const inWatchlist = wishlistItems.some((w: any) => w.id === id || w.contentId === id);
  const toggleWishlistMutation = useToggleWishlist();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen text-foreground flex flex-col items-center justify-center" style={{ background: "#0c0c14" }}>
        <Loader2 className="w-10 h-10 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) { setLocation("/"); return null; }

  const isPremium = item.badge === "TOP" || item.badge === "EXCLUSIVE";

  const getPlanLevel = (plan?: string) => {
    switch (plan?.toLowerCase()) {
      case "premium": return 3;
      case "standard": return 2;
      case "basic": return 1;
      default: return 0;
    }
  };

  const userPlan = user?.subscriptionStatus === "active" ? user.subscriptionPlan : "free";
  const planRequired = item?.planRequired || "free";
  const isLocked = getPlanLevel(userPlan) < getPlanLevel(planRequired);

  const heroBg = getImageUrl(item.backdrop || item.poster || item.posterImage || item.thumbnail) || "";
  const posterImg = getImageUrl(item.poster || item.posterImage || item.thumbnail || item.backdrop) || "";

  return (
    <div className="min-h-screen text-foreground" style={{ background: "#0c0c14" }}>
      <PublicHeader
        activeTab={item.type === "movie" ? "movies" : "tvshows"}
        setActiveTab={(tab) => {
          if (tab === "home") setLocation("/");
          else if (tab === "tvshows") setLocation("/tv-shows-browse");
          else setLocation(`/browse/${tab}`);
        }}
        onSignIn={() => setLocation("/login")}
        onSignOut={handleSignOut}
        user={user}
      />

      {/* ══════════════════════════════════════════
          HERO BANNER
      ══════════════════════════════════════════ */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: 480, maxHeight: 620 }}>
        {/* Backdrop */}
        {heroBg && (
          <img
            src={heroBg}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-cover object-top"
            style={{ filter: "brightness(0.45)" }}
          />
        )}
        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#0c0c14] via-[#0c0c14]/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c0c14]/90 via-[#0c0c14]/30 to-transparent" />

        {/* Back button */}
        <div className="absolute top-0 left-0 right-0 z-10" style={{ paddingTop: "72px" }}>
          <div className="px-6 sm:px-10 lg:px-16">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1.5 text-foreground/80 hover:text-foreground text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          </div>
        </div>

        {/* Content over hero */}
        <div className="relative z-10 flex items-end min-h-[480px] max-h-[620px] pb-10 px-6 sm:px-10 lg:px-16" style={{ paddingTop: 120 }}>
          <div className="flex items-end gap-8 w-full">
            {/* Poster */}
            {posterImg && (
              <div className="hidden sm:block flex-shrink-0 w-36 lg:w-48 rounded-2xl overflow-hidden shadow-2xl border border-white/10" style={{ aspectRatio: "2/3" }}>
                <img src={posterImg} alt={item.title} className="w-full h-full object-cover" />
              </div>
            )}
            {/* Text */}
            <div className="flex-1 min-w-0">
              {/* Genres */}
              <div className="flex flex-wrap items-center gap-x-0 gap-y-1 mb-3">
                {item.genres.map((g, i) => (
                  <span key={g} className="text-foreground/80 text-sm font-medium">
                    {g}{i < item.genres.length - 1 && <span className="mx-2 text-foreground/80">•</span>}
                  </span>
                ))}
              </div>
              {/* Title */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-foreground leading-tight mb-3 tracking-tight drop-shadow-lg">
                {item.title}
              </h1>

        {/* Badges */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {/* Content type badge */}
          <span className={`flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-lg border ${
            item.type === "movie"
              ? "bg-red-600/15 border-red-600/35 text-red-400"
              : "bg-blue-600/15 border-blue-600/35 text-blue-400"
          }`}>
            {item.type === "movie" ? <Film className="w-3 h-3" /> : <Tv className="w-3 h-3" />}
            {item.type === "movie" ? "Movie" : "TV Series"}
          </span>
          {item.imdbRating && (
            <span className="flex items-center gap-1.5 bg-amber-500/15 border border-amber-500/35 text-amber-400 text-xs font-black px-2.5 py-1 rounded-md">
              <Star className="w-3 h-3 fill-amber-400" /> IMDb {item.imdbRating}
            </span>
          )}
          {item.ageRating && (
            <span className="text-xs font-bold px-2.5 py-1 rounded border border-white/20 text-muted-foreground/80">
              {item.ageRating}
            </span>
          )}
          <span className="text-xs font-bold px-2.5 py-1 rounded border border-white/20 text-muted-foreground/80">
            {item.year}
          </span>
          {item.type === "movie" && (
            <span className="text-xs font-bold px-2.5 py-1 rounded border border-white/20 text-muted-foreground/80">
              {item.duration}
            </span>
          )}
          {item.language && (
            <span className="text-xs font-bold px-2.5 py-1 rounded border border-white/20 text-muted-foreground/80 uppercase">
              {item.language}
            </span>
          )}
          {isPremium && (
            <span className="flex items-center gap-1 text-xs font-black px-2.5 py-1 rounded-md bg-amber-500 text-black">
              <Crown className="w-3 h-3" /> Premium
            </span>
          )}
          {item.type === "show" && item.seasons && (
            <span className="flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-md border border-blue-500/40 text-blue-400" style={{ background: "rgba(59,130,246,0.12)" }}>
              <Tv className="w-3 h-3" />
              {item.seasons} Season{item.seasons > 1 ? 's' : ''} · {episodes.length} Episode{episodes.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {/* Description */}
        <p className="text-foreground/80 text-sm sm:text-[15px] leading-relaxed mb-5 max-w-2xl line-clamp-3">
          {item.description}
        </p>

        {/* Metadata row */}
        <div className="flex flex-wrap items-center gap-3 mb-6 text-xs text-foreground/80">
          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {item.year}</span>
          {item.language && <span className="flex items-center gap-1"><Globe className="w-3 h-3" /> {item.language}</span>}
          <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {item.duration}</span>
          {item.imdbRating && (
            <span className="flex items-center gap-1 text-amber-400 font-bold">
              <Star className="w-3 h-3 fill-amber-400" /> {item.imdbRating} IMDb
            </span>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Watch Now — scrolls back to player and plays fullscreen */}
          <button
            onClick={() => {
              if (isLocked) {
                setPlansModalOpen(true);
              } else if (item.trailerUrl) {
                setLocation(`/show/${id}/episode/0`);
              } else {
                setLocation(`/show/${id}/episode/1`);
              }
            }}
            className="flex items-center gap-2.5 px-8 py-3.5 font-black rounded-xl text-sm tracking-wide transition-all active:scale-95 shadow-lg text-foreground"
            style={{ background: "linear-gradient(135deg, #e50914 0%, #b9090b 100%)", boxShadow: "0 8px 24px rgba(229,9,20,0.3)" }}
          >
            {isLocked ? <Crown className="w-4 h-4 text-amber-500 fill-amber-500" /> : <Play className="w-4 h-4 fill-white" />}
            {isLocked ? "Unlock Now" : item.type === "show" ? "Watch Episode 1" : "Watch Now"}
          </button>

          <button
            onClick={() => {
              if (!user) { setLocation("/login"); return; }
              const contentType = item.contentType === 'drama' ? 'drama' : item.contentType === 'series' ? 'show' : 'movie';
              toggleWishlistMutation.mutate(
                { contentId: id!, contentType },
                {
                  onSuccess: () => {
                    toast({
                      title: inWatchlist ? "Removed from watchlist" : "Added to watchlist",
                    });
                  },
                  onError: (err: any) => {
                    toast({
                      title: "Failed to update watchlist",
                      description: err?.message || "Please try again.",
                      variant: "destructive",
                    });
                  },
                }
              );
            }}
            disabled={toggleWishlistMutation.isPending}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 disabled:opacity-70 ${
              inWatchlist
                ? "bg-red-500/20 border-red-500 text-red-500"
                : "bg-white/8 border-white/20 text-foreground hover:bg-white/12 hover:border-white/35"
            }`}
          >
            {toggleWishlistMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : inWatchlist ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {inWatchlist ? "In Watchlist" : "Watchlist"}
          </button>

          {/* Download button for movie */}
          <button
            onClick={async () => {
              if (!user) { setLocation("/login"); return; }
              if (isDownloaded) {
                removeDownloadMutation.mutate(
                  { id: downloadRecord.id, contentId: id!, episodeId: undefined },
                  {
                    onSuccess: async () => {
                      await removeOfflineVideo(id!);
                      toast({ title: "Removed from downloads" });
                    },
                    onError: () => toast({ title: "Failed to remove", variant: "destructive" }),
                  }
                );
              } else {
                const contentType = (item.contentType === 'drama' ? 'drama' : item.contentType === 'series' ? 'series' : 'movie') as 'movie' | 'drama' | 'series';
                requestDownloadMutation.mutate(
                  { contentId: id!, contentType },
                  {
                    onSuccess: async (data: any) => {
                      const downloadUrl = data?.data?.downloadUrl || data?.downloadUrl;
                      if (downloadUrl) {
                        setDlProgress(0);
                        const ok = await cacheDownloadedVideo(downloadUrl, id!, undefined, setDlProgress);
                        setDlProgress(null);
                        toast({ title: ok ? "Downloaded — available offline" : "Saved to downloads (online only)" });
                      } else {
                        toast({ title: "Added to downloads" });
                      }
                    },
                    onError: (err: any) => toast({ title: "Download failed", description: err?.message || "Please try again.", variant: "destructive" }),
                  }
                );
              }
            }}
            disabled={requestDownloadMutation.isPending || removeDownloadMutation.isPending || dlProgress !== null}
            className={`flex items-center gap-2 px-5 py-3.5 rounded-xl text-sm font-bold border-2 transition-all active:scale-95 disabled:opacity-70 ${
              isDownloaded
                ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                : "bg-white/8 border-white/20 text-foreground hover:bg-white/12 hover:border-white/35"
            }`}
          >
            {requestDownloadMutation.isPending || dlProgress !== null ? (
              dlProgress !== null && dlProgress > 0
                ? <span className="text-xs font-bold">{dlProgress}%</span>
                : <Loader2 className="w-4 h-4 animate-spin" />
            ) : removeDownloadMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : isDownloaded ? (
              <Check className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            {dlProgress !== null ? "Downloading..." : isDownloaded ? "Downloaded" : "Download"}
          </button>

          {/* Like button */}
          <button
            onClick={() => {
              if (!user) { setLocation("/login"); return; }
              const contentType = item.contentType === 'drama' ? 'drama' : item.contentType === 'series' ? 'show' : 'movie';
              toggleLikeMutation.mutate({ contentId: id!, contentType });
            }}
            disabled={toggleLikeMutation.isPending}
            className={`w-12 h-12 flex items-center justify-center rounded-full border-2 transition-all active:scale-95 disabled:opacity-70 ${
              isLiked
                ? "bg-rose-500/20 border-rose-500 text-rose-400"
                : "bg-white/8 border-white/20 text-foreground hover:border-white/35"
            }`}
          >
            {toggleLikeMutation.isPending ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Heart className={`w-5 h-5 ${isLiked ? "fill-rose-500 text-rose-500" : ""}`} />
            )}
          </button>

          <button
            onClick={() => {
              recordShareMutation.mutate({
                contentId: id,
                contentType: item.type === "movie" ? "movie" : "show",
              });
              navigator.clipboard.writeText(window.location.href);
              toast({
                title: "Link Copied",
                description: "Movie link copied to clipboard successfully!",
              });
            }}
            className="w-12 h-12 flex items-center justify-center rounded-full border-2 border-white/20 bg-white/8 text-foreground hover:border-white/35 transition-all active:scale-95"
          >
            <Share2 className="w-4 h-4" />
          </button>
        </div>
            </div>{/* end text block */}
          </div>{/* end poster+text row */}
        </div>{/* end hero content */}
      </div>{/* end hero banner */}

      {/* ══════════════════════════════════════════
          SEASONS & EPISODES (Only for TV Shows)
      ══════════════════════════════════════════ */}
      {item.type === "show" && episodes.length > 0 && (() => {
        // Derive available seasons from episodes
        const seasonNumbers: number[] = [];
        episodes.forEach((ep: any) => {
          const s = ep.season ?? 1;
          if (!seasonNumbers.includes(s)) seasonNumbers.push(s);
        });
        seasonNumbers.sort((a, b) => a - b);

        const seasonEpisodes = episodes.filter((ep: any) => (ep.season ?? 1) === selectedSeason);

        return (
          <div className="pb-10">
            {/* Section header */}
            <div className="flex items-center gap-3 mb-5 px-6 sm:px-10 lg:px-16">
              <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: "#e50914" }} />
              <Tv className="w-5 h-5 text-red-500" />
              <h2 className="text-foreground font-black text-lg sm:text-xl tracking-tight">Seasons &amp; Episodes</h2>
              <span className="ml-auto text-foreground text-xs font-semibold">
                {episodes.length} Episode{episodes.length !== 1 ? 's' : ''} Total
              </span>
            </div>

            {/* Season Tabs */}
            {seasonNumbers.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-6 sm:px-10 lg:px-16 pb-4 mb-2" style={{ scrollbarWidth: 'none' } as React.CSSProperties}>
                {seasonNumbers.map((s) => {
                  const epCount = episodes.filter((ep: any) => (ep.season ?? 1) === s).length;
                  return (
                    <button
                      key={s}
                      onClick={() => setSelectedSeason(s)}
                      className={`flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                        selectedSeason === s
                          ? 'bg-red-600 border-red-600 text-white shadow-lg shadow-red-900/30'
                          : 'bg-zinc-900/60 border-zinc-700/60 text-white/80 hover:border-zinc-500 hover:text-white hover:bg-zinc-800/80'
                      }`}
                    >
                      <span>Season {s}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                        selectedSeason === s ? 'bg-white/20 text-foreground' : 'bg-zinc-700 text-foreground/80'
                      }`}>{epCount} EP</span>
                    </button>
                  );
                })}
              </div>
            )}

            {/* Episode Cards for selected season */}
            <div className="px-6 sm:px-10 lg:px-16 space-y-3">
              {seasonEpisodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <Tv className="w-10 h-10 text-foreground/80" />
                  <p className="text-foreground text-sm font-medium">No episodes available for Season {selectedSeason}</p>
                </div>
              ) : (
                seasonEpisodes.map((ep: any) => {
                  const globalIdx = episodes.findIndex((e: any) => e.id === ep.id);
                  const epNum = ep.episode ?? (globalIdx + 1);

                  return (
                    <div
                      key={ep.id}
                      className="group flex items-start gap-4 p-4 rounded-2xl transition-all duration-200 border cursor-pointer bg-white/[0.03] hover:bg-white/[0.07] border-white/[0.07] hover:border-white/15"
                      onClick={() => {
                        setLocation(`/show/${id}/episode/${epNum}`);
                      }}
                    >
                      {/* Thumbnail */}
                      <div className="relative flex-shrink-0 w-36 sm:w-44 rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
                        {ep.thumbnail ? (
                          <img
                            src={getImageUrl(ep.thumbnail)}
                            alt={ep.title}
                            className="w-full h-full object-cover bg-zinc-900 transition-transform duration-500 group-hover:scale-105"
                            onError={(e) => { (e.target as HTMLImageElement).src = ''; }}
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-800/80 flex items-center justify-center">
                            <Play className="w-6 h-6 text-foreground/80" />
                          </div>
                        )}
                        {/* Play overlay */}
                        <div className="absolute inset-0 flex items-center justify-center transition-all duration-200 bg-black/40 opacity-0 group-hover:opacity-100">
                          <div className="w-10 h-10 rounded-full flex items-center justify-center shadow-xl transition-all bg-white/90 scale-90 group-hover:scale-100">
                            <Play className="w-4 h-4 fill-black text-black ml-0.5" />
                          </div>
                        </div>
                        {/* Episode number badge */}
                        <div className="absolute bottom-1.5 left-1.5">
                          <span className="text-[10px] font-black px-2 py-0.5 rounded-md bg-black/70 text-white">
                            E{epNum}
                          </span>
                        </div>
                        {/* Duration badge */}
                        {ep.duration && (
                          <div className="absolute bottom-1.5 right-1.5">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-black/70 text-white flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5" />{ep.duration}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 py-0.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs font-bold uppercase tracking-widest mb-1 text-foreground">
                              S{ep.season ?? 1} · Episode {epNum}
                            </p>
                            <h3 className="font-bold text-sm sm:text-base leading-tight line-clamp-2 transition-colors text-foreground/80 group-hover:text-foreground">
                              {ep.title}
                            </h3>
                          </div>
                        </div>
                        {ep.description && (
                          <p className="text-foreground text-xs sm:text-[13px] leading-relaxed mt-2 line-clamp-2">
                            {ep.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 mt-2.5">
                          {ep.duration && (
                            <span className="flex items-center gap-1 text-[11px] text-foreground/80 font-semibold">
                              <Clock className="w-3 h-3" />{ep.duration}
                            </span>
                          )}
                          {ep.isFree === false && (
                            <span className="flex items-center gap-1 text-[9px] font-black px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 text-amber-400 rounded-md uppercase tracking-wide">
                              <Crown className="w-2.5 h-2.5" /> Premium
                            </span>
                          )}
                          {ep.isFree === true && (
                            <span className="text-[9px] font-black px-2 py-0.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-md uppercase tracking-wide">
                              Free
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })()}

      {/* ══════════════════════════════════════════
          2.5. CAST & CREW
      ══════════════════════════════════════════ */}
      {((item.cast && item.cast.length > 0) || (item.crew && item.crew.length > 0) || (item.crewMembers && item.crewMembers.length > 0)) && (
        <div className="pb-10">
          <div className="flex items-center gap-3 mb-5 px-6 sm:px-10 lg:px-16">
            <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: "#e50914" }} />
            <h2 className="text-foreground font-black text-lg sm:text-xl tracking-tight">Cast & Crew</h2>
          </div>
          <div
            className="flex gap-6 overflow-x-auto px-6 sm:px-10 lg:px-16 pb-2"
            style={{ scrollbarWidth: "none" } as React.CSSProperties}
          >
            {item.cast?.map((c: any) => (
              <div key={`cast-${c.id}-${c.character}`} className="flex flex-col items-center text-center w-24 sm:w-28 flex-shrink-0 group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0 group-hover:border-primary transition-all duration-300 shadow-md">
                  <img
                    src={getImageUrl(c.image || "")}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
                    }}
                  />
                </div>
                <h4 className="text-foreground font-bold text-xs sm:text-sm mt-3 line-clamp-1 group-hover:text-foreground transition-colors">{c.name}</h4>
                <p className="text-foreground/80 text-[10px] sm:text-xs mt-0.5 line-clamp-1 font-semibold">{c.character || c.role || 'Cast'}</p>
              </div>
            ))}

            {item.crew?.map((c: any) => (
              <div key={`crew-${c.id}-${c.role}`} className="flex flex-col items-center text-center w-24 sm:w-28 flex-shrink-0 group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0 group-hover:border-primary transition-all duration-300 shadow-md">
                  <img
                    src={getImageUrl(c.image || "")}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
                    }}
                  />
                </div>
                <h4 className="text-foreground font-bold text-xs sm:text-sm mt-3 line-clamp-1 group-hover:text-foreground transition-colors">{c.name}</h4>
                <p className="text-foreground/80 text-[10px] sm:text-xs mt-0.5 line-clamp-1 font-semibold">{c.role || 'Director'}</p>
              </div>
            ))}

            {item.crewMembers?.map((c: any) => (
              <div key={`crewMem-${c.id}-${c.role}`} className="flex flex-col items-center text-center w-24 sm:w-28 flex-shrink-0 group">
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0 group-hover:border-primary transition-all duration-300 shadow-md">
                  <img
                    src={getImageUrl(c.image || "")}
                    alt={c.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
                    }}
                  />
                </div>
                <h4 className="text-foreground font-bold text-xs sm:text-sm mt-3 line-clamp-1 group-hover:text-foreground transition-colors">{c.name}</h4>
                <p className="text-foreground/80 text-[10px] sm:text-xs mt-0.5 line-clamp-1 font-semibold">{c.role || 'Crew'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          3. MORE LIKE THIS
      ══════════════════════════════════════════ */}
      {related.length > 0 && (
        <div className="pb-10">
          <div className="flex items-center gap-3 mb-5 px-6 sm:px-10 lg:px-16">
            <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: "#e50914" }} />
            <h2 className="text-foreground font-black text-lg sm:text-xl tracking-tight">More Like This</h2>
            <div className="flex-1" />
            <button
              onClick={() => {
                const firstGenre = item.genres?.[0] || '';
                const path = item.type === "movie" ? "/browse/movie" : "/browse/show";
                window.open(firstGenre ? `${path}?genre=${encodeURIComponent(firstGenre)}` : path, "_blank");
              }}
              className="text-foreground hover:text-primary text-xs transition-colors flex items-center gap-0.5 font-semibold"
            >
              See all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div
            className="flex gap-4 overflow-x-auto px-6 sm:px-10 lg:px-16 pb-2"
            style={{ scrollbarWidth: "none" } as React.CSSProperties}
          >
            {related.map((r) => (
              <PortraitCard key={r.id} item={r} onClick={() => setLocation(`/movie/${r.id}`)} />
            ))}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════
          4. YOU MAY ALSO LIKE
      ══════════════════════════════════════════ */}
      {similarContent.length > 0 && (
        <div className="pb-12">
          <div className="flex items-center gap-3 mb-5 px-6 sm:px-10 lg:px-16">
            <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: "#e50914" }} />
            <h2 className="text-foreground font-black text-lg sm:text-xl tracking-tight">You May Also Like</h2>
            <div className="flex-1" />
            <button
              onClick={() => {
                const firstGenre = item.genres?.[0] || '';
                const path = item.type === "movie" ? "/browse/movie" : "/browse/show";
                window.open(firstGenre ? `${path}?genre=${encodeURIComponent(firstGenre)}` : path, "_blank");
              }}
              className="text-foreground hover:text-primary text-xs transition-colors flex items-center gap-0.5 font-semibold"
            >
              See all <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div
            className="flex gap-4 overflow-x-auto px-6 sm:px-10 lg:px-16 pb-2"
            style={{ scrollbarWidth: "none" } as React.CSSProperties}
          >
            {similarContent.map((c) => (
              <LandscapeCard key={c.id} item={c} onClick={() => setLocation(`/movie/${c.id}`)} />
            ))}
          </div>
        </div>
      )}

      <PublicFooter />

      <SubscriptionPlansModal 
        isOpen={plansModalOpen} 
        onClose={() => setPlansModalOpen(false)} 
      />

      <style>{`
        body { background: #0c0c14 !important; }
        * { scrollbar-width: none; }
        *::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
