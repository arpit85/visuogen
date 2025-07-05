import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Trash2, Play, Plus, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface BatchPrompt {
  id: string;
  prompt: string;
  settings?: {
    size?: string;
    quality?: string;
    style?: string;
  };
}

interface BatchJob {
  id: number;
  name: string;
  status: string;
  totalImages: number;
  completedImages: number;
  failedImages: number;
  creditsUsed: number;
  createdAt: string;
  modelId: number;
}

export default function BatchGeneration() {
  const [batchName, setBatchName] = useState("");
  const [selectedModelId, setSelectedModelId] = useState<number | null>(null);
  const [prompts, setPrompts] = useState<BatchPrompt[]>([
    { id: "1", prompt: "" }
  ]);
  const [currentPrompt, setCurrentPrompt] = useState("");

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch AI models
  const { data: models = [] } = useQuery({
    queryKey: ["/api/ai-models"],
  });

  // Fetch batch jobs
  const { data: batchJobs = [] } = useQuery({
    queryKey: ["/api/batch/jobs"],
  });

  // Fetch user credits
  const { data: credits = 0 } = useQuery({
    queryKey: ["/api/credits"],
  });

  // Create batch job mutation
  const createBatchMutation = useMutation({
    mutationFn: async (data: { name: string; modelId: number; prompts: BatchPrompt[] }) => {
      return await apiRequest("POST", "/api/batch/create", data);
    },
    onSuccess: () => {
      toast({
        title: "Batch Created",
        description: "Your batch generation job has been created successfully.",
      });
      setBatchName("");
      setPrompts([{ id: "1", prompt: "" }]);
      setSelectedModelId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/batch/jobs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Start batch job mutation
  const startBatchMutation = useMutation({
    mutationFn: async (batchId: number) => {
      return await apiRequest("POST", `/api/batch/${batchId}/start`);
    },
    onSuccess: () => {
      toast({
        title: "Batch Started",
        description: "Your batch generation job has been started.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/batch/jobs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete batch job mutation
  const deleteBatchMutation = useMutation({
    mutationFn: async (batchId: number) => {
      return await apiRequest("DELETE", `/api/batch/${batchId}`);
    },
    onSuccess: () => {
      toast({
        title: "Batch Deleted",
        description: "Batch generation job has been deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/batch/jobs"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const addPrompt = () => {
    if (currentPrompt.trim()) {
      setPrompts([...prompts, { 
        id: Date.now().toString(), 
        prompt: currentPrompt.trim() 
      }]);
      setCurrentPrompt("");
    }
  };

  const removePrompt = (id: string) => {
    setPrompts(prompts.filter(p => p.id !== id));
  };

  const updatePrompt = (id: string, newPrompt: string) => {
    setPrompts(prompts.map(p => p.id === id ? { ...p, prompt: newPrompt } : p));
  };

  const handleCreateBatch = () => {
    if (!batchName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a batch name.",
        variant: "destructive",
      });
      return;
    }

    if (!selectedModelId) {
      toast({
        title: "Error",
        description: "Please select an AI model.",
        variant: "destructive",
      });
      return;
    }

    const validPrompts = prompts.filter(p => p.prompt.trim());
    if (validPrompts.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one prompt.",
        variant: "destructive",
      });
      return;
    }

    createBatchMutation.mutate({
      name: batchName,
      modelId: selectedModelId,
      prompts: validPrompts
    });
  };

  const selectedModel = models.find((m: any) => m.id === selectedModelId);
  const totalCreditsNeeded = selectedModel ? prompts.filter(p => p.prompt.trim()).length * selectedModel.creditCost : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-500';
      case 'processing': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="grid lg:grid-cols-2 gap-8">
        {/* Create Batch Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Create Batch Generation</CardTitle>
              <CardDescription>
                Generate multiple images at once with different prompts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="batch-name">Batch Name</Label>
                <Input
                  id="batch-name"
                  placeholder="Enter batch name..."
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="model-select">AI Model</Label>
                <Select value={selectedModelId?.toString() || ""} onValueChange={(value) => setSelectedModelId(parseInt(value))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an AI model..." />
                  </SelectTrigger>
                  <SelectContent>
                    {models.map((model: any) => (
                      <SelectItem key={model.id} value={model.id.toString()}>
                        {model.name} ({model.creditCost} credits)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="prompt-input">Add Prompt</Label>
                <div className="flex gap-2">
                  <Textarea
                    id="prompt-input"
                    placeholder="Enter your prompt..."
                    value={currentPrompt}
                    onChange={(e) => setCurrentPrompt(e.target.value)}
                    rows={3}
                  />
                  <Button onClick={addPrompt} size="sm" className="self-end">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Prompts List */}
              <div className="space-y-2">
                <Label>Prompts ({prompts.filter(p => p.prompt.trim()).length})</Label>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {prompts.map((prompt, index) => (
                    <div key={prompt.id} className="flex items-center gap-2 p-3 border rounded-lg">
                      <span className="text-sm text-muted-foreground w-8">{index + 1}.</span>
                      <Input
                        value={prompt.prompt}
                        onChange={(e) => updatePrompt(prompt.id, e.target.value)}
                        placeholder="Enter prompt..."
                        className="flex-1"
                      />
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removePrompt(prompt.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Credit Summary */}
              {selectedModel && (
                <div className="p-4 bg-muted rounded-lg">
                  <div className="flex justify-between items-center">
                    <span>Total Credits Needed:</span>
                    <span className="font-semibold">{totalCreditsNeeded}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span>Available Credits:</span>
                    <span className={credits >= totalCreditsNeeded ? "text-green-600" : "text-red-600"}>
                      {credits}
                    </span>
                  </div>
                </div>
              )}

              <Button 
                onClick={handleCreateBatch} 
                disabled={createBatchMutation.isPending || credits < totalCreditsNeeded}
                className="w-full"
              >
                {createBatchMutation.isPending ? "Creating..." : "Create Batch"}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Batch Jobs List */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Batch Jobs</CardTitle>
              <CardDescription>
                Manage your batch generation jobs
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {batchJobs.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No batch jobs yet. Create your first batch!
                  </p>
                ) : (
                  batchJobs.map((job: BatchJob) => (
                    <div key={job.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{job.name}</h3>
                        <Badge className={getStatusColor(job.status)}>
                          {job.status}
                        </Badge>
                      </div>

                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span>Progress:</span>
                          <span>{job.completedImages}/{job.totalImages}</span>
                        </div>
                        <Progress 
                          value={(job.completedImages / job.totalImages) * 100} 
                          className="h-2"
                        />
                      </div>

                      <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Credits Used: {job.creditsUsed}</span>
                        <span>Failed: {job.failedImages}</span>
                      </div>

                      <div className="flex gap-2">
                        {job.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => startBatchMutation.mutate(job.id)}
                            disabled={startBatchMutation.isPending}
                          >
                            <Play className="h-4 w-4 mr-2" />
                            Start
                          </Button>
                        )}
                        
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-2" />
                          View
                        </Button>

                        {job.status !== 'processing' && (
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => deleteBatchMutation.mutate(job.id)}
                            disabled={deleteBatchMutation.isPending}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}