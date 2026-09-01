import { useState, useRef, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import {
  ChevronLeft, ChevronRight, Heart, Star, Share2, Lock,
  Play, Pause, Volume2, VolumeX, Volume1, Maximize, Minimize,
  SkipForward, Home, Loader2, X, CreditCard, Crown,
  Settings, Check, RotateCcw, RotateCw, SkipBack, Plus, Download
} from "lucide-react";
import { PublicHeader, PublicFooter } from "./streaming-home";
import { WebsiteReviews } from "@/components/WebsiteReviews";
import Hls from "hls.js";
import { useGetWebSubscriptionPlans, useCreateSubscription, useGetWebDetail, getImageUrl, useGetPublicAds, useGetAppProfile, useToggleLike, useRequestDownload, useRemoveDownload, useGetWishlist, useToggleWishlist, useSaveWatchProgress, useGetWatchProgress, getOfflineVideoUrl, useGetDownloads, cacheDownloadedVideo, removeOfflineVideo, useRecordView, useRecordShare } from "@/lib/api-client";
import { PlayerPrerollAd } from "@/components/AdComponents";
import { useToast } from "@/hooks/use-toast";
import { PortraitCard } from "@/components/ContentCard";
/* ─── AD OVERLAY ─── */
function AdOverlay({ ad, onSkip }: { ad: any; onSkip: () => void }) {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => setCountdown((c) => { if (c <= 1) { clearInterval(timer); return 0; } return c - 1; }), 1000);
    return () => clearInterval(timer);
  }, []);

  const adSrc = ad.urlType === "URL" ? ad.mediaUrl : getImageUrl(ad.mediaUrl);

  return (
    <div className="absolute inset-0 z-30 bg-black flex flex-col items-center justify-center">
      {ad.adType === "Video" ? (
        <video src={adSrc} className="w-full h-full object-contain" autoPlay onEnded={onSkip} playsInline />
      ) : ad.adType === "Image" ? (
        <a href={ad.redirectUrl || "#"} target="_blank" rel="noopener noreferrer" className="w-full h-full flex items-center justify-center">
          <img src={adSrc} alt={ad.adName} className="max-w-full max-h-full object-contain" />
        </a>
      ) : (
        <div className="w-full h-full" dangerouslySetInnerHTML={{ __html: ad.mediaUrl }} />
      )}
      <div className="absolute bottom-4 right-4 flex items-center gap-3">
        <span className="text-foreground/80 text-xs bg-black/60 px-2 py-1 rounded">Advertisement</span>
        {countdown > 0 ? (
          <span className="bg-black/70 text-white text-xs px-3 py-1.5 rounded-lg font-bold border border-zinc-700">Skip in {countdown}s</span>
        ) : (
          <button onClick={onSkip} className="bg-white/90 hover:bg-white text-black text-xs font-black px-3 py-1.5 rounded-lg transition-colors">Skip Ad ›</button>
        )}
      </div>
    </div>
  );
}

function fmtCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${n}`;
}

function fmtTime(s: number): string {
  if (!isFinite(s) || isNaN(s) || s < 0) return "00:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
}

/* ─────────────────────────────────────────────────────────────
   VIDEO PLAYER COMPONENT
   Props:
     videoSrc   — episode video URL (from getEpisodeVideo)
     thumbnail  — poster image shown before play
     autoPlay   — true when navigating from one episode to another
     onNext     — called when user clicks SkipForward / video ends
   ───────────────────────────────────────────────────────────── */
function VideoPlayer({
  videoSrc,
  thumbnail,
  autoPlay = false,
  onNext,
  videoSettings,
  contentId,
  episodeId,
  resumeFrom,
  contentType,
}: {
  videoSrc: string;
  thumbnail: string;
  autoPlay?: boolean;
  onNext?: () => void;
  videoSettings?: Array<{ key: string; label: string; description?: string; url: string }> | null;
  contentId?: string;
  episodeId?: string;
  resumeFrom?: number;
  contentType?: 'drama' | 'movie' | 'series';
}) {
  const videoRef      = useRef<HTMLVideoElement>(null);
  const containerRef  = useRef<HTMLDivElement>(null);
  const hideTimerRef  = useRef<ReturnType<typeof setTimeout>>();
  // Seed with resumeFrom so the first canplay/manifest event seeks to the saved position
  const pendingSeekRef = useRef<number | null>(resumeFrom && resumeFrom > 5 ? resumeFrom : null);

  const [playing,        setPlaying]        = useState(false);
  const [currentTime,    setCurrentTime]    = useState(0);
  const [duration,       setDuration]       = useState(0);
  const [volume,         setVolume]         = useState(0.8);
  const [muted,          setMuted]          = useState(false);
  const [buffered,       setBuffered]       = useState(0);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [isFullscreen,   setIsFullscreen]   = useState(false);
  const [loading,        setLoading]        = useState(true);
  const [skipAnim,       setSkipAnim]       = useState<"left"|"right"|null>(null);

  // Quality & Speed Settings state
  const [currentSrc,     setCurrentSrc]     = useState(() => videoSrc ? getImageUrl(videoSrc) : "");
  const [currentQuality, setCurrentQuality] = useState("auto");
  const [speed,          setSpeed]          = useState(1.0);
  const [settingsOpen,   setSettingsOpen]   = useState(false);
  const [currentMenu,    setCurrentMenu]    = useState<"main" | "quality" | "speed">("main");

  const saveProgressMutation = useSaveWatchProgress();
  const lastSavedTimeRef = useRef(0);
  const resumeAppliedRef = useRef(false);

  const recordViewMutation = useRecordView();
  const viewRecordedRef = useRef(false);

  useEffect(() => {
    if (playing && !viewRecordedRef.current && contentId) {
      viewRecordedRef.current = true;
      const apiContentType = contentType === 'drama' ? 'drama' : contentType === 'movie' ? 'movie' : 'show';
      recordViewMutation.mutate({
        contentId,
        contentType: apiContentType,
        episodeId: episodeId || undefined,
      });
    }
  }, [playing, contentId, episodeId, contentType]);

  // If resumeFrom arrives after mount (async), apply it before the video has started
  useEffect(() => {
    if (resumeFrom && resumeFrom > 5 && !resumeAppliedRef.current && currentTime < 2) {
      pendingSeekRef.current = resumeFrom;
    }
  }, [resumeFrom]);

  useEffect(() => {
    if (!contentId || !duration) return;
    const token = localStorage.getItem("appAccessToken");
    if (!token) return;

    const diff = Math.abs(currentTime - lastSavedTimeRef.current);
    if (duration > 20 && (diff >= 10 || (!playing && currentTime > 2 && diff > 1))) {
      lastSavedTimeRef.current = currentTime;
      saveProgressMutation.mutate({
        contentId,
        episodeId: episodeId || undefined,
        progressSeconds: Math.round(currentTime),
        durationSeconds: Math.round(duration),
      });
    }
  }, [currentTime, duration, contentId, episodeId, playing]);

  const scheduleHide = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    if (playing) {
      hideTimerRef.current = setTimeout(() => setControlsVisible(false), 3000);
    }
  }, [playing]);

  const revealControls = useCallback(() => {
    setControlsVisible(true);
    scheduleHide();
  }, [scheduleHide]);

  // Sync parent videoSrc
  useEffect(() => {
    setCurrentSrc(videoSrc ? getImageUrl(videoSrc) : "");
    setCurrentQuality("auto");
    setSpeed(1.0);
    setSettingsOpen(false);
    setCurrentMenu("main");
  }, [videoSrc]);

  /* play / pause */
  const togglePlay = useCallback(async () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) { await v.play().catch(() => {}); }
    else          { v.pause(); }
    revealControls();
  }, [revealControls]);

  /* seek */
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const t = Number(e.target.value);
    v.currentTime = t;
    setCurrentTime(t);
    revealControls();
  };

  const skip = useCallback((sec: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = Math.max(0, Math.min(v.duration || 0, v.currentTime + sec));
    setSkipAnim(sec > 0 ? "right" : "left");
    setTimeout(() => setSkipAnim(null), 600);
    revealControls();
  }, [revealControls]);

  /* volume */
  const handleVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    v.muted  = val === 0;
    setVolume(val);
    setMuted(val === 0);
    revealControls();
  };

  const toggleMute = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.muted || v.volume === 0) {
      v.muted = false;
      if (v.volume === 0) { v.volume = 0.8; setVolume(0.8); }
      setMuted(false);
    } else {
      v.muted = true;
      setMuted(true);
    }
    revealControls();
  }, [revealControls]);

  /* fullscreen */
  const toggleFullscreen = useCallback(() => {
    const c = containerRef.current as any;
    const v = videoRef.current as any;
    if (!c || !v) return;

    const doc = document as any;
    const isFull = doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement;

    if (!isFull) {
      const req = c.requestFullscreen || c.webkitRequestFullscreen || c.mozRequestFullScreen || c.msRequestFullscreen;
      if (req) {
        req.call(c).then(() => {
          (screen.orientation as any)?.lock?.('landscape').catch(() => {});
        }).catch(() => {});
      } else if (v.webkitEnterFullscreen) {
        v.webkitEnterFullscreen();
      }
    } else {
      const exit = doc.exitFullscreen || doc.webkitExitFullscreen || doc.mozCancelFullScreen || doc.msExitFullscreen;
      if (exit) {
        exit.call(doc).then(() => {
          (screen.orientation as any)?.unlock?.();
        }).catch(() => {});
      }
    }
  }, []);

  /* video element events */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onPlay = () => {
      setPlaying(true);
      scheduleHide();
    };
    const onPause = () => {
      setPlaying(false);
      clearTimeout(hideTimerRef.current);
      setControlsVisible(true);
    };
    const onEnded = () => {
      setPlaying(false);
      clearTimeout(hideTimerRef.current);
      setControlsVisible(true);
      onNext?.();
    };
    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    const onDuration   = () => { if (isFinite(v.duration)) setDuration(v.duration); };
    const onProgress   = () => {
      if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1));
    };
    const onWaiting    = () => setLoading(true);
    const onCanPlay    = () => setLoading(false);

    v.addEventListener("play",           onPlay);
    v.addEventListener("pause",          onPause);
    v.addEventListener("ended",          onEnded);
    v.addEventListener("timeupdate",     onTimeUpdate);
    v.addEventListener("durationchange", onDuration);
    v.addEventListener("loadedmetadata", onDuration);
    v.addEventListener("progress",       onProgress);
    v.addEventListener("waiting",        onWaiting);
    v.addEventListener("canplay",        onCanPlay);
    v.addEventListener("playing",        onCanPlay);

    return () => {
      v.removeEventListener("play",           onPlay);
      v.removeEventListener("pause",          onPause);
      v.removeEventListener("ended",          onEnded);
      v.removeEventListener("timeupdate",     onTimeUpdate);
      v.removeEventListener("durationchange", onDuration);
      v.removeEventListener("loadedmetadata", onDuration);
      v.removeEventListener("progress",       onProgress);
      v.removeEventListener("waiting",        onWaiting);
      v.removeEventListener("canplay",        onCanPlay);
      v.removeEventListener("playing",        onCanPlay);
    };
  }, [scheduleHide, onNext]);

  // Listen to watch now triggers to play in fullscreen
  useEffect(() => {
    const handleForcePlay = () => {
      setPlaying(true);
      const v = videoRef.current;
      if (v) {
        v.play().catch(() => {});
        const el = containerRef.current;
        const doc = document as any;
        const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
        if (el && !isFull) {
          const req = el.requestFullscreen || (el as any).webkitRequestFullscreen || (el as any).mozRequestFullScreen || (el as any).msRequestFullscreen;
          if (req) req.call(el).catch(() => {});
        }
      }
    };
    window.addEventListener('force-play-fullscreen', handleForcePlay);
    return () => window.removeEventListener('force-play-fullscreen', handleForcePlay);
  }, []);

  // Load source with HLS support
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    let hls: Hls | null = null;
    setLoading(true);

    const loadSource = async () => {
      // Check offline cache first!
      const offlineUrl = await getOfflineVideoUrl(contentId || "", episodeId);
      const activeSrc = offlineUrl || getImageUrl(currentSrc);

      if (!activeSrc) {
        setLoading(false);
        return;
      }

      // Local blobs are MP4, not HLS
      const isM3u8 = activeSrc.includes('.m3u8') && !offlineUrl;
      const onManifestParsed = () => {
        setLoading(false);
        if (pendingSeekRef.current !== null) {
          v.currentTime = pendingSeekRef.current;
          pendingSeekRef.current = null;
          resumeAppliedRef.current = true;
        }
        v.playbackRate = speed;
        const shouldPlay = playing || autoPlay;
        if (shouldPlay) {
          v.play().catch(() => {});
        }
      };

      if (isM3u8 && Hls.isSupported()) {
        hls = new Hls();
        hls.loadSource(activeSrc);
        hls.attachMedia(v);
        hls.on(Hls.Events.MANIFEST_PARSED, onManifestParsed);
      } else {
        v.src = activeSrc;
        v.load();
        const onCanPlay = () => {
          setLoading(false);
          if (pendingSeekRef.current !== null) {
            v.currentTime = pendingSeekRef.current;
            pendingSeekRef.current = null;
            resumeAppliedRef.current = true;
          }
          v.playbackRate = speed;
          const shouldPlay = playing || autoPlay;
          if (shouldPlay) {
            v.play().catch(() => {});
          }
          v.removeEventListener('canplay', onCanPlay);
        };
        v.addEventListener('canplay', onCanPlay);
      }
    };

    loadSource();

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [currentSrc, autoPlay, contentId, episodeId]);

  // Apply playback speed rate
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
  }, [currentSrc, speed]);

  /* set initial volume */
  useEffect(() => {
    const v = videoRef.current;
    if (v) v.volume = volume;
  }, []);

  /* fullscreen change */
  useEffect(() => {
    const onChange = () => {
      const doc = document as any;
      const isFull = !!(doc.fullscreenElement || doc.webkitFullscreenElement || doc.mozFullScreenElement || doc.msFullscreenElement);
      setIsFullscreen(isFull);
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    document.addEventListener("mozfullscreenchange", onChange);
    document.addEventListener("MSFullscreenChange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
      document.removeEventListener("mozfullscreenchange", onChange);
      document.removeEventListener("MSFullscreenChange", onChange);
    };
  }, []);

  /* keyboard shortcuts */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (document.activeElement as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      const v = videoRef.current;
      if (!v) return;
      switch (e.code) {
        case "Space":
          e.preventDefault(); togglePlay(); break;
        case "ArrowLeft":
          e.preventDefault(); skip(-10); break;
        case "ArrowRight":
          e.preventDefault(); skip(10); break;
        case "ArrowUp":
          e.preventDefault();
          v.volume = Math.min(1, parseFloat((v.volume + 0.1).toFixed(2)));
          v.muted = false; setVolume(v.volume); setMuted(false); revealControls(); break;
        case "ArrowDown":
          e.preventDefault();
          v.volume = Math.max(0, parseFloat((v.volume - 0.1).toFixed(2)));
          setVolume(v.volume); setMuted(v.volume === 0); revealControls(); break;
        case "KeyM": toggleMute(); break;
        case "KeyF": toggleFullscreen(); break;
        case "KeyN": onNext?.(); break;
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [togglePlay, toggleMute, toggleFullscreen, revealControls, onNext, skip]);

  useEffect(() => () => clearTimeout(hideTimerRef.current), []);

  const changeQuality = (key: string, url: string) => {
    const v = videoRef.current;
    if (!v) return;
    const time = v.currentTime;
    pendingSeekRef.current = time;
    setCurrentQuality(key);
    setCurrentSrc(getImageUrl(url));
  };

  /* derived */
  const seekPct    = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufPct     = duration > 0 ? (buffered   / duration) * 100 : 0;
  const displayVol = muted ? 0 : volume;
  const VolumeIcon = displayVol === 0 ? VolumeX : displayVol < 0.5 ? Volume1 : Volume2;
  const FsIcon     = isFullscreen ? Minimize : Maximize;
  const ctrlShow   = controlsVisible || !playing;

  const fmtTime = (sec: number) => {
    if (!isFinite(sec)) return "00:00";
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = Math.floor(sec % 60);
    if (h > 0) {
      return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    }
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  };

  return (
    <div
      ref={containerRef}
      className="relative bg-black overflow-hidden w-full h-full select-none"
      onMouseMove={revealControls}
      onMouseLeave={() => {
        if (playing) {
          clearTimeout(hideTimerRef.current);
          setControlsVisible(false);
        }
      }}
      onTouchStart={revealControls}
    >
      {/* Real video element */}
      <video
        ref={videoRef}
        poster={thumbnail}
        className="absolute inset-0 w-full h-full object-contain"
        preload="metadata"
        playsInline
        onClick={togglePlay}
        style={{ outline: "none" }}
        onLoadedMetadata={() => {
          const v = videoRef.current;
          if (!v) return;
          if (isFinite(v.duration)) setDuration(v.duration);
          if (pendingSeekRef.current !== null) {
            v.currentTime = pendingSeekRef.current;
            pendingSeekRef.current = null;
          }
          v.playbackRate = speed;
          const shouldPlay = playing || autoPlay;
          if (shouldPlay) {
            v.play().catch(() => {});
          }
        }}
      />

      {/* Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/25 pointer-events-none z-10" />

      {/* Buffering spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
        </div>
      )}

      {/* Skip flash */}
      {skipAnim && (
        <div
          className={`absolute inset-y-0 flex items-center justify-center pointer-events-none z-20
            ${skipAnim === "right" ? "left-auto right-[15%]" : "left-[15%] right-auto"}`}
        >
          <div className="flex flex-col items-center gap-1 animate-skip-pop">
            <div className="flex">
              {skipAnim === "right"
                ? [0,1,2].map(i => <ChevronRight key={i} className={`w-6 h-6 text-red-500 ${i===2?"opacity-100":i===1?"opacity-55":"opacity-20"}`} />)
                : [2,1,0].map(i => <ChevronRight key={i} className={`w-6 h-6 text-red-500 rotate-180 ${i===0?"opacity-100":i===1?"opacity-55":"opacity-20"}`} />)}
            </div>
            <span className="text-red-500 text-[10px] font-black">{skipAnim === "right" ? "+10s" : "-10s"}</span>
          </div>
        </div>
      )}

      {/* Center play/pause controls overlay */}
      <div
        className={`absolute inset-0 flex items-center justify-center z-20 transition-opacity duration-300 pointer-events-none ${
          ctrlShow ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="flex items-center gap-6 pointer-events-auto">
          {/* Skip back */}
          <button
            onClick={(e) => { e.stopPropagation(); skip(-10); }}
            className="w-11 h-11 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-black/60 transition-all duration-200 active:scale-90"
          >
            <RotateCcw className="w-4 h-4 text-foreground" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            className={`w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center shadow-lg hover:scale-105 transition-all duration-200 active:scale-95 ${
              loading ? "opacity-0 pointer-events-none scale-90" : "opacity-100"
            }`}
          >
            {playing
              ? <Pause className="w-6 h-6 text-foreground fill-white" />
              : <Play  className="w-6 h-6 text-foreground fill-white ml-1" />
            }
          </button>

          {/* Skip forward */}
          <button
            onClick={(e) => { e.stopPropagation(); skip(10); }}
            className="w-11 h-11 rounded-full bg-black/40 border border-white/10 flex items-center justify-center hover:bg-black/60 transition-all duration-200 active:scale-90"
          >
            <RotateCw className="w-4 h-4 text-foreground" />
          </button>
        </div>
      </div>

      {/* Bottom controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-20 transition-opacity duration-300 bg-gradient-to-t from-black/90 to-transparent pb-3 pt-6 ${
          ctrlShow ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
      >
        {/* Seek bar */}
        <div className="px-3">
          <div className="relative h-4 flex items-center group/seek cursor-pointer" onClick={(e) => e.stopPropagation()}>
            <div className="absolute inset-x-0 h-[3px] bg-white/20 rounded-full" />
            <div className="absolute h-[3px] bg-white/35 rounded-full" style={{ width: `${bufPct}%` }} />
            <div className="absolute h-[3px] bg-red-600 rounded-full" style={{ width: `${seekPct}%` }} />
            <div
              className="absolute w-3 h-3 bg-red-600 border border-white/50 rounded-full shadow-lg scale-0 group-hover/seek:scale-100 transition-transform -translate-x-1/2 pointer-events-none"
              style={{ left: `${seekPct}%` }}
            />
            <input
              type="range" min={0} max={duration || 100} step={0.1} value={currentTime}
              onChange={handleSeek} onMouseDown={revealControls}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          </div>
        </div>

        {/* Controls row */}
        <div className="px-3 mt-1 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Play/Pause */}
            <button onClick={togglePlay} className="text-foreground hover:text-red-500 transition-colors p-1">
              {playing ? <Pause className="w-[16px] h-[16px] fill-current" /> : <Play className="w-[16px] h-[16px] fill-current ml-px" />}
            </button>

            {/* Next episode */}
            {onNext && (
              <button
                onClick={onNext}
                className="text-foreground hover:text-red-500 p-1 transition-colors"
                title="Next Episode (N)"
              >
                <SkipForward className="w-[14px] h-[14px]" />
              </button>
            )}

            {/* Timestamp */}
            <span className="text-foreground text-[11px] tabular-nums select-none px-1">
              {fmtTime(currentTime)} / {fmtTime(duration)}
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {/* Volume */}
            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button onClick={toggleMute} className="text-foreground hover:text-red-500 transition-colors p-1" title="Mute (M)">
                <VolumeIcon className="w-[15px] h-[15px]" />
              </button>
              <div className="relative w-12 h-4 hidden sm:flex items-center">
                <div className="absolute inset-x-0 h-[2px] bg-white/20 rounded-full" />
                <div className="absolute h-[2px] bg-red-600 rounded-full" style={{ width: `${displayVol * 100}%` }} />
                <input
                  type="range" min={0} max={1} step={0.05} value={displayVol}
                  onChange={(e) => handleVolume(parseFloat(e.target.value))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
              </div>
            </div>

            {/* Settings Menu */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => {
                  setSettingsOpen(!settingsOpen);
                  setCurrentMenu("main");
                }}
                className={`text-foreground hover:text-red-500 transition-all duration-300 ${settingsOpen ? "text-red-500 rotate-45 scale-110" : ""}`}
              >
                <Settings className="w-[15px] h-[15px]" />
              </button>

              {settingsOpen && (
                <div className="absolute bottom-8 right-0 z-50 bg-[#0d0d16]/95 border border-white/10 backdrop-blur-md rounded-xl p-2.5 w-48 text-xs text-foreground shadow-2xl flex flex-col gap-1">
                  {currentMenu === "main" && (
                    <>
                      <div className="text-[9px] uppercase font-bold text-foreground tracking-wider px-1.5 pb-1 border-b border-white/5">Settings</div>
                      <button
                        onClick={() => setCurrentMenu("quality")}
                        className="flex items-center justify-between w-full px-1.5 py-1 rounded-lg hover:bg-white/10 text-left transition-colors"
                      >
                        <span>Quality</span>
                        <span className="text-[10px] text-foreground/80 flex items-center gap-0.5">
                          {videoSettings && videoSettings.find(q => q.key === currentQuality)?.label || "Auto"}
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </button>
                      <button
                        onClick={() => setCurrentMenu("speed")}
                        className="flex items-center justify-between w-full px-1.5 py-1 rounded-lg hover:bg-white/10 text-left transition-colors"
                      >
                        <span>Speed</span>
                        <span className="text-[10px] text-foreground/80 flex items-center gap-0.5">
                          {speed === 1.0 ? "Normal" : `${speed}x`}
                          <ChevronRight className="w-3 h-3" />
                        </span>
                      </button>
                    </>
                  )}

                  {currentMenu === "quality" && (
                    <>
                      <button
                        onClick={() => setCurrentMenu("main")}
                        className="flex items-center gap-0.5 w-full px-1.5 py-0.5 text-[10px] text-foreground/80 hover:text-foreground transition-colors mb-0.5 font-bold"
                      >
                        <ChevronLeft className="w-2.5 h-2.5" /> Back
                      </button>
                      <div className="text-[9px] uppercase font-bold text-foreground tracking-wider px-1.5 pb-1 border-b border-white/5">Quality</div>
                      <div className="max-h-32 overflow-y-auto mt-1 flex flex-col gap-0.5">
                        <button
                          onClick={() => {
                            const autoUrl = videoSettings?.find(q => q.key === 'auto')?.url || videoSrc;
                            changeQuality("auto", autoUrl);
                            setSettingsOpen(false);
                          }}
                          className="flex items-center justify-between w-full px-1.5 py-1 rounded-lg hover:bg-white/10 text-left transition-colors"
                        >
                          <span className={currentQuality === "auto" ? "text-red-500 font-bold" : "text-foreground"}>Auto</span>
                          {currentQuality === "auto" && <Check className="w-3 h-3 text-red-500" />}
                        </button>
                        {videoSettings && videoSettings.filter(q => q.key !== 'auto').map((q) => (
                          <button
                            key={q.key}
                            onClick={() => {
                              changeQuality(q.key, q.url);
                              setSettingsOpen(false);
                            }}
                            className="flex items-start justify-between w-full px-1.5 py-1 rounded-lg hover:bg-white/10 text-left transition-colors"
                          >
                            <div className="flex flex-col gap-0.5">
                              <span className={currentQuality === q.key ? "text-red-500 font-bold text-[11px]" : "text-foreground text-[11px]"}>{q.label}</span>
                              {q.description && <span className="text-foreground/80 text-[9px] leading-tight">{q.description}</span>}
                            </div>
                            {currentQuality === q.key && <Check className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />}
                          </button>
                        ))}

                      </div>
                    </>
                  )}

                  {currentMenu === "speed" && (
                    <>
                      <button
                        onClick={() => setCurrentMenu("main")}
                        className="flex items-center gap-0.5 w-full px-1.5 py-0.5 text-[10px] text-foreground/80 hover:text-foreground transition-colors mb-0.5 font-bold"
                      >
                        <ChevronLeft className="w-2.5 h-2.5" /> Back
                      </button>
                      <div className="text-[9px] uppercase font-bold text-foreground tracking-wider px-1.5 pb-1 border-b border-white/5">Speed</div>
                      <div className="flex flex-col gap-0.5 mt-1">
                        {[0.75, 1.0, 1.25, 1.5, 2.0].map((s) => (
                          <button
                            key={s}
                            onClick={() => {
                              setSpeed(s);
                              setSettingsOpen(false);
                            }}
                            className="flex items-center justify-between w-full px-1.5 py-1 rounded-lg hover:bg-white/10 text-left transition-colors"
                          >
                            <span className={speed === s ? "text-red-500 font-bold" : "text-foreground"}>{s === 1.0 ? "Normal" : `${s}x`}</span>
                            {speed === s && <Check className="w-3 h-3 text-red-500" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Fullscreen */}
            <button onClick={toggleFullscreen} className="text-foreground hover:text-red-500 transition-colors p-1">
              <FsIcon className="w-[15px] h-[15px]" />
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes skip-pop {
          0%   { opacity:1; transform:scale(1); }
          60%  { opacity:1; transform:scale(1.15); }
          100% { opacity:0; transform:scale(0.85); }
        }
        .animate-skip-pop { animation: skip-pop 0.6s ease forwards; }
      `}</style>
    </div>
  );
}

/* ─── EPISODE GRID ─────────────────────────────────────────── */
function EpisodeGrid({
  total, freeCount, currentEp, onSelect, onLocked, downloads, apiEpisodes, onDownloadToggle,
}: {
  total: number; freeCount: number; currentEp: number;
  onSelect: (ep: number) => void;
  onLocked?: (ep: number) => void;
  downloads?: any[];
  apiEpisodes?: any[];
  onDownloadToggle?: (ep: number) => void;
}) {
  const tabs: Array<{ label: string; start: number; end: number }> = [];
  for (let s = 0; s < total; s += 50) {
    tabs.push({ label: `${s} - ${Math.min(s + 49, total)}`, start: s, end: Math.min(s + 49, total) });
  }

  const defaultTab = currentEp <= 0 ? 0 : Math.floor((currentEp - 1) / 50);
  const [activeTab, setActiveTab] = useState(Math.min(defaultTab, tabs.length - 1));
  const tab = tabs[activeTab] ?? tabs[0];

  if (!tab) return null;

  const cells: Array<{ n: number; isTrailer: boolean }> = [];
  if (tab.start === 0) cells.push({ n: 0, isTrailer: true });
  for (let i = Math.max(1, tab.start); i <= tab.end; i++) cells.push({ n: i, isTrailer: false });

  return (
    <div>
      <div className="flex items-center gap-0 mb-3 border-b border-zinc-800">
        {tabs.map((t, i) => (
          <button
            key={t.label} onClick={() => setActiveTab(i)}
            className={[
              "text-xs sm:text-sm font-semibold px-3 py-2.5 border-b-2 -mb-px transition-colors whitespace-nowrap",
              activeTab === i ? "text-[#E50914] border-[#E50914]" : "text-foreground border-transparent hover:text-muted-foreground",
            ].join(" ")}
          >
            {t.label}
          </button>
        ))}
        <div className="flex-1" />
        <button className="flex items-center gap-0.5 text-foreground hover:text-foreground text-[11px] px-2 transition-colors whitespace-nowrap">
          All Episodes <ChevronRight className="w-3 h-3" />
        </button>
      </div>

      <div
        className="grid gap-1.5 max-h-[320px] overflow-y-auto pb-2"
        style={{ gridTemplateColumns: "repeat(6, minmax(0, 1fr))", scrollbarWidth: "thin", scrollbarColor: "#3f3f46 transparent" } as React.CSSProperties}
      >
        {cells.map(({ n, isTrailer }) => {
          const isLocked = !isTrailer && n > freeCount;
          const isActive = n === currentEp;

          // Determine download status for this episode/cell
          let isEpDownloaded = false;
          let epIdForCell = "";
          if (downloads) {
            if (isTrailer) {
              isEpDownloaded = downloads.some((d: any) => !d.episodeId);
            } else if (apiEpisodes) {
              const cellEp = apiEpisodes.find(
                (e: any) => e.episode === n || e.episodeNumber === n || e.number === n
              );
              epIdForCell = cellEp?.id || cellEp?._id;
              if (epIdForCell) {
                isEpDownloaded = downloads.some((d: any) => d.episodeId === epIdForCell);
              }
            }
          }

          return (
            <button
              key={n}
              onClick={() => isLocked ? onLocked?.(n) : onSelect(n)}
              title={isLocked ? "Unlock to watch" : isTrailer ? "Watch Trailer" : `Episode ${n}`}
              className={[
                "group relative h-11 flex items-center justify-center text-xs font-bold rounded-sm transition-all select-none",
                isActive  ? "bg-[#E50914] text-foreground shadow-[0_0_12px_rgba(229,9,20,0.4)]"
                : isLocked ? "bg-zinc-900 text-white/80 cursor-pointer hover:bg-zinc-800"
                           : "bg-zinc-800 hover:bg-zinc-700 text-foreground hover:text-foreground",
              ].join(" ")}
            >
              {isTrailer ? <span className="text-[9px] font-black leading-tight text-center px-0.5">Trailer</span> : n}

              {isLocked && (
                <span className="absolute top-0.5 right-0.5 w-[14px] h-[14px] bg-[#E50914] rounded-full flex items-center justify-center">
                  <Lock className="w-[7px] h-[7px] text-foreground" strokeWidth={3} />
                </span>
              )}

              {!isLocked && onDownloadToggle && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownloadToggle(n);
                  }}
                  title={isEpDownloaded ? "Remove download" : "Download episode"}
                  className={[
                    "absolute top-0.5 right-0.5 w-[14px] h-[14px] rounded-full flex items-center justify-center transition-all cursor-pointer",
                    isEpDownloaded
                      ? "bg-emerald-500 text-foreground"
                      : "bg-zinc-700/80 hover:bg-zinc-600 text-foreground opacity-0 group-hover:opacity-100 hover:scale-110",
                  ].join(" ")}
                >
                  {isEpDownloaded ? (
                    <Check className="w-[8px] h-[8px] text-foreground font-bold" strokeWidth={4} />
                  ) : (
                    <Download className="w-[8px] h-[8px]" strokeWidth={3} />
                  )}
                </span>
              )}

              {isActive && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-[2px] items-end">
                  {[4, 6, 4].map((h, i) => (
                    <span key={i} className="w-[3px] bg-white/80 rounded-full" style={{ height: `${h}px` }} />
                  ))}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   LOCK / PAYWALL POPUP
   ───────────────────────────────────────────────────────────── */

function LockPopup({ episodeNum, onClose, onSubscribed }: { episodeNum: number; onClose: () => void; onSubscribed: () => void }) {
  const { toast } = useToast();
  const { data: plansData, isLoading: loadingPlans } = useGetWebSubscriptionPlans();
  const createSubMutation = useCreateSubscription();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("appUser");
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (e) {}
  }, []);

  const plans = plansData?.data || [];

  const handleSubscribe = async (plan: any) => {
    if (!user) {
      toast({ title: "Authentication Required", description: "Please login first to subscribe.", variant: "destructive" });
      window.location.href = "/login";
      return;
    }
    try {
      await createSubMutation.mutateAsync({
        userId: user.id || user._id,
        planId: plan.id || plan._id,
        startDate: new Date(),
        price: plan.price || plan.totalPrice,
        totalAmount: plan.totalPrice || plan.price,
        paymentMethod: 'Credit Card',
        status: 'active'
      });

      const updatedUser = {
        ...user,
        subscriptionPlan: plan.name,
        subscriptionStatus: 'active'
      };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      toast({ title: "Subscription Successful", description: `Successfully subscribed to ${plan.name}! Content unlocked.` });
      onSubscribed();
      onClose();
    } catch (err: any) {
      toast({ title: "Subscription Failed", description: err?.message || "An error occurred.", variant: "destructive" });
    }
  };

  /* prevent body scroll while open */
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div
        className="relative z-10 bg-[#111111] w-full sm:max-w-[500px] sm:mx-4 rounded-t-2xl sm:rounded-2xl overflow-hidden border border-zinc-800 animate-in slide-in-from-bottom duration-300"
        style={{ maxHeight: "90vh", overflowY: "auto" } as React.CSSProperties}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-800 sticky top-0 bg-[#111111] z-10">
          <span className="text-foreground font-extrabold text-sm flex items-center gap-1.5">
            <Crown className="w-4 h-4 text-amber-500 fill-amber-500" /> Choose Subscription Plan
          </span>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center rounded-full bg-zinc-800 hover:bg-zinc-700 text-foreground/80 hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-foreground/80 text-xs text-center leading-relaxed">
            Episode {episodeNum} is locked. Subscribe to one of our premium plans to unlock the entire library!
          </p>

          {loadingPlans ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {plans.map((plan: any) => {
                if (plan.name === "free") return null;
                return (
                  <div
                    key={plan.id}
                    className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 hover:border-amber-500/50 hover:bg-zinc-900/80 transition-all flex flex-col justify-between"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="text-amber-400 font-bold text-sm uppercase tracking-wide">{plan.name}</h4>
                        <p className="text-foreground text-[11px] mt-0.5">{plan.description}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-foreground font-black text-lg">₹{plan.totalPrice || plan.price}</span>
                        <span className="text-foreground/80 text-[10px] block">/ {plan.duration || 'month'}</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-zinc-800 text-[11px] text-foreground/80">
                      <span>Valid: <strong className="text-foreground">{plan.durationValue} {plan.duration}</strong></span>
                      {plan.discount > 0 && <span className="text-amber-400 font-bold">{plan.discount}% off</span>}
                      <button
                        onClick={() => handleSubscribe(plan)}
                        disabled={createSubMutation.isPending}
                        className="px-4 py-1.5 bg-primary hover:bg-primary/90 disabled:bg-zinc-800 text-white font-bold rounded-lg transition-colors text-xs"
                      >
                        {createSubMutation.isPending ? "Connecting..." : "Subscribe"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   MAIN PAGE
   ───────────────────────────────────────────────────────────── */
export default function EpisodeDetailPage() {
  const params = useParams<{ showTitle: string; epNum: string }>();
  const [, navigate] = useLocation();

  const [user, setUser] = useState<any>(null);
  const [adDismissed, setAdDismissed] = useState(false);
  const [playerStarted, setPlayerStarted] = useState(false);

  const { data: adsData } = useGetPublicAds({ placement: "Player" });
  const activeAds: any[] = adsData?.data || [];
  const currentAd = !adDismissed && playerStarted && activeAds.length > 0 ? activeAds[0] : null;

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

  useEffect(() => {
    try {
      const appUserStr = localStorage.getItem("appUser");
      const userStr = localStorage.getItem("user");
      const parsedUser = appUserStr ? JSON.parse(appUserStr) : (userStr ? JSON.parse(userStr) : null);
      if (parsedUser) setUser(parsedUser);
      // Sync token key so API calls work for users who logged in via streaming-home
      if (!localStorage.getItem("appAccessToken") && localStorage.getItem("accessToken")) {
        localStorage.setItem("appAccessToken", localStorage.getItem("accessToken")!);
      }
    } catch (e) {}
  }, []);

  const handleSignOut = () => {
    localStorage.removeItem("appUser");
    localStorage.removeItem("appAccessToken");
    localStorage.removeItem("user");
    localStorage.removeItem("accessToken");
    setUser(null);
    window.location.reload();
  };

  const recordShareMutation = useRecordShare();

  // params.showTitle is the content ID (drama's _id / id from DB)
  const contentId = params.showTitle || "";

  const { data: detailData, isLoading } = useGetWebDetail(contentId);
  const showData = (detailData as any)?.content || detailData;
  const apiEpisodes: any[] = (detailData as any)?.episodes || [];
  const related: any[] = (detailData as any)?.related || [];

  const title = showData?.title || "Drama";

  const totalEps = apiEpisodes.length;
  const freeEps = apiEpisodes.filter((e: any) => e.isFree === true).length || Math.min(2, totalEps);

  const thumbUrl = showData
    ? getImageUrl(showData.bannerImage || showData.thumbnail || showData.poster || "")
    : "";

  const detail = {
    genre: Array.isArray(showData?.genres) ? showData.genres.join(" · ") : "Drama",
    tags: Array.isArray(showData?.genres) ? showData.genres as string[] : [] as string[],
    description: showData?.description || "",
    likes: showData?.likes || 0,
    favorites: 0,
    totalEpisodes: totalEps,
    freeEpisodes: freeEps,
    thumbnail: thumbUrl,
    rating: showData?.imdbRating ? String(showData.imdbRating) : "8.5",
  };

  const handleSubscribed = useCallback(() => {
    try {
      const appUserStr = localStorage.getItem("appUser");
      const userStr = localStorage.getItem("user");
      const parsedUser = appUserStr ? JSON.parse(appUserStr) : (userStr ? JSON.parse(userStr) : null);
      if (parsedUser) setUser(parsedUser);
    } catch (e) {}
  }, []);

  const [currentEp, setCurrentEp]       = useState(() => parseInt(params.epNum || "1", 10));
  const [autoPlay,  setAutoPlay]        = useState(false);
  const [expanded,  setExpanded]        = useState(false);
  const [lockPopupOpen, setLockPopupOpen] = useState(false);
  const [lockedEpNum,   setLockedEpNum]   = useState(0);

  const [selectedSeason, setSelectedSeason] = useState(1);
  const [seasonDropdownOpen, setSeasonDropdownOpen] = useState(false);

  const currentEpisode = (() => {
    if (currentEp === 0) return null;
    return apiEpisodes[currentEp - 1] || apiEpisodes[0];
  })();

  useEffect(() => {
    if (currentEpisode?.season) {
      setSelectedSeason(currentEpisode.season);
    }
  }, [currentEpisode]);

  // If this is a short drama, hand off to the dedicated 9:16 player
  useEffect(() => {
    if (showData?.contentType === 'drama') {
      navigate(`/drama/${contentId}/episode/${params.epNum || '1'}`);
    }
  }, [showData?.contentType, contentId, navigate, params.epNum]);

  const uniqueSeasons = Array.from(new Set(apiEpisodes.map((e: any) => e.season || 1))).sort((a: any, b: any) => a - b);

  const currentEpId = currentEpisode?.id || currentEpisode?._id;

  // Fetch saved watch position so the player can resume from where the user left off
  const { data: savedProgress } = useGetWatchProgress(contentId || undefined, currentEpId || undefined);

  const { data: profileData } = useGetAppProfile();
  const { toast } = useToast();

  const { data: wishlistData } = useGetWishlist({ limit: 100 });
  const wishlistItems: any[] = wishlistData?.items || [];
  const inWatchlist = wishlistItems.some((w: any) => w.id === contentId || w.contentId === contentId);
  const toggleWishlistMutation = useToggleWishlist();

  const isMovieOrSeries = currentEp === 0 || !currentEpId;

  const isLiked = isMovieOrSeries
    ? (profileData?.likeRecords?.some((l: any) => l.contentId === contentId && !l.episodeId) || false)
    : (profileData?.likeRecords?.some((l: any) => l.episodeId === currentEpId) || false);

  const toggleLikeMutation = useToggleLike();

  // Downloads — use web endpoint as single source of truth (cross-device consistent)
  const { data: downloadsData } = useGetDownloads({ limit: 200 });
  const downloadItems: any[] = Array.isArray(downloadsData) ? downloadsData : [];
  const downloadRecord = currentEp === 0
    ? downloadItems.find((d: any) => d.contentId === contentId && !d.episodeId)
    : downloadItems.find((d: any) => d.episodeId === currentEpId);
  const isDownloaded = !!downloadRecord;
  const requestDownloadMutation = useRequestDownload();
  const removeDownloadMutation = useRemoveDownload();
  const [dlProgress, setDlProgress] = useState<number | null>(null);

  const handleDownloadToggle = useCallback((epNum: number) => {
    if (!user) { navigate("/login"); return; }

    const isMovieOrSeries = epNum === 0 || apiEpisodes.length === 0;

    if (isMovieOrSeries) {
      const record = downloadItems.find((d: any) => d.contentId === contentId && !d.episodeId);
      if (record) {
        removeDownloadMutation.mutate(
          { id: record.id, contentId, episodeId: undefined },
          { onSuccess: async () => { await removeOfflineVideo(contentId); toast({ title: "Removed from downloads" }); } }
        );
      } else {
        const contentType = showData?.contentType === 'drama' ? 'drama' : showData?.contentType === 'series' ? 'series' : 'movie';
        requestDownloadMutation.mutate(
          { contentId, contentType },
          {
            onSuccess: async (data: any) => {
              const dlUrl = data?.data?.downloadUrl || data?.downloadUrl;
              if (dlUrl) {
                setDlProgress(0);
                const ok = await cacheDownloadedVideo(dlUrl, contentId, undefined, setDlProgress);
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
    } else {
      const epRecord = apiEpisodes.find(
        (e: any) => e.episode === epNum || e.episodeNumber === epNum || e.number === epNum
      );
      const epId = epRecord?.id || epRecord?._id;
      if (!epId) return;
      const record = downloadItems.find((d: any) => d.episodeId === epId);
      if (record) {
        removeDownloadMutation.mutate(
          { id: record.id, contentId, episodeId: epId },
          { onSuccess: async () => { await removeOfflineVideo(contentId, epId); toast({ title: "Removed from downloads" }); } }
        );
      } else {
        const contentType = showData?.contentType === 'drama' ? 'drama' : showData?.contentType === 'series' ? 'series' : 'movie';
        requestDownloadMutation.mutate(
          { contentId, contentType, episodeId: epId },
          {
            onSuccess: async (data: any) => {
              const dlUrl = data?.data?.downloadUrl || data?.downloadUrl;
              if (dlUrl) {
                setDlProgress(0);
                const ok = await cacheDownloadedVideo(dlUrl, contentId, epId, setDlProgress);
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
    }
  }, [user, navigate, downloadItems, contentId, showData, apiEpisodes, removeDownloadMutation, requestDownloadMutation, toast]);

  const getPlanLevel = (plan?: string) => {
    switch (plan?.toLowerCase()) {
      case "premium": return 3;
      case "standard": return 2;
      case "basic": return 1;
      default: return 0;
    }
  };

  // Use live profileData as source of truth for subscription (avoids stale localStorage)
  const liveStatus = profileData?.subscriptionStatus || user?.subscriptionStatus;
  const livePlan   = profileData?.subscriptionPlan   || user?.subscriptionPlan;
  const userPlan = liveStatus === "active" ? (livePlan || "free") : "free";
  const requiredPlan = showData?.planRequired || "free";
  const isLockedForContent = getPlanLevel(userPlan) < getPlanLevel(requiredPlan);

  const goToEpisode = useCallback((ep: number) => {
    const maxEp = detail.totalEpisodes === 0 ? 1 : detail.totalEpisodes;
    if (ep < 0 || ep > maxEp) return;
    const targetEp = apiEpisodes[ep - 1];
    
    let isLocked = false;
    if (ep !== 0) {
      if (detail.totalEpisodes === 0) {
        isLocked = (showData?.isPremium === true || requiredPlan !== "free") && isLockedForContent;
      } else {
        const isEpFree = targetEp ? targetEp.isFree : ep <= detail.freeEpisodes;
        isLocked = !isEpFree && isLockedForContent;
      }
    }
    
    if (isLocked) {
      setLockedEpNum(ep);
      setLockPopupOpen(true);
      return;
    }
    setCurrentEp(ep);
    setAutoPlay(true);
    navigate(`/show/${contentId}/episode/${ep}`);
  }, [contentId, detail.totalEpisodes, detail.freeEpisodes, navigate, isLockedForContent, requiredPlan, apiEpisodes, showData]);

  const handleNext = useCallback(() => {
    const next = currentEp + 1;
    // Use actual episode array length, not detail.totalEpisodes which may be 0 when loading
    const maxEp = apiEpisodes.length > 0 ? apiEpisodes.length : detail.totalEpisodes;
    if (next <= maxEp) {
      goToEpisode(next);
    }
  }, [currentEp, apiEpisodes.length, detail.totalEpisodes, goToEpisode]);

  const handleLocked = useCallback((ep: number) => {
    setLockedEpNum(ep);
    setLockPopupOpen(true);
  }, []);

  const isMovieContent = showData?.contentType === 'movie' || apiEpisodes.length === 0;
  
  const epLabel   = isMovieContent ? "Movie" : currentEp === 0 ? "Trailer" : `Episode ${currentEp}`;
  const epTitle   = isMovieContent ? title : currentEp === 0 ? `Trailer - ${title}` : `Episode ${currentEp} - ${title}`;
  const plotTitle = isMovieContent ? "Plot Synopsis" : currentEp === 0 ? "About Trailer" : `Plot of Episode ${currentEp}`;

  const videoSrc = (() => {
    // Movie: no episodes → play the movie's own HLS/video URL
    if (apiEpisodes.length === 0) {
      if (currentEp === 0 && showData?.trailerUrl) return showData.trailerUrl;
      return showData?.hlsUrl || showData?.videoUrl || showData?.sourceVideoUrl || "";
    }
    if (currentEp === 0) return showData?.trailerUrl || showData?.hlsUrl || "";
    const ep = currentEpisode;
    // Fall back to content-level hlsUrl when episode record doesn't exist yet
    return ep?.sourceVideoUrl || ep?.videoUrl || ep?.hlsUrl || (currentEp === 1 ? (showData?.hlsUrl || showData?.videoUrl || "") : "");
  })();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-10 h-10 text-[#E50914] animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#09090b] text-foreground">
      <PublicHeader
        activeTab={
          showData?.contentType === "movie"
            ? "movies"
            : showData?.contentType === "series"
            ? "tvshows"
            : "drama"
        }
        setActiveTab={(tab) => {
          if (tab === "home") navigate("/");
          else if (tab === "tvshows") navigate("/tv-shows-browse");
          else navigate(`/browse/${tab}`);
        }}
        onSignIn={() => navigate("/login")}
        onSignOut={handleSignOut}
        user={user}
      />

      <main className="pt-[68px] pb-16 bg-[#09090b] text-foreground">
        <div className="max-w-[1280px] mx-auto px-4 sm:px-6 lg:px-8">

          {/* Back button row */}
          <div className="pt-4 pb-4">
            <button
              onClick={() => window.history.back()}
              className="flex items-center gap-1.5 text-foreground/80 hover:text-foreground text-sm font-semibold transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          </div>

          {/* Player Container */}
          <div
            key={`${title}-ep-${currentEp}`}
            className="relative overflow-hidden bg-black shadow-2xl rounded-2xl border border-zinc-900 mb-8"
            style={{ aspectRatio: "16 / 9" }}
            onClick={() => !playerStarted && setPlayerStarted(true)}
          >
            <VideoPlayer
              videoSrc={videoSrc}
              thumbnail={detail.thumbnail}
              autoPlay={autoPlay}
              onNext={() => { setAdDismissed(false); setPlayerStarted(false); handleNext(); }}
              videoSettings={currentEpisode?.videoSettings || showData?.videoSettings}
              contentId={contentId}
              episodeId={currentEpisode?.id || currentEpisode?._id}
              resumeFrom={savedProgress?.progressPercent && savedProgress.progressPercent < 95 ? savedProgress.progressSeconds : undefined}
              contentType={showData?.contentType}
            />
            {currentAd && <AdOverlay ad={currentAd} onSkip={() => setAdDismissed(true)} />}

            {/* ── PRE-ROLL AD OVERLAY (page-level scope, correct showPreroll access) ── */}
            {showPreroll && (
              <div className="absolute inset-0 z-[400] rounded-2xl overflow-hidden">
                <PlayerPrerollAd onFinished={() => setShowPreroll(false)} />
              </div>
            )}
          </div>

          {/* Details and Content Blocks */}
          <div className="space-y-6">
            
            {/* 1. Main Info Block */}
            <div className="bg-zinc-900/20 border border-zinc-900/50 rounded-2xl p-5 sm:p-6 shadow-md">
              {/* Breadcrumb */}
              <nav className="flex items-center flex-wrap gap-1 text-xs text-muted-foreground mb-3 select-none">
                <button onClick={() => navigate("/")} className="flex items-center gap-1 hover:text-foreground transition-colors">
                  <Home className="w-3.5 h-3.5" /> Home
                </button>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <button onClick={() => window.history.back()} className="hover:text-foreground transition-colors truncate max-w-[180px]">
                  {title}
                </button>
                <ChevronRight className="w-3 h-3 flex-shrink-0" />
                <span className="text-foreground/70">{epLabel}</span>
              </nav>

              {/* Title */}
              <h1 className="text-foreground font-black text-xl sm:text-2xl lg:text-3xl leading-tight mb-4">
                {epTitle}
              </h1>

              {/* Plot */}
              <div className="mb-5">
                <h2 className="text-foreground font-bold text-sm mb-2">{plotTitle}</h2>
                <p className="text-foreground/80 text-sm leading-relaxed">
                  {expanded ? detail.description : `${detail.description.slice(0, 130)}...`}
                  {" "}
                  <button
                    onClick={() => setExpanded(e => !e)}
                    className="text-[#E50914] hover:text-primary font-semibold transition-colors"
                  >
                    {expanded ? "Less" : "More"}
                  </button>
                </p>
              </div>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-5">
                {detail.tags.map(tag => (
                  <button key={tag} className="px-3 py-1.5 text-xs rounded-full border border-zinc-800 text-muted-foreground hover:text-foreground hover:border-zinc-500 transition-all bg-zinc-950/30">
                    {tag}
                  </button>
                ))}
              </div>

              {/* Actions: Like / Watchlist / Download / Share */}
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap mb-6">
                {/* Like Button */}
                <button
                  onClick={() => {
                    if (!user) { navigate("/login"); return; }
                    const contentType = (showData?.contentType === 'drama' ? 'drama' : showData?.contentType === 'series' ? 'show' : 'movie') as 'show' | 'movie' | 'drama';
                    const payload = isMovieOrSeries
                      ? { contentId, contentType }
                      : { contentId, contentType, episodeId: currentEpId };
                    toggleLikeMutation.mutate(payload, {
                      onSuccess: (data: any) => toast({ title: data?.data?.isLikedByUser ? "Liked!" : "Like removed" }),
                      onError: () => toast({ title: "Failed to update like", variant: "destructive" }),
                    });
                  }}
                  disabled={toggleLikeMutation.isPending}
                  className={`flex flex-col items-center gap-1 px-4 py-2 transition-all active:scale-95 ${
                    isLiked ? "text-[#E50914]" : "text-foreground/80 hover:text-foreground"
                  }`}
                >
                  {toggleLikeMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Heart className={`w-5 h-5 ${isLiked ? "fill-[#E50914]" : ""}`} />
                  )}
                  <span className="text-[11px] font-semibold mt-0.5">{fmtCount(detail.likes + (isLiked ? 1 : 0))} Likes</span>
                </button>

                {/* Watchlist Button */}
                <button
                  onClick={() => {
                    if (!user) { navigate("/login"); return; }
                    toggleWishlistMutation.mutate(
                      { contentId, contentType: (showData?.contentType || "show") as "movie" | "show" | "drama" },
                      {
                        onSuccess: (data: any) => {
                          toast({
                            title: data?.message || (inWatchlist ? "Removed from Watchlist" : "Added to Watchlist"),
                          });
                        },
                      }
                    );
                  }}
                  disabled={toggleWishlistMutation.isPending}
                  className={`flex flex-col items-center gap-1 px-4 py-2 transition-all active:scale-95 ${
                    inWatchlist ? "text-[#E50914]" : "text-foreground/80 hover:text-foreground"
                  }`}
                >
                  {toggleWishlistMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <Plus className={`w-5 h-5 ${inWatchlist ? "rotate-45 text-[#E50914]" : ""}`} />
                  )}
                  <span className="text-[11px] font-semibold mt-0.5">
                    {inWatchlist ? "Wishlisted" : "Watchlist"}
                  </span>
                </button>

                {/* Download Button */}
                <button
                  onClick={() => handleDownloadToggle(currentEp)}
                  disabled={requestDownloadMutation.isPending || removeDownloadMutation.isPending}
                  className="flex flex-col items-center gap-1 px-4 py-2 text-foreground/80 hover:text-foreground transition-all active:scale-95 disabled:opacity-70"
                >
                  {requestDownloadMutation.isPending || removeDownloadMutation.isPending ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : isDownloaded ? (
                    <Check className="w-5 h-5 text-emerald-400" strokeWidth={3} />
                  ) : (
                    <Download className="w-5 h-5" />
                  )}
                  <span className="text-[11px] font-semibold mt-0.5">
                    {isDownloaded ? "Downloaded" : "Download"}
                  </span>
                </button>
              </div>

              {/* Cast & Crew Section */}
              {((showData?.cast && showData.cast.length > 0) || (showData?.crew && showData.crew.length > 0) || (showData?.crewMembers && showData.crewMembers.length > 0)) && (
                <div className="border-t border-zinc-900/80 pt-5 mt-5">
                  <h3 className="text-foreground font-bold text-sm mb-3">Cast & Crew</h3>
                  <div
                    className="flex gap-5 overflow-x-auto pb-2"
                    style={{ scrollbarWidth: "none" } as React.CSSProperties}
                  >
                    {showData.cast?.map((c: any) => (
                      <div key={`cast-${c.id}-${c.character}`} className="flex flex-col items-center text-center w-20 flex-shrink-0 group">
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-zinc-800 bg-zinc-900 flex-shrink-0 group-hover:border-primary transition-all duration-300 shadow-md">
                          <img
                            src={getImageUrl(c.image || "")}
                            alt={c.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(c.name)}`;
                            }}
                          />
                        </div>
                        <h4 className="text-foreground font-semibold text-[10px] sm:text-xs mt-2 line-clamp-1 group-hover:text-foreground transition-colors">{c.name}</h4>
                        <p className="text-foreground/80 text-[9px] sm:text-[10px] mt-0.5 line-clamp-1 font-semibold">{c.character || c.role || 'Cast'}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* 2. Episodes Grid Section */}
            {apiEpisodes.length > 0 && (
              <div className="bg-zinc-900/20 border border-zinc-900/50 rounded-2xl p-5 sm:p-6 shadow-md">
                
                {/* Header with Season Dropdown */}
                <div className="flex items-center justify-between gap-4 mb-6 border-b border-zinc-900/80 pb-4">
                  <h3 className="text-foreground font-bold text-base sm:text-lg">Episodes</h3>
                  
                  {uniqueSeasons.length > 1 && (
                    <div className="relative">
                      <button
                        onClick={() => setSeasonDropdownOpen(o => !o)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-foreground rounded-lg text-xs font-bold hover:bg-zinc-900 hover:border-zinc-700 transition-all duration-200"
                      >
                        <span>Season {selectedSeason}</span>
                        <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${seasonDropdownOpen ? "rotate-90" : ""}`} />
                      </button>
                      {seasonDropdownOpen && (
                        <div className="absolute right-0 mt-2 w-40 bg-[#18181b] border border-zinc-800 rounded-xl shadow-2xl z-30 py-1 animate-in fade-in slide-in-from-top-2 duration-200">
                          {uniqueSeasons.map((seasonNum) => (
                            <button
                              key={seasonNum}
                              onClick={() => {
                                setSelectedSeason(seasonNum);
                                setSeasonDropdownOpen(false);
                              }}
                              className={`w-full px-3 py-2 text-left text-xs font-bold transition-colors ${
                                selectedSeason === seasonNum
                                  ? "text-red-500 bg-red-500/10"
                                  : "text-foreground hover:text-foreground hover:bg-zinc-800"
                              }`}
                            >
                                Season {seasonNum}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Episodes grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {apiEpisodes
                    .map((ep, idx) => ({ ...ep, globalIndex: idx + 1 }))
                    .filter((ep) => (ep.season || 1) === selectedSeason)
                    .map((ep) => {
                      const isActive = ep.globalIndex === currentEp;
                      const isLocked = !ep.isFree && isLockedForContent;
                      const isEpDownloaded = profileData?.downloads?.some((d: any) => d.episodeId === (ep.id || ep._id));

                      return (
                        <div
                          key={ep.id || ep._id}
                          className={`flex gap-4 p-3 rounded-xl border transition-all duration-300 group/ep ${
                            isActive
                              ? "bg-red-500/5 border-red-500/40"
                              : "bg-zinc-950/40 border-zinc-800/80 hover:bg-zinc-900/80 hover:border-zinc-700"
                          }`}
                        >
                          {/* Left: Thumbnail */}
                          <div
                            onClick={() => isLocked ? handleLocked(ep.globalIndex) : goToEpisode(ep.globalIndex)}
                            className="relative w-28 sm:w-36 aspect-video rounded-lg overflow-hidden bg-zinc-950 flex-shrink-0 cursor-pointer"
                          >
                            <img
                              src={getImageUrl(ep.thumbnail || showData?.thumbnail || "")}
                              alt={ep.title}
                              className="w-full h-full object-cover group-hover/ep:scale-105 transition-transform duration-300"
                            />
                            <div className="absolute inset-0 bg-black/45 group-hover/ep:bg-black/30 transition-all flex items-center justify-center">
                              {isLocked ? (
                                <div className="w-8 h-8 rounded-full bg-red-600/90 flex items-center justify-center shadow-lg">
                                  <Lock className="w-3.5 h-3.5 text-foreground" strokeWidth={3} />
                                </div>
                              ) : (
                                <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center shadow-lg transform scale-90 group-hover/ep:scale-100 transition-all opacity-0 group-hover/ep:opacity-100">
                                  <Play className="w-3.5 h-3.5 text-foreground fill-white ml-0.5" />
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Right: Info */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                            <div>
                              <div className="flex items-start justify-between gap-3">
                                <h4
                                  onClick={() => isLocked ? handleLocked(ep.globalIndex) : goToEpisode(ep.globalIndex)}
                                  className={`font-bold text-xs sm:text-sm cursor-pointer line-clamp-1 transition-colors ${
                                    isActive ? "text-red-500" : "text-foreground group-hover/ep:text-red-500"
                                  }`}
                                >
                                  {ep.episode || ep.episodeNumber || ep.number}. {ep.title}
                                </h4>
                                {!isLocked && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadToggle(ep.globalIndex);
                                    }}
                                    title={isEpDownloaded ? "Remove download" : "Download episode"}
                                    className={`p-1.5 rounded-full transition-all flex-shrink-0 ${
                                      isEpDownloaded
                                        ? "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30"
                                        : "bg-zinc-800 text-foreground/80 hover:bg-zinc-700 hover:text-foreground"
                                    }`}
                                  >
                                    {isEpDownloaded ? (
                                      <Check className="w-3.5 h-3.5" strokeWidth={3} />
                                    ) : (
                                      <Download className="w-3.5 h-3.5" />
                                    )}
                                  </button>
                                )}
                              </div>
                              <p className="text-[10px] sm:text-xs text-foreground/70 mt-0.5 font-semibold">
                                {ep.duration ? `${Math.round(ep.duration / 60)} min` : "45 min"}
                              </p>
                              <p className="text-[11px] sm:text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                                {ep.description || "No description available."}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </div>

          {/* 3. RELATED CONTENT SECTION */}
          {related && related.length > 0 && (
            <div className="px-4 sm:px-6 lg:px-10 mt-12 border-t border-zinc-900 pt-10">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-1 h-6 rounded-full flex-shrink-0" style={{ background: "#e50914" }} />
                <h2 className="text-foreground font-black text-lg sm:text-xl tracking-tight">More Like This</h2>
                <div className="flex-1" />
                {detail.tags.length > 0 && (
                  <button
                    onClick={() => {
                      const firstGenre = detail.tags[0];
                      const contentType = showData?.contentType === 'movie' ? 'movie' : 'show';
                      window.open(`/browse/${contentType}?genre=${encodeURIComponent(firstGenre)}`, "_blank");
                    }}
                    className="text-foreground hover:text-primary text-xs transition-colors flex items-center gap-0.5 font-semibold"
                  >
                    See all <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <div
                className="flex gap-4 overflow-x-auto pb-2"
                style={{ scrollbarWidth: "none" } as React.CSSProperties}
              >
                {related.map((r: any) => (
                  <PortraitCard key={r.id || r._id} item={r} onClick={() => navigate(r.type === 'movie' || r.contentType === 'movie' ? `/movie/${r.id || r._id}` : `/show/${r.id || r._id}/episode/1`)} />
                ))}
              </div>
            </div>
          )}

          {/* Experience Reviews & Ratings Section */}
          <div className="px-4 sm:px-6 lg:px-10 mt-12 border-t border-zinc-900 pt-10">
            <WebsiteReviews 
              user={user} 
              onSignInRequired={() => navigate("/login")} 
            />
          </div>
        </div>
      </main>

      <PublicFooter />

      {lockPopupOpen && (
        <LockPopup
          episodeNum={lockedEpNum}
          onClose={() => setLockPopupOpen(false)}
          onSubscribed={handleSubscribed}
        />
      )}
    </div>
  );
}
