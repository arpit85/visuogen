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
          creditCost: 5,
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
          creditCost: 3,
          maxDuration: 10,
          maxResolution: "1080p",
          averageGenerationTime: 60,
        },
      ],
      [
        "veo-2",
        {
          id: "google/veo-2",
          name: "Google Veo 2",
          description: "Google's advanced video generation model with enhanced realism and quality",
          creditCost: 4,
          maxDuration: 8,
          maxResolution: "1080p",
          averageGenerationTime: 75,
        },
      ],
      [
        "kling-v2.1",
        {
          id: "kwaivgi/kling-v2.1-master",
          name: "Kling AI v2.1",
          description: "Advanced AI video generation with superb dynamics and high prompt adherence",
          creditCost: 3,
          maxDuration: 10,
          maxResolution: "1080p",
          averageGenerationTime: 75,
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
    const defaultModel = "veo-2";
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
        break;

      case "Hailuo 02":
        input.duration = Math.min(params.duration || 6, model.maxDuration);
        // Hailuo-02 only supports 768p and 1080p
        input.resolution = (params.resolution === "1080p" || params.resolution === "720p") ? "1080p" : "768p";
        if (params.aspectRatio) input.aspect_ratio = params.aspectRatio;
        if (params.seed) input.seed = params.seed;
        break;

      case "Google Veo 2":
        input.duration = Math.min(params.duration || 8, model.maxDuration);
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

    let videoUrl: string;
    let thumbnailUrl: string | undefined;

    // Handle different output formats from Replicate
    if (typeof output === 'string') {
      // Direct URL
      videoUrl = output;
    } else if (Array.isArray(output)) {
      // Array of URLs, take the first one as video
      videoUrl = output[0];
      if (output.length > 1) {
        thumbnailUrl = output[1];
      }
    } else if (output && typeof output === 'object') {
      // Object with video/thumbnail properties
      videoUrl = output.video || output.url || output.mp4;
      thumbnailUrl = output.thumbnail || output.preview;
    } else {
      throw new Error('Invalid video output format from Replicate');
    }

    if (!videoUrl) {
      throw new Error('No video URL in response');
    }

    // Skip metadata retrieval if videoUrl is invalid
    let metadata = {};
    if (videoUrl && typeof videoUrl === 'string' && videoUrl.startsWith('http')) {
      try {
        metadata = await this.getVideoMetadata(videoUrl);
      } catch (error) {
        console.error('Error getting video metadata, using defaults:', error);
        metadata = {};
      }
    }

    return {
      videoUrl,
      thumbnailUrl,
      duration: metadata.duration || model.maxDuration,
      resolution: metadata.resolution || "1080p",
      fileSize: metadata.fileSize,
      metadata: {
        model: model.name,
        modelId: model.id,
        generatedAt: new Date().toISOString(),
        ...metadata,
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
    // Handle different model name formats
    const normalizedName = modelName.toLowerCase();
    
    for (const [key, model] of this.models.entries()) {
      if (key === normalizedName || 
          model.name.toLowerCase().includes(normalizedName) ||
          normalizedName.includes(key)) {
        return model;
      }
    }
    
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