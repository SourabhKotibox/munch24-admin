import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, Bookmark, Trash2, Play } from "lucide-react";
import { useGetWishlist, useToggleWishlist, getImageUrl } from "@/lib/api-client";
import { PublicHeader, PublicFooter } from "@/pages/streaming-home";

export default function WishlistPage() {
  const [, setLocation] = useLocation();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("appUser");
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  const { data: wishlistData, isLoading, refetch } = useGetWishlist({ limit: 100 });
  const wishlistItems: any[] = wishlistData?.items || [];
  const { mutate: toggleWishlist, isPending: isRemoving } = useToggleWishlist();

  const handlePlay = (item: any) => {
    const id = item.id || item.contentId || item._id;
    if (item.type === "movie") {
      setLocation(`/movie/${id}`);
    } else if (item.type === "drama" || item.contentType === "drama") {
      setLocation(`/drama/${id}/episode/1`);
    } else {
      setLocation(`/show/${id}`);
    }
  };

  const handleRemove = (item: any) => {
    const contentType = item.type === "movie" ? "movie" : item.type === "drama" ? "drama" : "show";
    toggleWishlist(
      { contentId: item.contentId || item.id, contentType: contentType as any },
      { onSuccess: () => refetch() }
    );
  };

  const handleSignOut = () => {
    localStorage.removeItem("appUser");
    localStorage.removeItem("appAccessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("ott_active_profile");
    setLocation("/login");
    window.location.reload();
  };

  return (
    <div className="min-h-screen text-foreground flex flex-col bg-[#030306]">
      <PublicHeader
        activeTab="home"
        setActiveTab={(tab) => {
          if (tab === "home") setLocation("/");
          else if (tab === "movies") setLocation("/browse/movies");
          else if (tab === "tvshows") setLocation("/tv-shows-browse");
          else setLocation(`/browse/${tab}`);
        }}
        onSignIn={() => setLocation("/login")}
        onSignOut={handleSignOut}
        user={user}
      />

      <div className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 lg:px-14 pt-28 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setLocation("/")}
              className="flex items-center justify-center w-8 h-8 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-2">
              <Bookmark className="w-5 h-5 text-primary" />
              <h1 className="text-foreground font-black text-2xl tracking-tight">My Wishlist</h1>
            </div>
          </div>
          {wishlistItems.length > 0 && (
            <span className="text-foreground/70 text-sm font-semibold">
              {wishlistItems.length} {wishlistItems.length === 1 ? "title" : "titles"}
            </span>
          )}
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-10 h-10 animate-spin text-primary" />
            <p className="text-foreground/70 text-sm mt-3 font-medium">Loading your wishlist…</p>
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="text-center py-24 bg-white/[0.02] border border-white/5 rounded-2xl p-8">
            <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
              <Bookmark className="w-8 h-8 text-foreground/65" />
            </div>
            <h3 className="text-foreground font-bold text-lg mb-2">Your wishlist is empty</h3>
            <p className="text-foreground/70 text-sm max-w-sm mx-auto mb-6">
              Tap the bookmark icon on any movie or drama to save it here and watch later.
            </p>
            <button
              onClick={() => setLocation("/")}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-white font-extrabold rounded-xl text-sm transition-all shadow-lg shadow-primary/30"
            >
              Explore Content
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {wishlistItems.map((item: any) => {
              const imgSrc = getImageUrl(item.poster || item.posterImage || item.thumbnail || "");
              const typeBadge = item.type === "movie" ? "MOVIE" : item.type === "drama" ? "DRAMA" : "SERIES";
              return (
                <div key={item.id} className="relative group cursor-pointer">
                  {/* Card */}
                  <div
                    className="relative rounded-xl overflow-hidden bg-zinc-900 group-hover:ring-2 group-hover:ring-primary/40 transition-all duration-300"
                    style={{ aspectRatio: "2/3" }}
                    onClick={() => handlePlay(item)}
                  >
                    <img
                      src={imgSrc}
                      alt={item.title || ""}
                      className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
                      onError={(e) => {
                        const el = e.target as HTMLImageElement;
                        el.style.display = "none";
                      }}
                    />
                    {/* Gradient */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent pointer-events-none" />

                    {/* Type badge */}
                    <div className="absolute top-2 left-2">
                      <span className="text-[9px] font-black tracking-widest px-1.5 py-0.5 rounded bg-black/60 text-white/80 uppercase">
                        {typeBadge}
                      </span>
                    </div>

                    {/* Play + Remove overlay */}
                    <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button
                        onClick={(e) => { e.stopPropagation(); handlePlay(item); }}
                        className="w-10 h-10 rounded-full bg-white/90 hover:bg-white text-black flex items-center justify-center shadow-lg transition-all hover:scale-105"
                      >
                        <Play className="w-4 h-4 fill-black ml-0.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(item); }}
                        disabled={isRemoving}
                        className="w-10 h-10 rounded-full bg-red-600/90 hover:bg-red-600 text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 disabled:opacity-50"
                        title="Remove from wishlist"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Title */}
                    <div className="absolute bottom-0 left-0 right-0 p-2.5">
                      <p className="text-foreground text-xs font-bold leading-tight line-clamp-2">{item.title}</p>
                      {item.year && <p className="text-foreground/70 text-[10px] mt-0.5">{item.year}</p>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <PublicFooter />
    </div>
  );
}
