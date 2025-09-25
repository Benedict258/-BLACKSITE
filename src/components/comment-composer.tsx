import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface CommentComposerProps {
  postId: string;
  parentCommentId?: string;
  displayName: string;
  onCommentCreated?: () => void;
  onCancel?: () => void;
  placeholder?: string;
  autoFocus?: boolean;
}

export function CommentComposer({ 
  postId, 
  parentCommentId, 
  displayName, 
  onCommentCreated, 
  onCancel, 
  placeholder = "Add a comment...",
  autoFocus = false 
}: CommentComposerProps) {
  const [content, setContent] = useState("");
  const [isPosting, setIsPosting] = useState(false);
  const { toast } = useToast();

  const handleComment = async () => {
    if (!content.trim()) {
      toast({
        title: "Content required",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }

    setIsPosting(true);
    
    try {
      const { error } = await supabase
        .from('comments')
        .insert({
          post_id: postId,
          parent_comment_id: parentCommentId || null,
          author_display: displayName,
          content: content.trim(),
        });

      if (error) {
        throw error;
      }

      setContent("");
      onCommentCreated?.();
      
      toast({
        title: "Comment added",
        description: "Your comment has been posted",
      });
    } catch (error) {
      console.error('Error creating comment:', error);
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPosting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleComment();
    } else if (e.key === 'Escape') {
      onCancel?.();
    }
  };

  return (
    <div className="flex gap-2 mt-2">
      <Input
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1"
        disabled={isPosting}
        maxLength={500}
        autoFocus={autoFocus}
      />
      
      <Button
        onClick={handleComment}
        disabled={isPosting || !content.trim()}
        size="sm"
        variant="neon"
      >
        {isPosting ? (
          <div className="w-3 h-3 border border-background border-t-transparent rounded-full animate-spin" />
        ) : (
          <Send className="w-3 h-3" />
        )}
      </Button>
      
      {onCancel && (
        <Button
          onClick={onCancel}
          disabled={isPosting}
          size="sm"
          variant="outline"
        >
          Cancel
        </Button>
      )}
    </div>
  );
}