import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState } from "react";

interface AuthRequest {
  email: string;
  password: string;
}

interface RegisterResponse {
  id?: number;
  email: string;
  confirmed?: boolean;
  message?: string;
}

interface LoginResponse {
  id: number;
  email: string;
  needsConfirmation?: boolean;
  message?: string;
}

export function useAuth() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [pendingConfirmEmail, setPendingConfirmEmail] = useState<string | null>(null);

  const { data: user, isLoading, error } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return res.json();
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: AuthRequest) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        if (data.needsConfirmation) {
          throw new Error("NEEDS_CONFIRMATION:" + credentials.email);
        }
        throw new Error(data.message || "Login failed");
      }
      return data as LoginResponse;
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], data);
      toast({ title: "Welcome back!", description: "Successfully logged in." });
      setLocation("/app/chat");
    },
    onError: (error: Error) => {
      if (error.message.startsWith("NEEDS_CONFIRMATION:")) {
        const email = error.message.replace("NEEDS_CONFIRMATION:", "");
        setPendingConfirmEmail(email);
        toast({ 
          title: "Email not verified", 
          description: "Please enter the verification code sent to your email.",
          variant: "destructive" 
        });
      } else {
        toast({ 
          title: "Login Failed", 
          description: error.message,
          variant: "destructive" 
        });
      }
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: AuthRequest) => {
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Registration failed");
      }
      return data as RegisterResponse;
    },
    onSuccess: (data) => {
      if (data.confirmed) {
        queryClient.setQueryData([api.auth.me.path], data);
        toast({ title: "Account created", description: "Welcome to your new workspace." });
        setLocation("/app/chat");
      } else {
        setPendingConfirmEmail(data.email);
        toast({ 
          title: "Verification required", 
          description: "Please check your email for a verification code." 
        });
      }
    },
    onError: (error: Error) => {
      toast({ 
        title: "Registration Failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const confirmMutation = useMutation({
    mutationFn: async ({ email, code }: { email: string; code: string }) => {
      const res = await fetch("/api/auth/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
        credentials: "include",
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.message || "Confirmation failed");
      }
      return data;
    },
    onSuccess: () => {
      setPendingConfirmEmail(null);
      toast({ 
        title: "Email verified!", 
        description: "You can now log in with your credentials." 
      });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Confirmation Failed", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, { 
        method: api.auth.logout.method,
        credentials: "include" 
      });
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      setLocation("/");
      toast({ title: "Logged out", description: "See you next time!" });
    },
  });

  const clearPendingConfirm = () => setPendingConfirmEmail(null);

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    confirm: confirmMutation.mutate,
    logout: logoutMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isConfirming: confirmMutation.isPending,
    pendingConfirmEmail,
    clearPendingConfirm,
  };
}
