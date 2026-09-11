import { useCallback, useEffect, useRef, useState } from "react";
import { useGetPublicAds } from "@/lib/api-client";

export type AdRollType = "preroll" | "midroll" | "postroll" | "between" | "display";

export function resolveAdRollType(ad?: { rollType?: string; placement?: string } | null): AdRollType {
  if (ad?.rollType) return ad.rollType as AdRollType;
  return ad?.placement === "Player" ? "preroll" : "display";
}

export function getAdSkipAfter(ad?: { skipEnabled?: boolean; skipAfterSeconds?: number } | null): number {
  if (ad?.skipEnabled === false) return 9999;
  const value = Number(ad?.skipAfterSeconds);
  return Number.isFinite(value) && value >= 0 ? value : 5;
}

export function pickAdByRoll(ads: any[], roll: AdRollType): any | null {
  const matched = (ads || []).filter((ad) => resolveAdRollType(ad) === roll);
  if (!matched.length) return null;
  return matched[Math.floor(Math.random() * matched.length)];
}

export function getMidRollCues(ad: any, duration: number): number[] {
  const raw = Array.isArray(ad?.midRollAtSeconds)
    ? ad.midRollAtSeconds.map((item: any) => Number(item)).filter((item: number) => Number.isFinite(item) && item > 0)
    : [];
  if (raw.length) return Array.from(new Set<number>(raw)).sort((a, b) => a - b);
  if (duration > 20) return [Math.floor(duration * 0.5)];
  return [];
}

export function mapContentTypeToAdTarget(contentType?: string): string | undefined {
  if (contentType === "drama") return "Short Dramas";
  if (contentType === "movie") return "Movie";
  if (contentType === "series" || contentType === "show") return "TV Shows";
  return undefined;
}

export function usePlayerAdBreaks(options?: {
  enabled?: boolean;
  targetContentType?: string;
  currentTime?: number;
  duration?: number;
  startWithPreroll?: boolean;
}) {
  const enabled = options?.enabled !== false;
  const { data, isLoading } = useGetPublicAds({
    placement: "Player",
    targetContentType: options?.targetContentType,
  });
  const ads: any[] = enabled ? data?.data || [] : [];
  const [roll, setRoll] = useState<AdRollType | null>(
    enabled && options?.startWithPreroll !== false ? "preroll" : null
  );
  const pickedRef = useRef<Partial<Record<AdRollType, any>>>({});
  const firedCues = useRef<Set<number>>(new Set());

  const lockedPick = (type: AdRollType) => {
    if (pickedRef.current[type]) return pickedRef.current[type];
    const ad = pickAdByRoll(ads, type);
    if (ad) pickedRef.current[type] = ad;
    return ad || null;
  };

  const activeAd = roll ? lockedPick(roll) : null;
  const midAd = lockedPick("midroll");

  useEffect(() => {
    if (!enabled || roll || !options?.duration || options.currentTime == null) return;
    const cues = midAd ? getMidRollCues(midAd, options.duration) : [];
    for (const cue of cues) {
      if (options.currentTime >= cue && !firedCues.current.has(cue)) {
        firedCues.current.add(cue);
        setRoll("midroll");
        break;
      }
    }
  }, [enabled, roll, options?.currentTime, options?.duration, midAd]);

  const dismiss = useCallback(() => setRoll(null), []);

  const startRoll = useCallback((type: AdRollType) => {
    if (!enabled) return false;
    const ad = lockedPick(type);
    if (!ad && type !== "preroll") return false;
    if (!ad) return false;
    setRoll(type);
    return true;
  }, [enabled, ads]);

  const resetForEpisode = useCallback(() => {
    pickedRef.current = {};
    firedCues.current.clear();
    if (enabled && options?.startWithPreroll !== false) setRoll("preroll");
    else setRoll(null);
  }, [enabled, options?.startWithPreroll]);

  return {
    ads,
    isLoading,
    roll,
    activeAd,
    dismiss,
    startBetween: () => startRoll("between"),
    startPostroll: () => startRoll("postroll"),
    startPreroll: () => startRoll("preroll"),
    resetForEpisode,
    setRoll,
  };
}
