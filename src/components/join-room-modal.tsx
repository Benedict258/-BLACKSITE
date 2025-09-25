import { useState } from "react";
import { LogIn, User, Lock } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { isValidRoomCode, formatDisplayName, isDisplayNameBanned, hashString } from "@/lib/room-utils";

interface JoinRoomModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onJoinSuccess?: (roomCode: string, displayName: string) => void;
}

export function JoinRoomModal({ open, onOpenChange, onJoinSuccess }: JoinRoomModalProps) {
  const [roomCode, setRoomCode] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [step, setStep] = useState<'code' | 'details'>('code');
  const [roomInfo, setRoomInfo] = useState<{
    title: string;
    description?: string;
    requiresPassword: boolean;
  } | null>(null);
  
  const { toast } = useToast();

  const validateRoomCode = async () => {
    if (!roomCode.trim()) {
      toast({
        title: "Room code required",
        description: "Please enter a room code",
        variant: "destructive",
      });
      return;
    }

    if (!isValidRoomCode(roomCode)) {
      toast({
        title: "Invalid format",
        description: "Room code must be in format ABCD-1234",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      // Check if room exists
      const { data: roomData, error } = await supabase
        .from('rooms')
        .select('title, description, password_hash, expiry_at')
        .eq('code', roomCode)
        .single();

      if (error || !roomData) {
        toast({
          title: "Room not found",
          description: "Please check the code and try again.",
          variant: "destructive",
        });
        return;
      }

      // Check if room has expired
      if (roomData.expiry_at && new Date(roomData.expiry_at) < new Date()) {
        toast({
          title: "Room expired",
          description: "This room is no longer available.",
          variant: "destructive",
        });
        return;
      }

      setRoomInfo({
        title: roomData.title,
        description: roomData.description,
        requiresPassword: !!roomData.password_hash,
      });
      setStep('details');
    } catch (error) {
      console.error('Error validating room:', error);
      toast({
        title: "Error",
        description: "Failed to validate room code. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const joinRoom = async () => {
    const formattedName = formatDisplayName(displayName);
    
    if (!formattedName) {
      toast({
        title: "Display name required",
        description: "Please enter a display name",
        variant: "destructive",
      });
      return;
    }

    if (roomInfo?.requiresPassword && !password.trim()) {
      toast({
        title: "Password required",
        description: "This room requires a password",
        variant: "destructive",
      });
      return;
    }

    setIsJoining(true);

    try {
      // Get room details for validation
      const { data: roomData, error: roomError } = await supabase
        .from('rooms')
        .select('id, password_hash')
        .eq('code', roomCode)
        .single();

      if (roomError || !roomData) {
        toast({
          title: "Room not found",
          description: "The room may have been deleted.",
          variant: "destructive",
        });
        return;
      }

      // Validate password if required
      if (roomData.password_hash && password) {
        const passwordHash = await hashString(password);
        if (passwordHash !== roomData.password_hash) {
          toast({
            title: "Incorrect password",
            description: "Please check the password and try again.",
            variant: "destructive",
          });
          return;
        }
      }

      // Check if display name is banned
      const isBanned = await isDisplayNameBanned(roomData.id, formattedName);
      if (isBanned) {
        toast({
          title: "Display name banned",
          description: "This display name is not allowed in this room.",
          variant: "destructive",
        });
        return;
      }

      // Store session info in localStorage
      localStorage.setItem('blacksite_session', JSON.stringify({
        roomCode,
        displayName: formattedName,
        joinedAt: new Date().toISOString(),
      }));

      toast({
        title: "Joined room successfully!",
        description: `Welcome to ${roomInfo?.title}`,
      });

      // Call success callback to navigate to room
      if (onJoinSuccess) {
        onJoinSuccess(roomCode, formattedName);
      }

      resetModal();
    } catch (error) {
      console.error('Error joining room:', error);
      toast({
        title: "Error joining room",
        description: "Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsJoining(false);
    }
  };

  const resetModal = () => {
    setRoomCode("");
    setDisplayName("");
    setPassword("");
    setStep('code');
    setRoomInfo(null);
    onOpenChange(false);
  };

  const formatRoomCode = (value: string) => {
    // Auto-format room code as user types
    const cleaned = value.replace(/[^A-Z0-9]/g, '').toUpperCase();
    if (cleaned.length <= 4) return cleaned;
    return `${cleaned.slice(0, 4)}-${cleaned.slice(4, 8)}`;
  };

  const handleRoomCodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatRoomCode(e.target.value);
    setRoomCode(formatted);
  };

  return (
    <Dialog open={open} onOpenChange={resetModal}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
              <LogIn className="w-4 h-4 text-primary" />
            </div>
            Join Room
          </DialogTitle>
          <DialogDescription>
            {step === 'code' 
              ? "Enter the room code to find the room"
              : `Choose your display name for "${roomInfo?.title}"`
            }
          </DialogDescription>
        </DialogHeader>

        {step === 'code' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="room-code">Room Code</Label>
              <Input
                id="room-code"
                value={roomCode}
                onChange={handleRoomCodeChange}
                placeholder="ABCD-1234"
                className="mt-1 font-mono text-lg text-center uppercase"
                maxLength={9}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Enter the 8-character room code (e.g., ABCD-1234)
              </p>
            </div>

            <Button
              onClick={validateRoomCode}
              disabled={isJoining || !isValidRoomCode(roomCode)}
              className="w-full"
              variant="neon"
            >
              {isJoining ? "Finding Room..." : "Find Room"}
            </Button>
          </div>
        )}

        {step === 'details' && roomInfo && (
          <div className="space-y-4">
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium">{roomInfo.title}</h4>
              {roomInfo.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {roomInfo.description}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="display-name" className="flex items-center gap-2">
                <User className="w-4 h-4" />
                Display Name
              </Label>
              <Input
                id="display-name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Choose any name..."
                className="mt-1"
                maxLength={25}
              />
              <p className="text-xs text-muted-foreground mt-1">
                This name will be visible to others in the room
              </p>
            </div>

            {roomInfo.requiresPassword && (
              <div>
                <Label htmlFor="room-password" className="flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  Room Password
                </Label>
                <Input
                  id="room-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter room password"
                  className="mt-1"
                />
              </div>
            )}

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setStep('code')}
                className="flex-1"
              >
                Back
              </Button>
              <Button
                onClick={joinRoom}
                disabled={isJoining || !displayName.trim()}
                className="flex-1"
                variant="neon"
              >
                {isJoining ? "Joining..." : "Join Room"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}