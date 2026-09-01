import { useState, useEffect, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { useSettings } from "@/contexts/SettingsContext";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useGetSubscriptionPlanById,
  useCreateSubscriptionPlan,
  useUpdateSubscriptionPlan,
  useGetPlanLimits,
  useCreatePlanLimit,
  useUpdatePlanLimit,
} from "@/lib/api-client";

const DURATION_OPTIONS = ["Day", "Week", "Month", "Year"];
const DEVICE_OPTIONS = ["mobile", "tablet", "tv", "desktop"];

const inputCls =
  "bg-muted border-border text-foreground placeholder:text-foreground/65 focus:border-primary h-11 rounded-lg text-sm";
const labelCls = "text-foreground text-sm font-medium";

export default function PlanFormPage() {
  const [, setLocation] = useLocation();
  const { id } = useParams<{ id?: string }>();
  const { settings } = useSettings();

  const formatCurrency = (val: number | string) => {
    const num = Number(val && typeof val === "string" ? val.replace(/[^0-9.-]+/g,"") : val) || 0;
    return settings?.currencyPosition === "before" 
      ? `${settings?.currencySymbol || '₹'}${num.toFixed(settings?.decimalPlaces ?? 2)}` 
      : `${num.toFixed(settings?.decimalPlaces ?? 2)} ${settings?.currencySymbol || '₹'}`;
  };
  const { toast } = useToast();

  const isEdit = !!id && id !== "new";

  const { data: planData } = useGetSubscriptionPlanById(isEdit ? id! : "");
  // Use list endpoint by planId — returns all limit fields, no need for a second fetch by limit ID
  const { data: planLimitsData } = useGetPlanLimits(isEdit ? { planId: id! } : undefined);

  const createPlan = useCreateSubscriptionPlan();
  const updatePlan = useUpdateSubscriptionPlan();
  const createLimit = useCreatePlanLimit();
  const updateLimit = useUpdatePlanLimit();

  // ─── Plan fields ────────────────────────────────────────────────────────────
  const [name, setName] = useState("");
  const [duration, setDuration] = useState("Month");
  const [durationValue, setDurationValue] = useState("1");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("0"); // percentage 0-100
  const [status, setStatus] = useState(true);
  const [description, setDescription] = useState("");
  const [level, setLevel] = useState("1");

  // ─── Limit fields ───────────────────────────────────────────────────────────
  const [videoCast, setVideoCast] = useState(false);
  const [ads, setAds] = useState(false);
  const [deviceLimit, setDeviceLimit] = useState(false);
  const [deviceLimitCount, setDeviceLimitCount] = useState("1");
  const [downloadStatus, setDownloadStatus] = useState(false);
  const [supportedDeviceType, setSupportedDeviceType] = useState(false);
  const [supportedDevices, setSupportedDevices] = useState<string[]>([]);
  const [profileLimit, setProfileLimit] = useState(false);
  const [profileLimitCount, setProfileLimitCount] = useState("1");
  const [q480p, setQ480p] = useState(false);
  const [q720p, setQ720p] = useState(false);
  const [q1080p, setQ1080p] = useState(false);
  const [q1440p, setQ1440p] = useState(false);
  const [q2k, setQ2k] = useState(false);
  const [q4k, setQ4k] = useState(false);

  const [saving, setSaving] = useState(false);

  // Live totalPrice: price * (1 - discount% / 100)
  const totalPrice = useMemo(() => {
    const p = parseFloat(price) || 0;
    const d = Math.max(0, Math.min(100, parseFloat(discount) || 0));
    return Math.round(p * (1 - d / 100) * 100) / 100;
  }, [price, discount]);

  // ─── Populate on edit ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!isEdit || !planData?.data) return;
    const p = planData.data;
    setName(p.name || "");
    setDuration(p.duration || "Month");
    setDurationValue(String(p.durationValue ?? 1));
    setPrice(p.price != null ? String(p.price) : "");
    setDiscount(p.discount != null ? String(p.discount) : "0");
    setStatus(p.status !== false);
    setDescription(p.description || "");
    setLevel(String(p.level ?? 1));
  }, [isEdit, planData]);

  useEffect(() => {
    if (!isEdit) return;
    const lim = planLimitsData?.data?.[0];
    if (!lim) return;
    setVideoCast(!!lim.videoCast);
    setAds(!!lim.ads);
    setDeviceLimit(!!lim.deviceLimit);
    setDeviceLimitCount(String(lim.deviceLimitCount ?? 1));
    setDownloadStatus(!!lim.downloadStatus);
    setSupportedDeviceType(!!lim.supportedDeviceType);
    setSupportedDevices(Array.isArray(lim.supportedDevices) ? lim.supportedDevices : []);
    setProfileLimit(!!lim.profileLimit);
    setProfileLimitCount(String(lim.profileLimitCount ?? 1));
    setQ480p(!!lim.q480p);
    setQ720p(!!lim.q720p);
    setQ1080p(!!lim.q1080p);
    setQ1440p(!!lim.q1440p);
    setQ2k(!!lim.q2k);
    setQ4k(!!lim.q4k);
  }, [isEdit, planLimitsData]);

  const toggleDevice = (device: string) =>
    setSupportedDevices((prev) =>
      prev.includes(device) ? prev.filter((d) => d !== device) : [...prev, device]
    );

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Plan name is required", variant: "destructive" });
      return;
    }
    if (!price || parseFloat(price) < 0) {
      toast({ title: "Valid price is required", variant: "destructive" });
      return;
    }
    const discountNum = parseFloat(discount) || 0;
    if (discountNum < 0 || discountNum > 100) {
      toast({ title: "Discount must be between 0 and 100%", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let planId = id;
      const planPayload = {
        name: name.trim(),
        duration,
        durationValue: parseInt(durationValue) || 1,
        price: parseFloat(price),
        discount: discountNum,   // percentage — backend recalculates totalPrice
        status,
        description: description.trim(),
        level: parseInt(level) || 1,
      };

      if (isEdit && planId) {
        await updatePlan.mutateAsync({ id: planId, data: planPayload });
      } else {
        const res = await createPlan.mutateAsync(planPayload);
        planId = res?.data?.id;
      }

      if (!planId) throw new Error("Failed to get plan ID");

      const limitPayload = {
        planId,
        videoCast,
        ads,
        deviceLimit,
        deviceLimitCount: parseInt(deviceLimitCount) || 1,
        downloadStatus,
        supportedDeviceType,
        supportedDevices,
        profileLimit,
        profileLimitCount: parseInt(profileLimitCount) || 1,
        q480p, q720p, q1080p, q1440p, q2k, q4k,
      };

      const existingLimit = planLimitsData?.data?.[0];
      if (isEdit && existingLimit?.id) {
        await updateLimit.mutateAsync({ id: existingLimit.id, data: limitPayload });
      } else if (!isEdit) {
        // Only create limit for new plans; update handled above
        await createLimit.mutateAsync(limitPayload);
      } else {
        // Edit but no limit exists yet — create one
        await createLimit.mutateAsync(limitPayload);
      }

      toast({ title: isEdit ? "Plan updated successfully!" : "Plan created successfully!" });
      setLocation("/plans");
    } catch (err: any) {
      toast({
        title: err?.message || `Failed to ${isEdit ? "update" : "create"} plan`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5 pb-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <button onClick={() => setLocation("/plans")} className="hover:text-foreground transition-colors">
          Dashboard
        </button>
        <span>/</span>
        <button onClick={() => setLocation("/plans")} className="hover:text-foreground transition-colors">
          Plans
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{isEdit ? "Edit Plan" : "New Plan"}</span>
      </div>

      {/* Back */}
      <button
        onClick={() => setLocation("/plans")}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-red-300 font-medium transition-colors"
      >
        <span className="text-base leading-none">«</span> Back
      </button>

      {/* ─── Plan Details ─── */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <p className="text-base font-semibold text-foreground">Plan Details</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {/* Name */}
          <div className="space-y-1.5">
            <Label className={labelCls}>
              Plan Name <span className="text-primary">*</span>
            </Label>
            <Input value={name} onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Premium Plan" className={inputCls} />
          </div>
          {/* Duration */}
          <div className="space-y-1.5">
            <Label className={labelCls}>
              Duration Type <span className="text-primary">*</span>
            </Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger className="bg-muted border-border text-foreground h-11 rounded-lg text-sm">
                <SelectValue placeholder="Select duration" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                {DURATION_OPTIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {/* Duration Value */}
          <div className="space-y-1.5">
            <Label className={labelCls}>
              Duration Value <span className="text-primary">*</span>
            </Label>
            <Input type="number" min="1" value={durationValue}
              onChange={(e) => setDurationValue(e.target.value)}
              placeholder="1" className={inputCls} />
          </div>
          {/* Level */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Level</Label>
            <Input type="number" min="1" value={level}
              onChange={(e) => setLevel(e.target.value)}
              placeholder="1" className={inputCls} />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 items-end">
          {/* Price */}
          <div className="space-y-1.5">
            <Label className={labelCls}>
              Price ({settings?.currencySymbol || '₹'}) <span className="text-primary">*</span>
            </Label>
            <Input type="number" min="0" step="0.01" value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00" className={inputCls} />
          </div>
          {/* Discount */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Discount (%)</Label>
            <Input type="number" min="0" max="100" step="0.01" value={discount}
              onChange={(e) => setDiscount(e.target.value)}
              placeholder="0" className={inputCls} />
            <p className="text-xs text-muted-foreground">Enter 0–100 (percentage)</p>
          </div>
          {/* Total Price — computed, read-only */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Total Price (after discount)</Label>
            <div className="h-11 px-4 rounded-lg border border-border bg-muted/50 flex items-center">
              <span className="text-foreground font-semibold text-base">
                {formatCurrency(totalPrice)}
              </span>
              {parseFloat(discount) > 0 && (
                <span className="ml-2 text-xs text-green-400 font-medium">
                  ({discount}% off)
                </span>
              )}
            </div>
          </div>
          {/* Status */}
          <div className="space-y-1.5">
            <Label className={labelCls}>Status</Label>
            <div className="h-11 px-4 rounded-lg border border-border bg-muted flex items-center justify-between">
              <span className="text-sm text-foreground font-medium">
                {status ? "Active" : "Inactive"}
              </span>
              <Switch checked={status} onCheckedChange={setStatus}
                className="data-[state=checked]:bg-primary" />
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label className={labelCls}>Description</Label>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)}
            placeholder="Write a description for this plan..."
            className="bg-muted border-border text-foreground placeholder:text-foreground/65 focus:border-primary rounded-lg resize-none text-sm"
            rows={3} />
        </div>
      </div>

      {/* ─── Plan Limits ─── */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <p className="text-base font-semibold text-foreground">Plan Limits</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Ads */}
          <LimitToggle label="Ads" description="Show advertisements to users on this plan"
            checked={ads} onChange={setAds} />

          {/* Download Status */}
          <LimitToggle label="Download Allowed" description="Allow offline downloads"
            checked={downloadStatus} onChange={setDownloadStatus} />

          {/* Device Limit */}
          <div className="space-y-2">
            <LimitToggle label="Device Limit" description="Limit simultaneous device logins"
              checked={deviceLimit} onChange={setDeviceLimit} />
            {deviceLimit && (
              <div className="flex items-center gap-3 pl-4">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">Max devices:</Label>
                <Input type="number" min="1" value={deviceLimitCount}
                  onChange={(e) => setDeviceLimitCount(e.target.value)}
                  className="w-24 bg-muted border-border text-foreground h-9 rounded-lg text-sm" />
              </div>
            )}
          </div>

          {/* Profile Limit */}
          <div className="space-y-2">
            <LimitToggle label="Profile Limit" description="Limit sub-profiles per account"
              checked={profileLimit} onChange={setProfileLimit} />
            {profileLimit && (
              <div className="flex items-center gap-3 pl-4">
                <Label className="text-sm text-muted-foreground whitespace-nowrap">Max profiles:</Label>
                <Input type="number" min="1" value={profileLimitCount}
                  onChange={(e) => setProfileLimitCount(e.target.value)}
                  className="w-24 bg-muted border-border text-foreground h-9 rounded-lg text-sm" />
              </div>
            )}
          </div>

          {/* Supported Device Type */}
          <div className="space-y-2 md:col-span-2">
            <LimitToggle label="Supported Device Types" description="Restrict which devices can access this plan"
              checked={supportedDeviceType} onChange={setSupportedDeviceType} />
            {supportedDeviceType && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted/40 rounded-lg border border-border">
                {DEVICE_OPTIONS.map((device) => (
                  <button key={device} type="button" onClick={() => toggleDevice(device)}
                    className={`px-4 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize ${
                      supportedDevices.includes(device)
                        ? "border-primary/70 bg-primary/25 text-red-300"
                        : "border-border bg-card text-muted-foreground hover:border-primary/40"
                    }`}>
                    {device}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Download Quality Options ─── */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5">
        <div>
          <p className="text-base font-semibold text-foreground">Download Quality Options</p>
          <p className="text-sm text-muted-foreground mt-0.5">
            Select which video qualities subscribers on this plan can download.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {([
            { state: q480p, setter: setQ480p, label: "480p" },
            { state: q720p, setter: setQ720p, label: "720p" },
            { state: q1080p, setter: setQ1080p, label: "1080p" },
            { state: q1440p, setter: setQ1440p, label: "1440p" },
            { state: q2k, setter: setQ2k, label: "2K" },
            { state: q4k, setter: setQ4k, label: "4K" },
          ] as const).map(({ state, setter, label }) => (
            <div key={label}
              className={`flex items-center justify-between h-12 px-4 rounded-lg border transition-colors cursor-pointer ${
                state
                  ? "border-primary/50 bg-primary/10"
                  : "border-border bg-card hover:border-primary/30"
              }`}
              onClick={() => setter(!state)}>
              <span className={`text-sm font-semibold ${state ? "text-red-300" : "text-foreground"}`}>
                {label}
              </span>
              <Switch checked={state} onCheckedChange={setter}
                className="data-[state=checked]:bg-primary" />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}
          className="bg-primary hover:bg-primary/90 text-white h-11 px-10 rounded-lg font-semibold text-sm min-w-[140px]">
          {saving ? "Saving..." : isEdit ? "Update Plan" : "Create Plan"}
        </Button>
      </div>
    </div>
  );
}

function LimitToggle({
  label, description, checked, onChange,
}: {
  label: string; description?: string; checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      className={`flex items-center justify-between px-4 py-3 rounded-lg border transition-colors cursor-pointer ${
        checked ? "border-primary/40 bg-primary/8" : "border-border bg-card hover:border-primary/25"
      }`}
      onClick={() => onChange(!checked)}
    >
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onChange}
        className="data-[state=checked]:bg-primary" />
    </div>
  );
}
