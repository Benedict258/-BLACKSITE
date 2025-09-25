import { useState, useEffect, useRef } from "react";
import { useParams, Navigate, useNavigate } from "react-router-dom";
import { Send, Image, Pin, Flag, MoreHorizontal, Trash2, UserX, ArrowLeft, Users, Code, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ThemeToggle } from "@/components/theme-toggle";
import { useToast } from "@/hooks/use-toast";
import { useRoom } from "@/hooks/use-room";
import { supabase } from "@/integrations/supabase/client";
import { PostComposer } from "@/components/post-composer";
import { CommentComposer } from "@/components/comment-composer";
import { formatDisplayName } from "@/lib/room-utils";
import { OwnerSettingsDialog } from "@/components/owner-settings-dialog";

export function RoomPage() {
  // Route is defined as "/room/:code" in App.tsx
  const { code } = useParams<{ code: string }>();
  const roomCode = code || "";
  const navigate = useNavigate();
  const { toast } = useToast();
  const { room, posts, loading, error, reloadPosts } = useRoom(roomCode);
  
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [session, setSession] = useState<{
    displayName: string;
    isOwner: boolean;
    ownerToken?: string;
  } | null>(null);
  const [sessionLoading, setSessionLoading] = useState(true);
  
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  const [joinName, setJoinName] = useState("");
  const [joining, setJoining] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Load session from localStorage
  useEffect(() => {
    try {
      const sessionData = localStorage.getItem('blacksite_session');
      const ownerData = localStorage.getItem(`blacksite_owner_${roomCode}`);
      
      if (sessionData) {
        try {
          const parsed = JSON.parse(sessionData);
          if (parsed.roomCode === roomCode) {
            setSession({
              displayName: parsed.displayName,
              isOwner: !!ownerData,
              ownerToken: ownerData || undefined,
            });
          }
        } catch (e) {
          console.warn('Invalid session in localStorage, clearing.');
          localStorage.removeItem('blacksite_session');
        }
      }
    } finally {
      setSessionLoading(true); // ensure set to true before next tick
      // Use microtask to avoid double render edge-cases
      Promise.resolve().then(() => setSessionLoading(false));
    }
  }, [roomCode]);

  // Redirect if no room code or session
  if (!roomCode) {
    return <Navigate to="/" replace />;
  }

  if (sessionLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Preparing your room...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    // Inline join gate: ask for display name and set session
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="w-full max-w-md border border-border/50 rounded-xl p-6 bg-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
              <Code className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">Join Room</h2>
              <p className="text-xs text-muted-foreground">Room code: {roomCode}</p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground mb-4">Enter a display name to join this room.</p>
          <div className="flex gap-2">
            <Input
              value={joinName}
              onChange={(e) => setJoinName(e.target.value)}
              placeholder="Display name"
              maxLength={25}
            />
            <Button
              variant="neon"
              disabled={joining || !joinName.trim()}
              onClick={() => {
                const name = formatDisplayName(joinName);
                if (!name) return;
                setJoining(true);
                try {
                  localStorage.setItem('blacksite_session', JSON.stringify({
                    roomCode,
                    displayName: name,
                    joinedAt: new Date().toISOString(),
                  }));
                  const ownerData = localStorage.getItem(`blacksite_owner_${roomCode}`);
                  setSession({
                    displayName: name,
                    isOwner: !!ownerData,
                    ownerToken: ownerData || undefined,
                  });
                  toast({ title: 'Welcome', description: `Joined as ${name}` });
                } finally {
                  setJoining(false);
                }
              }}
            >
              {joining ? (
                <div className="w-4 h-4 border-2 border-background border-t-transparent rounded-full animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
          <div className="mt-4">
            <Button variant="ghost" onClick={() => navigate('/')}>Back to Home</Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">Room not found</h2>
          <p className="text-muted-foreground mb-4">This room may have been deleted or expired.</p>
          <Button onClick={() => navigate('/')}>Go Home</Button>
        </div>
      </div>
    );
  }

  const handlePin = async (postId: string) => {
    if (!session?.isOwner) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .update({ pinned: true })
        .eq('id', postId);

      if (error) throw error;

      reloadPosts();
      toast({
        title: "Post pinned",
        description: "Post has been pinned to the top of the room",
      });
    } catch (error) {
      console.error('Error pinning post:', error);
      toast({
        title: "Error",
        description: "Failed to pin post",
        variant: "destructive",
      });
    }
  };

  const handleReport = async (postId: string, contentType: 'post' | 'comment' = 'post') => {
    try {
      const { error } = await supabase
        .from('reports')
        .insert({
          content_type: contentType,
          content_id: postId,
          reason: 'User reported content',
        });

      if (error) throw error;

      toast({
        title: "Report submitted",
        description: "Content has been reported for review",
      });
    } catch (error) {
      console.error('Error reporting content:', error);
      toast({
        title: "Error",
        description: "Failed to submit report",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (postId: string) => {
    if (!session?.isOwner) return;
    
    try {
      const { error } = await supabase
        .from('posts')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', postId);

      if (error) throw error;

      reloadPosts();
      toast({
        title: "Post deleted",
        description: "The post has been removed",
        variant: "destructive",
      });
    } catch (error) {
      console.error('Error deleting post:', error);
      toast({
        title: "Error",
        description: "Failed to delete post",
        variant: "destructive",
      });
    }
  };

  const toggleComments = (postId: string) => {
    const newExpanded = new Set(expandedComments);
    if (newExpanded.has(postId)) {
      newExpanded.delete(postId);
    } else {
      newExpanded.add(postId);
    }
    setExpandedComments(newExpanded);
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      return diffInMinutes < 1 ? 'Just now' : `${diffInMinutes}m ago`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  // Separate pinned and regular posts
  const pinnedPosts = posts.filter(post => post.pinned);
  const regularPosts = posts.filter(post => !post.pinned);
  const orderedPosts = [...pinnedPosts, ...regularPosts];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-primary/10 rounded-md flex items-center justify-center">
                <Code className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">{room.title}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Badge variant="outline" className="text-xs">
                    {room.code}
                  </Badge>
                  <span className="text-xs">as {session.displayName}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {session.isOwner && (
              <Button variant="ghost" size="icon" title="Owner controls" onClick={() => setSettingsOpen(true)}>
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <ThemeToggle />
          </div>
        </div>
      </header>

      {session.isOwner && (
        <OwnerSettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} roomCode={room.code} />
      )}

      <div className="container mx-auto px-4 py-6 max-w-4xl">
        {/* Room Description */}
        {room.description && (
          <Card className="mb-6">
            <CardContent className="pt-6">
              <p className="text-muted-foreground">{room.description}</p>
            </CardContent>
          </Card>
        )}

        {/* Post Composer */}
        <Card className="mb-8">
          <CardHeader className="pb-4">
            <h3 className="text-lg font-medium">Share with the room</h3>
          </CardHeader>
          <CardContent className="pt-0">
            <PostComposer
              roomId={room.id}
              displayName={session.displayName}
              onPostCreated={reloadPosts}
              placeholder="What's on your mind?"
            />
          </CardContent>
        </Card>

        {/* Posts Feed */}
        <div className="space-y-6">
          {orderedPosts.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No posts yet. Be the first to share something!</p>
              </CardContent>
            </Card>
          ) : (
            orderedPosts.map((post) => (
              <Card key={post.id} className={`group ${post.pinned ? 'border-primary/50 bg-primary/5' : ''}`}>
                <CardContent className="pt-6">
                  {/* Post Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary">
                          {post.author_display.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{post.author_display}</span>
                          {post.pinned && (
                            <Badge variant="secondary" className="text-xs">
                              <Pin className="w-3 h-3 mr-1" />
                              Pinned
                            </Badge>
                          )}
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatTimestamp(post.created_at)}
                        </span>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {session.isOwner && !post.pinned && (
                          <DropdownMenuItem onClick={() => handlePin(post.id)}>
                            <Pin className="w-4 h-4 mr-2" />
                            Pin Post
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => handleReport(post.id)}>
                          <Flag className="w-4 h-4 mr-2" />
                          Report
                        </DropdownMenuItem>
                        {session.isOwner && (
                          <DropdownMenuItem 
                            onClick={() => handleDelete(post.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {/* Post Content */}
                  <div className="mb-4">
                    <p className="text-foreground leading-relaxed whitespace-pre-wrap">{post.content}</p>
                  </div>

                  {/* Post Media */}
                  {Array.isArray(post.media) && post.media.length > 0 && (
                    <div className={`mb-4 ${post.media.length > 1 ? 'grid grid-cols-2 gap-2' : ''}`}>
                      {post.media.map((m: any, idx: number) => {
                        const key = (m && m.url) || idx;
                        const t = (m && m.type) || '';
                        const isImage = typeof t === 'string' ? t.startsWith('image') || t === 'image' : false;
                        const isVideo = typeof t === 'string' ? t.startsWith('video') || t === 'video' : false;
                        if (isImage) {
                          return (
                            <a
                              key={key}
                              href={m.url}
                              target="_blank"
                              rel="noreferrer"
                              className={`${post.media.length === 1 ? 'block' : 'block'} rounded-md border border-border/50 bg-background`}
                            >
                              <img
                                src={m.url}
                                alt="attachment"
                                loading="lazy"
                                className="w-full h-auto max-h-[85vh] object-contain"
                              />
                            </a>
                          );
                        }
                        if (isVideo) {
                          return (
                            <div
                              key={key}
                              className={`${post.media.length === 1 ? 'block' : 'block'} rounded-md border border-border/50 bg-black`}
                            >
                              <video
                                src={m.url}
                                controls
                                preload="metadata"
                                className="w-full h-auto max-h-[85vh]"
                              />
                            </div>
                          );
                        }
                        // Unknown type: render link
                        return (
                          <a key={key} href={m.url} target="_blank" rel="noreferrer" className="text-sm underline break-all">
                            {m.url}
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* Post Actions */}
                  <div className="flex items-center justify-between">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleComments(post.id)}
                      className="text-muted-foreground"
                    >
                      {post.comment_count && post.comment_count > 0 
                        ? `${post.comment_count} ${post.comment_count === 1 ? 'comment' : 'comments'}` 
                        : 'Add comment'
                      }
                    </Button>
                  </div>

                  {/* Comments Section */}
                  {expandedComments.has(post.id) && (
                    <div className="mt-6 pt-4 border-t border-border/50">
                      {/* Existing Comments */}
                      {post.comments && post.comments.length > 0 && (
                        <div className="space-y-4 mb-4">
                          {post.comments.map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <Avatar className="w-6 h-6">
                                <AvatarFallback className="text-xs bg-muted">
                                  {comment.author_display.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="text-sm font-medium">{comment.author_display}</span>
                                  <span className="text-xs text-muted-foreground">
                                    {formatTimestamp(comment.created_at)}
                                  </span>
                                </div>
                                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                                  {comment.content}
                                </p>
                                
                                {/* Nested replies */}
                                {comment.replies && comment.replies.length > 0 && (
                                  <div className="mt-2 ml-4 space-y-2">
                                    {comment.replies.map((reply) => (
                                      <div key={reply.id} className="flex gap-2">
                                        <Avatar className="w-5 h-5">
                                          <AvatarFallback className="text-xs bg-muted">
                                            {reply.author_display.charAt(0).toUpperCase()}
                                          </AvatarFallback>
                                        </Avatar>
                                        <div className="flex-1">
                                          <div className="flex items-center gap-2 mb-1">
                                            <span className="text-xs font-medium">{reply.author_display}</span>
                                            <span className="text-xs text-muted-foreground">
                                              {formatTimestamp(reply.created_at)}
                                            </span>
                                          </div>
                                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">
                                            {reply.content}
                                          </p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comment Composer */}
                      <CommentComposer
                        postId={post.id}
                        displayName={session.displayName}
                        onCommentCreated={() => {
                          reloadPosts();
                        }}
                        placeholder="Add a comment..."
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default RoomPage;
