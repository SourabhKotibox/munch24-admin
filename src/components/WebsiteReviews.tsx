import { useState } from "react";
import { Star, MessageSquare, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGetAppReviews, createAppReview, deleteAppReview } from "@/lib/api-client";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface WebsiteReviewsProps {
  user: any;
  onSignInRequired: () => void;
}

export function WebsiteReviews({ user, onSignInRequired }: WebsiteReviewsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data, isLoading } = useGetAppReviews(page);
  const reviews = data?.data || [];
  const stats = data?.stats || { averageRating: 0, totalReviews: 0 };
  const pagination = data?.pagination;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      onSignInRequired();
      return;
    }
    
    if (!comment.trim()) {
      toast({ title: "Please enter a comment", variant: "destructive" });
      return;
    }

    try {
      setIsSubmitting(true);
      await createAppReview({ rating, comment });
      toast({ title: "Review submitted successfully" });
      setComment("");
      setRating(5);
      queryClient.invalidateQueries({ queryKey: ["app-reviews"] });
    } catch (err: any) {
      toast({ title: "Failed to submit review", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (reviewId: string) => {
    if (!confirm("Are you sure you want to delete your review?")) return;
    try {
      await deleteAppReview(reviewId);
      toast({ title: "Review deleted" });
      queryClient.invalidateQueries({ queryKey: ["app-reviews"] });
    } catch (err: any) {
      toast({ title: "Failed to delete review", description: err.message, variant: "destructive" });
    }
  };

  const hasUserReviewed = reviews.some((r: any) => r.userId?._id === user?._id || r.userId === user?.id);

  return (
    <div className="w-full mt-10">
      <div className="flex items-center gap-3 mb-6">
        <MessageSquare className="w-6 h-6 text-primary" />
        <h2 className="text-2xl font-bold text-foreground">Experience Reviews & Ratings</h2>
      </div>

      <div className="bg-zinc-900/50 border border-white/10 rounded-xl p-6 mb-8">
        <div className="flex flex-col sm:flex-row gap-8">
          <div className="flex flex-col items-center justify-center min-w-[150px] p-4 bg-zinc-950/50 rounded-lg">
            <div className="text-4xl font-black text-foreground">{stats.averageRating.toFixed(1)}</div>
            <div className="flex items-center gap-1 my-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={`w-4 h-4 ${star <= Math.round(stats.averageRating) ? "fill-amber-400 text-amber-400" : "fill-zinc-700 text-foreground/80"}`}
                />
              ))}
            </div>
            <div className="text-sm text-foreground/80">{stats.totalReviews} {stats.totalReviews === 1 ? 'Review' : 'Reviews'}</div>
          </div>

          <div className="flex-1">
            {!hasUserReviewed ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-muted-foreground mb-2">Your Rating</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        className="p-1 transition-transform hover:scale-110"
                      >
                        <Star className={`w-6 h-6 ${star <= rating ? "fill-amber-400 text-amber-400" : "fill-zinc-700 text-foreground/80 hover:fill-amber-400/50 hover:text-amber-400/50"}`} />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <textarea
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder={user ? "Write your review about the website..." : "Please sign in to write a review"}
                    className="w-full bg-zinc-950/50 border border-white/10 rounded-lg p-3 text-foreground placeholder:text-foreground/80 focus:outline-none focus:border-primary/50 resize-none h-24"
                    disabled={!user}
                  />
                </div>
                <Button 
                  type="submit" 
                  disabled={!user || isSubmitting || !comment.trim()}
                  className="bg-primary text-white hover:bg-primary/90"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Submitting..." : "Submit Review"}
                </Button>
              </form>
            ) : (
              <div className="h-full flex items-center justify-center p-6 border border-dashed border-white/10 rounded-lg bg-zinc-950/30">
                <p className="text-foreground/80 font-medium">You have already reviewed the website experience. Thank you!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[1, 2].map(i => (
              <div key={i} className="bg-zinc-900/30 border border-white/5 rounded-lg p-5 h-32" />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div className="text-center py-10 bg-zinc-900/30 border border-white/5 rounded-lg">
            <MessageSquare className="w-10 h-10 text-foreground/80 mx-auto mb-3 opacity-50" />
            <p className="text-foreground/80 font-medium">No reviews yet. Be the first to review!</p>
          </div>
        ) : (
          <>
            {reviews.map((review: any) => (
              <div key={review._id} className="bg-zinc-900/40 border border-white/5 rounded-lg p-5 transition-colors hover:bg-zinc-900/60">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border border-white/10">
                      <AvatarImage src={review.userId?.avatar} />
                      <AvatarFallback className="bg-zinc-800 text-foreground/80">{review.userId?.name?.charAt(0) || "U"}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="text-sm font-bold text-foreground">{review.userId?.name || "User"}</h4>
                      <div className="text-xs text-muted-foreground">{new Date(review.createdAt).toLocaleDateString()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-0.5">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i < review.rating ? "fill-amber-400 text-amber-400" : "fill-zinc-800 text-muted-foreground"}`} />
                      ))}
                    </div>
                    {user && (review.userId?._id === user?._id || review.userId === user?.id) && (
                      <button 
                        onClick={() => handleDelete(review._id)}
                        className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-red-500/10 transition-colors"
                        title="Delete your review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-muted-foreground text-sm leading-relaxed">{review.comment}</p>
              </div>
            ))}
            
            {pagination?.totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="border-white/10 text-foreground hover:bg-white/5"
                >
                  Previous
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
                  disabled={page === pagination.totalPages}
                  className="border-white/10 text-foreground hover:bg-white/5"
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
