import { useState } from "react";
import { Copy, Settings, Calendar, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generateRoomCode, generateOwnerToken, hashString, calculateExpiry } from "@/lib/room-utils";

interface CreateRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateRoomModal({ open, onOpenChange }: CreateRoomModalProps) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [password, setPassword] = useState("");
  const [ephemeral, setEphemeral] = useState(false);
  const [expiry, setExpiry] = useState("never");
  const [isCreating, setIsCreating] = useState(false);
  const [createdRoom, setCreatedRoom] = useState<{
    code: string;
    ownerToken: string;
    joinUrl: string;
  } | null>(null);
  
  const { toast } = useToast();

  const handleCreate = async () => {
    if (!title.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a room title",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // Generate room code and owner token
      let roomCode: string;
      let codeExists = true;
      
      // Ensure unique room code
      do {
        roomCode = generateRoomCode();
        const { data } = await supabase
          .from('rooms')
          .select('id')
          .eq('code', roomCode)
          .limit(1);
        codeExists = data && data.length > 0;
      } while (codeExists);

      const ownerToken = generateOwnerToken();
      const ownerTokenHash = await hashString(ownerToken);
      const expiryAt = calculateExpiry(expiry);
      const passwordHash = password ? await hashString(password) : null;

      // Create room in database
      const { data: roomData, error } = await supabase
        .from('rooms')
        .insert({
          code: roomCode,
          title: title.trim(),
          description: description.trim() || null,
          owner_token_hash: ownerTokenHash,
          is_ephemeral: ephemeral,
          expiry_at: expiryAt?.toISOString() || null,
          password_hash: passwordHash,
        })
        .select()
        .single();

      if (error) {
        throw error;
      }

  const joinUrl = `${window.location.origin}/#/room/${roomCode}`;
      
              // Store owner token for room management
              localStorage.setItem(`blacksite_owner_${roomCode}`, ownerToken);
              
              setCreatedRoom({
                code: roomCode,
                ownerToken,
                joinUrl,
              });

      toast({
        title: "Room created successfully!",
        description: `Room code: ${roomCode}`,
      });
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error creating room",
        description: "Please try again",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${type} copied!`,
      description: "Copied to clipboard",
    });
  };

  const resetModal = () => {
    setTitle("");
    setDescription("");
    setPassword("");
    setEphemeral(false);
    setExpiry("never");
    setCreatedRoom(null);
    onOpenChange(false);
  };

  if (createdRoom) {
    return (
      <Dialog open={open} onOpenChange={resetModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                <Settings className="w-4 h-4 text-primary" />
              </div>
              Room Created
            </DialogTitle>
            <DialogDescription>
              Your room has been created successfully. Share the code or URL to invite others.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="room-code">Room Code</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="room-code"
                  value={createdRoom.code}
                  readOnly
                  className="font-mono text-lg text-center"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(createdRoom.code, "Room code")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div>
              <Label htmlFor="join-url">Join URL</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  id="join-url"
                  value={createdRoom.joinUrl}
                  readOnly
                  className="text-xs"
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => copyToClipboard(createdRoom.joinUrl, "Join URL")}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Owner Token:</strong> Keep this safe for room management
              </p>
              <code className="text-xs font-mono break-all text-foreground">
                {createdRoom.ownerToken}
              </code>
            </div>

            <div className="flex gap-2 pt-4">
            <Button 
              onClick={() => {
                // Store session and owner token for auto-join
                localStorage.setItem('blacksite_session', JSON.stringify({
                  roomCode: createdRoom.code,
                  displayName: 'Room Creator',
                  joinedAt: new Date().toISOString(),
                }));
                // Navigate using hash URL to avoid server 404s on static hosting
                window.location.href = createdRoom.joinUrl;
              }}
              variant="neon" 
              className="flex-1"
            >
                Open Room
              </Button>
              <Button variant="outline" onClick={resetModal}>
                Done
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
              <Settings className="w-4 h-4 text-primary" />
            </div>
            Create Room
          </DialogTitle>
          <DialogDescription>
            Set up your anonymous posting room. Others can join using the generated room code.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Room Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Team Feedback Session"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional room description..."
              className="mt-1 resize-none"
              rows={3}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                Ephemeral Mode
              </Label>
              <p className="text-xs text-muted-foreground">
                Auto-delete content when room expires
              </p>
            </div>
            <Switch
              checked={ephemeral}
              onCheckedChange={setEphemeral}
            />
          </div>

          <div>
            <Label>Expiry</Label>
            <Select value={expiry} onValueChange={setExpiry}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="never">Never</SelectItem>
                <SelectItem value="1h">1 hour</SelectItem>
                <SelectItem value="6h">6 hours</SelectItem>
                <SelectItem value="24h">24 hours</SelectItem>
                <SelectItem value="7d">7 days</SelectItem>
                <SelectItem value="30d">30 days</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="password" className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Password (Optional)
            </Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave empty for public room"
              className="mt-1"
            />
          </div>

          <Button
            onClick={handleCreate}
            disabled={isCreating || !title.trim()}
            className="w-full"
            variant="neon"
          >
            {isCreating ? "Creating Room..." : "Create Room"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}