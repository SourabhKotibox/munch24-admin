import { useState, useEffect } from "react";
import { X, Crown, Check, Loader2, Sparkles, Flame, Play } from "lucide-react";
import { useSettings } from "@/contexts/SettingsContext";
import { useGetWebSubscriptionPlans, useCreateSubscriptionRazorpayOrder, useVerifySubscriptionRazorpayPayment } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

const loadRazorpay = () => {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

interface SubscriptionPlansModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribed?: () => void;
}

export default function SubscriptionPlansModal({ isOpen, onClose, onSubscribed }: SubscriptionPlansModalProps) {
  const { settings } = useSettings();
  const { toast } = useToast();
  const { data: plansData, isLoading: loadingPlans } = useGetWebSubscriptionPlans();
  const createOrderMutation = useCreateSubscriptionRazorpayOrder();
  const verifyPaymentMutation = useVerifySubscriptionRazorpayPayment();
  const [user, setUser] = useState<any>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const storedUser = localStorage.getItem("appUser");
      if (storedUser) setUser(JSON.parse(storedUser));
    } catch (e) {}
  }, [isOpen]);

  // Prevent background scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const plans = (plansData?.data || []).filter((p: any) => p.name !== "free");

  const handleSubscribe = async (plan: any) => {
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please login first to subscribe.",
        variant: "destructive",
      });
      window.location.href = "/login";
      return;
    }

    try {
      setSelectedPlanId(plan.id || plan._id);

      const orderData = await createOrderMutation.mutateAsync({
        planId: plan.id || plan._id,
        userId: user.id || user._id,
      });

      if (orderData.isFree) {
        // Free plan logic bypasses Razorpay popup
        const updatedUser = {
          ...user,
          subscriptionPlan: plan.name,
          subscriptionStatus: 'active'
        };
        localStorage.setItem("appUser", JSON.stringify(updatedUser));
        window.dispatchEvent(new Event("user-updated"));

        toast({
          title: "Subscription Successful",
          description: `Successfully subscribed to ${plan.name}! Full library unlocked.`,
        });
        if (onSubscribed) onSubscribed();
        onClose();
        return;
      }

      const res = await loadRazorpay();
      if (!res) {
        toast({ title: "Error", description: "Failed to load Razorpay SDK", variant: "destructive" });
        return;
      }

      const options = {
        key: orderData.keyId,
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: settings.platformName || "Platform",
        description: `Subscription - ${plan.name}`,
        order_id: orderData.order.id,
        handler: async function (response: any) {
          try {
            await verifyPaymentMutation.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: plan.id || plan._id,
              userId: user.id || user._id,
            });

            const updatedUser = {
              ...user,
              subscriptionPlan: plan.name,
              subscriptionStatus: 'active'
            };
            localStorage.setItem("appUser", JSON.stringify(updatedUser));
            window.dispatchEvent(new Event("user-updated"));

            toast({
              title: "Subscription Successful",
              description: `Successfully subscribed to ${plan.name}! Full library unlocked.`,
            });
            if (onSubscribed) onSubscribed();
            onClose();
          } catch (verifyError: any) {
            toast({
              title: "Verification Failed",
              description: verifyError?.message || "Payment verification failed",
              variant: "destructive",
            });
          }
        },
        prefill: {
          name: user.name,
          email: user.email,
        },
        theme: {
          color: settings.primaryColor || "#e50914",
        },
      };

      const paymentObject = new (window as any).Razorpay(options);
      paymentObject.open();

    } catch (err: any) {
      toast({
        title: "Subscription Failed",
        description: err?.message || "An error occurred during subscription.",
        variant: "destructive",
      });
    } finally {
      setSelectedPlanId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div 
        className="relative w-full max-w-4xl bg-[#09090e] border border-zinc-800 rounded-2xl overflow-hidden shadow-[0_0_50px_rgba(229,9,20,0.15)] transition-all transform duration-300 animate-in fade-in zoom-in-95"
        style={{ maxHeight: "90vh", display: "flex", flexDirection: "column" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-[#09090e]/90 backdrop-blur sticky top-0 z-25">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-amber-500 fill-amber-500 animate-pulse" />
            <h3 className="text-foreground font-extrabold text-lg sm:text-xl tracking-tight">Choose Your Premium Plan</h3>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-zinc-900 hover:bg-zinc-800 text-white/70 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-8">
          <p className="text-foreground/70 text-sm text-center max-w-lg mx-auto mb-8 leading-relaxed">
            Unlock unlimited access to the entire Xoto OTT library. Supercharge your streaming experience with crystal-clear 4K, Dolby Atmos, and zero ads.
          </p>

          {loadingPlans ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-foreground/65 text-xs">Loading plans...</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan: any) => {
                const isPremium = plan.name === "premium";
                const isStandard = plan.name === "standard";
                const isPopular = plan.isPopular || isStandard;

                return (
                  <div
                    key={plan.id || plan._id}
                    className={`relative rounded-2xl p-6 flex flex-col justify-between transition-all duration-300 border bg-zinc-950/40 hover:scale-[1.02] ${
                      isPopular 
                        ? "border-primary shadow-[0_0_30px_rgba(229,9,20,0.1)] md:-translate-y-2 bg-[#0d070b]/60" 
                        : "border-zinc-800 hover:border-zinc-700"
                    }`}
                  >
                    {/* Popular Badge */}
                    {isPopular && (
                      <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-wider rounded-full shadow-lg flex items-center gap-1">
                        <Flame className="w-3 h-3 fill-white animate-pulse" /> Popular
                      </span>
                    )}

                    {/* Plan Header */}
                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h4 className={`text-base font-black uppercase tracking-wide ${isPremium ? 'text-amber-400' : 'text-foreground'}`}>
                          {plan.name}
                        </h4>
                        {isPremium && <Sparkles className="w-4 h-4 text-amber-400" />}
                      </div>

                      {/* Plan Description */}
                      <p className="text-foreground/70 text-xs min-h-[36px] mb-4 leading-normal">
                        {plan.description}
                      </p>

                      {/* Plan Price */}
                      <div className="flex items-baseline gap-1 mt-1 mb-2">
                        <span className="text-3xl font-black text-foreground">{settings?.currencyPosition === 'before' ? (settings?.currencySymbol || '₹') + (plan.totalPrice ?? plan.price) : (plan.totalPrice ?? plan.price) + ' ' + (settings?.currencySymbol || '₹')}</span>
                        <span className="text-sm font-medium text-foreground/70">/ {plan.duration || 'month'}</span>
                      </div>

                      {/* Plan Features */}
                      <ul className="space-y-3 mb-8">
                        <li className="flex items-center gap-2.5 text-xs text-zinc-350">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>Access all premium content</span>
                        </li>
                        {plan.level >= 2 && (
                          <li className="flex items-center gap-2.5 text-xs text-zinc-350">
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                            <span>HD & 4K streaming quality</span>
                          </li>
                        )}
                        <li className="flex items-center gap-2.5 text-xs text-zinc-350">
                          <Check className="w-4 h-4 text-primary flex-shrink-0" />
                          <span>Valid for <strong className="text-foreground font-semibold">{plan.durationValue} {plan.duration}</strong></span>
                        </li>
                        {plan.discount > 0 && (
                          <li className="flex items-center gap-2.5 text-xs text-zinc-350">
                            <Check className="w-4 h-4 text-amber-400 flex-shrink-0" />
                            <span><strong className="text-amber-400">{plan.discount}% discount</strong> applied</span>
                          </li>
                        )}
                      </ul>
                    </div>

                    {/* Subscribe Button */}
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={createOrderMutation.isPending && selectedPlanId === (plan.id || plan._id)}
                      className={`w-full py-3 rounded-xl font-bold transition-all duration-300 text-sm tracking-wide active:scale-95 flex items-center justify-center gap-2 ${
                        isPopular
                          ? "bg-primary text-white hover:bg-primary/90 shadow-[0_8px_20px_rgba(229,9,20,0.3)]"
                          : "bg-zinc-800 text-foreground hover:bg-zinc-700 hover:text-foreground"
                      } disabled:opacity-50 disabled:pointer-events-none`}
                    >
                      {createOrderMutation.isPending && selectedPlanId === (plan.id || plan._id) ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Play className="w-3.5 h-3.5 fill-current" />
                          Subscribe Now
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
