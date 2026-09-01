import { useEffect, useMemo, useState } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useCreateSubscription,
  useUpdateSubscription,
  useGetSubscriptionById,
  useGetSubscriptionPlans,
  useGetUsersList,
} from "@/lib/api-client";
import { useSettings } from "@/contexts/SettingsContext";

const inputCls =
  "bg-muted border-border text-foreground placeholder:text-foreground/65 focus:border-primary h-11 rounded-lg text-sm";
const labelCls = "text-foreground text-sm font-medium";

const addDuration = (start: string, dur: string, val: number): string => {
  const d = new Date(start);
  const v = Math.max(1, val);
  const n = dur.toLowerCase();
  if (n.includes("day")) d.setDate(d.getDate() + v);
  else if (n.includes("week")) d.setDate(d.getDate() + v * 7);
  else if (n.includes("year")) d.setFullYear(d.getFullYear() + v);
  else d.setMonth(d.getMonth() + v);
  return d.toISOString().split("T")[0];
};

export default function SubscriptionFormPage() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id?: string }>();
  const isEdit = !!id;
  const { toast } = useToast();
  const { settings } = useSettings();

  const { data: usersData } = useGetUsersList({ limit: 200 });
  const { data: plansData } = useGetSubscriptionPlans({ limit: 100 });
  const { data: subscriptionData } = useGetSubscriptionById(isEdit ? id! : "");
  const createSubscription = useCreateSubscription();
  const updateSubscription = useUpdateSubscription();

  const users: any[] = usersData?.data || [];
  const plans: any[] = plansData?.data || [];
  const subscription = subscriptionData?.data;

  // ─── form state ────────────────────────────────────────────────────────────
  const [userId, setUserId] = useState("");
  const [planId, setPlanId] = useState("");
  const [duration, setDuration] = useState("Month");
  const [durationValue, setDurationValue] = useState("1");
  const [paymentMethod, setPaymentMethod] = useState("-");
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [endDate, setEndDate] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("0");
  const [couponDiscount, setCouponDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [totalAmount, setTotalAmount] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Track whether user has manually overridden auto-calculated values
  const [endDateOverridden, setEndDateOverridden] = useState(false);
  const [totalOverridden, setTotalOverridden] = useState(false);

  // ─── Derived end date ──────────────────────────────────────────────────────
  const derivedEndDate = useMemo(
    () => addDuration(startDate, duration, parseInt(durationValue) || 1),
    [startDate, duration, durationValue]
  );

  // ─── Derived total ─────────────────────────────────────────────────────────
  const derivedTotal = useMemo(() => {
    const p = parseFloat(price) || 0;
    const d = parseFloat(discount) || 0;
    const cd = parseFloat(couponDiscount) || 0;
    const t = parseFloat(tax) || 0;
    return Math.max(0, p - d - cd + t).toFixed(2);
  }, [price, discount, couponDiscount, tax]);

  // ─── Sync auto-calculated values unless overridden ─────────────────────────
  useEffect(() => {
    if (!endDateOverridden) setEndDate(derivedEndDate);
  }, [derivedEndDate, endDateOverridden]);

  useEffect(() => {
    if (!totalOverridden) setTotalAmount(derivedTotal);
  }, [derivedTotal, totalOverridden]);

  // ─── Auto-fill plan details when plan is selected ─────────────────────────
  const handlePlanChange = (value: string) => {
    setPlanId(value);
    const plan = plans.find((p: any) => String(p.id || p._id) === value);
    if (plan) {
      setPrice(String(plan.totalPrice ?? plan.price ?? ""));
      setDuration(plan.duration || "Month");
      setDurationValue(String(plan.durationValue ?? 1));
      setTotalOverridden(false);
      setEndDateOverridden(false);
    }
  };

  // ─── Populate form when editing ───────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !subscription) return;
    setUserId(String(subscription.userId || ""));
    setPlanId(String(subscription.planId || ""));
    setDuration(subscription.duration || "Month");
    setDurationValue(String(subscription.durationValue ?? 1));
    setPaymentMethod(subscription.paymentMethod || "-");
    setStartDate(subscription.startDate || new Date().toISOString().split("T")[0]);
    setEndDate(subscription.endDate || "");
    setPrice(subscription.price != null ? String(subscription.price) : "");
    setDiscount(subscription.discount != null ? String(subscription.discount) : "0");
    setCouponDiscount(subscription.couponDiscount != null ? String(subscription.couponDiscount) : "0");
    setTax(subscription.tax != null ? String(subscription.tax) : "0");
    setTotalAmount(subscription.totalAmount != null ? String(subscription.totalAmount) : "");
    setStatus(subscription.status || "active");
    // Mark overrides so derived values don't stomp over fetched data
    setEndDateOverridden(true);
    setTotalOverridden(true);
  }, [isEdit, subscription]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) { toast({ title: "Please select a user", variant: "destructive" }); return; }
    if (!planId) { toast({ title: "Please select a plan", variant: "destructive" }); return; }
    if (!startDate) { toast({ title: "Start date is required", variant: "destructive" }); return; }

    setIsSubmitting(true);
    try {
      const data = {
        userId,
        planId,
        duration,
        durationValue: parseInt(durationValue) || 1,
        paymentMethod,
        startDate,
        endDate: endDate || derivedEndDate,
        price: parseFloat(price) || 0,
        discount: parseFloat(discount) || 0,
        couponDiscount: parseFloat(couponDiscount) || 0,
        tax: parseFloat(tax) || 0,
        totalAmount: parseFloat(totalAmount) || parseFloat(derivedTotal),
        status,
      };

      if (isEdit) {
        await updateSubscription.mutateAsync({ id: id!, data });
        toast({ title: "Subscription updated successfully" });
      } else {
        await createSubscription.mutateAsync(data);
        toast({ title: "Subscription created successfully" });
      }
      setLocation("/subscriptions");
    } catch (err: any) {
      toast({
        title: err?.message || `Failed to ${isEdit ? "update" : "create"} subscription`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => setLocation("/subscriptions")} className="hover:text-foreground transition-colors">
          Dashboard
        </button>
        <span>/</span>
        <button onClick={() => setLocation("/subscriptions")} className="hover:text-foreground transition-colors">
          Subscriptions
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">
          {isEdit ? "Edit Subscription" : "New Subscription"}
        </span>
      </div>

      <button onClick={() => setLocation("/subscriptions")}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-red-300 font-medium transition-colors">
        <span className="text-base leading-none">«</span> Back
      </button>

      <form onSubmit={handleSubmit}>
        <div className="rounded-xl border border-border bg-card p-6 space-y-5">
          <p className="text-base font-semibold text-foreground">Subscription Details</p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {/* User */}
            <div className="space-y-1.5">
              <Label className={labelCls}>
                User <span className="text-primary">*</span>
              </Label>
              <Select value={userId} onValueChange={setUserId}>
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select User" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground max-h-60">
                  {users.map((u: any) => (
                    <SelectItem key={u.id || u._id} value={String(u.id || u._id)}>
                      {u.name ? `${u.name} (${u.email})` : u.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Plan */}
            <div className="space-y-1.5">
              <Label className={labelCls}>
                Plan <span className="text-primary">*</span>
              </Label>
              <Select value={planId} onValueChange={handlePlanChange}>
                <SelectTrigger className={inputCls}>
                  <SelectValue placeholder="Select Plan" />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground max-h-60">
                  {plans.map((p: any) => (
                    <SelectItem key={p.id || p._id} value={String(p.id || p._id)}>
                      {p.name} — {settings?.currencyPosition === "before" ? `${settings?.currencySymbol || '₹'}${Number(p.totalPrice ?? p.price).toFixed(settings?.decimalPlaces ?? 2)}` : `${Number(p.totalPrice ?? p.price).toFixed(settings?.decimalPlaces ?? 2)} ${settings?.currencySymbol || '₹'}`} / {p.durationValue} {p.duration}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Status</Label>
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration Type */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Duration Type</Label>
              <Select value={duration} onValueChange={(v) => { setDuration(v); setEndDateOverridden(false); }}>
                <SelectTrigger className={inputCls}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-popover border-border text-foreground">
                  <SelectItem value="Day">Day</SelectItem>
                  <SelectItem value="Week">Week</SelectItem>
                  <SelectItem value="Month">Month</SelectItem>
                  <SelectItem value="Year">Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Duration Value */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Duration Value</Label>
              <Input type="number" min="1" value={durationValue}
                onChange={(e) => { setDurationValue(e.target.value); setEndDateOverridden(false); }}
                className={inputCls} />
            </div>

            {/* Payment Method */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Payment Method</Label>
              <Input type="text" value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                placeholder="e.g. Credit Card, PayPal, Stripe"
                className={inputCls} />
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <Label className={labelCls}>
                Start Date <span className="text-primary">*</span>
              </Label>
              <Input type="date" value={startDate}
                onChange={(e) => { setStartDate(e.target.value); setEndDateOverridden(false); }}
                className={inputCls} />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <Label className={labelCls}>End Date</Label>
              <Input type="date" value={endDate}
                onChange={(e) => { setEndDate(e.target.value); setEndDateOverridden(true); }}
                className={inputCls} />
              {!endDateOverridden && (
                <p className="text-xs text-muted-foreground">Auto-calculated from start date + duration</p>
              )}
            </div>

            {/* Price */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Price ({settings.currencySymbol})</Label>
              <Input type="number" min="0" step="0.01" value={price}
                onChange={(e) => { setPrice(e.target.value); setTotalOverridden(false); }}
                placeholder="0.00" className={inputCls} />
            </div>

            {/* Discount */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Discount ({settings.currencySymbol})</Label>
              <Input type="number" min="0" step="0.01" value={discount}
                onChange={(e) => { setDiscount(e.target.value); setTotalOverridden(false); }}
                placeholder="0.00" className={inputCls} />
            </div>

            {/* Coupon Discount */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Coupon Discount ({settings.currencySymbol})</Label>
              <Input type="number" min="0" step="0.01" value={couponDiscount}
                onChange={(e) => { setCouponDiscount(e.target.value); setTotalOverridden(false); }}
                placeholder="0.00" className={inputCls} />
            </div>

            {/* Tax */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Tax ({settings.currencySymbol})</Label>
              <Input type="number" min="0" step="0.01" value={tax}
                onChange={(e) => { setTax(e.target.value); setTotalOverridden(false); }}
                placeholder="0.00" className={inputCls} />
            </div>

            {/* Total Amount */}
            <div className="space-y-1.5">
              <Label className={labelCls}>Total Amount ({settings.currencySymbol})</Label>
              <div className="relative">
                <Input type="number" min="0" step="0.01" value={totalAmount}
                  onChange={(e) => { setTotalAmount(e.target.value); setTotalOverridden(true); }}
                  placeholder="0.00"
                  className={`${inputCls} font-semibold`} />
                {!totalOverridden && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-green-400 font-medium">
                    auto
                  </span>
                )}
              </div>
              {!totalOverridden && (
                <p className="text-xs text-muted-foreground">price − discount − coupon + tax</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end mt-5">
          <Button type="submit" disabled={isSubmitting}
            className="bg-primary hover:bg-primary/90 text-white h-11 px-10 rounded-lg font-semibold text-sm min-w-[160px]">
            {isSubmitting ? "Saving..." : isEdit ? "Update Subscription" : "Create Subscription"}
          </Button>
        </div>
      </form>
    </div>
  );
}
