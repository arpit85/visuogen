import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ResponsiveLayout from "@/components/layout/responsive-layout";


import { 
  Video, 
  Wand2, 
  Clock, 
  Monitor, 
  Coins, 
  Play,
  Download,
  AlertCircle,
  Loader2,
  Settings,
  Sparkles,
  Heart,
  FileVideo,
  Trash2
} from "lucide-react";

interface VideoModel {
  id: string;
  name: string;
  description: string;
  creditCost: number;
  maxDuration: number;
  maxResolution: string;
  averageGenerationTime: number;
}

interface GeneratedVideo {
  id: number;
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  fileSize?: number;
  prompt: string;
  modelName: string;
  creditsUsed: number;
}

interface UserVideo {
  id: number;
  userId: string;
  modelId: number;
  prompt: string;
  videoUrl: string;
  thumbnailUrl?: string;
  settings: any;
  duration?: number;
  resolution?: string;
  fileSize?: number;
  status: string;
  isFavorite: boolean;
  isPublic: boolean;
  createdAt: string;
}

// Model presets configuration
const MODEL_PRESETS = {
  "seedance-1-pro": {
    name: "Seedance 1.0 Pro",
    durations: [5, 10],
    resolutions: ["480p", "1080p"],
    defaultDuration: 5,
    defaultResolution: "1080p",
    aspectRatios: ["16:9", "9:16", "1:1", "4:3"],
    defaultAspectRatio: "16:9",
    tips: "ByteDance's premium model excels at cinematic quality and longer sequences. Supports both text-to-video and image-to-video generation. Upload an image to use it as the starting frame for your video."
  },
  "hailuo-02": {
    name: "Hailuo 02",
    durations: [3, 5, 6, 8, 10],
    resolutions: ["768p", "1080p"],
    defaultDuration: 6,
    defaultResolution: "1080p",
    aspectRatios: ["16:9", "9:16", "1:1", "4:3"],
    defaultAspectRatio: "16:9",
    tips: "MiniMax's advanced model with director-level camera controls. Great for dynamic scenes and movement."
  },

  "kling-v2.1": {
    name: "Kling AI v2.1",
    durations: [5, 10],
    resolutions: ["1080p"],
    defaultDuration: 5,
    defaultResolution: "1080p",
    aspectRatios: ["16:9", "9:16", "1:1", "4:3"],
    defaultAspectRatio: "16:9",
    tips: "Kling Master specializes in superb dynamics and high prompt adherence. Only supports 5s and 10s durations with 1080p quality."
  },
  "veo-3": {
    name: "Google Veo 3",
    durations: [4, 6, 8, 10],
    resolutions: ["720p", "1080p"],
    defaultDuration: 8,
    defaultResolution: "1080p",
    aspectRatios: ["16:9", "9:16", "1:1", "4:3"],
    defaultAspectRatio: "16:9",
    tips: "Google's latest video model with enhanced quality and longer duration support. Perfect for complex scenes with multiple elements."
  }
};

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("veo-3");
  const [duration, setDuration] = useState<number>(8);
  const [resolution, setResolution] = useState<string>("1080p");
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Image upload state for SeDance-1-Pro
  const [uploadedImage, setUploadedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  

  
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch video models
  const { data: videoModels = [], isLoading: modelsLoading } = useQuery<VideoModel[]>({
    queryKey: ["/api/video-models"],
    retry: false,
  });

  // Fetch user credits
  const { data: creditsData } = useQuery<{ credits: number }>({
    queryKey: ["/api/credits"],
  });

  // Fetch user videos
  const { data: userVideos = [], isLoading: videosLoading } = useQuery<UserVideo[]>({
    queryKey: ["/api/videos"],
    retry: false,
  });

  // Video generation mutation
  const generateVideoMutation = useMutation({
    mutationFn: async () => {
      const formData = new FormData();
      formData.append('prompt', prompt);
      formData.append('modelName', selectedModel);
      formData.append('duration', duration.toString());
      formData.append('resolution', resolution);
      formData.append('aspectRatio', aspectRatio);
      
      // Add image for SeDance-1-Pro if available
      if (uploadedImage && selectedModel === 'seedance-1-pro') {
        formData.append('image', uploadedImage);
      }

      const response = await fetch('/api/generate-video', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate video');
      }

      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedVideo(data.video);
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      queryClient.invalidateQueries({ queryKey: ["/api/videos"] });
      toast({
        title: "Video Generated!",
        description: `Your video has been created using ${data.video.modelName}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate video",
        variant: "destructive",
      });
    },
  });



  // Image upload handlers for SeDance-1-Pro
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type and size
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid File",
          description: "Please upload an image file (PNG, JPG, GIF)",
          variant: "destructive",
        });
        return;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          title: "File Too Large",
          description: "Image must be less than 10MB",
          variant: "destructive",
        });
        return;
      }

      setUploadedImage(file);
      
      // Create preview URL
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeUploadedImage = () => {
    setUploadedImage(null);
    setImagePreview(null);
  };

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt Required",
        description: "Please enter a description for your video",
        variant: "destructive",
      });
      return;
    }

    const model = videoModels.find(m => {
      const modelKey = selectedModel.toLowerCase();
      return m.name.toLowerCase().includes(modelKey) || 
             modelKey.includes(m.name.toLowerCase()) ||
             m.id.toLowerCase().includes(modelKey);
    });
    if (model && creditsData && creditsData.credits < model.creditCost) {
      toast({
        title: "Insufficient Credits",
        description: `You need ${model.creditCost} credits but only have ${creditsData.credits}`,
        variant: "destructive",
      });
      return;
    }

    generateVideoMutation.mutate();
  };

  const selectedModelData = videoModels.find(m => {
    const modelKey = selectedModel.toLowerCase();
    return m.name.toLowerCase().includes(modelKey) || 
           modelKey.includes(m.name.toLowerCase()) ||
           m.id.toLowerCase().includes(modelKey);
  });

  // Get current model preset
  const currentPreset = MODEL_PRESETS[selectedModel as keyof typeof MODEL_PRESETS];

  // Auto-apply presets when model changes
  useEffect(() => {
    if (currentPreset) {
      // Apply default duration if current is not in allowed list
      if (!currentPreset.durations.includes(duration)) {
        setDuration(currentPreset.defaultDuration);
      }
      
      // Apply default resolution if current is not in allowed list
      if (!currentPreset.resolutions.includes(resolution)) {
        setResolution(currentPreset.defaultResolution);
      }
      
      // Apply default aspect ratio if current is not in allowed list
      if (!currentPreset.aspectRatios.includes(aspectRatio)) {
        setAspectRatio(currentPreset.defaultAspectRatio);
      }
    }
    
    // Clear uploaded image if switching away from SeDance-1-Pro
    if (selectedModel !== 'seedance-1-pro' && (uploadedImage || imagePreview)) {
      setUploadedImage(null);
      setImagePreview(null);
    }
  }, [selectedModel, currentPreset, duration, resolution, aspectRatio, uploadedImage, imagePreview]);

  return (
    <ResponsiveLayout 
      title="AI Video Generator" 
      subtitle="Create stunning videos with cutting-edge AI models"
    >
      <div className="max-w-7xl mx-auto">
        {/* Credits Display */}
        {creditsData && (
          <div className="flex items-center gap-2 mb-8">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Available Credits: <span className="font-semibold text-gray-900 dark:text-white">{creditsData.credits}</span>
            </span>
          </div>
        )}

        <Tabs defaultValue="generate" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="generate">Generate Video</TabsTrigger>
            <TabsTrigger value="gallery">My Videos ({userVideos.length})</TabsTrigger>
          </TabsList>
          
          <TabsContent value="generate">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-6">
          {/* Generation Controls */}
          <div className="space-y-6">
            {/* Model Selection */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Choose Video Model
                </CardTitle>
                <CardDescription>
                  Select the AI model that best fits your creative vision
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {modelsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {videoModels.map((model) => (
                      <div
                        key={model.id}
                        className={cn(
                          "p-4 border rounded-lg cursor-pointer transition-all duration-200",
                          (() => {
                            let modelKey = "";
                            if (model.name.includes("Seedance")) modelKey = "seedance-1-pro";
                            else if (model.name.includes("Hailuo")) modelKey = "hailuo-02";
                            else if (model.name.includes("Veo 3")) modelKey = "veo-3";
                            else if (model.name.includes("Kling")) modelKey = "kling-v2.1";
                            return selectedModel === modelKey;
                          })()
                            ? "border-primary bg-primary/5 shadow-md" 
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        )}
                        onClick={() => {
                          // Use the backend model key format and apply presets
                          let modelKey = "";
                          if (model.name.includes("Seedance")) modelKey = "seedance-1-pro";
                          else if (model.name.includes("Hailuo")) modelKey = "hailuo-02";
                          else if (model.name.includes("Veo 3")) modelKey = "veo-3";
                          else if (model.name.includes("Kling")) modelKey = "kling-v2.1";
                          else modelKey = model.name.toLowerCase().replace(/\s+/g, '-');
                          
                          setSelectedModel(modelKey);
                        }}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="font-semibold text-gray-900 dark:text-white">{model.name}</h3>
                              <Badge variant="secondary">{model.creditCost} credits</Badge>
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{model.description}</p>
                            <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400">
                              {(() => {
                                // Get preset for this model
                                let modelKey = "";
                                if (model.name.includes("Seedance")) modelKey = "seedance-1-pro";
                                else if (model.name.includes("Hailuo")) modelKey = "hailuo-02";
                                else if (model.name.includes("Veo 3")) modelKey = "veo-3";
                                else if (model.name.includes("Kling")) modelKey = "kling-v2.1";
                                
                                const preset = MODEL_PRESETS[modelKey as keyof typeof MODEL_PRESETS];
                                
                                if (preset) {
                                  return (
                                    <>
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {preset.durations.join('s, ')}s
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Monitor className="h-3 w-3" />
                                        {preset.resolutions.join(', ')}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Wand2 className="h-3 w-3" />
                                        ~{model.averageGenerationTime}s
                                      </div>
                                    </>
                                  );
                                } else {
                                  return (
                                    <>
                                      <div className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        Max {model.maxDuration}s
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Monitor className="h-3 w-3" />
                                        {model.maxResolution}
                                      </div>
                                      <div className="flex items-center gap-1">
                                        <Wand2 className="h-3 w-3" />
                                        ~{model.averageGenerationTime}s
                                      </div>
                                    </>
                                  );
                                }
                              })()}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Prompt Input */}
            <Card>
              <CardHeader>
                <CardTitle>Video Description</CardTitle>
                <CardDescription>
                  Describe the video you want to create. Be detailed and specific for best results.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="A majestic dragon soaring through cloudy skies at sunset, cinematic camera movement..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <div className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  {prompt.length}/500 characters
                </div>
              </CardContent>
            </Card>

            {/* Image Upload for SeDance-1-Pro */}
            {selectedModel === 'seedance-1-pro' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileVideo className="h-5 w-5" />
                    Image-to-Video (Optional)
                  </CardTitle>
                  <CardDescription>
                    Upload an image to use as the starting frame for your video. SeDance-1-Pro supports both text-to-video and image-to-video generation.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!uploadedImage ? (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          id="image-upload"
                        />
                        <label htmlFor="image-upload" className="cursor-pointer">
                          <div className="flex flex-col items-center gap-2">
                            <FileVideo className="h-8 w-8 text-gray-400 dark:text-gray-500" />
                            <div className="text-sm font-medium text-gray-600 dark:text-gray-300">
                              Click to upload an image
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              PNG, JPG, GIF up to 10MB
                            </div>
                          </div>
                        </label>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Leave empty for text-to-video generation only
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative">
                        <img
                          src={imagePreview!}
                          alt="Uploaded preview"
                          className="w-full max-h-48 object-contain rounded-lg border"
                        />
                        <Button
                          onClick={removeUploadedImage}
                          variant="destructive"
                          size="sm"
                          className="absolute top-2 right-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="text-sm text-green-600 dark:text-green-400 text-center">
                        ✓ Image uploaded - will be used as starting frame for video
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Model Tips */}
            {currentPreset && (
              <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20">
                <CardHeader>
                  <CardTitle className="text-blue-900 dark:text-blue-100 flex items-center gap-2">
                    <Sparkles className="h-5 w-5" />
                    {currentPreset.name} Tips
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-blue-800 dark:text-blue-200 text-sm">{currentPreset.tips}</p>
                </CardContent>
              </Card>
            )}

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Video Settings
                </CardTitle>
                <CardDescription>
                  {currentPreset ? `Settings optimized for ${currentPreset.name}` : "Configure your video parameters"}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="duration">Duration (seconds)</Label>
                    {currentPreset ? (
                      <Select value={duration.toString()} onValueChange={(val) => setDuration(Number(val))}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {currentPreset.durations.map((dur) => (
                            <SelectItem key={dur} value={dur.toString()}>
                              {dur} second{dur !== 1 ? 's' : ''}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        id="duration"
                        type="number"
                        min="3"
                        max={selectedModelData?.maxDuration || 10}
                        value={duration}
                        onChange={(e) => setDuration(Number(e.target.value))}
                        className="mt-1"
                      />
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor="resolution">Resolution</Label>
                    <Select value={resolution} onValueChange={setResolution}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentPreset ? (
                          currentPreset.resolutions.map((res) => (
                            <SelectItem key={res} value={res}>
                              {res === "1080p" ? "1080p (Full HD)" : 
                               res === "768p" ? "768p (HD+)" :
                               res === "720p" ? "720p (HD)" :
                               res === "480p" ? "480p (SD)" : res}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="720p">720p (HD)</SelectItem>
                            <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="aspectRatio">Aspect Ratio</Label>
                    <Select value={aspectRatio} onValueChange={setAspectRatio}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {currentPreset ? (
                          currentPreset.aspectRatios.map((ratio) => (
                            <SelectItem key={ratio} value={ratio}>
                              {ratio === "16:9" ? "16:9 (Landscape)" :
                               ratio === "9:16" ? "9:16 (Portrait)" :
                               ratio === "1:1" ? "1:1 (Square)" :
                               ratio === "4:3" ? "4:3 (Standard)" : ratio}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                            <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                            <SelectItem value="1:1">1:1 (Square)</SelectItem>
                            <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                {/* Preset Information */}
                {currentPreset && (
                  <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Available options for {currentPreset.name}:</strong>
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-gray-500 dark:text-gray-400 mt-1">
                      <span>Durations: {currentPreset.durations.join('s, ')}s</span>
                      <span>Resolutions: {currentPreset.resolutions.join(', ')}</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Generate Button */}
            <Button
              onClick={handleGenerate}
              disabled={generateVideoMutation.isPending || !prompt.trim()}
              className="w-full h-12 text-lg"
              size="lg"
            >
              {generateVideoMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Generating Video...
                </>
              ) : (
                <>
                  <Play className="mr-2 h-5 w-5" />
                  Generate Video {selectedModelData && `(${selectedModelData.creditCost} credits)`}
                </>
              )}
            </Button>
          </div>

          {/* Generated Video Display */}
          <div className="space-y-6">
            {generatedVideo ? (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Generated Video</span>
                    <Badge variant="outline">{generatedVideo.creditsUsed} credits used</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Video Player */}
                  <div className="relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-800">
                    <video
                      controls
                      className="w-full h-auto max-h-96"
                      poster={generatedVideo.thumbnailUrl}
                      preload="metadata"
                    >
                      <source src={`/api/video/${generatedVideo.id}/download?action=play`} type="video/mp4" />
                      Your browser does not support the video tag.
                    </video>
                  </div>

                  {/* Video Info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                      {generatedVideo.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {generatedVideo.duration}s
                        </div>
                      )}
                      {generatedVideo.resolution && (
                        <div className="flex items-center gap-1">
                          <Monitor className="h-4 w-4" />
                          {generatedVideo.resolution}
                        </div>
                      )}
                      {generatedVideo.fileSize && (
                        <div className="flex items-center gap-1">
                          <Video className="h-4 w-4" />
                          {(generatedVideo.fileSize / (1024 * 1024)).toFixed(1)} MB
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm">
                      <strong>Model:</strong> {generatedVideo.modelName}
                    </div>
                    
                    <div className="text-sm">
                      <strong>Prompt:</strong> {generatedVideo.prompt}
                    </div>
                  </div>

                  {/* Download Button */}
                  <Button
                    onClick={() => {
                      // Use direct download endpoint with proper headers
                      const link = document.createElement('a');
                      link.href = `/api/video/${generatedVideo.id}/download?action=download`;
                      link.download = `video_${generatedVideo.id}.mp4`;
                      document.body.appendChild(link);
                      link.click();
                      document.body.removeChild(link);
                    }}
                    className="w-full"
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download Video
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                  <Video className="h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    No Video Generated Yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">
                    Enter a prompt and click "Generate Video" to create your first AI video
                  </p>
                  {creditsData && creditsData.credits <= 0 && (
                    <div className="flex items-center gap-2 p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg text-orange-700 dark:text-orange-300">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm">You need credits to generate videos</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            </div>
          </div>
          </TabsContent>
          
          <TabsContent value="gallery">
            <div className="mt-6">
              {videosLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                </div>
              ) : userVideos.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {userVideos.map((video) => (
                    <Card key={video.id} className="overflow-hidden">
                      <div className="relative">
                        <video
                          className="w-full h-48 object-cover bg-gray-100 dark:bg-gray-800"
                          poster={video.thumbnailUrl}
                          preload="metadata"
                          id={`video-${video.id}`}
                        >
                          <source src={`/api/video/${video.id}/download?action=play`} type="video/mp4" />
                          Your browser does not support the video tag.
                        </video>
                        {video.isFavorite && (
                          <div className="absolute top-2 right-2">
                            <Heart className="h-4 w-4 text-red-500 fill-current" />
                          </div>
                        )}
                      </div>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <p className="text-sm text-gray-900 dark:text-white font-medium line-clamp-2">
                            {video.prompt}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                            <div className="flex items-center gap-2">
                              {video.duration && (
                                <div className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {video.duration}s
                                </div>
                              )}
                              {video.resolution && (
                                <div className="flex items-center gap-1">
                                  <Monitor className="h-3 w-3" />
                                  {video.resolution}
                                </div>
                              )}
                            </div>
                            <span>{new Date(video.createdAt).toLocaleDateString()}</span>
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1"
                              onClick={() => {
                                // Use direct download endpoint
                                const link = document.createElement('a');
                                link.href = `/api/video/${video.id}/download?action=download`;
                                link.download = `video_${video.id}.mp4`;
                                document.body.appendChild(link);
                                link.click();
                                document.body.removeChild(link);
                              }}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card className="border-dashed">
                  <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                    <FileVideo className="h-16 w-16 text-gray-400 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      No Videos Yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      Your generated videos will appear here. Start by creating your first video in the Generate tab.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>


    </ResponsiveLayout>
  );
}