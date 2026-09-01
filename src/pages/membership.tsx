import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  useGetWebSubscriptionPlans,
  useCreateSubscriptionRazorpayOrder,
  useVerifySubscriptionRazorpayPayment,
  openRazorpayCheckout,
} from "@/lib/api-client";
import { useSettings } from "@/contexts/SettingsContext";
import {
  Crown, Check, ArrowLeft, Sparkles, Shield, Zap, Users, Download,
  Star, Lock, ChevronRight, Loader2, X, Wifi, Tv2, Smartphone, Globe
} from "lucide-react";

/* ═══════════════════════════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */
function getPlanFeatures(plan: any): { text: string; icon: any }[] {
  const name = (plan.name || "").toLowerCase();
  const features: { text: string; icon: any }[] = [];
  
  if (plan.maxDevices > 0) features.push({ text: `${plan.maxDevices} device${plan.maxDevices > 1 ? "s" : ""} at once`, icon: <Smartphone className="w-3.5 h-3.5" /> });
  if (plan.maxResolution) features.push({ text: `Up to ${plan.maxResolution} quality`, icon: <Tv2 className="w-3.5 h-3.5" /> });
  if (plan.downloadEnabled) features.push({ text: "Offline downloads", icon: <Download className="w-3.5 h-3.5" /> });
  if (plan.adFree) features.push({ text: "Ad-free streaming", icon: <Shield className="w-3.5 h-3.5" /> });
  if (name === "premium" || name === "vip") features.push({ text: "VIP exclusive content", icon: <Crown className="w-3.5 h-3.5" /> });
  
  if (features.length === 0) {
    if (name === "free") return [
      { text: "Free content access", icon: <Globe className="w-3.5 h-3.5" /> },
      { text: "Standard quality", icon: <Tv2 className="w-3.5 h-3.5" /> },
      { text: "Ad-supported", icon: <Zap className="w-3.5 h-3.5" /> }
    ];
    if (name === "basic") return [
      { text: "HD quality", icon: <Tv2 className="w-3.5 h-3.5" /> },
      { text: "1 screen", icon: <Smartphone className="w-3.5 h-3.5" /> },
      { text: "Ad-free", icon: <Shield className="w-3.5 h-3.5" /> }
    ];
    if (name === "standard") return [
      { text: "Full HD quality", icon: <Tv2 className="w-3.5 h-3.5" /> },
      { text: "2 screens", icon: <Users className="w-3.5 h-3.5" /> },
      { text: "Ad-free", icon: <Shield className="w-3.5 h-3.5" /> },
      { text: "Downloads", icon: <Download className="w-3.5 h-3.5" /> }
    ];
    if (name === "premium") return [
      { text: "4K + HDR", icon: <Star className="w-3.5 h-3.5" /> },
      { text: "4 screens", icon: <Users className="w-3.5 h-3.5" /> },
      { text: "Ad-free", icon: <Shield className="w-3.5 h-3.5" /> },
      { text: "Unlimited downloads", icon: <Download className="w-3.5 h-3.5" /> },
      { text: "VIP content", icon: <Crown className="w-3.5 h-3.5" /> }
    ];
  }
  return features;
}

function getPlanStyle(name: string) {
  const n = (name || "").toLowerCase();
  if (n === "premium") return { accent: "text-amber-400", check: "text-amber-400", bg: "bg-amber-500/10", border: "border-amber-500/30", glow: "from-amber-500/15", badge: "bg-amber-500/20 text-amber-300 border border-amber-500/30" };
  if (n === "standard") return { accent: "text-primary", check: "text-primary", bg: "bg-primary/10", border: "border-primary/30", glow: "from-primary/15", badge: "bg-primary text-white" };
  if (n === "basic") return { accent: "text-blue-400", check: "text-blue-400", bg: "bg-blue-500/10", border: "border-blue-500/30", glow: "from-blue-500/15", badge: "bg-blue-500/20 text-blue-300 border border-blue-500/30" };
  return { accent: "text-white/80", check: "text-white/60", bg: "bg-white/5", border: "border-white/10", glow: "from-white/3", badge: "bg-white/5 text-white/70 border border-white/10" };
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TOAST
   ═══════════════════════════════════════════════════════════════════════════════ */
function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  return (
    <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[999] flex items-center gap-3 px-5 py-3 rounded-2xl shadow-2xl border animate-in slide-in-from-bottom-4 duration-300 backdrop-blur-xl ${
      type === "success"
        ? "bg-emerald-950/95 border-emerald-500/30 text-emerald-200"
        : "bg-red-950/95 border-red-500/30 text-red-200"
    }`}>
      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
        type === "success" ? "bg-emerald-500/20" : "bg-red-500/20"
      }`}>
        {type === "success" ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
      </div>
      <span className="font-semibold text-sm">{msg}</span>
      <button onClick={onClose} className="ml-1 opacity-50 hover:opacity-100 transition-opacity">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function MembershipPage() {
  const [, setLocation] = useLocation();
  const { settings } = useSettings();
  const { data: plansData, isLoading } = useGetWebSubscriptionPlans();
  const createOrderMutation = useCreateSubscriptionRazorpayOrder();
  const verifyPaymentMutation = useVerifySubscriptionRazorpayPayment();

  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const plans: any[] = plansData?.data || plansData?.plans || [];
  const platformName = settings.platformName || "StreamIT";
  const user = (() => { try { return JSON.parse(localStorage.getItem("appUser") || "null"); } catch { return null; } })();

  // Currency Formatting
  const currency = {
    symbol: settings?.currencySymbol || "₹",
    position: settings?.currencyPosition || "before",
    decimals: settings?.decimalPlaces ?? 2,
    code: settings?.currencyCode || "INR",
  };

  const formatPrice = (price: number) => {
    const p = price.toFixed(currency.decimals);
    return currency.position === 'before' ? `${currency.symbol}${p}` : `${p} ${currency.symbol}`;
  };

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Pre-select first paid plan if none selected
  if (!selectedPlanId && plans.length > 0) {
    const paidPlan = plans.find((p: any) => (p.name || "").toLowerCase() !== "free");
    if (paidPlan) setSelectedPlanId(paidPlan._id || paidPlan.id);
    else setSelectedPlanId(plans[0]._id || plans[0].id);
  }

  const selectedPlan = plans.find((p: any) => (p._id || p.id) === selectedPlanId);

  const handlePurchase = async () => {
    if (!selectedPlanId || processing) return;
    setProcessing(true);
    try {
      const orderRes: any = await createOrderMutation.mutateAsync({ planId: selectedPlanId });
      
      if (orderRes?.success && orderRes?.isFree) {
        showToast("🎉 Free plan activated successfully!", "success");
        if (user) {
          localStorage.setItem("appUser", JSON.stringify({ ...user, subscriptionPlan: selectedPlan?.name || "free", subscriptionStatus: "active" }));
        }
        setTimeout(() => setLocation("/account"), 2000);
        return;
      }

      if (!orderRes?.success || !orderRes?.order) {
        showToast(orderRes?.error || "Payment gateway not configured. Contact support.", "error");
        setProcessing(false);
        return;
      }

      await openRazorpayCheckout({
        keyId: orderRes.keyId,
        orderId: orderRes.order.id,
        amount: orderRes.order.amount,
        currency: orderRes.order.currency || currency.code,
        name: platformName,
        description: `${selectedPlan?.name || "Subscription"} Plan`,
        prefill: { name: user?.name || "", email: user?.email || "" },
        theme: { color: "#E50000" },
        onSuccess: async (response) => {
          try {
            await verifyPaymentMutation.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              planId: selectedPlanId!,
            });
            showToast("🎉 Subscription activated! Welcome to VIP!", "success");
            if (user) {
              localStorage.setItem("appUser", JSON.stringify({ ...user, subscriptionPlan: selectedPlan?.name || "premium", subscriptionStatus: "active" }));
            }
            setTimeout(() => setLocation("/account"), 2000);
          } catch {
            showToast("Payment received but activation failed. Contact support.", "error");
          } finally { setProcessing(false); }
        },
        onDismiss: () => { showToast("Payment cancelled.", "error"); setProcessing(false); },
      });
    } catch (err: any) {
      showToast(err?.message || "Something went wrong.", "error");
      setProcessing(false);
    }
  };

  return (
    <div className="dark min-h-screen bg-background text-foreground font-sans">
      
      {/* Background Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-radial from-primary/10 to-transparent rounded-full blur-3xl opacity-50" />
        <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-gradient-radial from-amber-500/5 to-transparent rounded-full blur-3xl opacity-50" />
      </div>

      {/* ── Header ── */}
      <header className="bg-background/80 backdrop-blur-2xl sticky top-0 z-50 border-b border-border/40">
        <div className="w-full mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/account" className="flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-muted/80 transition-colors group">
              <ArrowLeft className="w-4 h-4 text-foreground group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
                <Crown className="w-4 h-4 text-amber-500" />
              </div>
              <h1 className="text-foreground font-black text-lg tracking-tight">VIP Subscription</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-8 lg:px-12 py-10 relative z-10">
        
        {/* Page Hero */}
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-black tracking-tight text-foreground mb-3">
            {settings?.vipTitle || "Unlock the"} <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">{settings?.vipHighlight || "Ultimate Experience"}</span>
          </h2>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto">
            {settings?.vipSubtitle || "Get unlimited ad-free streaming, offline downloads, and exclusive access to our premium catalog."}
          </p>
        </div>

        {/* Desktop Split Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* Left: Plan List */}
          <div className="lg:col-span-7">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary/60" />
                <p className="text-muted-foreground font-medium">Loading VIP plans...</p>
              </div>
            ) : plans.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3 text-center border border-border/40 rounded-3xl bg-card/30">
                <Lock className="w-12 h-12 text-muted-foreground/30 mb-2" />
                <p className="text-foreground font-bold text-lg">No plans available</p>
                <p className="text-muted-foreground text-sm">Please check back later.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {plans.map((plan: any) => {
                  const planId = plan._id || plan.id;
                  const isSelected = selectedPlanId === planId;
                  const style = getPlanStyle(plan.name);
                  const isFree = (plan.name || "").toLowerCase() === "free";
                  const isPopular = (plan.name || "").toLowerCase() === "standard";
                  const hasDiscount = plan.discount > 0 && !isPopular;
                  const features = getPlanFeatures(plan);

                  return (
                    <div
                      key={planId}
                      onClick={() => setSelectedPlanId(planId)}
                      className={`relative group cursor-pointer rounded-3xl border-2 transition-all duration-300 ${
                        isSelected
                          ? `border-primary bg-gradient-to-br ${style.glow} via-card to-card shadow-xl shadow-primary/10 scale-[1.02]`
                          : "border-border/40 bg-card/40 hover:border-border/80 hover:bg-card hover:shadow-lg"
                      }`}
                    >
                      <div className="p-5 md:p-6">
                        {/* Header Row */}
                        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-4">
                          
                          <div className="flex items-center gap-3">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                              isSelected ? "bg-primary text-white shadow-lg shadow-primary/40" : "bg-muted text-muted-foreground"
                            }`}>
                              {isSelected ? <Check className="w-3.5 h-3.5" /> : <div className="w-2 h-2 rounded-full bg-muted-foreground/30" />}
                            </div>
                            
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className={`font-black text-xl capitalize tracking-tight ${isSelected ? style.accent : "text-foreground"}`}>
                                  {plan.name}
                                </h3>
                                {isPopular && (
                                  <span className="px-2 py-0.5 rounded-md text-[10px] font-black uppercase bg-primary text-white tracking-widest shadow-sm">
                                    Popular
                                  </span>
                                )}
                                {hasDiscount && (
                                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black tracking-widest shadow-sm ${style.badge}`}>
                                    Save {plan.discount}%
                                  </span>
                                )}
                              </div>
                              {plan.description && (
                                <p className="text-muted-foreground text-xs mt-1">{plan.description}</p>
                              )}
                            </div>
                          </div>

                          {/* Price */}
                          <div className="text-left md:text-right pl-9 md:pl-0">
                            <div className="flex items-baseline md:justify-end gap-1.5">
                              <span className="text-2xl font-black text-foreground tracking-tight">
                                {isFree ? "Free" : formatPrice(plan.totalPrice)}
                              </span>
                              {!isFree && plan.durationLabel && (
                                <span className="text-muted-foreground text-xs font-semibold">
                                  / {plan.durationLabel}
                                </span>
                              )}
                            </div>
                            {!isFree && plan.durationValue > 1 && (
                              <p className="text-muted-foreground/60 text-[11px] font-semibold mt-0.5">
                                ≈ {formatPrice(plan.totalPrice / plan.durationValue)} per {plan.duration}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Features List */}
                        <div className="pl-9 grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-4">
                          {features.slice(0, 6).map((f, i) => (
                            <div key={i} className="flex items-center gap-2">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                                isSelected ? style.bg : "bg-muted"
                              }`}>
                                <div className={isSelected ? style.check : "text-muted-foreground/60"}>
                                  {f.icon}
                                </div>
                              </div>
                              <span className={`text-xs font-medium ${isSelected ? "text-foreground/90" : "text-muted-foreground"}`}>
                                {f.text}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right: Sticky Checkout Summary */}
          <div className="lg:col-span-5 relative">
            <div className="sticky top-24 bg-card/60 backdrop-blur-xl border border-border/50 rounded-3xl p-6 shadow-2xl shadow-black/5">
              
              <h3 className="text-lg font-black text-foreground mb-4 flex items-center gap-2">
                <Shield className="w-5 h-5 text-primary" />
                Checkout Summary
              </h3>

              {/* Selected Plan Details */}
              {selectedPlan ? (
                <div className="bg-background/50 rounded-2xl p-4 border border-border/40 mb-6">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-bold text-foreground capitalize text-base">{selectedPlan.name} Plan</h4>
                      <p className="text-muted-foreground text-xs">{selectedPlan.durationValue} {selectedPlan.duration} access</p>
                    </div>
                    <span className="font-black text-lg text-foreground">
                      {(selectedPlan.name || "").toLowerCase() === "free" ? "Free" : formatPrice(selectedPlan.totalPrice)}
                    </span>
                  </div>
                  
                  {(selectedPlan.discount > 0) && (
                    <div className="flex justify-between items-center mt-3 pt-3 border-t border-border/40">
                      <span className="text-emerald-500 text-xs font-bold">Discount applied</span>
                      <span className="text-emerald-500 text-xs font-bold">-{selectedPlan.discount}%</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-background/30 rounded-2xl p-4 border border-border/20 mb-6 text-center">
                  <p className="text-muted-foreground text-sm">Please select a plan from the list.</p>
                </div>
              )}

              {/* Trust Badges */}
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
                  <Lock className="w-4 h-4 text-emerald-500 mb-1.5" />
                  <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400">100% Secure Payment</span>
                </div>
                <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 text-center">
                  <Zap className="w-4 h-4 text-blue-500 mb-1.5" />
                  <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400">Instant Activation</span>
                </div>
              </div>

              {/* Purchase Button */}
              <button
                id="membership-purchase-btn"
                onClick={handlePurchase}
                disabled={!selectedPlanId || processing}
                className={`w-full h-14 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all duration-300 ${
                  selectedPlanId && !processing
                    ? "bg-gradient-to-r from-primary via-primary to-red-600 text-white shadow-xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-0.5 active:translate-y-0"
                    : "bg-muted text-muted-foreground/50 cursor-not-allowed"
                }`}
              >
                {processing ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /><span>Processing secure checkout...</span></>
                ) : selectedPlanId ? (
                  <>
                    <Crown className="w-5 h-5" />
                    <span>
                      {(selectedPlan?.name || "").toLowerCase() === "free"
                        ? "Activate Free Plan"
                        : `Pay ${formatPrice(selectedPlan?.totalPrice)} · Subscribe`}
                    </span>
                    <ChevronRight className="w-5 h-5" />
                  </>
                ) : (
                  <span>Select a Plan</span>
                )}
              </button>
              
              {/* Payment Partner Info */}
              <div className="flex items-center justify-center gap-2 mt-4 text-muted-foreground/60">
                <Shield className="w-3 h-3" />
                <span className="text-[10px] font-semibold tracking-wide uppercase">Secured by Razorpay</span>
              </div>
            </div>
          </div>

        </div>
      </main>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
