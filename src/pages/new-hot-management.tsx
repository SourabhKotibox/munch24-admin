import { useState, useCallback } from "react";
import {
  Flame, Sparkles, TrendingUp, Star, Search,
  ChevronLeft, ChevronRight, Loader2, Film, CheckCircle2, XCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  useGetMovies, useGetContentList, useUpdateMovie, useUpdateContent, getImageUrl,
} from "@/lib/api-client";

const PAGE_SIZE = 20;
type Tab = "movies" | "tvshows" | "dramas";
type FlagKey = "isNewContent" | "trending" | "featured";

const FLAGS: { key: FlagKey; label: string; icon: typeof Sparkles }[] = [
  { key: "isNewContent", label: "New", icon: Sparkles },
  { key: "trending",     label: "Trending", icon: TrendingUp },
  { key: "featured",     label: "Featured", icon: Star },
];

const STATUS_STYLES: Record<string, string> = {
  published: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  active:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  draft:     "bg-zinc-700/40 text-foreground/70 border-zinc-700/40",
  pending:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
  inactive:  "bg-zinc-700/40 text-foreground/70 border-zinc-700/40",
};

export default function NewHotManagement() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("movies");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  // Optimistic local overrides: keyed as "itemId-field"
  const [optimistic, setOptimistic] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<Record<string, boolean>>({});

  const updateMovie = useUpdateMovie();
  const updateContent = useUpdateContent();

  const moviesQuery  = useGetMovies(activeTab === "movies"   ? { page, limit: PAGE_SIZE, search: search || undefined } : undefined);
  const tvShowsQuery = useGetContentList(activeTab === "tvshows" ? { page, limit: PAGE_SIZE, search: search || undefined, contentType: "series" } : undefined);
  const dramasQuery  = useGetContentList(activeTab === "dramas"  ? { page, limit: PAGE_SIZE, search: search || undefined, contentType: "drama"  } : undefined);

  const rawData =
    activeTab === "movies"   ? moviesQuery.data  :
    activeTab === "tvshows"  ? tvShowsQuery.data :
    dramasQuery.data;

  const isLoading =
    activeTab === "movies"   ? moviesQuery.isLoading  :
    activeTab === "tvshows"  ? tvShowsQuery.isLoading :
    dramasQuery.isLoading;

  const items: any[] =
    Array.isArray(rawData?.data?.items) ? rawData.data.items  :
    Array.isArray(rawData?.data)        ? rawData.data        :
    Array.isArray(rawData?.items)       ? rawData.items       :
    Array.isArray(rawData)              ? rawData             : [];

  const total: number = rawData?.data?.total ?? rawData?.total ?? items.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const oKey = (id: string, field: FlagKey) => `${id}-${field}`;

  const getFlag = (item: any, field: FlagKey): boolean => {
    const id = item.id || item._id;
    const k = oKey(id, field);
    return k in optimistic ? optimistic[k] : !!item[field];
  };

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    setPage(1);
    setSearch("");
    setOptimistic({});
  };

  const handleToggle = useCallback(async (item: any, field: FlagKey) => {
    const id = item.id || item._id;
    const k = oKey(id, field);
    if (saving[k]) return;

    const newValue = !getFlag(item, field);
    setOptimistic((prev) => ({ ...prev, [k]: newValue }));
    setSaving((prev) => ({ ...prev, [k]: true }));

    try {
      if (activeTab === "movies") {
        await updateMovie.mutateAsync({ id, data: { [field]: newValue } });
      } else {
        await updateContent.mutateAsync({ id, data: { [field]: newValue } });
      }
      const label = FLAGS.find((f) => f.key === field)?.label ?? field;
      toast({
        title: newValue ? `Added to ${label}` : `Removed from ${label}`,
        description: `"${item.title || item.name}" has been ${newValue ? "added to" : "removed from"} ${label}.`,
      });
    } catch (err: any) {
      setOptimistic((prev) => ({ ...prev, [k]: !newValue }));
      toast({
        title: "Update failed",
        description: err?.message || "Failed to update. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving((prev) => ({ ...prev, [k]: false }));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, saving, optimistic]);

  const newCount      = items.filter((i) => getFlag(i, "isNewContent")).length;
  const trendingCount = items.filter((i) => getFlag(i, "trending")).length;
  const featuredCount = items.filter((i) => getFlag(i, "featured")).length;

  const tabs: { id: Tab; label: string }[] = [
    { id: "movies",   label: "Movies" },
    { id: "tvshows",  label: "TV Shows" },
    { id: "dramas",   label: "Short Dramas" },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ──────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 border border-primary/20">
            <Flame className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black text-foreground tracking-tight">New &amp; Hot</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Control which content appears as New, Trending or Featured
            </p>
          </div>
        </div>

        {!isLoading && items.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {[
              { label: "New", count: newCount, icon: Sparkles },
              { label: "Trending", count: trendingCount, icon: TrendingUp },
              { label: "Featured", count: featuredCount, icon: Star },
            ].map(({ label, count, icon: Icon }) => (
              <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-primary/10 border border-primary/20">
                <Icon className="h-3 w-3 text-primary" />
                <span className="text-xs font-bold text-primary">{count}</span>
                <span className="text-[10px] font-semibold text-primary/70 hidden sm:inline">{label}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Controls ────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        {/* Tab switcher */}
        <div className="flex gap-1 bg-muted/80 dark:bg-zinc-950 border border-border dark:border-zinc-900 rounded-xl p-1 w-fit">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-white shadow-sm shadow-primary/30"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            placeholder={`Search ${activeTab === "movies" ? "movies" : activeTab === "tvshows" ? "TV shows" : "short dramas"}…`}
            className="w-full rounded-xl border border-border bg-card dark:border-zinc-900 dark:bg-zinc-950 pl-9 pr-4 py-2.5 text-xs font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition-all"
          />
        </div>
      </div>

      {/* ── Table ───────────────────────────────────────────────── */}
      <div className="rounded-2xl border border-border bg-card dark:border-zinc-900 dark:bg-zinc-950/50 overflow-hidden">
        {/* Column headers */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-border bg-muted/50 dark:border-zinc-900 dark:bg-zinc-950/70">
          <div className="flex-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Content</div>
          <div className="w-16 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center hidden sm:block">Year</div>
          <div className="w-24 text-[10px] font-bold uppercase tracking-widest text-muted-foreground text-center hidden md:block">Status</div>
          {FLAGS.map((f) => (
            <div key={f.key} className="w-20 text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center justify-center gap-1">
              <f.icon className="h-3 w-3" />{f.label}
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-primary/30" />
            <p className="text-xs text-foreground/65 font-medium">Loading content…</p>
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <div className="w-16 h-16 rounded-2xl bg-muted border border-border dark:bg-zinc-900 dark:border-zinc-800 flex items-center justify-center">
              <Film className="h-8 w-8 text-muted-foreground opacity-60 dark:text-muted-foreground" />
            </div>
            <p className="text-sm font-semibold text-foreground">No content found</p>
            {search && <p className="text-xs text-muted-foreground">Try a different search term</p>}
          </div>
        ) : (
          <div className="divide-y divide-border dark:divide-zinc-900/70">
            {items.map((item: any) => {
              const id = item.id || item._id;
              const poster = item.poster || item.thumbnail || item.coverImage || item.bannerImage || "";
              const title  = item.title || item.name || "Untitled";
              const year   = item.releaseYear || item.year || "—";
              const status = (item.status || "draft").toLowerCase();
              const statusStyle = STATUS_STYLES[status] || STATUS_STYLES.draft;

              return (
                <div
                  key={id}
                  className="flex items-center gap-2 px-4 py-3 hover:bg-muted/50 dark:hover:bg-zinc-900/40 transition-colors group"
                >
                  {/* Poster + title */}
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="h-14 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-muted border border-border dark:bg-zinc-900 dark:border-zinc-800 dark:group-hover:border-zinc-700 transition-colors">
                      {poster ? (
                        <img
                          src={getImageUrl(poster)}
                          alt={title}
                          className="h-full w-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                        />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center">
                          <Film className="h-4 w-4 text-muted-foreground opacity-60" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm font-semibold text-foreground line-clamp-2 leading-snug">
                      {title}
                    </span>
                  </div>

                  {/* Year */}
                  <div className="w-16 text-center hidden sm:block">
                    <span className="text-xs font-medium text-muted-foreground">{year}</span>
                  </div>

                  {/* Status */}
                  <div className="w-24 flex justify-center hidden md:flex">
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wider capitalize ${statusStyle}`}>
                      {status}
                    </span>
                  </div>

                  {/* Flag toggle buttons */}
                  {FLAGS.map((f) => {
                    const k = oKey(id, f.key);
                    const isSaving = !!saving[k];
                    const isOn = getFlag(item, f.key);

                    return (
                      <div key={f.key} className="w-20 flex justify-center">
                        <button
                          onClick={() => handleToggle(item, f.key)}
                          disabled={isSaving}
                          title={isOn ? `Remove from ${f.label}` : `Add to ${f.label}`}
                          className={`inline-flex items-center justify-center gap-1 h-8 w-[68px] rounded-xl border text-[10px] font-extrabold tracking-wide transition-all duration-150 select-none
                            ${isSaving ? "opacity-60 cursor-wait" : "cursor-pointer active:scale-95"}
                            ${isOn
                              ? "bg-primary/15 border-primary/40 text-primary hover:bg-primary/25 hover:border-primary/70 shadow-sm shadow-primary/10"
                              : "bg-card border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground hover:bg-muted dark:bg-zinc-950 dark:border-zinc-800 dark:text-muted-foreground/80 dark:hover:border-zinc-600 dark:hover:text-muted-foreground dark:hover:bg-zinc-900/60"
                            }`}
                        >
                          {isSaving ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : isOn ? (
                            <>
                              <CheckCircle2 className="h-3 w-3" />
                              ON
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3" />
                              OFF
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pagination ──────────────────────────────────────────── */}
      {!isLoading && items.length > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">
            Page{" "}
            <span className="text-foreground font-bold">{page}</span>
            {" "}of{" "}
            <span className="text-foreground font-bold">{totalPages}</span>
            &nbsp;·&nbsp;
            <span className="text-foreground font-bold">{total}</span> items
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card hover:border-muted-foreground hover:bg-muted dark:border-zinc-900 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="flex h-8 min-w-[2rem] items-center justify-center rounded-xl bg-primary/15 border border-primary/30 text-primary text-xs font-black px-2.5">
              {page}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex h-8 w-8 items-center justify-center rounded-xl border border-border bg-card hover:border-muted-foreground hover:bg-muted dark:border-zinc-900 dark:bg-zinc-950 dark:hover:border-zinc-700 dark:hover:bg-zinc-900 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
