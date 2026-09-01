import { useState } from "react";
import { Check, X, Clock, Film, Users, Tag, User as UserIcon, Search, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useGetPendingApprovals, useApproveMovie, useRejectMovie } from "@/lib/api-client";

interface PendingItem {
  _id: string;
  title: string;
  name?: string;
  type: 'movie' | 'genre' | 'actor' | 'director';
  status: string;
  createdAt: string;
  createdBy?: { name: string; email: string };
}

export default function ApprovalsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PendingItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const { data: pendingData, isLoading } = useGetPendingApprovals({ page: 1, limit: 50 });
  const pendingItems = pendingData?.data || [];
  const approveMutation = useApproveMovie();
  const rejectMutation = useRejectMovie();

  const handleApprove = async (item: PendingItem) => {
    try {
      await approveMutation.mutateAsync(item._id);
      toast({ title: `${item.type} approved successfully` });
    } catch (error: any) {
      toast({ title: error?.message || "Failed to approve", variant: "destructive" });
    }
  };

  const handleReject = (item: PendingItem) => {
    setSelectedItem(item);
    setIsRejectModalOpen(true);
  };

  const handleRejectSubmit = async () => {
    if (!selectedItem) return;
    
    try {
      await rejectMutation.mutateAsync({ id: selectedItem._id, reason: rejectionReason });
      setIsRejectModalOpen(false);
      setRejectionReason("");
      setSelectedItem(null);
      toast({ title: `${selectedItem.type} rejected successfully` });
    } catch (error: any) {
      toast({ title: error?.message || "Failed to reject", variant: "destructive" });
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'movie': return <Film className="h-4 w-4" />;
      case 'genre': return <Tag className="h-4 w-4" />;
      case 'actor': return <UserIcon className="h-4 w-4" />;
      case 'director': return <Users className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'movie': return 'bg-primary/10 text-primary';
      case 'genre': return 'bg-purple-500/10 text-purple-500';
      case 'actor': return 'bg-green-500/10 text-green-500';
      case 'director': return 'bg-orange-500/10 text-orange-500';
      default: return 'bg-gray-500/10 text-foreground/65';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Pending Approvals</h1>
              <p className="text-sm text-muted-foreground mt-1">Review and approve or reject content submissions</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="container mx-auto px-6 py-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by title or name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-muted border-border text-foreground"
            />
          </div>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-full md:w-48 bg-muted border-border text-foreground">
              <SelectValue placeholder="Filter by type" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-border text-foreground">
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="movie">Movies</SelectItem>
              <SelectItem value="genre">Genres</SelectItem>
              <SelectItem value="actor">Actors</SelectItem>
              <SelectItem value="director">Directors</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Pending Items List */}
      <div className="container mx-auto px-6 pb-6">
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-muted-foreground">Loading...</div>
          ) : pendingItems.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">No pending approvals</div>
          ) : (
            <div className="divide-y divide-border">
              {pendingItems.map((item: any) => (
                <div key={item._id} className="p-6 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className={`p-3 rounded-lg ${getTypeColor(item.type || 'movie')}`}>
                        {getTypeIcon(item.type || 'movie')}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-foreground">{item.title || item.name}</h3>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getTypeColor(item.type || 'movie')}`}>
                            {item.type || 'movie'}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          Submitted by {item.createdBy?.name || 'Unknown'} ({item.createdBy?.email || ''})
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(item.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleApprove(item)}
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleReject(item)}
                        className="border-primary text-primary hover:bg-primary hover:text-white"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-xl border border-border w-full max-w-md p-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Reject {selectedItem?.type}</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Please provide a reason for rejecting "{selectedItem?.title || selectedItem?.name}"
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              className="w-full min-h-[100px] p-3 rounded-lg border border-border bg-muted text-foreground resize-none"
            />
            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={() => {
                  setIsRejectModalOpen(false);
                  setRejectionReason("");
                  setSelectedItem(null);
                }}
                className="border-border text-foreground"
              >
                Cancel
              </Button>
              <Button
                onClick={handleRejectSubmit}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
