import { useAuth } from "@/hooks/use-auth";
import { Sidebar } from "@/components/layout/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, User, Mail, Shield, Smartphone } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function SettingsPage() {
  const { user, logout, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && !user) {
      setLocation("/auth");
    }
  }, [user, isLoading, setLocation]);

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      <div className="hidden md:block w-72 h-full flex-shrink-0">
        <Sidebar className="h-full w-full" />
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-2xl mx-auto space-y-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
            <p className="text-muted-foreground mt-2">Manage your account and preferences.</p>
          </div>

          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" /> Profile
                </CardTitle>
                <CardDescription>Your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="flex items-center gap-3">
                    <div className="relative flex-1">
                      <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                      <Input value={user.email} disabled className="pl-9 bg-muted/20" />
                    </div>
                  </div>
                </div>
                <div className="pt-2">
                  <p className="text-sm text-muted-foreground">
                    Your account is managed by your organization. Contact your administrator for changes.
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" /> Security
                </CardTitle>
                <CardDescription>Manage your session and access</CardDescription>
              </CardHeader>
              <CardContent>
                <Button 
                  variant="destructive" 
                  onClick={() => logout()}
                  className="w-full sm:w-auto"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out of all devices
                </Button>
              </CardContent>
            </Card>

            <Card className="opacity-60 pointer-events-none border-dashed">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="w-5 h-5" /> Notifications (Coming Soon)
                </CardTitle>
                <CardDescription>Configure how you receive updates</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label>Email Digest</Label>
                      <p className="text-sm text-muted-foreground">Receive a weekly summary of new knowledge</p>
                    </div>
                    <div className="h-5 w-9 bg-muted rounded-full" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
