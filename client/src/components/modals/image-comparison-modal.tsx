import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ImageComparisonSlider } from '@/components/ui/image-comparison-slider';
import { Download, Share2, Heart, X, RotateCcw, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalImage: {
    url: string;
    name?: string;
  };
  editedImage: {
    url: string;
    name?: string;
    editType?: string;
  };
  onSaveEdited?: () => void;
  onDiscardEdits?: () => void;
  onDownloadOriginal?: () => void;
  onDownloadEdited?: () => void;
  onShareOriginal?: () => void;
  onShareEdited?: () => void;
  onToggleFavorite?: () => void;
  isFavorite?: boolean;
}

export function ImageComparisonModal({
  isOpen,
  onClose,
  originalImage,
  editedImage,
  onSaveEdited,
  onDiscardEdits,
  onDownloadOriginal,
  onDownloadEdited,
  onShareOriginal,
  onShareEdited,
  onToggleFavorite,
  isFavorite = false
}: ImageComparisonModalProps) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [viewMode, setViewMode] = useState<'comparison' | 'original' | 'edited'>('comparison');

  const handleDownload = () => {
    if (viewMode === 'original' || (viewMode === 'comparison' && sliderPosition > 50)) {
      onDownloadOriginal?.();
    } else {
      onDownloadEdited?.();
    }
  };

  const handleShare = () => {
    if (viewMode === 'original' || (viewMode === 'comparison' && sliderPosition > 50)) {
      onShareOriginal?.();
    } else {
      onShareEdited?.();
    }
  };

  const getCurrentImageName = () => {
    if (viewMode === 'original') return originalImage.name || 'Original';
    if (viewMode === 'edited') return editedImage.name || `Edited ${editedImage.editType || ''}`;
    return `Comparison (${Math.round(sliderPosition)}% original)`;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[90vh] p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <DialogTitle className="text-xl">Image Comparison</DialogTitle>
              {editedImage.editType && (
                <Badge variant="secondary" className="capitalize">
                  {editedImage.editType}
                </Badge>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        {/* View Mode Toggle */}
        <div className="px-6">
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
        </div>

        {/* Image Display Area */}
        <div className="flex-1 px-6 pb-6">
          <div className="w-full h-full bg-gray-50 dark:bg-gray-900 rounded-lg overflow-hidden">
            {viewMode === 'comparison' ? (
              <ImageComparisonSlider
                beforeImage={originalImage.url}
                afterImage={editedImage.url}
                beforeLabel="Original"
                afterLabel={editedImage.editType || 'Edited'}
                onSliderChange={setSliderPosition}
                className="w-full h-full"
              />
            ) : (
              <div className="relative w-full h-full">
                <img
                  src={viewMode === 'original' ? originalImage.url : editedImage.url}
                  alt={getCurrentImageName()}
                  className="w-full h-full object-contain"
                />
                <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm font-medium">
                  {getCurrentImageName()}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Bar */}
        <div className="border-t bg-white dark:bg-gray-950 p-6">
          <div className="flex items-center justify-between">
            {/* Left Actions */}
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={onToggleFavorite}
                className={cn(
                  "flex items-center space-x-2",
                  isFavorite && "text-red-600 border-red-200 bg-red-50 hover:bg-red-100"
                )}
              >
                <Heart className={cn("h-4 w-4", isFavorite && "fill-current")} />
                <span>{isFavorite ? 'Favorited' : 'Add to Favorites'}</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex items-center space-x-2"
              >
                <Share2 className="h-4 w-4" />
                <span>Share</span>
              </Button>
              
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download</span>
              </Button>
            </div>

            {/* Right Actions */}
            <div className="flex items-center space-x-2">
              {onDiscardEdits && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onDiscardEdits}
                  className="flex items-center space-x-2 text-red-600 hover:text-red-700"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Discard Edits</span>
                </Button>
              )}
              
              {onSaveEdited && (
                <Button
                  size="sm"
                  onClick={onSaveEdited}
                  className="flex items-center space-x-2"
                >
                  <Check className="h-4 w-4" />
                  <span>Save Edited Version</span>
                </Button>
              )}
            </div>
          </div>

          {/* Comparison Info */}
          {viewMode === 'comparison' && (
            <div className="mt-4 text-center text-sm text-gray-600 dark:text-gray-400">
              Drag the slider or click to compare images • Currently showing {Math.round(sliderPosition)}% original
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}