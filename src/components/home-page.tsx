import { useState } from "react";
import { Plus, LogIn, Code, Users, Lock, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { CreateRoomModal } from "@/components/create-room-modal";
import { JoinRoomModal } from "@/components/join-room-modal";

interface HomePageProps {
  onCreateRoom?: () => void;
  onJoinRoom?: () => void;
}

export function HomePage({ onCreateRoom, onJoinRoom }: HomePageProps = {}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md shadow-neon flex items-center justify-center">
              <Code className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold font-mono">BLACKSITE</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mb-8 inline-block">
            <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-neon animate-glow-pulse">
              <Users className="w-10 h-10 text-primary" />
            </div>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-br from-foreground to-foreground/60 bg-clip-text text-transparent">
            Anonymous
            <span className="text-primary block mt-2">Post Rooms</span>
          </h1>

          <p className="text-xl text-muted-foreground mb-12 max-w-2xl mx-auto leading-relaxed">
            Create ephemeral rooms for anonymous discussions. Share posts, comments, and media without accounts. 
            <span className="text-primary font-medium"> Privacy first</span>.
          </p>

          {/* Main CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
            <Button
              size="lg"
              variant="neon"
              onClick={() => onCreateRoom ? onCreateRoom() : setShowCreateModal(true)}
              className="text-base px-8 py-6 h-auto"
            >
              <Plus className="mr-2 h-5 w-5" />
              Create Room
            </Button>
            
            <Button
              size="lg"
              variant="neon-outline"
              onClick={() => onJoinRoom ? onJoinRoom() : setShowJoinModal(true)}
              className="text-base px-8 py-6 h-auto"
            >
              <LogIn className="mr-2 h-5 w-5" />
              Join Room
            </Button>
          </div>

          {/* Features Grid */}
          <div className="grid md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            <div className="p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Anonymous</h3>
              <p className="text-sm text-muted-foreground">No accounts required. Choose any display name per room.</p>
            </div>

            <div className="p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Real-time</h3>
              <p className="text-sm text-muted-foreground">Posts and comments appear instantly for all participants.</p>
            </div>

            <div className="p-6 rounded-lg border border-border/50 bg-card/50 backdrop-blur">
              <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                <Code className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold mb-2">Simple</h3>
              <p className="text-sm text-muted-foreground">Share a room code, start posting. No complex setup required.</p>
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <CreateRoomModal open={showCreateModal} onOpenChange={setShowCreateModal} />
      <JoinRoomModal open={showJoinModal} onOpenChange={setShowJoinModal} />
    </div>
  );
}