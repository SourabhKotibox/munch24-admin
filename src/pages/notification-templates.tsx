
import { useState } from "react";
import { useLocation } from "wouter";
import { Edit2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useGetNotificationTemplates, useToggleNotificationTemplateStatus } from "../lib/api-client";

type NotifTemplate = {
  id: string;
  type: string;
  status: boolean;
};

export default function NotificationTemplatesPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { data: templatesData, isLoading } = useGetNotificationTemplates();
  const toggleMutation = useToggleNotificationTemplateStatus();
  const [searchQuery, setSearchQuery] = useState("");

  const templates = templatesData?.data || [];

  const filtered = templates.filter((t: NotifTemplate) =>
    t.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const toggleStatus = async (id: string) => {
    try {
      await toggleMutation.mutateAsync(id);
      const tpl = templates.find((t: NotifTemplate) => t.id === id);
      if (tpl) toast({ title: `"${tpl.type}" ${tpl.status ? "deactivated" : "activated"}` });
    } catch {
      toast({ title: "Failed to update status", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span>
        <span>/</span>
        <span className="text-foreground font-medium">Notification Templates</span>
      </div>

      <div className="flex items-center justify-end gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-56 bg-card border-border text-foreground placeholder:text-foreground/65 focus:border-primary h-10 rounded-lg"
          />
        </div>
      </div>

      <div className="rounded-xl border border-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-card hover:bg-card">
              <TableHead className="text-foreground/70 font-semibold text-sm">Template Name</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Status</TableHead>
              <TableHead className="text-foreground/70 font-semibold text-sm">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-foreground/65 py-10">
                  Loading...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-foreground/65 py-10">
                  No templates found
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((template: NotifTemplate) => (
                <TableRow key={template.id} className="border-border hover:bg-muted/40">
                  <TableCell>
                    <span className="text-primary font-medium text-sm">{template.type}</span>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={template.status}
                      onCheckedChange={() => toggleStatus(template.id)}
                      disabled={toggleMutation.isPending}
                      className="data-[state=checked]:bg-primary"
                    />
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => setLocation(`/notification-templates/${template.id}/edit`)}
                      className="h-8 w-8 flex items-center justify-center rounded-lg bg-amber-600/15 text-amber-400 hover:bg-amber-600/30 transition-colors"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
