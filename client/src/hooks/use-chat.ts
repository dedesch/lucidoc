import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type ChatRequest } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";

export function useConversations() {
  return useQuery({
    queryKey: [api.chat.list.path],
    queryFn: async () => {
      const res = await fetch(api.chat.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversations");
      return api.chat.list.responses[200].parse(await res.json());
    },
  });
}

export function useConversation(id: number | null) {
  return useQuery({
    queryKey: [api.chat.history.path, id],
    queryFn: async () => {
      if (!id) return null;
      const url = buildUrl(api.chat.history.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error("Failed to fetch conversation history");
      return api.chat.history.responses[200].parse(await res.json());
    },
    enabled: !!id,
  });
}

export function useSendMessage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (data: ChatRequest) => {
      const res = await fetch(api.chat.send.path, {
        method: api.chat.send.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });

      if (!res.ok) throw new Error("Failed to send message");
      return api.chat.send.responses[200].parse(await res.json());
    },
    onSuccess: (data) => {
      // Invalidate list to show new conversation or updated timestamp
      queryClient.invalidateQueries({ queryKey: [api.chat.list.path] });
      // Invalidate specific conversation history
      queryClient.invalidateQueries({ 
        queryKey: [api.chat.history.path, data.conversationId] 
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        variant: "destructive",
      });
    },
  });
}

export function useWorkspace() {
  return useQuery({
    queryKey: [api.workspace.get.path],
    queryFn: async () => {
      const res = await fetch(api.workspace.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch workspace");
      return api.workspace.get.responses[200].parse(await res.json());
    },
  });
}
