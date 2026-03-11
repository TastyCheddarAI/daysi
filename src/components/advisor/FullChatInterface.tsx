import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Bot, Phone, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useChat } from "@/contexts/ChatContext";
import { useAIChat } from "@/hooks/useAIChat";
import { ChatMessage } from "@/components/chat/ChatMessage";
import { ChatInput } from "@/components/chat/ChatInput";
import { SuggestedQuestions } from "@/components/chat/SuggestedQuestions";
import { Link } from "react-router-dom";
import { BRAND_CONFIG } from "@/lib/brand.config";

interface FullChatInterfaceProps {
  onBack: () => void;
}

export function FullChatInterface({ onBack }: FullChatInterfaceProps) {
  const { messages, isLoading } = useChat();
  const { sendMessage } = useAIChat("advisor");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Send intro message if coming from quiz (message already added by quiz)
  useEffect(() => {
    if (messages.length === 1 && messages[0].role === "user") {
      const quizSummary = messages[0].content;
      sendMessage(quizSummary, { appendUser: false });
    }
  }, [messages, sendMessage]);

  const showSuggestions = messages.length === 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20 flex flex-col pt-16">
      {/* Header */}
      <header className="sticky top-16 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex items-center justify-between h-16 px-4">
          <Button variant="ghost" onClick={onBack} className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            <span className="font-semibold">Beauty Advisor</span>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" asChild>
              <a href={`tel:${BRAND_CONFIG.FALLBACK_PHONE_INTL}`} className="gap-2">
                <Phone className="h-4 w-4" />
                <span className="hidden sm:inline">Call Us</span>
              </a>
            </Button>
            <Button size="sm" asChild>
              <Link to="/booking" className="gap-2">
                <Calendar className="h-4 w-4" />
                <span className="hidden sm:inline">Book Now</span>
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Chat Area */}
      <div className="flex-1 container max-w-3xl mx-auto px-4 py-6 flex flex-col">
        <ScrollArea ref={scrollRef} className="flex-1 -mx-4 px-4">
          {messages.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                <Bot className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold mb-3">How can I help you today?</h2>
              <p className="text-muted-foreground max-w-md mx-auto mb-8">
                I'm your AI beauty advisor. Ask me about treatments, pricing, 
                skincare tips, or get personalized recommendations.
              </p>
            </motion.div>
          ) : (
            <div className="py-4 space-y-1">
              {messages.map((msg, idx) => (
                <ChatMessage
                  key={msg.id}
                  role={msg.role}
                  content={msg.content}
                  isLatest={idx === messages.length - 1 && msg.role === "assistant" && isLoading}
                />
              ))}
              
              {isLoading && messages[messages.length - 1]?.role === "user" && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3 px-4 py-3 bg-muted/30"
                >
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-2 h-2 rounded-full bg-primary/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                </motion.div>
              )}
            </div>
          )}
        </ScrollArea>

        {/* Suggestions */}
        {showSuggestions && (
          <div className="py-4">
            <SuggestedQuestions onSelect={sendMessage} disabled={isLoading} />
          </div>
        )}

        {/* Input */}
        <div className="sticky bottom-0 bg-background pt-2 pb-4 -mx-4 px-4 border-t">
          <ChatInput 
            onSend={sendMessage} 
            disabled={isLoading}
            placeholder="Ask about treatments, pricing, or skincare tips..."
          />
        </div>
      </div>
    </div>
  );
}
