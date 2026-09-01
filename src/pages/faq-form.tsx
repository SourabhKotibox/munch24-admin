
import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useGetFAQById, useCreateFAQ, useUpdateFAQ } from "../lib/api-client";

const labelCls = "text-foreground text-sm font-medium";

export default function FaqFormPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();

  const isEdit = !!params.id && params.id !== "new";
  const { data: faqData, isLoading } = useGetFAQById(params.id || "");
  const createFAQ = useCreateFAQ();
  const updateFAQ = useUpdateFAQ();

  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [status, setStatus] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (faqData?.data) {
      setQuestion(faqData.data.question || "");
      setAnswer(faqData.data.answer || "");
      setStatus(faqData.data.status ?? true);
    }
  }, [faqData]);

  if (isEdit && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-foreground/65">Loading FAQ details...</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!question.trim()) {
      toast({ title: "Question is required", variant: "destructive" });
      return;
    }
    if (!answer.trim()) {
      toast({ title: "Answer is required", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      if (isEdit) {
        await updateFAQ.mutateAsync({ id: params.id!, data: { question, answer, status } });
        toast({ title: "FAQ updated successfully!" });
      } else {
        await createFAQ.mutateAsync({ question, answer, status });
        toast({ title: "FAQ created successfully!" });
      }
      setLocation("/faq");
    } catch {
      toast({ title: isEdit ? "Failed to update FAQ" : "Failed to create FAQ", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">{isEdit ? "Edit FAQ" : "Add FAQ"}</span>
      </div>

      {/* Back */}
      <button
        onClick={() => setLocation("/faq")}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-red-300 font-medium transition-colors"
      >
        <span className="text-base leading-none">«</span>
        Back
      </button>

      {/* Form Card */}
      <div className="rounded-xl border border-border bg-card/50 p-6 space-y-6">
        {/* Question + Answer in 2 cols */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Question */}
          <div className="space-y-2">
            <Label className={labelCls}>
              Question <span className="text-primary">*</span>
            </Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter question"
              rows={8}
              className="bg-card border-border text-foreground placeholder:text-muted-foreground/80 focus:border-primary rounded-lg resize-none"
            />
          </div>

          {/* Answer */}
          <div className="space-y-2">
            <Label className={labelCls}>
              Answer <span className="text-primary">*</span>
            </Label>
            {/* Toolbar mock */}
            <div className="rounded-t-lg border border-border bg-card px-3 py-2 flex flex-wrap items-center gap-1">
              {["File", "Edit", "View", "Insert", "Format"].map((item) => (
                <button
                  key={item}
                  type="button"
                  className="text-xs text-foreground/70 hover:text-foreground px-2 py-1 rounded hover:bg-muted transition-colors"
                >
                  {item} ▾
                </button>
              ))}
              <div className="w-px h-4 bg-muted mx-1" />
              {["B", "I", "S"].map((f) => (
                <button
                  key={f}
                  type="button"
                  className="text-xs text-foreground/70 hover:text-foreground h-6 w-6 flex items-center justify-center rounded hover:bg-muted font-semibold transition-colors"
                >
                  {f}
                </button>
              ))}
            </div>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Enter answer..."
              rows={8}
              className="rounded-t-none border-t-0 bg-card border-border text-foreground placeholder:text-muted-foreground/80 focus:border-primary rounded-lg resize-none"
            />
          </div>
        </div>

        {/* Status */}
        <div className="max-w-sm">
          <Label className={labelCls + " block mb-2"}>Status</Label>
          <div className="flex items-center justify-between h-12 px-4 rounded-lg border border-border bg-card">
            <span className="text-sm text-foreground font-medium">Active</span>
            <Switch
              checked={status}
              onCheckedChange={setStatus}
              className="data-[state=checked]:bg-primary"
            />
          </div>
        </div>
      </div>

      {/* Save */}
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
