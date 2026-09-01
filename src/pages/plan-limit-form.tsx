
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  useGetSubscriptionPlans,
  useGetPlanLimitById,
  useCreatePlanLimit,
  useUpdatePlanLimit,
} from "@/lib/api-client";

const DEVICE_OPTIONS = ["mobile", "tablet", "tv", "desktop"];

const inputCls =
  "bg-card border-border text-foreground placeholder:text-muted-foreground/80 focus:border-primary h-11 rounded-lg";
const labelCls = "text-foreground text-sm font-medium";

export default function PlanLimitFormPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();

  const isEdit = !!params.id && params.id !== "new";

  const { data: plansData } = useGetSubscriptionPlans();
  const { data: existingLimitData } = useGetPlanLimitById(params.id || "");
  const createPlanLimit = useCreatePlanLimit();
  const updatePlanLimit = useUpdatePlanLimit();

  const plans = plansData?.data || [];

  const [form, setForm] = useState({
    planId: "",
    videoCast: false,
    ads: false,
    deviceLimit: false,
    deviceLimitCount: "1",
    downloadStatus: false,
    supportedDeviceType: false,
    supportedDevices: [] as string[],
    profileLimit: false,
    profileLimitCount: "1",
    q480p: false,
    q720p: false,
    q1080p: false,
    q1440p: false,
    q2k: false,
    q4k: false,
  });

  const [saving, setSaving] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (isEdit && existingLimitData?.data) {
      const limit = existingLimitData.data;
      setForm({
        planId: limit.planId,
        videoCast: limit.videoCast,
        ads: limit.ads,
        deviceLimit: limit.deviceLimit,
        deviceLimitCount: String(limit.deviceLimitCount),
        downloadStatus: limit.downloadStatus,
        supportedDeviceType: limit.supportedDeviceType,
        supportedDevices: limit.supportedDevices,
        profileLimit: limit.profileLimit,
        profileLimitCount: String(limit.profileLimitCount),
        q480p: limit.q480p,
        q720p: limit.q720p,
        q1080p: limit.q1080p,
        q1440p: limit.q1440p,
        q2k: limit.q2k,
        q4k: limit.q4k,
      });
    }
  }, [isEdit, existingLimitData]);

  const set = (key: string, value: any) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const toggleDevice = (device: string) => {
    if (form.supportedDevices.includes(device)) {
      set("supportedDevices", form.supportedDevices.filter((d) => d !== device));
    } else {
      set("supportedDevices", [...form.supportedDevices, device]);
    }
  };

  const handleSave = async () => {
    if (!form.planId) {
      toast({ title: "Plan is required", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const data = {
        planId: form.planId,
        videoCast: form.videoCast,
        ads: form.ads,
        deviceLimit: form.deviceLimit,
        deviceLimitCount: Number(form.deviceLimitCount),
        downloadStatus: form.downloadStatus,
        supportedDeviceType: form.supportedDeviceType,
        supportedDevices: form.supportedDevices,
        profileLimit: form.profileLimit,
        profileLimitCount: Number(form.profileLimitCount),
        q480p: form.q480p,
        q720p: form.q720p,
        q1080p: form.q1080p,
        q1440p: form.q1440p,
        q2k: form.q2k,
        q4k: form.q4k,
      };

      if (isEdit) {
        await updatePlanLimit.mutateAsync({ id: params.id!, data });
      } else {
        await createPlanLimit.mutateAsync(data);
      }

      toast({ title: isEdit ? "Plan limit updated successfully!" : "Plan limit created successfully!" });
      setLocation("/plan-limits");
    } catch (error) {
      toast({ title: `Failed to ${isEdit ? "update" : "create"} plan limit`, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const selectedPlan = plans.find((p: any) => String(p.id || p._id) === form.planId);

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <span
          className="text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
          onClick={() => setLocation("/plan-limits")}
        >
          Plan Limits
        </span>
        <span>/</span>
        <span className="text-foreground font-medium">{isEdit ? "Edit Plan Limit" : "New Plan Limit"}</span>
      </div>

      {/* Back */}
      <button
        onClick={() => setLocation("/plan-limits")}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-red-300 font-medium transition-colors"
      >
        <span className="text-base leading-none">«</span>
        Back
      </button>

      {/* Main Form Card */}
      <div className="rounded-xl border border-border bg-card/50 p-6 space-y-6">
        {/* Plan Name */}
        <div className="space-y-2">
          <Label className={labelCls}>
            Plan <span className="text-primary">*</span>
          </Label>
          <Select value={form.planId} onValueChange={(v) => set("planId", v)}>
            <SelectTrigger className="bg-card border-border text-foreground h-11 rounded-lg">
              <SelectValue placeholder="Select plan">
                {selectedPlan?.name}
              </SelectValue>
            </SelectTrigger>
            <SelectContent className="bg-muted border-border text-foreground">
              {plans.map((p: any) => (
                <SelectItem key={p.id || p._id} value={String(p.id || p._id)}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Plan Limits */}
      <div className="rounded-xl border border-border bg-card/50 p-6">
        <h3 className="text-base font-semibold text-foreground mb-5">Plan Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* Ads */}
          <div className="flex items-center justify-between h-12 px-4 rounded-lg border border-border bg-card">
            <span className="text-sm text-foreground font-medium">Ads</span>
            <Switch
              checked={form.ads}
              onCheckedChange={(v) => set("ads", v)}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Device Limit with count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between h-12 px-4 rounded-lg border border-border bg-card">
              <span className="text-sm text-foreground font-medium">Device Limit</span>
              <Switch
                checked={form.deviceLimit}
                onCheckedChange={(v) => set("deviceLimit", v)}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            {form.deviceLimit && (
              <Input
                type="number"
                min="1"
                value={form.deviceLimitCount}
                onChange={(e) => set("deviceLimitCount", e.target.value)}
                placeholder="Number of devices"
                className="bg-card border-border text-foreground focus:border-primary h-10 rounded-lg text-sm"
              />
            )}
          </div>

          {/* Download Status */}
          <div className="flex items-center justify-between h-12 px-4 rounded-lg border border-border bg-card">
            <span className="text-sm text-foreground font-medium">Download Status</span>
            <Switch
              checked={form.downloadStatus}
              onCheckedChange={(v) => set("downloadStatus", v)}
              className="data-[state=checked]:bg-primary"
            />
          </div>

          {/* Supported Device Type with options */}
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between h-12 px-4 rounded-lg border border-border bg-card">
              <span className="text-sm text-foreground font-medium">Supported Device Type</span>
              <Switch
                checked={form.supportedDeviceType}
                onCheckedChange={(v) => set("supportedDeviceType", v)}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            {form.supportedDeviceType && (
              <div className="flex flex-wrap gap-2 p-3 bg-muted rounded-lg border border-border">
                {DEVICE_OPTIONS.map((device) => (
                  <button
                    key={device}
                    type="button"
                    onClick={() => toggleDevice(device)}
                    className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-all ${
                      form.supportedDevices.includes(device)
                        ? "border-primary/60 bg-primary/20 text-red-300"
                        : "border-border bg-card text-muted-foreground hover:border-border"
                    }`}
                  >
                    {device}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Profile Limit with count */}
          <div className="space-y-2">
            <div className="flex items-center justify-between h-12 px-4 rounded-lg border border-border bg-card">
              <span className="text-sm text-foreground font-medium">Profile Limit</span>
              <Switch
                checked={form.profileLimit}
                onCheckedChange={(v) => set("profileLimit", v)}
                className="data-[state=checked]:bg-primary"
              />
            </div>
            {form.profileLimit && (
              <Input
                type="number"
                min="1"
                value={form.profileLimitCount}
                onChange={(e) => set("profileLimitCount", e.target.value)}
                placeholder="Number of profiles"
                className="bg-card border-border text-foreground focus:border-primary h-10 rounded-lg text-sm"
              />
            )}
          </div>
        </div>
      </div>

      {/* Download Quality Options */}
      <div className="rounded-xl border border-border bg-card/50 p-6">
        <h3 className="text-base font-semibold text-foreground mb-5">Download Quality Option</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { key: "q480p" as const, label: "480p" },
            { key: "q720p" as const, label: "720p" },
            { key: "q1080p" as const, label: "1080p" },
            { key: "q1440p" as const, label: "1440p" },
            { key: "q2k" as const, label: "2K" },
            { key: "q4k" as const, label: "4K" },
          ].map(({ key, label }) => (
            <div
              key={key}
              className="flex items-center justify-between h-12 px-4 rounded-lg border border-border bg-card"
            >
              <span className="text-sm text-foreground font-medium">{label}</span>
              <Switch
                checked={form[key]}
                onCheckedChange={(v) => set(key, v)}
                className="data-[state=checked]:bg-primary"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Save */}
      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-white h-11 px-10 rounded-lg font-semibold min-w-[120px]"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
