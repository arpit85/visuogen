import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Heart, 
  Download, 
  Edit, 
  Trash2, 
  MoreVertical,
  Share2,
  ArrowLeftRight
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import AdvancedImageEditorModal from "@/components/modals/advanced-image-editor-modal";

interface ImageCardProps {
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
  onDelete: () => void;
  onShare?: () => void;
}

export default function ImageCard({ 
  image, 
  modelName, 
  onFavorite, 
  onDownload, 
  onDelete,
  onShare 
}: ImageCardProps) {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [, setLocation] = useLocation();

  const handleFavorite = async () => {
    setIsLoading(true);
    try {
      await onFavorite();
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return "Just now";
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)} day${Math.floor(diffInHours / 24) > 1 ? 's' : ''} ago`;
    return date.toLocaleDateString();
  };

  const getModelBadgeColor = (modelName?: string) => {
    if (!modelName) return "bg-gray-500";
    if (modelName.toLowerCase().includes("dall")) return "bg-primary";
    if (modelName.toLowerCase().includes("midjourney")) return "bg-secondary";
    if (modelName.toLowerCase().includes("stable")) return "bg-accent";
    return "bg-gray-500";
  };

  return (
    <>
      <Card className="bg-white shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow group">
        <div className="relative">
          <img 
            src={image.imageUrl} 
            alt={`Generated: ${image.prompt.slice(0, 50)}...`}
            className="w-full h-48 object-cover"
            loading="lazy"
          />
          
          {/* Overlay with actions - shown on hover */}
          <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2">
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/90 text-gray-900 hover:bg-white"
              onClick={onDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
            <Button
              size="sm"
              variant="secondary"
              className="bg-white/90 text-gray-900 hover:bg-white"
              onClick={() => setIsEditorOpen(true)}
            >
              <Edit className="h-4 w-4" />
            </Button>
            {onShare && (
              <Button
                size="sm"
                variant="secondary"
                className="bg-white/90 text-gray-900 hover:bg-white"
                onClick={onShare}
              >
                <Share2 className="h-4 w-4" />
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              className={`bg-white/90 hover:bg-white ${
                image.isFavorite ? 'text-red-500' : 'text-gray-900'
              }`}
              onClick={handleFavorite}
              disabled={isLoading}
            >
              <Heart className={`h-4 w-4 ${image.isFavorite ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
        
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            {modelName && (
              <Badge 
                className={`text-white text-xs ${getModelBadgeColor(modelName)}`}
              >
                {modelName}
              </Badge>
            )}
            <span className="text-xs text-gray-500">
              {formatTimeAgo(image.createdAt)}
            </span>
          </div>
          
          <p className="text-sm font-medium text-gray-900 mb-2 line-clamp-2 leading-tight">
            {image.prompt.length > 60 
              ? `${image.prompt.slice(0, 60)}...` 
              : image.prompt
            }
          </p>
          
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant="ghost"
              className={`p-1 ${image.isFavorite ? 'text-red-500 hover:text-red-600' : 'text-gray-400 hover:text-red-500'}`}
              onClick={handleFavorite}
              disabled={isLoading}
            >
              <Heart className={`h-4 w-4 ${image.isFavorite ? 'fill-current' : ''}`} />
            </Button>
            
            <div className="flex items-center space-x-1">
              <Button
                size="sm"
                variant="ghost"
                className="p-1 text-gray-400 hover:text-primary"
                onClick={() => setIsEditorOpen(true)}
                title="Edit"
              >
                <Edit className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="p-1 text-gray-400 hover:text-primary"
                onClick={() => setLocation(`/comparison/${image.id}`)}
                title="Compare"
              >
                <ArrowLeftRight className="h-4 w-4" />
              </Button>
              
              <Button
                size="sm"
                variant="ghost"
                className="p-1 text-gray-400 hover:text-primary"
                onClick={onDownload}
                title="Download"
              >
                <Download className="h-4 w-4" />
              </Button>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="p-1 text-gray-400 hover:text-primary"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={onDelete}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Image
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          
          {/* Image settings display */}
          {image.settings && (
            <div className="mt-2 flex flex-wrap gap-1">
              {image.settings.size && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {image.settings.size}
                </span>
              )}
              {image.settings.style && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {image.settings.style}
                </span>
              )}
              {image.settings.quality && (
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                  {image.settings.quality}
                </span>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <AdvancedImageEditorModal
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        image={image}
      />
    </>
  );
}
