import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Upload, X, Settings, Zap, Eye, Trash2, Download, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { format } from "date-fns";
import ResponsiveLayout from "@/components/layout/responsive-layout";
import type { LoraTrainingJob, LoraModel } from "@shared/schema";

interface TrainingImage {
  file: File;
  preview: string;
}

export default function LoraTraining() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Training form state
  const [modelName, setModelName] = useState("");
  const [baseModel, setBaseModel] = useState("normal");
  const [trainingType, setTrainingType] = useState("null");
  const [triggerWord, setTriggerWord] = useState("");
  const [trainingImages, setTrainingImages] = useState<TrainingImage[]>([]);
  const [dragActive, setDragActive] = useState(false);

  // Generation form state
  const [selectedLoraModel, setSelectedLoraModel] = useState("");
  const [generationPrompt, setGenerationPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [width, setWidth] = useState(512);
  const [height, setHeight] = useState(512);
  const [steps, setSteps] = useState(20);
  const [guidanceScale, setGuidanceScale] = useState(7.5);

  // Fetch training jobs
  const { data: trainingJobs = [], isLoading: jobsLoading } = useQuery({
    queryKey: ["/api/lora/jobs"],
    enabled: !!user,
  });

  // Fetch LoRA models
  const { data: loraModels = [], isLoading: modelsLoading } = useQuery({
    queryKey: ["/api/lora/models"],
    enabled: !!user,
  });

  // Start training mutation
  const startTrainingMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/lora/train", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to start training");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Training Started",
        description: "Your LoRA model training has been started successfully!",
      });
      // Reset form
      setModelName("");
      setBaseModel("");
      setTrainingType("");
      setTriggerWord("");
      setTrainingImages([]);
      // Refetch data
      queryClient.invalidateQueries({ queryKey: ["/api/lora/jobs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Training Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate with LoRA mutation
  const generateMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/lora/generate", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Image Generated",
        description: "Your image has been generated with the LoRA model!",
      });
      setGenerationPrompt("");
    },
    onError: (error: Error) => {
      toast({
        title: "Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete job mutation
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: number) => {
      const response = await apiRequest("DELETE", `/api/lora/jobs/${jobId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Job Deleted",
        description: "Training job has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lora/jobs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete model mutation
  const deleteModelMutation = useMutation({
    mutationFn: async (modelId: number) => {
      const response = await apiRequest("DELETE", `/api/lora/models/${modelId}`);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Model Deleted",
        description: "LoRA model has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/lora/models"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Delete Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = Array.from(e.dataTransfer.files);
    handleFiles(files);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    handleFiles(files);
  };

  const handleFiles = (files: File[]) => {
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (trainingImages.length + imageFiles.length > 8) {
      toast({
        title: "Too Many Images",
        description: "Maximum 8 images allowed for training.",
        variant: "destructive",
      });
      return;
    }

    imageFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setTrainingImages(prev => [...prev, {
          file,
          preview: e.target?.result as string,
        }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setTrainingImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartTraining = () => {
    if (!modelName || !baseModel || trainingImages.length < 7) {
      toast({
        title: "Incomplete Form",
        description: "Please provide model name, base model, and at least 7 training images.",
        variant: "destructive",
      });
      return;
    }

    const formData = new FormData();
    formData.append("modelName", modelName);
    formData.append("baseModel", baseModel);
    formData.append("trainingType", trainingType);
    formData.append("triggerWord", triggerWord);
    
    trainingImages.forEach(({ file }) => {
      formData.append("images", file);
    });

    startTrainingMutation.mutate(formData);
  };

  const handleGenerate = () => {
    if (!selectedLoraModel || !generationPrompt) {
      toast({
        title: "Incomplete Form",
        description: "Please select a LoRA model and enter a prompt.",
        variant: "destructive",
      });
      return;
    }

    generateMutation.mutate({
      modelId: parseInt(selectedLoraModel),
      prompt: generationPrompt,
      negativePrompt,
      width,
      height,
      steps,
      guidanceScale,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500';
      case 'training':
        return 'bg-blue-500';
      case 'completed':
        return 'bg-green-500';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const completedModels = (loraModels as LoraModel[]).filter((model: LoraModel) => model.isActive);

  return (
    <ResponsiveLayout 
      title="LoRA Training Studio"
      subtitle="Train custom AI models with your own images and generate personalized content"
    >
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            LoRA Training Studio
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Train custom AI models with your own images and generate personalized content
          </p>
        </div>

        <Tabs defaultValue="train" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="train">
              <Upload className="w-4 h-4 mr-2" />
              Train Model
            </TabsTrigger>
            <TabsTrigger value="generate">
              <Zap className="w-4 h-4 mr-2" />
              Generate
            </TabsTrigger>
            <TabsTrigger value="jobs">
              <Settings className="w-4 h-4 mr-2" />
              Training Jobs
            </TabsTrigger>
            <TabsTrigger value="models">
              <Eye className="w-4 h-4 mr-2" />
              My Models
            </TabsTrigger>
          </TabsList>

          <TabsContent value="train">
            <Card>
              <CardHeader>
                <CardTitle>Train New LoRA Model</CardTitle>
                <CardDescription>
                  Upload 7-8 high-quality images to train a custom LoRA model. Training costs 100 credits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="modelName">Model Name</Label>
                    <Input
                      id="modelName"
                      value={modelName}
                      onChange={(e) => setModelName(e.target.value)}
                      placeholder="My Custom Model"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="baseModel">Base Model</Label>
                    <Select value={baseModel} onValueChange={setBaseModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select base model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="normal">Normal (SD 1.5)</SelectItem>
                        <SelectItem value="sdxl">SDXL Base</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trainingType">Training Type (Optional)</Label>
                    <Select value={trainingType} onValueChange={setTrainingType}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select training type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="null">Object/Other</SelectItem>
                        <SelectItem value="men">Men</SelectItem>
                        <SelectItem value="women">Women</SelectItem>
                        <SelectItem value="couple">Couple</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="triggerWord">Trigger Word (Optional)</Label>
                    <Input
                      id="triggerWord"
                      value={triggerWord}
                      onChange={(e) => setTriggerWord(e.target.value)}
                      placeholder="mymodel, unique_style"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <Label>Training Images (7-8 required)</Label>
                  
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      dragActive
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                        : 'border-gray-300 dark:border-gray-600'
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                  >
                    <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      Drop images here or click to upload
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                      PNG, JPG, GIF up to 10MB each. Need 7-8 high-quality images.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Choose Files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </div>

                  {trainingImages.length > 0 && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {trainingImages.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image.preview}
                            alt={`Training image ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-4">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {trainingImages.length}/8 images uploaded
                      {trainingImages.length >= 7 && (
                        <span className="text-green-600 dark:text-green-400 ml-2">✓ Ready to train</span>
                      )}
                    </div>
                    
                    <Button
                      onClick={handleStartTraining}
                      disabled={startTrainingMutation.isPending || trainingImages.length < 7}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
                    >
                      {startTrainingMutation.isPending ? (
                        <>Training... (100 credits)</>
                      ) : (
                        <>Start Training (100 credits)</>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="generate">
            <Card>
              <CardHeader>
                <CardTitle>Generate with LoRA Model</CardTitle>
                <CardDescription>
                  Use your trained LoRA models to generate personalized images. Generation costs 10 credits.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="loraModel">Select LoRA Model</Label>
                  <Select value={selectedLoraModel} onValueChange={setSelectedLoraModel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose a trained model" />
                    </SelectTrigger>
                    <SelectContent>
                      {completedModels.map((model: LoraModel) => (
                        <SelectItem key={model.id} value={model.id.toString()}>
                          {model.name} ({model.baseModelType})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prompt">Prompt</Label>
                  <Textarea
                    id="prompt"
                    value={generationPrompt}
                    onChange={(e) => setGenerationPrompt(e.target.value)}
                    placeholder="a portrait of a person in a beautiful garden, highly detailed, professional lighting"
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="negativePrompt">Negative Prompt (Optional)</Label>
                  <Textarea
                    id="negativePrompt"
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder="blurry, low quality, distorted"
                    rows={2}
                  />
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="width">Width</Label>
                    <Select value={width.toString()} onValueChange={(value) => setWidth(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="512">512px</SelectItem>
                        <SelectItem value="768">768px</SelectItem>
                        <SelectItem value="1024">1024px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="height">Height</Label>
                    <Select value={height.toString()} onValueChange={(value) => setHeight(parseInt(value))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="512">512px</SelectItem>
                        <SelectItem value="768">768px</SelectItem>
                        <SelectItem value="1024">1024px</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="steps">Steps</Label>
                    <Input
                      id="steps"
                      type="number"
                      value={steps}
                      onChange={(e) => setSteps(parseInt(e.target.value))}
                      min={10}
                      max={50}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="guidanceScale">Guidance Scale</Label>
                    <Input
                      id="guidanceScale"
                      type="number"
                      value={guidanceScale}
                      onChange={(e) => setGuidanceScale(parseFloat(e.target.value))}
                      min={1}
                      max={20}
                      step={0.5}
                    />
                  </div>
                </div>

                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || completedModels.length === 0}
                  className="w-full bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                >
                  {generateMutation.isPending ? (
                    <>Generating... (10 credits)</>
                  ) : (
                    <>
                      <Play className="w-4 h-4 mr-2" />
                      Generate Image (10 credits)
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="jobs">
            <Card>
              <CardHeader>
                <CardTitle>Training Jobs</CardTitle>
                <CardDescription>
                  Monitor your LoRA model training progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                {jobsLoading ? (
                  <div className="text-center py-8">Loading training jobs...</div>
                ) : (trainingJobs as LoraTrainingJob[]).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No training jobs found. Start training your first LoRA model!
                  </div>
                ) : (
                  <div className="space-y-4">
                    {(trainingJobs as LoraTrainingJob[]).map((job: LoraTrainingJob) => (
                      <Card key={job.id} className="border-l-4 border-l-blue-500">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="font-semibold text-lg">{job.modelName}</h3>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Base Model: {job.baseModelType}
                                {job.trainingType && ` • Type: ${job.trainingType}`}
                                {job.instancePrompt && ` • Trigger: ${job.instancePrompt}`}
                              </p>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getStatusColor(job.status)}>
                                {job.status}
                              </Badge>
                              {job.status !== 'training' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => deleteJobMutation.mutate(job.id)}
                                  disabled={deleteJobMutation.isPending}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Progress</span>
                              <span>Training Images • {job.maxTrainSteps || 100} credits</span>
                            </div>
                            
                            {job.status === 'training' && (
                              <Progress value={50} className="h-2" />
                            )}
                            
                            {job.errorMessage && (
                              <p className="text-sm text-red-600 dark:text-red-400 mt-2">
                                Error: {job.errorMessage}
                              </p>
                            )}
                            
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              Started: {job.createdAt ? new Date(job.createdAt).toLocaleString() : 'Unknown'}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="models">
            <Card>
              <CardHeader>
                <CardTitle>My LoRA Models</CardTitle>
                <CardDescription>
                  Your trained LoRA models ready for generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                {modelsLoading ? (
                  <div className="text-center py-8">Loading models...</div>
                ) : (loraModels as LoraModel[]).length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No LoRA models found. Complete a training job to see your models here!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {(loraModels as LoraModel[]).map((model: LoraModel) => (
                      <Card key={model.id} className="group hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">{model.name}</h3>
                            <Badge className={model.isActive ? 'bg-green-500' : 'bg-gray-500'}>
                              {model.isActive ? 'Active' : 'Inactive'}
                            </Badge>
                          </div>

                          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                            <p>Trigger: {model.name}</p>
                            <p>Generations: {model.generationCount}</p>
                            <p>Created: {model.createdAt ? new Date(model.createdAt).toLocaleDateString() : 'Unknown'}</p>
                          </div>

                          <div className="flex justify-between items-center mt-4 pt-4 border-t">
                            <div className="flex space-x-2">
                              {model.isActive && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setSelectedLoraModel(model.id.toString());
                                    // Switch to generate tab
                                    const generateTab = document.querySelector('[value="generate"]');
                                    if (generateTab) (generateTab as HTMLElement).click();
                                  }}
                                >
                                  <Play className="w-4 h-4 mr-1" />
                                  Use
                                </Button>
                              )}
                            </div>
                            
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteModelMutation.mutate(model.id)}
                              disabled={deleteModelMutation.isPending}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveLayout>
  );
}