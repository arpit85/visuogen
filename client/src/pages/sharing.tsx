import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Share2, Eye, Users, Plus, Link, Copy, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

type ImageShare = {
  id: number;
  imageId: number;
  userId: string;
  shareToken: string;
  permissions: string;
  description: string;
  views: number;
  createdAt: string;
  updatedAt: string;
};

type Collection = {
  id: number;
  userId: string;
  name: string;
  description: string;
  isPublic: boolean;
  shareToken: string | null;
  imageCount: number;
  createdAt: string;
  updatedAt: string;
};

type Image = {
  id: number;
  prompt: string;
  imageUrl: string;
  modelId: number;
  userId: string;
  isFavorite: boolean;
  createdAt: string;
};

export default function SharingPage() {
  const { toast } = useToast();
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [collectionDialogOpen, setCollectionDialogOpen] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);

  // Fetch user's images
  const { data: images = [], isLoading: imagesLoading } = useQuery<Image[]>({
    queryKey: ['/api/images'],
  });

  // Fetch user's shares
  const { data: shares = [], isLoading: sharesLoading } = useQuery<ImageShare[]>({
    queryKey: ['/api/shares'],
  });

  // Fetch user's collections
  const { data: collections = [], isLoading: collectionsLoading } = useQuery<Collection[]>({
    queryKey: ['/api/collections'],
  });

  // Share image mutation
  const shareImageMutation = useMutation({
    mutationFn: async (data: { imageId: number; permissions: string; description: string }) => {
      return await apiRequest('POST', `/api/images/${data.imageId}/share`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shares'] });
      setShareDialogOpen(false);
      setSelectedImage(null);
      toast({
        title: "Image shared successfully",
        description: "Your image share link has been created.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error sharing image",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Create collection mutation
  const createCollectionMutation = useMutation({
    mutationFn: async (data: { name: string; description: string; isPublic: boolean }) => {
      return await apiRequest('POST', '/api/collections', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/collections'] });
      setCollectionDialogOpen(false);
      toast({
        title: "Collection created",
        description: "Your new collection has been created successfully.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error creating collection",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete share mutation
  const deleteShareMutation = useMutation({
    mutationFn: async (shareId: number) => {
      return await apiRequest('DELETE', `/api/shares/${shareId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/shares'] });
      toast({
        title: "Share deleted",
        description: "The image share has been removed.",
      });
    },
  });

  const handleShareImage = (image: Image) => {
    setSelectedImage(image);
    setShareDialogOpen(true);
  };

  const handleCopyShareLink = async (shareToken: string) => {
    const shareUrl = `${window.location.origin}/shared/${shareToken}`;
    await navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied",
      description: "Share link has been copied to clipboard.",
    });
  };

  const handleCopyCollectionLink = async (shareToken: string) => {
    const shareUrl = `${window.location.origin}/collections/${shareToken}`;
    await navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link copied",
      description: "Collection link has been copied to clipboard.",
    });
  };

  const isLoading = imagesLoading || sharesLoading || collectionsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Sharing & Collections</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Share your images and organize them into collections
          </p>
        </div>
      </div>

      <Tabs defaultValue="images" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="images">My Images</TabsTrigger>
          <TabsTrigger value="shares">Active Shares</TabsTrigger>
          <TabsTrigger value="collections">Collections</TabsTrigger>
        </TabsList>

        <TabsContent value="images" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Images to Share</h2>
          </div>

          {images.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Share2 className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No images to share yet</p>
                <p className="text-sm text-gray-500">Generate some images first to start sharing</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image) => (
                <Card key={image.id} className="overflow-hidden">
                  <div className="aspect-square relative">
                    <img
                      src={image.imageUrl}
                      alt={image.prompt}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {image.prompt}
                    </p>
                    <Button
                      onClick={() => handleShareImage(image)}
                      className="w-full"
                      variant="outline"
                    >
                      <Share2 className="h-4 w-4 mr-2" />
                      Share Image
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="shares" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Active Shares</h2>
          </div>

          {shares.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Link className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No active shares</p>
                <p className="text-sm text-gray-500">Share some images to see them here</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {shares.map((share) => (
                <Card key={share.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <Badge variant="secondary">{share.permissions}</Badge>
                            <div className="flex items-center text-sm text-gray-500">
                              <Eye className="h-4 w-4 mr-1" />
                              {share.views} views
                            </div>
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            {share.description || 'No description'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Shared on {new Date(share.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          onClick={() => handleCopyShareLink(share.shareToken)}
                          variant="outline"
                          size="sm"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          onClick={() => deleteShareMutation.mutate(share.id)}
                          variant="outline"
                          size="sm"
                          disabled={deleteShareMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="collections" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">My Collections</h2>
            <Dialog open={collectionDialogOpen} onOpenChange={setCollectionDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  New Collection
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Collection</DialogTitle>
                  <DialogDescription>
                    Create a new collection to organize your images
                  </DialogDescription>
                </DialogHeader>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const formData = new FormData(e.currentTarget);
                    createCollectionMutation.mutate({
                      name: formData.get('name') as string,
                      description: formData.get('description') as string,
                      isPublic: formData.get('isPublic') === 'true',
                    });
                  }}
                  className="space-y-4"
                >
                  <div>
                    <Input
                      name="name"
                      placeholder="Collection name"
                      required
                    />
                  </div>
                  <div>
                    <Textarea
                      name="description"
                      placeholder="Description (optional)"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Select name="isPublic" defaultValue="false">
                      <SelectTrigger>
                        <SelectValue placeholder="Privacy" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="false">Private</SelectItem>
                        <SelectItem value="true">Public</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    disabled={createCollectionMutation.isPending}
                  >
                    {createCollectionMutation.isPending ? 'Creating...' : 'Create Collection'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {collections.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Users className="h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No collections yet</p>
                <p className="text-sm text-gray-500">Create your first collection to organize images</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {collections.map((collection) => (
                <Card key={collection.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{collection.name}</CardTitle>
                      <Badge variant={collection.isPublic ? "default" : "secondary"}>
                        {collection.isPublic ? "Public" : "Private"}
                      </Badge>
                    </div>
                    <CardDescription>
                      {collection.description || 'No description'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                      <span>{collection.imageCount || 0} images</span>
                      <span>{new Date(collection.createdAt).toLocaleDateString()}</span>
                    </div>
                    {collection.isPublic && collection.shareToken && (
                      <Button
                        onClick={() => handleCopyCollectionLink(collection.shareToken!)}
                        variant="outline"
                        size="sm"
                        className="w-full"
                      >
                        <Copy className="h-4 w-4 mr-2" />
                        Copy Share Link
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Share Image Dialog */}
      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Image</DialogTitle>
            <DialogDescription>
              Create a shareable link for this image
            </DialogDescription>
          </DialogHeader>
          {selectedImage && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.currentTarget);
                shareImageMutation.mutate({
                  imageId: selectedImage.id,
                  permissions: formData.get('permissions') as string,
                  description: formData.get('description') as string,
                });
              }}
              className="space-y-4"
            >
              <div className="aspect-square w-32 mx-auto">
                <img
                  src={selectedImage.imageUrl}
                  alt={selectedImage.prompt}
                  className="w-full h-full object-cover rounded-lg"
                />
              </div>
              <div>
                <Select name="permissions" defaultValue="view">
                  <SelectTrigger>
                    <SelectValue placeholder="Permissions" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="view">View Only</SelectItem>
                    <SelectItem value="comment">View & Comment</SelectItem>
                    <SelectItem value="download">View & Download</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Textarea
                  name="description"
                  placeholder="Add a description (optional)"
                  rows={3}
                />
              </div>
              <Button
                type="submit"
                className="w-full"
                disabled={shareImageMutation.isPending}
              >
                {shareImageMutation.isPending ? 'Creating Share Link...' : 'Create Share Link'}
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}