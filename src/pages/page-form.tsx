import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { Eye, Edit3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useUpdatePage, useCreatePage, useGetPageById } from "@/lib/api-client";

export default function PageForm() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const isEditMode = !!id && id !== "new";

  const { data: pageData, isLoading } = useGetPageById(id || "");
  const updateMutation = useUpdatePage();
  const createMutation = useCreatePage();

  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    content: "",
    status: "published" as "published" | "draft",
    order: 0,
    metaTitle: "",
    metaDescription: "",
  });

  useEffect(() => {
    if (isEditMode && pageData) {
      setFormData({
        title: pageData.title || "",
        slug: pageData.slug || "",
        content: pageData.content || "",
        status: pageData.status || "published",
        order: pageData.order || 0,
        metaTitle: pageData.metaTitle || "",
        metaDescription: pageData.metaDescription || "",
      });
    }
  }, [pageData, isEditMode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (isEditMode) {
        await updateMutation.mutateAsync({ id, data: formData });
        queryClient.invalidateQueries({ queryKey: ["page-detail", id] });
        toast({ title: "Page updated successfully!" });
      } else {
        await createMutation.mutateAsync(formData);
        toast({ title: "Page created successfully!" });
      }
      queryClient.invalidateQueries({ queryKey: ["pages"] });
      setLocation("/pages");
    } catch {
      toast({ title: isEditMode ? "Update failed" : "Creation failed", variant: "destructive" });
    }
  };

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-foreground/65">Loading page details...</p>
      </div>
    );
  }

  const set = (key: string, value: any) => setFormData((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <button
          onClick={() => setLocation("/pages")}
          className="text-foreground/65 hover:text-foreground transition-colors"
        >
          Pages
        </button>
        <span>/</span>
        <span className="text-foreground font-medium">{isEditMode ? "Edit Page" : "Create New Page"}</span>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6 max-w-6xl">
        {/* Left Column: Content Editor */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div>
              <h3 className="text-foreground font-semibold text-base">Page Content</h3>
              <p className="text-foreground/65 text-sm mt-0.5">Manage the title, slug, and body of your page</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="space-y-1.5">
                <Label htmlFor="title" className="text-foreground/70 text-sm">Title</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => set("title", e.target.value)}
                  required
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="slug" className="text-foreground/70 text-sm">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => set("slug", e.target.value)}
                  required
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-11"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-foreground/70 text-sm">Content</Label>
              <Tabs defaultValue="editor" className="w-full">
                <TabsList className="bg-muted border border-border p-1 rounded-lg gap-1">
                  <TabsTrigger
                    value="editor"
                    className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground text-foreground/70 rounded-md px-4 py-1.5 text-sm"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Editor
                  </TabsTrigger>
                  <TabsTrigger
                    value="preview"
                    className="flex items-center gap-2 data-[state=active]:bg-muted data-[state=active]:text-foreground text-foreground/70 rounded-md px-4 py-1.5 text-sm"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Preview
                  </TabsTrigger>
                </TabsList>
                <TabsContent value="editor" className="mt-3">
                  <Textarea
                    id="content"
                    rows={16}
                    value={formData.content}
                    onChange={(e) => set("content", e.target.value)}
                    required
                    placeholder="Enter HTML content here..."
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary resize-none font-mono text-sm"
                  />
                </TabsContent>
                <TabsContent value="preview" className="mt-3">
                  <div
                    className="border border-border rounded-lg p-6 min-h-[360px] bg-muted text-foreground prose prose-invert max-w-none"
                    dangerouslySetInnerHTML={{ __html: formData.content || "<p class='text-foreground/65'>No content yet</p>" }}
                  />
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Right Column: Settings & SEO */}
        <div className="space-y-6">
          {/* Publishing Settings */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div>
              <h3 className="text-foreground font-semibold text-base">Publishing</h3>
              <p className="text-foreground/65 text-sm mt-0.5">Configure page visibility and order</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-border bg-muted/50 p-3.5 h-[52px]">
                <div>
                  <Label htmlFor="status" className="text-foreground text-sm font-medium cursor-pointer">
                    Published
                  </Label>
                  <p className="text-foreground/65 text-xs">Show this page in the app</p>
                </div>
                <Switch
                  id="status"
                  checked={formData.status === "published"}
                  onCheckedChange={(checked) =>
                    set("status", checked ? "published" : "draft")
                  }
                  className="data-[state=checked]:bg-primary"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="order" className="text-foreground/70 text-sm">Order</Label>
                <Input
                  id="order"
                  type="number"
                  value={formData.order}
                  onChange={(e) => set("order", Number(e.target.value) || 0)}
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground focus:border-primary h-11"
                />
              </div>
            </div>

            <div className="pt-2 flex flex-col gap-3">
              <Button
                type="submit"
                disabled={updateMutation.isPending || createMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-white w-full h-11 font-semibold rounded-lg"
              >
                {isEditMode ? "Save Changes" : "Create Page"}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setLocation("/pages")}
                className="bg-muted border-border text-foreground hover:bg-muted w-full h-11 rounded-lg"
              >
                Cancel
              </Button>
            </div>
          </div>

          {/* SEO & Metadata */}
          <div className="bg-card border border-border rounded-xl p-6 space-y-5">
            <div>
              <h3 className="text-foreground font-semibold text-base">Search Engine Optimization</h3>
              <p className="text-foreground/65 text-sm mt-0.5">Optimize the page meta tags for search engines</p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="metaTitle" className="text-foreground/70 text-sm">Meta Title</Label>
                <Input
                  id="metaTitle"
                  value={formData.metaTitle}
                  onChange={(e) => set("metaTitle", e.target.value)}
                  placeholder="e.g. Privacy Policy | Triple Minds"
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground/80 focus:border-primary h-11"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="metaDescription" className="text-foreground/70 text-sm">Meta Description</Label>
                <Textarea
                  id="metaDescription"
                  rows={4}
                  value={formData.metaDescription}
                  onChange={(e) => set("metaDescription", e.target.value)}
                  placeholder="Provide a concise summary of the page..."
                  className="bg-muted border-border text-foreground placeholder:text-muted-foreground/80 focus:border-primary resize-none"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
