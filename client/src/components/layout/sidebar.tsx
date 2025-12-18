import { cn } from "@/lib/utils";
import { Link, useLocation } from "wouter";
import { 
  MessageSquare, 
  Settings, 
  LogOut, 
  Plus, 
  Command,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useConversations } from "@/hooks/use-chat";
import { format } from "date-fns";

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: conversations } = useConversations();
  const currentId = location.split("/").pop();

  return (
    <div className={cn("flex flex-col h-full bg-muted/20 border-r border-border", className)}>
      <div className="p-4 border-b border-border/50">
        <Link href="/app/chat" className="flex items-center gap-2 mb-6 px-2">
          <div className="bg-primary text-primary-foreground p-1.5 rounded-lg shadow-lg shadow-primary/25">
            <Command className="w-5 h-5" />
          </div>
          <span className="font-bold text-lg tracking-tight">Lucidoc</span>
        </Link>
        
        <Link href="/app/chat" className="block w-full">
          <Button 
            variant="outline" 
            className="w-full justify-start gap-2 shadow-sm border-primary/20 hover:border-primary/50 text-primary hover:text-primary font-medium"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </Button>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        <div className="text-xs font-semibold text-muted-foreground px-3 mb-2 uppercase tracking-wider">
          Recent History
        </div>
        
        {conversations?.map((chat) => (
          <Link 
            key={chat.id} 
            href={`/app/chat/${chat.id}`}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 group relative overflow-hidden",
              Number(currentId) === chat.id 
                ? "bg-background shadow-sm border border-border text-foreground font-medium" 
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
          >
            <MessageSquare className="w-4 h-4 flex-shrink-0" />
            <span className="truncate flex-1">
              {chat.title || "New Conversation"}
            </span>
            {Number(currentId) === chat.id && (
               <motion.div layoutId="active-pill" className="absolute left-0 w-1 h-5 bg-primary rounded-r-full" />
            )}
            <ChevronRight className={cn(
              "w-3 h-3 opacity-0 -translate-x-2 transition-all duration-200",
              Number(currentId) === chat.id ? "opacity-100 translate-x-0 text-primary" : "group-hover:opacity-100 group-hover:translate-x-0"
            )} />
          </Link>
        ))}

        {conversations?.length === 0 && (
          <div className="text-sm text-muted-foreground px-3 py-4 text-center italic opacity-60">
            No history yet
          </div>
        )}
      </div>

      <div className="p-4 border-t border-border/50 bg-muted/10">
        <div className="flex items-center gap-3 mb-4 px-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center text-primary-foreground font-bold shadow-md">
            {user?.email?.[0].toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{user?.email}</p>
            <p className="text-xs text-muted-foreground">Pro Plan</p>
          </div>
          <Link href="/app/settings">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
              <Settings className="w-4 h-4" />
            </Button>
          </Link>
        </div>
        <Button 
          variant="ghost" 
          className="w-full justify-start gap-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => logout()}
        >
          <LogOut className="w-4 h-4" />
          Log out
        </Button>
      </div>
    </div>
  );
}

// Helper for animation
import { motion } from "framer-motion";
