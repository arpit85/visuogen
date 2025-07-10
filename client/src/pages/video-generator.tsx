import { useState } from "react";
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
  Sparkles
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
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  fileSize?: number;
  prompt: string;
  modelName: string;
  creditsUsed: number;
}

export default function VideoGenerator() {
  const [prompt, setPrompt] = useState("");
  const [selectedModel, setSelectedModel] = useState<string>("veo-2");
  const [duration, setDuration] = useState<number>(6);
  const [resolution, setResolution] = useState<string>("1080p");
  const [aspectRatio, setAspectRatio] = useState<string>("16:9");
  const [generatedVideo, setGeneratedVideo] = useState<GeneratedVideo | null>(null);
  
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

  // Video generation mutation
  const generateVideoMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/generate-video", {
        prompt,
        modelName: selectedModel,
        duration,
        resolution,
        aspectRatio,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setGeneratedVideo(data.video);
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
              <Video className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">AI Video Generator</h1>
              <p className="text-gray-600 dark:text-gray-400">Create stunning videos with cutting-edge AI models</p>
            </div>
          </div>
          
          {/* Credits Display */}
          {creditsData && (
            <div className="flex items-center gap-2">
              <Coins className="h-4 w-4 text-yellow-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Available Credits: <span className="font-semibold text-gray-900 dark:text-white">{creditsData.credits}</span>
              </span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                            else if (model.name.includes("Veo 2")) modelKey = "veo-2";
                            else if (model.name.includes("Kling")) modelKey = "kling-v2.1";
                            return selectedModel === modelKey;
                          })()
                            ? "border-primary bg-primary/5 shadow-md" 
                            : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                        )}
                        onClick={() => {
                          // Use the backend model key format
                          if (model.name.includes("Seedance")) setSelectedModel("seedance-1-pro");
                          else if (model.name.includes("Hailuo")) setSelectedModel("hailuo-02");
                          else if (model.name.includes("Veo 2")) setSelectedModel("veo-2");
                          else if (model.name.includes("Kling")) setSelectedModel("kling-v2.1");
                          else setSelectedModel(model.name.toLowerCase().replace(/\s+/g, '-'));
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

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Video Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="duration">Duration (seconds)</Label>
                    <Input
                      id="duration"
                      type="number"
                      min="3"
                      max={selectedModelData?.maxDuration || 10}
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="resolution">Resolution</Label>
                    <Select value={resolution} onValueChange={setResolution}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="720p">720p (HD)</SelectItem>
                        <SelectItem value="1080p">1080p (Full HD)</SelectItem>
                        <SelectItem value="768p">768p</SelectItem>
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
                        <SelectItem value="16:9">16:9 (Landscape)</SelectItem>
                        <SelectItem value="9:16">9:16 (Portrait)</SelectItem>
                        <SelectItem value="1:1">1:1 (Square)</SelectItem>
                        <SelectItem value="4:3">4:3 (Standard)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
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
                    >
                      <source src={generatedVideo.videoUrl} type="video/mp4" />
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
                      const link = document.createElement('a');
                      link.href = generatedVideo.videoUrl;
                      link.download = `generated-video-${Date.now()}.mp4`;
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
      </div>
    </div>
  );
}