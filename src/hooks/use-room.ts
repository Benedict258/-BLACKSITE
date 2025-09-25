import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface Room {
  id: string;
  code: string;
  title: string;
  description?: string;
  is_ephemeral: boolean;
  expiry_at?: string;
  created_at: string;
}

export interface Post {
  id: string;
  room_id: string;
  author_display: string;
  content: string;
  media: any[];
  pinned: boolean;
  created_at: string;
  edited_at?: string;
  comments?: Comment[];
  comment_count?: number;
}

export interface Comment {
  id: string;
  post_id: string;
  parent_comment_id?: string;
  author_display: string;
  content: string;
  created_at: string;
  replies?: Comment[];
}

export function useRoom(roomCode: string) {
  const [room, setRoom] = useState<Room | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  // Load room data
  useEffect(() => {
    async function loadRoom() {
      try {
        const { data: roomData, error: roomError } = await supabase
          .from('rooms')
          .select('*')
          .eq('code', roomCode)
          .single();

        if (roomError) {
          setError('Room not found');
          return;
        }

        setRoom(roomData);
        await loadPosts(roomData.id);
      } catch (err) {
        setError('Failed to load room');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    if (roomCode) {
      loadRoom();
    }
  }, [roomCode]);

  // Load posts for room
  async function loadPosts(roomId: string) {
    try {
      const { data: postsData, error: postsError } = await supabase
        .from('posts')
        .select(`
          *,
          comments:comments(*)
        `)
        .eq('room_id', roomId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (postsError) {
        console.error('Error loading posts:', postsError);
        return;
      }

      // Process posts with comment counts and nested comments
      const processedPosts = postsData.map(post => ({
        ...post,
        media: Array.isArray(post.media) ? post.media : [],
        comment_count: post.comments?.length || 0,
        comments: organizeComments(post.comments || [])
      }));

      setPosts(processedPosts);
    } catch (err) {
      console.error('Failed to load posts:', err);
    }
  }

  // Organize flat comments into nested structure
  function organizeComments(flatComments: Comment[]): Comment[] {
    const commentMap = new Map<string, Comment & { replies: Comment[] }>();
    const rootComments: Comment[] = [];

    // First pass: create all comments with empty replies
    flatComments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });

    // Second pass: organize into parent-child relationships
    flatComments.forEach(comment => {
      const commentWithReplies = commentMap.get(comment.id)!;
      
      if (comment.parent_comment_id) {
        const parent = commentMap.get(comment.parent_comment_id);
        if (parent) {
          parent.replies.push(commentWithReplies);
        }
      } else {
        rootComments.push(commentWithReplies);
      }
    });

    return rootComments.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  }

  // Set up real-time subscriptions
  useEffect(() => {
    if (!room?.id) return;

    const postsChannel = supabase
      .channel('posts_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'posts',
          filter: `room_id=eq.${room.id}`
        },
        (payload) => {
          const newPost = payload.new as Post;
          setPosts(prev => [{ 
            ...newPost, 
            media: Array.isArray(newPost.media) ? newPost.media : [],
            comments: [], 
            comment_count: 0 
          }, ...prev]);
          
          toast({
            title: "New post",
            description: `${newPost.author_display} posted something new`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments'
        },
        (payload) => {
          const newComment = payload.new as Comment;
          loadPosts(room.id); // Reload to get updated comment structure
          
          toast({
            title: "New comment",
            description: `${newComment.author_display} left a comment`,
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'posts',
          filter: `room_id=eq.${room.id}`
        },
        () => {
          loadPosts(room.id); // Reload posts when deleted
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(postsChannel);
    };
  }, [room?.id, toast]);

  return {
    room,
    posts,
    loading,
    error,
    reloadPosts: () => room && loadPosts(room.id)
  };
}