import { useState, useMemo } from 'react';
import { useLocation } from 'wouter';
import {
  Calendar,
  Film,
  Tv,
  Clapperboard,
  Bell,
  Search,
  Plus,
  Play,
  Trash2,
  Edit2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Layers,
  Eye,
  Loader2,
  Clock,
  X,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  useGetAdminUpcomingList,
  useGetAdminUpcomingCandidates,
  useSetAdminUpcoming,
  getImageUrl,
} from '@/lib/api-client';

type Tab = 'all' | 'movies' | 'tvshows' | 'dramas';

export default function UpcomingManagementPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  const [activeTab, setActiveTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');
  const [trailerFilter, setTrailerFilter] = useState<'all' | 'has_trailer' | 'no_trailer'>('all');

  // Modals state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [candidateSearch, setCandidateSearch] = useState('');
  const [candidateType, setCandidateType] = useState<string>('all');
  const [selectedCandidateReleaseDate, setSelectedCandidateReleaseDate] = useState<Record<string, string>>({});
  const [previewTrailerUrl, setPreviewTrailerUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState('');

  // Queries & Mutations
  const { data: upcomingRes, isLoading, refetch } = useGetAdminUpcomingList();
  const { data: candidatesRes, isLoading: candidatesLoading } = useGetAdminUpcomingCandidates(candidateSearch);
  const setUpcomingMutation = useSetAdminUpcoming();

  const upcomingData = upcomingRes?.data || { items: [], counts: {} };
  const items: any[] = upcomingData.items || [];
  const counts = upcomingData.counts || {
    total: 0,
    movies: 0,
    tvShows: 0,
    dramas: 0,
    totalReminders: 0,
    draftCount: 0,
  };

  // Filtered items for display
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      // Tab filter
      if (activeTab === 'movies' && item.type !== 'movie') return false;
      if (activeTab === 'tvshows' && item.type !== 'series') return false;
      if (activeTab === 'dramas' && item.type !== 'drama') return false;

      // Status filter
      if (statusFilter === 'draft' && item.status !== 'draft') return false;
      if (statusFilter === 'published' && item.status !== 'published') return false;

      // Trailer filter
      if (trailerFilter === 'has_trailer' && !item.hasTrailer) return false;
      if (trailerFilter === 'no_trailer' && item.hasTrailer) return false;

      // Search
      if (search.trim()) {
        const q = search.toLowerCase();
        const matchesTitle = item.title?.toLowerCase().includes(q);
        const matchesDesc = item.description?.toLowerCase().includes(q);
        if (!matchesTitle && !matchesDesc) return false;
      }

      return true;
    });
  }, [items, activeTab, statusFilter, trailerFilter, search]);

  // Candidates filtered for Add Modal
  const candidateItems: any[] = useMemo(() => {
    const list: any[] = candidatesRes?.data || [];
    if (candidateType === 'all') return list;
    return list.filter((c) => c.contentType === candidateType || c.type === candidateType);
  }, [candidatesRes?.data, candidateType]);

  const handleToggleUpcoming = (item: any, isUpcoming: boolean) => {
    setUpcomingMutation.mutate(
      { id: item.id || item._id, type: item.type, isUpcoming },
      {
        onSuccess: () => {
          toast({
            title: isUpcoming ? 'Added to Upcoming' : 'Removed from Upcoming',
            description: `"${item.title}" upcoming status updated.`,
          });
          refetch();
        },
        onError: (err: any) => {
          toast({
            title: 'Error',
            description: err?.message || 'Failed to update upcoming status',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const handleAddCandidate = (candidate: any) => {
    const relDate = selectedCandidateReleaseDate[candidate.id];
    setUpcomingMutation.mutate(
      {
        id: candidate.id,
        type: candidate.type,
        isUpcoming: true,
        releaseDate: relDate || undefined,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Title Added to Upcoming',
            description: `"${candidate.title}" is now visible in the app Upcoming section.`,
          });
          refetch();
        },
        onError: (err: any) => {
          toast({
            title: 'Error',
            description: err?.message || 'Failed to add title to upcoming',
            variant: 'destructive',
          });
        },
      }
    );
  };

  const getEditPath = (item: any) => {
    const id = item.id || item._id;
    if (item.type === 'movie') return `/movies/${id}/edit`;
    if (item.type === 'series') return `/tv-shows/${id}/edit`;
    return `/short-dramas/${id}/edit`;
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-foreground tracking-tight">Upcoming Releases</h1>
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-bold">
              Mobile App Feed
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Manage upcoming Movies, TV Shows, and Short Dramas. Titles saved in <strong>Draft</strong> with trailers can be marked Upcoming to show in app with Remind Me buttons.
          </p>
        </div>

        <Button
          onClick={() => setAddModalOpen(true)}
          className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20"
        >
          <Plus className="h-4 w-4 mr-2" /> Add to Upcoming
        </Button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Total Upcoming</p>
          <p className="text-2xl font-black text-foreground mt-1">{counts.total || 0}</p>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            <Sparkles className="w-3 h-3 text-amber-500" /> Active in app
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Upcoming Movies</p>
          <p className="text-2xl font-black text-blue-500 mt-1">{counts.movies || 0}</p>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            <Film className="w-3 h-3 text-blue-500" /> Feature Films
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Upcoming TV Shows</p>
          <p className="text-2xl font-black text-purple-500 mt-1">{counts.tvShows || 0}</p>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            <Tv className="w-3 h-3 text-purple-500" /> Episodic Series
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Short Dramas</p>
          <p className="text-2xl font-black text-emerald-500 mt-1">{counts.dramas || 0}</p>
          <span className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
            <Clapperboard className="w-3 h-3 text-emerald-500" /> Reels / Vertical
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Saved in Draft</p>
          <p className="text-2xl font-black text-amber-500 mt-1">{counts.draftCount || 0}</p>
          <span className="text-[10px] text-amber-500/80 font-medium flex items-center gap-1 mt-1">
            <Clock className="w-3 h-3" /> Pre-release drafts
          </span>
        </div>

        <div className="bg-card border border-border p-4 rounded-xl shadow-sm">
          <p className="text-xs text-muted-foreground font-medium">Total Reminders</p>
          <p className="text-2xl font-black text-primary mt-1">{counts.totalReminders || 0}</p>
          <span className="text-[10px] text-primary/80 font-medium flex items-center gap-1 mt-1">
            <Bell className="w-3 h-3" /> User Remind Me
          </span>
        </div>
      </div>

      {/* Tabs & Filters Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-muted/60 dark:bg-zinc-900/40 p-2.5 rounded-xl border border-border">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-background dark:bg-zinc-950 p-1 rounded-lg border border-border/50">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'all'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            All Upcoming ({counts.total || 0})
          </button>

          <button
            onClick={() => setActiveTab('movies')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'movies'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Film className="w-3.5 h-3.5" /> Movies ({counts.movies || 0})
          </button>

          <button
            onClick={() => setActiveTab('tvshows')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'tvshows'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Tv className="w-3.5 h-3.5" /> TV Shows ({counts.tvShows || 0})
          </button>

          <button
            onClick={() => setActiveTab('dramas')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-xs font-bold transition-all ${
              activeTab === 'dramas'
                ? 'bg-primary text-primary-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            }`}
          >
            <Clapperboard className="w-3.5 h-3.5" /> Short Dramas ({counts.dramas || 0})
          </button>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-[200px]">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search upcoming..."
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>

          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger className="h-8 text-xs w-[125px] bg-background">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="draft">Drafts Only</SelectItem>
              <SelectItem value="published">Published</SelectItem>
            </SelectContent>
          </Select>

          <Select value={trailerFilter} onValueChange={(v: any) => setTrailerFilter(v)}>
            <SelectTrigger className="h-8 text-xs w-[130px] bg-background">
              <SelectValue placeholder="Trailer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Trailers</SelectItem>
              <SelectItem value="has_trailer">With Trailer</SelectItem>
              <SelectItem value="no_trailer">Missing Trailer</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content List */}
      {isLoading ? (
        <div className="text-center py-20 bg-card border border-border rounded-xl">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary mb-3" />
          <p className="text-sm text-muted-foreground">Loading upcoming titles...</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-card border border-dashed border-border rounded-xl">
          <Calendar className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
          <h3 className="text-base font-bold text-foreground">No upcoming titles found</h3>
          <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
            {search || statusFilter !== 'all' || trailerFilter !== 'all'
              ? 'No titles match your active filters. Try clearing filters or searching for something else.'
              : 'You have not added any titles to Upcoming yet. Click "Add to Upcoming" to pick movies or dramas (including drafts with trailers) to show in the mobile app!'}
          </p>
          <Button onClick={() => setAddModalOpen(true)} className="mt-4" size="sm">
            <Plus className="w-4 h-4 mr-1.5" /> Add First Upcoming Title
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-border rounded-xl overflow-hidden shadow-sm flex flex-col hover:border-primary/40 transition-all group"
            >
              {/* Banner / Poster Preview Header */}
              <div className="relative aspect-[16/9] w-full bg-zinc-900 overflow-hidden">
                <img
                  src={getImageUrl(item.bannerImage || item.posterImage || item.thumbnail)}
                  alt={item.title}
                  className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  onError={(e: any) => {
                    e.currentTarget.src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800&q=80';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                {/* Top Badges */}
                <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                  <Badge
                    className={`text-[10px] font-bold uppercase tracking-wider ${
                      item.type === 'movie'
                        ? 'bg-blue-600 text-white'
                        : item.type === 'series'
                        ? 'bg-purple-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {item.type === 'movie' ? 'Movie' : item.type === 'series' ? 'TV Show' : 'Short Drama'}
                  </Badge>

                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${
                      item.isDraft
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {item.isDraft ? 'In Draft' : 'Published'}
                  </Badge>
                </div>

                {/* Trailer Play Pill if trailer exists */}
                {item.hasTrailer ? (
                  <button
                    onClick={() => {
                      setPreviewTrailerUrl(item.trailerUrl);
                      setPreviewTitle(item.title);
                    }}
                    className="absolute bottom-2.5 left-2.5 flex items-center gap-1.5 px-2.5 py-1 bg-black/70 hover:bg-red-600 text-white text-xs font-semibold rounded-lg backdrop-blur-md transition-all shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" /> Preview Trailer
                  </button>
                ) : (
                  <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 px-2 py-0.5 bg-zinc-900/80 text-amber-400 text-[10px] rounded-md backdrop-blur-sm border border-amber-500/20">
                    <AlertCircle className="w-3 h-3" /> No trailer added
                  </div>
                )}

                {/* Reminder Count Badge */}
                <div className="absolute bottom-2.5 right-2.5 flex items-center gap-1 px-2 py-0.5 bg-black/60 text-white text-xs font-bold rounded-lg backdrop-blur-sm border border-white/10">
                  <Bell className="w-3 h-3 text-primary" /> {item.reminderCount || 0}
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="font-bold text-foreground text-base tracking-tight truncate">{item.title}</h3>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                    <span className="flex items-center gap-1 text-primary font-semibold">
                      <Calendar className="w-3.5 h-3.5" />
                      {item.releaseDateFormatted}
                    </span>
                    {item.genres?.length > 0 && (
                      <>
                        <span>•</span>
                        <span className="truncate">{item.genres.slice(0, 2).join(', ')}</span>
                      </>
                    )}
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-2 mt-2">
                    {item.shortDescription || item.description || 'No description provided.'}
                  </p>
                </div>

                {/* Card Actions Footer */}
                <div className="pt-4 mt-3 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={item.isUpcoming}
                      onCheckedChange={(checked) => handleToggleUpcoming(item, checked)}
                      className="data-[state=checked]:bg-primary"
                    />
                    <span className="text-xs font-medium text-foreground">
                      {item.isUpcoming ? 'Live in App' : 'Hidden'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      onClick={() => setLocation(getEditPath(item))}
                      title="Edit content details"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-red-400 hover:text-red-500 hover:bg-red-500/10"
                      onClick={() => handleToggleUpcoming(item, false)}
                      title="Remove from Upcoming"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add To Upcoming Modal */}
      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-2xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Add Title to Upcoming
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Select any Movie, TV Show, or Short Drama. Titles in <strong>Draft</strong> with trailers will show in the mobile app's upcoming feed.
            </p>
          </DialogHeader>

          {/* Search & Filter within Modal */}
          <div className="flex items-center gap-2 pt-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={candidateSearch}
                onChange={(e) => setCandidateSearch(e.target.value)}
                placeholder="Search titles by name..."
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>

            <Select value={candidateType} onValueChange={setCandidateType}>
              <SelectTrigger className="h-8 text-xs w-[140px]">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="movie">Movies</SelectItem>
                <SelectItem value="series">TV Shows</SelectItem>
                <SelectItem value="drama">Short Dramas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Candidates List */}
          <div className="max-h-[360px] overflow-y-auto space-y-2 pr-1 mt-2">
            {candidatesLoading ? (
              <div className="text-center py-10">
                <Loader2 className="w-6 h-6 animate-spin mx-auto text-primary" />
                <p className="text-xs text-muted-foreground mt-2">Fetching titles...</p>
              </div>
            ) : candidateItems.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-border rounded-lg">
                <p className="text-xs text-muted-foreground">No candidate titles found.</p>
              </div>
            ) : (
              candidateItems.map((candidate) => (
                <div
                  key={candidate.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40 hover:bg-muted/70 transition-colors gap-3"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <img
                      src={getImageUrl(candidate.posterImage || candidate.thumbnail)}
                      alt={candidate.title}
                      className="w-12 h-16 object-cover rounded-md bg-zinc-800 flex-shrink-0"
                      onError={(e: any) => {
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=200&q=80';
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-sm text-foreground truncate">{candidate.title}</p>
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 py-0 capitalize"
                        >
                          {candidate.type === 'movie' ? 'Movie' : candidate.type === 'series' ? 'TV Show' : 'Short Drama'}
                        </Badge>
                        <Badge
                          className={`text-[9px] px-1.5 py-0 ${
                            candidate.status === 'draft'
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}
                        >
                          {candidate.status === 'draft' ? 'Draft' : 'Published'}
                        </Badge>
                      </div>

                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1">
                        {candidate.hasTrailer ? (
                          <span className="text-emerald-400 flex items-center gap-1 font-medium">
                            <CheckCircle2 className="w-3 h-3" /> Trailer Ready
                          </span>
                        ) : (
                          <span className="text-amber-400/80 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> No Trailer
                          </span>
                        )}

                        <span className="flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {candidate.releaseDate
                            ? new Date(candidate.releaseDate).toLocaleDateString()
                            : 'No release date'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Add action */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Input
                      type="date"
                      value={selectedCandidateReleaseDate[candidate.id] || ''}
                      onChange={(e) =>
                        setSelectedCandidateReleaseDate((prev) => ({
                          ...prev,
                          [candidate.id]: e.target.value,
                        }))
                      }
                      className="h-8 text-xs w-32 bg-background"
                      placeholder="Release date"
                    />
                    <Button
                      size="sm"
                      onClick={() => handleAddCandidate(candidate)}
                      disabled={setUpcomingMutation.isPending}
                      className="h-8 text-xs font-bold"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" /> Add
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Trailer Preview Dialog */}
      <Dialog open={!!previewTrailerUrl} onOpenChange={() => setPreviewTrailerUrl(null)}>
        <DialogContent className="max-w-3xl bg-black border-zinc-800 p-2">
          <DialogHeader className="p-3 pb-1">
            <DialogTitle className="text-white text-sm font-bold flex items-center justify-between">
              <span>{previewTitle} — Trailer Preview</span>
              <button
                onClick={() => setPreviewTrailerUrl(null)}
                className="text-zinc-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </DialogTitle>
          </DialogHeader>

          <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
            {previewTrailerUrl && (() => {
              const ytMatch = previewTrailerUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))([\w-]{11})/);
              if (ytMatch) {
                return (
                  <iframe
                    src={`https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&rel=0`}
                    title="YouTube trailer player"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="w-full h-full border-0"
                  />
                );
              }
              return (
                <video
                  src={getImageUrl(previewTrailerUrl)}
                  controls
                  autoPlay
                  className="w-full h-full object-contain"
                />
              );
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
