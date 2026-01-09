import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Zap, Loader2, ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function AuthPage() {
  const { 
    login, 
    register, 
    confirm,
    isLoggingIn, 
    isRegistering, 
    isConfirming,
    user,
    pendingConfirmEmail,
    pendingConfirmUsername,
    clearPendingConfirm
  } = useAuth();
  const [, setLocation] = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [activeTab, setActiveTab] = useState("login");

  if (user) {
    setLocation("/app/chat");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (activeTab === "login") {
      login({ email, password });
    } else {
      register({ email, password });
    }
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingConfirmUsername) {
      confirm({ username: pendingConfirmUsername, code: confirmCode });
    }
  };

  const handleBackToLogin = () => {
    clearPendingConfirm();
    setConfirmCode("");
    setActiveTab("login");
  };

  const isLoading = isLoggingIn || isRegistering;

  if (pendingConfirmEmail) {
    return (
      <div className="min-h-screen grid lg:grid-cols-2 bg-background">
        <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent scale-150" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-2 font-bold text-2xl mb-12">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                <Zap className="w-6 h-6 text-white" />
              </div>
              Lucidoc AI
            </div>
            
            <h1 className="text-5xl font-bold leading-tight mb-6">
              Almost there!
            </h1>
            <p className="text-lg text-primary-foreground/80 max-w-md leading-relaxed">
              We've sent a verification code to your email. Enter it below to complete your registration.
            </p>
          </div>
        </div>

        <div className="flex items-center justify-center p-8 bg-muted/20">
          <Card className="w-full max-w-md shadow-xl border-border/60">
            <CardHeader className="space-y-1 text-center pb-8">
              <CardTitle className="text-2xl font-bold">Verify your email</CardTitle>
              <CardDescription>
                Enter the 6-digit code sent to {pendingConfirmEmail}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleConfirmSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Verification Code</Label>
                  <Input 
                    id="code" 
                    type="text" 
                    placeholder="123456" 
                    value={confirmCode}
                    onChange={(e) => setConfirmCode(e.target.value)}
                    required
                    maxLength={6}
                    className="h-11 bg-background/50 text-center text-2xl tracking-widest"
                    data-testid="input-confirm-code"
                  />
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 text-base mt-6 shadow-lg shadow-primary/20" 
                  disabled={isConfirming}
                  data-testid="button-confirm"
                >
                  {isConfirming && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Verify Email
                </Button>

                <Button 
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={handleBackToLogin}
                  data-testid="button-back-to-login"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Login
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex flex-col justify-between bg-primary p-12 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white via-transparent to-transparent scale-150" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-2 font-bold text-2xl mb-12">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
              <Zap className="w-6 h-6 text-white" />
            </div>
            Lucidoc AI
          </div>
          
          <h1 className="text-5xl font-bold leading-tight mb-6">
            Unlock your <br/> collective intelligence.
          </h1>
          <p className="text-lg text-primary-foreground/80 max-w-md leading-relaxed">
            Join thousands of teams using Lucidoc AI to turn their scattered documents into actionable insights.
          </p>
        </div>

        <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-xl p-6 border border-white/20 max-w-sm">
          <p className="italic text-lg mb-4">"It's like having a brilliant colleague who has read every document we've ever written."</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/20" />
            <div>
              <div className="font-semibold">Sarah Jenkins</div>
              <div className="text-sm opacity-70">CTO at TechFlow</div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-8 bg-muted/20">
        <Card className="w-full max-w-md shadow-xl border-border/60">
          <CardHeader className="space-y-1 text-center pb-8">
            <CardTitle className="text-2xl font-bold">Welcome back</CardTitle>
            <CardDescription>
              Enter your credentials to access your workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-8">
                <TabsTrigger value="login" data-testid="tab-login">Login</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Register</TabsTrigger>
              </TabsList>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="name@company.com" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-11 bg-background/50"
                    data-testid="input-email"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input 
                    id="password" 
                    type="password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-11 bg-background/50"
                    data-testid="input-password"
                  />
                  {activeTab === "register" && (
                    <p className="text-xs text-muted-foreground">
                      Min 8 characters, uppercase, lowercase, and number required
                    </p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full h-11 text-base mt-6 shadow-lg shadow-primary/20" 
                  disabled={isLoading}
                  data-testid="button-submit"
                >
                  {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  {activeTab === "login" ? "Sign In" : "Create Account"}
                </Button>
              </form>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
