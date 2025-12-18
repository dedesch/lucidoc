import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ArrowRight, CheckCircle2, Shield, Zap, Database } from "lucide-react";
import { motion } from "framer-motion";

// Unsplash images for visuals
// Abstract technology background: https://images.unsplash.com/photo-1518770660439-4636190af475
// Modern office setup: https://images.unsplash.com/photo-1497215728101-856f4ea42174

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Navbar */}
      <nav className="border-b border-border/40 backdrop-blur-md fixed w-full z-50 bg-background/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            MindVault
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth">
              <Button variant="ghost" className="font-medium">Log in</Button>
            </Link>
            <Link href="/auth">
              <Button className="font-medium shadow-lg shadow-primary/20">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm font-medium mb-6">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                  RAG-powered Intelligence
                </div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight leading-tight">
                  Chat with your <span className="text-primary">Company Knowledge</span>
                </h1>
                <p className="mt-6 text-xl text-muted-foreground leading-relaxed">
                  MindVault connects your team's documentation, code, and wikis into a single, intelligent chat interface powered by advanced RAG technology.
                </p>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Link href="/auth" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full gap-2 text-base h-12 px-8 shadow-xl shadow-primary/20 hover:scale-105 transition-transform">
                    Start Free Trial <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
                <Button variant="outline" size="lg" className="w-full sm:w-auto gap-2 text-base h-12 px-8">
                  View Demo
                </Button>
              </motion.div>
              
              <div className="pt-8 flex items-center gap-6 text-sm text-muted-foreground border-t border-border">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>Enterprise Security</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>99.9% Uptime</span>
                </div>
              </div>
            </div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7 }}
              className="relative rounded-2xl overflow-hidden shadow-2xl border border-border bg-muted/20 aspect-video md:aspect-square lg:aspect-video group"
            >
              {/* Abstract decorative image */}
              <img 
                src="https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80" 
                alt="Technology Visualization" 
                className="absolute inset-0 w-full h-full object-cover opacity-90 transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/20 to-transparent flex items-end p-8">
                <div className="bg-background/90 backdrop-blur-md p-6 rounded-xl border border-border shadow-lg w-full max-w-sm">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 rounded bg-primary/10 flex items-center justify-center text-primary">
                      <Bot className="w-5 h-5" />
                    </div>
                    <div className="font-semibold">AI Assistant</div>
                  </div>
                  <p className="text-muted-foreground text-sm">
                    Based on your Q3 documentation, the project timeline has shifted by 2 weeks due to the API integration delay.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Features Grid */}
          <div className="mt-32 grid md:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Database className="w-6 h-6 text-blue-500" />}
              title="Unified Data Source"
              description="Connect Notion, Google Drive, and Slack into one searchable knowledge base."
            />
            <FeatureCard 
              icon={<Shield className="w-6 h-6 text-purple-500" />}
              title="Private & Secure"
              description="Your data is encrypted at rest and in transit. We never train on your data."
            />
            <FeatureCard 
              icon={<Zap className="w-6 h-6 text-yellow-500" />}
              title="Instant Answers"
              description="Get citations and source links with every answer so you can trust the output."
            />
          </div>
        </div>
      </main>

      <footer className="border-t border-border py-12 bg-muted/30">
        <div className="max-w-7xl mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 MindVault Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-shadow">
      <div className="w-12 h-12 rounded-lg bg-background border border-border flex items-center justify-center mb-4 shadow-sm">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-2">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </div>
  );
}

import { Bot } from "lucide-react";
