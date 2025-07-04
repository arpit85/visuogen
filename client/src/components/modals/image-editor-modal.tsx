import { useState, useRef, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Download, 
  RotateCw, 
  Crop, 
  Palette, 
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  Move
} from "lucide-react";

interface ImageEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  image: {
    id: number;
    prompt: string;
    imageUrl: string;
  };
}

interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
}

export default function ImageEditorModal({ isOpen, onClose, image }: ImageEditorModalProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [filters, setFilters] = useState<FilterSettings>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0,
  });
  
  const [cropMode, setCropMode] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  useEffect(() => {
    if (isOpen && image.imageUrl) {
      loadImage();
    }
  }, [isOpen, image.imageUrl]);

  const loadImage = () => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      originalImageRef.current = img;
      drawCanvas();
      saveToHistory();
    };
    img.src = image.imageUrl;
  };

  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = originalImageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = img.width;
    canvas.height = img.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Apply transformations
    ctx.save();
    
    // Move to center for rotation
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-canvas.width / 2, -canvas.height / 2);

    // Apply filters
    const filterString = `
      brightness(${filters.brightness}%) 
      contrast(${filters.contrast}%) 
      saturate(${filters.saturation}%) 
      hue-rotate(${filters.hue}deg) 
      blur(${filters.blur}px)
    `;
    ctx.filter = filterString;

    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    ctx.restore();
  };

  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(imageData);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(history[historyIndex - 1], 0, 0);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.putImageData(history[historyIndex + 1], 0, 0);
    }
  };

  const handleFilterChange = (filterType: keyof FilterSettings, value: number) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    setZoom(prev => {
      const newZoom = direction === 'in' ? prev + 10 : prev - 10;
      return Math.max(10, Math.min(200, newZoom));
    });
  };

  const applyChanges = () => {
    drawCanvas();
    saveToHistory();
  };

  const resetFilters = () => {
    setFilters({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      blur: 0,
    });
    setRotation(0);
    setZoom(100);
  };

  const downloadImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Apply current filters and transformations
    drawCanvas();

    // Download the canvas content
    const link = document.createElement('a');
    link.download = `edited-${image.prompt.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_')}.png`;
    link.href = canvas.toDataURL();
    link.click();
  };

  useEffect(() => {
    if (originalImageRef.current) {
      drawCanvas();
    }
  }, [filters, rotation, zoom]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Palette className="h-5 w-5" />
            <span>Image Editor</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col lg:flex-row gap-6 h-full">
          {/* Canvas Area */}
          <div className="flex-1 bg-gray-100 rounded-lg p-4 overflow-auto">
            <div className="flex items-center justify-center min-h-[400px]">
              <div className="relative" style={{ transform: `scale(${zoom / 100})` }}>
                <canvas
                  ref={canvasRef}
                  className="max-w-full max-h-full border border-gray-300 rounded"
                  style={{ maxWidth: '100%', maxHeight: '400px' }}
                />
              </div>
            </div>
            
            {/* Canvas Controls */}
            <div className="flex items-center justify-center space-x-2 mt-4">
              <Button size="sm" variant="outline" onClick={() => handleZoom('out')}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium min-w-16 text-center">{zoom}%</span>
              <Button size="sm" variant="outline" onClick={() => handleZoom('in')}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <div className="w-px h-6 bg-gray-300 mx-2" />
              <Button size="sm" variant="outline" onClick={undo} disabled={historyIndex <= 0}>
                <Undo className="h-4 w-4" />
              </Button>
              <Button size="sm" variant="outline" onClick={redo} disabled={historyIndex >= history.length - 1}>
                <Redo className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Controls Panel */}
          <div className="w-full lg:w-80 space-y-4">
            <Tabs defaultValue="filters" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="filters">Filters</TabsTrigger>
                <TabsTrigger value="transform">Transform</TabsTrigger>
              </TabsList>

              <TabsContent value="filters" className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Brightness</Label>
                  <Slider
                    value={[filters.brightness]}
                    onValueChange={(value) => handleFilterChange('brightness', value[0])}
                    min={0}
                    max={200}
                    step={1}
                    className="mt-2"
                  />
                  <span className="text-xs text-gray-500">{filters.brightness}%</span>
                </div>

                <div>
                  <Label className="text-sm font-medium">Contrast</Label>
                  <Slider
                    value={[filters.contrast]}
                    onValueChange={(value) => handleFilterChange('contrast', value[0])}
                    min={0}
                    max={200}
                    step={1}
                    className="mt-2"
                  />
                  <span className="text-xs text-gray-500">{filters.contrast}%</span>
                </div>

                <div>
                  <Label className="text-sm font-medium">Saturation</Label>
                  <Slider
                    value={[filters.saturation]}
                    onValueChange={(value) => handleFilterChange('saturation', value[0])}
                    min={0}
                    max={200}
                    step={1}
                    className="mt-2"
                  />
                  <span className="text-xs text-gray-500">{filters.saturation}%</span>
                </div>

                <div>
                  <Label className="text-sm font-medium">Hue</Label>
                  <Slider
                    value={[filters.hue]}
                    onValueChange={(value) => handleFilterChange('hue', value[0])}
                    min={-180}
                    max={180}
                    step={1}
                    className="mt-2"
                  />
                  <span className="text-xs text-gray-500">{filters.hue}°</span>
                </div>

                <div>
                  <Label className="text-sm font-medium">Blur</Label>
                  <Slider
                    value={[filters.blur]}
                    onValueChange={(value) => handleFilterChange('blur', value[0])}
                    min={0}
                    max={10}
                    step={0.1}
                    className="mt-2"
                  />
                  <span className="text-xs text-gray-500">{filters.blur}px</span>
                </div>
              </TabsContent>

              <TabsContent value="transform" className="space-y-4">
                <div>
                  <Label className="text-sm font-medium mb-2 block">Rotation</Label>
                  <Button onClick={handleRotate} variant="outline" className="w-full">
                    <RotateCw className="h-4 w-4 mr-2" />
                    Rotate 90°
                  </Button>
                  <span className="text-xs text-gray-500 block mt-1">{rotation}°</span>
                </div>

                <div>
                  <Button
                    onClick={() => setCropMode(!cropMode)}
                    variant={cropMode ? "default" : "outline"}
                    className="w-full"
                  >
                    <Crop className="h-4 w-4 mr-2" />
                    {cropMode ? "Exit Crop Mode" : "Crop Image"}
                  </Button>
                </div>

                <div>
                  <Label className="text-sm font-medium">Zoom</Label>
                  <Slider
                    value={[zoom]}
                    onValueChange={(value) => setZoom(value[0])}
                    min={10}
                    max={200}
                    step={5}
                    className="mt-2"
                  />
                  <span className="text-xs text-gray-500">{zoom}%</span>
                </div>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <div className="space-y-2">
              <Button onClick={applyChanges} className="w-full">
                <Save className="h-4 w-4 mr-2" />
                Apply Changes
              </Button>
              
              <Button onClick={downloadImage} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download Edited
              </Button>
              
              <Button onClick={resetFilters} variant="outline" className="w-full">
                Reset All
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
