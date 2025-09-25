import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { HomePage } from "@/components/home-page";
import { CreateRoomModal } from "@/components/create-room-modal";
import { JoinRoomModal } from "@/components/join-room-modal";

export function Index() {
  const navigate = useNavigate();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [joinModalOpen, setJoinModalOpen] = useState(false);

  const handleJoinSuccess = (roomCode: string, displayName: string) => {
    navigate(`/room/${roomCode}`);
  };

  return (
    <>
      <HomePage 
        onCreateRoom={() => setCreateModalOpen(true)}
        onJoinRoom={() => setJoinModalOpen(true)}
      />
      
      <CreateRoomModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen}
      />
      
      <JoinRoomModal 
        open={joinModalOpen} 
        onOpenChange={setJoinModalOpen}
        onJoinSuccess={handleJoinSuccess}
      />
    </>
  );
}

export default Index;