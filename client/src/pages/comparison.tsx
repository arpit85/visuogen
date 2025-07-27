import { useState, useEffect } from "react";
import { useLocation, useParams, Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ImageComparisonSlider } from "@/components/ui/image-comparison-slider";
import ResponsiveLayout from "@/components/layout/responsive-layout";
import { 
  ArrowLeft, 
  Download, 
  Share2, 
  Heart, 
  Eye,
  RotateCcw,
  Save
} from "lucide-react";
import { cn } from "@/lib/utils";

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

export default function Comparison() {
  const { imageId } = useParams();
  const [, setLocation] = useLocation();
  const [viewMode, setViewMode] = useState<'comparison' | 'original' | 'edited'>('comparison');
  const [sliderPosition, setSliderPosition] = useState(50);

  // Fetch the specific image
  const { data: image, isLoading } = useQuery<Image>({
    queryKey: ['/api/images', imageId],
    enabled: !!imageId,
  });

  // For demo purposes, let's assume we have original and edited versions
  // In a real app, you'd have different image versions stored
  const originalImageUrl = image?.imageUrl;
  const editedImageUrl = image?.settings?.editedVersion || image?.imageUrl; // Fallback to original if no edited version

  const hasEditedVersion = image?.settings?.editedVersion && 
    image.settings.editedVersion !== image.imageUrl;

  const handleDownload = async () => {
    const imageToDownload = viewMode === 'original' || 
      (viewMode === 'comparison' && sliderPosition > 50) 
      ? originalImageUrl 
      : editedImageUrl;
    
    if (imageToDownload) {
      try {
        // Fetch the image as a blob
        const response = await fetch(imageToDownload);
        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }
        
        const blob = await response.blob();
        
        // Create a temporary URL for the blob
        const blobUrl = window.URL.createObjectURL(blob);
        
        // Create a download link
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `image-${viewMode}-${Date.now()}.jpg`;
        
        // Append to body, click, and remove
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        window.URL.revokeObjectURL(blobUrl);
      } catch (error) {
        console.error('Download failed:', error);
      }
    }
  };

  const handleShare = () => {
    const imageToShare = viewMode === 'original' || 
      (viewMode === 'comparison' && sliderPosition > 50)
      ? originalImageUrl 
      : editedImageUrl;
    
    if (navigator.share && imageToShare) {
      navigator.share({
        title: 'AI Generated Image',
        text: image?.prompt || 'Check out this AI generated image!',
        url: imageToShare,
      });
    }
  };

  const getCurrentImageName = () => {
    if (viewMode === 'original') return 'Original';
    if (viewMode === 'edited') return 'Edited';
    return `Comparison (${Math.round(sliderPosition)}% original)`;
  };

  if (isLoading) {
    return (
      <ResponsiveLayout title="Image Comparison" subtitle="Loading comparison...">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-2 text-gray-600">Loading comparison...</p>
          </div>
        </div>
      </ResponsiveLayout>
    );
  }

  if (!image) {
    return (
      <ResponsiveLayout title="Image Comparison" subtitle="Image not found">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Image not found</h2>
          <Button onClick={() => setLocation('/gallery')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Gallery
          </Button>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <ResponsiveLayout 
      title="Image Comparison" 
      subtitle={image.prompt.length > 50 ? image.prompt.substring(0, 50) + "..." : image.prompt}
    >
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button 
              variant="outline" 
              onClick={() => setLocation('/gallery')}
              className="flex items-center space-x-2"
            >
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Gallery</span>
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Image Comparison</h1>
              <p className="text-gray-600 text-sm">
                {image.prompt.substring(0, 100)}
                {image.prompt.length > 100 ? "..." : ""}
              </p>
            </div>
          </div>
        </div>

        {/* View Mode Toggle */}
        {hasEditedVersion && (
          <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg w-fit">
            <Button
              variant={viewMode === 'comparison' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('comparison')}
              className="h-8"
            >
              Comparison
            </Button>
            <Button
              variant={viewMode === 'original' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('original')}
              className="h-8"
            >
              Original
            </Button>
            <Button
              variant={viewMode === 'edited' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setViewMode('edited')}
              className="h-8"
            >
              Edited
            </Button>
          </div>
        )}

        {/* Main Comparison Area */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>{getCurrentImageName()}</span>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm" onClick={handleShare}>
                  <Share2 className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="w-full h-96 bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
              {viewMode === 'comparison' && hasEditedVersion ? (
                <ImageComparisonSlider
                  beforeImage={originalImageUrl!}
                  afterImage={editedImageUrl!}
                  beforeLabel="Original"
                  afterLabel="Edited"
                  onSliderChange={setSliderPosition}
                  className="w-full h-full"
                />
              ) : (
                <div className="relative w-full h-full">
                  <img
                    src={viewMode === 'original' ? originalImageUrl : editedImageUrl}
                    alt={getCurrentImageName()}
                    className="w-full h-full object-contain"
                  />
                  <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium">
                    {getCurrentImageName()}
                  </div>
                </div>
              )}
            </div>
            
            {/* No Edited Version Message */}
            {!hasEditedVersion && (
              <div className="text-center py-8 text-gray-500">
                <Eye className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium mb-2">No edits available</p>
                <p className="text-sm">
                  This image hasn't been edited yet. Use the image editor to create variations and compare them here.
                </p>
                <Button 
                  className="mt-4"
                  onClick={() => setLocation(`/gallery`)}
                >
                  Edit This Image
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Image Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Generation Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div>
                <span className="text-sm font-medium">Prompt:</span>
                <p className="text-sm text-gray-600 mt-1">{image.prompt}</p>
              </div>
              <div>
                <span className="text-sm font-medium">Created:</span>
                <p className="text-sm text-gray-600">
                  {new Date(image.createdAt).toLocaleDateString()}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {image.settings?.size && (
                <div>
                  <span className="text-sm font-medium">Size:</span>
                  <p className="text-sm text-gray-600">{image.settings.size}</p>
                </div>
              )}
              {image.settings?.style && (
                <div>
                  <span className="text-sm font-medium">Style:</span>
                  <p className="text-sm text-gray-600">{image.settings.style}</p>
                </div>
              )}
              {image.settings?.quality && (
                <div>
                  <span className="text-sm font-medium">Quality:</span>
                  <p className="text-sm text-gray-600">{image.settings.quality}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => {/* Handle favorite toggle */}}
              >
                <Heart className={cn("h-4 w-4 mr-2", image.isFavorite && "fill-current text-red-500")} />
                {image.isFavorite ? 'Remove from Favorites' : 'Add to Favorites'}
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start"
                onClick={() => setLocation('/gallery')}
              >
                <Eye className="h-4 w-4 mr-2" />
                View in Gallery
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Instructions */}
        {viewMode === 'comparison' && hasEditedVersion && (
          <Card className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <CardContent className="pt-6">
              <div className="text-center text-sm text-blue-700 dark:text-blue-300">
                <p className="font-medium mb-1">Comparison Mode Active</p>
                <p>
                  Drag the slider or click to compare images • Currently showing {Math.round(sliderPosition)}% original
                </p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </ResponsiveLayout>
  );
}