import { MessageWithSources } from "@shared/schema";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import { Bot, User, BookOpen, ExternalLink } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface ChatMessageProps {
  message: MessageWithSources;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const [showSources, setShowSources] = useState(false);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={cn(
        "flex w-full gap-4 p-4 md:p-6",
        isUser ? "bg-muted/30" : "bg-background"
      )}
    >
      <div className="flex-shrink-0 mt-1">
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center border shadow-sm",
          isUser 
            ? "bg-white border-border text-foreground" 
            : "bg-primary text-primary-foreground border-primary"
        )}>
          {isUser ? <User className="w-5 h-5" /> : <Bot className="w-5 h-5" />}
        </div>
      </div>

      <div className="flex-1 min-w-0 space-y-4">
        <div className="prose prose-sm md:prose-base max-w-none dark:prose-invert break-words text-foreground leading-relaxed">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="pt-2 border-t border-border/50">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <BookOpen className="w-3 h-3" />
              {message.sources.length} Sources used
            </button>
            
            <AnimatePresence>
              {showSources && (
                <motion.div 
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="grid gap-2 mt-3 pt-1">
                    {message.sources.map((source, i) => (
                      <div 
                        key={i} 
                        className="p-3 rounded-md bg-muted/50 border border-border text-sm flex items-start gap-3 hover:bg-muted/80 transition-colors"
                      >
                        <div className="bg-background p-1.5 rounded-md border border-border shadow-sm">
                          <BookOpen className="w-3.5 h-3.5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate text-foreground">{source.title}</div>
                          {source.url && (
                            <a 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-muted-foreground hover:text-primary hover:underline flex items-center gap-1 mt-0.5 truncate"
                            >
                              {source.url}
                              <ExternalLink className="w-2.5 h-2.5" />
                            </a>
                          )}
                          {!source.url && (
                            <p className="text-xs text-muted-foreground mt-0.5">Relevance score: {source.score}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>
    </motion.div>
  );
}
