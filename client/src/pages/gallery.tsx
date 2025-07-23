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

export default function Gallery() {
  const { toast } = useToast();
  const [selectedModel, setSelectedModel] = useState<string>("all");
  const [page, setPage] = useState(0);
  const limit = 12;

  const { data: images, isLoading } = useQuery<Image[]>({
    queryKey: ["/api/images", { limit, offset: page * limit }],
  });

  const { data: models } = useQuery({
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

  const downloadImage = (imageId: number, prompt: string) => {
    const link = document.createElement('a');
    link.href = `/api/download/image/${imageId}`;
    link.download = `${prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.jpg`;
    link.click();
  };

  const filteredImages = images?.filter(image => 
    selectedModel === "all" || image.modelId.toString() === selectedModel
  ) || [];

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
                  {filteredImages.length} image{filteredImages.length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Select value={selectedModel} onValueChange={setSelectedModel}>
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
          {filteredImages.length > 0 ? (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
                {filteredImages.map((image) => (
                  <ImageCard
                    key={image.id}
                    image={image}
                    onFavorite={() => favoriteMutation.mutate(image.id)}
                    onDownload={() => downloadImage(image.id, image.prompt)}
                    onDelete={() => deleteMutation.mutate(image.id)}
                    modelName={models?.find((m: any) => m.id === image.modelId)?.name}
                  />
                ))}
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-center">
                <nav className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(Math.max(0, page - 1))}
                    disabled={page === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <span className="px-4 py-2 text-sm text-gray-600">
                    Page {page + 1}
                  </span>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(page + 1)}
                    disabled={filteredImages.length < limit}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </nav>
              </div>
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
    </div>
  );
}
