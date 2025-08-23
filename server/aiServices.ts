import OpenAI from "openai";
import Replicate from "replicate";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = process.env.OPENAI_API_KEY ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

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
    if (!openai) {
      throw new Error('OpenAI API key not configured');
    }
    
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

  async createVariation(imageUrl: string, params?: { size?: string; n?: number }): Promise<GeneratedImageResult> {
    try {
      // Convert data URL to buffer
      const imageBuffer = this.dataUrlToBuffer(imageUrl);
      
      // Create a stream from buffer for OpenAI API
      const { Readable } = await import('stream');
      const imageStream = new Readable();
      imageStream.push(imageBuffer);
      imageStream.push(null);
      
      // Add required properties for OpenAI API
      (imageStream as any).name = 'image.png';
      (imageStream as any).type = 'image/png';

      const response = await openai.images.createVariation({
        image: imageStream as any,
        n: params?.n || 1,
        size: (params?.size as "1024x1024" | "512x512" | "256x256") || "1024x1024",
      });

      const imageData = response.data?.[0];
      if (!imageData?.url) {
        throw new Error("No image variation generated from OpenAI");
      }

      return {
        imageUrl: imageData.url,
        metadata: {
          model: "dall-e-2-variation",
          size: params?.size || "1024x1024",
          method: "variation",
        },
      };
    } catch (error) {
      console.error("OpenAI variation error:", error);
      throw new Error("Failed to create image variation with OpenAI");
    }
  }

  async editImage(params: { image: string; prompt: string; mask?: string; size?: string }): Promise<GeneratedImageResult> {
    try {
      // Convert data URL to buffer
      const imageBuffer = this.dataUrlToBuffer(params.image);
      
      // Create a stream from buffer for OpenAI API
      const { Readable } = await import('stream');
      const imageStream = new Readable();
      imageStream.push(imageBuffer);
      imageStream.push(null);
      
      // Add required properties for OpenAI API
      (imageStream as any).name = 'image.png';
      (imageStream as any).type = 'image/png';

      let maskStream;
      if (params.mask) {
        const maskBuffer = this.dataUrlToBuffer(params.mask);
        maskStream = new Readable();
        maskStream.push(maskBuffer);
        maskStream.push(null);
        (maskStream as any).name = 'mask.png';
        (maskStream as any).type = 'image/png';
      }

      const response = await openai.images.edit({
        image: imageStream as any,
        mask: maskStream as any,
        prompt: params.prompt,
        n: 1,
        size: (params.size as "1024x1024" | "512x512" | "256x256") || "1024x1024",
      });

      const imageData = response.data?.[0];
      if (!imageData?.url) {
        throw new Error("No edited image generated from OpenAI");
      }

      return {
        imageUrl: imageData.url,
        metadata: {
          model: "dall-e-2-edit",
          size: params.size || "1024x1024",
          method: "edit",
          prompt: params.prompt,
        },
      };
    } catch (error) {
      console.error("OpenAI edit error:", error);
      throw new Error("Failed to edit image with OpenAI");
    }
  }

  private dataUrlToBuffer(dataUrl: string): Buffer {
    const base64Data = dataUrl.split(',')[1];
    return Buffer.from(base64Data, 'base64');
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
      console.log("Midjourney request params:", {
        prompt: params.prompt,
        size: params.size,
        quality: params.quality
      });

      const requestBody = {
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
      };

      console.log("Midjourney request body:", JSON.stringify(requestBody, null, 2));

      const response = await fetch(`${this.baseUrl}/task`, {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      console.log("Midjourney response status:", response.status);
      console.log("Midjourney response statusText:", response.statusText);

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Midjourney API error response:", errorText);
        throw new Error(`Midjourney API error: ${response.status} ${response.statusText} - ${errorText}`);
      }

      const data = await response.json();
      console.log("Midjourney response data:", JSON.stringify(data, null, 2));
      
      if (!data.data || !data.data.task_id) {
        throw new Error(`Invalid response format: ${JSON.stringify(data)}`);
      }
      
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
        // Use GET request to check task status (correct PiAPI format)
        const response = await fetch(`${this.baseUrl}/task/${taskId}`, {
          method: "GET",
          headers: {
            "x-api-key": this.apiKey,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to check task status: ${response.statusText}`);
        }

        const data = await response.json();
        console.log(`Poll attempt ${attempt + 1}: Status - ${data.data?.status}`);
        console.log("Full polling response:", JSON.stringify(data, null, 2));
        
        if (data.data?.status === "completed") {
          // Check for multiple possible image URL formats according to PiAPI docs
          const imageUrl = data.data.output?.image_url || 
                          data.data.output?.image_urls?.[0] ||
                          data.data.output?.discord_image_url;
          
          if (imageUrl) {
            console.log("Midjourney generation completed:", imageUrl);
            return imageUrl;
          } else {
            console.error("No image URL found in completed response:", data.data.output);
            throw new Error("No image URL in completed response");
          }
        } else if (data.data?.status === "failed") {
          console.error("Midjourney generation failed:", data.data);
          const errorMessage = data.data.error?.message || 
                              data.data.detail || 
                              data.data.message || 
                              'Generation failed';
          throw new Error(`Image generation failed: ${errorMessage}`);
        }

        // Wait before next poll
        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error) {
        console.error(`Polling attempt ${attempt + 1} failed:`, error);
        if (attempt === maxAttempts - 1) {
          throw new Error("Timeout waiting for image generation");
        }
        await new Promise(resolve => setTimeout(resolve, pollInterval));
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

export class ReplicateAIService {
  private apiKey: string;
  private replicate: Replicate;
  private modelName: string;

  constructor(apiKey: string, modelName: string = 'FLUX Schnell') {
    this.apiKey = apiKey;
    this.modelName = modelName;
    this.replicate = new Replicate({
      auth: apiKey,
    });
  }

  async generateImage(params: ImageGenerationParams): Promise<GeneratedImageResult> {
    try {
      const modelConfig = this.getModelConfig(this.modelName);
      const [width, height] = this.parseSize(params.size);
      
      console.log(`Generating image with Replicate model: ${modelConfig.id}`);
      
      // Prepare input based on model type
      let input: any = {
        prompt: params.prompt,
        num_outputs: 1,
      };

      // Add model-specific parameters
      if (modelConfig.type === 'flux') {
        // Different FLUX models have different parameter requirements
        if (this.modelName === 'FLUX Schnell' || this.modelName === 'Sticker Maker') {
          input = {
            ...input,
            width,
            height,
            num_inference_steps: 4, // FLUX Schnell max is 4
            output_format: "webp",
            output_quality: params.quality === 'hd' ? 95 : 80,
          };
          
          // Add sticker-specific prompt enhancement
          if (this.modelName === 'Sticker Maker') {
            input.prompt = `${params.prompt}, sticker style, cartoon style, flat colors, transparent background, clean vector art, simple design, vibrant colors, high contrast`;
          }
        } else {
          input = {
            ...input,
            width,
            height,
            num_inference_steps: params.quality === 'hd' ? 50 : 28,
            guidance_scale: 7.5,
            output_format: "webp",
            output_quality: params.quality === 'hd' ? 95 : 80,
          };
        }
      } else if (modelConfig.type === 'imagen') {
        input = {
          prompt: params.prompt,
          aspect_ratio: this.getAspectRatio(params.size),
          safety_filter_level: 'block_only_high',
          output_format: 'jpg',
        };

      } else if (modelConfig.type === 'minimax') {
        input = {
          ...input,
          width,
          height,
          guidance_scale: 7.5,
          num_inference_steps: params.quality === 'hd' ? 50 : 30,
        };
      } else if (modelConfig.type === 'photon') {
        input = {
          ...input,
          width,
          height,
          num_inference_steps: params.quality === 'hd' ? 50 : 28,
          guidance_scale: 3.5,
        };
      } else if (modelConfig.type === 'nsfw') {
        input = {
          ...input,
          width,
          height,
          num_inference_steps: params.quality === 'hd' ? 50 : 28,
          guidance_scale: 7.5,
          output_format: "webp",
          output_quality: params.quality === 'hd' ? 95 : 80,
        };
      } else if (modelConfig.type === 'stable-diffusion') {
        // Check if this is an image-to-image request
        if ((params as any).referenceImage) {
          // For Stable Diffusion Img2Img, we need to pass the image
          input = {
            image: (params as any).referenceImage, // The base64 image data
            prompt: params.prompt,
            width,
            height,
            num_inference_steps: params.quality === 'hd' ? 50 : 20,
            guidance_scale: 7.5,
            prompt_strength: 0.8, // How much to follow the prompt vs the image
          };
        } else {
          // Regular text-to-image generation
          input = {
            ...input,
            width,
            height,
            num_inference_steps: params.quality === 'hd' ? 50 : 20,
            guidance_scale: 7.5,
          };
        }
      }

      const output = await this.replicate.run(modelConfig.id as any, {
        input,
      });

      console.log("Replicate response type:", typeof output);
      console.log("Replicate response constructor:", output?.constructor?.name);
      console.log("Condition check - ReadableStream?", (output as any).constructor?.name === 'ReadableStream');
      console.log("Condition check - FileOutput?", (output as any).constructor?.name === 'FileOutput');
      
      // Handle different response formats
      let imageUrl: string;
      if (Array.isArray(output)) {
        if (output.length === 0 || !output[0]) {
          throw new Error("No image generated from Replicate");
        }
        imageUrl = output[0] as string;
      } else if (typeof output === 'string') {
        imageUrl = output;
      } else if (output && typeof output === 'object') {
        // Check if it's a ReadableStream or FileOutput (Google Imagen-4 returns this)
        if ((output as any).constructor?.name === 'ReadableStream' || 
            (output as any).constructor?.name === 'FileOutput') {
          console.log("Detected FileOutput/ReadableStream response from Google Imagen, converting to buffer");
          
          // Convert ReadableStream to Buffer
          const reader = (output as any).getReader();
          const chunks: Uint8Array[] = [];
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
            }
            
            // Combine all chunks into a single buffer
            const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
            const imageBuffer = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of chunks) {
              imageBuffer.set(chunk, offset);
              offset += chunk.length;
            }
            
            console.log("ReadableStream converted to buffer, size:", imageBuffer.length);
            
            // For now, we'll create a data URL as the "imageUrl" 
            // The storage service can handle this appropriately
            const base64Data = Buffer.from(imageBuffer).toString('base64');
            imageUrl = `data:image/png;base64,${base64Data}`;
            
          } catch (error) {
            console.error("Error reading ReadableStream:", error);
            throw new Error("Failed to read image data from ReadableStream");
          } finally {
            reader.releaseLock();
          }
        } else {
          // Handle object responses that might have image URLs in different properties
          const possibleKeys = ['url', 'image', 'image_url', 'output', 'data', 'href'];
          let foundUrl = null;
          
          for (const key of possibleKeys) {
            if ((output as any)[key]) {
              if (typeof (output as any)[key] === 'string') {
                foundUrl = (output as any)[key];
                break;
              } else if (Array.isArray((output as any)[key]) && (output as any)[key].length > 0) {
                foundUrl = (output as any)[key][0];
                break;
              }
            }
          }
          
          if (foundUrl) {
            imageUrl = foundUrl;
          } else {
            console.error("Could not find image URL in response object:", output);
            console.error("Available keys:", Object.keys(output));
            throw new Error("No image URL found in Replicate response");
          }
        }
      } else {
        console.error("Unexpected response format:", typeof output, output);
        throw new Error("Unexpected response format from Replicate");
      }
      
      return {
        imageUrl,
        revisedPrompt: params.prompt,
        metadata: {
          model: modelConfig.id,
          type: modelConfig.type,
          width,
          height,
          ...input,
        },
      };
    } catch (error) {
      console.error("Replicate AI API error:", error);
      throw new Error(`Failed to generate image with Replicate: ${error.message}`);
    }
  }

  private getModelConfig(modelName?: string): { id: string; type: string } {
    switch (modelName) {
      // FLUX Models
      case 'FLUX.1.1 Pro':
        return { id: 'black-forest-labs/flux-1.1-pro', type: 'flux' };
      case 'FLUX.1 Dev':
        return { id: 'black-forest-labs/flux-dev', type: 'flux' };
      case 'FLUX Schnell':
        return { id: 'black-forest-labs/flux-schnell', type: 'flux' };
      
      // Google Imagen Models
      case 'Google Imagen-4 Fast':
        return { id: 'google/imagen-4-fast', type: 'imagen' };
      case 'Google Imagen-4':
        return { id: 'google/imagen-4', type: 'imagen' };
      
      // Specialized Models
      case 'Sticker Maker':
        return { id: 'black-forest-labs/flux-schnell', type: 'flux' };
      case 'Minimax Image-01':
        return { id: 'minimax/image-01', type: 'minimax' };
      case 'Luma Photon':
        return { id: 'luma/photon', type: 'photon' };
      
      // NSFW Models
      case 'WAI NSFW Illustrious':
        return { id: 'aisha-ai-official/wai-nsfw-illustrious-v12:0fc0fa9885b284901a6f9c0b4d67701fd7647d157b88371427d63f8089ce140e', type: 'nsfw' };
      case 'NSFW FLUX Dev':
        return { id: 'aisha-ai-official/nsfw-flux-dev:fb4f086702d6a301ca32c170d926239324a7b7b2f0afc3d232a9c4be382dc3fa', type: 'nsfw' };
      
      // Stable Diffusion
      case 'Stable Diffusion Img2Img':
        // Using the actual Replicate model ID for Stable Diffusion img2img
        return { id: 'stability-ai/stable-diffusion:db21e45d3f7023abc2a46ee38a23973f6dce16bb082a930b0c49861f96d1e5bf', type: 'stable-diffusion' };
      
      default:
        return { id: 'black-forest-labs/flux-schnell', type: 'flux' }; // Default to fastest model
    }
  }

  private getAspectRatio(size?: string): string {
    switch (size) {
      case "1792x1024":
        return "16:9";
      case "1024x1792":
        return "9:16";
      case "1024x1024":
        return "1:1";
      default:
        return "1:1";
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
    
    case 'replicate':
    case 'flux':
      return new ReplicateAIService(apiKeyRecord.keyValue, model.name);
    
    default:
      throw new Error(`Unsupported AI provider: ${model.provider}`);
  }
}