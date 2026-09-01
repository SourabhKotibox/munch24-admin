import { useState, useRef, useEffect, useCallback } from "react";
import {
  Play, Pause, Volume2, VolumeX, Maximize, Minimize,
  SkipBack, SkipForward, Settings, X, Smartphone, Monitor,
  RotateCcw, RotateCw, ChevronRight, FastForward, Circle,
} from "lucide-react";
import Hls from "hls.js";
import { useAdPlayback } from "@/hooks/useAdPlayback";
import AdOverlay from "@/components/AdOverlay";

export interface VideoQuality {
  label: string;
  src: string;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  subtitle?: string;
  onClose?: () => void;
  defaultOrientation?: "landscape" | "portrait";
  contentId?: string;
  videoQualities?: VideoQuality[];
  isTvShow?: boolean;
  nextEpisodeTitle?: string;
  nextEpisodePoster?: string;
  onNextEpisode?: () => void;
}

function formatTime(sec: number): string {
  if (!isFinite(sec)) return "0:00";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];
const PROGRESS_KEY = (id: string) => `xoto-watch-progress-${id}`;

export default function VideoPlayer({
  src,
  poster,
  title,
  subtitle,
  onClose,
  defaultOrientation = "landscape",
  contentId,
  videoQualities,
  isTvShow,
  nextEpisodeTitle,
  nextEpisodePoster,
  onNextEpisode,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const seekRef = useRef<HTMLInputElement>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();
  const progressSaveTimer = useRef<ReturnType<typeof setInterval>>();

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [loading, setLoading] = useState(true);
  const [orientation, setOrientation] = useState<"landscape" | "portrait">(defaultOrientation);
  const [showSkipAnim, setShowSkipAnim] = useState<"left" | "right" | null>(null);
  const [currentSrc, setCurrentSrc] = useState(src);

  useEffect(() => {
    setCurrentSrc(src);
  }, [src]);

  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [resumeTime, setResumeTime] = useState(0);
  const [showNextUp, setShowNextUp] = useState(false);

  const handleAdComplete = useCallback(() => {
    const v = videoRef.current;
    if (v) {
      v.play().catch(() => {});
      setPlaying(true);
    }
  }, []);

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

  // Initialize: check resume and start pre-roll
  useEffect(() => {
    if (contentId) {
      try {
        const saved = localStorage.getItem(PROGRESS_KEY(contentId));
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.currentTime && parsed.duration && parsed.duration > 10) {
            const timeLeft = parsed.duration - parsed.currentTime;
            if (timeLeft > 5) {
              setResumeTime(parsed.currentTime);
              setShowResumePrompt(true);
              return; // don't start ad yet
            }
          }
        }
      } catch {}
    }
    // Start pre-roll ad if no resume prompt
    startAd('preroll');
  }, [contentId, startAd]);

  const handleResume = (resume: boolean) => {
    setShowResumePrompt(false);
    const v = videoRef.current;
    if (v && resume) {
      v.currentTime = resumeTime;
      setCurrentTime(resumeTime);
      setProgress(duration ? (resumeTime / duration) * 100 : 0);
    }
    startAd('preroll');
  };

  const resetHideTimer = useCallback(() => {
    clearTimeout(hideTimer.current);
    setShowControls(true);
    hideTimer.current = setTimeout(() => {
      if (playing) setShowControls(false);
    }, 3000);
  }, [playing]);

  useEffect(() => () => clearTimeout(hideTimer.current), []);

  // HLS / MP4 setup
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !currentSrc) return;

    let hls: Hls | null = null;
    const isM3u8 = currentSrc.includes('.m3u8');

    setLoading(true);

    if (isM3u8 && Hls.isSupported()) {
      hls = new Hls();
      hls.loadSource(currentSrc);
      hls.attachMedia(v);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        console.error('HLS error', data);
      });
    } else {
      v.src = currentSrc;
      v.load();
      setLoading(false);
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
    };
  }, [currentSrc]);

  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v || adIsActive) return;
    if (v.paused) { v.play(); setPlaying(true); }
    else { v.pause(); setPlaying(false); }
    resetHideTimer();
  }, [resetHideTimer, adIsActive]);

  const skip = useCallback((sec: number) => {
    const v = videoRef.current;
    if (!v || adIsActive) return;
    v.currentTime = Math.max(0, Math.min(v.duration, v.currentTime + sec));
    setShowSkipAnim(sec > 0 ? "right" : "left");
    setTimeout(() => setShowSkipAnim(null), 700);
    resetHideTimer();
  }, [resetHideTimer, adIsActive]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === "INPUT") return;
      switch (e.key) {
        case " ": case "k": e.preventDefault(); togglePlay(); break;
        case "f": toggleFullscreen(); break;
        case "m": toggleMute(); break;
        case "ArrowRight": skip(10); break;
        case "ArrowLeft": skip(-10); break;
        case "ArrowUp": e.preventDefault(); changeVolume(Math.min(1, volume + 0.1)); break;
        case "ArrowDown": e.preventDefault(); changeVolume(Math.max(0, volume - 0.1)); break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePlay, skip, volume]);

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const changeVolume = (val: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.volume = val;
    setVolume(val);
    if (val === 0) { v.muted = true; setMuted(true); }
    else { v.muted = false; setMuted(false); }
  };

  const toggleFullscreen = async () => {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen().catch(() => {});
      setFullscreen(true);
    } else {
      await document.exitFullscreen().catch(() => {});
      setFullscreen(false);
    }
  };

  useEffect(() => {
    const onFsChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v || !duration) return;
    const val = parseFloat(e.target.value);
    v.currentTime = (val / 100) * duration;
    setProgress(val);
    resetHideTimer();
  };

  const changeSpeed = (s: number) => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = s;
    setSpeed(s);
    setShowSettings(false);
  };

  const changeQuality = (quality: VideoQuality) => {
    const v = videoRef.current;
    if (!v) return;
    const current = v.currentTime;
    const wasPlaying = !v.paused;
    setCurrentSrc(quality.src);
    // after src change, restore time and play state
    setTimeout(() => {
      if (videoRef.current) {
        videoRef.current.currentTime = current;
        if (wasPlaying) videoRef.current.play().catch(() => {});
      }
    }, 100);
    setShowQualityMenu(false);
    setShowSettings(false);
  };

  // Save watch progress every 5 seconds
  useEffect(() => {
    if (!contentId || adIsActive) return;
    progressSaveTimer.current = setInterval(() => {
      const v = videoRef.current;
      if (v && v.currentTime && v.duration) {
        localStorage.setItem(PROGRESS_KEY(contentId), JSON.stringify({
          currentTime: v.currentTime,
          duration: v.duration,
          updatedAt: new Date().toISOString(),
        }));
      }
    }, 5000);
    return () => {
      if (progressSaveTimer.current) clearInterval(progressSaveTimer.current);
    };
  }, [contentId, adIsActive]);

  // Next Up preview in last 30 seconds
  useEffect(() => {
    if (!isTvShow || !onNextEpisode) return;
    if (duration > 0 && duration - currentTime <= 30 && currentTime > 0 && currentTime < duration - 1) {
      if (!showNextUp) {
        setShowNextUp(true);
      }
    } else if (currentTime < duration - 30 || currentTime >= duration - 1) {
      if (showNextUp) {
        setShowNextUp(false);
      }
    }
  }, [currentTime, duration, isTvShow, onNextEpisode, showNextUp]);

  const cancelNextUp = () => setShowNextUp(false);

  const aspectRatio = orientation === "landscape" ? "16/9" : "9/16";
  const maxWidth = orientation === "landscape" ? "min(100vw, 960px)" : "min(100vw, 360px)";
  const allQualities = videoQualities?.length ? videoQualities : [{ label: 'Auto', src }];
  const currentQualityLabel = allQualities.find(q => q.src === currentSrc)?.label || 'Auto';

  return (
    <div
      className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={containerRef}
        className="relative bg-black overflow-hidden shadow-2xl"
        style={{ width: maxWidth, aspectRatio, maxHeight: "100vh" }}
        onMouseMove={resetHideTimer}
        onClick={(e) => { if (e.currentTarget === e.target) togglePlay(); }}
      >
        {/* Video */}
        <video
          ref={videoRef}
          poster={poster}
          className="w-full h-full object-contain"
          onLoadedMetadata={() => {
            const v = videoRef.current;
            if (!v) return;
            setDuration(v.duration || 0);
            setLoading(false);
          }}
          onTimeUpdate={() => {
            const v = videoRef.current;
            if (!v) return;
            setCurrentTime(v.currentTime);
            setProgress(duration ? (v.currentTime / duration) * 100 : 0);
          }}
          onWaiting={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          onEnded={() => {
            setPlaying(false);
          }}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onClick={togglePlay}
        />

        {/* Ad Overlay */}
        {adIsActive && (
          <AdOverlay
            timer={adTimer}
            canSkip={adCanSkip}
            onSkip={skipAd}
            label="Advertisement"
          />
        )}

        {/* Resume Prompt */}
        {showResumePrompt && (
          <div className="absolute inset-0 z-[350] bg-black/80 flex items-center justify-center">
            <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 max-w-sm mx-4 text-center">
              <p className="text-foreground font-bold text-lg mb-1">Resume Watching?</p>
              <p className="text-foreground/70 text-sm mb-5">
                You left off at {formatTime(resumeTime)}. Continue from there?
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => handleResume(true)}
                  className="flex-1 py-2.5 bg-primary hover:bg-primary/90 text-white font-bold rounded-xl text-sm transition-all"
                >
                  Resume
                </button>
                <button
                  onClick={() => handleResume(false)}
                  className="flex-1 py-2.5 bg-zinc-800 hover:bg-zinc-700 text-foreground font-bold rounded-xl text-sm transition-all"
                >
                  Start Over
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Next Up Preview */}
        {showNextUp && isTvShow && onNextEpisode && (
          <div className="absolute inset-0 z-[350] bg-black/60 flex items-end justify-end p-6">
            <div className="bg-zinc-900/90 backdrop-blur-md border border-zinc-700 rounded-2xl p-4 max-w-xs w-full shadow-2xl">
              <p className="text-foreground/70 text-[10px] uppercase tracking-widest font-bold mb-2">Next Up</p>
              {nextEpisodePoster && (
                <img src={nextEpisodePoster} alt="" className="w-full rounded-lg mb-3 object-cover" style={{ aspectRatio: '16/9' }} />
              )}
              <p className="text-foreground font-bold text-sm truncate">{nextEpisodeTitle || 'Next Episode'}</p>
              <div className="flex items-center gap-2 mt-3">
                <button
                  onClick={() => { setShowNextUp(false); onNextEpisode(); }}
                  className="flex-1 py-2 bg-primary hover:bg-primary/90 text-white font-bold rounded-lg text-xs transition-all"
                >
                  Play Next
                </button>
                <button
                  onClick={() => setShowNextUp(false)}
                  className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 text-foreground font-bold rounded-lg text-xs transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && !adIsActive && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-14 h-14 rounded-full border-4 border-white/20 border-t-white animate-spin" />
          </div>
        )}

        {/* Skip Animation */}
        {showSkipAnim && (
          <div className={`absolute inset-y-0 flex items-center justify-center pointer-events-none ${showSkipAnim === "right" ? "right-12 left-auto" : "left-12 right-auto"}`}>
            <div className="flex flex-col items-center gap-1 animate-fade-out">
              <div className="flex">
                {showSkipAnim === "right"
                  ? [0,1,2].map(i => <ChevronRight key={i} className={`w-8 h-8 text-foreground ${i === 2 ? "opacity-100" : i === 1 ? "opacity-60" : "opacity-30"}`} />)
                  : [2,1,0].map(i => <ChevronRight key={i} className={`w-8 h-8 text-foreground rotate-180 ${i === 0 ? "opacity-100" : i === 1 ? "opacity-60" : "opacity-30"}`} />)
                }
              </div>
              <span className="text-foreground text-xs font-medium">{showSkipAnim === "right" ? "+10s" : "-10s"}</span>
            </div>
          </div>
        )}

        {/* Controls Overlay */}
        <div
          className={`absolute inset-0 flex flex-col justify-between transition-opacity duration-300 ${showControls || !playing ? "opacity-100" : "opacity-0 pointer-events-none"}`}
          style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.7) 0%, transparent 25%, transparent 65%, rgba(0,0,0,0.9) 100%)" }}
        >
          {/* Top Bar */}
          <div className="flex items-center justify-between px-4 pt-4">
            <div className="flex-1 min-w-0">
              {title && <p className="text-foreground font-bold text-base truncate drop-shadow">{title}</p>}
              {subtitle && <p className="text-foreground/70 text-xs truncate">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/70 text-white transition-colors ml-3 flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Center Play Button */}
          <div className="flex items-center justify-center gap-10 pointer-events-none select-none">
            <button
              className="pointer-events-auto w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-foreground transition-all active:scale-90"
              onClick={(e) => { e.stopPropagation(); skip(-10); }}
            >
              <RotateCcw className="w-5 h-5" />
            </button>
            <button
              className="pointer-events-auto w-16 h-16 flex items-center justify-center rounded-full bg-white/90 hover:bg-white text-black transition-all active:scale-90 shadow-2xl"
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
            >
              {playing ? <Pause className="w-7 h-7 fill-black" /> : <Play className="w-7 h-7 fill-black ml-1" />}
            </button>
            <button
              className="pointer-events-auto w-12 h-12 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-foreground transition-all active:scale-90"
              onClick={(e) => { e.stopPropagation(); skip(10); }}
            >
              <RotateCw className="w-5 h-5" />
            </button>
          </div>

          {/* Bottom Controls */}
          <div className="px-4 pb-4 space-y-2">
            {/* Seek Bar */}
            <div className="flex items-center gap-2">
              <span className="text-foreground/80 text-xs font-mono w-12 flex-shrink-0 text-right">{formatTime(currentTime)}</span>
              <div className="relative flex-1 h-1 group/seek">
                <input
                  ref={seekRef}
                  type="range"
                  min={0}
                  max={100}
                  value={progress}
                  onChange={handleSeekChange}
                  className="w-full h-1 appearance-none cursor-pointer rounded-full bg-transparent"
                  style={{
                    background: `linear-gradient(to right, #E50914 0%, #E50914 ${progress}%, rgba(255,255,255,0.3) ${progress}%, rgba(255,255,255,0.3) 100%)`
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
              <span className="text-foreground/80 text-xs font-mono w-12 flex-shrink-0">{formatTime(duration)}</span>
            </div>

            {/* Control Buttons */}
            <div className="flex items-center justify-between">
              {/* Left Controls */}
              <div className="flex items-center gap-3">
                <button
                  onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                  className="text-foreground hover:text-foreground/80 transition-colors"
                >
                  {playing ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); skip(-10); }}
                  className="text-foreground/80 hover:text-foreground transition-colors"
                >
                  <SkipBack className="w-4 h-4 fill-current" />
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); skip(10); }}
                  className="text-foreground/80 hover:text-foreground transition-colors"
                >
                  <SkipForward className="w-4 h-4 fill-current" />
                </button>

                {/* Volume */}
                <div className="flex items-center gap-2 group/vol" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={toggleMute}
                    className="text-foreground/80 hover:text-foreground transition-colors"
                  >
                    {muted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={(e) => changeVolume(parseFloat(e.target.value))}
                    className="w-16 h-1 hidden sm:block appearance-none cursor-pointer rounded-full"
                    style={{
                      background: `linear-gradient(to right, white 0%, white ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) ${(muted ? 0 : volume) * 100}%, rgba(255,255,255,0.3) 100%)`
                    }}
                  />
                </div>
              </div>

              {/* Right Controls */}
              <div className="flex items-center gap-2 relative" onClick={(e) => e.stopPropagation()}>
                {/* Orientation Toggle */}
                <button
                  onClick={() => setOrientation(o => o === "landscape" ? "portrait" : "landscape")}
                  className="text-foreground/80 hover:text-foreground transition-colors p-1"
                  title={orientation === "landscape" ? "Switch to Portrait" : "Switch to Landscape"}
                >
                  {orientation === "landscape" ? <Smartphone className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
                </button>

                {/* Speed */}
                <div className="relative">
                  <button
                    onClick={() => { setShowSettings(!showSettings); setShowQualityMenu(false); }}
                    className="text-foreground/80 hover:text-foreground transition-colors p-1 text-xs font-bold"
                  >
                    {speed}x
                  </button>
                  {showSettings && (
                    <div className="absolute bottom-8 right-0 bg-zinc-900/95 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl min-w-[120px]">
                      <p className="text-foreground/65 text-[10px] uppercase tracking-widest px-3 pt-2 pb-1 font-semibold">Speed</p>
                      {SPEEDS.map((s) => (
                        <button
                          key={s}
                          onClick={() => changeSpeed(s)}
                          className={`w-full px-4 py-2 text-sm text-left transition-colors hover:bg-white/10 ${speed === s ? "text-primary font-bold" : "text-foreground"}`}
                        >
                          {s === 1 ? "Normal" : `${s}x`}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quality Selector */}
                {allQualities.length > 1 && (
                  <div className="relative">
                    <button
                      onClick={() => { setShowQualityMenu(!showQualityMenu); setShowSettings(false); }}
                      className="text-foreground/80 hover:text-foreground transition-colors p-1 text-xs font-bold"
                    >
                      {currentQualityLabel}
                    </button>
                    {showQualityMenu && (
                      <div className="absolute bottom-8 right-0 bg-zinc-900/95 border border-zinc-700 rounded-xl overflow-hidden shadow-2xl min-w-[120px]">
                        <p className="text-foreground/65 text-[10px] uppercase tracking-widest px-3 pt-2 pb-1 font-semibold">Quality</p>
                        {allQualities.map((q) => (
                          <button
                            key={q.label}
                            onClick={() => changeQuality(q)}
                            className={`w-full px-4 py-2 text-sm text-left transition-colors hover:bg-white/10 ${currentQualityLabel === q.label ? "text-primary font-bold" : "text-foreground"}`}
                          >
                            {q.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Next Episode */}
                {isTvShow && onNextEpisode && (
                  <button
                    onClick={() => { if (!adIsActive) onNextEpisode(); }}
                    className="text-foreground/80 hover:text-foreground transition-colors p-1 hidden sm:block"
                    title="Next Episode"
                  >
                    <FastForward className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => { document.pictureInPictureElement ? document.exitPictureInPicture() : videoRef.current?.requestPictureInPicture?.().catch(() => {}); }}
                  className="text-foreground/80 hover:text-foreground transition-colors p-1 hidden sm:block"
                  title="Picture in Picture"
                >
                  <Circle className="w-4 h-4" />
                </button>

                <button
                  onClick={toggleFullscreen}
                  className="text-foreground/80 hover:text-foreground transition-colors p-1"
                >
                  {fullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Orientation label */}
        <div className="absolute top-3 left-3 pointer-events-none">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${orientation === "portrait" ? "bg-purple-600/80 text-white" : "bg-blue-600/80 text-white"}`}>
            {orientation === "portrait" ? "Portrait 9:16" : "Landscape 16:9"}
          </span>
        </div>
      </div>

      <style>{`
        input[type=range]::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          transition: transform 0.1s;
        }
        input[type=range]:hover::-webkit-slider-thumb { transform: scale(1.3); }
        input[type=range]::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: white;
          cursor: pointer;
          border: none;
        }
        @keyframes fade-out { 0%{opacity:1;transform:scale(1)} 80%{opacity:1;transform:scale(1.1)} 100%{opacity:0;transform:scale(0.9)} }
        .animate-fade-out { animation: fade-out 0.7s ease forwards; }
      `}</style>
    </div>
  );
}
