import { createReadStream, createWriteStream } from 'fs';
import { writeFile, unlink } from 'fs/promises';
import { tmpdir } from 'os';
import { join } from 'path';
import fetch from 'node-fetch';
import { DatabaseStorage } from './storage';
import { createStorageService } from './storageService';

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
      console.log('Starting background removal for:', imageUrl);
      
      // Download image file
      const imageBuffer = await this.downloadImage(imageUrl);
      console.log('Downloaded image, size:', imageBuffer.length);

      // Create proper multipart form data
      const boundary = '----clipdrop' + Math.random().toString(36).substr(2, 9);
      const CRLF = '\r\n';
      
      // Build form data parts
      const parts = [];
      
      // Add image file part
      parts.push(`--${boundary}${CRLF}`);
      parts.push(`Content-Disposition: form-data; name="image_file"; filename="image.jpg"${CRLF}`);
      parts.push(`Content-Type: image/jpeg${CRLF}${CRLF}`);
      
      // Combine text parts into buffer
      const textParts = Buffer.from(parts.join(''));
      
      // Add ending boundary
      const endBoundary = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
      
      // Combine all parts
      const combinedBuffer = Buffer.concat([textParts, imageBuffer, endBoundary]);

      console.log('Making request to Clipdrop API...');
      const response = await fetch(`${this.baseUrl}/remove-background/v1`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: combinedBuffer,
      });

      console.log('Clipdrop API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Clipdrop API error response:', errorText);
        throw new Error(`Clipdrop background removal failed: ${response.status} - ${errorText}`);
      }

      const resultBuffer = await response.arrayBuffer();
      console.log('Received result buffer, size:', resultBuffer.byteLength);
      
      const resultImageUrl = await this.uploadProcessedImage(Buffer.from(resultBuffer), 'remove-background');
      console.log('Uploaded result image to:', resultImageUrl);

      return {
        imageUrl: resultImageUrl,
        metadata: {
          operation: 'remove-background',
          format: 'png',
          creditsConsumed: 1,
          remainingCredits: 0,
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
      console.log('Starting reimagine for:', imageUrl);
      
      // Download image file
      const imageBuffer = await this.downloadImage(imageUrl);
      console.log('Downloaded image, size:', imageBuffer.length);

      // Create proper multipart form data (using same approach as background removal)
      const boundary = '----clipdrop' + Math.random().toString(36).substr(2, 9);
      const CRLF = '\r\n';
      
      // Build form data parts
      const parts = [];
      
      // Add image file part
      parts.push(`--${boundary}${CRLF}`);
      parts.push(`Content-Disposition: form-data; name="image_file"; filename="image.jpg"${CRLF}`);
      parts.push(`Content-Type: image/jpeg${CRLF}${CRLF}`);
      
      // Combine text parts into buffer
      const textParts = Buffer.from(parts.join(''));
      
      // Add ending boundary
      const endBoundary = Buffer.from(`${CRLF}--${boundary}--${CRLF}`);
      
      // Combine all parts
      const combinedBuffer = Buffer.concat([textParts, imageBuffer, endBoundary]);

      console.log('Making request to Clipdrop Reimagine API...');
      const response = await fetch(`${this.baseUrl}/reimagine/v1/reimagine`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
        },
        body: combinedBuffer,
      });

      console.log('Clipdrop Reimagine API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Clipdrop Reimagine API error response:', errorText);
        throw new Error(`Clipdrop reimagine failed: ${response.status} - ${errorText}`);
      }

      const resultBuffer = await response.arrayBuffer();
      console.log('Received reimagine result buffer, size:', resultBuffer.byteLength);
      
      const resultImageUrl = await this.uploadProcessedImage(Buffer.from(resultBuffer), 'reimagine');
      console.log('Uploaded reimagine result image to:', resultImageUrl);

      return {
        imageUrl: resultImageUrl,
        metadata: {
          operation: 'reimagine',
          creditsConsumed: 1,
          remainingCredits: 0,
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
    try {
      // Use the same storage service as the main application
      const dbStorage = new DatabaseStorage();
      const storageService = await createStorageService(dbStorage);
      
      const filename = `clipdrop_${operation}_${Date.now()}.png`;
      const uploadResult = await storageService.uploadImageFromBuffer(buffer, filename);
      
      return uploadResult.url;
    } catch (error) {
      console.error('Error uploading processed image:', error);
      throw new Error(`Failed to upload processed image: ${error.message}`);
    }
  }
}

// Export a singleton instance
export const clipDropService = new ClipDropService(process.env.CLIPDROP_API_KEY || '');