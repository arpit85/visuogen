import { createReadStream, createWriteStream } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import fetch from 'node-fetch';

export interface ClipDropEditParams {
  imageUrl: string;
  operation: 'cleanup' | 'remove-background' | 'upscale' | 'text-inpainting' | 'reimagine';
  maskUrl?: string;
  textPrompt?: string;
  targetWidth?: number;
  targetHeight?: number;
  mode?: 'fast' | 'quality';
}

export interface ClipDropResult {
  imageUrl: string;
  metadata: {
    operation: string;
    creditsConsumed: number;
    remainingCredits: number;
    processedAt: string;
    [key: string]: any;
  };
}

export class ClipDropService {
  private apiKey: string;
  private baseUrl = 'https://clipdrop-api.co';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async cleanup(imageUrl: string, maskUrl: string, mode: 'fast' | 'quality' = 'fast'): Promise<ClipDropResult> {
    try {
      // Download image and mask files
      const imageBuffer = await this.downloadImage(imageUrl);
      const maskBuffer = await this.downloadImage(maskUrl);

      // Create temporary files for multipart form data
      const imagePath = join(tmpdir(), `clipdrop_image_${Date.now()}.jpg`);
      const maskPath = join(tmpdir(), `clipdrop_mask_${Date.now()}.png`);

      await writeFile(imagePath, imageBuffer);
      await writeFile(maskPath, maskBuffer);

      // Create manual multipart form data
      const boundary = '----clipdrop' + Math.random().toString(36).substr(2, 9);
      const CRLF = '\r\n';
      
      let formData = '';
      formData += `--${boundary}${CRLF}`;
      formData += `Content-Disposition: form-data; name="image_file"; filename="image.jpg"${CRLF}`;
      formData += `Content-Type: image/jpeg${CRLF}${CRLF}`;
      const imageDataPart = formData;
      
      formData = '';
      formData += `${CRLF}--${boundary}${CRLF}`;
      formData += `Content-Disposition: form-data; name="mask_file"; filename="mask.png"${CRLF}`;
      formData += `Content-Type: image/png${CRLF}${CRLF}`;
      const maskDataPart = formData;
      
      formData = '';
      formData += `${CRLF}--${boundary}${CRLF}`;
      formData += `Content-Disposition: form-data; name="mode"${CRLF}${CRLF}`;
      formData += `${mode}${CRLF}`;
      formData += `--${boundary}--${CRLF}`;
      const modeDataPart = formData;

      // Combine all parts
      const combinedBuffer = Buffer.concat([
        Buffer.from(imageDataPart),
        imageBuffer,
        Buffer.from(maskDataPart),
        maskBuffer,
        Buffer.from(modeDataPart)
      ]);

      const response = await fetch(`${this.baseUrl}/cleanup/v1`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: combinedBuffer,
      });

      // Clean up temporary files
      await Promise.all([
        unlink(imagePath).catch(() => {}),
        unlink(maskPath).catch(() => {}),
      ]);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Clipdrop cleanup failed: ${errorData.error || response.statusText}`);
      }

      const resultBuffer = await response.arrayBuffer();
      const resultImageUrl = await this.uploadProcessedImage(Buffer.from(resultBuffer), 'cleanup');

      return {
        imageUrl: resultImageUrl,
        metadata: {
          operation: 'cleanup',
          mode,
          creditsConsumed: parseInt(response.headers.get('x-credits-consumed') || '1'),
          remainingCredits: parseInt(response.headers.get('x-remaining-credits') || '0'),
          processedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Clipdrop cleanup error:', error);
      throw new Error(`Failed to cleanup image: ${error.message}`);
    }
  }

  async removeBackground(imageUrl: string): Promise<ClipDropResult> {
    try {
      // Download image file
      const imageBuffer = await this.downloadImage(imageUrl);

      // Create manual multipart form data
      const boundary = '----clipdrop' + Math.random().toString(36).substr(2, 9);
      const CRLF = '\r\n';
      
      let formData = '';
      formData += `--${boundary}${CRLF}`;
      formData += `Content-Disposition: form-data; name="image_file"; filename="image.jpg"${CRLF}`;
      formData += `Content-Type: image/jpeg${CRLF}${CRLF}`;
      const imageDataPart = formData;
      
      formData = '';
      formData += `${CRLF}--${boundary}--${CRLF}`;
      const endDataPart = formData;

      // Combine all parts
      const combinedBuffer = Buffer.concat([
        Buffer.from(imageDataPart),
        imageBuffer,
        Buffer.from(endDataPart)
      ]);

      const response = await fetch(`${this.baseUrl}/remove-background/v1`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'accept': 'image/png',
        },
        body: combinedBuffer,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Clipdrop background removal failed: ${errorData.error || response.statusText}`);
      }

      const resultBuffer = await response.arrayBuffer();
      const resultImageUrl = await this.uploadProcessedImage(Buffer.from(resultBuffer), 'remove-background');

      return {
        imageUrl: resultImageUrl,
        metadata: {
          operation: 'remove-background',
          format: 'png',
          creditsConsumed: parseInt(response.headers.get('x-credits-consumed') || '1'),
          remainingCredits: parseInt(response.headers.get('x-remaining-credits') || '0'),
          processedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Clipdrop background removal error:', error);
      throw new Error(`Failed to remove background: ${error.message}`);
    }
  }

  async upscaleImage(imageUrl: string, targetWidth: number, targetHeight: number): Promise<ClipDropResult> {
    try {
      // Download image file
      const imageBuffer = await this.downloadImage(imageUrl);

      // Create manual multipart form data
      const boundary = '----clipdrop' + Math.random().toString(36).substr(2, 9);
      const CRLF = '\r\n';
      
      let formData = '';
      formData += `--${boundary}${CRLF}`;
      formData += `Content-Disposition: form-data; name="image_file"; filename="image.jpg"${CRLF}`;
      formData += `Content-Type: image/jpeg${CRLF}${CRLF}`;
      const imageDataPart = formData;
      
      formData = '';
      formData += `${CRLF}--${boundary}${CRLF}`;
      formData += `Content-Disposition: form-data; name="target_width"${CRLF}${CRLF}`;
      formData += `${targetWidth.toString()}${CRLF}`;
      formData += `--${boundary}${CRLF}`;
      formData += `Content-Disposition: form-data; name="target_height"${CRLF}${CRLF}`;
      formData += `${targetHeight.toString()}${CRLF}`;
      formData += `--${boundary}--${CRLF}`;
      const paramsDataPart = formData;

      // Combine all parts
      const combinedBuffer = Buffer.concat([
        Buffer.from(imageDataPart),
        imageBuffer,
        Buffer.from(paramsDataPart)
      ]);

      const response = await fetch(`${this.baseUrl}/image-upscaling/v1/upscale`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: combinedBuffer,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Clipdrop upscaling failed: ${errorData.error || response.statusText}`);
      }

      const resultBuffer = await response.arrayBuffer();
      const resultImageUrl = await this.uploadProcessedImage(Buffer.from(resultBuffer), 'upscale');

      return {
        imageUrl: resultImageUrl,
        metadata: {
          operation: 'upscale',
          targetWidth,
          targetHeight,
          creditsConsumed: parseInt(response.headers.get('x-credits-consumed') || '1'),
          remainingCredits: parseInt(response.headers.get('x-remaining-credits') || '0'),
          processedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Clipdrop upscaling error:', error);
      throw new Error(`Failed to upscale image: ${error.message}`);
    }
  }

  async textInpainting(imageUrl: string, maskUrl: string, textPrompt: string): Promise<ClipDropResult> {
    try {
      // Download image and mask files
      const imageBuffer = await this.downloadImage(imageUrl);
      const maskBuffer = await this.downloadImage(maskUrl);

      // Create manual multipart form data
      const boundary = '----clipdrop' + Math.random().toString(36).substr(2, 9);
      const CRLF = '\r\n';
      
      let formData = '';
      formData += `--${boundary}${CRLF}`;
      formData += `Content-Disposition: form-data; name="image_file"; filename="image.jpg"${CRLF}`;
      formData += `Content-Type: image/jpeg${CRLF}${CRLF}`;
      const imageDataPart = formData;
      
      formData = '';
      formData += `${CRLF}--${boundary}${CRLF}`;
      formData += `Content-Disposition: form-data; name="mask_file"; filename="mask.png"${CRLF}`;
      formData += `Content-Type: image/png${CRLF}${CRLF}`;
      const maskDataPart = formData;
      
      formData = '';
      formData += `${CRLF}--${boundary}${CRLF}`;
      formData += `Content-Disposition: form-data; name="text_prompt"${CRLF}${CRLF}`;
      formData += `${textPrompt}${CRLF}`;
      formData += `--${boundary}--${CRLF}`;
      const promptDataPart = formData;

      // Combine all parts
      const combinedBuffer = Buffer.concat([
        Buffer.from(imageDataPart),
        imageBuffer,
        Buffer.from(maskDataPart),
        maskBuffer,
        Buffer.from(promptDataPart)
      ]);

      const response = await fetch(`${this.baseUrl}/text-inpainting/v1`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: combinedBuffer,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Clipdrop text inpainting failed: ${errorData.error || response.statusText}`);
      }

      const resultBuffer = await response.arrayBuffer();
      const resultImageUrl = await this.uploadProcessedImage(Buffer.from(resultBuffer), 'text-inpainting');

      return {
        imageUrl: resultImageUrl,
        metadata: {
          operation: 'text-inpainting',
          textPrompt,
          creditsConsumed: parseInt(response.headers.get('x-credits-consumed') || '1'),
          remainingCredits: parseInt(response.headers.get('x-remaining-credits') || '0'),
          processedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Clipdrop text inpainting error:', error);
      throw new Error(`Failed to perform text inpainting: ${error.message}`);
    }
  }

  async reimagine(imageUrl: string): Promise<ClipDropResult> {
    try {
      // Download image file
      const imageBuffer = await this.downloadImage(imageUrl);

      // Create manual multipart form data
      const boundary = '----clipdrop' + Math.random().toString(36).substr(2, 9);
      const CRLF = '\r\n';
      
      let formData = '';
      formData += `--${boundary}${CRLF}`;
      formData += `Content-Disposition: form-data; name="image_file"; filename="image.jpg"${CRLF}`;
      formData += `Content-Type: image/jpeg${CRLF}${CRLF}`;
      const imageDataPart = formData;
      
      formData = '';
      formData += `${CRLF}--${boundary}--${CRLF}`;
      const endDataPart = formData;

      // Combine all parts
      const combinedBuffer = Buffer.concat([
        Buffer.from(imageDataPart),
        imageBuffer,
        Buffer.from(endDataPart)
      ]);

      const response = await fetch(`${this.baseUrl}/reimagine/v1/reimagine`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: combinedBuffer,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Clipdrop reimagine failed: ${errorData.error || response.statusText}`);
      }

      const resultBuffer = await response.arrayBuffer();
      const resultImageUrl = await this.uploadProcessedImage(Buffer.from(resultBuffer), 'reimagine');

      return {
        imageUrl: resultImageUrl,
        metadata: {
          operation: 'reimagine',
          creditsConsumed: parseInt(response.headers.get('x-credits-consumed') || '1'),
          remainingCredits: parseInt(response.headers.get('x-remaining-credits') || '0'),
          processedAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error('Clipdrop reimagine error:', error);
      throw new Error(`Failed to reimagine image: ${error.message}`);
    }
  }

  private async downloadImage(url: string): Promise<Buffer> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to download image: ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private async uploadProcessedImage(buffer: Buffer, operation: string): Promise<string> {
    // Use the same upload logic as the main application
    const { uploadImage } = await import('./storage');
    
    // Create a temporary file for upload
    const tempPath = join(tmpdir(), `processed_${operation}_${Date.now()}.jpg`);
    await writeFile(tempPath, buffer);
    
    try {
      const filename = `edited_${operation}_${Date.now()}.jpg`;
      const imageUrl = await uploadImage(tempPath, filename);
      
      // Clean up temporary file
      await unlink(tempPath).catch(() => {});
      
      return imageUrl;
    } catch (error) {
      // Clean up temporary file on error
      await unlink(tempPath).catch(() => {});
      throw error;
    }
  }
}

// Export a singleton instance
export const clipDropService = new ClipDropService(process.env.CLIPDROP_API_KEY || '');