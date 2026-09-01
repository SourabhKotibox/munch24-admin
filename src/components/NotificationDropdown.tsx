import { useState, useRef, useEffect } from "react";
import { Bell, Loader2, CircleDot } from "lucide-react";
import { useGetAppNotifications } from "@/lib/api-client";
import { Link } from "wouter";

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { data: notifications, isLoading } = useGetAppNotifications();

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications?.length || 0; // In a full implementation, you'd track read state

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-full hover:bg-white/10 transition-colors"
      >
        <Bell className="w-5 h-5 text-muted-foreground hover:text-foreground transition-colors" />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-primary rounded-full border border-background shadow-lg shadow-primary/50 animate-pulse"></span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 max-h-96 overflow-y-auto bg-background/95 backdrop-blur-xl border border-border rounded-2xl shadow-2xl z-50 flex flex-col custom-scrollbar animate-in slide-in-from-top-2 fade-in duration-200">
          <div className="p-4 border-b border-border sticky top-0 bg-background/95 backdrop-blur-xl flex items-center justify-between z-10">
            <h3 className="text-sm font-black text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <span className="text-[10px] font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">
                {unreadCount} New
              </span>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              </div>
            ) : notifications && notifications.length > 0 ? (
              notifications.map((notif: any) => (
                <div key={notif._id || notif.id} className="p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer group flex gap-3">
                  <div className="mt-1 flex-shrink-0">
                    <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                      <CircleDot className="w-4 h-4 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-1">{notif.title}</h4>
                    <p className="text-xs text-foreground/70 leading-snug">{notif.body}</p>
                    <span className="text-[10px] text-foreground/65 mt-2 block font-semibold uppercase tracking-wider">
                      {new Date(notif.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-6">
                <Bell className="w-8 h-8 text-muted-foreground/80 mx-auto mb-2 opacity-50" />
                <p className="text-sm font-bold text-foreground/65">No Notifications</p>
                <p className="text-xs text-muted-foreground/80 mt-1">You're all caught up!</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
