import { useState, useRef, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import ResponsiveLayout from "@/components/layout/responsive-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Upload, 
  Download, 
  RotateCcw, 
  Scissors, 
  Maximize, 
  Paintbrush, 
  Sparkles,
  Loader2,
  ImageIcon,
  Trash2,
  Eye,
  EyeOff
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UploadedImage {
  file: File;
  preview: string;
  name: string;
  size: number;
}

interface ProcessedImage {
  url: string;
  operation: string;
  metadata: any;
}

export default function ImageEditor() {
  const { user } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
  const [processedImages, setProcessedImages] = useState<ProcessedImage[]>([]);
  const [activeTab, setActiveTab] = useState("upload");
  const [showOriginal, setShowOriginal] = useState(false);
  
  // Image processing parameters
  const [maskPrompt, setMaskPrompt] = useState("");
  const [textPrompt, setTextPrompt] = useState("");
  const [upscaleSize, setUpscaleSize] = useState([2048]);

  // Get user credits
  const { data: credits } = useQuery<{ credits: number }>({
    queryKey: ["/api/credits"],
  });

  // File upload handler
  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid File",
        description: "Please upload an image file (PNG, JPG, GIF)",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 10MB",
        variant: "destructive",
      });
      return;
    }

    // Create preview
    const preview = URL.createObjectURL(file);
    
    setUploadedImage({
      file,
      preview,
      name: file.name,
      size: file.size
    });
    
    setActiveTab("edit");
  }, [toast]);

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      const event = { target: { files: [file] } } as any;
      handleFileUpload(event);
    }
  };

  // Upload image to server
  const uploadImageMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('image', file);
      
      const response = await fetch('/api/editor/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Image Uploaded",
        description: "Ready for editing",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Upload Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Clipdrop API mutations
  const removeBackgroundMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const response = await apiRequest("POST", "/api/editor/remove-background", {
        imageUrl
      });
      return response.json();
    },
    onSuccess: (data) => {
      setProcessedImages(prev => [...prev, {
        url: data.processedImageUrl,
        operation: 'Background Removed',
        metadata: data.metadata
      }]);
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      toast({
        title: "Background Removed",
        description: `${data.creditsSpent} credit used`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const upscaleMutation = useMutation({
    mutationFn: async ({ imageUrl, targetWidth, targetHeight }: { imageUrl: string, targetWidth: number, targetHeight: number }) => {
      const response = await apiRequest("POST", "/api/editor/upscale", {
        imageUrl,
        targetWidth,
        targetHeight
      });
      return response.json();
    },
    onSuccess: (data) => {
      setProcessedImages(prev => [...prev, {
        url: data.processedImageUrl,
        operation: 'Upscaled',
        metadata: data.metadata
      }]);
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      toast({
        title: "Image Upscaled",
        description: `${data.creditsSpent} credit used`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const cleanupMutation = useMutation({
    mutationFn: async ({ imageUrl, maskUrl, mode }: { imageUrl: string, maskUrl?: string, mode: string }) => {
      const response = await apiRequest("POST", "/api/editor/cleanup", {
        imageUrl,
        maskUrl,
        mode
      });
      return response.json();
    },
    onSuccess: (data) => {
      setProcessedImages(prev => [...prev, {
        url: data.processedImageUrl,
        operation: 'Cleaned Up',
        metadata: data.metadata
      }]);
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      toast({
        title: "Image Cleaned",
        description: `${data.creditsSpent} credit used`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const textInpaintingMutation = useMutation({
    mutationFn: async ({ imageUrl, maskUrl, textPrompt }: { imageUrl: string, maskUrl?: string, textPrompt: string }) => {
      const response = await apiRequest("POST", "/api/editor/text-inpainting", {
        imageUrl,
        maskUrl,
        textPrompt
      });
      return response.json();
    },
    onSuccess: (data) => {
      setProcessedImages(prev => [...prev, {
        url: data.processedImageUrl,
        operation: 'Text Inpainting',
        metadata: data.metadata
      }]);
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      toast({
        title: "Text Inpainting Complete",
        description: `${data.creditsSpent} credit used`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const reimagineMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      const response = await apiRequest("POST", "/api/editor/reimagine", {
        imageUrl
      });
      return response.json();
    },
    onSuccess: (data) => {
      setProcessedImages(prev => [...prev, {
        url: data.processedImageUrl,
        operation: 'Reimagined',
        metadata: data.metadata
      }]);
      queryClient.invalidateQueries({ queryKey: ["/api/credits"] });
      toast({
        title: "Image Reimagined",
        description: `${data.creditsSpent} credit used`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Processing Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Upload image first if not already uploaded
  const processImage = async (operation: () => void) => {
    if (!uploadedImage) return;
    
    try {
      if (uploadedImage && !uploadImageMutation.data) {
        await uploadImageMutation.mutateAsync(uploadedImage.file);
      }
      operation();
    } catch (error) {
      console.error('Error processing image:', error);
    }
  };

  // Clear uploaded image
  const clearImage = () => {
    if (uploadedImage?.preview) {
      URL.revokeObjectURL(uploadedImage.preview);
    }
    setUploadedImage(null);
    setProcessedImages([]);
    setActiveTab("upload");
  };

  // Download processed image
  const downloadImage = (url: string, filename: string) => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ResponsiveLayout>
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            AI Image Editor
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Professional image editing powered by Clipdrop AI
          </p>
          
          {/* Credits display */}
          <div className="flex items-center gap-4 mt-4">
            <Badge variant="secondary" className="text-sm">
              Credits: {credits?.credits || 0}
            </Badge>
            {(credits?.credits || 0) <= 10 && (
              <Badge variant="destructive" className="text-sm">
                Low Credits - Buy More
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upload Section */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  Upload Image
                </CardTitle>
                <CardDescription>
                  Upload an image to start editing (PNG, JPG, GIF - Max 10MB)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {!uploadedImage ? (
                  <div
                    className={cn(
                      "border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center cursor-pointer transition-colors",
                      "hover:border-gray-400 dark:hover:border-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800"
                    )}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <ImageIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Drop your image here
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      or click to browse
                    </p>
                    <Button>
                      Choose File
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="relative">
                      <img
                        src={uploadedImage.preview}
                        alt="Uploaded"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p className="font-medium">{uploadedImage.name}</p>
                      <p>{(uploadedImage.size / 1024 / 1024).toFixed(2)} MB</p>
                    </div>
                    <Button onClick={clearImage} variant="outline" size="sm" className="w-full">
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove Image
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Editing Tools */}
          <div className="lg:col-span-2">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="upload">Upload</TabsTrigger>
                <TabsTrigger value="edit" disabled={!uploadedImage}>Edit</TabsTrigger>
                <TabsTrigger value="results" disabled={processedImages.length === 0}>Results</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="mt-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center py-12">
                      <ImageIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                        No Image Uploaded
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400">
                        Upload an image to start using the AI editing tools
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="edit" className="mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Background Removal */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Scissors className="w-5 h-5" />
                        Remove Background
                      </CardTitle>
                      <CardDescription>
                        Automatically remove the background from your image
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => processImage(() => removeBackgroundMutation.mutate(uploadedImage?.preview || ''))}
                        disabled={!uploadedImage || removeBackgroundMutation.isPending}
                        className="w-full"
                      >
                        {removeBackgroundMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Scissors className="w-4 h-4 mr-2" />
                        )}
                        Remove Background (1 Credit)
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Image Upscaling */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Maximize className="w-5 h-5" />
                        Upscale Image
                      </CardTitle>
                      <CardDescription>
                        Increase image resolution up to 4K quality
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label>Target Size: {upscaleSize[0]}px</Label>
                        <Slider
                          value={upscaleSize}
                          onValueChange={setUpscaleSize}
                          max={4096}
                          min={1024}
                          step={256}
                          className="mt-2"
                        />
                      </div>
                      <Button
                        onClick={() => processImage(() => upscaleMutation.mutate({
                          imageUrl: uploadedImage?.preview || '',
                          targetWidth: upscaleSize[0],
                          targetHeight: upscaleSize[0]
                        }))}
                        disabled={!uploadedImage || upscaleMutation.isPending}
                        className="w-full"
                      >
                        {upscaleMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Maximize className="w-4 h-4 mr-2" />
                        )}
                        Upscale (1 Credit)
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Cleanup Tool */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Paintbrush className="w-5 h-5" />
                        Cleanup Tool
                      </CardTitle>
                      <CardDescription>
                        Remove unwanted objects from your image
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="mask-prompt">Mask Prompt (Optional)</Label>
                        <Input
                          id="mask-prompt"
                          value={maskPrompt}
                          onChange={(e) => setMaskPrompt(e.target.value)}
                          placeholder="Describe what to remove..."
                        />
                      </div>
                      <Button
                        onClick={() => processImage(() => cleanupMutation.mutate({
                          imageUrl: uploadedImage?.preview || '',
                          mode: 'fast'
                        }))}
                        disabled={!uploadedImage || cleanupMutation.isPending}
                        className="w-full"
                      >
                        {cleanupMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Paintbrush className="w-4 h-4 mr-2" />
                        )}
                        Cleanup (1 Credit)
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Text Inpainting */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Sparkles className="w-5 h-5" />
                        Text Inpainting
                      </CardTitle>
                      <CardDescription>
                        Replace parts of your image with AI-generated content
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <Label htmlFor="text-prompt">Text Prompt</Label>
                        <Textarea
                          id="text-prompt"
                          value={textPrompt}
                          onChange={(e) => setTextPrompt(e.target.value)}
                          placeholder="Describe what to generate..."
                          rows={3}
                        />
                      </div>
                      <Button
                        onClick={() => processImage(() => textInpaintingMutation.mutate({
                          imageUrl: uploadedImage?.preview || '',
                          textPrompt
                        }))}
                        disabled={!uploadedImage || !textPrompt || textInpaintingMutation.isPending}
                        className="w-full"
                      >
                        {textInpaintingMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Sparkles className="w-4 h-4 mr-2" />
                        )}
                        Inpaint (1 Credit)
                      </Button>
                    </CardContent>
                  </Card>

                  {/* Reimagine */}
                  <Card className="md:col-span-2">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <RotateCcw className="w-5 h-5" />
                        Reimagine
                      </CardTitle>
                      <CardDescription>
                        Create a completely new variation of your image
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => processImage(() => reimagineMutation.mutate(uploadedImage?.preview || ''))}
                        disabled={!uploadedImage || reimagineMutation.isPending}
                        className="w-full"
                      >
                        {reimagineMutation.isPending ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <RotateCcw className="w-4 h-4 mr-2" />
                        )}
                        Reimagine (1 Credit)
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="results" className="mt-6">
                <div className="space-y-6">
                  {/* Original vs Processed Toggle */}
                  {uploadedImage && (
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold">Processing Results</h3>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowOriginal(!showOriginal)}
                      >
                        {showOriginal ? (
                          <EyeOff className="w-4 h-4 mr-2" />
                        ) : (
                          <Eye className="w-4 h-4 mr-2" />
                        )}
                        {showOriginal ? 'Hide' : 'Show'} Original
                      </Button>
                    </div>
                  )}

                  {/* Original Image */}
                  {showOriginal && uploadedImage && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Original Image</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <img
                          src={uploadedImage.preview}
                          alt="Original"
                          className="w-full max-w-md mx-auto rounded-lg"
                        />
                      </CardContent>
                    </Card>
                  )}

                  {/* Processed Images */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {processedImages.map((image, index) => (
                      <Card key={index}>
                        <CardHeader>
                          <CardTitle className="flex items-center justify-between">
                            {image.operation}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => downloadImage(image.url, `${image.operation.toLowerCase().replace(' ', '_')}_${Date.now()}.png`)}
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <img
                            src={image.url}
                            alt={image.operation}
                            className="w-full rounded-lg"
                          />
                          {image.metadata && (
                            <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                              <p>Credits used: {image.metadata.creditsConsumed}</p>
                              <p>Processed at: {new Date(image.metadata.processedAt).toLocaleString()}</p>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>

                  {processedImages.length === 0 && (
                    <Card>
                      <CardContent className="pt-6">
                        <div className="text-center py-12">
                          <Sparkles className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                            No Results Yet
                          </h3>
                          <p className="text-gray-600 dark:text-gray-400">
                            Process your image using the editing tools to see results here
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
}