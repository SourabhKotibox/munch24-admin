import { useState, useEffect, useRef, useCallback } from 'react';

export type AdPhase = 'idle' | 'playing' | 'completed';
export type AdType = 'preroll' | 'midroll' | 'between-episode';

interface AdConfig {
  duration: number;
  skippableAfter: number;
  mediaUrl?: string;
  label?: string;
}

interface UseAdPlaybackOptions {
  onAdComplete?: () => void;
  onAdSkip?: () => void;
}

export function useAdPlayback(options: UseAdPlaybackOptions = {}) {
  const [phase, setPhase] = useState<AdPhase>('idle');
  const [timer, setTimer] = useState(0);
  const [canSkip, setCanSkip] = useState(false);
  const [config, setConfig] = useState<AdConfig | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>();
  const remainingRef = useRef(0);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = undefined;
    }
  }, []);

  const startAd = useCallback((type: AdType, adConfig?: Partial<AdConfig>) => {
    clearTimer();
    const fullConfig: AdConfig = {
      duration: type === 'between-episode' ? 3 : 5,
      skippableAfter: type === 'between-episode' ? 1 : 2,
      label: type === 'preroll' ? 'Advertisement' : type === 'midroll' ? 'Ad Break' : 'Up Next',
      ...adConfig,
    };
    setConfig(fullConfig);
    setPhase('playing');
    setTimer(fullConfig.duration);
    setCanSkip(false);
    remainingRef.current = fullConfig.duration;

    timerRef.current = setInterval(() => {
      remainingRef.current -= 1;
      setTimer(remainingRef.current);
      if (remainingRef.current <= fullConfig.duration - fullConfig.skippableAfter) {
        setCanSkip(true);
      }
      if (remainingRef.current <= 0) {
        clearTimer();
        setPhase('completed');
        options.onAdComplete?.();
      }
    }, 1000);
  }, [clearTimer, options]);

  const skipAd = useCallback(() => {
    clearTimer();
    setPhase('completed');
    options.onAdSkip?.();
  }, [clearTimer, options]);

  const reset = useCallback(() => {
    clearTimer();
    setPhase('idle');
    setTimer(0);
    setCanSkip(false);
    setConfig(null);
  }, [clearTimer]);

  useEffect(() => () => clearTimer(), [clearTimer]);

  return {
    phase,
    timer,
    canSkip,
    startAd,
    skipAd,
    reset,
    config,
    isActive: phase === 'playing',
  };
}
