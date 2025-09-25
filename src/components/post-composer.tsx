import { useState, useRef } from "react";
import { Send, Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface PostComposerProps {
  roomId: string;
  displayName: string;
  onPostCreated?: () => void;
  placeholder?: string;
}

export function PostComposer({ roomId, displayName, onPostCreated, placeholder = "What's on your mind?" }: PostComposerProps) {
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);

  const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
  const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
  const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp"];
  const ALLOWED_VIDEO = ["video/mp4", "video/webm"];

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const incoming = Array.from(e.target.files || []);
    if (!incoming.length) return;

    const valid: File[] = [];
    for (const f of incoming) {
      const isImage = f.type.startsWith("image/");
      const isVideo = f.type.startsWith("video/");
      if (!isImage && !isVideo) {
        toast({ title: "Unsupported file", description: f.name, variant: "destructive" });
        continue;
      }
      if (isImage && !ALLOWED_IMAGE.includes(f.type)) {
        toast({ title: "Unsupported image type", description: f.type, variant: "destructive" });
        continue;
      }
      if (isVideo && !ALLOWED_VIDEO.includes(f.type)) {
        toast({ title: "Unsupported video type", description: f.type, variant: "destructive" });
        continue;
      }
      if (isImage && f.size > MAX_IMAGE_BYTES) {
        toast({ title: "Image too large", description: `${f.name} > 8MB`, variant: "destructive" });
        continue;
      }
      if (isVideo && f.size > MAX_VIDEO_BYTES) {
        toast({ title: "Video too large", description: `${f.name} > 50MB`, variant: "destructive" });
        continue;
      }
      valid.push(f);
    }
    setFiles(prev => [...prev, ...valid]);
    // reset input so selecting the same file again triggers change
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  async function uploadSelectedFiles(): Promise<Array<{ url: string; type: "image" | "video"; size: number; mime: string }>> {
    if (!files.length) return [];
    const uploaded: Array<{ url: string; type: "image" | "video"; size: number; mime: string }> = [];
    for (const f of files) {
      const ext = (f.name.split(".").pop() || "").toLowerCase();
      const id = (globalThis.crypto?.randomUUID?.() || Math.random().toString(36).slice(2));
      const path = `${roomId}/${id}.${ext}`;

      const { error: upErr } = await supabase.storage.from("media").upload(path, f, {
        cacheControl: "3600",
        contentType: f.type,
        upsert: false,
      });
      if (upErr) {
        console.error("Upload error", upErr);
        throw new Error(`Failed to upload ${f.name}. Ensure a public 'media' bucket exists in Supabase Storage.`);
      }

      const { data } = supabase.storage.from("media").getPublicUrl(path);
      const publicUrl = data.publicUrl;
      uploaded.push({ url: publicUrl, type: f.type.startsWith("image/") ? "image" : "video", size: f.size, mime: f.type });

      // Record in uploads table (best-effort)
      await supabase.from("uploads").insert({
        room_id: roomId,
        uploader_display: displayName,
        url: publicUrl,
        mime_type: f.type,
        size: f.size,
      });
    }
    return uploaded;
  }

  const handlePost = async () => {
    if (!content.trim() && files.length === 0) {
      toast({
        title: "Content required",
        description: "Add text or attach media to post",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);
    
    try {
      // Upload media first (if any)
      const mediaUploads = await uploadSelectedFiles();

      const { error } = await supabase
        .from('posts')
        .insert({
          room_id: roomId,
          author_display: displayName,
          content: content.trim(),
          media: mediaUploads.map(m => ({ url: m.url, type: m.type, size: m.size })),
        });

      if (error) {
        throw error;
      }

      setContent("");
      setFiles([]);
      onPostCreated?.();
      
      toast({
        title: "Post created",
        description: files.length ? "Your post and media have been shared" : "Your post has been shared with the room",
      });
    } catch (error) {
      console.error('Error creating post:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create post. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handlePost();
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, idx) => (
            <span key={idx} className="text-xs px-2 py-1 bg-muted rounded flex items-center gap-1">
              {f.name}
              <button
                type="button"
                className="ml-1 text-muted-foreground hover:text-foreground"
                onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                aria-label={`Remove ${f.name}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1"
        disabled={isPosting}
        maxLength={1000}
      />
      
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/jpeg,image/png,image/webp,video/mp4,video/webm"
        multiple
        onChange={onPickFiles}
      />
      
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => fileInputRef.current?.click()}
          disabled={isPosting}
          title="Add media"
        >
          <Image className="w-4 h-4" />
        </Button>
        
        <Button
          onClick={handlePost}
          disabled={isPosting || (!content.trim() && files.length === 0)}
          variant="neon"
        >
          {isPosting ? (
            <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  );
}