import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface OwnerSettingsDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  roomCode: string;
}

// Minimal owner settings placeholder dialog
export function OwnerSettingsDialog({ open, onOpenChange, roomCode }: OwnerSettingsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Room Settings <Badge variant="outline" className="ml-2">{roomCode}</Badge></DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">Owner controls will appear here (delete room, set expiry, manage bans, etc.).</p>
          <Separator />
          <ul className="text-sm list-disc pl-5 space-y-1 text-muted-foreground">
            <li>Delete room (coming soon)</li>
            <li>Set/change expiry (coming soon)</li>
            <li>Manage banned display names (coming soon)</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default OwnerSettingsDialog;