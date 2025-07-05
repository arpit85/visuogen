import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useRoute } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Eye, Download, MessageCircle, Send, Share2, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type SharedImageData = {
  share: {
    id: number;
    imageId: number;
    userId: string;
    shareToken: string;
    permissions: string;
    description: string;
    views: number;
    createdAt: string;
  };
  image: {
    id: number;
    prompt: string;
    imageUrl: string;
    modelId: number;
    userId: string;
    isFavorite: boolean;
    createdAt: string;
  };
};

type Comment = {
  id: number;
  imageId: number;
  userId: string;
  content: string;
  isApproved: boolean;
  createdAt: string;
};

export default function SharedImagePage() {
  const [, params] = useRoute("/shared/:token");
  const { token } = params || {};
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [commentText, setCommentText] = useState("");

  // Fetch shared image data
  const { data: sharedData, isLoading, error } = useQuery<SharedImageData>({
    queryKey: ['/api/shared', token],
    enabled: !!token,
  });

  // Fetch comments
  const { data: comments = [] } = useQuery<Comment[]>({
    queryKey: ['/api/images', sharedData?.image?.id, 'comments'],
    enabled: !!sharedData?.image?.id,
  });

  // Add comment mutation
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!sharedData?.image?.id) throw new Error("No image ID");
      return await apiRequest('POST', `/api/images/${sharedData.image.id}/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ 
        queryKey: ['/api/images', sharedData?.image?.id, 'comments'] 
      });
      setCommentText("");
      toast({
        title: "Comment submitted",
        description: "Your comment is pending approval.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error submitting comment",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDownload = async () => {
    if (!sharedData?.image?.imageUrl) return;

    try {
      const response = await fetch(sharedData.image.imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `image-${sharedData.image.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Download started",
        description: "The image is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download failed",
        description: "Could not download the image.",
        variant: "destructive",
      });
    }
  };

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copied",
        description: "Share link has been copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Could not copy link",
        description: "Please copy the URL manually.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    addCommentMutation.mutate(commentText);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !sharedData) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-xl font-semibold mb-2">Image Not Found</h2>
            <p className="text-gray-600 dark:text-gray-400 text-center">
              This shared image may have been removed or the link may be invalid.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { share, image } = sharedData;
  const canComment = share.permissions === 'comment' || share.permissions === 'download';
  const canDownload = share.permissions === 'download';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8">
      <div className="max-w-4xl mx-auto px-4 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Shared Image</h1>
          <p className="text-gray-600 dark:text-gray-400">
            {share.description || 'An AI-generated image has been shared with you'}
          </p>
        </div>

        {/* Main Image Card */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <div className="aspect-square md:aspect-[4/3] relative">
              <img
                src={image.imageUrl}
                alt={image.prompt}
                className="w-full h-full object-contain bg-gray-100 dark:bg-gray-800"
              />
            </div>
          </CardContent>
        </Card>

        {/* Image Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <CardTitle>Image Details</CardTitle>
                <div className="flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <Eye className="h-4 w-4 mr-1" />
                    {share.views} views
                  </div>
                  <div>
                    Shared on {new Date(share.createdAt).toLocaleDateString()}
                  </div>
                  <Badge variant="secondary">{share.permissions}</Badge>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button onClick={handleShare} variant="outline" size="sm">
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                {canDownload && (
                  <Button onClick={handleDownload} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Prompt</h4>
                <p className="text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-800 p-3 rounded-lg">
                  {image.prompt}
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Generated on {new Date(image.createdAt).toLocaleDateString()}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comments Section */}
        {canComment && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <MessageCircle className="h-5 w-5 mr-2" />
                Comments ({comments.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Add Comment Form */}
              {isAuthenticated && (
                <form onSubmit={handleSubmitComment} className="space-y-4">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment..."
                    rows={3}
                  />
                  <Button
                    type="submit"
                    disabled={!commentText.trim() || addCommentMutation.isPending}
                    className="w-full md:w-auto"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    {addCommentMutation.isPending ? 'Submitting...' : 'Submit Comment'}
                  </Button>
                </form>
              )}

              {!isAuthenticated && (
                <div className="text-center py-4">
                  <p className="text-gray-600 dark:text-gray-400">
                    Please sign in to leave a comment
                  </p>
                  <Button className="mt-2" onClick={() => window.location.href = '/api/login'}>
                    Sign In
                  </Button>
                </div>
              )}

              {/* Comments List */}
              <div className="space-y-4">
                {comments.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600 dark:text-gray-400">No comments yet</p>
                    <p className="text-sm text-gray-500">Be the first to leave a comment!</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {comment.userId.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                          <p className="text-sm">{comment.content}</p>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {new Date(comment.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          <p>Powered by AI Image Forge</p>
        </div>
      </div>
    </div>
  );
}