import fetch from 'node-fetch';

export interface ModelsLabTrainingParams {
  instancePrompt: string;
  classPrompt: string;
  baseModelType: 'normal' | 'sdxl';
  trainingType: 'men' | 'women' | 'couple' | 'null';
  loraType: 'lora' | 'lycoris';
  negativePrompt?: string;
  images: string[]; // Array of image URLs
  maxTrainSteps: number;
  webhook?: string;
}

export interface ModelsLabTrainingResponse {
  status: 'success' | 'error';
  message?: string;
  data?: string;
  training_id?: string;
}

export interface ModelsLabTrainingStatus {
  status: string;
  training_status: string;
  logs: string;
  model_id?: string;
}

export interface ModelsLabGenerationParams {
  prompt: string;
  model_id: string;
  width?: number;
  height?: number;
  num_inference_steps?: number;
  guidance_scale?: number;
  negative_prompt?: string;
  seed?: number;
}

export interface ModelsLabGenerationResponse {
  status: 'success' | 'error';
  message?: string;
  output?: string[];
  meta?: {
    model_id: string;
    prompt: string;
    negative_prompt: string;
    width: number;
    height: number;
    seed: number;
    guidance_scale: number;
    num_inference_steps: number;
  };
}

export class ModelsLabService {
  private apiKey: string;
  private baseUrl = 'https://modelslab.com/api/v3';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.MODELSLAB_API_KEY || '';
    if (!this.apiKey) {
      console.warn('ModelsLab API key not configured');
    }
  }

  /**
   * Start LoRA fine-tuning training
   */
  async startTraining(params: ModelsLabTrainingParams): Promise<ModelsLabTrainingResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/lora_fine_tune`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: this.apiKey,
          instance_prompt: params.instancePrompt,
          class_prompt: params.classPrompt,
          base_model_type: params.baseModelType,
          training_type: params.trainingType,
          lora_type: params.loraType,
          negative_prompt: params.negativePrompt || 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
          images: params.images,
          max_train_steps: params.maxTrainSteps.toString(),
          seed: '0',
          webhook: params.webhook || null,
        }),
      });

      const result = await response.json() as ModelsLabTrainingResponse;
      
      if (!response.ok) {
        throw new Error(`ModelsLab API error: ${result.message || 'Unknown error'}`);
      }

      return result;
    } catch (error) {
      console.error('ModelsLab training error:', error);
      throw new Error(`Failed to start training: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Check training status
   */
  async getTrainingStatus(trainingId: string): Promise<ModelsLabTrainingStatus> {
    try {
      const response = await fetch(`${this.baseUrl}/lora_fine_tune_status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: this.apiKey,
          training_id: trainingId,
        }),
      });

      const result = await response.json() as ModelsLabTrainingStatus;
      
      if (!response.ok) {
        throw new Error(`ModelsLab API error: ${response.statusText}`);
      }

      return result;
    } catch (error) {
      console.error('ModelsLab status check error:', error);
      throw new Error(`Failed to check training status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate image using trained LoRA model
   */
  async generateWithLoraModel(params: ModelsLabGenerationParams): Promise<ModelsLabGenerationResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/text2img`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          key: this.apiKey,
          model_id: params.model_id,
          prompt: params.prompt,
          negative_prompt: params.negative_prompt || 'lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, username, blurry',
          width: params.width || 512,
          height: params.height || 512,
          samples: 1,
          num_inference_steps: params.num_inference_steps || 20,
          guidance_scale: params.guidance_scale || 7.5,
          safety_checker: 'yes',
          enhance_prompt: 'yes',
          seed: params.seed || null,
          webhook: null,
          track_id: null,
        }),
      });

      const result = await response.json() as ModelsLabGenerationResponse;
      
      if (!response.ok) {
        throw new Error(`ModelsLab API error: ${result.message || 'Unknown error'}`);
      }

      return result;
    } catch (error) {
      console.error('ModelsLab generation error:', error);
      throw new Error(`Failed to generate image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Upload image to a publicly accessible URL (helper method)
   * In production, you would upload to your cloud storage and return the URL
   */
  async uploadImageForTraining(imageBuffer: Buffer, filename: string): Promise<string> {
    // This is a placeholder - you'll need to implement actual upload to your storage
    // For now, we'll assume images are already uploaded to cloud storage
    throw new Error('Image upload for training needs to be implemented with your cloud storage provider');
  }

  /**
   * Validate training parameters
   */
  validateTrainingParams(params: ModelsLabTrainingParams): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!params.instancePrompt || params.instancePrompt.trim().length === 0) {
      errors.push('Instance prompt is required');
    }

    if (!params.classPrompt || params.classPrompt.trim().length === 0) {
      errors.push('Class prompt is required');
    }

    if (!['normal', 'sdxl'].includes(params.baseModelType)) {
      errors.push('Base model type must be "normal" or "sdxl"');
    }

    if (!['men', 'women', 'couple', 'null'].includes(params.trainingType)) {
      errors.push('Training type must be "men", "women", "couple", or "null"');
    }

    if (!['lora', 'lycoris'].includes(params.loraType)) {
      errors.push('LoRA type must be "lora" or "lycoris"');
    }

    if (!params.images || params.images.length === 0) {
      errors.push('At least one training image is required');
    }

    if (params.images && params.images.length > 15) {
      errors.push('Maximum 15 training images allowed');
    }

    if (params.maxTrainSteps < 10 || params.maxTrainSteps > 50) {
      errors.push('Max train steps must be between 10 and 50');
    }

    // Validate image URLs
    if (params.images) {
      params.images.forEach((url, index) => {
        try {
          new URL(url);
        } catch {
          errors.push(`Invalid image URL at position ${index + 1}`);
        }
      });
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get recommended training steps based on number of images
   */
  getRecommendedTrainingSteps(imageCount: number): number {
    return Math.max(10, Math.min(50, imageCount * 2));
  }

  /**
   * Wrapper method for the routes - converts simple params to ModelsLab format
   */
  async startTrainingWrapper(params: {
    modelName: string;
    baseModel: string;
    trainingType?: string;
    triggerWord?: string;
    imageUrls: string[];
    jobId: number;
  }): Promise<ModelsLabTrainingResponse> {
    if (!this.apiKey) {
      throw new Error('ModelsLab API key not configured');
    }

    // Convert to ModelsLab format
    const trainingParams: ModelsLabTrainingParams = {
      instancePrompt: params.triggerWord || params.modelName,
      classPrompt: 'a photo',
      baseModelType: params.baseModel.includes('sdxl') ? 'sdxl' : 'normal',
      trainingType: (params.trainingType as any) || 'null',
      loraType: 'lora',
      images: params.imageUrls,
      maxTrainSteps: this.getRecommendedTrainingSteps(params.imageUrls.length),
    };

    return this.startTraining(trainingParams);
  }

  /**
   * Wrapper method for generation with LoRA
   */
  async generateWithLoRA(params: {
    modelId: string;
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
    steps?: number;
    guidanceScale?: number;
  }): Promise<{ imageUrl: string }> {
    if (!this.apiKey) {
      throw new Error('ModelsLab API key not configured');
    }

    const generationParams: ModelsLabGenerationParams = {
      model_id: params.modelId,
      prompt: params.prompt,
      negative_prompt: params.negativePrompt,
      width: params.width || 512,
      height: params.height || 512,
      num_inference_steps: params.steps || 20,
      guidance_scale: params.guidanceScale || 7.5,
    };

    const result = await this.generateWithLoraModel(generationParams);
    
    if (result.status === 'error') {
      throw new Error(result.message || 'Generation failed');
    }

    if (!result.output || result.output.length === 0) {
      throw new Error('No image generated');
    }

    return { imageUrl: result.output[0] };
  }
}

// Create and export service instance
const modelsLabService = new ModelsLabService();
export default modelsLabService;