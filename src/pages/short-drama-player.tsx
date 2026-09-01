import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import {
  ChevronLeft, ChevronRight, Play, Pause, Volume2, VolumeX,
  Maximize, Minimize, X, Loader2, Crown, Lock, Heart, Check,
  ChevronUp, ChevronDown, SkipForward, Download, Share2, Plus
} from "lucide-react";
import Hls from "hls.js";
import { 
  useGetWebDetail, getImageUrl, useGetWishlist, useToggleWishlist, 
  useGetPublicAds, useGetWebSubscriptionPlans, useCreateSubscription, 
  useGetAppProfile, useRequestDownload, useToggleLike, useRecordShare, useRecordView,
  useGetDownloads, useRemoveDownload, cacheDownloadedVideo, useUnlockEpisode
} from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import SubscriptionPlansModal from "@/components/SubscriptionPlansModal";
import { PlayerPrerollAd } from "@/components/AdComponents";

type Tab = "home" | "movies" | "tvshows" | "drama" | "new";

function fmtTime(s: number) {
  if (!isFinite(s) || s < 0) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const fmtCount = (num: number) => {
  if (!num) return "0";
  return num >= 1e6 ? (num / 1e6).toFixed(1) + 'M' : num >= 1e3 ? (num / 1e3).toFixed(1) + 'K' : num.toString();
};

export default function ShortDramaPlayer() {
  const { id, epNum } = useParams<{ id: string; epNum: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const [user, setUser] = useState<any>(null);
  const [plansModalOpen, setPlansModalOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const requestDownloadMutation = useRequestDownload();
  const removeDownloadMutation = useRemoveDownload();
  const toggleLikeMutation = useToggleLike();
  const recordShareMutation = useRecordShare();
  const recordViewMutation = useRecordView();
  const unlockMutation = useUnlockEpisode();
  const viewRecordedRef = useRef(false);

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(true);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [showEpList, setShowEpList] = useState(false);

  const [showPreroll, setShowPreroll] = useState(() => {
    try {
      const storedUser = localStorage.getItem("appUser");
      if (storedUser) {
        const u = JSON.parse(storedUser);
        return u.subscriptionStatus !== "active";
      }
    } catch(e) {}
    return true; // Default to showing preroll if no user
  });

  const epNumInt = parseInt(epNum || "1", 10);
  const [currentEpNum, setCurrentEpNum] = useState(epNumInt);

  const { data: profileData } = useGetAppProfile();
  const userPlan = profileData?.user?.subscriptionPlan || "free";

  useEffect(() => {
    try {
      // Try all possible key variants (appUser from public-auth, user from streaming-home login)
      const appUserStr = localStorage.getItem("appUser");
      const userStr = localStorage.getItem("user");
      const parsedUser = appUserStr ? JSON.parse(appUserStr) : (userStr ? JSON.parse(userStr) : null);
      if (parsedUser) setUser(parsedUser);

      // Also ensure appAccessToken is set if only accessToken exists (legacy sessions)
      if (!localStorage.getItem("appAccessToken") && localStorage.getItem("accessToken")) {
        localStorage.setItem("appAccessToken", localStorage.getItem("accessToken")!);
      }
    } catch {}
  }, []);

  useEffect(() => {
    const routeEp = parseInt(epNum || "1", 10);
    if (routeEp !== currentEpNum) {
      setCurrentEpNum(routeEp);
    }
  }, [epNum]);

  const getPlanLevel = (plan?: string) => {
    switch (plan?.toLowerCase()) {
      case "premium": return 3;
      case "standard": return 2;
      case "basic": return 1;
      default: return 0;
    }
  };

  const { data: detailData, isLoading } = useGetWebDetail(id || "");
  const show = (detailData as any)?.content || detailData;
  const apiEpisodes: any[] = (detailData as any)?.episodes || [];

  const currentEpisode = currentEpNum === 0 ? null : (apiEpisodes[currentEpNum - 1] || apiEpisodes[0]);
  const totalEps = apiEpisodes.length;
  const freeEps = apiEpisodes.filter((e: any) => e.isFree).length;

  // Use live profileData subscription status as source of truth
  const liveSubscriptionStatus = profileData?.subscriptionStatus || user?.subscriptionStatus;
  const liveSubscriptionPlan = profileData?.subscriptionPlan || user?.subscriptionPlan;

  // Episode is locked if it's marked as locked for this specific user by the backend
  const isLocked = currentEpisode ? (currentEpisode.isLockedForUser !== undefined ? currentEpisode.isLockedForUser : !currentEpisode.isFree) : false;
  const videoSrcRaw = isLocked ? "" : (currentEpisode?.hlsUrl || currentEpisode?.videoUrl || (currentEpNum === 0 ? (show?.trailerUrl || show?.hlsUrl || "") : ""));
  const videoSrc = getImageUrl(videoSrcRaw);
  const poster = getImageUrl(currentEpisode?.thumbnail || show?.posterImage || show?.thumbnail || "");

  const { data: wishlistData } = useGetWishlist({ limit: 100 });
  const wishlistItems: any[] = (wishlistData as any)?.items || [];
  const inWatchlist = wishlistItems.some((w: any) => w.id === id || w.contentId === id);
  const toggleWishlistMutation = useToggleWishlist();

  // Downloads — track actual download records to show correct Save/Saved state
  const { data: downloadsData } = useGetDownloads({ limit: 200 });
  const downloadItems: any[] = Array.isArray(downloadsData) ? downloadsData : [];
  const currentEpIdForDownload = currentEpisode?._id || currentEpisode?.id;
  const isDownloaded = !!downloadItems.find((d: any) =>
    d.contentId === id && d.episodeId === currentEpIdForDownload
  );

  const isLiked = profileData?.likeRecords?.some((l: any) => l.contentId === id && (!l.episodeId || l.episodeId === currentEpisode?._id || l.episodeId === currentEpisode?.id)) || false;

  useEffect(() => {
    viewRecordedRef.current = false;
  }, [id, currentEpNum]);

  useEffect(() => {
    if (playing && !viewRecordedRef.current && id) {
      viewRecordedRef.current = true;
      recordViewMutation.mutate({
        contentId: id,
        contentType: "drama",
        episodeId: currentEpisode?._id || currentEpisode?.id || undefined,
      });
    }
  }, [playing, id, currentEpisode]);

  // Prevent body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // HLS player
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    let hls: Hls | null = null;
    setLoading(true);
    setCurrentTime(0);
    setDuration(0);
    setPlaying(false);

    if (!videoSrc) { 
      v.src = "";
      setLoading(false); 
      return; 
    }

    v.currentTime = 0;
    const isPreroll = showPreroll;

    if (videoSrc.includes(".m3u8") && Hls.isSupported()) {
      hls = new Hls({ startLevel: -1 });
      hls.loadSource(videoSrc);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        v.currentTime = 0;
        if (!isPreroll) {
          v.play().catch(() => {});
          setPlaying(true);
        }
      });
      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) setLoading(false);
      });
    } else {
      v.src = videoSrc;
      v.load();
      const onCanPlay = () => {
        setLoading(false);
        v.currentTime = 0;
        if (!isPreroll) {
          v.play().catch(() => {});
          setPlaying(true);
        }
        v.removeEventListener("canplay", onCanPlay);
      };
      v.addEventListener("canplay", onCanPlay);
    }

    return () => {
      if (hls) hls.destroy();
      v.pause();
    };
  }, [videoSrc]);

  // Controls auto-hide
  const revealControls = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    setControlsVisible(true);
    hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3500);
  }, []);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
    revealControls();
  }, [revealControls]);

  const handleVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    setVolume(val);
    v.muted = val === 0;
    setMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    const next = !v.muted;
    v.muted = next;
    setMuted(next);
  };

  const goToEpisode = (n: number) => {
    if (n < 0 || n > totalEps) return;
    const ep = n === 0 ? null : apiEpisodes[n - 1];
    setCurrentEpNum(n);
    setLocation(`/drama/${id}/episode/${n}`, { replace: true });
  };

  const seekPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const VolumeIcon = muted || volume === 0 ? VolumeX : Volume2;

  const handleDownloadEpisode = async () => {
    if (!user) { toast({ title: "Please sign in to download", variant: "destructive" }); return; }
    if (!currentEpisode) return;
    const epId = currentEpisode._id || currentEpisode.id;
    if (isDownloaded) {
      // Remove download
      const record = downloadItems.find((d: any) => d.contentId === id && d.episodeId === epId);
      if (record) {
        removeDownloadMutation.mutate(
          { id: record.id || record._id, contentId: id!, episodeId: epId },
          { onSuccess: () => toast({ title: "Removed from downloads" }) }
        );
      }
      return;
    }
    setDownloading(true);
    try {
      const res = await requestDownloadMutation.mutateAsync({
        contentId: id!,
        contentType: "drama",
        episodeId: epId,
      });
      if (res?.success && res?.data?.downloadUrl) {
        await cacheDownloadedVideo(res.data.downloadUrl, id!, epId);
      }
      toast({ title: "Episode saved to downloads" });
    } catch {
      toast({ title: "Download failed", variant: "destructive" });
    } finally {
      setDownloading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center z-[200]">
        <Loader2 className="w-10 h-10 animate-spin text-red-500" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center overflow-hidden">
      {/* Back / close button — top left */}
      {!isExpanded && (
        <button
          onClick={() => setLocation("/")}
          className="absolute top-4 left-4 z-50 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 border border-white/10 text-white hover:bg-white/10 transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      )}

      {/* Left side: Show info (desktop only, when not expanded) */}
      {!isExpanded && (
        <div className="hidden xl:flex flex-col gap-6 mr-10 w-72 flex-shrink-0 bg-zinc-950/40 border border-zinc-900 p-5 rounded-2xl backdrop-blur-md shadow-xl max-h-[85vh] overflow-y-auto" style={{ scrollbarWidth: "none" }}>
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1 bg-red-500/10 border border-red-500/30 text-red-500 rounded-full mb-3 inline-block">Short Drama</span>
            <h2 className="text-white font-black text-2xl leading-tight tracking-tight">{show?.title || "Drama"}</h2>
            {show?.description && (
              <p className="text-white/70 text-xs mt-3 leading-relaxed line-clamp-5">{show.description}</p>
            )}
          </div>

          {/* Stats Bar */}
          <div className="flex items-center justify-between text-white/70 text-xs font-bold border-y border-zinc-900 py-3.5 my-1">
            <div className="text-center flex-1">
              <span className="text-white block text-sm mb-0.5">{totalEps}</span>
              Episodes
            </div>
            <div className="w-px h-6 bg-zinc-900" />
            <div className="text-center flex-1">
              <span className="text-white block text-sm mb-0.5">{freeEps}</span>
              Free EP
            </div>
            <div className="w-px h-6 bg-zinc-900" />
            <div className="text-center flex-1">
              <span className="text-white block text-sm mb-0.5">{fmtCount(show?.views || 0)}</span>
              Views
            </div>
          </div>

          {/* Action Buttons Grid */}
          <div className="flex flex-col gap-3">
            <div className="flex gap-3">
              {/* Like Button */}
              <button
                onClick={() => {
                  if (!user) { setLocation("/login"); return; }
                  toggleLikeMutation.mutate(
                    { contentId: id!, contentType: "drama", episodeId: currentEpisode?._id || currentEpisode?.id },
                    {
                      onSuccess: (data: any) => toast({ title: data?.data?.isLikedByUser ? "Liked!" : "Like removed" }),
                      onError: () => toast({ title: "Failed to update like", variant: "destructive" }),
                    }
                  );
                }}
                disabled={toggleLikeMutation.isPending}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 disabled:opacity-70 ${
                  isLiked
                    ? "bg-[#E50914] border-[#E50914] text-white shadow-md shadow-[#E50914]/20"
                    : "bg-zinc-900/40 border-zinc-800 text-white/75 hover:border-zinc-500 hover:text-white"
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${isLiked ? "fill-white" : ""}`} />
                <span>{isLiked ? "Liked" : "Like"}</span>
              </button>

              {/* Wishlist Button */}
              <button
                onClick={() => {
                  if (!user) { setLocation("/login"); return; }
                  toggleWishlistMutation.mutate(
                    { contentId: id!, contentType: "drama" },
                    {
                      onSuccess: (data: any) => {
                        const added = data?.isWishlisted ?? data?.data?.isWishlisted;
                        toast({ title: added ? "Added to watchlist" : "Removed from watchlist" });
                      },
                      onError: () => toast({ title: "Failed to update watchlist", variant: "destructive" }),
                    }
                  );
                }}
                disabled={toggleWishlistMutation.isPending}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-xl text-xs font-bold border transition-all active:scale-95 disabled:opacity-70 ${
                  inWatchlist
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-400"
                    : "bg-zinc-900/40 border-zinc-800 text-white/75 hover:border-zinc-500 hover:text-white"
                }`}
              >
                <Plus className={`w-3.5 h-3.5 ${inWatchlist ? "rotate-45 text-rose-400" : ""}`} />
                <span>{inWatchlist ? "Wishlisted" : "Watchlist"}</span>
              </button>
            </div>

            {/* Share Button */}
            <button
              onClick={() => {
                recordShareMutation.mutate({ contentId: id!, contentType: "drama" });
                if (navigator.share) {
                  navigator.share({
                    title: show?.title,
                    text: show?.description,
                    url: window.location.href,
                  }).catch(() => {});
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  toast({ title: "Link Copied", description: "Drama link copied to clipboard!" });
                }
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold bg-zinc-900/40 border border-zinc-800 text-white/75 hover:border-zinc-500 hover:text-white transition-all active:scale-95"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share Link
            </button>
          </div>

          {/* Cast & Crew Section */}
          {((show?.cast && show.cast.length > 0) || (show?.crew && show.crew.length > 0) || (show?.crewMembers && show.crewMembers.length > 0)) && (
            <div className="border-t border-zinc-900 pt-5 mt-1">
              <h3 className="text-white font-bold text-xs mb-3">Cast & Crew</h3>
              <div
                className="flex gap-4 overflow-x-auto pb-2"
                style={{ scrollbarWidth: "none" }}
              >
                {show.cast?.map((c: any) => (
                  <div key={`cast-${c.id || c.name}-${c.character}`} className="flex flex-col items-center text-center w-14 flex-shrink-0 group">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0 group-hover:border-primary transition-all duration-350">
                      <img
                        src={getImageUrl(c.image || "")}
                        alt={c.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
                        }}
                      />
                    </div>
                    <h4 className="text-white/80 font-semibold text-[9px] mt-1.5 line-clamp-1 group-hover:text-white transition-colors">{c.name}</h4>
                    <p className="text-white/70 text-[8px] mt-0.5 line-clamp-1 font-semibold">{c.character || c.role || 'Cast'}</p>
                  </div>
                ))}

                {show.crew?.map((c: any) => (
                  <div key={`crew-${c.id || c.name}-${c.role}`} className="flex flex-col items-center text-center w-14 flex-shrink-0 group">
                    <div className="w-10 h-10 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0 group-hover:border-primary transition-all duration-350">
                      <img
                        src={getImageUrl(c.image || "")}
                        alt={c.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-350"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
                        }}
                      />
                    </div>
                    <h4 className="text-white/80 font-semibold text-[9px] mt-1.5 line-clamp-1 group-hover:text-white transition-colors">{c.name}</h4>
                    <p className="text-white/70 text-[8px] mt-0.5 line-clamp-1 font-semibold">{c.role || 'Director'}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9:16 Player Container */}
      <div
        ref={containerRef}
        className={`relative bg-black overflow-hidden select-none transition-all duration-300 ${isExpanded ? "rounded-none" : "rounded-2xl shadow-2xl"}`}
        style={
          isExpanded
            ? { width: `min(${(9 / 16) * 100}vh, 100vw)`, height: "100vh" }
            : { width: "min(380px, 90vw)", aspectRatio: "9/16", maxHeight: "calc(100vh - 40px)" }
        }
        onMouseMove={revealControls}
        onTouchStart={revealControls}
      >
        {/* Video — key=videoSrc forces a full remount when episode changes, guaranteeing currentTime=0 */}
        <video
          key={videoSrc}
          ref={videoRef}
          poster={poster}
          className="absolute inset-0 w-full h-full object-cover"
          playsInline
          onClick={togglePlay}
          onTimeUpdate={() => { const v = videoRef.current; if (v) setCurrentTime(v.currentTime); }}
          onDurationChange={() => { const v = videoRef.current; if (v && isFinite(v.duration)) setDuration(v.duration); }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => goToEpisode(currentEpNum + 1)}
        />

        {/* Locked Overlay */}
        {isLocked && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-4 z-20">
            <div className="w-14 h-14 rounded-full bg-amber-500/20 flex items-center justify-center">
              <Lock className="w-7 h-7 text-amber-400" />
            </div>
            <div className="text-center px-6">
              <p className="text-white font-bold text-base mb-1">Premium Episode</p>
              <p className="text-white/80 text-xs">Unlock this episode for {currentEpisode?.coinsRequired || 0} coins or subscribe to VIP.</p>
            </div>
            <div className="flex flex-col gap-2 w-full max-w-xs px-6">
              <button
                onClick={async () => {
                  if (!user && !localStorage.getItem("adminAccessToken")) { setLocation("/login"); return; }
                  try {
                    await unlockMutation.mutateAsync({ episodeId: currentEpisode?._id || currentEpisode?.id });
                    toast({ title: "Unlocked successfully!" });
                  } catch (e: any) {
                    toast({ title: "Unlock failed", description: e.message || "Insufficient coins", variant: "destructive" });
                  }
                }}
                disabled={unlockMutation.isPending}
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-xl text-sm transition-all"
              >
                {unlockMutation.isPending ? "Unlocking..." : `Unlock for ${currentEpisode?.coinsRequired || 0} Coins`}
              </button>
              <button
                onClick={() => setPlansModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-white font-bold rounded-xl text-sm transition-all"
              >
                <Crown className="w-4 h-4" /> Subscribe VIP
              </button>
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && !isLocked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 z-10">
            <Loader2 className="w-10 h-10 text-white animate-spin" />
          </div>
        )}

        {/* Right side floating action buttons (TikTok style) */}
        {!isLocked && (
          <div className="absolute right-3.5 bottom-28 flex flex-col items-center gap-4 z-30 pointer-events-auto">
            {/* Like Action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!user) { setLocation("/login"); return; }
                toggleLikeMutation.mutate(
                  { contentId: id!, contentType: "drama", episodeId: currentEpisode?._id || currentEpisode?.id },
                  {
                    onSuccess: (data: any) => toast({ title: data?.data?.isLikedByUser ? "Liked!" : "Like removed" }),
                    onError: () => toast({ title: "Failed to update like", variant: "destructive" }),
                  }
                );
              }}
              disabled={toggleLikeMutation.isPending}
              className="flex flex-col items-center gap-1 group/float active:scale-90 transition-all text-white disabled:opacity-50"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-black/60 border border-white/10 backdrop-blur-md transition-colors group-hover/float:bg-white/20 ${isLiked ? "text-[#E50914] border-[#E50914]/40" : ""}`}>
                <Heart className={`w-4.5 h-4.5 ${isLiked ? "fill-[#E50914]" : ""}`} />
              </div>
              <span className="text-[9px] font-bold drop-shadow-md">{fmtCount((show?.likes || 0) + (isLiked ? 1 : 0))}</span>
            </button>

            {/* Wishlist Action */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (!user) { setLocation("/login"); return; }
                toggleWishlistMutation.mutate(
                  { contentId: id!, contentType: "drama" },
                  {
                    onSuccess: (data: any) => {
                      const added = data?.isWishlisted ?? data?.data?.isWishlisted;
                      toast({ title: added ? "Added to watchlist" : "Removed from watchlist" });
                    },
                    onError: () => toast({ title: "Failed to update watchlist", variant: "destructive" }),
                  }
                );
              }}
              disabled={toggleWishlistMutation.isPending}
              className="flex flex-col items-center gap-1 group/float active:scale-90 transition-all text-white disabled:opacity-50"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-black/60 border border-white/10 backdrop-blur-md transition-colors group-hover/float:bg-white/20 ${inWatchlist ? "text-[#E50914] border-[#E50914]/40" : ""}`}>
                <Plus className={`w-4.5 h-4.5 ${inWatchlist ? "rotate-45 text-[#E50914]" : ""}`} />
              </div>
              <span className="text-[9px] font-bold drop-shadow-md">Watchlist</span>
            </button>

            {/* Download Action */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDownloadEpisode(); }}
              disabled={downloading || requestDownloadMutation.isPending || removeDownloadMutation.isPending}
              className="flex flex-col items-center gap-1 group/float active:scale-90 transition-all text-white disabled:opacity-50"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-black/60 border backdrop-blur-md transition-colors group-hover/float:bg-white/20 ${
                isDownloaded ? "border-emerald-500/40 text-emerald-400" : "border-white/10"
              }`}>
                {(downloading || requestDownloadMutation.isPending || removeDownloadMutation.isPending)
                  ? <Loader2 className="w-4.5 h-4.5 animate-spin" />
                  : isDownloaded
                  ? <Check className="w-4.5 h-4.5 text-emerald-400" />
                  : <Download className="w-4.5 h-4.5" />}
              </div>
              <span className="text-[9px] font-bold drop-shadow-md">{isDownloaded ? "Saved" : "Save"}</span>
            </button>

            {/* Episodes List Trigger */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowEpList(!showEpList); }}
              className="flex flex-col items-center gap-1 group/float active:scale-90 transition-all text-white"
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-black/60 border border-white/10 backdrop-blur-md transition-colors group-hover/float:bg-white/20">
                <ChevronUp className={`w-4.5 h-4.5 transition-transform ${showEpList ? "rotate-180" : ""}`} />
              </div>
              <span className="text-[9px] font-bold drop-shadow-md">Episodes</span>
            </button>
          </div>
        )}

        {/* Controls Overlay */}
        <div className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${controlsVisible || !playing ? "opacity-100" : "opacity-0"} pointer-events-none`}>
          {/* Top bar */}
          <div className="bg-gradient-to-b from-black/70 to-transparent p-4 pointer-events-auto">
            <div className="flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm truncate">{show?.title}</p>
                {currentEpisode && (
                  <p className="text-white text-xs mt-0.5 truncate">
                    EP {currentEpNum}: {currentEpisode.title || `Episode ${currentEpNum}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 ml-3">
                <button onClick={toggleMute} className="text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors">
                  <VolumeIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                >
                  {isExpanded ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
                {isExpanded && (
                  <button
                    onClick={() => setLocation("/")}
                    className="text-white w-8 h-8 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Center: play/pause icon — pointer-events only on the button itself */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            {!playing && !loading && (
              <button
                className="w-16 h-16 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center shadow-xl pointer-events-auto"
                onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                aria-label="Play"
              >
                <Play className="w-7 h-7 text-white fill-white ml-1" />
              </button>
            )}
          </div>

          {/* Bottom bar */}
          <div className="bg-gradient-to-t from-black/85 via-black/40 to-transparent p-4 pointer-events-auto">
            {/* Seek bar */}
            <div className="relative h-1 bg-white/20 rounded-full mb-3 cursor-pointer group/seek" onClick={(e) => e.stopPropagation()}>
              <div className="h-full bg-[#E50914] rounded-full" style={{ width: `${seekPct}%` }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#E50914] border-2 border-white opacity-0 group-hover/seek:opacity-100 transition-opacity"
                style={{ left: `calc(${seekPct}% - 6px)` }}
              />
              <input
                type="range" min={0} max={100} step={0.1} value={seekPct}
                onChange={(e) => {
                  const v = videoRef.current;
                  if (v && duration) v.currentTime = (parseFloat(e.target.value) / 100) * duration;
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Bottom controls row */}
            <div className="flex items-center justify-between text-white text-xs">
              {/* Left: Time and Episode index */}
              <div className="flex items-center gap-2">
                <span className="font-mono text-white/80">{fmtTime(currentTime)} / {fmtTime(duration)}</span>
                <span className="text-white/65">|</span>
                <span className="font-bold text-white/75">EP {currentEpNum}/{totalEps}</span>
              </div>

              {/* Right: Prev / Next navigation buttons */}
              <div className="flex items-center gap-2">
                {currentEpNum > 1 && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goToEpisode(currentEpNum - 1); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-white/10 border border-white/10 rounded-xl transition-all font-bold text-[11px]"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>
                )}
                {currentEpNum < totalEps && (
                  <button
                    onClick={(e) => { e.stopPropagation(); goToEpisode(currentEpNum + 1); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[#E50914] hover:bg-red-500 rounded-xl transition-all font-bold text-[11px] text-white"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Episode List Panel (slides up from bottom) */}
        {showEpList && (
          <div
            className="absolute bottom-0 left-0 right-0 bg-[#0a0a14]/98 backdrop-blur-md border-t border-white/10 z-30 max-h-[60%] overflow-y-auto"
            style={{ scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" } as React.CSSProperties}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#0a0a14]/98 flex items-center justify-between px-4 py-3 border-b border-white/5">
              <span className="text-white font-bold text-sm">Episodes ({totalEps})</span>
              <button onClick={() => setShowEpList(false)} className="text-white/80 hover:text-white">
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              {apiEpisodes.map((ep: any, i: number) => {
                const n = ep.episode || i + 1;
                const locked = ep.isLockedForUser !== undefined ? ep.isLockedForUser : !ep.isFree;
                const isCurrent = n === currentEpNum;
                return (
                  <button
                    key={ep._id || ep.id || i}
                    onClick={() => { goToEpisode(n); setShowEpList(false); }}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${isCurrent ? "bg-red-600/20 border border-red-600/30" : "hover:bg-white/5"}`}
                  >
                    <div className="w-12 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800" style={{ aspectRatio: "9/16" }}>
                      {ep.thumbnail && <img src={getImageUrl(ep.thumbnail)} alt="" className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <span className={`text-[10px] font-bold ${isCurrent ? "text-red-400" : "text-white"}`}>EP {n}</span>
                        {ep.isFree && userPlan === "free" && <span className="text-[9px] font-bold px-1 py-0.5 bg-emerald-600/20 text-emerald-400 rounded">FREE</span>}
                        {locked && <Lock className="w-2.5 h-2.5 text-amber-400 flex-shrink-0" />}
                      </div>
                      <p className={`text-xs font-semibold truncate ${isCurrent ? "text-red-400" : "text-white"}`}>{ep.title || `Episode ${n}`}</p>
                    </div>
                    {isCurrent && <SkipForward className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ── PRE-ROLL AD OVERLAY ── */}
        {showPreroll && (
          <div className="absolute inset-0 z-[400] bg-black rounded-2xl overflow-hidden">
            <PlayerPrerollAd onFinished={() => {
              setShowPreroll(false);
              // Start playing the actual video after ad finishes
              const v = videoRef.current;
              if (v) {
                v.play().catch(() => {});
                setPlaying(true);
              }
            }} />
          </div>
        )}
      </div>

      {/* Right side: Episode list (desktop, when not expanded) */}
      {!isExpanded && (
        <div className="hidden xl:flex flex-col gap-3 ml-10 w-72 flex-shrink-0 max-h-[85vh] overflow-y-auto bg-zinc-950/40 border border-zinc-900 p-5 rounded-2xl backdrop-blur-md shadow-xl" style={{ scrollbarWidth: "none" }}>
          <p className="text-white/80 text-xs font-extrabold uppercase tracking-wider mb-2 border-b border-zinc-900 pb-2.5">Episodes</p>
          <div className="space-y-2">
            {apiEpisodes.map((ep: any, i: number) => {
              const n = ep.episode || i + 1;
              const locked = ep.isLockedForUser !== undefined ? ep.isLockedForUser : !ep.isFree;
              const isCurrent = n === currentEpNum;
              const isEpDownloaded = profileData?.downloads?.some((d: any) => d.episodeId === (ep._id || ep.id));
              return (
                <button
                  key={ep._id || ep.id || i}
                  onClick={() => goToEpisode(n)}
                  className={`w-full flex items-center gap-3.5 p-2 rounded-xl text-left border transition-all duration-300 group/ep ${
                    isCurrent
                      ? "bg-red-500/5 border-red-500/40 shadow-[0_2px_12px_rgba(229,9,20,0.06)]"
                      : "bg-zinc-900/20 border-zinc-900/60 hover:bg-zinc-900/40 hover:border-zinc-800"
                  }`}
                >
                  <div className="w-12 aspect-[9/16] rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0 relative">
                    {ep.thumbnail && (
                      <img
                        src={getImageUrl(ep.thumbnail)}
                        alt=""
                        className="w-full h-full object-cover group-hover/ep:scale-105 transition-transform duration-350"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/40 group-hover/ep:bg-black/20 transition-all flex items-center justify-center">
                      {locked ? (
                        <Lock className="w-3.5 h-3.5 text-amber-400" />
                      ) : (
                        <Play className="w-3.5 h-3.5 text-white fill-white opacity-0 group-hover/ep:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className={`text-[10px] font-extrabold ${isCurrent ? "text-red-500" : "text-white/75"}`}>EP {n}</span>
                      {ep.isFree && userPlan === "free" && (
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-emerald-600/10 text-emerald-400 rounded-md border border-emerald-500/20">
                          FREE
                        </span>
                      )}
                      {isEpDownloaded && (
                        <span className="text-[8px] font-extrabold px-1.5 py-0.5 bg-zinc-850 text-white/75 rounded-md border border-zinc-700">
                          Saved
                        </span>
                      )}
                    </div>
                    <p className={`text-xs font-bold truncate ${isCurrent ? "text-red-500" : "text-white"}`}>{ep.title || `Episode ${n}`}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <SubscriptionPlansModal isOpen={plansModalOpen} onClose={() => setPlansModalOpen(false)} />
    </div>
  );
}
