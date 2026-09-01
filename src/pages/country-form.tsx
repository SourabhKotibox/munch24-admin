import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useGetCountryById, useCreateCountry, useUpdateCountry } from "../lib/api-client";

const inputCls = "bg-card border-border text-foreground placeholder:text-muted-foreground/80 focus:border-primary h-11 rounded-lg";
const labelCls = "text-foreground text-sm font-medium";

export default function CountryFormPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();

  const isEdit = !!params.id && params.id !== "new";
  const { data: countryData } = useGetCountryById(isEdit ? params.id! : "");
  const createCountry = useCreateCountry();
  const updateCountry = useUpdateCountry();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [active, setActive] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (countryData?.data) {
      const d = countryData.data;
      setName(d.name || "");
      setCode(d.code || "");
      setActive(d.active !== false);
    }
  }, [countryData]);

  const handleSave = async () => {
    if (!name.trim()) { toast({ title: "Name is required", variant: "destructive" }); return; }
    if (!code.trim()) { toast({ title: "Country code is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const payload = { name: name.trim(), code: code.trim().toUpperCase(), active };
      if (isEdit) {
        await updateCountry.mutateAsync({ id: params.id!, data: payload });
        toast({ title: "Country updated successfully!" });
      } else {
        await createCountry.mutateAsync(payload);
        toast({ title: "Country created successfully!" });
      }
      setLocation("/countries");
    } catch (err: any) {
      toast({ title: err?.message || "Failed to save country", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <button onClick={() => setLocation("/countries")} className="text-foreground/65 hover:text-foreground transition-colors">
          Countries
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{isEdit ? "Edit Country" : "New Country"}</span>
      </div>

      <button
        onClick={() => setLocation("/countries")}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-red-300 font-medium transition-colors"
      >
        <span className="text-base leading-none">«</span> Back
      </button>

      <div className="rounded-xl border border-border bg-card/50 p-6 max-w-xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2 md:col-span-2">
            <Label className={labelCls}>Country Name <span className="text-primary">*</span></Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. South Korea"
              className={inputCls}
            />
          </div>
          <div className="space-y-2">
            <Label className={labelCls}>Country Code <span className="text-primary">*</span></Label>
            <Input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="e.g. KR"
              maxLength={3}
              className={inputCls + " font-mono uppercase"}
            />
            <p className="text-xs text-muted-foreground">ISO 3166-1 alpha-2 code (e.g. US, KR, IN)</p>
          </div>
          <div className="space-y-2">
            <Label className={labelCls}>Status</Label>
            <div className="flex items-center justify-between h-11 px-4 rounded-lg border border-border bg-card">
              <span className="text-sm text-foreground font-medium">Active</span>
              <Switch checked={active} onCheckedChange={setActive} className="data-[state=checked]:bg-primary" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary hover:bg-primary/90 text-white h-11 px-10 rounded-lg font-semibold min-w-[100px]"
        >
          {saving ? "Saving..." : "Save"}
        </Button>
      </div>
    </div>
  );
}
