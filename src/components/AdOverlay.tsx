import { SkipForward, Timer } from 'lucide-react';

interface AdOverlayProps {
  timer: number;
  canSkip: boolean;
  onSkip: () => void;
  mediaUrl?: string;
  label?: string;
}

export default function AdOverlay({ timer, canSkip, onSkip, mediaUrl, label = 'Advertisement' }: AdOverlayProps) {
  return (
    <div className="absolute inset-0 z-[400] bg-black flex flex-col items-center justify-center">
      {mediaUrl ? (
        <img src={mediaUrl} alt="Ad" className="absolute inset-0 w-full h-full object-cover opacity-60" />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 to-black" />
      )}
      <div className="absolute inset-0 bg-black/40" />

      <div className="relative z-10 flex flex-col items-center gap-4">
        <div className="flex items-center gap-2 text-foreground/70 text-xs uppercase tracking-widest font-bold">
          <Timer className="w-3 h-3" />
          {label}
        </div>
        <div className="text-foreground font-black text-5xl tabular-nums">{timer}s</div>
        {canSkip ? (
          <button
            onClick={onSkip}
            className="flex items-center gap-2 px-5 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-foreground text-sm font-bold transition-all active:scale-95"
          >
            <SkipForward className="w-4 h-4" />
            Skip Ad
          </button>
        ) : (
          <div className="px-4 py-2 bg-white/5 rounded-full text-foreground/70 text-xs font-medium">
            Skip in {timer}s
          </div>
        )}
      </div>
    </div>
  );
}
