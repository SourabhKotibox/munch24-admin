
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import {
  Home, User, Settings, Plus, Trash2, Edit, Search,
  Bell, Heart, Star, CheckCircle, X, ChevronLeft, ChevronRight,
  MoreVertical, Copy, Check, Lock, Play, Film, Music, Book,
  Download, Share, Mail, Phone, MapPin, Calendar, Clock,
  Bookmark, CreditCard, Globe, Palette, Camera, Mic, MessageCircle,
  Users, LayoutDashboard, Save, Send, AlertCircle, Info,
  HelpCircle, ExternalLink, Link2, Upload, Eye, ArrowRight,
  Menu, LogOut, Moon, Sun, Image
} from "lucide-react";
import { Input } from "@/components/ui/input";

const iconList = [
  "Home", "User", "Settings", "Plus", "Trash2", "Edit", "Search",
  "Bell", "Heart", "Star", "CheckCircle", "X", "ChevronLeft", "ChevronRight",
  "MoreVertical", "Copy", "Check", "Lock", "Play", "Film", "Music", "Book",
  "Download", "Share", "Mail", "Phone", "MapPin", "Calendar", "Clock",
  "Bookmark", "CreditCard", "Globe", "Palette", "Camera", "Mic", "MessageCircle",
  "Users", "LayoutDashboard", "Save", "Send", "AlertCircle", "Info",
  "HelpCircle", "ExternalLink", "Link2", "Upload", "Eye", "ArrowRight",
  "Menu", "LogOut", "Moon", "Sun", "Image"
];

const iconComponents: Record<string, any> = {
  Home, User, Settings, Plus, Trash2, Edit, Search,
  Bell, Heart, Star, CheckCircle, X, ChevronLeft, ChevronRight,
  MoreVertical, Copy, Check, Lock, Play, Film, Music, Book,
  Download, Share, Mail, Phone, MapPin, Calendar, Clock,
  Bookmark, CreditCard, Globe, Palette, Camera, Mic, MessageCircle,
  Users, LayoutDashboard, Save, Send, AlertCircle, Info,
  HelpCircle, ExternalLink, Link2, Upload, Eye, ArrowRight,
  Menu, LogOut, Moon, Sun, Image
};

export default function IconsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const filteredIcons = iconList.filter((name) =>
    name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCopy = (iconName: string) => {
    navigator.clipboard.writeText(iconName);
    setCopied(iconName);
    toast({
      title: "Icon copied!",
      description: `Copied "${iconName}" to clipboard`,
    });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Icon Library</h1>
        <p className="text-muted-foreground mt-1">Click any icon to copy its name</p>
      </div>

      <Input
        placeholder="Search icons..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {filteredIcons.map((name) => {
          const IconComponent = iconComponents[name];
          return (
            <div
              key={name}
              className="flex flex-col items-center gap-2 p-4 border rounded-lg hover:bg-muted cursor-pointer"
              onClick={() => handleCopy(name)}
            >
              <IconComponent className="h-8 w-8" />
              <span className="text-xs text-center">
                {copied === name ? "Copied!" : name}
              </span>
            </div>
          );
        })}
      </div>

      {filteredIcons.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          No icons found
        </div>
      )}
    </div>
  );
}
