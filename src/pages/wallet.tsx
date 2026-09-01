import { useState } from "react";
import { Link } from "wouter";
import {
  useGetWalletData, useGetCoinPackages,
  useCreateWalletRazorpayOrder, useVerifyWalletRazorpayPayment,
  openRazorpayCheckout,
  useGetRewardStatus, useClaimDailyReward,
  useGetPublicRewardDefinitions, useClaimRewardById,
  useDeleteTransaction, useClearTransactions,
} from "@/lib/api-client";
import { useSettings } from "@/contexts/SettingsContext";
import {
  Coins, ArrowLeft, Plus, Check, X, Loader2, Shield, Zap, Wallet,
  ArrowUpRight, ArrowDownLeft, RefreshCw, Clock, Gift, CreditCard,
  Star, Trophy, Share2, UserCheck, ChevronRight, BadgeCheck, Sparkles,
  Lock, TrendingUp, Eye, Trash2,
} from "lucide-react";

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
   COIN PACKAGE CARD
   ═══════════════════════════════════════════════════════════════════════════════ */
function PackageCard({ pkg, loading, onBuy, currency }: { pkg: any; loading: boolean; onBuy: (pkg: any) => void; currency: { symbol: string; position: 'before' | 'after'; decimals: number } }) {
  const isPopular = pkg.label === "Most Popular" || pkg.label === "Best Deal";
  
  const formatPrice = (price: number) => {
    const p = price.toFixed(currency.decimals);
    return currency.position === 'before' ? `${currency.symbol}${p}` : `${p} ${currency.symbol}`;
  };

  return (
    <button
      id={`coin-pkg-${pkg._id || pkg.id}`}
      onClick={() => onBuy(pkg)}
      disabled={loading}
      className={`relative group rounded-2xl border-2 transition-all duration-300 overflow-hidden text-left disabled:opacity-60 disabled:cursor-not-allowed hover:-translate-y-1 hover:shadow-xl ${
        isPopular
          ? "border-primary/50 bg-gradient-to-b from-primary/8 to-primary/3 hover:border-primary hover:shadow-primary/15"
          : "border-border/60 bg-gradient-to-b from-card to-card/80 hover:border-muted-foreground/30 hover:shadow-foreground/5"
      }`}
    >
      {pkg.label && (
        <div className={`w-full text-center py-1 text-[9px] font-black uppercase tracking-wider ${
          isPopular ? "bg-primary text-white" : "bg-muted text-muted-foreground"
        }`}>
          {pkg.label}
        </div>
      )}
      <div className="px-3 py-4 flex flex-col items-center gap-2">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center relative ${
          isPopular ? "bg-primary/15" : "bg-muted/80"
        }`}>
          <Coins className={`w-6 h-6 ${isPopular ? "text-primary" : "text-foreground/70"}`} />
          {pkg.bonusCoins > 0 && (
            <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center shadow-sm">
              <Plus className="w-3 h-3 text-white" />
            </div>
          )}
        </div>
        <div className="text-center">
          <div className="flex items-baseline justify-center gap-0.5">
            <span className="text-2xl font-black text-foreground">{pkg.coins}</span>
            {pkg.bonusCoins > 0 && (
              <span className="text-emerald-500 text-xs font-black ml-0.5">+{pkg.bonusCoins}</span>
            )}
          </div>
          <p className="text-muted-foreground text-[10px] font-medium mt-0.5">coins</p>
        </div>
        <div className={`w-full text-center py-2 rounded-xl font-black text-sm mt-1 transition-colors ${
          isPopular
            ? "bg-primary text-white group-hover:bg-primary/90"
            : "bg-muted/80 text-foreground group-hover:bg-muted"
        }`}>
          {formatPrice(pkg.price)}
        </div>
      </div>
      {loading && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center rounded-2xl">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      )}
    </button>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   TRANSACTION TYPE HELPERS
   ═══════════════════════════════════════════════════════════════════════════════ */
const txLabel = (type: string): string => {
  const labels: Record<string, string> = {
    coin_topup: "Coin Purchase",
    episode_unlock: "Episode Unlock",
    subscription: "Subscription",
    gift: "Gift",
    daily_reward: "Daily Reward",
    reward_claim: "Reward Claimed",
  };
  return labels[type] ?? type.replace(/_/g, " ");
};

const txColor = (tx: any): string => {
  const isCredit = (tx.coins || 0) > 0 || tx.type === "coin_topup";
  return isCredit ? "text-emerald-500" : "text-red-400";
};

const txBgColor = (tx: any): string => {
  const type = tx.type || "";
  if (type === "coin_topup") return "bg-blue-500/10 text-blue-400";
  if (type === "episode_unlock") return "bg-orange-500/10 text-orange-400";
  if (type === "daily_reward" || type === "reward_claim") return "bg-amber-500/10 text-amber-400";
  if (type === "subscription") return "bg-purple-500/10 text-purple-400";
  return "bg-muted/50 text-muted-foreground";
};

const txIcon = (tx: any) => {
  const type = tx.type || "";
  if (type === "coin_topup") return <CreditCard className="w-4 h-4" />;
  if (type === "episode_unlock") return <Eye className="w-4 h-4" />;
  if (type === "daily_reward" || type === "reward_claim") return <Gift className="w-4 h-4" />;
  if (type === "subscription") return <BadgeCheck className="w-4 h-4" />;
  if ((tx.coins || 0) > 0) return <ArrowDownLeft className="w-4 h-4" />;
  return <ArrowUpRight className="w-4 h-4" />;
};

// Reward type icons + colors
const rewardMeta = (type: string) => {
  const map: Record<string, { icon: any; color: string; bg: string }> = {
    daily_login:      { icon: <Gift className="w-5 h-5" />,      color: "text-amber-400",   bg: "bg-amber-500/10" },
    signup:           { icon: <UserCheck className="w-5 h-5" />, color: "text-blue-400",    bg: "bg-blue-500/10" },
    watch_episodes:   { icon: <Star className="w-5 h-5" />,      color: "text-purple-400",  bg: "bg-purple-500/10" },
    share_content:    { icon: <Share2 className="w-5 h-5" />,    color: "text-cyan-400",    bg: "bg-cyan-500/10" },
    profile_complete: { icon: <Trophy className="w-5 h-5" />,    color: "text-emerald-400", bg: "bg-emerald-500/10" },
    custom:           { icon: <Sparkles className="w-5 h-5" />,  color: "text-pink-400",    bg: "bg-pink-500/10" },
  };
  return map[type] ?? { icon: <Gift className="w-5 h-5" />, color: "text-primary", bg: "bg-primary/10" };
};

/* ═══════════════════════════════════════════════════════════════════════════════
   MAIN PAGE
   ═══════════════════════════════════════════════════════════════════════════════ */
export default function WalletPage() {
  const { settings } = useSettings();
  const { data: walletData, isLoading: loadingWallet, refetch: refetchWallet } = useGetWalletData();
  const { data: packagesData, isLoading: loadingPackages } = useGetCoinPackages();
  const createOrderMutation = useCreateWalletRazorpayOrder();
  const verifyPaymentMutation = useVerifyWalletRazorpayPayment();
  const { data: rewardStatusData } = useGetRewardStatus();
  const claimDailyMutation = useClaimDailyReward();
  const { data: rewardDefinitions = [], isLoading: loadingRewards } = useGetPublicRewardDefinitions();
  const claimRewardMutation = useClaimRewardById();
  const deleteTransactionMutation = useDeleteTransaction();
  const clearTransactionsMutation = useClearTransactions();

  const [loadingPkgId, setLoadingPkgId] = useState<string | null>(null);
  const [claimingRewardId, setClaimingRewardId] = useState<string | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [claimedRewardIds, setClaimedRewardIds] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [tab, setTab] = useState<"topup" | "history" | "rewards">("rewards");

  const showToast = (msg: string, type: "success" | "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const balance = (walletData as any)?.data?.balance ?? (walletData as any)?.balance ?? 0;
  const packages: any[] = (packagesData as any)?.data || [];
  const transactions: any[] = (walletData as any)?.data?.transactions || [];
  const canClaimDaily = (rewardStatusData as any)?.canClaim ?? false;

  // Currency info
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

  // Count claimable rewards
  const claimableCount = (rewardDefinitions as any[]).filter(
    (r: any) => r.canClaim && !r.isClaimed && !claimedRewardIds.has(r._id || r.id)
  ).length;

  const handleClaimDaily = () => {
    if (claimDailyMutation.isPending) return;
    claimDailyMutation.mutate(undefined, {
      onSuccess: (data: any) => {
        if (data?.success) {
          showToast(`🎁 Claimed ${data.data?.coinsAwarded ?? ''} coins!`, "success");
          refetchWallet();
        } else {
          showToast(data?.message || "Failed to claim", "error");
        }
      },
      onError: (err: any) => showToast(err?.message || "Failed to claim", "error"),
    });
  };

  const handleClaimReward = (rewardId: string) => {
    if (claimingRewardId || claimedRewardIds.has(rewardId)) return;
    setClaimingRewardId(rewardId);
    claimRewardMutation.mutate(rewardId, {
      onSuccess: (data: any) => {
        if (data?.success) {
          showToast(`🎉 You earned ${data.data?.coinsAwarded ?? ''} coins!`, "success");
          setClaimedRewardIds(prev => new Set(prev).add(rewardId));
          refetchWallet();
        } else {
          showToast(data?.message || "Already claimed or unavailable", "error");
        }
        setClaimingRewardId(null);
      },
      onError: (err: any) => {
        showToast(err?.message || "Failed to claim reward", "error");
        setClaimingRewardId(null);
      },
    });
  };

  const handleDeleteTransaction = (txId: string) => {
    if (!window.confirm("Are you sure you want to delete this transaction from your history?")) return;
    setDeletingTxId(txId);
    deleteTransactionMutation.mutate(txId, {
      onSuccess: (data: any) => {
        if (data?.success) {
          showToast("Transaction deleted", "success");
          refetchWallet();
        } else {
          showToast(data?.message || "Failed to delete", "error");
        }
        setDeletingTxId(null);
      },
      onError: (err: any) => {
        showToast(err?.message || "Failed to delete", "error");
        setDeletingTxId(null);
      },
    });
  };

  const handleClearHistory = () => {
    if (!window.confirm("Are you sure you want to clear your entire transaction history?")) return;
    setIsClearing(true);
    clearTransactionsMutation.mutate(undefined, {
      onSuccess: (data: any) => {
        if (data?.success) {
          showToast("History cleared", "success");
          refetchWallet();
        } else {
          showToast(data?.message || "Failed to clear", "error");
        }
        setIsClearing(false);
      },
      onError: (err: any) => {
        showToast(err?.message || "Failed to clear", "error");
        setIsClearing(false);
      },
    });
  };


  const handleBuy = async (pkg: any) => {
    try {
      setLoadingPkgId(pkg._id || pkg.id);
      const orderRes: any = await createOrderMutation.mutateAsync({ packageId: pkg._id || pkg.id });
      if (!orderRes?.success || !orderRes?.order) throw new Error(orderRes?.error || "Failed to create order");

      openRazorpayCheckout({
        keyId: orderRes.keyId,
        orderId: orderRes.order.id,
        amount: orderRes.order.amount,
        currency: currency.code,
        name: settings.platformName || "StreamIT",
        description: `${pkg.coins + (pkg.bonusCoins || 0)} Coins`,
        onSuccess: async (response) => {
          try {
            const verifyRes: any = await verifyPaymentMutation.mutateAsync({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              packageId: pkg._id || pkg.id,
            });
            if (verifyRes?.success) {
              showToast(`✅ ${pkg.coins + (pkg.bonusCoins || 0)} coins added!`, "success");
              refetchWallet();
              setTab("history");
            } else {
              showToast(verifyRes?.error || "Payment verification failed", "error");
            }
          } catch {
            showToast("Payment received but coins not credited. Contact support.", "error");
          } finally {
            setLoadingPkgId(null);
          }
        },
        onDismiss: () => { showToast("Payment cancelled.", "error"); setLoadingPkgId(null); },
      });
    } catch (err: any) {
      showToast(err?.message || "Something went wrong.", "error");
      setLoadingPkgId(null);
    }
  };

  // ─── TAB CONFIG ──────────────────────────────────────────────────────────────
  const TABS = [
    { key: "rewards", icon: <Gift className="w-4 h-4" />, label: "Earn Free Coins", badge: claimableCount > 0 ? claimableCount : null },
    { key: "topup",   icon: <Plus className="w-4 h-4" />, label: "Buy Coins",    badge: null },
    { key: "history", icon: <Clock className="w-4 h-4" />, label: "History",   badge: transactions.length > 0 ? transactions.length : null },
  ];

  return (
    <div className="dark min-h-screen bg-background text-foreground font-sans">
      
      {/* ═════════════════════════════════════════════════════════════════════
          HEADER — Web-friendly top bar
          ═════════════════════════════════════════════════════════════════════ */}
      <header className="bg-background/80 backdrop-blur-2xl sticky top-0 z-50 border-b border-border/40">
        <div className="w-full mx-auto px-4 sm:px-8 lg:px-12 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/account" className="flex items-center justify-center w-8 h-8 rounded-full bg-muted hover:bg-muted/80 transition-colors group">
              <ArrowLeft className="w-4 h-4 text-foreground group-hover:-translate-x-0.5 transition-transform" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Wallet className="w-4 h-4 text-primary" />
              </div>
              <h1 className="text-foreground font-black text-lg tracking-tight">My Wallet</h1>
            </div>
          </div>
          <button onClick={() => refetchWallet()} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all active:scale-95">
            <RefreshCw className={`w-4 h-4 ${loadingWallet ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
      </header>

      <main className="w-full mx-auto px-4 sm:px-8 lg:px-12 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          
          {/* ═════════════════════════════════════════════════════════════════════
              LEFT COLUMN — Balance & Actions (4 cols on lg)
              ═════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* HERO BALANCE CARD */}
            <div className="relative rounded-3xl overflow-hidden shadow-2xl shadow-primary/5" style={{ minHeight: 180 }}>
              <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" />
              <div className="absolute inset-0 bg-gradient-to-tr from-primary/30 via-transparent to-blue-500/20" />
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.06),transparent_60%)]" />
              <div className="absolute -top-12 -right-12 w-48 h-48 bg-primary/20 rounded-full blur-3xl" />
              <div className="absolute -bottom-12 -left-12 w-40 h-40 bg-blue-500/20 rounded-full blur-3xl" />

              <div className="relative z-10 p-6 flex flex-col justify-between h-full">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center backdrop-blur-md border border-white/10">
                      <Wallet className="w-4 h-4 text-white" />
                    </div>
                    <span className="text-white/60 text-xs font-bold uppercase tracking-widest">Available Balance</span>
                  </div>
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 backdrop-blur-md">
                    <Shield className="w-3 h-3 text-emerald-300" />
                    <span className="text-emerald-300 text-[10px] font-black uppercase">Secured</span>
                  </div>
                </div>

                <div className="flex items-end justify-between">
                  <div className="flex items-baseline gap-2">
                    {loadingWallet ? (
                      <Loader2 className="w-10 h-10 animate-spin text-white/60" />
                    ) : (
                      <>
                        <span className="text-5xl font-black text-white leading-none tracking-tighter">
                          {balance.toLocaleString()}
                        </span>
                        <span className="text-white/40 text-lg font-bold mb-1">coins</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* DAILY REWARD CTA */}
            {canClaimDaily && (
              <button
                onClick={handleClaimDaily}
                disabled={claimDailyMutation.isPending}
                className="w-full p-4 rounded-3xl bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-red-500/10 border border-amber-500/20 flex items-center justify-between group hover:border-amber-500/40 hover:shadow-lg hover:shadow-amber-500/5 transition-all active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
                    <Gift className="w-6 h-6 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="text-base font-black text-foreground">Daily Reward</p>
                    <p className="text-xs font-medium text-amber-500/80">Claim your free coins now!</p>
                  </div>
                </div>
                {claimDailyMutation.isPending ? (
                  <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                ) : (
                  <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-black shadow-md shadow-amber-500/20 group-hover:shadow-lg transition-shadow">
                    Claim
                  </div>
                )}
              </button>
            )}

            {/* Navigation Tabs (Vertical on desktop) */}
            <div className="bg-card/50 border border-border/40 rounded-3xl p-2 mt-6">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key as any)}
                  className={`w-full flex items-center justify-between p-3.5 rounded-2xl transition-all duration-200 mb-1 last:mb-0 ${
                    tab === t.key
                      ? "bg-background text-foreground shadow-sm border border-border/50"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${tab === t.key ? "bg-primary/10 text-primary" : "bg-transparent"}`}>
                      {t.icon}
                    </div>
                    <span className="font-bold text-sm">{t.label}</span>
                  </div>
                  {t.badge !== null && (
                    <span className={`min-w-[20px] h-[20px] flex items-center justify-center text-[10px] font-black rounded-full px-1.5 ${
                      tab === t.key
                        ? "bg-primary text-white"
                        : "bg-muted-foreground/20 text-muted-foreground"
                    }`}>
                      {t.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

          </div>

          {/* ═════════════════════════════════════════════════════════════════════
              RIGHT COLUMN — Content Area (8 cols on lg)
              ═════════════════════════════════════════════════════════════════════ */}
          <div className="lg:col-span-8">
            <div className="bg-card/30 border border-border/30 rounded-3xl p-6 min-h-[600px]">

              {/* ─── REWARDS ────────────────────────────────────────────────────── */}
              {tab === "rewards" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-start gap-4 p-4 bg-gradient-to-r from-amber-500/10 to-transparent border border-amber-500/20 rounded-2xl">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                      <Coins className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                      <h2 className="text-foreground text-sm font-bold">Complete Tasks, Earn Free Coins</h2>
                      <p className="text-muted-foreground text-xs mt-1 leading-relaxed">
                        Coins can be used to unlock premium episodes instantly. Complete the tasks below to fill up your wallet without spending money!
                      </p>
                    </div>
                  </div>

                  {loadingRewards ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-primary/60" />
                      <p className="text-muted-foreground text-sm font-medium">Loading available rewards...</p>
                    </div>
                  ) : rewardDefinitions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                      <Gift className="w-12 h-12 text-muted-foreground/20 mb-2" />
                      <p className="text-foreground font-bold text-lg">No rewards available yet</p>
                      <p className="text-muted-foreground text-sm">Check back later for new ways to earn coins.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(rewardDefinitions as any[]).map((reward: any) => {
                        const rid = reward._id || reward.id;
                        const isClaiming = claimingRewardId === rid;
                        const isAlreadyClaimed = reward.isClaimed || claimedRewardIds.has(rid);
                        const canClaimThis = reward.canClaim && !isAlreadyClaimed;
                        const isTaskIncomplete = !reward.canClaim && !isAlreadyClaimed;
                        const meta = rewardMeta(reward.type);

                        return (
                          <div
                            key={rid}
                            className={`flex flex-col p-5 rounded-2xl border transition-all duration-300 ${
                              isAlreadyClaimed
                                ? "border-border/30 bg-card/20"
                                : canClaimThis
                                ? "border-primary/30 bg-card/60 hover:bg-card hover:border-primary/60 hover:shadow-xl hover:shadow-primary/5"
                                : "border-border/20 bg-card/10"
                            }`}
                          >
                            <div className="flex items-start gap-4 mb-4">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${
                                isAlreadyClaimed
                                  ? "bg-emerald-500/10 text-emerald-500"
                                  : isTaskIncomplete
                                  ? "bg-muted/50 text-muted-foreground/40"
                                  : `${meta.bg} ${meta.color}`
                              }`}>
                                {isAlreadyClaimed
                                  ? <Check className="w-6 h-6" />
                                  : isTaskIncomplete
                                  ? <Lock className="w-5 h-5" />
                                  : meta.icon}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h3 className={`text-base font-black truncate ${
                                  isAlreadyClaimed ? "text-foreground/40 line-through decoration-foreground/20" : "text-foreground"
                                }`}>
                                  {reward.title}
                                </h3>
                                <p className={`text-xs mt-1 line-clamp-2 ${
                                  isAlreadyClaimed ? "text-muted-foreground/40" : "text-muted-foreground"
                                }`}>
                                  {reward.description}
                                </p>
                              </div>
                            </div>

                            <div className="mt-auto pt-4 border-t border-border/40 flex items-end justify-between">
                              <div className="flex-1 pr-4">
                                {isTaskIncomplete && reward.progress !== undefined && reward.required !== undefined && (
                                  <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                      <span className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-wider">Progress</span>
                                      <span className="text-[10px] font-bold text-muted-foreground/60">
                                        {reward.progress} / {reward.required}
                                      </span>
                                    </div>
                                    <div className="w-full h-2 bg-muted/30 rounded-full overflow-hidden">
                                      <div
                                        className="h-full bg-primary/50 rounded-full transition-all duration-700 ease-out"
                                        style={{ width: `${Math.min((reward.progress / reward.required) * 100, 100)}%` }}
                                      />
                                    </div>
                                  </div>
                                )}
                                {reward.nextClaimTime && (
                                  <div className="flex items-center gap-1.5">
                                    <Clock className="w-3.5 h-3.5 text-muted-foreground/40" />
                                    <span className="text-[11px] font-semibold text-muted-foreground/60">
                                      Available: {new Date(reward.nextClaimTime).toLocaleString("en-IN", {
                                        hour: "2-digit", minute: "2-digit", day: "numeric", month: "short",
                                      })}
                                    </span>
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                                <div className={`flex items-center gap-1.5 text-lg font-black ${
                                  isAlreadyClaimed ? "text-foreground/20" : canClaimThis ? "text-foreground" : "text-foreground/40"
                                }`}>
                                  <span>+{reward.coinsReward}</span>
                                  <Coins className="w-4 h-4 opacity-60" />
                                </div>

                                {isAlreadyClaimed ? (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1.5 rounded-xl">
                                    <Check className="w-3.5 h-3.5" />
                                    Claimed
                                  </div>
                                ) : canClaimThis ? (
                                  <button
                                    onClick={() => handleClaimReward(rid)}
                                    disabled={isClaiming}
                                    className="px-5 py-1.5 rounded-xl text-xs font-black bg-primary text-white hover:bg-primary/90 transition-all active:scale-95 shadow-lg shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isClaiming ? <Loader2 className="w-4 h-4 animate-spin" /> : "Claim Now"}
                                  </button>
                                ) : (
                                  <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground/50 bg-muted/30 px-3 py-1.5 rounded-xl border border-border/50">
                                    <Lock className="w-3.5 h-3.5" />
                                    Locked
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── TOP UP ────────────────────────────────────────────────────── */}
              {tab === "topup" && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between pb-4 border-b border-border/40">
                    <div>
                      <h2 className="text-lg font-black text-foreground">Coin Packages</h2>
                      <p className="text-sm text-muted-foreground mt-1">Purchase coins securely using Razorpay.</p>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-muted/50 rounded-xl border border-border/50">
                      <Shield className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs font-bold text-muted-foreground">Secure Checkout</span>
                    </div>
                  </div>

                  {loadingPackages ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <Loader2 className="w-10 h-10 animate-spin text-primary/60" />
                      <p className="text-muted-foreground text-sm font-medium">Loading packages...</p>
                    </div>
                  ) : packages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3 text-center">
                      <Coins className="w-12 h-12 text-muted-foreground/20 mb-2" />
                      <p className="text-foreground font-bold text-lg">No packages available</p>
                      <p className="text-muted-foreground text-sm">Please check back later.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
                      {packages.map((pkg: any) => {
                        const pkgId = pkg._id || pkg.id;
                        return <PackageCard key={pkgId} pkg={pkg} loading={loadingPkgId === pkgId} onBuy={handleBuy} currency={currency} />;
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* ─── HISTORY ────────────────────────────────────────────────────── */}
              {tab === "history" && (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="flex items-center justify-between pb-6 mb-6 border-b border-border/40">
                    <div>
                      <h2 className="text-lg font-black text-foreground">Transaction History</h2>
                      <p className="text-sm text-muted-foreground mt-1">Your recent coin top-ups, claims, and spends.</p>
                    </div>
                    {transactions.length > 0 && (
                      <button
                        onClick={handleClearHistory}
                        disabled={isClearing}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-xs font-bold transition-colors border border-red-500/20 disabled:opacity-50"
                      >
                        {isClearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                        <span className="hidden sm:inline">{isClearing ? "Clearing..." : "Clear All"}</span>
                      </button>
                    )}
                  </div>

                  {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
                      <div className="w-20 h-20 rounded-3xl bg-muted/30 flex items-center justify-center border border-border/50">
                        <Clock className="w-10 h-10 text-muted-foreground/30" />
                      </div>
                      <div>
                        <p className="text-foreground font-bold text-lg">No transactions yet</p>
                        <p className="text-muted-foreground text-sm mt-1 max-w-sm mx-auto">Your coin purchases and rewards history will appear here once you start using your wallet.</p>
                      </div>
                      <button
                        onClick={() => setTab("topup")}
                        className="mt-2 px-6 py-2.5 rounded-xl bg-primary text-white text-sm font-bold hover:bg-primary/90 transition-colors active:scale-95 shadow-lg shadow-primary/20"
                      >
                        Buy Coins
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2" style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(255,255,255,0.1) transparent" }}>
                      {transactions.map((tx: any, i: number) => {
                        const isCredit = (tx.coins || 0) > 0 || tx.type === "daily_reward" || tx.type === "reward_claim";
                        const hasMoney = (tx.amount || 0) > 0;
                        const txId = tx._id || tx.id;
                        const isDeleting = deletingTxId === txId;

                        return (
                          <div
                            key={txId || i}
                            className="group flex flex-col sm:flex-row sm:items-center gap-4 p-4 rounded-2xl bg-card/40 border border-border/40 hover:bg-card hover:border-border/80 transition-all shadow-sm hover:shadow-md"
                          >
                            <div className="flex items-center gap-4 flex-1">
                              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 ${txBgColor(tx)}`}>
                                {txIcon(tx)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-foreground text-sm font-bold">{txLabel(tx.type)}</p>
                                <div className="flex flex-wrap items-center gap-2 mt-1">
                                  <p className="text-muted-foreground text-[11px] font-medium">
                                    {new Date(tx.createdAt).toLocaleDateString("en-US", {
                                      day: "numeric", month: "short", year: "numeric",
                                      hour: "2-digit", minute: "2-digit",
                                    })}
                                  </p>
                                  {tx.referenceId && (
                                    <>
                                      <span className="w-1 h-1 rounded-full bg-border" />
                                      <p className="text-muted-foreground/50 text-[10px] font-mono tracking-wider truncate max-w-[120px]" title={tx.referenceId}>
                                        REF: {tx.referenceId.slice(-8)}
                                      </p>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between sm:justify-end gap-6 sm:pl-4 sm:border-l border-border/30">
                              <div className="flex flex-col items-start sm:items-end gap-1">
                                {tx.coins !== 0 && tx.coins !== undefined && (
                                  <div className={`flex items-center gap-1.5 font-black text-base ${txColor(tx)}`}>
                                    <span>{isCredit ? "+" : ""}{tx.coins}</span>
                                    <Coins className="w-3.5 h-3.5" />
                                  </div>
                                )}
                                {hasMoney && (
                                  <p className="text-muted-foreground/60 text-xs font-semibold">
                                    Paid {formatPrice(tx.amount)}
                                  </p>
                                )}
                              </div>
                              
                              <div className="flex items-center gap-3">
                                {tx.status && (
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg ${
                                    tx.status === "completed"
                                      ? "bg-emerald-500/10 text-emerald-500"
                                      : tx.status === "pending"
                                      ? "bg-amber-500/10 text-amber-500"
                                      : "bg-red-500/10 text-red-400"
                                  }`}>
                                    {tx.status}
                                  </span>
                                )}

                                {/* Delete Button */}
                                <button
                                  onClick={() => handleDeleteTransaction(txId)}
                                  disabled={isDeleting}
                                  className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/40 hover:text-red-400 hover:bg-red-500/10 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                                  title="Delete transaction"
                                >
                                  {isDeleting ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="w-4 h-4" />
                                  )}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}
