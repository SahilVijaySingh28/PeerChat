"use client";
import { Plus, Home, MessageSquare, Users, Bell, Settings, LogOut } from "lucide-react"
import { cn } from "@/shared/utils/utils"
import { signOutUser } from "@/features/user/services/userService"

// A simple circular icon button used in the left rail
function RailIcon({
  icon: Icon,
  label,
  active = false,
  onClick
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      className={cn(
        "relative grid h-12 w-12 place-items-center rounded-full border",
        "bg-sidebar text-sidebar-foreground",
        "transition-colors",
        active ? "bg-secondary" : "hover:bg-secondary"
      )}>
      <Icon className="h-5 w-5 opacity-90" />
    </button>
  );
}

export function LeftRail() {
  const handleLogout = async () => {
    try {
      await signOutUser();
      // Redirect to the root path which will show the login screen
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  const handleHome = () => {
    // Navigate to the home page
    window.location.href = "/";
  };

  const handleChats = () => {
    // Refresh the current page to show chats
    window.location.reload();
  };

  const handleTeams = () => {
    alert("Teams feature would be implemented here");
  };

  const handleNotifications = () => {
    alert("Notifications feature would be implemented here");
  };

  const handleSettings = () => {
    alert("Settings feature would be implemented here");
  };

  const handleNew = () => {
    alert("New feature would be implemented here");
  };

  return (
    <div className="flex h-[90vh] flex-row gap-3 lg:flex-col">
      {/* Brand coin */}
      <div
        className="grid h-12 w-12 place-items-center rounded-full border bg-secondary">
        <img src="/logo.png" alt="FlashChat Logo" className="h-8 w-8 object-contain" />
      </div>
      <div className="hidden flex-1 flex-col gap-3 lg:flex">
        <RailIcon icon={Home} label="Home" onClick={handleHome} />
        <RailIcon icon={MessageSquare} label="Chats" active onClick={handleChats} />
        <RailIcon icon={Users} label="Teams" onClick={handleTeams} />
        <RailIcon icon={Bell} label="Notifications" onClick={handleNotifications} />
        <RailIcon icon={Settings} label="Settings" onClick={handleSettings} />
      </div>
      <div className="ml-auto flex items-center gap-3 lg:ml-0 lg:mt-auto">
        <RailIcon icon={LogOut} label="Logout" onClick={handleLogout} />
        <button
          aria-label="New"
          onClick={handleNew}
          className="grid h-12 w-12 place-items-center rounded-full border bg-secondary hover:bg-muted">
          <Plus className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}