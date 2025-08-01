import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import ImageCard from "@/components/image-card";

import { Filter, ChevronLeft, ChevronRight } from "lucide-react";
import ImagePreviewModal from "@/components/modals/image-preview-modal";

interface Image {
  id: number;
  userId: string;
  modelId: number;
  prompt: string;
  imageUrl: string;
  settings: any;
  isFavorite: boolean;
  createdAt: string;
}

interface ApiResponse {
  images: Image[];
  pagination: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
    currentPage: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export default function Gallery() {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [previewImage, setPreviewImage] = useState<Image | null>(null);
  const limit = 12;

  const { data: apiResponse, isLoading } = useQuery<ApiResponse>({
    queryKey: ["/api/images", { 
      limit, 
      offset: page * limit, 
      modelId: selectedModel === "all" ? undefined : selectedModel 
    }],
  });

  const { data: models = [] } = useQuery({
    queryKey: ["/api/ai-models"],
  });

  const deleteMutation = useMutation({
    mutationFn: async (imageId: number) => {
      await apiRequest("DELETE", `/api/images/${imageId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      toast({
        title: "Image Deleted",
        description: "The image has been deleted successfully.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const favoriteMutation = useMutation({
    mutationFn: async (imageId: number) => {
      const response = await apiRequest("PATCH", `/api/images/${imageId}/favorite`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Update Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const downloadImage = async (imageUrl: string, prompt: string) => {
    try {
      // Fetch the image as a blob
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch image');
      }
      
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const blobUrl = window.URL.createObjectURL(blob);
      
      // Create a download link
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}.jpg`;
      
      // Append to body, click, and remove
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      window.URL.revokeObjectURL(blobUrl);
      
      toast({
        title: "Download Started",
        description: "Your image is being downloaded.",
      });
    } catch (error) {
      toast({
        title: "Download Failed",
        description: "Failed to download the image. Please try again.",
        variant: "destructive",
      });
    }
  };

  const images = apiResponse?.images || [];
  const pagination = apiResponse?.pagination;

  // Reset page when model filter changes
  const handleModelChange = (value: string) => {
    setSelectedModel(value);
    setPage(0);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <div className="flex-1 ml-64">
          <Header title="My Gallery" subtitle="Loading..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header 
          title="My Gallery" 
          subtitle="Browse and manage your generated images" 
        />
        
        <div className="p-6">
          {/* Filters */}
          <div className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">My Gallery</h3>
                <p className="text-sm text-gray-600">
                  {pagination ? `${pagination.total} image${pagination.total !== 1 ? 's' : ''} total` : 'Loading...'}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Select value={selectedModel} onValueChange={handleModelChange}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Models</SelectItem>
                    {models?.map((model: any) => (
                      <SelectItem key={model.id} value={model.id.toString()}>
                        {model.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="outline">
                  <Filter className="mr-2 h-4 w-4" />
                  Filter
                </Button>
              </div>
            </div>
          </div>

          {/* Images Grid */}
          {images.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {images.map((image) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    onFavorite={() => favoriteMutation.mutate(image.id)}
                    onDownload={() => downloadImage(image.imageUrl, image.prompt)}
                    onDelete={() => deleteMutation.mutate(image.id)}
                    onPreview={() => {
                      console.log('Setting preview image:', image);
                      setPreviewImage(image);
                    }}
                    modelName={models?.find((m: any) => m.id === image.modelId)?.name}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination && pagination.pages > 1 && (
                <div className="flex items-center justify-center">
                  <nav className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(Math.max(0, page - 1))}
                      disabled={!pagination.hasPrev}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    
                    <span className="px-4 py-2 text-sm text-gray-600">
                      Page {pagination.currentPage} of {pagination.pages}
                    </span>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage(page + 1)}
                      disabled={!pagination.hasNext}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </nav>
                </div>
              )}
            </>
          ) : (
            <Card className="bg-white shadow-sm border border-gray-200">
              <CardContent className="p-12 text-center">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Filter className="h-12 w-12 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No images found</h3>
                <p className="text-gray-600 mb-6">
                  {selectedModel === "all" 
                    ? "You haven't generated any images yet. Start creating to see them here!"
                    : "No images found for the selected model. Try changing the filter."
                  }
                </p>
                <Button 
                  className="bg-gradient-to-r from-primary to-secondary"
                  onClick={() => window.location.href = '/generate'}
                >
                  Generate Your First Image
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Image Preview Modal */}
      {previewImage && (
        <ImagePreviewModal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          image={previewImage}
          modelName={models?.find((m: any) => m.id === previewImage.modelId)?.name}
          onFavorite={() => {
            favoriteMutation.mutate(previewImage.id);
            setPreviewImage(null);
          }}
          onDownload={() => {
            downloadImage(previewImage.imageUrl, previewImage.prompt);
          }}
        />
      )}
    </div>
  );
}
