import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import {
  ChevronLeft, Play, Star, Calendar, Globe, Clock, Film,
  Crown, Tv, Lock, Plus, Share2, ChevronRight, Loader2,
  Check, Heart, Download, Smartphone
} from "lucide-react";
import { useGetWebDetail, getImageUrl, useGetWishlist, useToggleWishlist, useGetAppProfile, useRequestDownload } from "@/lib/api-client";
import { PublicHeader, PublicFooter } from "@/pages/streaming-home";
import SubscriptionPlansModal from "@/components/SubscriptionPlansModal";
import { useToast } from "@/hooks/use-toast";

type Tab = "home" | "movies" | "tvshows" | "drama" | "new";

function fmtSecs(s?: number) {
  if (!s) return "";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function TVShowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<Tab>("tvshows");
  const [user, setUser] = useState<any>(null);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [selectedSeason, setSelectedSeason] = useState(1);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("appUser");
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch {}
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [id]);

  const handleSignOut = () => {
    localStorage.removeItem("appUser");
    localStorage.removeItem("appAccessToken");
    setUser(null);
    window.location.reload();
  };

  const isSubscribed = user?.subscriptionStatus === "active" && user?.subscriptionPlan !== "free";

  const { data: detailData, isLoading } = useGetWebDetail(id || "");
  const show = (detailData as any)?.content || detailData;
  const apiEpisodes: any[] = (detailData as any)?.episodes || [];

  const uniqueSeasons = Array.from(new Set(apiEpisodes.map((e: any) => e.season || 1))).sort((a: any, b: any) => a - b) as number[];
  const seasonEpisodes = apiEpisodes.filter((e: any) => (e.season || 1) === selectedSeason);

  const { data: wishlistData } = useGetWishlist({ limit: 100 });
  const wishlistItems: any[] = (wishlistData as any)?.items || [];
  const inWatchlist = wishlistItems.some((w: any) => w.id === id || w.contentId === id);
  const toggleWishlistMutation = useToggleWishlist();

  const requestDownloadMutation = useRequestDownload();
  const [downloadingEp, setDownloadingEp] = useState<string | null>(null);

  const handleDownloadEpisode = async (ep: any) => {
    if (!user) { toast({ title: "Please sign in to download", variant: "destructive" }); return; }
    const epId = ep._id || ep.id;
    setDownloadingEp(epId);
    try {
      await requestDownloadMutation.mutateAsync({ contentId: id!, contentType: "series", episodeId: epId });
      toast({ title: "Episode added to downloads" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloadingEp(null);
    }
  };

  const handleToggleWishlist = () => {
    if (!user) { toast({ title: "Please sign in to add to watchlist", variant: "destructive" }); return; }
    toggleWishlistMutation.mutate({ contentId: id, contentType: "show" }, {
      onSuccess: () => toast({ title: inWatchlist ? "Removed from watchlist" : "Added to watchlist" }),
    });
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#030306] flex items-center justify-center">
        <Loader2 className="w-10 h-10 animate-spin text-red-600" />
      </div>
    );
  }

  const isDrama = show?.contentType === "drama";
  const title = show?.title || "TV Show";
  const description = show?.description || "";
  const year = show?.year || "";
  const imdbRating = show?.imdbRating ? String(show.imdbRating) : "";
  const ageRating = show?.ageRating ? String(show.ageRating) : "";
  const rawGenres: string[] = Array.isArray(show?.genres) ? show.genres.map((g: any) => typeof g === "string" ? g : g.name || "") : [];
  const genres = [...new Set(rawGenres)];
  const cast: any[] = Array.isArray(show?.cast) ? show.cast : [];
  const seasons = uniqueSeasons.length || 1;
  const totalEps = apiEpisodes.length;
  const freeEps = apiEpisodes.filter((e: any) => e.isFree).length;
  const backdrop = getImageUrl(show?.bannerImage || show?.thumbnail || show?.posterImage || "");
  const poster = getImageUrl(show?.posterImage || show?.thumbnail || "");

  const firstEp = apiEpisodes[0];

  return (
    <div className="min-h-screen bg-[#030306] text-foreground">
      <PublicHeader
        activeTab={activeTab}
        setActiveTab={(t) => { setActiveTab(t); setLocation("/"); }}
        onSignIn={() => {}}
        onSignOut={handleSignOut}
        user={user}
        onSubscribeClick={() => setPlansModalOpen(true)}
      />

      {/* Hero Banner */}
      <div className="relative w-full" style={{ height: "70vh", minHeight: 440 }}>
        {backdrop ? (
          <img src={backdrop} alt={title} className="absolute inset-0 w-full h-full object-cover object-top" />
        ) : (
          <div className="absolute inset-0 bg-zinc-900" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#030306] via-[#030306]/60 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-[#030306] to-transparent" />
        <div className="absolute top-0 left-0 right-0 h-[20%] bg-gradient-to-b from-[#030306]/70 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => setLocation("/")}
          className="absolute top-20 left-6 sm:left-10 flex items-center gap-2 text-foreground/80 hover:text-foreground text-sm font-semibold transition-colors z-10"
        >
          <ChevronLeft className="w-4 h-4" /> Back
        </button>

        {/* Content */}
        <div className="absolute bottom-10 left-0 px-6 sm:px-10 lg:px-14 max-w-2xl">
          {/* Badge */}
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            <span className={`flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-lg ${isDrama ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"}`}>
              {isDrama ? <Smartphone className="w-3 h-3" /> : <Tv className="w-3 h-3" />} {isDrama ? "Short Drama" : "TV Series"}
            </span>
            {genres.slice(0, 2).map((g) => (
              <span key={g} className="text-foreground text-xs bg-zinc-900/80 border border-zinc-800 px-2 py-1 rounded-lg font-semibold">{g}</span>
            ))}
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight mb-3 tracking-tight drop-shadow-lg">{title}</h1>

          <div className="flex items-center gap-3 mb-3 flex-wrap text-sm">
            {imdbRating && (
              <span className="flex items-center gap-1 bg-amber-400/15 border border-amber-400/40 text-amber-400 text-xs font-bold px-2 py-0.5 rounded">
                <Star className="w-3 h-3 fill-amber-400" /> {imdbRating}
              </span>
            )}
            {ageRating && (
              <span className="px-1.5 py-0.5 text-xs font-bold border border-white/10 text-foreground bg-black/40 rounded">{ageRating}</span>
            )}
            {year && <span className="text-foreground/80 font-semibold">{year}</span>}
            <span className="text-foreground/80 font-semibold">{seasons} Season{seasons !== 1 ? "s" : ""}</span>
            <span className="text-foreground/80 font-semibold">{totalEps} Episodes</span>
          </div>

          <p className="text-foreground text-sm leading-relaxed mb-6 max-w-lg line-clamp-3">{description}</p>

          <div className="flex items-center gap-3 flex-wrap">
            <button
              onClick={() => {
                if (show?.trailerUrl) {
                  setLocation(`/show/${id}/episode/0`);
                } else {
                  setLocation(`/show/${id}/episode/1`);
                }
              }}
              className="flex items-center gap-2.5 px-8 py-3.5 bg-white hover:bg-zinc-200 text-black font-bold rounded-lg text-sm tracking-wide transition-all active:scale-95 shadow-xl"
            >
              <Play className="w-4 h-4 fill-black" />
              {isSubscribed ? "Watch Now" : (freeEps > 0 ? "Watch Free" : "Watch Now")}
            </button>
            {!isSubscribed && (
              <button
                onClick={() => setPlansModalOpen(true)}
                className="flex items-center gap-2.5 px-6 py-3.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-lg text-sm tracking-wide transition-all active:scale-95 shadow-lg"
              >
                <Crown className="w-4 h-4" /> Subscribe
              </button>
            )}
            <button
              onClick={handleToggleWishlist}
              className={`flex items-center justify-center w-11 h-11 rounded-lg border transition-all hover:scale-105 active:scale-95 ${inWatchlist ? "bg-red-600/20 border-red-600/50 text-red-500" : "bg-zinc-900/80 border-zinc-700/60 text-white hover:bg-zinc-800"}`}
            >
              {inWatchlist ? <Check className="w-5 h-5" /> : <Plus className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="px-6 sm:px-10 lg:px-14 pb-20 mt-6">

        {/* Episodes Section */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold">Episodes</h2>
            {uniqueSeasons.length > 1 && (
              <div className="flex items-center gap-2">
                {uniqueSeasons.map((s) => (
                  <button
                    key={s}
                    onClick={() => setSelectedSeason(s)}
                    className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${selectedSeason === s ? "bg-red-600 border-red-600 text-white" : "bg-transparent border-zinc-700 text-foreground/80 hover:border-zinc-500 hover:text-foreground"}`}
                  >
                    S{s}
                  </button>
                ))}
              </div>
            )}
          </div>

          {seasonEpisodes.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-foreground text-sm">
              No episodes available yet.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {seasonEpisodes.map((ep: any, idx: number) => {
                const epNum = ep.episode || idx + 1;
                const epThumb = getImageUrl(ep.thumbnail || show?.thumbnail || "");
                const isLocked = ep.isLocked && !ep.isFree && !isSubscribed;
                return (
                  <div
                    key={ep._id || ep.id || idx}
                    onClick={() => {
                      if (isLocked && !user?.subscriptionStatus) {
                        setPlansModalOpen(true);
                        return;
                      }
                      setLocation(`/show/${id}/episode/${epNum}`);
                    }}
                    className="group flex gap-4 p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/60 hover:border-zinc-700 hover:bg-zinc-900/70 transition-all cursor-pointer"
                  >
                    <div className="relative w-28 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800" style={{ aspectRatio: "16/9" }}>
                      {epThumb ? (
                        <img src={epThumb} alt={ep.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Film className="w-5 h-5 text-foreground/80" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        {isLocked ? (
                          <Lock className="w-5 h-5 text-foreground/80" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-red-600/80 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all scale-90 group-hover:scale-100">
                            <Play className="w-4 h-4 text-foreground fill-white ml-0.5" />
                          </div>
                        )}
                      </div>
                      {ep.duration && (
                        <span className="absolute bottom-1 right-1 text-[9px] font-bold bg-black/70 text-white px-1 py-0.5 rounded">{fmtSecs(ep.duration)}</span>
                      )}
                    </div>

                    <div className="flex-1 min-w-0 py-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-foreground text-xs font-bold">EP {epNum}</span>
                        {ep.isFree && !isSubscribed && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-600/20 text-emerald-400 rounded">FREE</span>}
                        {isLocked && <span className="text-[9px] font-bold px-1.5 py-0.5 bg-amber-600/20 text-amber-400 rounded flex items-center gap-0.5"><Lock className="w-2.5 h-2.5" /> PREMIUM</span>}
                      </div>
                      <p className="text-foreground text-sm font-semibold leading-tight truncate group-hover:text-red-400 transition-colors">{ep.title || `Episode ${epNum}`}</p>
                      {ep.description && (
                        <p className="text-foreground text-xs mt-1 line-clamp-2 leading-relaxed">{ep.description}</p>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDownloadEpisode(ep); }}
                        disabled={downloadingEp === (ep._id || ep.id)}
                        className="mt-2 flex items-center gap-1 text-[10px] font-bold text-foreground hover:text-emerald-400 transition-colors disabled:opacity-50"
                      >
                        {downloadingEp === (ep._id || ep.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                        {downloadingEp === (ep._id || ep.id) ? "Adding..." : "Download"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* About / Description */}
        <div className="mb-12 max-w-3xl">
          <h2 className="text-xl font-bold mb-4">About</h2>
          <p className="text-foreground text-sm leading-relaxed">{description || "No description available."}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            {year && (
              <div>
                <p className="text-foreground text-xs font-bold uppercase tracking-wider mb-1">Year</p>
                <p className="text-foreground text-sm font-semibold">{year}</p>
              </div>
            )}
            {genres.length > 0 && (
              <div>
                <p className="text-foreground text-xs font-bold uppercase tracking-wider mb-1">Genres</p>
                <p className="text-foreground text-sm font-semibold">{genres.slice(0, 3).join(", ")}</p>
              </div>
            )}
            {totalEps > 0 && (
              <div>
                <p className="text-foreground text-xs font-bold uppercase tracking-wider mb-1">Episodes</p>
                <p className="text-foreground text-sm font-semibold">{totalEps} Episodes</p>
              </div>
            )}
            {imdbRating && (
              <div>
                <p className="text-foreground text-xs font-bold uppercase tracking-wider mb-1">Rating</p>
                <p className="text-amber-400 text-sm font-bold flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-amber-400" />{imdbRating}</p>
              </div>
            )}
          </div>
        </div>

        {/* Cast */}
        {cast.length > 0 && (
          <div className="mb-12">
            <h2 className="text-xl font-bold mb-4">Cast</h2>
            <div className="flex gap-4 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
              {cast.map((c: any, i: number) => {
                const actor = c.actor || c;
                const actorName = typeof actor === "object" ? actor.name : actor;
                const actorImg = typeof actor === "object" ? getImageUrl(actor.image || "") : "";
                return (
                  <div key={i} className="flex-shrink-0 text-center w-20">
                    <div className="w-16 h-16 rounded-full bg-zinc-800 overflow-hidden mx-auto mb-2">
                      {actorImg ? (
                        <img src={actorImg} alt={actorName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-foreground/80 text-lg font-bold">
                          {actorName?.[0] || "?"}
                        </div>
                      )}
                    </div>
                    <p className="text-foreground text-[11px] font-semibold leading-tight line-clamp-2">{actorName}</p>
                    {c.character && <p className="text-foreground text-[10px] mt-0.5 truncate">{c.character}</p>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <PublicFooter />

      <SubscriptionPlansModal isOpen={plansModalOpen} onClose={() => setPlansModalOpen(false)} />
    </div>
  );
}
