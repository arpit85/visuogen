import AWS from 'aws-sdk';
import fetch from 'node-fetch';
import { nanoid } from 'nanoid';
import crypto from 'crypto';

export interface StorageConfig {
  wasabi?: {
    accessKeyId: string;
    secretAccessKey: string;
    bucketName: string;
    region: string;
    endpoint: string;
  };
  backblaze?: {
    applicationKeyId: string;
    applicationKey: string;
    bucketName: string;
    bucketId: string;
  };
}

export interface UploadResult {
  url: string;
  key: string;
  provider: string;
}

export class StorageService {
  private config: StorageConfig;
  private activeProvider: string;

  constructor(config: StorageConfig, activeProvider: string = 'local') {
    this.config = config;
    this.activeProvider = activeProvider;
  }

  async uploadImageFromUrl(imageUrl: string, filename?: string): Promise<UploadResult> {
    const imageFileName = filename || `generated-${nanoid()}.png`;
    
    switch (this.activeProvider) {
      case 'wasabi':
        return await this.uploadToWasabi(imageUrl, imageFileName);
      case 'backblaze':
        return await this.uploadToBackblaze(imageUrl, imageFileName);
      case 'local':
      default:
        return {
          url: imageUrl,
          key: imageFileName,
          provider: 'external'
        };
    }
  }

  private async uploadToWasabi(imageUrl: string, filename: string): Promise<UploadResult> {
    if (!this.config.wasabi) {
      throw new Error('Wasabi configuration not found');
    }

    const { accessKeyId, secretAccessKey, bucketName, region, endpoint } = this.config.wasabi;

    // Configure AWS SDK for Wasabi
    const s3 = new AWS.S3({
      accessKeyId,
      secretAccessKey,
      endpoint,
      region,
      s3ForcePathStyle: true,
    });

    try {
      // Download the image from the AI service
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const imageBuffer = await response.buffer();
      const contentType = response.headers.get('content-type') || 'image/png';

      // Upload to Wasabi
      const uploadParams = {
        Bucket: bucketName,
        Key: `images/${filename}`,
        Body: imageBuffer,
        ContentType: contentType,
        ACL: 'public-read',
      };

      const uploadResult = await s3.upload(uploadParams).promise();

      return {
        url: uploadResult.Location,
        key: uploadParams.Key,
        provider: 'wasabi'
      };
    } catch (error: any) {
      console.error('Wasabi upload error:', error);
      throw new Error(`Failed to upload to Wasabi: ${error.message || 'Unknown error'}`);
    }
  }

  private async uploadToBackblaze(imageUrl: string, filename: string): Promise<UploadResult> {
    if (!this.config.backblaze) {
      throw new Error('Backblaze configuration not found');
    }

    const { applicationKeyId, applicationKey, bucketName, bucketId } = this.config.backblaze;

    console.log('Starting Backblaze upload process:', {
      filename,
      hasApplicationKeyId: !!applicationKeyId,
      hasApplicationKey: !!applicationKey,
      bucketName,
      bucketId
    });

    try {
      // Download the image from the AI service
      console.log('Downloading image from:', imageUrl);
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Failed to download image: ${response.statusText}`);
      }

      const imageBuffer = await response.buffer();
      console.log('Image downloaded successfully, size:', imageBuffer.length, 'bytes');

      // Authorize with Backblaze B2
      console.log('Attempting Backblaze B2 authorization with applicationKeyId:', applicationKeyId ? applicationKeyId.substring(0, 8) + '...' : 'undefined');
      
      const authResponse = await fetch('https://api.backblazeb2.com/b2api/v4/b2_authorize_account', {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${applicationKeyId}:${applicationKey}`).toString('base64')}`
        }
      });

      if (!authResponse.ok) {
        const errorText = await authResponse.text();
        console.error('Backblaze authorization failed:', {
          status: authResponse.status,
          statusText: authResponse.statusText,
          error: errorText,
          applicationKeyId: applicationKeyId ? applicationKeyId.substring(0, 8) + '...' : 'undefined',
          hasApplicationKey: !!applicationKey,
          bucketId: bucketId,
          bucketName: bucketName
        });
        
        let errorMessage = `Failed to authorize with Backblaze B2: ${authResponse.status}`;
        
        try {
          const errorData = JSON.parse(errorText);
          if (errorData.message) {
            errorMessage += ` - ${errorData.message}`;
          }
        } catch {
          // If error text is not JSON, just use the status
        }
        
        throw new Error(errorMessage);
      }

      const authData: any = await authResponse.json();
      console.log('Backblaze authorization successful, authData structure:', {
        hasApiUrl: !!authData.apiUrl,
        hasApiInfo: !!authData.apiInfo,
        hasStorageApi: !!authData.apiInfo?.storageApi,
        storageApiUrl: authData.apiInfo?.storageApi?.apiUrl,
        legacyApiUrl: authData.apiUrl
      });

      // Get the correct API URL from the newer response structure
      const apiUrl = authData.apiInfo?.storageApi?.apiUrl || authData.apiUrl;
      
      console.log('Using API URL:', apiUrl);

      // Get upload URL
      console.log('Requesting upload URL for bucket:', bucketId);
      const uploadUrlResponse = await fetch(`${apiUrl}/b2api/v2/b2_get_upload_url`, {
        method: 'POST',
        headers: {
          'Authorization': authData.authorizationToken,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bucketId })
      });

      if (!uploadUrlResponse.ok) {
        const errorText = await uploadUrlResponse.text();
        console.error('Failed to get upload URL:', {
          status: uploadUrlResponse.status,
          statusText: uploadUrlResponse.statusText,
          error: errorText,
          bucketId,
          apiUrl
        });
        throw new Error(`Failed to get upload URL from Backblaze B2 (${uploadUrlResponse.status}): ${errorText}`);
      }

      const uploadUrlData: any = await uploadUrlResponse.json();
      console.log('Received upload URL data:', {
        hasUploadUrl: !!uploadUrlData.uploadUrl,
        hasAuthToken: !!uploadUrlData.authorizationToken
      });

      // Calculate SHA1 hash of the image data
      const sha1Hash = crypto.createHash('sha1').update(imageBuffer).digest('hex');
      console.log('Calculated SHA1 hash:', sha1Hash);

      // Upload file
      console.log('Uploading file:', filename, 'Size:', imageBuffer.length, 'bytes');
      const uploadResponse = await fetch(uploadUrlData.uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': uploadUrlData.authorizationToken,
          'X-Bz-File-Name': `images/${filename}`,
          'Content-Type': 'image/png',
          'X-Bz-Content-Sha1': sha1Hash,
        },
        body: imageBuffer
      });

      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Upload failed:', {
          status: uploadResponse.status,
          statusText: uploadResponse.statusText,
          error: errorText,
          filename,
          uploadUrl: uploadUrlData.uploadUrl
        });
        throw new Error(`Failed to upload to Backblaze B2 (${uploadResponse.status}): ${errorText}`);
      }

      const uploadResult = await uploadResponse.json();

      return {
        url: `${authData.downloadUrl}/file/${bucketName}/images/${filename}`,
        key: `images/${filename}`,
        provider: 'backblaze'
      };
    } catch (error: any) {
      console.error('Backblaze upload error:', error);
      throw new Error(`Failed to upload to Backblaze: ${error.message || 'Unknown error'}`);
    }
  }
}

export async function createStorageService(dbStorage: any): Promise<StorageService> {
  // Get storage configuration from system settings
  const settings = await dbStorage.getSystemSettings();
  const storageConfigs: StorageConfig = {};
  let activeProvider = 'local';

  for (const setting of settings) {
    if (setting.key === 'storage_wasabi_config') {
      storageConfigs.wasabi = JSON.parse(setting.value);
    } else if (setting.key === 'storage_backblaze_config') {
      const backblazeConfig = JSON.parse(setting.value);
      // Map the database field names to the expected interface
      storageConfigs.backblaze = {
        applicationKeyId: backblazeConfig.applicationKeyId,
        applicationKey: backblazeConfig.applicationKey,
        bucketName: backblazeConfig.bucketName,
        bucketId: backblazeConfig.bucketId,
      };
    } else if (setting.key === 'active_storage_provider') {
      activeProvider = setting.value;
    }
  }

  return new StorageService(storageConfigs, activeProvider);
}