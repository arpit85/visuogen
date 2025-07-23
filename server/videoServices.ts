import Replicate from "replicate";
import { InsertVideo, Video } from "@shared/schema";

export interface VideoGenerationParams {
  prompt: string;
  duration?: number;
  resolution?: string;
  aspectRatio?: string;
  fps?: number;
  seed?: number;
  guidanceScale?: number;
  modelName?: string;
  image?: string; // Base64 encoded image for image-to-video generation
}

export interface GeneratedVideoResult {
  videoUrl: string;
  thumbnailUrl?: string;
  duration?: number;
  resolution?: string;
  fileSize?: number;
  metadata?: any;
}

export interface VideoModel {
  id: string;
  name: string;
  description: string;
  creditCost: number;
  maxDuration: number;
  maxResolution: string;
  averageGenerationTime: number;
}

export class ReplicateVideoService {
  private replicate: Replicate;
  private models: Map<string, VideoModel>;

  constructor(apiKey: string) {
    this.replicate = new Replicate({ auth: apiKey });
    this.initializeModels();
  }

  private initializeModels() {
    this.models = new Map([
      [
        "seedance-1-pro",
        {
          id: "bytedance/seedance-1-pro",
          name: "Seedance 1.0 Pro",
          description: "ByteDance's premium video generation model with cinematic quality up to 41 seconds",
          creditCost: 20,
          maxDuration: 41,
          maxResolution: "1080p",
          averageGenerationTime: 120,
        },
      ],
      [
        "hailuo-02",
        {
          id: "minimax/hailuo-02",
          name: "Hailuo 02",
          description: "MiniMax's advanced video model with director-level camera controls",
          creditCost: 20,
          maxDuration: 10,
          maxResolution: "1080p",
          averageGenerationTime: 60,
        },
      ],

      [
        "kling-v2.1",
        {
          id: "kwaivgi/kling-v2.1-master",
          name: "Kling AI v2.1",
          description: "Advanced AI video generation with superb dynamics and high prompt adherence",
          creditCost: 20,
          maxDuration: 10,
          maxResolution: "1080p",
          averageGenerationTime: 75,
        },
      ],
      [
        "veo-3",
        {
          id: "google/veo-3",
          name: "Google Veo 3",
          description: "Google's latest video generation model with enhanced quality and longer duration support",
          creditCost: 20,
          maxDuration: 10,
          maxResolution: "1080p",
          averageGenerationTime: 90,
        },
      ],
    ]);
  }

  async generateVideo(params: VideoGenerationParams): Promise<GeneratedVideoResult> {
    try {
      const modelConfig = this.getModelConfig(params.modelName);
      if (!modelConfig) {
        throw new Error(`Unknown video model: ${params.modelName}`);
      }

      console.log(`Starting video generation with ${modelConfig.name}...`);
      console.log('Parameters:', params);

      const input = this.buildModelInput(params, modelConfig);
      
      const output = await this.replicate.run(modelConfig.id as any, { input });
      
      console.log('Replicate video generation output:', output);
      
      return this.processVideoOutput(output, modelConfig);
    } catch (error) {
      console.error('Video generation error:', error);
      throw new Error(`Failed to generate video: ${error.message}`);
    }
  }

  private getModelConfig(modelName?: string): VideoModel | null {
    const defaultModel = "veo-3";
    const model = modelName ? this.models.get(modelName) : this.models.get(defaultModel);
    return model || null;
  }

  private buildModelInput(params: VideoGenerationParams, model: VideoModel): Record<string, any> {
    const input: Record<string, any> = {
      prompt: params.prompt,
    };

    // Model-specific parameter mapping
    switch (model.name) {
      case "Seedance 1.0 Pro":
        // Seedance only accepts duration 5 or 10
        input.duration = params.duration <= 5 ? 5 : 10;
        // Seedance only accepts 480p or 1080p
        input.resolution = params.resolution === "480p" ? "480p" : "1080p";
        if (params.seed) input.seed = params.seed;
        // Add image support for image-to-video generation
        if (params.image) {
          input.image = params.image;
        }
        break;

      case "Hailuo 02":
        input.duration = Math.min(params.duration || 6, model.maxDuration);
        // Hailuo-02 only supports 768p and 1080p
        input.resolution = (params.resolution === "1080p" || params.resolution === "720p") ? "1080p" : "768p";
        if (params.aspectRatio) input.aspect_ratio = params.aspectRatio;
        if (params.seed) input.seed = params.seed;
        break;



      case "Google Veo 3":
        input.duration = Math.min(params.duration || 10, model.maxDuration);
        input.resolution = params.resolution || "1080p";
        input.aspect_ratio = params.aspectRatio || "16:9";
        if (params.guidanceScale) input.guidance_scale = params.guidanceScale;
        break;

      case "Kling AI v2.1":
        input.duration = Math.min(params.duration || 5, model.maxDuration);
        input.resolution = params.resolution || "720p";
        input.aspect_ratio = params.aspectRatio || "16:9";
        if (params.fps) input.fps = params.fps;
        break;

      default:
        // Default parameters
        input.duration = params.duration || 6;
        input.resolution = params.resolution || "720p";
        break;
    }

    return input;
  }

  private async processVideoOutput(output: any, model: VideoModel): Promise<GeneratedVideoResult> {
    console.log('Processing video output:', output);
    console.log('Output type:', typeof output);
    console.log('Output constructor:', output?.constructor?.name);

    let videoUrl: string;
    let thumbnailUrl: string | undefined;

    // Handle ReadableStream from Replicate (new format)
    if (output && typeof output === 'object' && output.constructor.name === 'ReadableStream') {
      console.log('ReadableStream detected, converting to buffer...');
      
      // Convert ReadableStream to buffer
      const reader = output.getReader();
      const chunks: Uint8Array[] = [];
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      
      const buffer = Buffer.concat(chunks);
      const text = buffer.toString('utf-8');
      
      try {
        // Try to parse as JSON (might contain the actual URL)
        const parsed = JSON.parse(text);
        videoUrl = parsed.url || parsed.video || parsed.output;
        console.log('Parsed video URL from ReadableStream:', videoUrl);
      } catch {
        // If not JSON, treat as direct URL
        videoUrl = text.trim();
        console.log('Direct URL from ReadableStream:', videoUrl);
      }
    }
    // Handle different output formats from Replicate
    else if (typeof output === 'string') {
      // Direct URL - this is the most common case for video models
      videoUrl = output;
      console.log('Direct URL output:', videoUrl);
    } else if (Array.isArray(output)) {
      // Array of URLs, take the first one as video
      videoUrl = output[0];
      if (output.length > 1) {
        thumbnailUrl = output[1];
      }
      console.log('Array output - video:', videoUrl, 'thumbnail:', thumbnailUrl);
    } else if (output && typeof output === 'object') {
      // Object with video/thumbnail properties
      console.log('Object output detected, keys:', Object.keys(output));
      
      if (typeof output.url === 'function') {
        // Handle URL function objects from Replicate
        try {
          videoUrl = await output.url();
          console.log('Function URL output:', videoUrl);
        } catch (error) {
          console.error('Error calling URL function:', error);
          throw new Error('Failed to get video URL from function');
        }
      } else {
        videoUrl = output.video || output.url || output.mp4 || output.output;
        thumbnailUrl = output.thumbnail || output.preview;
        console.log('Object output - video:', videoUrl, 'thumbnail:', thumbnailUrl);
      }
    } else {
      console.error('Invalid output format:', output);
      console.error('Output details:', {
        type: typeof output,
        isArray: Array.isArray(output),
        constructor: output?.constructor?.name,
        stringValue: String(output)
      });
      throw new Error('Invalid video output format from Replicate');
    }

    if (!videoUrl) {
      console.error('No video URL found in output');
      throw new Error('No video URL in response');
    }

    // Ensure videoUrl is a string and not a function
    if (typeof videoUrl === 'function') {
      try {
        videoUrl = await videoUrl();
        console.log('Resolved function URL:', videoUrl);
      } catch (error) {
        console.error('Error resolving URL function:', error);
        throw new Error('Failed to resolve video URL');
      }
    }

    console.log('Final video URL:', videoUrl);

    // Skip metadata retrieval for now to avoid additional failures
    const metadata = {
      duration: model.maxDuration,
      resolution: "1080p",
      fileSize: undefined
    };

    console.log('Returning video result with metadata:', metadata);

    return {
      videoUrl,
      thumbnailUrl,
      duration: metadata.duration,
      resolution: metadata.resolution,
      fileSize: metadata.fileSize,
      metadata: {
        model: model.name,
        modelId: model.id,
        generatedAt: new Date().toISOString(),
        originalOutput: output,
      },
    };
  }

  private async getVideoMetadata(videoUrl: string): Promise<{
    duration?: number;
    resolution?: string;
    fileSize?: number;
  }> {
    try {
      // Get basic file information
      const response = await fetch(videoUrl, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      
      return {
        fileSize: contentLength ? parseInt(contentLength) : undefined,
        // Duration and resolution would need ffprobe or similar tool
        // For now, we'll rely on model defaults
      };
    } catch (error) {
      console.error('Error getting video metadata:', error);
      return {};
    }
  }

  getAvailableModels(): VideoModel[] {
    return Array.from(this.models.values());
  }

  getModelByName(modelName: string): VideoModel | null {
    console.log('Looking for model:', modelName);
    console.log('Available models:', Array.from(this.models.keys()));
    
    // Handle different model name formats
    const normalizedName = modelName.toLowerCase();
    
    // Define explicit mapping for frontend model names to backend keys
    const modelMapping: Record<string, string> = {
      'seedance-1-pro': 'seedance-1-pro',
      'hailuo-02': 'hailuo-02', 
      'veo-2': 'veo-2',
      'veo-3': 'veo-3',
      'kling-v2.1': 'kling-v2.1',
      'kling-v2.1-master': 'kling-v2.1',
      'bytedance/seedance-1-pro': 'seedance-1-pro',
      'minimax/hailuo-02': 'hailuo-02',
      'google/veo-2': 'veo-2',
      'google/veo-3': 'veo-3',
      'kwaivgi/kling-v2.1-master': 'kling-v2.1'
    };
    
    // First try direct mapping
    const mappedKey = modelMapping[normalizedName];
    if (mappedKey && this.models.has(mappedKey)) {
      console.log('Found mapped model:', normalizedName, '->', mappedKey);
      return this.models.get(mappedKey)!;
    }
    
    // Then try exact match with stored keys
    if (this.models.has(normalizedName)) {
      console.log('Found exact match:', normalizedName);
      return this.models.get(normalizedName)!;
    }
    
    // Then try partial matches for backwards compatibility
    for (const [key, model] of this.models.entries()) {
      console.log(`Checking key: ${key}, model name: ${model.name}`);
      if (key === normalizedName || 
          model.name.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(key) ||
          key.includes(normalizedName)) {
        console.log('Found partial match:', key, '-> model:', model.name);
        return model;
      }
    }
    
    console.log('No model found for:', modelName);
    return null;
  }
}

// Export a factory function to get the appropriate video service
export async function getVideoService(): Promise<ReplicateVideoService> {
  const replicateKey = process.env.REPLICATE_API_TOKEN;
  
  if (!replicateKey) {
    throw new Error('REPLICATE_API_TOKEN environment variable is required');
  }

  return new ReplicateVideoService(replicateKey);
}