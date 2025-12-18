import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useConversations, useConversation, useSendMessage, useWorkspace } from "@/hooks/use-chat";
import { Sidebar } from "@/components/layout/sidebar";
import { ChatMessage } from "@/components/chat-message";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Menu, Plus } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { motion } from "framer-motion";

export default function ChatPage() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/app/chat/:id?");
  const conversationId = params?.id ? parseInt(params.id) : null;
  
  const { data: conversation, isLoading: isChatLoading } = useConversation(conversationId);
  const { mutate: sendMessage, isPending: isSending } = useSendMessage();
  const { data: workspace } = useWorkspace();
  
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auth Protection
  useEffect(() => {
    if (!isAuthLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isAuthLoading, setLocation]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conversation?.messages, isSending]);

  // Focus input on load
  useEffect(() => {
    if (!isSending) {
      textareaRef.current?.focus();
    }
  }, [conversationId, isSending]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    sendMessage({ 
      message: input, 
      conversationId: conversationId || undefined 
    }, {
      onSuccess: (data) => {
        setInput("");
        // If it was a new chat, redirect to the new ID
        if (!conversationId) {
          setLocation(`/app/chat/${data.conversationId}`);
        }
      }
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isAuthLoading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;
  if (!user) return null;

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:block w-72 h-full flex-shrink-0">
        <Sidebar className="h-full w-full" />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        
        {/* Mobile Header */}
        <header className="md:hidden h-16 border-b border-border flex items-center px-4 justify-between bg-background/80 backdrop-blur-md z-10 sticky top-0">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="-ml-2">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-72">
              <Sidebar className="h-full w-full border-none" />
            </SheetContent>
          </Sheet>
          <span className="font-semibold">{workspace?.name || "Workspace"}</span>
          <Button variant="ghost" size="icon" onClick={() => setLocation("/app/chat")}>
            <Plus className="w-5 h-5" />
          </Button>
        </header>

        {/* Workspace Header (Desktop) */}
        <div className="hidden md:flex h-16 border-b border-border items-center px-6 justify-between bg-background/50 backdrop-blur-sm">
          <div className="font-semibold text-lg flex items-center gap-2">
             {conversation?.title || (conversationId ? "Loading..." : "New Conversation")}
          </div>
          <div className="text-sm text-muted-foreground">
            {workspace?.name || "My Workspace"}
          </div>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto scroll-smooth" ref={scrollRef}>
          <div className="max-w-3xl mx-auto min-h-full pb-4">
            {!conversationId ? (
              <div className="h-full flex flex-col items-center justify-center p-8 text-center mt-20 md:mt-0">
                <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
                  <Plus className="w-8 h-8" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Start a new conversation</h2>
                <p className="text-muted-foreground max-w-md mb-8">
                  Ask questions about your documents, generate content, or explore your knowledge base.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-2xl">
                  {["Summarize our Q3 goals", "What is our refund policy?", "Draft an email to the team", "Explain the deployment process"].map((suggestion) => (
                    <button 
                      key={suggestion}
                      onClick={() => setInput(suggestion)}
                      className="p-4 rounded-xl border border-border bg-card hover:border-primary/50 hover:bg-muted/50 transition-all text-left text-sm font-medium"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col pb-4">
                {conversation?.messages.map((msg) => (
                  <ChatMessage key={msg.id} message={msg} />
                ))}
                
                {isSending && (
                  <div className="p-6">
                    <div className="flex gap-4">
                      <div className="w-8 h-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
                        <Loader2 className="w-5 h-5 animate-spin" />
                      </div>
                      <div className="space-y-2 pt-1">
                        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                        <div className="h-4 w-64 bg-muted animate-pulse rounded" />
                      </div>
                    </div>
                  </div>
                )}
                <div className="h-4" /> {/* Spacer */}
              </div>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 md:p-6 bg-background border-t border-border">
          <div className="max-w-3xl mx-auto relative">
            <motion.div 
              initial={false}
              animate={{ 
                boxShadow: "0 0 0 1px var(--ring)",
              }}
              className="relative rounded-2xl bg-muted/30 border border-input focus-within:ring-2 focus-within:ring-ring focus-within:border-primary transition-all overflow-hidden"
            >
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Message MindVault..."
                className="min-h-[60px] max-h-[200px] w-full resize-none border-0 bg-transparent py-4 px-4 focus-visible:ring-0 focus-visible:ring-offset-0 text-base"
                rows={1}
                style={{ height: 'auto', minHeight: '60px' }}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = `${target.scrollHeight}px`;
                }}
              />
              <div className="absolute right-2 bottom-2">
                <Button 
                  size="icon" 
                  onClick={handleSend}
                  disabled={!input.trim() || isSending}
                  className={input.trim() ? "bg-primary text-primary-foreground shadow-lg" : "bg-muted text-muted-foreground"}
                >
                  {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
            </motion.div>
            <p className="text-xs text-center text-muted-foreground mt-3">
              MindVault can make mistakes. Verify important information.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
