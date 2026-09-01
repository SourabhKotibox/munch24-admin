import { useState } from 'react';
import { Search, Loader2, Film, Tv, Smartphone } from 'lucide-react';
import { useGetWebBrowse } from '@/lib/api-client';
import { PortraitCard } from '@/components/ContentCard';

interface SearchResultsProps {
  query: string;
  type?: 'movie' | 'show' | 'drama';
  onItemClick?: (item: any) => void;
}

export default function SearchResults({ query, type = 'movie', onItemClick }: SearchResultsProps) {
  const [activeType, setActiveType] = useState<'movie' | 'show' | 'drama'>(type);

  const { data: browseData, isLoading } = useGetWebBrowse({
    type: activeType,
    search: query.trim() || undefined,
    limit: 24,
  }, !!query.trim());

  const items: any[] = browseData?.items || [];

  const tabs = [
    { key: 'movie' as const, label: 'Movies', icon: <Film className="w-3.5 h-3.5" /> },
    { key: 'show' as const, label: 'TV Shows', icon: <Tv className="w-3.5 h-3.5" /> },
    { key: 'drama' as const, label: 'Short Drama', icon: <Smartphone className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="w-full">
      {/* Type filter */}
      <div className="flex items-center gap-2 mb-6">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveType(t.key)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              activeType === t.key
                ? 'bg-primary text-white'
                : 'bg-zinc-800/60 text-foreground/70 hover:bg-zinc-800 hover:text-foreground'
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {!query.trim() && (
        <div className="flex flex-col items-center justify-center py-16 text-foreground/65">
          <Search className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">Start typing to search titles...</p>
        </div>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      )}

      {!isLoading && query.trim() && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-foreground/65">
          <Search className="w-10 h-10 mb-3 opacity-20" />
          <p className="text-sm font-medium">No results found for "{query}"</p>
          <p className="text-xs text-muted-foreground/80 mt-1">Try a different keyword or check spelling.</p>
        </div>
      )}

      {!isLoading && items.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {items.map((item: any) => (
            <PortraitCard
              key={item.id || item._id}
              item={item}
              onClick={() => onItemClick?.(item)}
              size="md"
              fullWidth
            />
          ))}
        </div>
      )}
    </div>
  );
}
