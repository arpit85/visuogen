import { db } from "./db";
import { plans, aiModels, apiKeys, systemSettings } from "@shared/schema";

async function seedData() {
  try {
    console.log("Starting database seeding...");
    
    // Create sample plans
    const insertedPlans = await db.insert(plans).values([
      {
        name: 'Starter',
        description: 'Perfect for beginners',
        price: '9.00',
        creditsPerMonth: 50,
        features: ['Basic AI models', 'Standard quality', 'Gallery access'],
        isActive: true
      },
      {
        name: 'Pro', 
        description: 'For professional creators',
        price: '29.00',
        creditsPerMonth: 200,
        features: ['All AI models', 'High quality output', 'Advanced editing tools', 'Priority support'],
        isActive: true
      },
      {
        name: 'Enterprise',
        description: 'For teams and businesses', 
        price: '99.00',
        creditsPerMonth: 1000,
        features: ['All models + Beta', 'Ultra quality output', 'Commercial license', 'Dedicated support'],
        isActive: true
      }
    ]).onConflictDoNothing().returning();

    console.log(`Created ${insertedPlans.length} plans`);

    // Create sample AI models with provider information
    const insertedModels = await db.insert(aiModels).values([
      {
        name: 'DALL-E 3',
        description: 'OpenAI\'s latest image generation model with high quality and prompt adherence',
        provider: 'openai',
        creditCost: 5,
        maxResolution: '1792x1024',
        averageGenerationTime: 30,
        isActive: true
      },
      {
        name: 'Midjourney v6.1',
        description: 'Artistic and creative image generation with exceptional quality via PiAPI',
        provider: 'piapi',
        creditCost: 5,
        maxResolution: '2048x2048', 
        averageGenerationTime: 60,
        isActive: false
      },
      {
        name: 'Stable Diffusion XL',
        description: 'Fast and versatile image generation with great customization options',
        provider: 'stability',
        creditCost: 5,
        maxResolution: '1536x1536',
        averageGenerationTime: 15,
        isActive: false
      },
      {
        name: 'FLUX.1 Dev',
        description: 'High-quality text-to-image model with excellent prompt adherence',
        provider: 'replicate',
        creditCost: 5,
        maxResolution: '1792x1024',
        averageGenerationTime: 8,
        isActive: false
      },
      {
        name: 'FLUX.1.1 Pro',
        description: 'Enhanced FLUX model with improved image quality and speed',
        provider: 'replicate',
        creditCost: 5,
        maxResolution: '2048x2048',
        averageGenerationTime: 12,
        isActive: false
      },
      {
        name: 'FLUX Schnell',
        description: 'Fast FLUX model optimized for quick generation',
        provider: 'replicate',
        creditCost: 5,
        maxResolution: '1024x1024',
        averageGenerationTime: 4,
        isActive: false
      },
      {
        name: 'Google Imagen-4 Fast',
        description: 'Google\'s fast text-to-image model with high quality results',
        provider: 'replicate',
        creditCost: 5,
        maxResolution: '1792x1024',
        averageGenerationTime: 10,
        isActive: false
      },
      {
        name: 'Google Imagen-4',
        description: 'Google\'s premium text-to-image model with exceptional quality',
        provider: 'replicate',
        creditCost: 5,
        maxResolution: '1792x1024',
        averageGenerationTime: 20,
        isActive: false
      },
      {
        name: 'Sticker Maker',
        description: 'Generate fun stickers with transparent backgrounds',
        provider: 'replicate',
        creditCost: 5,
        maxResolution: '1024x1024',
        averageGenerationTime: 15,
        isActive: false
      },
      {
        name: 'Minimax Image-01',
        description: 'Advanced Chinese image generation model with artistic capabilities',
        provider: 'replicate',
        creditCost: 5,
        maxResolution: '1792x1024',
        averageGenerationTime: 25,
        isActive: false
      },
      {
        name: 'Luma Photon',
        description: 'Ultra-fast photorealistic image generation',
        provider: 'replicate',
        creditCost: 5,
        maxResolution: '1792x1024',
        averageGenerationTime: 8,
        isActive: false
      },
      {
        name: 'WAI NSFW Illustrious',
        description: 'Specialized model for artistic adult content generation',
        provider: 'replicate',
        creditCost: 5,
        maxResolution: '1792x1024',
        averageGenerationTime: 15,
        isActive: false
      },
      {
        name: 'NSFW FLUX Dev',
        description: 'FLUX-based model optimized for adult content',
        provider: 'replicate',
        creditCost: 5,
        maxResolution: '1792x1024',
        averageGenerationTime: 10,
        isActive: false
      },
      {
        name: 'Stable Diffusion Img2Img',
        description: 'Transform existing images with AI-powered editing',
        provider: 'replicate',
        creditCost: 5,
        maxResolution: '1536x1536',
        averageGenerationTime: 12,
        isActive: false
      }
    ]).onConflictDoNothing().returning();

    // Insert video models
    const insertedVideoModels = await db.insert(aiModels).values([
      {
        name: 'ByteDance SeDance-1-Pro',
        description: 'ByteDance\'s premium video generation model with cinematic quality up to 41 seconds',
        provider: 'replicate',
        modelType: 'video',
        creditCost: 20,
        maxResolution: '1080p',
        maxDuration: 41,
        averageGenerationTime: 120,
        isActive: true
      },
      {
        name: 'Minimax Hailuo-02',
        description: 'MiniMax\'s advanced video model with director-level camera controls',
        provider: 'replicate',
        modelType: 'video',
        creditCost: 20,
        maxResolution: '1080p',
        maxDuration: 10,
        averageGenerationTime: 60,
        isActive: true
      },
      {
        name: 'KlingAI v2.1',
        description: 'Advanced AI video generation with superb dynamics and high prompt adherence',
        provider: 'replicate',
        modelType: 'video',
        creditCost: 20,
        maxResolution: '1080p',
        maxDuration: 10,
        averageGenerationTime: 75,
        isActive: true
      },
      {
        name: 'Google Veo-3',
        description: 'Google\'s latest video generation model with enhanced quality and longer duration support',
        provider: 'replicate',
        modelType: 'video',
        creditCost: 20,
        maxResolution: '1080p',
        maxDuration: 10,
        averageGenerationTime: 90,
        isActive: true
      }
    ]).onConflictDoNothing().returning();

    console.log(`Created ${insertedModels.length} image models`);
    console.log(`Created ${insertedVideoModels.length} video models`);

    // Create API key placeholders for each provider
    const insertedApiKeys = await db.insert(apiKeys).values([
      {
        provider: 'openai',
        name: 'OpenAI API Key',
        keyValue: process.env.OPENAI_API_KEY || 'sk-placeholder-key-openai',
        isActive: !!process.env.OPENAI_API_KEY
      },
      {
        provider: 'piapi',
        name: 'PiAPI Midjourney Key',
        keyValue: 'placeholder-piapi-key',
        isActive: false
      },
      {
        provider: 'stability',
        name: 'Stability AI Key',
        keyValue: 'placeholder-stability-key',
        isActive: false
      },
      {
        provider: 'replicate',
        name: 'Replicate AI Key',
        keyValue: 'placeholder-replicate-key',
        isActive: false
      }
    ]).onConflictDoNothing().returning();

    console.log(`Created ${insertedApiKeys.length} API key placeholders`);

    // Create system settings
    const insertedSettings = await db.insert(systemSettings).values([
      {
        key: 'max_credits_per_generation',
        value: '10',
        description: 'Maximum credits that can be spent on a single image generation'
      },
      {
        key: 'default_image_expiry_hours',
        value: '24',
        description: 'Hours after which generated images are removed from CDN'
      },
      {
        key: 'maintenance_mode',
        value: 'false',
        description: 'Enable/disable maintenance mode for the platform'
      },
      {
        key: 'storage_method',
        value: 'local',
        description: 'Image storage method: local, wasabi, or backblaze'
      }
    ]).onConflictDoNothing().returning();

    console.log(`Created ${insertedSettings.length} system settings`);
    console.log("Database seeding completed successfully!");
    
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

// Run the seeding function
seedData().then(() => process.exit(0)).catch((error) => {
  console.error(error);
  process.exit(1);
});

export { seedData };