import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { trpc } from "@/lib/trpc";
import { Loader2, MessageCircle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ChatPage() {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  const { data: messages, isLoading } = trpc.chat.messages.useQuery(
    { limit: 100 },
    { refetchInterval: 5000 }
  );

  const sendMessage = trpc.chat.send.useMutation({
    onSuccess: () => {
      setMessage("");
      utils.chat.messages.invalidate();
      inputRef.current?.focus();
    },
    onError: (err) => {
      const errorMessage = err?.message || "Failed to send message";
      console.error("Chat error:", errorMessage);
    },
  });

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    sendMessage.mutate({ content: message.trim() });
  };

  // Reverse messages for display (newest at bottom)
  const sortedMessages = messages ? [...messages].reverse() : [];

  // Check if a message content looks like a URL
  const renderContent = (content: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    const parts = content.split(urlRegex);
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary underline hover:no-underline break-all"
        >
          {part}
        </a>
      ) : (
        <span key={i}>{part}</span>
      )
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="mb-4">
        <h1 className="text-2xl font-serif font-bold">Chat</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Discuss books, share links, and connect with club members
        </p>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden">
        <CardHeader className="pb-3 border-b shrink-0">
          <CardTitle className="text-base flex items-center gap-2">
            <MessageCircle className="h-4 w-4" />
            General Discussion
          </CardTitle>
        </CardHeader>
        <CardContent className="flex-1 p-0 flex flex-col overflow-hidden">
          {isLoading ? (
            <div className="p-4 space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {sortedMessages.length > 0 ? (
                sortedMessages.map((msg) => {
                  const isOwn = msg.userId === user?.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-start gap-3 ${isOwn ? "flex-row-reverse" : ""}`}
                    >
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {(msg.userName ?? "?").charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div
                        className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-xs font-medium">
                            {msg.userName ?? "Unknown"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(msg.createdAt).toLocaleTimeString(
                              "en-US",
                              {
                                hour: "numeric",
                                minute: "2-digit",
                              }
                            )}
                          </span>
                        </div>
                        <div
                          className={`inline-block rounded-lg px-3 py-2 text-sm ${
                            isOwn
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {renderContent(msg.content)}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <MessageCircle className="h-10 w-10 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">
                    No messages yet. Start the conversation!
                  </p>
                </div>
              )}
            </div>
          )}

          <form
            onSubmit={handleSend}
            className="border-t p-3 flex items-center gap-2 shrink-0"
          >
            <Input
              ref={inputRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              className="flex-1"
              disabled={sendMessage.isPending}
            />
            <Button
              type="submit"
              size="icon"
              disabled={!message.trim() || sendMessage.isPending}
            >
              {sendMessage.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
