import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import ResponsiveLayout from "@/components/layout/responsive-layout";
import LoadingModal from "@/components/modals/loading-modal";
import AdvancedImageEditorModal from "@/components/modals/advanced-image-editor-modal";
import { Wand2, Download, Edit, Upload, X } from "lucide-react";

interface AiModel {
  id: number;
  name: string;
  description: string;
  provider: string;
  creditCost: number;
  maxResolution: string;
  averageGenerationTime: number;
  isActive: boolean;
}

interface GeneratedImage {
  image: any;
  creditsSpent: number;
}

export default function Generate() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedModel, setSelectedModel] = useState<number | null>(null);
  const [prompt, setPrompt] = useState("");
  const [settings, setSettings] = useState({
    size: "1024x1024",
    style: "Photorealistic",
    quality: "Standard",
  });

  // Map UI options to API values
  const mapSettingsToAPI = (uiSettings: any) => {
    const styleMap: Record<string, string> = {
      "Photorealistic": "natural",
      "Digital Art": "vivid",
      "Oil Painting": "natural",
      "Anime": "vivid",
    };

    const qualityMap: Record<string, string> = {
      "Standard": "standard",
      "High": "hd",
      "Ultra": "hd",
    };

    return {
      size: uiSettings.size,
      style: styleMap[uiSettings.style] || "natural",
      quality: qualityMap[uiSettings.quality] || "standard",
    };
  };
  const [generatedImage, setGeneratedImage] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const { data: models, isLoading: modelsLoading } = useQuery<AiModel[]>({
    queryKey: ["/api/ai-models"],
  });

  const { data: credits } = useQuery<{ credits: number }>({
    queryKey: ["/api/credits"],
  });

  const generateMutation = useMutation<GeneratedImage, Error, { modelId: number; prompt: string; settings: any; file?: File }>({
    mutationFn: async (data: { modelId: number; prompt: string; settings: any; file?: File }): Promise<GeneratedImage> => {
      if (data.file) {
        // Use FormData for file upload
        const formData = new FormData();
        formData.append('modelId', data.modelId.toString());
        formData.append('prompt', data.prompt);
        formData.append('settings', JSON.stringify(data.settings));
        formData.append('image', data.file);
        
        const response = await fetch('/api/images/generate-from-image', {
          method: 'POST',
          body: formData,
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to generate image');
        }
        
        return await response.json() as GeneratedImage;
      } else {
        // Regular text-to-image generation
        const response = await apiRequest("POST", "/api/images/generate", data);
        return await response.json() as GeneratedImage;
      }
    },
    onSuccess: (data: GeneratedImage) => {
      setGeneratedImage(data.image);
      setIsGenerating(false);
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/images"] });
      toast({
        title: "Image Generated!",
        description: `Successfully generated image using ${data.creditsSpent} credits.`,
      });
    },
    onError: (error: Error) => {
      setIsGenerating(false);
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleGenerate = () => {
    if (!selectedModel || !prompt.trim()) {
      toast({
        title: "Invalid Input",
        description: "Please select a model and enter a prompt.",
        variant: "destructive",
      });
      return;
    }

    const selectedModelData = models?.find(m => m.id === selectedModel);
    if (!selectedModelData) return;

    if ((credits?.credits || 0) < selectedModelData.creditCost) {
      toast({
        title: "Insufficient Credits",
        description: "You don't have enough credits to generate this image.",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    generateMutation.mutate({
      modelId: selectedModel,
      prompt,
      settings: mapSettingsToAPI(settings),
      file: uploadedFile || undefined,
    });
  };

  const downloadImage = () => {
    if (generatedImage) {
      const link = document.createElement('a');
      link.href = generatedImage.imageUrl;
      link.download = `ai-generated-${Date.now()}.jpg`;
      link.click();
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setUploadedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
    setUploadedFile(null);
  };

  if (modelsLoading) {
    return (
      <ResponsiveLayout 
        title="Generate Images" 
        subtitle="Loading..."
      >
        <div className="p-6">
          <div className="text-center">Loading...</div>
        </div>
      </ResponsiveLayout>
    );
  }

  return (
    <>
      <ResponsiveLayout 
        title="Generate Images" 
        subtitle="Transform your ideas into stunning visuals"
      >
        <div className="p-4 sm:p-6">
          <div className="max-w-4xl mx-auto">
          <Card className="bg-white shadow-sm border border-gray-200 mb-6">
            <CardContent className="p-4 sm:p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Image Generation</h3>
              
              {/* Model Selection */}
              <div className="mb-6">
                <Label className="text-sm font-medium text-gray-700 mb-3 block">
                  Select AI Model
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {models?.map((model) => (
                      <div
                        key={model.id}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          selectedModel === model.id
                            ? 'border-primary bg-primary/5'
                            : 'border-gray-200 hover:border-primary/50'
                        }`}
                        onClick={() => setSelectedModel(model.id)}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{model.name}</h4>
                          <span className={`text-xs px-2 py-1 rounded text-white ${
                            model.creditCost === 1 ? 'bg-primary' : 
                            model.creditCost === 2 ? 'bg-secondary' : 'bg-accent'
                          }`}>
                            {model.creditCost} Credit{model.creditCost > 1 ? 's' : ''}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{model.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="mb-6">
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Upload Reference Image (Optional)
                  </Label>
                  
                  {!uploadedImage ? (
                    <div className="relative border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <div className="space-y-2">
                        <p className="text-sm text-gray-600">
                          Upload an image to generate variations or use as reference
                        </p>
                        <p className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 10MB
                        </p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleFileUpload}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                    </div>
                  ) : (
                    <div className="relative">
                      <img 
                        src={uploadedImage} 
                        alt="Uploaded reference" 
                        className="w-full max-w-sm mx-auto rounded-lg shadow-sm"
                      />
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={removeUploadedImage}
                        className="absolute top-2 right-2"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                      <p className="text-sm text-gray-600 mt-2 text-center">
                        Reference image uploaded. Your prompt will be used to modify or create variations of this image.
                      </p>
                    </div>
                  )}
                </div>

                {/* Prompt Input */}
                <div className="mb-6">
                  <Label className="text-sm font-medium text-gray-700 mb-2 block">
                    Describe your image
                  </Label>
                  <Textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="w-full"
                    rows={4}
                    placeholder="A majestic mountain landscape at sunset with golden light reflecting on a pristine lake..."
                  />
                </div>

                {/* Generation Settings */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6">
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Image Size
                    </Label>
                    <Select value={settings.size} onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, size: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1024x1024">1024x1024 (Square)</SelectItem>
                        <SelectItem value="1024x768">1024x768 (Landscape)</SelectItem>
                        <SelectItem value="768x1024">768x1024 (Portrait)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Style
                    </Label>
                    <Select value={settings.style} onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, style: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Photorealistic">Photorealistic</SelectItem>
                        <SelectItem value="Digital Art">Digital Art</SelectItem>
                        <SelectItem value="Oil Painting">Oil Painting</SelectItem>
                        <SelectItem value="Anime">Anime</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label className="text-sm font-medium text-gray-700 mb-2 block">
                      Quality
                    </Label>
                    <Select value={settings.quality} onValueChange={(value) => 
                      setSettings(prev => ({ ...prev, quality: value }))
                    }>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                        <SelectItem value="Ultra">Ultra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Generate Button */}
                <Button 
                  className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg text-lg py-6"
                  onClick={handleGenerate}
                  disabled={!selectedModel || !prompt.trim() || isGenerating}
                >
                  <Wand2 className="mr-2 h-5 w-5" />
                  Generate Image ({selectedModel && models ? 
                    models.find(m => m.id === selectedModel)?.creditCost : 0} Credit{selectedModel && models && models.find(m => m.id === selectedModel)?.creditCost !== 1 ? 's' : ''})
                </Button>
              </CardContent>
            </Card>

            {/* Generated Image Display */}
            {generatedImage && (
              <Card className="bg-white shadow-sm border border-gray-200">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Generated Image</h3>
                    <div className="flex items-center space-x-2">
                      <Button onClick={downloadImage}>
                        <Download className="mr-2 h-4 w-4" />
                        Download
                      </Button>
                      <Button 
                        variant="secondary"
                        onClick={() => setIsEditorOpen(true)}
                      >
                        <Edit className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                    </div>
                  </div>
                  
                  <div className="text-center">
                    <img 
                      src={generatedImage.imageUrl} 
                      alt="Generated image" 
                      className="mx-auto rounded-lg shadow-lg max-w-full h-auto"
                    />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </ResponsiveLayout>

      <LoadingModal 
        isOpen={isGenerating} 
        title="Generating Image"
        subtitle="This may take up to 30 seconds..."
      />

      {generatedImage && (
        <AdvancedImageEditorModal
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          image={generatedImage}
          onSave={(editedImage) => {
            setGeneratedImage(editedImage);
            setIsEditorOpen(false);
          }}
        />
      )}
    </>
  );
}
