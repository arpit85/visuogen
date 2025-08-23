import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  X, 
  Download, 
  Heart, 
  Share2, 
  Edit, 
  Maximize2,
  Calendar
} from "lucide-react";

interface ImagePreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: {
    id: number;
    userId: string;
    modelId: number;
    prompt: string;
    imageUrl: string;
    settings: any;
    isFavorite: boolean;
    createdAt: string;
  };
  modelName?: string;
  onFavorite: () => void;
  onDownload: () => void;
  onEdit?: () => void;
  onShare?: () => void;
}

export default function ImagePreviewModal({ 
  isOpen, 
  onClose, 
  image, 
  modelName,
  onFavorite,
  onDownload,
  onEdit,
  onShare
}: ImagePreviewModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getModelBadgeColor = (modelName?: string) => {
    if (!modelName) return "bg-gray-500";
    if (modelName.toLowerCase().includes("dall")) return "bg-primary";
    if (modelName.toLowerCase().includes("midjourney")) return "bg-secondary";
    if (modelName.toLowerCase().includes("stable")) return "bg-accent";
    return "bg-gray-500";
  };

  const openFullSize = async () => {
    try {
      // Fetch the image and create a blob
      const response = await fetch(image.imageUrl);
      const blob = await response.blob();
      
      // Create a blob URL
      const blobUrl = URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `full-size-${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Error downloading full size image:', error);
      // Fallback to opening in new tab
      window.open(image.imageUrl, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] p-0 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-white dark:bg-gray-800">
          <div className="flex items-center space-x-3">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Image Preview
            </h2>
            {modelName && (
              <Badge 
                className={`text-white text-xs ${getModelBadgeColor(modelName)}`}
              >
                {modelName}
              </Badge>
            )}
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Image */}
        <div className="relative bg-gray-50 dark:bg-gray-900 flex items-center justify-center min-h-[60vh]">
          <img 
            src={image.imageUrl} 
            alt={image.prompt}
            className="max-w-full max-h-[60vh] object-contain cursor-pointer"
            onClick={openFullSize}
            loading="lazy"
          />
          
          {/* Zoom hint */}
          <div className="absolute top-4 right-4 bg-black/70 text-white px-3 py-1 rounded-lg text-xs flex items-center space-x-1 opacity-75">
            <Maximize2 className="h-3 w-3" />
            <span>Click to view full size</span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 bg-white dark:bg-gray-800 border-t">
          {/* Prompt */}
          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Original Prompt:
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
              {image.prompt}
            </p>
          </div>

          {/* Metadata */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-1 text-xs text-gray-500">
              <Calendar className="h-3 w-3" />
              <span>Created {formatDate(image.createdAt)}</span>
            </div>
            
            {image.settings && (
              <div className="text-xs text-gray-500">
                {image.settings.size && (
                  <span>Size: {image.settings.size}</span>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                variant="outline"
                onClick={onFavorite}
                className={`${
                  image.isFavorite 
                    ? 'text-red-500 border-red-200 hover:text-red-600 hover:border-red-300' 
                    : 'text-gray-500 hover:text-red-500'
                }`}
              >
                <Heart className={`h-4 w-4 mr-1 ${image.isFavorite ? 'fill-current' : ''}`} />
                {image.isFavorite ? 'Favorited' : 'Favorite'}
              </Button>
              
              {onEdit && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onEdit}
                  className="text-gray-500 hover:text-primary"
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              
              {onShare && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onShare}
                  className="text-gray-500 hover:text-primary"
                >
                  <Share2 className="h-4 w-4 mr-1" />
                  Share
                </Button>
              )}
            </div>

            <Button
              size="sm"
              onClick={onDownload}
              className="bg-primary hover:bg-primary/90"
            >
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}