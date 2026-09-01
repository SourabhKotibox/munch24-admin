import { useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGetContentList, useCreateEpisode } from "@/lib/api-client";
import MediaPicker from "@/components/MediaPicker";

export default function SeasonForm() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const search = useSearch();
  const searchParams = new URLSearchParams(search);
  const queryContentId = searchParams.get("contentId") || "";

  const isShortDrama = window.location.pathname.startsWith("/short-drama-seasons");

  const [showId, setShowId] = useState(queryContentId);
  const [seasonNumber, setSeasonNumber] = useState("1");
  const [description, setDescription] = useState("");
  const [posterUrl, setPosterUrl] = useState("");
  const [posterPickerOpen, setPosterPickerOpen] = useState(false);
  const [isFree, setIsFree] = useState(false);

  const { data: showsData, isLoading: loadingShows } = useGetContentList({
    contentType: isShortDrama ? "drama" : "series",
    limit: 100
  });
  const createEpisodeMutation = useCreateEpisode();

  const tvShows: any[] = showsData?.data || [];

  const handleSave = async () => {
    if (!showId) {
      toast({ title: isShortDrama ? "Please select a Short Drama" : "Please select a TV Show", variant: "destructive" });
      return;
    }
    if (!seasonNumber || parseInt(seasonNumber) < 1) {
      toast({ title: "Season number must be at least 1", variant: "destructive" });
      return;
    }

    try {
      // Creating a "season" means creating the first placeholder episode in that season
      await createEpisodeMutation.mutateAsync({
        contentId: showId,
        season: parseInt(seasonNumber),
        episode: 1,
        title: `Season ${seasonNumber} - Episode 1`,
        description,
        thumbnail: posterUrl || undefined,
        isFree,
        isLocked: !isFree,
      });
      toast({ title: `Season ${seasonNumber} created! Add more episodes from the Episodes section.` });
      setLocation(isShortDrama ? "/short-drama-seasons" : "/seasons");
    } catch (error: any) {
      toast({ title: "Failed to create season", description: error?.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-5 pb-8 max-w-2xl">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => setLocation("/dashboard")} className="hover:text-foreground transition-colors">Dashboard</button>
        <span>/</span>
        <button onClick={() => setLocation(isShortDrama ? "/short-drama-seasons" : "/seasons")} className="hover:text-foreground transition-colors">
          {isShortDrama ? "Short Drama Seasons" : "Seasons"}
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">New Season</span>
      </div>

      <button
        onClick={() => setLocation(isShortDrama ? "/short-drama-seasons" : "/seasons")}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
      >
        «&nbsp;Back
      </button>

      <div className="rounded-xl border border-border bg-card p-6 space-y-6">
        <p className="text-base font-semibold text-foreground">Season Details</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-1.5">
            <Label className="text-foreground text-sm font-medium">
              {isShortDrama ? "Short Drama" : "TV Show"} <span className="text-primary">*</span>
            </Label>
            <Select value={showId} onValueChange={setShowId} disabled={loadingShows}>
              <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg text-sm">
                <SelectValue placeholder={loadingShows ? "Loading shows…" : (isShortDrama ? "Select a Short Drama" : "Select a TV Show")} />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                {tvShows.length === 0 ? (
                  <SelectItem value="_none" disabled>
                    {isShortDrama ? "No short dramas found. Create one first." : "No TV shows found. Create one first."}
                  </SelectItem>
                ) : (
                  tvShows.map((show) => (
                    <SelectItem key={show._id} value={show._id}>{show.title}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-foreground text-sm font-medium">
              Season Number <span className="text-primary">*</span>
            </Label>
            <Input
              type="number"
              min="1"
              placeholder="e.g. 1"
              value={seasonNumber}
              onChange={(e) => setSeasonNumber(e.target.value)}
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-10 rounded-lg text-sm"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-foreground text-sm font-medium">Season Description</Label>
          <Textarea
            placeholder="Brief description of this season..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="bg-muted border-border text-foreground placeholder:text-muted-foreground rounded-lg text-sm resize-none"
          />
        </div>

        {/* Poster image */}
        <div className="space-y-2">
          <Label className="text-foreground text-sm font-medium">Season Poster</Label>
          {posterUrl ? (
            <div className="group relative inline-block">
              <img src={posterUrl} alt="Poster" className="h-40 w-28 rounded-lg object-cover border border-border" />
            </div>
          ) : null}
          <div>
            <Button type="button" variant="outline" size="sm" onClick={() => setPosterPickerOpen(true)} className="gap-2">
              {posterUrl ? "Change Poster" : "Pick Poster from Library"}
            </Button>
          </div>
          <MediaPicker
            open={posterPickerOpen}
            onClose={() => setPosterPickerOpen(false)}
            onSelect={(media) => { setPosterUrl(media.filePath || media.url); setPosterPickerOpen(false); }}
            source={isShortDrama ? "short-drama" : "tv-show"}
            accept="image/*"
          />
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/20">
          <div>
            <p className="text-sm font-medium text-foreground">Free Season</p>
            <p className="text-xs text-muted-foreground mt-0.5">Episodes will be free to watch</p>
          </div>
          <Switch checked={isFree} onCheckedChange={setIsFree} className="data-[state=checked]:bg-primary" />
        </div>
      </div>

      <p className="text-xs text-foreground/65">
        Creating a season will add the first episode stub. You can add more episodes from the Episodes section.
      </p>

      <div className="flex justify-end gap-3">
        <Button variant="outline" onClick={() => setLocation(isShortDrama ? "/short-drama-seasons" : "/seasons")} className="border-border">Cancel</Button>
        <Button
          onClick={handleSave}
          disabled={createEpisodeMutation.isPending || !showId}
          className="bg-primary hover:bg-primary/90 text-white h-11 px-10 rounded-lg font-semibold text-sm gap-2"
        >
          {createEpisodeMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Create Season
        </Button>
      </div>
    </div>
  );
}
