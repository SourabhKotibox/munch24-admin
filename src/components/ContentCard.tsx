import { Play, Star, Crown } from "lucide-react";
import { getImageUrl } from "@/lib/api-client";

// ─── Shared helpers ────────────────────────────────────────────────────────────

function BadgeTop({ item }: { item: any }) {
  const isSubscribed = (() => {
    try {
      const stored = localStorage.getItem("appUser");
      if (stored) {
        const u = JSON.parse(stored);
        return u.subscriptionStatus === "active" && u.subscriptionPlan !== "free";
      }
    } catch {}
    return false;
  })();

  const isPremium = item.isPremium || item.badge === "TOP" || item.badge === "EXCLUSIVE";
  if (isPremium && !isSubscribed) {
    return (
      <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-400/90 text-black text-[9px] font-black rounded-md leading-none shadow">
        <Crown className="w-2.5 h-2.5" /> PREMIUM
      </span>
    );
  }
  if (item.badge === "NEW") {
    return (
      <span className="px-1.5 py-0.5 bg-emerald-500/90 text-foreground text-[9px] font-black rounded-md leading-none shadow">
        NEW
      </span>
    );
  }
  if (item.badge === "HOT") {
    return (
      <span className="px-1.5 py-0.5 bg-orange-500/90 text-foreground text-[9px] font-black rounded-md leading-none shadow">
        HOT
      </span>
    );
  }
  if (item.badge === "TRENDING") {
    return (
      <span className="px-1.5 py-0.5 bg-red-500/90 text-white text-[9px] font-black rounded-md leading-none shadow">
        TRENDING
      </span>
    );
  }
  if (item.badge && item.badge !== "TOP" && item.badge !== "EXCLUSIVE") {
    return (
      <span className="px-1.5 py-0.5 bg-white/20 text-foreground text-[9px] font-black rounded-md leading-none shadow">
        {item.badge}
      </span>
    );
  }

  return null;
}

function ImdbBadge({ rating }: { rating: any }) {
  if (!rating) return null;
  return (
    <span className="flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-400/90 text-black text-[9px] font-black rounded-md leading-none shadow">
      <Star className="w-2.5 h-2.5 fill-black" /> {rating}
    </span>
  );
}

// ─── PortraitCard ──────────────────────────────────────────────────────────────
// Use fullWidth=true when inside a CSS grid (categories, search results).
// Leave fullWidth=false (default) when inside a horizontal scroll row.

const portraitWidths = {
  sm: "w-[140px] sm:w-[160px]",
  md: "w-[165px] sm:w-[195px] lg:w-[220px]",
  lg: "w-[190px] sm:w-[225px] lg:w-[260px]",
};

export function PortraitCard({
  item,
  onClick,
  size = "md",
  fullWidth = false,
}: {
  item: any;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  const imgSrc =
    getImageUrl(item.poster || item.posterImage || item.thumbnail) || "";

  const isShow =
    item.type === "show" ||
    item.type === "series" ||
    item.contentType === "series" ||
    item.contentType === "show";

  const year = item.year || item.releaseYear || "";
  const duration = item.duration ? `${item.duration}m` : "";

  return (
    <div
      className={`${fullWidth ? "w-full" : `${portraitWidths[size]} flex-shrink-0`} cursor-pointer group`}
      onClick={onClick}
    >
      {/* Image container */}
      <div
         className="relative rounded-xl overflow-hidden bg-zinc-900 group-hover:ring-2 group-hover:ring-red-500/40 transition-all duration-300"
        style={{ aspectRatio: "2/3" }}
      >
        {/* Poster image */}
        <img
          src={imgSrc}
          alt={item.title || ""}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.backgroundColor = "#111";
            el.style.display = "none";
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

        {/* Top-left: badge */}
        <div className="absolute top-2 left-2 z-10">
          <BadgeTop item={item} />
        </div>

        {/* Top-right: IMDB */}
        {item.imdbRating && (
          <div className="absolute top-2 right-2 z-10">
            <ImdbBadge rating={item.imdbRating} />
          </div>
        )}

        {/* Bottom-left: TV pill for shows */}
        {isShow && (
          <div className="absolute bottom-11 left-2 z-10">
            <span className="px-1.5 py-0.5 bg-white/15 border border-white/20 text-foreground text-[9px] font-black rounded-md leading-none">
              TV
            </span>
          </div>
        )}

        {/* Bottom info (always visible) */}
        <div className="absolute bottom-0 left-0 right-0 px-2.5 pb-2.5 pt-6 z-10 pointer-events-none">
          <p className="text-foreground font-bold text-xs truncate leading-tight">{item.title}</p>
          {(year || duration) && (
            <p className="text-foreground/80 text-[10px] mt-0.5 truncate">
              {[year, duration].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        {/* Play button — bottom-right corner */}
        <button
          className="absolute bottom-2.5 right-2.5 z-20 w-9 h-9 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 scale-90 group-hover:scale-100 transition-all duration-200 shadow-lg pointer-events-auto"
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          aria-label="Play"
        >
          <Play className="w-4 h-4 text-foreground fill-white ml-0.5" />
        </button>
      </div>
    </div>
  );
}

// ─── LandscapeCard ─────────────────────────────────────────────────────────────
// Use fullWidth=true when inside a CSS grid.

const landscapeWidths = {
  sm: "w-[260px] sm:w-[300px]",
  md: "w-[300px] sm:w-[360px] lg:w-[420px]",
  lg: "w-[340px] sm:w-[400px] lg:w-[480px]",
};

export function LandscapeCard({
  item,
  onClick,
  size = "md",
  fullWidth = false,
}: {
  item: any;
  onClick: () => void;
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
}) {
  const imgSrc =
    getImageUrl(item.backdrop || item.poster || item.posterImage || item.thumbnail) || "";

  const year = item.year || item.releaseYear || "";
  const duration = item.duration ? `${item.duration}m` : "";

  return (
    <div
      className={`${fullWidth ? "w-full" : `${landscapeWidths[size]} flex-shrink-0`} cursor-pointer group`}
      onClick={onClick}
    >
      <div
         className="relative rounded-xl overflow-hidden bg-zinc-900 group-hover:ring-1 group-hover:ring-red-500/40 transition-all duration-300"
        style={{ aspectRatio: "16/9" }}
      >
        {/* Backdrop image */}
        <img
          src={imgSrc}
          alt={item.title || ""}
          className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.backgroundColor = "#111";
            el.style.display = "none";
          }}
        />

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent pointer-events-none" />

        {/* Top-left: badge */}
        <div className="absolute top-2 left-2 z-10">
          <BadgeTop item={item} />
        </div>

        {/* Top-right: IMDB */}
        {item.imdbRating && (
          <div className="absolute top-2 right-2 z-10">
            <ImdbBadge rating={item.imdbRating} />
          </div>
        )}

        {/* Bottom info row */}
        <div className="absolute bottom-0 left-0 right-0 px-3 pb-3 pt-8 z-10 flex items-end justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-foreground font-bold text-xs truncate leading-tight">{item.title}</p>
            {(year || duration) && (
              <p className="text-foreground/80 text-[10px] mt-0.5 truncate">
                {[year, duration].filter(Boolean).join(" · ")}
              </p>
            )}
          </div>

          {/* Play button */}
          <button
            className="flex-shrink-0 w-9 h-9 rounded-full bg-red-600 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 shadow-lg pointer-events-auto"
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            aria-label="Play"
          >
            <Play className="w-4 h-4 text-foreground fill-white ml-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

// Default export
export default PortraitCard;
