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
import Sidebar from "@/components/layout/sidebar";
import Header from "@/components/layout/header";
import LoadingModal from "@/components/modals/loading-modal";
import { Wand2, Download, Edit } from "lucide-react";

interface AiModel {
  id: number;
  name: string;
  description: string;
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
  const [generatedImage, setGeneratedImage] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: models, isLoading: modelsLoading } = useQuery<AiModel[]>({
    queryKey: ["/api/ai-models"],
  });

  const { data: credits } = useQuery<{ credits: number }>({
    queryKey: ["/api/credits"],
  });

  const generateMutation = useMutation({
    mutationFn: async (data: { modelId: number; prompt: string; settings: any }) => {
      const response = await apiRequest("POST", "/api/images/generate", data);
      return response.json();
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
      settings,
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

  if (modelsLoading) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <div className="flex-1 ml-64">
          <Header title="Generate Images" subtitle="Loading..." />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-gray-50">
      <Sidebar />
      <div className="flex-1 ml-64">
        <Header 
          title="Generate Images" 
          subtitle="Transform your ideas into stunning visuals" 
        />
        
        <div className="p-6">
          <div className="max-w-4xl mx-auto">
            <Card className="bg-white shadow-sm border border-gray-200 mb-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">AI Image Generation</h3>
                
                {/* Model Selection */}
                <div className="mb-6">
                  <Label className="text-sm font-medium text-gray-700 mb-3 block">
                    Select AI Model
                  </Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
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
                      <Button variant="secondary">
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
      </div>

      <LoadingModal 
        isOpen={isGenerating} 
        title="Generating Image"
        subtitle="This may take up to 30 seconds..."
      />
    </div>
  );
}
