import React from "react";
import { Bell, Check, Trash2, UserPlus, FileEdit, Film, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { ScrollArea } from "./ui/scroll-area";
import { useGetAdminNotifications, useMarkAdminNotificationsRead } from "../lib/api-client";

const formatTimeAgo = (dateStr: string) => {
  const date = new Date(dateStr);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
};

const getIconForType = (type: string, action?: string) => {
  if (type === "user_registered") return <UserPlus className="h-4 w-4 text-blue-500" />;
  if (action === "deleted") return <Trash2 className="h-4 w-4 text-primary" />;
  if (action === "updated") return <FileEdit className="h-4 w-4 text-orange-500" />;
  if (action === "created") return <Film className="h-4 w-4 text-green-500" />;
  return <AlertCircle className="h-4 w-4 text-foreground/65" />;
};

export function HeaderNotifications() {
  const [, setLocation] = useLocation();
  const { data: response } = useGetAdminNotifications();
  const markAsRead = useMarkAdminNotificationsRead();

  const notifications = response?.data || [];
  const unreadCount = response?.unreadCount || 0;

  const handleMarkAllAsRead = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (unreadCount === 0) return;
    await markAsRead.mutateAsync();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-primary border-2 border-background shadow-sm" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0 border-border bg-popover text-foreground">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unreadCount > 0 && (
              <Badge variant="destructive" className="h-5 px-1.5 rounded-full text-[10px] bg-primary text-white">
                {unreadCount} new
              </Badge>
            )}
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleMarkAllAsRead}
            disabled={unreadCount === 0 || markAsRead.isPending}
          >
            <Check className="h-3.5 w-3.5 mr-1" />
            Mark all read
          </Button>
        </div>
        
        <ScrollArea className="h-[350px]">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-20" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {notifications.map((notif: any) => (
                  <div
                  key={notif._id}
                  className={`flex items-start gap-3 p-4 border-b border-border/50 transition-colors hover:bg-muted/50 ${
                    !notif.isRead ? "bg-muted/20" : ""
                  }`}
                >
                  <div className="mt-1 flex-shrink-0 p-2 rounded-full bg-background border border-border">
                    {getIconForType(notif.type, notif.action)}
                  </div>
                  <div className="flex-1 space-y-1 overflow-hidden">
                    <p className={`text-sm leading-tight ${!notif.isRead ? "font-medium text-foreground" : "text-muted-foreground"}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {notif.message}
                    </p>
                    <p className="text-[10px] text-muted-foreground/80 mt-1">
                      {formatTimeAgo(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <div className="h-2 w-2 mt-2 rounded-full bg-primary flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
        <DropdownMenuSeparator className="m-0 bg-border" />
        <div className="p-2 border-t border-border/50 bg-popover text-center">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-primary hover:text-primary/90 hover:bg-muted font-semibold"
            onClick={() => setLocation("/notifications")}
          >
            View all notifications
          </Button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
