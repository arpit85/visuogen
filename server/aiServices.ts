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
  private baseUrl = "https://api.piapi.ai/midjourney/v1";

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generateImage(params: ImageGenerationParams): Promise<GeneratedImageResult> {
    try {
      const response = await fetch(`${this.baseUrl}/imagine`, {
        method: "POST",
        headers: {
          "X-API-Key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: params.prompt,
          aspect_ratio: this.sizeToAspectRatio(params.size),
          process_mode: "fast",
        }),
      });

      if (!response.ok) {
        throw new Error(`Midjourney API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // PiAPI returns a task ID, we need to poll for completion
      const imageUrl = await this.pollForCompletion(data.task_id);
      
      return {
        imageUrl,
        metadata: {
          model: "midjourney",
          taskId: data.task_id,
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
        const response = await fetch(`${this.baseUrl}/task/${taskId}`, {
          headers: {
            "X-API-Key": this.apiKey,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to check task status: ${response.statusText}`);
        }

        const data = await response.json();
        
        if (data.status === "completed" && data.output?.image_url) {
          return data.output.image_url;
        } else if (data.status === "failed") {
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
      
      const response = await fetch(`${this.baseUrl}/generation/stable-diffusion-v1-6/text-to-image`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
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
          steps: 30,
          samples: 1,
        }),
      });

      if (!response.ok) {
        throw new Error(`Stability AI API error: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Convert base64 to data URL
      const imageUrl = `data:image/png;base64,${data.artifacts[0].base64}`;
      
      return {
        imageUrl,
        metadata: {
          model: "stable-diffusion-v1-6",
          width,
          height,
          cfgScale: 7,
          steps: 30,
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

// Factory function to get the appropriate service
export async function getAIService(modelId: number) {
  // This would typically fetch from database to get model configuration
  // For now, we'll use a simple mapping
  switch (modelId) {
    case 1: // DALL-E 3
      return new OpenAIService();
    case 2: // Midjourney
      const midjourneyKey = process.env.MIDJOURNEY_API_KEY;
      if (!midjourneyKey) throw new Error("Midjourney API key not configured");
      return new MidjourneyService(midjourneyKey);
    case 3: // Stable Diffusion
      const stabilityKey = process.env.STABILITY_API_KEY;
      if (!stabilityKey) throw new Error("Stability AI API key not configured");
      return new StabilityAIService(stabilityKey);
    default:
      throw new Error("Unknown AI model");
  }
}