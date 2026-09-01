import React, { useState, useEffect, useRef, useCallback } from "react";
import { ExternalLink, SkipForward, Volume2, VolumeX } from "lucide-react";
import { getImageUrl, useGetPublicAds, recordAdInteraction } from "@/lib/api-client";
import { useSettings } from "@/contexts/SettingsContext";

/* ─── HOME BANNER AD ─── */
export function HomeBannerAd({ adId }: { adId?: string }) {
  const { data, isLoading } = useGetPublicAds({ placement: 'Home Page' });
  const ads: any[] = data?.data || [];
  const adRef = useRef<any>(null);

  // Pick the specified ad, or a random ad only once after data loads
  if (!adRef.current && ads.length > 0) {
    if (adId) {
      adRef.current = ads.find((a) => a._id === adId) || ads[Math.floor(Math.random() * ads.length)];
    } else {
      adRef.current = ads[Math.floor(Math.random() * ads.length)];
    }
  }
  const ad = adRef.current;

  useEffect(() => {
    if (ad?._id) {
      recordAdInteraction(ad._id, 'impression').catch(() => {});
    }
  }, [ad?._id]);

  if (isLoading) return null;
  if (!ad) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="mx-4 sm:mx-8 lg:mx-12 mb-10 h-[100px] bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-700/50 flex flex-col items-center justify-center shadow-lg">
          <p className="text-muted-foreground/80 font-bold text-sm">Ad Banner Placeholder</p>
          <p className="text-muted-foreground/60 text-[10px] mt-1">No active ads with placement "Home Page" found in database.</p>
        </div>
      );
    }
    return null;
  }

  const handleClick = () => {
    if (ad._id) recordAdInteraction(ad._id, 'click').catch(() => {});
    if (ad.redirectUrl) window.open(ad.redirectUrl, '_blank', 'noopener noreferrer');
  };

  if (ad.adType === 'Custom') {
    return (
      <div className="mx-4 sm:mx-8 lg:mx-12 mb-10">
        <div className="relative rounded-2xl overflow-hidden bg-zinc-900/50 border border-zinc-800/60 shadow-lg">
          <div className="absolute top-2 right-2 z-10 text-[9px] font-bold text-muted-foreground/60 bg-black/60 px-1.5 py-0.5 rounded uppercase tracking-widest">Ad</div>
          <div
            dangerouslySetInnerHTML={{ __html: ad.mediaUrl }}
            className="w-full min-h-[90px] flex items-center justify-center"
          />
        </div>
      </div>
    );
  }

  if (ad.adType === 'Video') {
    return (
      <div className="mx-4 sm:mx-8 lg:mx-12 mb-10">
        <div className="relative rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/60 cursor-pointer group shadow-lg transition-transform duration-300 hover:scale-[1.01]" onClick={handleClick}>
          <div className="absolute top-2 right-2 z-10 text-[9px] font-bold text-muted-foreground/60 bg-black/60 px-1.5 py-0.5 rounded uppercase tracking-widest">Sponsored</div>
          <video
            src={getImageUrl(ad.mediaUrl)}
            autoPlay muted loop playsInline
            className="w-full max-h-[220px] object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
          {ad.redirectUrl && (
            <div className="absolute bottom-4 left-4 flex items-center gap-2">
              <span className="text-foreground text-xs font-bold bg-red-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-md">
                <ExternalLink className="w-3 h-3" /> Learn More
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Image ad
  return (
    <div className="mx-4 sm:mx-8 lg:mx-12 mb-10">
      <div
        className="relative rounded-2xl overflow-hidden border border-zinc-800/60 cursor-pointer group shadow-lg transition-transform duration-300 hover:scale-[1.01]"
        onClick={handleClick}
      >
        <div className="absolute top-2 right-2 z-10 text-[9px] font-bold text-muted-foreground/60 bg-black/60 px-1.5 py-0.5 rounded uppercase tracking-widest">Sponsored</div>
        <img
          src={getImageUrl(ad.mediaUrl)}
          alt={ad.adName}
          className="w-full max-h-[220px] object-cover transition-transform duration-700"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        {ad.redirectUrl && (
          <div className="absolute bottom-4 left-4">
            <span className="text-foreground text-xs font-bold bg-red-600 px-3 py-1.5 rounded-lg flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-md">
              <ExternalLink className="w-3 h-3" /> Learn More
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── GOOGLE ADSENSE BANNER ─── */
export function GoogleAdsenseBanner() {
  const { settings } = useSettings();
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!settings?.adNetworkEnabled || !settings?.adMobPublisherId) return;
    const existingScript = document.querySelector('script[src*="pagead2.googlesyndication"]');
    if (!existingScript) {
      const script = document.createElement('script');
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js';
      script.async = true;
      script.setAttribute('data-ad-client', settings.adMobPublisherId);
      document.head.appendChild(script);
    }
    try {
      (window as any).adsbygoogle = (window as any).adsbygoogle || [];
      (window as any).adsbygoogle.push({});
    } catch (_) {}
  }, [settings?.adNetworkEnabled, settings?.adMobPublisherId]);

  if (!settings?.adNetworkEnabled || !settings?.adMobPublisherId) {
    if (process.env.NODE_ENV === 'development') {
      return (
        <div className="mx-4 sm:mx-8 lg:mx-12 mb-10 h-[100px] bg-zinc-900/50 rounded-2xl border border-dashed border-zinc-700/50 flex flex-col items-center justify-center shadow-lg">
          <p className="text-muted-foreground/80 font-bold text-sm">Google AdSense Placeholder</p>
          <p className="text-muted-foreground/60 text-[10px] mt-1">Ad Network is disabled or Publisher ID is missing in Settings.</p>
        </div>
      );
    }
    return null;
  }

  return (
    <div className="mx-4 sm:mx-8 lg:mx-12 mb-10">
      <div className="relative rounded-2xl overflow-hidden border border-zinc-800/40 bg-zinc-900/30 p-2 min-h-[90px] flex items-center justify-center shadow-lg">
        <div className="absolute top-1 right-2 text-[9px] font-bold text-foreground/30 uppercase tracking-widest">Ad</div>
        <div ref={containerRef} className="w-full">
          <ins
            className="adsbygoogle"
            style={{ display: 'block', width: '100%', minHeight: 90 }}
            data-ad-client={settings.adMobPublisherId}
            data-ad-slot={settings.adMobBannerAndroid || ''}
            data-ad-format="auto"
            data-full-width-responsive="true"
          />
        </div>
      </div>
    </div>
  );
}

/* ─── PLAYER PRE-ROLL AD ─────────────────────────────────────────
   CRITICAL FIX: Never call onFinished() during render.
   Use useEffect to dismiss when no ad is found after loading.
   Show a dark loading screen while fetching so the player is hidden.
──────────────────────────────────────────────────────────────── */
export function PlayerPrerollAd({ onFinished }: { onFinished: () => void }) {
  const { settings } = useSettings();
  const { data, isLoading } = useGetPublicAds({ placement: 'Player' });
  const ads: any[] = data?.data || [];

  // Pick a random ad only once, after data loads (using a ref so it doesn't re-randomize)
  const pickedAdRef = useRef<any>(null);
  if (!pickedAdRef.current && ads.length > 0) {
    pickedAdRef.current = ads[Math.floor(Math.random() * ads.length)];
  }
  const ad = pickedAdRef.current;

  const vastUrl = settings?.vastPrerollUrl;
  const [countdown, setCountdown] = useState(5);
  const [canSkip, setCanSkip] = useState(false);
  const [muted, setMuted] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);

  // ✅ Safe: call onFinished only AFTER data loads and confirms no ad
  const onFinishedRef = useRef(onFinished);
  onFinishedRef.current = onFinished;

  useEffect(() => {
    if (!isLoading && !ad && !vastUrl) {
      // No ad to show — dismiss immediately without blocking the player
      onFinishedRef.current();
    }
  }, [isLoading, ad, vastUrl]);

  // Record impression
  useEffect(() => {
    if (ad?._id) recordAdInteraction(ad._id, 'impression').catch(() => {});
  }, [ad?._id]);

  // Countdown timer — only starts when there IS an ad to show
  useEffect(() => {
    if (!ad && !vastUrl) return;
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) { setCanSkip(true); clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [!!ad, !!vastUrl]);

  const handleAdClick = useCallback(() => {
    if (ad?._id) recordAdInteraction(ad._id, 'click').catch(() => {});
    if (ad?.redirectUrl) window.open(ad.redirectUrl, '_blank', 'noopener noreferrer');
  }, [ad]);

  // ── LOADING STATE: show dark screen while fetching ──
  if (isLoading) {
    return (
      <div className="absolute inset-0 bg-black z-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 opacity-60">
          <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          <span className="text-muted-foreground/60 text-[10px] uppercase tracking-widest">Loading…</span>
        </div>
      </div>
    );
  }

  // ── NO AD FOUND: render nothing (effect above will call onFinished) ──
  if (!ad && !vastUrl) return null;

  // ── SKIP BUTTON ──
  const SkipBtn = canSkip ? (
    <button
      onClick={onFinished}
      className="absolute bottom-6 right-6 z-10 flex items-center gap-1.5 px-5 py-2.5 bg-black/80 border border-white/20 text-white text-sm font-bold rounded-xl hover:bg-white/10 transition-all shadow-xl animate-in fade-in duration-200"
    >
      <SkipForward className="w-4 h-4" /> Skip Ad
    </button>
  ) : (
    <div className="absolute bottom-6 right-6 z-10 px-5 py-2.5 bg-black/80 border border-white/20 text-white text-sm font-bold rounded-xl shadow-xl">
      Skip in {countdown}s
    </div>
  );

  // ── VAST PRE-ROLL (iframe) ──
  if (!ad && vastUrl) {
    return (
      <div className="absolute inset-0 bg-black z-50 flex items-center justify-center">
        <iframe src={vastUrl} className="w-full h-full border-0" title="Ad" allow="autoplay" />
        <div className="absolute top-4 left-4 text-[10px] text-muted-foreground uppercase tracking-widest bg-black/60 px-2 py-1 rounded z-10">Ad</div>
        {SkipBtn}
      </div>
    );
  }

  // ── CUSTOM HTML AD ──
  if (ad.adType === 'Custom') {
    return (
      <div className="absolute inset-0 bg-black z-50 flex items-center justify-center">
        <div className="absolute top-4 left-4 text-[10px] text-muted-foreground uppercase tracking-widest bg-black/60 px-2 py-1 rounded z-10">Advertisement</div>
        <div
          className="w-full h-full flex items-center justify-center p-6 overflow-hidden"
          dangerouslySetInnerHTML={{ __html: ad.mediaUrl }}
        />
        {SkipBtn}
      </div>
    );
  }

  // ── IMAGE AD ──
  if (ad.adType === 'Image') {
    return (
      <div className="absolute inset-0 bg-black z-50 flex items-center justify-center cursor-pointer group" onClick={handleAdClick}>
        <div className="absolute top-4 left-4 text-[10px] text-muted-foreground uppercase tracking-widest bg-black/60 px-2 py-1 rounded z-10">Advertisement</div>
        <img
          src={getImageUrl(ad.mediaUrl)}
          alt={ad.adName || 'Ad'}
          className="max-w-full max-h-full object-contain"
        />
        {ad.redirectUrl && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="flex items-center gap-1.5 px-6 py-3 bg-red-600/90 hover:bg-red-600 text-white text-sm font-bold rounded-xl shadow-xl hover:scale-105 transition-all">
              <ExternalLink className="w-4 h-4" /> Learn More
            </span>
          </div>
        )}
        {SkipBtn}
      </div>
    );
  }

  // ── VIDEO AD ──
  return (
    <div className="absolute inset-0 bg-black z-50">
      <video
        ref={videoRef}
        src={getImageUrl(ad.mediaUrl)}
        autoPlay
        muted={muted}
        playsInline
        className="w-full h-full object-contain cursor-pointer"
        onClick={handleAdClick}
        onEnded={() => setCanSkip(true)}
      />
      <div className="absolute top-4 left-4 text-[10px] text-muted-foreground uppercase tracking-widest bg-black/60 px-2 py-1 rounded z-10">Advertisement</div>
      <button
        onClick={() => setMuted(m => !m)}
        className="absolute top-4 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-black/60 border border-white/10 text-white hover:bg-black/80 transition-all z-10"
      >
        {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
      </button>
      {SkipBtn}
    </div>
  );
}
