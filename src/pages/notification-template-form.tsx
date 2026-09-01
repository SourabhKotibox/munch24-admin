import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import {
  X, Plus, Bold, Italic, Strikethrough, Link2,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Code, ImageIcon, Undo, Redo, Eye, ChevronDown, Wand2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useGetNotificationTemplateById, useCreateNotificationTemplate, useUpdateNotificationTemplate } from "../lib/api-client";
import { useSettings } from "@/contexts/SettingsContext";

// ── Variable replacement (same logic as backend) ──────────────────────────
const replacePreviewVariables = (template: string, vars: Record<string, string>): string =>
  template.replace(/\[\[\s*([^\]]+?)\s*\]\]/g, (_m, key) => {
    const k = key.trim().toLowerCase().replace(/[\s'/]+/g, '_');
    return vars[k] ?? vars[key.trim()] ?? `<span style="background:#fef3c7;padding:0 4px;border-radius:3px;color:#92400e;">[[ ${key.trim()} ]]</span>`;
  });

const wrapPreviewEmail = (body: string, platformName = 'Triple Minds'): string => {
  if (/^<!DOCTYPE|^<html/i.test(body.trim())) return body;
  const inner = /<[a-z][\s\S]*>/i.test(body) ? body : body.replace(/\n/g, '<br>');
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,Helvetica,sans-serif;">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f4f4f4;padding:30px 10px;"><tr><td align="center">
  <table cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:600px;">
    <tr><td style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:28px 40px;border-radius:10px 10px 0 0;text-align:center;">
      <h1 style="color:#fff;margin:0;font-size:22px;font-weight:700;">${platformName}</h1></td></tr>
    <tr><td style="background:#fff;padding:32px 40px;border:1px solid #e5e7eb;border-top:none;color:#374151;font-size:15px;line-height:1.7;">${inner}</td></tr>
    <tr><td style="background:#f9fafb;padding:20px 40px;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">© ${new Date().getFullYear()} ${platformName}. All rights reserved.</p></td></tr>
  </table></td></tr></table>
</body></html>`;
};

// ── Preset templates ──────────────────────────────────────────────────────
type Preset = { label: string; type: string; emailSubject: string; emailTemplate: string; notifSubject: string; notifTemplate: string };

const EMAIL_PRESETS: Preset[] = [
  {
    label: "Registration Welcome",
    type: "Registration",
    notifSubject: "Welcome! Your account is ready",
    notifTemplate: "Hello [[ user_name ]], welcome! Your account has been created successfully.",
    emailSubject: "Welcome to [[ platform_name ]] 🎬",
    emailTemplate:
      `<p style="margin:0 0 16px;">Hello <strong>[[ user_name ]]</strong>,</p>` +
      `<p style="margin:0 0 16px;">Welcome to <strong>[[ platform_name ]]</strong>! Your account has been created successfully.</p>` +
      `<p style="margin:0 0 24px;color:#6b7280;">You can now sign in and start exploring thousands of movies, TV shows, and more.</p>` +
      `<div style="text-align:center;margin:28px 0;"><a href="[[ site_url ]]" style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:#fff;padding:13px 36px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;display:inline-block;">Start Watching</a></div>` +
      `<p style="color:#9ca3af;font-size:12px;margin-top:24px;">If you didn't create this account, please ignore this email.</p>`,
  },
  {
    label: "Email Verification",
    type: "Email Verification",
    notifSubject: "Your email verification code: [[ otp_code ]]",
    notifTemplate: "Hello [[ user_name ]], your email verification OTP is [[ otp_code ]]. Expires in 10 minutes.",
    emailSubject: "Verify Your Email Address",
    emailTemplate:
      `<p style="margin:0 0 16px;">Hello <strong>[[ user_name ]]</strong>,</p>` +
      `<p style="margin:0 0 20px;">Please verify your email address using the code below:</p>` +
      `<div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:10px;padding:24px;margin:24px 0;text-align:center;">` +
      `<p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:2px;">Verification Code</p>` +
      `<p style="margin:0;color:#ef4444;font-size:40px;font-weight:900;letter-spacing:10px;font-family:monospace;">[[ otp_code ]]</p>` +
      `<p style="margin:10px 0 0;color:#9ca3af;font-size:12px;">This code expires in <strong>10 minutes</strong>.</p>` +
      `</div>` +
      `<p style="color:#6b7280;font-size:14px;">If you didn't request this, please ignore this email.</p>`,
  },
  {
    label: "Password Reset (OTP)",
    type: "Forget Email/Password",
    notifSubject: "Your password reset OTP: [[ otp_code ]]",
    notifTemplate: "Hello [[ user_name ]], your OTP code is [[ otp_code ]]. Expires in 10 minutes.",
    emailSubject: "Reset Your Password — OTP Code",
    emailTemplate:
      `<p style="margin:0 0 16px;">Hello <strong>[[ user_name ]]</strong>,</p>` +
      `<p style="margin:0 0 20px;">We received a request to reset your password. Use the OTP code below to proceed:</p>` +
      `<div style="background:#f8fafc;border:2px dashed #e2e8f0;border-radius:10px;padding:24px;margin:24px 0;text-align:center;">` +
      `<p style="margin:0 0 8px;color:#6b7280;font-size:12px;text-transform:uppercase;letter-spacing:2px;">One-Time Password</p>` +
      `<p style="margin:0;color:#ef4444;font-size:40px;font-weight:900;letter-spacing:10px;font-family:monospace;">[[ otp_code ]]</p>` +
      `<p style="margin:10px 0 0;color:#9ca3af;font-size:12px;">This code expires in <strong>10 minutes</strong>.</p>` +
      `</div>` +
      `<p style="color:#6b7280;font-size:14px;">If you didn't request a password reset, you can safely ignore this email.</p>`,
  },
  {
    label: "Password Changed",
    type: "Change Password",
    notifSubject: "Your password was changed",
    notifTemplate: "Hello [[ user_name ]], your password has been changed successfully.",
    emailSubject: "Password Changed Successfully",
    emailTemplate:
      `<p style="margin:0 0 16px;">Hello <strong>[[ user_name ]]</strong>,</p>` +
      `<p style="margin:0 0 16px;">Your password has been updated successfully.</p>` +
      `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin:20px 0;">` +
      `<p style="margin:0;color:#166534;font-size:14px;">✓ Password changed on [[ start_date ]]</p>` +
      `</div>` +
      `<p style="color:#6b7280;font-size:14px;">If you didn't make this change, please reset your password immediately.</p>`,
  },
  {
    label: "Admin Credentials",
    type: "Admin Credentials",
    notifSubject: "Your admin account credentials",
    notifTemplate: "Hello [[ user_name ]], your admin account is ready. Username: [[ user_id ]]",
    emailSubject: "Admin Account Created — Your Login Credentials",
    emailTemplate:
      `<p style="margin:0 0 16px;">Hello <strong>[[ user_name ]]</strong>,</p>` +
      `<p style="margin:0 0 20px;">Your admin account has been created. Use the credentials below to sign in:</p>` +
      `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin:20px 0;">` +
      `<table style="width:100%;border-collapse:collapse;">` +
      `<tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#6b7280;font-size:13px;width:140px;">Username / Email</td>` +
      `<td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#111827;font-weight:700;font-size:16px;">[[ user_id ]]</td></tr>` +
      `<tr><td style="padding:10px 0;color:#6b7280;font-size:13px;">Password</td>` +
      `<td style="padding:10px 0;color:#111827;font-weight:700;font-size:16px;font-family:monospace;letter-spacing:2px;">[[ user_password ]]</td></tr>` +
      `</table></div>` +
      `<div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:14px 18px;margin:16px 0;">` +
      `<p style="margin:0;color:#c2410c;font-size:13px;">⚠ Please change your password after your first login.</p></div>` +
      `<div style="text-align:center;margin:28px 0;"><a href="[[ site_url ]]" style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:#fff;padding:13px 36px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;display:inline-block;">Login to Admin Panel</a></div>`,
  },
  {
    label: "Admin Password Reset",
    type: "Admin Password Reset",
    notifSubject: "Your admin password has been reset",
    notifTemplate: "Hello [[ user_name ]], your admin password has been reset. Check your email for credentials.",
    emailSubject: "Admin Password Reset — New Credentials",
    emailTemplate:
      `<p style="margin:0 0 16px;">Hello <strong>[[ user_name ]]</strong>,</p>` +
      `<p style="margin:0 0 20px;">Your admin account password has been reset. New credentials:</p>` +
      `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin:20px 0;">` +
      `<table style="width:100%;border-collapse:collapse;">` +
      `<tr><td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#6b7280;font-size:13px;width:140px;">Username / Email</td>` +
      `<td style="padding:10px 0;border-bottom:1px solid #f1f5f9;color:#111827;font-weight:700;font-size:16px;">[[ user_id ]]</td></tr>` +
      `<tr><td style="padding:10px 0;color:#6b7280;font-size:13px;">New Password</td>` +
      `<td style="padding:10px 0;color:#ef4444;font-weight:700;font-size:16px;font-family:monospace;letter-spacing:2px;">[[ user_password ]]</td></tr>` +
      `</table></div>` +
      `<div style="text-align:center;margin:28px 0;"><a href="[[ site_url ]]" style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:#fff;padding:13px 36px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;display:inline-block;">Login to Admin Panel</a></div>`,
  },
  {
    label: "RBAC Role Update",
    type: "RBAC Update",
    notifSubject: "Your role/permissions have been updated",
    notifTemplate: "Hello [[ user_name ]], your account role has been updated to [[ your_position ]].",
    emailSubject: "Account Role Updated",
    emailTemplate:
      `<p style="margin:0 0 16px;">Hello <strong>[[ user_name ]]</strong>,</p>` +
      `<p style="margin:0 0 16px;">Your account role and permissions have been updated.</p>` +
      `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px 20px;margin:20px 0;">` +
      `<p style="margin:0 0 6px;color:#6b7280;font-size:13px;">New Role</p>` +
      `<p style="margin:0;color:#111827;font-weight:700;font-size:18px;text-transform:capitalize;">[[ your_position ]]</p></div>` +
      `<p style="color:#6b7280;font-size:14px;margin:0 0 24px;">Please re-login if you are currently signed in.</p>` +
      `<div style="text-align:center;margin:28px 0;"><a href="[[ site_url ]]" style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:#fff;padding:13px 36px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;display:inline-block;">View Admin Panel</a></div>`,
  },
  {
    label: "Content Approved",
    type: "Content Approved",
    notifSubject: "Your [[ content_type ]] has been approved",
    notifTemplate: "Hello [[ user_name ]], your [[ content_type ]] \"[[ movie_name ]]\" has been approved.",
    emailSubject: "Content Approved ✓",
    emailTemplate:
      `<p style="margin:0 0 16px;">Hello <strong>[[ user_name ]]</strong>,</p>` +
      `<p style="margin:0 0 16px;">Your <strong>[[ content_type ]]</strong> has been approved and is now live!</p>` +
      `<div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:20px 24px;margin:20px 0;">` +
      `<p style="margin:0 0 4px;color:#6b7280;font-size:13px;">Content</p>` +
      `<p style="margin:0;color:#166534;font-weight:700;font-size:18px;">[[ movie_name ]]</p>` +
      `<p style="margin:8px 0 0;color:#166534;font-size:13px;">✓ Status: <strong>Published</strong></p></div>` +
      `<div style="text-align:center;margin:28px 0;"><a href="[[ site_url ]]" style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:#fff;padding:13px 36px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;display:inline-block;">View Dashboard</a></div>`,
  },
  {
    label: "Content Rejected",
    type: "Content Rejected",
    notifSubject: "Your [[ content_type ]] needs changes",
    notifTemplate: "Hello [[ user_name ]], your [[ content_type ]] \"[[ movie_name ]]\" was rejected.",
    emailSubject: "Content Rejected — Action Required",
    emailTemplate:
      `<p style="margin:0 0 16px;">Hello <strong>[[ user_name ]]</strong>,</p>` +
      `<p style="margin:0 0 16px;">Your <strong>[[ content_type ]]</strong> requires changes before it can be published.</p>` +
      `<div style="background:#fff7f7;border:1px solid #fecaca;border-radius:8px;padding:20px 24px;margin:20px 0;">` +
      `<p style="margin:0 0 4px;color:#6b7280;font-size:13px;">Content</p>` +
      `<p style="margin:0 0 16px;color:#991b1b;font-weight:700;font-size:18px;">[[ movie_name ]]</p>` +
      `<p style="margin:0 0 4px;color:#6b7280;font-size:13px;">Reason</p>` +
      `<p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">[[ description_note ]]</p></div>` +
      `<div style="text-align:center;margin:28px 0;"><a href="[[ site_url ]]" style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:#fff;padding:13px 36px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;display:inline-block;">View Dashboard</a></div>`,
  },
  {
    label: "Subscription Activated",
    type: "New Subscription",
    notifSubject: "Subscription activated — [[ plan_name ]]",
    notifTemplate: "Hello [[ user_name ]], your [[ plan_name ]] subscription is now active!",
    emailSubject: "Subscription Activated 🎉",
    emailTemplate:
      `<p style="margin:0 0 16px;">Hello <strong>[[ user_name ]]</strong>,</p>` +
      `<p style="margin:0 0 16px;">Your subscription is now active. Here are your plan details:</p>` +
      `<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:20px 24px;margin:20px 0;">` +
      `<table style="width:100%;border-collapse:collapse;">` +
      `<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#6b7280;font-size:13px;width:120px;">Plan</td>` +
      `<td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#111827;font-weight:700;">[[ plan_name ]]</td></tr>` +
      `<tr><td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#6b7280;font-size:13px;">Start Date</td>` +
      `<td style="padding:8px 0;border-bottom:1px solid #f1f5f9;color:#111827;">[[ start_date ]]</td></tr>` +
      `<tr><td style="padding:8px 0;color:#6b7280;font-size:13px;">End Date</td>` +
      `<td style="padding:8px 0;color:#111827;">[[ end_date ]]</td></tr>` +
      `</table></div>` +
      `<div style="text-align:center;margin:28px 0;"><a href="[[ site_url ]]" style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:#fff;padding:13px 36px;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px;display:inline-block;">Start Watching</a></div>`,
  },
];

// ── Preview sample variables ───────────────────────────────────────────────
const SAMPLE_VARS: Record<string, string> = {
  user_name: "John Doe",
  user_id: "john@example.com",
  user_password: "Xr9k#mP2vQ",
  site_url: "https://streamvault.example.com",
  otp_code: "847261",
  plan_name: "Premium",
  start_date: "June 18, 2025",
  end_date: "June 18, 2026",
  movie_name: "Oppenheimer",
  tv_show_name: "Breaking Bad",
  episode_name: "S01E01 - Pilot",
  season_name: "Season 1",
  content_type: "Movie",
  your_position: "Admin",
  your_name: "Super Admin",
  description_note: "The content does not meet our quality guidelines. Please improve the video quality and resubmit.",
  payment_method: "Credit Card",
  price: "₹149",
  discount: "₹0",
  total_amount: "₹149",
  duration: "30 days",
};

// ── Params ─────────────────────────────────────────────────────────────────
const NOTIFICATION_PARAMS = [
  "ID", "User Name", "Platform Name", "Description / Note", "Your Name", "Your Position",
  "User' ID", "User Password", "Site URL", "Episode Name", "Movie Name",
  "Season Name", "TV Show Name", "End Date", "Start Date", "Plan Name",
  "Content Type", "OTP Code", "Payment Method", "Price", "Discount",
  "Coupon Discount", "Tax", "Total Amount", "Duration",
];

const ALL_RECIPIENTS = ["User", "Admin", "Demo Admin", "Super Admin"];

type TemplateFormData = {
  type: string;
  userType: string;
  recipients: string[];
  status: boolean;
  notifSubject: string;
  notifTemplate: string;
  emailSubject: string;
  emailTemplate: string;
};

const labelCls = "text-foreground text-sm font-medium";
const inputCls = "bg-muted border-border text-foreground placeholder:text-muted-foreground/80 focus:border-primary h-10 rounded-lg";

function RichEditor({ value, onChange, label }: { value: string; onChange: (v: string) => void; label?: string }) {
  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/80 flex-wrap">
        {["File", "Edit", "View", "Insert", "Format"].map((m) => (
          <button key={m} type="button" className="flex items-center gap-0.5 px-2 py-1 text-xs text-muted-foreground hover:bg-muted rounded transition-colors">
            {m} <span className="text-[9px] opacity-70">▾</span>
          </button>
        ))}
      </div>
      <div className="flex items-center gap-0.5 px-2 py-1.5 border-b border-border bg-muted/80 flex-wrap">
        <button type="button" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-foreground/70"><Undo className="h-3.5 w-3.5" /></button>
        <button type="button" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-foreground/70"><Redo className="h-3.5 w-3.5" /></button>
        <div className="w-px h-4 bg-muted mx-1" />
        <button type="button" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-foreground/70"><Bold className="h-3.5 w-3.5" /></button>
        <button type="button" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-foreground/70"><Italic className="h-3.5 w-3.5" /></button>
        <button type="button" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-foreground/70"><Strikethrough className="h-3.5 w-3.5" /></button>
        <button type="button" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-foreground/70"><Link2 className="h-3.5 w-3.5" /></button>
        <div className="w-px h-4 bg-muted mx-1" />
        <button type="button" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-foreground/70"><AlignLeft className="h-3.5 w-3.5" /></button>
        <button type="button" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-foreground/70"><AlignCenter className="h-3.5 w-3.5" /></button>
        <button type="button" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-foreground/70"><AlignRight className="h-3.5 w-3.5" /></button>
        <button type="button" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-foreground/70"><AlignJustify className="h-3.5 w-3.5" /></button>
        <div className="w-px h-4 bg-muted mx-1" />
        <button type="button" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-foreground/70"><Code className="h-3.5 w-3.5" /></button>
        <button type="button" className="h-6 w-6 flex items-center justify-center rounded hover:bg-muted text-foreground/70"><ImageIcon className="h-3.5 w-3.5" /></button>
      </div>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={8}
        placeholder={label === "email" ? "Enter HTML email body (e.g. <p>Hello <strong>[[ user_name ]]</strong>...</p>)" : "Enter notification body..."}
        className="rounded-none border-0 bg-card text-foreground placeholder:text-muted-foreground/80 focus:ring-0 focus-visible:ring-0 focus-visible:ring-offset-0 resize-y text-sm leading-relaxed font-mono"
      />
      <div className="px-3 py-1 bg-muted/80 border-t border-border text-right">
        <span className="text-[10px] text-muted-foreground tracking-wide">HTML / TEMPLATE</span>
      </div>
    </div>
  );
}

export default function NotificationTemplateFormPage() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id?: string }>();
  const { toast } = useToast();
  const { data: existingData, isLoading: isLoadingExisting } = useGetNotificationTemplateById(params.id);
  const createMutation = useCreateNotificationTemplate();
  const updateMutation = useUpdateNotificationTemplate();
  const { settings } = useSettings();

  const existing = existingData?.data;
  const isEdit = !!params.id;

  const [form, setForm] = useState<TemplateFormData>({
    type: "", userType: "user", recipients: ["User"], status: true,
    notifSubject: "", notifTemplate: "", emailSubject: "", emailTemplate: "",
  });
  const [saving, setSaving] = useState(false);
  const [recipientSelectKey, setRecipientSelectKey] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTarget, setPreviewTarget] = useState<"email" | "notif">("email");

  useEffect(() => {
    if (existing) {
      setForm({
        type: existing.type, userType: existing.userType,
        recipients: existing.recipients, status: existing.status,
        notifSubject: existing.notifSubject, notifTemplate: existing.notifTemplate,
        emailSubject: existing.emailSubject, emailTemplate: existing.emailTemplate,
      });
    }
  }, [existing]);

  const set = <K extends keyof TemplateFormData>(key: K, value: TemplateFormData[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const addRecipient = (r: string) => {
    if (r && !form.recipients.includes(r)) {
      set("recipients", [...form.recipients, r]);
      setRecipientSelectKey((k) => k + 1);
    }
  };
  const removeRecipient = (r: string) => set("recipients", form.recipients.filter((x) => x !== r));
  const availableRecipients = ALL_RECIPIENTS.filter((r) => !form.recipients.includes(r));

  const handleParamClick = (param: string) => {
    const key = `[[ ${param.toLowerCase().replace(/[\s'/]+/g, "_")} ]]`;
    navigator.clipboard.writeText(key).catch(() => {});
    toast({ title: `Copied: ${key}`, description: "Paste it in the template where needed." });
  };

  const applyPreset = (preset: Preset) => {
    setForm((prev) => ({
      ...prev,
      type: isEdit ? prev.type : preset.type,
      emailSubject: preset.emailSubject,
      emailTemplate: preset.emailTemplate,
      notifSubject: preset.notifSubject,
      notifTemplate: preset.notifTemplate,
    }));
    toast({ title: `Preset "${preset.label}" loaded`, description: "You can customize it before saving." });
  };

  const handleSave = async () => {
    if (!form.type.trim()) { toast({ title: "Type is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ templateId: params.id, data: form });
        toast({ title: "Template updated successfully!" });
      } else {
        await createMutation.mutateAsync({ data: form });
        toast({ title: "Template created successfully!" });
      }
      setLocation("/notification-templates");
    } catch {
      toast({ title: "Failed to save template", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  // Build preview HTML
  const sampleVars = {
    ...SAMPLE_VARS,
    platform_name: settings?.platformName || "StreamVault",
  };

  const previewHtml =
    previewTarget === "email"
      ? wrapPreviewEmail(replacePreviewVariables(form.emailTemplate || "<p>No email template set.</p>", sampleVars), settings?.platformName || "Triple Minds")
      : `<div style="font-family:Arial,sans-serif;max-width:500px;margin:30px auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
          <div style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:16px 20px;">
            <p style="color:#fff;font-size:12px;margin:0;opacity:0.8;text-transform:uppercase;letter-spacing:1px;">In-App Notification</p>
          </div>
          <div style="padding:20px;">
            <p style="margin:0 0 8px;color:#111827;font-weight:700;font-size:16px;">${replacePreviewVariables(form.notifSubject || "Notification Subject", sampleVars)}</p>
            <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.6;">${replacePreviewVariables(form.notifTemplate || "Notification body...", sampleVars)}</p>
          </div>
        </div>`;

  if (isEdit && isLoadingExisting) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-foreground/65">Loading...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span className="text-foreground/65">Dashboard</span><span>/</span>
        <span className="cursor-pointer hover:text-foreground transition-colors" onClick={() => setLocation("/notification-templates")}>
          Notification Templates
        </span>
        <span>/</span>
        <span className="text-foreground font-medium">{isEdit ? "Edit Template" : "New Template"}</span>
      </div>

      <button onClick={() => setLocation("/notification-templates")}
        className="flex items-center gap-1.5 text-sm text-primary hover:text-red-300 font-medium transition-colors">
        <span className="text-base leading-none">«</span> Back
      </button>

      {/* Preset Loader */}
      {!isEdit && (
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Load a Preset</span>
              <span className="text-xs text-muted-foreground">(pre-fills form with ready-to-use HTML)</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {EMAIL_PRESETS.map((preset) => (
                <button
                  key={preset.type}
                  type="button"
                  onClick={() => applyPreset(preset)}
                  className="px-3 py-1.5 rounded-lg border border-border text-xs text-muted-foreground hover:bg-primary/80/10 hover:border-primary/50 hover:text-red-300 transition-colors font-medium"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {isEdit && (
        <div className="rounded-xl border border-border bg-card/50 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              <Wand2 className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium text-foreground">Reset to Preset</span>
            </div>
            <Select onValueChange={(label) => { const p = EMAIL_PRESETS.find((x) => x.label === label); if (p) applyPreset(p); }}>
              <SelectTrigger className="w-52 h-9 bg-muted border-border text-foreground text-sm rounded-lg">
                <SelectValue placeholder="Choose a preset…" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-border text-foreground">
                {EMAIL_PRESETS.map((p) => (
                  <SelectItem key={p.type} value={p.label}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[2fr_3fr] gap-6 items-start">
        {/* Left Panel */}
        <div className="rounded-xl border border-border bg-card/50 p-5 space-y-5">
          <div className="space-y-2">
            <Label className={labelCls}>Type <span className="text-primary">*</span></Label>
            <Input value={form.type} onChange={(e) => set("type", e.target.value)} placeholder="e.g. Registration"
              className={inputCls} readOnly={isEdit} />
            {isEdit && <p className="text-xs text-foreground/65">Template type cannot be changed after creation.</p>}
          </div>

          <div className="space-y-3">
            <Label className={labelCls}>Notification Parameters</Label>
            <p className="text-xs text-foreground/65">Click to copy — paste in your template where needed.</p>
            <div className="flex flex-wrap gap-1.5">
              {NOTIFICATION_PARAMS.map((param) => (
                <button key={param} type="button" onClick={() => handleParamClick(param)}
                  title={`Copy [[ ${param.toLowerCase().replace(/[\s'/]+/g, "_")} ]]`}
                  className="px-2.5 py-1 rounded bg-primary hover:bg-primary text-white text-xs font-medium transition-colors">
                  {param}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className={labelCls}>User Type <span className="text-primary">*</span></Label>
            <Select value={form.userType} onValueChange={(v) => set("userType", v)}>
              <SelectTrigger className="bg-muted border-border text-foreground h-10 rounded-lg"><SelectValue /></SelectTrigger>
              <SelectContent className="bg-muted border-border text-foreground">
                <SelectItem value="user">User</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className={labelCls}>Recipients</Label>
            <div className="min-h-[42px] px-2 py-2 rounded-lg border border-border bg-muted flex flex-wrap gap-2 items-center">
              {form.recipients.map((r) => (
                <span key={r} className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 bg-primary text-white text-xs rounded font-medium">
                  {r}
                  <button type="button" onClick={() => removeRecipient(r)} className="ml-0.5 hover:text-red-200 transition-colors flex items-center">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              {availableRecipients.length > 0 && (
                <Select key={recipientSelectKey} onValueChange={addRecipient}>
                  <SelectTrigger className="h-7 w-auto min-w-[60px] border border-dashed border-border bg-transparent text-foreground/70 hover:text-foreground text-xs rounded px-2 gap-1 shadow-none focus:ring-0">
                    <Plus className="h-3 w-3" /><span>Add</span>
                  </SelectTrigger>
                  <SelectContent className="bg-muted border-border text-foreground">
                    {availableRecipients.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label className={labelCls}>Status</Label>
            <div className="flex items-center justify-between h-10 px-4 rounded-lg border border-border bg-muted">
              <span className="text-sm text-foreground font-medium">{form.status ? "Active" : "Inactive"}</span>
              <Switch checked={form.status} onCheckedChange={(v) => set("status", v)} className="data-[state=checked]:bg-primary" />
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="space-y-5">
          {/* Preview toggle */}
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" className="gap-2 border-border h-9"
              onClick={() => { setPreviewTarget("notif"); setPreviewOpen(true); }}>
              <Eye className="h-4 w-4" /> Preview Notification
            </Button>
            <Button type="button" variant="outline" size="sm" className="gap-2 h-9 text-primary border-primary/30 hover:bg-primary/80/10"
              onClick={() => { setPreviewTarget("email"); setPreviewOpen(true); }}>
              <Eye className="h-4 w-4" /> Preview Email
            </Button>
          </div>

          {/* Notification Template */}
          <div className="rounded-xl border border-border bg-card/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground font-semibold text-base">In-App Notification</h3>
              <span className="text-xs text-foreground/65 px-2 py-0.5 rounded bg-muted border border-border">Push / In-app</span>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Subject</Label>
              <Input value={form.notifSubject} onChange={(e) => set("notifSubject", e.target.value)}
                placeholder={`e.g. Welcome to ${settings?.platformName || "Triple Minds"}`} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Message Body</Label>
              <RichEditor value={form.notifTemplate} onChange={(v) => set("notifTemplate", v)} label="notif" />
            </div>
          </div>

          {/* Email Template */}
          <div className="rounded-xl border border-border bg-card/50 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-foreground font-semibold text-base">Email Template</h3>
              <span className="text-xs text-foreground/65 px-2 py-0.5 rounded bg-muted border border-border">HTML body</span>
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Subject</Label>
              <Input value={form.emailSubject} onChange={(e) => set("emailSubject", e.target.value)}
                placeholder={`e.g. Welcome to ${settings?.platformName || "Triple Minds"} 🎬`} className={inputCls} />
            </div>
            <div className="space-y-2">
              <Label className={labelCls}>Body (HTML)</Label>
              <p className="text-xs text-foreground/65">Write the body HTML — the branded header/footer wrapper is added automatically.</p>
              <RichEditor value={form.emailTemplate} onChange={(v) => set("emailTemplate", v)} label="email" />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}
          className="bg-primary hover:bg-primary/90 text-white h-11 px-10 rounded-lg font-semibold min-w-[100px]">
          {saving ? "Saving..." : "Save Template"}
        </Button>
      </div>

      {/* Preview Modal */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="bg-card border-border max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-foreground">
                {previewTarget === "email" ? "Email Preview" : "Notification Preview"}
              </DialogTitle>
              <div className="flex gap-2 mr-8">
                <button onClick={() => setPreviewTarget("notif")}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${previewTarget === "notif" ? "bg-primary text-white" : "text-foreground/70 hover:text-foreground"}`}>
                  Notification
                </button>
                <button onClick={() => setPreviewTarget("email")}
                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${previewTarget === "email" ? "bg-primary text-white" : "text-foreground/70 hover:text-foreground"}`}>
                  Email
                </button>
              </div>
            </div>
            <p className="text-xs text-foreground/65 mt-1">Variables are replaced with sample values for preview.</p>
          </DialogHeader>
          <div className="flex-1 overflow-auto rounded-lg border border-border bg-white min-h-[400px]">
            <iframe
              srcDoc={previewHtml}
              className="w-full h-full min-h-[500px] border-0"
              title="Email Preview"
              sandbox="allow-same-origin"
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
