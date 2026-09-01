import { useState, useRef, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight, Play, Pause, Lock, X, Crown, Star, Volume2, VolumeX, FastForward } from "lucide-react";
import Hls from "hls.js";
import { useAdPlayback } from "@/hooks/useAdPlayback";
import AdOverlay from "@/components/AdOverlay";

interface DramaProp {
  id: string | number;
  title: string;
  poster: string;
  rating: string;
  totalEpisodes: number;
  freeEpisodes: number;
  language: string;
  badge?: string;
  genres: string[];
}

interface EpisodeProp {
  id: string;
  number: number | string;
  title: string;
  description?: string;
  duration: string;
  videoUrl: string;
  thumbnail?: string;
  isFree: boolean;
  isLocked: boolean;
}

interface ShortDramaPlayerProps {
  drama: DramaProp;
  episodes: EpisodeProp[];
  onClose: () => void;
  onNextEpisode?: () => void;
  onPrevEpisode?: () => void;
}

function getRanges(totalEpisodes: number): { label: string; start: number; end: number }[] {
  const ranges: { label: string; start: number; end: number }[] = [];
  for (let i = 0; i <= totalEpisodes; i += 50) {
    const end = Math.min(i + 49, totalEpisodes);
    ranges.push({ label: `${i} - ${end}`, start: i, end });
  }
  return ranges;
}

function epNum(ep: EpisodeProp): number {
  if (ep.number === "Trailer") return 0;
  return typeof ep.number === "number" ? ep.number : parseInt(String(ep.number), 10) || 0;
}

export default function ShortDramaPlayer({
  drama,
  episodes,
  onClose,
  onNextEpisode,
  onPrevEpisode,
}: ShortDramaPlayerProps) {
  const [user, setUser] = useState<any>(null);
  useEffect(() => {
    try {
      const stored = localStorage.getItem("appUser");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  const isSubscribed = user?.subscriptionStatus === "active" && user?.subscriptionPlan !== "free";

  const firstFreeIndex = episodes.findIndex((e) => !e.isLocked || isSubscribed);
  const startIndex = firstFreeIndex >= 0 ? firstFreeIndex : 0;
  const [currentEpIndex, setCurrentEpIndex] = useState(startIndex);
  const currentEp = episodes[currentEpIndex];

  const [rangeStart, setRangeStart] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [lockedEpNum, setLockedEpNum] = useState<number | string | null>(null);
  const [showAutoAdvance, setShowAutoAdvance] = useState(false);
  const [autoAdvanceCount, setAutoAdvanceCount] = useState(5);
  const [episodeProgress, setEpisodeProgress] = useState(0);
  const [epDuration, setEpDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const autoAdvanceTimerRef = useRef<ReturnType<typeof setInterval>>();
  const touchStartY = useRef<number | null>(null);

  const doSwitchEpisode = useCallback((index: number) => {
    if (index < 0 || index >= episodes.length) return;
    const ep = episodes[index];
    if (ep.isLocked && !isSubscribed) {
      setLockedEpNum(ep.number);
      setShowLockModal(true);
      return;
    }
    setCurrentEpIndex(index);
    const n = epNum(ep);
    const correctRange = Math.floor(n / 50) * 50;
    if (correctRange !== rangeStart) setRangeStart(correctRange);
  }, [episodes, rangeStart]);

  const handleAdComplete = useCallback(() => {
    if (pendingEpIndexRef.current !== null) {
      doSwitchEpisode(pendingEpIndexRef.current);
      pendingEpIndexRef.current = null;
    }
  }, [doSwitchEpisode]);

  const {
    phase: adPhase,
    timer: adTimer,
    canSkip: adCanSkip,
    startAd,
    skipAd,
    reset: resetAd,
    isActive: adIsActive,
  } = useAdPlayback({
    onAdComplete: handleAdComplete,
  });

  const pendingEpIndexRef = useRef<number | null>(null);

  const ranges = getRanges(drama.totalEpisodes);

  const displayedEpisodes = episodes.filter((ep) => {
    const n = epNum(ep);
    return n >= rangeStart && n <= rangeStart + 49;
  });

  // Load episode video
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    setEpisodeProgress(0);
    setEpDuration(0);
    setPlaying(false);

    if (!currentEp?.videoUrl || (currentEp.isLocked && !isSubscribed)) {
      v.src = "";
      return;
    }

    let hls: Hls | null = null;
    const isM3u8 = currentEp.videoUrl.includes('.m3u8');

    if (isM3u8 && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(currentEp.videoUrl);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setEpDuration(v.duration || 0);
      });
    } else {
      v.src = currentEp.videoUrl;
      v.load();
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [currentEp]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v || adIsActive) return;
    if (v.paused) { v.play().catch(() => {}); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const handleEpClick = (ep: EpisodeProp) => {
    if (ep.isLocked && !isSubscribed) {
      setLockedEpNum(ep.number);
      setShowLockModal(true);
      return;
    }
    const index = episodes.findIndex((e) => e.id === ep.id);
    if (index === currentEpIndex) {
      togglePlay();
      return;
    }
    // Show ad between episodes before switching
    pendingEpIndexRef.current = index;
    startAd('between-episode', { duration: 3, skippableAfter: 1 });
  };

  const handleNext = useCallback(() => {
    if (currentEpIndex < episodes.length - 1) {
      const nextIdx = currentEpIndex + 1;
      const nextEp = episodes[nextIdx];
      if (nextEp.isLocked && !isSubscribed) {
        setLockedEpNum(nextEp.number);
        setShowLockModal(true);
        return;
      }
      pendingEpIndexRef.current = nextIdx;
      startAd('between-episode', { duration: 3, skippableAfter: 1 });
    } else {
      onNextEpisode?.();
    }
  }, [currentEpIndex, episodes, onNextEpisode, startAd]);

  const handlePrev = useCallback(() => {
    if (currentEpIndex > 0) {
      const prevIdx = currentEpIndex - 1;
      const prevEp = episodes[prevIdx];
      if (prevEp.isLocked && !isSubscribed) {
        setLockedEpNum(prevEp.number);
        setShowLockModal(true);
        return;
      }
      pendingEpIndexRef.current = prevIdx;
      startAd('between-episode', { duration: 3, skippableAfter: 1 });
    } else {
      onPrevEpisode?.();
    }
  }, [currentEpIndex, episodes, onPrevEpisode, startAd]);

  // Auto advance countdown at episode end
  const startAutoAdvance = useCallback(() => {
    if (showAutoAdvance) return;
    setShowAutoAdvance(true);
    setAutoAdvanceCount(5);
    autoAdvanceTimerRef.current = setInterval(() => {
      setAutoAdvanceCount((prev) => {
        if (prev <= 1) {
          clearInterval(autoAdvanceTimerRef.current);
          setShowAutoAdvance(false);
          handleNext();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [showAutoAdvance, handleNext]);

  const cancelAutoAdvance = () => {
    if (autoAdvanceTimerRef.current) clearInterval(autoAdvanceTimerRef.current);
    setShowAutoAdvance(false);
  };

  // Touch swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;
    touchStartY.current = null;
    if (Math.abs(deltaY) < 50) return;
    if (deltaY < 0) {
      handleNext();
    } else {
      handlePrev();
    }
  };

  const isActive = (ep: EpisodeProp) => ep.id === currentEp?.id;

  const badgeMap: Record<string, string> = {
    NEW: "bg-emerald-500 text-foreground",
    HOT: "bg-orange-500 text-foreground",
    TRENDING: "bg-blue-500 text-white",
    EXCLUSIVE: "bg-purple-600 text-white",
  };

  return (
    <div className="fixed inset-0 z-[500] bg-[#0d0d0d] flex flex-col overflow-hidden">

      {/* ── Header ── */}
      <div className="flex items-center gap-3 px-3 sm:px-5 py-2.5 border-b border-zinc-800/80 bg-[#0d0d0d] flex-shrink-0">
        <button
          onClick={onClose}
          className="w-9 h-9 rounded-full bg-zinc-800/80 hover:bg-zinc-700 flex items-center justify-center text-foreground transition-colors flex-shrink-0"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        {/* Drama info */}
        <div className="flex-1 min-w-0 flex items-center gap-2.5">
          <img
            src={drama.poster}
            alt=""
            className="w-8 h-8 rounded-md object-cover flex-shrink-0"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-foreground font-bold text-sm truncate">{drama.title}</h2>
              {drama.badge && (
                <span className={`hidden sm:inline text-[9px] font-black px-1.5 py-0.5 rounded-sm uppercase flex-shrink-0 ${badgeMap[drama.badge]}`}>
                  {drama.badge}
                </span>
              )}
            </div>
            <p className="text-foreground/65 text-[11px] mt-0.5">
              {currentEp?.number === "Trailer" ? "Trailer" : `EP ${currentEp?.number}`} · {currentEp?.duration} · {drama.language}
            </p>
          </div>
        </div>

        {/* Rating */}
        <div className="hidden sm:flex items-center gap-1 text-amber-400 flex-shrink-0">
          <Star className="w-3 h-3 fill-amber-400" />
          <span className="text-xs font-bold">{drama.rating}</span>
        </div>

        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-foreground/65 hover:text-foreground transition-colors flex-shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* ── Main: video + episodes ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Portrait video player */}
        <div
          className="flex-shrink-0 flex items-center justify-center bg-black"
          style={{ width: "clamp(150px, 38vw, 340px)", padding: "12px" }}
        >
          <div
            className="relative bg-zinc-900 rounded-2xl overflow-hidden w-full cursor-pointer shadow-2xl shadow-black/60"
            style={{ aspectRatio: "9/16" }}
            onClick={togglePlay}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <video
              ref={videoRef}
              poster={drama.poster}
              className="w-full h-full object-cover"
              playsInline
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={() => {
                const v = videoRef.current;
                if (!v) return;
                setEpisodeProgress(v.duration ? (v.currentTime / v.duration) * 100 : 0);
              }}
              onLoadedMetadata={() => {
                const v = videoRef.current;
                if (v) setEpDuration(v.duration || 0);
              }}
              onEnded={() => {
                setPlaying(false);
                if (currentEpIndex < episodes.length - 1) {
                  startAutoAdvance();
                }
              }}
            />

            {/* Ad Overlay between episodes */}
            {adIsActive && (
              <AdOverlay
                timer={adTimer}
                canSkip={adCanSkip}
                onSkip={skipAd}
                label="Up Next"
              />
            )}

            {/* Auto Advance Countdown Overlay */}
            {showAutoAdvance && !adIsActive && (
              <div className="absolute inset-0 z-[350] bg-black/80 flex flex-col items-center justify-center gap-4">
                <p className="text-foreground/70 text-xs uppercase tracking-widest font-bold">Next Episode In</p>
                <div className="text-foreground font-black text-6xl tabular-nums">{autoAdvanceCount}</div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => { e.stopPropagation(); cancelAutoAdvance(); handleNext(); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-full text-sm transition-all"
                  >
                    <FastForward className="w-4 h-4" />
                    Play Now
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); cancelAutoAdvance(); }}
                    className="px-5 py-2.5 bg-white/10 hover:bg-white/20 text-foreground font-bold rounded-full text-sm transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Play/pause overlay */}
            <div
              className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
                playing ? "opacity-0 hover:opacity-100" : "opacity-100"
              }`}
            >
              <div className="w-14 h-14 rounded-full bg-black/55 backdrop-blur-sm border border-white/25 flex items-center justify-center shadow-xl">
                {playing
                  ? <Pause className="w-6 h-6 text-foreground fill-white" />
                  : <Play className="w-6 h-6 text-foreground fill-white ml-0.5" />
                }
              </div>
            </div>

            {/* Top: portrait badge + mute */}
            <div className="absolute top-2 left-2 right-2 flex items-center justify-between pointer-events-none">
              <span className="text-[9px] bg-purple-600/90 text-white px-2 py-0.5 rounded-full font-black backdrop-blur-sm">
                Portrait 9:16
              </span>
              <button
                className="pointer-events-auto w-7 h-7 rounded-full bg-black/50 backdrop-blur-sm flex items-center justify-center text-white/80 hover:text-white transition-colors"
                onClick={toggleMute}
              >
                {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Bottom: episode label + progress bar */}
            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black via-black/50 to-transparent pointer-events-none">
              <p className="text-foreground text-xs font-black">
                {currentEp?.number === "Trailer" ? "Trailer" : `EP ${currentEp?.number}`}
              </p>
              <p className="text-foreground/70 text-[10px] mt-0.5 truncate">{currentEp?.title}</p>
              {/* Progress bar */}
              <div className="mt-2 h-[3px] bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all"
                  style={{ width: `${episodeProgress}%` }}
                />
              </div>
            </div>

            {/* Playing indicator dot */}
            {playing && (
              <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-primary/85 text-white text-[9px] font-black px-2 py-[3px] rounded-full pointer-events-none backdrop-blur-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                LIVE
              </div>
            )}
          </div>
        </div>

        {/* ── Episode selector panel ── */}
        <div className="flex-1 flex flex-col overflow-hidden border-l border-zinc-800/60 bg-[#111]">

          {/* Range tabs row */}
          <div className="flex items-center px-3 sm:px-4 py-2 border-b border-zinc-800/60 flex-shrink-0 gap-1 overflow-x-auto" style={{ scrollbarWidth: "none" } as React.CSSProperties}>
            {ranges.map((r) => (
              <button
                key={r.label}
                onClick={() => setRangeStart(r.start)}
                className={`px-3 py-1.5 text-sm font-bold whitespace-nowrap transition-all flex-shrink-0 border-b-2 ${
                  rangeStart === r.start
                    ? "text-foreground border-red-600"
                    : "text-foreground/65 border-transparent hover:text-muted-foreground"
                }`}
              >
                {r.label}
              </button>
            ))}
            <div className="flex-1 min-w-2" />
            <button className="text-foreground/65 hover:text-foreground text-xs flex items-center gap-0.5 transition-colors flex-shrink-0">
              All Episodes <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Episode grid */}
          <div
            className="flex-1 overflow-y-auto p-3 sm:p-4"
            style={{ scrollbarWidth: "none" } as React.CSSProperties}
          >
            <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
              {displayedEpisodes.map((ep) => {
                const active = isActive(ep);
                return (
                  <button
                    key={ep.id}
                    onClick={() => handleEpClick(ep)}
                    className={`relative flex items-center justify-center rounded-lg font-bold transition-all border select-none ${
                      active
                        ? "bg-zinc-600 border-zinc-400 text-foreground shadow-md"
                        : ep.isLocked && !isSubscribed
                          ? "bg-zinc-900 border-zinc-800 text-white/60 hover:border-zinc-700 cursor-pointer"
                          : "bg-zinc-800/80 border-zinc-700/50 text-muted-foreground hover:bg-zinc-700 hover:text-foreground hover:border-zinc-500 cursor-pointer"
                    }`}
                    style={{ aspectRatio: "1", fontSize: ep.number === "Trailer" ? "9px" : "clamp(10px, 1.5vw, 13px)" }}
                  >
                    {ep.number === "Trailer" ? (
                      <span className="font-black leading-none text-center px-0.5">Trailer</span>
                    ) : (
                      ep.number
                    )}

                    {/* Lock badge */}
                    {ep.isLocked && !isSubscribed && (
                      <span className="absolute top-0.5 right-0.5 w-[14px] h-[14px] bg-primary rounded-full flex items-center justify-center flex-shrink-0">
                        <Lock className="w-[7px] h-[7px] text-foreground" />
                      </span>
                    )}

                    {/* Currently playing bar */}
                    {active && (
                      <span className="absolute bottom-[3px] left-1/2 -translate-x-1/2 w-4 h-[3px] bg-primary rounded-full" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Description card */}
            <div className="mt-4 p-3 bg-zinc-800/40 rounded-xl border border-zinc-700/30">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[11px] text-foreground/65">Now Playing</span>
                <span className="text-[11px] text-foreground font-bold">
                  {currentEp?.number === "Trailer" ? "Trailer" : `Episode ${currentEp?.number}`}
                </span>
                <span className="text-[11px] text-muted-foreground/80">· {currentEp?.duration}</span>
              </div>
              <p className="text-xs text-foreground/70 leading-relaxed line-clamp-3">{currentEp?.description || "No description available."}</p>
              <div className="flex items-center gap-2 mt-2">
                {drama.genres.map((g) => (
                  <span key={g} className="text-[9px] bg-zinc-700/60 text-foreground/70 px-1.5 py-0.5 rounded-sm">{g}</span>
                ))}
              </div>
            </div>

            {/* Free / lock divider */}
            {!isSubscribed && (
              <div className="flex items-center gap-2 mt-3 px-1">
                <div className="flex-1 h-px bg-zinc-800" />
                <span className="text-muted-foreground/80 text-[10px] flex-shrink-0 text-center leading-snug">
                  EP 1–{drama.freeEpisodes} FREE · Subscribe to unlock all {drama.totalEpisodes} episodes
                </span>
                <div className="flex-1 h-px bg-zinc-800" />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Lock/Subscribe modal ── */}
      {showLockModal && (
        <div className="absolute inset-0 z-20 flex items-end sm:items-center justify-center">
          <div
            className="absolute inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setShowLockModal(false)}
          />
          <div className="relative z-10 bg-zinc-900 border border-zinc-700/80 rounded-t-3xl sm:rounded-2xl w-full sm:max-w-[380px] mx-auto p-6 shadow-2xl">
            {/* Poster backdrop */}
            <div className="relative mb-5 rounded-xl overflow-hidden h-32">
              <img src={drama.poster} alt="" className="w-full h-full object-cover opacity-40" />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-900 via-zinc-900/50 to-transparent" />
              <div className="absolute bottom-3 left-3 right-3">
                <p className="text-foreground font-bold text-sm truncate">{drama.title}</p>
                <p className="text-foreground/70 text-[10px] mt-0.5">Episode {lockedEpNum} is locked</p>
              </div>
            </div>

            <div className="flex justify-center mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-xl shadow-amber-500/30">
                <Crown className="w-7 h-7 text-foreground" />
              </div>
            </div>
            <h3 className="text-foreground font-black text-xl text-center mb-1">Premium Episode</h3>
            <p className="text-foreground/70 text-sm text-center mb-1">
              Episode {lockedEpNum} is locked
            </p>
            <p className="text-foreground/65 text-xs text-center mb-6">
              Subscribe to unlock all {drama.totalEpisodes} episodes of
              <br /><span className="text-foreground font-semibold">"{drama.title}"</span>
            </p>

            <div className="space-y-2">
              <button className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black rounded-xl text-sm shadow-lg shadow-amber-500/25 transition-all active:scale-95">
                Subscribe Now — Unlock All
              </button>
              <button
                onClick={() => setShowLockModal(false)}
                className="w-full py-2.5 text-foreground/65 hover:text-foreground text-sm transition-colors rounded-xl hover:bg-white/5"
              >
                Maybe Later
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
