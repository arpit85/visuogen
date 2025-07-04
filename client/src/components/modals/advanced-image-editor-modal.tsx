import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Wand2, 
  Sparkles, 
  Download, 
  Save, 
  RotateCcw, 
  Palette, 
  Contrast, 
  Sun, 
  Image as ImageIcon,
  Scissors,
  RefreshCw,
  Camera,
  Heart,
  Zap
} from "lucide-react";

interface AdvancedImageEditorModalProps {
  image: {
    id: number;
    imageUrl: string;
    prompt: string;
  };
  isOpen: boolean;
  onClose: () => void;
  onSave?: (editedImage: any) => void;
}

interface FilterSettings {
  brightness: number;
  contrast: number;
  saturation: number;
  hue: number;
  blur: number;
  temperature: number;
  exposure: number;
  highlights: number;
  shadows: number;
  vignette: number;
  clarity: number;
  sepia: number;
  grayscale: boolean;
  invert: boolean;
  vintage: boolean;
}

export default function AdvancedImageEditorModal({ 
  image, 
  isOpen, 
  onClose, 
  onSave 
}: AdvancedImageEditorModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [filters, setFilters] = useState<FilterSettings>({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0,
    temperature: 0,
    exposure: 0,
    highlights: 0,
    shadows: 0,
    vignette: 0,
    clarity: 0,
    sepia: 0,
    grayscale: false,
    invert: false,
    vintage: false,
  });

  const [variationSettings, setVariationSettings] = useState({
    variationType: 'artistic' as 'style_transfer' | 'color_variation' | 'artistic' | 'realistic',
    intensity: 50,
    prompt: '',
  });

  const [inpaintSettings, setInpaintSettings] = useState({
    prompt: '',
    maskUrl: '',
    size: '1024x1024',
  });

  const [enhancementType, setEnhancementType] = useState<'face' | 'photo' | 'art'>('photo');

  // Apply filters mutation
  const applyFiltersMutation = useMutation({
    mutationFn: async (filterData: FilterSettings) => {
      const response = await apiRequest("POST", `/api/images/${image.id}/edit`, { filters: filterData });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Filters Applied",
        description: "Image filters have been successfully applied.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      onSave?.(data.image);
    },
    onError: (error) => {
      toast({
        title: "Filter Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // AI Enhancement mutations
  const variationMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/images/${image.id}/variation`, variationSettings);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Variation Created",
        description: `Successfully created image variation. ${data.creditsSpent} credits used.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/images", "/api/credits"] });
      onSave?.(data.image);
    },
    onError: (error) => {
      toast({
        title: "Variation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const inpaintMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/images/${image.id}/inpaint`, inpaintSettings);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Inpainting Complete",
        description: `Successfully modified image. ${data.creditsSpent} credits used.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/images", "/api/credits"] });
      onSave?.(data.image);
    },
    onError: (error) => {
      toast({
        title: "Inpainting Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const enhanceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/images/${image.id}/enhance`, { enhancementType });
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Enhancement Complete",
        description: `Image enhanced successfully. ${data.creditsSpent} credits used.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/images", "/api/credits"] });
      onSave?.(data.image);
    },
    onError: (error) => {
      toast({
        title: "Enhancement Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const colorizeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/images/${image.id}/colorize`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Colorization Complete",
        description: `Image colorized successfully. ${data.creditsSpent} credits used.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/images", "/api/credits"] });
      onSave?.(data.image);
    },
    onError: (error) => {
      toast({
        title: "Colorization Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/images/${image.id}/restore`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Restoration Complete",
        description: `Image restored successfully. ${data.creditsSpent} credits used.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/images", "/api/credits"] });
      onSave?.(data.image);
    },
    onError: (error) => {
      toast({
        title: "Restoration Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const upscaleMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/images/${image.id}/upscale`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Upscaling Complete",
        description: `Image upscaled successfully. ${data.creditsSpent} credits used.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/images", "/api/credits"] });
      onSave?.(data.image);
    },
    onError: (error) => {
      toast({
        title: "Upscaling Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const removeBackgroundMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", `/api/images/${image.id}/remove-background`);
      return await response.json();
    },
    onSuccess: (data: any) => {
      toast({
        title: "Background Removed",
        description: `Background removed successfully. ${data.creditsSpent} credits used.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/images", "/api/credits"] });
      onSave?.(data.image);
    },
    onError: (error) => {
      toast({
        title: "Background Removal Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetFilters = () => {
    setFilters({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      blur: 0,
      temperature: 0,
      exposure: 0,
      highlights: 0,
      shadows: 0,
      vignette: 0,
      clarity: 0,
      sepia: 0,
      grayscale: false,
      invert: false,
      vintage: false,
    });
  };

  const generateFilterString = () => {
    const filterArray = [];
    if (filters.brightness !== 100) filterArray.push(`brightness(${filters.brightness}%)`);
    if (filters.contrast !== 100) filterArray.push(`contrast(${filters.contrast}%)`);
    if (filters.saturation !== 100) filterArray.push(`saturate(${filters.saturation}%)`);
    if (filters.hue !== 0) filterArray.push(`hue-rotate(${filters.hue}deg)`);
    if (filters.blur > 0) filterArray.push(`blur(${filters.blur}px)`);
    if (filters.sepia > 0) filterArray.push(`sepia(${filters.sepia}%)`);
    if (filters.grayscale) filterArray.push('grayscale(100%)');
    if (filters.invert) filterArray.push('invert(100%)');
    
    return filterArray.join(' ');
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = image.imageUrl;
    link.download = `edited-image-${Date.now()}.jpg`;
    link.click();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5" />
            Advanced Image Editor
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Image Preview */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <img 
                    src={image.imageUrl} 
                    alt="Image preview"
                    className="w-full rounded-lg"
                    style={{ filter: generateFilterString() }}
                  />
                  <div className="absolute top-2 right-2 flex gap-2">
                    <Button size="sm" variant="secondary" onClick={downloadImage}>
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Editing Controls */}
          <div className="space-y-4">
            <Tabs defaultValue="filters" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="filters">Filters</TabsTrigger>
                <TabsTrigger value="ai">AI Tools</TabsTrigger>
                <TabsTrigger value="enhance">Enhance</TabsTrigger>
                <TabsTrigger value="creative">Creative</TabsTrigger>
              </TabsList>

              {/* Basic Filters Tab */}
              <TabsContent value="filters" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Contrast className="h-4 w-4" />
                      Basic Adjustments
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Brightness: {filters.brightness}%</Label>
                      <Slider
                        value={[filters.brightness]}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, brightness: value[0] }))}
                        min={0}
                        max={200}
                        step={1}
                      />
                    </div>
                    
                    <div className="space-y-2">
                      <Label>Contrast: {filters.contrast}%</Label>
                      <Slider
                        value={[filters.contrast]}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, contrast: value[0] }))}
                        min={0}
                        max={200}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Saturation: {filters.saturation}%</Label>
                      <Slider
                        value={[filters.saturation]}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, saturation: value[0] }))}
                        min={0}
                        max={200}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Hue: {filters.hue}°</Label>
                      <Slider
                        value={[filters.hue]}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, hue: value[0] }))}
                        min={-180}
                        max={180}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Temperature: {filters.temperature}</Label>
                      <Slider
                        value={[filters.temperature]}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, temperature: value[0] }))}
                        min={-100}
                        max={100}
                        step={1}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Exposure: {filters.exposure}</Label>
                      <Slider
                        value={[filters.exposure]}
                        onValueChange={(value) => setFilters(prev => ({ ...prev, exposure: value[0] }))}
                        min={-100}
                        max={100}
                        step={1}
                      />
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={resetFilters}
                      >
                        <RotateCcw className="h-4 w-4 mr-1" />
                        Reset
                      </Button>
                      <Button 
                        size="sm"
                        onClick={() => applyFiltersMutation.mutate(filters)}
                        disabled={applyFiltersMutation.isPending}
                      >
                        <Save className="h-4 w-4 mr-1" />
                        Apply Filters
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Effect Presets</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex gap-2 flex-wrap">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, vintage: !prev.vintage }))}
                      >
                        Vintage
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, grayscale: !prev.grayscale }))}
                      >
                        B&W
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, sepia: prev.sepia > 0 ? 0 : 50 }))}
                      >
                        Sepia
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setFilters(prev => ({ ...prev, invert: !prev.invert }))}
                      >
                        Invert
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* AI Tools Tab */}
              <TabsContent value="ai" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Sparkles className="h-4 w-4" />
                      AI Image Variation
                      <Badge variant="secondary">2 Credits</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Variation Style</Label>
                      <Select
                        value={variationSettings.variationType}
                        onValueChange={(value: any) => 
                          setVariationSettings(prev => ({ ...prev, variationType: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="artistic">Artistic Style</SelectItem>
                          <SelectItem value="realistic">Realistic Style</SelectItem>
                          <SelectItem value="color_variation">Color Variation</SelectItem>
                          <SelectItem value="style_transfer">Style Transfer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Intensity: {variationSettings.intensity}%</Label>
                      <Slider
                        value={[variationSettings.intensity]}
                        onValueChange={(value) => 
                          setVariationSettings(prev => ({ ...prev, intensity: value[0] }))
                        }
                        min={10}
                        max={100}
                        step={10}
                      />
                    </div>

                    <div>
                      <Label>Style Prompt (Optional)</Label>
                      <Input
                        value={variationSettings.prompt}
                        onChange={(e) => 
                          setVariationSettings(prev => ({ ...prev, prompt: e.target.value }))
                        }
                        placeholder="e.g., in the style of Van Gogh"
                      />
                    </div>

                    <Button 
                      onClick={() => variationMutation.mutate()}
                      disabled={variationMutation.isPending}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Create Variation
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Scissors className="h-4 w-4" />
                      AI Inpainting
                      <Badge variant="secondary">3 Credits</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Edit Prompt</Label>
                      <Input
                        value={inpaintSettings.prompt}
                        onChange={(e) => 
                          setInpaintSettings(prev => ({ ...prev, prompt: e.target.value }))
                        }
                        placeholder="Describe what to add or change..."
                      />
                    </div>

                    <Button 
                      onClick={() => inpaintMutation.mutate()}
                      disabled={inpaintMutation.isPending || !inpaintSettings.prompt.trim()}
                      className="w-full"
                    >
                      <Wand2 className="h-4 w-4 mr-2" />
                      Apply Inpainting
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Enhancement Tab */}
              <TabsContent value="enhance" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Zap className="h-4 w-4" />
                      AI Enhancement
                      <Badge variant="secondary">2 Credits</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <Label>Enhancement Type</Label>
                      <Select
                        value={enhancementType}
                        onValueChange={(value: any) => setEnhancementType(value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="photo">Photo Enhancement</SelectItem>
                          <SelectItem value="face">Face Enhancement</SelectItem>
                          <SelectItem value="art">Art Enhancement</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <Button 
                      onClick={() => enhanceMutation.mutate()}
                      disabled={enhanceMutation.isPending}
                      className="w-full"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Enhance Image
                    </Button>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => upscaleMutation.mutate()}
                    disabled={upscaleMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <ImageIcon className="h-4 w-4" />
                    Upscale (1 Credit)
                  </Button>

                  <Button 
                    variant="outline"
                    onClick={() => removeBackgroundMutation.mutate()}
                    disabled={removeBackgroundMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Scissors className="h-4 w-4" />
                    Remove Background (1 Credit)
                  </Button>
                </div>
              </TabsContent>

              {/* Creative Tab */}
              <TabsContent value="creative" className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <Button 
                    variant="outline"
                    onClick={() => colorizeMutation.mutate()}
                    disabled={colorizeMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Palette className="h-4 w-4" />
                    Colorize B&W Image (2 Credits)
                  </Button>

                  <Button 
                    variant="outline"
                    onClick={() => restoreMutation.mutate()}
                    disabled={restoreMutation.isPending}
                    className="flex items-center gap-2"
                  >
                    <Heart className="h-4 w-4" />
                    Restore Old Photo (2 Credits)
                  </Button>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Creative Tools</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-gray-600">
                      More creative AI tools coming soon! These will include style transfer, 
                      artistic filters, and advanced composition tools.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}