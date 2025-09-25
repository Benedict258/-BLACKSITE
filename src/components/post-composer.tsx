import { useState, useRef, useMemo, useCallback } from "react";
import { Send, Image, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import DOMPurify from "dompurify";

interface PostComposerProps {
  roomId: string;
  displayName: string;
  onPostCreated?: () => void;
  placeholder?: string;
}

export function PostComposer({ roomId, displayName, onPostCreated, placeholder = "What's on your mind?" }: PostComposerProps) {
  // content is HTML string from Quill
  const [content, setContent] = useState("<p></p>");
  const [isPosting, setIsPosting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [files, setFiles] = useState<File[]>([]);

  const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB
  const MAX_VIDEO_BYTES = 50 * 1024 * 1024; // 50MB
  const ALLOWED_IMAGE = ["image/jpeg", "image/png", "image/webp"];
  const ALLOWED_VIDEO = ["video/mp4", "video/webm"];

  // Quill toolbar configuration: bold, italic (slant), strike, font size, font family
  const quillModules = useMemo(() => ({
    toolbar: [
      [{ font: [] }],
      [{ size: ["small", false, "large", "huge"] }],
      ["bold", "italic", "strike"],
      ["clean"],
    ],
    keyboard: {
      bindings: {
        // Ctrl+Enter to post
        submit: {
          key: 13,
          shortKey: true,
          handler: () => {
            handlePost();
            return false;
          },
        },
      },
    },
  }), []);

  const quillFormats = useMemo(
    () => ["bold", "italic", "strike", "size", "font"],
    []
  );

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

  const stripHtml = useCallback((html: string) => html.replace(/<[^>]+>/g, "").replace(/&nbsp;/g, " ").trim(), []);

  const handlePost = async () => {
    const textOnly = stripHtml(content || "");
    if (!textOnly && files.length === 0) {
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

      // Sanitize HTML but preserve Quill classes needed for font/size
      const safeHtml = DOMPurify.sanitize(content || "", {
        ALLOWED_ATTR: ["class", "style", "href", "rel", "target"],
      });

      const { error } = await supabase
        .from('posts')
        .insert({
          room_id: roomId,
          author_display: displayName,
          content: safeHtml,
          media: mediaUploads.map(m => ({ url: m.url, type: m.type, size: m.size })),
        });

      if (error) {
        throw error;
      }

      setContent("<p></p>");
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
      <div className="rounded-md border border-border/50 bg-background">
        <ReactQuill
          theme="snow"
          value={content}
          onChange={setContent}
          modules={quillModules}
          formats={quillFormats}
          placeholder={placeholder}
        />
      </div>
      
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