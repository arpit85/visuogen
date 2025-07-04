import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface GeneratedImageResult {
  imageUrl: string;
  revisedPrompt?: string;
  metadata?: any;
}

export interface ImageGenerationParams {
  prompt: string;
  size?: string;
  quality?: string;
  style?: string;
  model?: string;
}

export class OpenAIService {
  async generateImage(params: ImageGenerationParams): Promise<GeneratedImageResult> {
    try {
      const response = await openai.images.generate({
        model: "dall-e-3",
        prompt: params.prompt,
        n: 1,
        size: (params.size as "1024x1024" | "1792x1024" | "1024x1792") || "1024x1024",
        quality: (params.quality as "standard" | "hd") || "standard",
        style: (params.style as "vivid" | "natural") || "vivid",
      });

      const imageData = response.data?.[0];
      if (!imageData?.url) {
        throw new Error("No image generated from OpenAI");
      }

      return {
        imageUrl: imageData.url,
        revisedPrompt: imageData.revised_prompt || undefined,
        metadata: {
          model: "dall-e-3",
          size: params.size,
          quality: params.quality,
          style: params.style,
        },
      };
    } catch (error) {
      console.error("OpenAI API error:", error);
      throw new Error("Failed to generate image with DALL-E 3");
    }
  }
}

export class MidjourneyService {
  private apiKey: string;
  private baseUrl = "https://api.piapi.ai/api/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(params: ImageGenerationParams): Promise<GeneratedImageResult> {
    try {
      const response = await fetch(`${this.baseUrl}/task`, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "midjourney",
          task_type: "imagine",
          input: {
            prompt: params.prompt,
            aspect_ratio: this.sizeToAspectRatio(params.size),
            process_mode: params.quality === 'hd' ? 'fast' : 'relax',
            skip_prompt_check: false
          },
          config: {
            service_mode: "public"
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Midjourney API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // PiAPI returns a task ID, we need to poll for completion
      const imageUrl = await this.pollForCompletion(data.data.task_id);
      
      return {
        imageUrl,
        revisedPrompt: params.prompt,
        metadata: {
          model: "midjourney",
          taskId: data.data.task_id,
          aspectRatio: this.sizeToAspectRatio(params.size),
        },
      };
    } catch (error) {
      console.error("Midjourney API error:", error);
      throw new Error("Failed to generate image with Midjourney");
    }
  }

  private sizeToAspectRatio(size?: string): string {
    switch (size) {
      case "1792x1024":
        return "16:9";
      case "1024x1792":
        return "9:16";
      default:
        return "1:1";
    }
  }

  private async pollForCompletion(taskId: string): Promise<string> {
    const maxAttempts = 60; // 5 minutes max wait
    const pollInterval = 5000; // 5 seconds

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(`${this.baseUrl}/task`, {
          method: "POST",
          headers: {
            "x-api-key": this.apiKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            task_id: taskId,
            action: "fetch"
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to check task status: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.data?.status === "completed" && data.data.output?.image_url) {
          return data.data.output.image_url;
        } else if (data.data?.status === "failed") {
          throw new Error("Image generation failed");
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error(`Polling attempt ${attempt + 1} failed:`, error);
        if (attempt === maxAttempts - 1) {
          throw new Error("Timeout waiting for image generation");
        }
      }
    }

    throw new Error("Timeout waiting for image generation");
  }
}

export class StabilityAIService {
  private apiKey: string;
  private baseUrl = "https://api.stability.ai/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(params: ImageGenerationParams): Promise<GeneratedImageResult> {
    try {
      const [width, height] = this.parseSize(params.size);
      
      const response = await fetch(`${this.baseUrl}/generation/stable-diffusion-xl-1024-v1-0/text-to-image`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
          "Accept": "application/json",
        },
        body: JSON.stringify({
          text_prompts: [
            {
              text: params.prompt,
              weight: 1,
            },
          ],
          cfg_scale: 7,
          height,
          width,
          steps: params.quality === 'hd' ? 50 : 30,
          samples: 1,
          style_preset: params.style === 'natural' ? 'photographic' : 'cinematic',
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Stability AI API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.artifacts || !data.artifacts[0]?.base64) {
        throw new Error("No image data received from Stability AI");
      }
      
      // Convert base64 to data URL
      const imageUrl = `data:image/png;base64,${data.artifacts[0].base64}`;
      
      return {
        imageUrl,
        revisedPrompt: params.prompt,
        metadata: {
          model: "stable-diffusion-xl-1024-v1-0",
          width,
          height,
          cfgScale: 7,
          steps: params.quality === 'hd' ? 50 : 30,
          seed: data.artifacts[0].seed,
        },
      };
    } catch (error) {
      console.error("Stability AI API error:", error);
      throw new Error("Failed to generate image with Stable Diffusion");
    }
  }

  private parseSize(size?: string): [number, number] {
    switch (size) {
      case "1792x1024":
        return [1792, 1024];
      case "1024x1792":
        return [1024, 1792];
      default:
        return [1024, 1024];
    }
  }
}

export class RunwareAIService {
  private apiKey: string;
  private baseUrl = "https://api.runware.ai/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(params: ImageGenerationParams): Promise<GeneratedImageResult> {
    try {
      const [width, height] = this.parseSize(params.size);
      
      // Generate a unique task UUID
      const taskUUID = `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const response = await fetch(`${this.baseUrl}/images/inference`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          {
            taskType: "imageInference",
            taskUUID: taskUUID,
            positivePrompt: params.prompt,
            model: this.getFluxModel(params.model),
            width,
            height,
            steps: params.quality === 'hd' ? 40 : 25,
            CFGScale: 7.5,
            numberResults: 1,
            includeCost: true,
          }
        ]),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Runware AI API error: ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      
      if (!data.data || !data.data[0]?.imageURL) {
        throw new Error("No image data received from Runware AI");
      }
      
      const result = data.data[0];
      
      return {
        imageUrl: result.imageURL,
        revisedPrompt: params.prompt,
        metadata: {
          model: this.getFluxModel(params.model),
          width,
          height,
          steps: params.quality === 'hd' ? 40 : 25,
          cfgScale: 7.5,
          cost: result.cost,
          taskUUID: result.taskUUID,
        },
      };
    } catch (error) {
      console.error("Runware AI API error:", error);
      throw new Error("Failed to generate image with Flux");
    }
  }

  private getFluxModel(model?: string): string {
    switch (model) {
      case 'flux-pro':
        return 'runware:102@1'; // FLUX.1.1 Pro
      case 'flux-dev':
        return 'runware:97@2'; // FLUX.1 Dev
      case 'flux-schnell':
        return 'runware:100@1'; // FLUX.1 Schnell
      default:
        return 'runware:97@2'; // Default to FLUX.1 Dev
    }
  }

  private parseSize(size?: string): [number, number] {
    switch (size) {
      case "1792x1024":
        return [1792, 1024];
      case "1024x1792":
        return [1024, 1792];
      default:
        return [1024, 1024];
    }
  }
}

// Factory function to get the appropriate service based on database configuration
export async function getAIService(modelId: number) {
  const { storage } = await import('./storage');
  
  // Fetch model configuration from database
  const model = await storage.getAiModel(modelId);
  if (!model || !model.isActive) {
    throw new Error("AI model not found or not active");
  }

  // Get API key for the model's provider
  const apiKeyRecord = await storage.getApiKeyByProvider(model.provider);
  if (!apiKeyRecord || !apiKeyRecord.isActive) {
    throw new Error(`API key not configured for provider: ${model.provider}`);
  }

  // Return the appropriate service based on provider
  switch (model.provider.toLowerCase()) {
    case 'openai':
      return new OpenAIService();
    
    case 'piapi':
    case 'midjourney':
      return new MidjourneyService(apiKeyRecord.keyValue);
    
    case 'stability':
    case 'stabilityai':
      return new StabilityAIService(apiKeyRecord.keyValue);
    
    case 'runware':
    case 'flux':
      return new RunwareAIService(apiKeyRecord.keyValue);
    
    default:
      throw new Error(`Unsupported AI provider: ${model.provider}`);
  }
}