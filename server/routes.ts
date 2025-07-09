import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { setupEmailAuth, isAuthenticated } from "./emailAuth";
import { 
  insertPlanSchema, 
  insertAiModelSchema, 
  insertImageSchema,
  insertCreditTransactionSchema,
  insertApiKeySchema,
  insertSystemSettingSchema,
  insertImageShareSchema,
  insertCollectionSchema,
  insertCollectionItemSchema,
  insertImageCommentSchema,
  insertCollaborationInviteSchema,
  type InsertImage 
} from "@shared/schema";
import { nanoid } from "nanoid";
import { z } from "zod";
import multer from "multer";
import { getAIService, OpenAIService, type ImageGenerationParams } from "./aiServices";
import { ImageEditor, type ImageEditingParams } from "./imageEditor";
import { createStorageService } from "./storageService";
import { filterPrompt, getFilterErrorMessage } from "./promptFilter";
import Stripe from "stripe";

// Batch processing function
async function processBatchJob(batchJobId: number) {
  try {
    console.log(`Starting batch job processing: ${batchJobId}`);
    
    const batchJob = await dbStorage.getBatchJob(batchJobId);
    if (!batchJob) {
      console.error(`Batch job ${batchJobId} not found`);
      return;
    }

    const batchItems = await dbStorage.getBatchItems(batchJobId);
    const aiService = await getAIService(batchJob.modelId);
    const model = await dbStorage.getAiModel(batchJob.modelId);
    
    if (!model) {
      console.error(`AI model ${batchJob.modelId} not found`);
      await dbStorage.updateBatchJob(batchJobId, { status: 'failed' });
      return;
    }

    let completedCount = 0;
    let failedCount = 0;
    let totalCreditsUsed = 0;

    for (const item of batchItems) {
      if (item.status !== 'pending') continue;

      try {
        // Update item status to processing
        await dbStorage.updateBatchItem(item.id, { status: 'processing' });

        // Generate image
        const generationParams = {
          prompt: item.prompt,
          ...((item.settings as any) || {})
        };

        const result = await aiService.generateImage(generationParams);

        // Create storage service for uploading
        const storageService = await createStorageService(dbStorage);
        const uploadResult = await storageService.uploadImageFromUrl(result.imageUrl);

        // Save image to database
        const imageData = {
          userId: batchJob.userId,
          prompt: item.prompt,
          imageUrl: uploadResult.url,
          modelId: batchJob.modelId,
          settings: item.settings,
          creditCost: model.creditCost
        };

        const savedImage = await dbStorage.createImage(imageData);

        // Deduct credits
        await dbStorage.spendCredits(
          batchJob.userId, 
          model.creditCost, 
          `Batch generation: ${item.prompt}`, 
          savedImage.id
        );

        // Update batch item with success
        await dbStorage.updateBatchItem(item.id, { 
          status: 'completed',
          imageId: savedImage.id 
        });

        completedCount++;
        totalCreditsUsed += model.creditCost;

      } catch (error) {
        console.error(`Error processing batch item ${item.id}:`, error);
        
        // Update batch item with error
        await dbStorage.updateBatchItem(item.id, { 
          status: 'failed',
          errorMessage: (error as Error).message 
        });

        failedCount++;
      }
    }

    // Update batch job final status
    const finalStatus = failedCount === 0 ? 'completed' : 
                       completedCount === 0 ? 'failed' : 'completed';

    await dbStorage.updateBatchJob(batchJobId, {
      status: finalStatus,
      completedImages: completedCount,
      failedImages: failedCount,
      creditsUsed: totalCreditsUsed
    });

    console.log(`Batch job ${batchJobId} completed: ${completedCount} succeeded, ${failedCount} failed`);

  } catch (error) {
    console.error(`Error processing batch job ${batchJobId}:`, error);
    await dbStorage.updateBatchJob(batchJobId, { status: 'failed' });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure multer for file uploads
  const multerStorage = multer.memoryStorage();
  const upload = multer({ 
    storage: multerStorage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
      if (file.mimetype.startsWith('image/')) {
        cb(null, true);
      } else {
        cb(new Error('Only image files are allowed'));
      }
    }
  });

  // Auth middleware
  await setupEmailAuth(app);

  // Stripe configuration
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
  }
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2023-10-16",
  });

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await dbStorage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Credits API
  app.get('/api/credits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await dbStorage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      res.json({ credits: user.credits || 0 });
    } catch (error) {
      console.error("Error fetching credits:", error);
      res.status(500).json({ message: "Failed to fetch credits" });
    }
  });

  // Plans API
  app.get('/api/plans', async (req, res) => {
    try {
      const plans = await dbStorage.getPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  // Admin Plans API
  app.get('/api/admin/plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const plans = await dbStorage.getPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  app.post('/api/admin/plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const planData = insertPlanSchema.parse(req.body);
      const plan = await dbStorage.createPlan(planData);
      res.json(plan);
    } catch (error) {
      console.error("Error creating plan:", error);
      res.status(500).json({ message: "Failed to create plan" });
    }
  });

  app.patch('/api/admin/plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const planId = parseInt(req.params.id);
      const updates = insertPlanSchema.partial().parse(req.body);
      const plan = await dbStorage.updatePlan(planId, updates);
      res.json(plan);
    } catch (error) {
      console.error("Error updating plan:", error);
      res.status(500).json({ message: "Failed to update plan" });
    }
  });

  app.delete('/api/admin/plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const planId = parseInt(req.params.id);
      await dbStorage.deletePlan(planId);
      res.json({ message: "Plan deleted successfully" });
    } catch (error) {
      console.error("Error deleting plan:", error);
      res.status(500).json({ message: "Failed to delete plan" });
    }
  });

  // Plan-AI Model Association Routes
  app.get('/api/admin/plans/:id/ai-models', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const planId = parseInt(req.params.id);
      const aiModels = await dbStorage.getPlanAiModels(planId);
      res.json(aiModels);
    } catch (error) {
      console.error("Error fetching plan AI models:", error);
      res.status(500).json({ message: "Failed to fetch plan AI models" });
    }
  });

  app.put('/api/admin/plans/:id/ai-models', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const planId = parseInt(req.params.id);
      const { aiModelIds } = req.body;
      
      if (!Array.isArray(aiModelIds)) {
        return res.status(400).json({ message: "aiModelIds must be an array" });
      }

      await dbStorage.setPlanAiModels(planId, aiModelIds);
      res.json({ message: "Plan AI models updated successfully" });
    } catch (error) {
      console.error("Error updating plan AI models:", error);
      res.status(500).json({ message: "Failed to update plan AI models" });
    }
  });



  // AI Models API - Returns models available to user's plan
  app.get('/api/ai-models', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await dbStorage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get models available to user's plan
      const models = await dbStorage.getAvailableAiModelsForUser(userId);
      res.json(models);
    } catch (error) {
      console.error("Error fetching AI models:", error);
      res.status(500).json({ message: "Failed to fetch AI models" });
    }
  });

  // Get user's plan information
  app.get('/api/user/plan', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const user = await dbStorage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // If user has no plan, return free plan info
      if (!user.planId) {
        return res.json({
          planId: null,
          name: "Free Plan",
          description: "Basic image generation with all AI models",
          monthlyCredits: 0,
          creditCost: 0,
          features: ["All AI models", "Basic generation", "Standard support"]
        });
      }

      const plan = await dbStorage.getPlan(user.planId);
      
      if (!plan) {
        return res.status(404).json({ message: "Plan not found" });
      }

      res.json(plan);
    } catch (error) {
      console.error("Error fetching user plan:", error);
      res.status(500).json({ message: "Failed to fetch user plan" });
    }
  });



  app.post('/api/admin/ai-models', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const modelData = insertAiModelSchema.parse(req.body);
      const model = await dbStorage.createAiModel(modelData);
      res.json(model);
    } catch (error) {
      console.error("Error creating AI model:", error);
      res.status(500).json({ message: "Failed to create AI model" });
    }
  });

  app.patch('/api/admin/ai-models/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const modelId = parseInt(req.params.id);
      const updates = insertAiModelSchema.partial().parse(req.body);
      const model = await dbStorage.updateAiModel(modelId, updates);
      res.json(model);
    } catch (error) {
      console.error("Error updating AI model:", error);
      res.status(500).json({ message: "Failed to update AI model" });
    }
  });

  // Image download proxy to fix content-type issues
  app.get('/api/images/download/:imageId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const imageId = parseInt(req.params.imageId);
      
      const image = await dbStorage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Fetch the image from storage
      const imageResponse = await fetch(image.imageUrl);
      if (!imageResponse.ok) {
        return res.status(404).json({ message: "Image file not found" });
      }

      // Get proper content type from filename
      const getContentType = (filename: string) => {
        const extension = filename.toLowerCase().split('.').pop();
        switch (extension) {
          case 'png': return 'image/png';
          case 'jpg':
          case 'jpeg': return 'image/jpeg';
          case 'gif': return 'image/gif';
          case 'webp': return 'image/webp';
          default: return 'image/png';
        }
      };

      const filename = image.imageUrl.split('/').pop() || 'image.png';
      const contentType = imageResponse.headers.get('content-type') || getContentType(filename);

      // Set proper headers
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${filename}"`,
        'Cache-Control': 'public, max-age=31536000'
      });

      // Pipe the image  
      const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());
      res.send(imageBuffer);
    } catch (error) {
      console.error("Error downloading image:", error);
      res.status(500).json({ message: "Failed to download image" });
    }
  });

  // Images API
  app.get('/api/images', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const images = await dbStorage.getUserImages(userId, limit, offset);
      res.json(images);
    } catch (error) {
      console.error("Error fetching images:", error);
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  // Get specific image by ID
  app.get('/api/images/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const imageId = parseInt(req.params.id);
      
      const image = await dbStorage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      res.json(image);
    } catch (error) {
      console.error("Error fetching image:", error);
      res.status(500).json({ message: "Failed to fetch image" });
    }
  });

  app.post('/api/images/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { modelId, prompt, settings } = req.body;

      // Validate input
      const generateSchema = z.object({
        modelId: z.number(),
        prompt: z.string().min(1),
        settings: z.object({
          size: z.string(),
          style: z.string(),
          quality: z.string(),
        }),
      });

      const { modelId: validModelId, prompt: validPrompt, settings: validSettings } = generateSchema.parse({
        modelId,
        prompt,
        settings,
      });

      // Filter prompt for inappropriate content
      const filterResult = await filterPrompt(validPrompt);
      if (!filterResult.isAllowed) {
        return res.status(400).json({ 
          message: getFilterErrorMessage(filterResult),
          filterResult: {
            blockedWords: filterResult.blockedWords,
            severity: filterResult.severity
          }
        });
      }

      // Get model and check credit cost
      const model = await dbStorage.getAiModel(validModelId);
      if (!model || !model.isActive) {
        return res.status(400).json({ message: "Invalid AI model" });
      }

      // Check if user has enough credits
      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < model.creditCost) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Generate image using real AI service
      const aiService = await getAIService(validModelId);
      const generationParams: ImageGenerationParams = {
        prompt: validPrompt,
        size: validSettings.size,
        quality: validSettings.quality,
        style: validSettings.style,
      };
      
      const generatedImage = await aiService.generateImage(generationParams);
      
      // Upload image to configured storage provider
      const storageService = await createStorageService(dbStorage);
      const uploadResult = await storageService.uploadImageFromUrl(
        generatedImage.imageUrl, 
        `${userId}-${Date.now()}-${nanoid(8)}.png`
      );
      
      // Create image record
      const imageData: InsertImage = {
        userId,
        modelId: validModelId,
        prompt: generatedImage.revisedPrompt || validPrompt,
        imageUrl: uploadResult.url,
        settings: { 
          ...validSettings, 
          ...generatedImage.metadata,
          storageProvider: uploadResult.provider,
          storageKey: uploadResult.key
        },
      };

      const image = await dbStorage.createImage(imageData);

      // Spend credits
      await dbStorage.spendCredits(
        userId,
        model.creditCost,
        `Generated image with ${model.name}`,
        image.id
      );

      res.json({ image, creditsSpent: model.creditCost });
    } catch (error) {
      console.error("Detailed error generating image:", {
        error: error.message,
        stack: error.stack,
        modelId: req.body.modelId,
        prompt: req.body.prompt,
        settings: req.body.settings
      });
      
      // Return more specific error message if available
      const errorMessage = error.message || "Failed to generate image";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Generate image from uploaded image with prompt
  app.post('/api/images/generate-from-image', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { modelId, prompt, settings } = req.body;
      const uploadedFile = req.file;

      if (!uploadedFile) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Validate input
      const generateSchema = z.object({
        modelId: z.string().transform(Number),
        prompt: z.string().min(1),
        settings: z.string().transform((str) => JSON.parse(str)),
      });

      const { modelId: validModelId, prompt: validPrompt, settings: validSettings } = generateSchema.parse({
        modelId,
        prompt,
        settings,
      });

      // Filter prompt for inappropriate content
      const filterResult = await filterPrompt(validPrompt);
      if (!filterResult.isAllowed) {
        return res.status(400).json({ 
          message: getFilterErrorMessage(filterResult),
          filterResult: {
            blockedWords: filterResult.blockedWords,
            severity: filterResult.severity
          }
        });
      }

      // Get model and check credit cost
      const model = await dbStorage.getAiModel(validModelId);
      if (!model || !model.isActive) {
        return res.status(400).json({ message: "Invalid AI model" });
      }

      // Check if user has enough credits (image-to-image might cost more)
      const creditCost = model.creditCost + 1; // Extra credit for image-to-image
      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < creditCost) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Generate new image using AI service based on uploaded reference image
      const aiService = await getAIService(validModelId);
      
      // Convert uploaded image to base64 for AI processing
      const base64Image = uploadedFile.buffer.toString('base64');
      const imageDataUrl = `data:${uploadedFile.mimetype};base64,${base64Image}`;
      
      // Use the AI service to generate image based on prompt and reference image
      let result;
      
      // Check if this is OpenAI DALL-E (which supports image variations)
      if (model.provider === 'openai') {
        // For OpenAI, try using image variation or editing first
        const openaiService = aiService as OpenAIService;
        try {
          // First try to create a variation of the uploaded image
          console.log("Attempting OpenAI image variation for reference-based generation");
          result = await openaiService.createVariation(imageDataUrl, {
            size: validSettings.size || '1024x1024',
          });
          
          // If we have a specific prompt, we might want to try editing instead
          if (validPrompt && validPrompt.trim() !== "") {
            console.log("Using OpenAI image edit for prompt-guided generation");
            result = await openaiService.editImage({
              image: imageDataUrl,
              prompt: validPrompt,
              size: validSettings.size || '1024x1024',
            });
          }
        } catch (error) {
          console.log("OpenAI image-to-image failed, falling back to text generation:", error);
          // Fallback to text-only generation with enhanced prompt
          result = await aiService.generateImage({
            prompt: `Create an image inspired by the uploaded reference image. ${validPrompt}`,
            size: validSettings.size || '1024x1024',
            style: validSettings.style,
            quality: validSettings.quality,
          });
        }
      } else {
        // For other providers, enhance the prompt to reference the uploaded image
        const enhancedPrompt = `Create an image inspired by and based on the uploaded reference image. Style and elements should reflect the reference while incorporating: ${validPrompt}`;
        result = await aiService.generateImage({
          prompt: enhancedPrompt,
          size: validSettings.size || '1024x1024',
          style: validSettings.style,
          quality: validSettings.quality,
        });
      }

      // Upload the generated image to storage
      const storageService = await createStorageService(dbStorage);
      const uploadResult = await storageService.uploadImageFromUrl(
        result.imageUrl, 
        `${userId}-generated-from-upload-${Date.now()}-${nanoid(8)}.png`
      );

      // Create image record
      const imageData: InsertImage = {
        userId,
        modelId: validModelId,
        prompt: validPrompt,
        imageUrl: uploadResult.url,
        settings: { 
          ...validSettings, 
          sourceImageUpload: true,
          generatedFromReference: true,
          originalPrompt: validPrompt,
          enhancedPrompt: model.provider !== 'openai' ? `Create an image inspired by and based on the uploaded reference image. ${validPrompt}` : validPrompt,
          storageProvider: uploadResult.provider,
          storageKey: uploadResult.key,
          aiProvider: model.provider,
          generationMethod: 'image-to-image',
          metadata: result.metadata || {}
        },
      };

      const image = await dbStorage.createImage(imageData);

      // Spend credits
      await dbStorage.spendCredits(
        userId,
        creditCost,
        `Generated image from upload with ${model.name}`,
        image.id
      );

      res.json({ image, creditsSpent: creditCost });
    } catch (error) {
      console.error("Error generating image from upload:", error);
      res.status(500).json({ message: "Failed to generate image from upload" });
    }
  });

  app.patch('/api/images/:id/favorite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const imageId = parseInt(req.params.id);
      
      // Verify image belongs to user
      const image = await dbStorage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      const updatedImage = await dbStorage.toggleImageFavorite(imageId);
      res.json(updatedImage);
    } catch (error) {
      console.error("Error toggling favorite:", error);
      res.status(500).json({ message: "Failed to toggle favorite" });
    }
  });

  app.delete('/api/images/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const imageId = parseInt(req.params.id);
      
      // Verify image belongs to user
      const image = await dbStorage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      await dbStorage.deleteImage(imageId);
      res.json({ message: "Image deleted successfully" });
    } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({ message: "Failed to delete image" });
    }
  });

  // Image Editing API
  app.post('/api/images/:id/edit', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const imageId = parseInt(req.params.id);
      const { filters } = req.body;

      // Verify image belongs to user
      const image = await dbStorage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      const editingParams: ImageEditingParams = {
        imageUrl: image.imageUrl,
        brightness: filters.brightness,
        contrast: filters.contrast,
        saturation: filters.saturation,
        hue: filters.hue,
        blur: filters.blur,
      };

      const imageEditor = new ImageEditor();
      const editedImage = await imageEditor.applyFilters(editingParams);

      // Update image record with new settings
      const currentSettings = image.settings && typeof image.settings === 'object' ? image.settings as Record<string, any> : {};
      const updatedImage = await dbStorage.updateImage(imageId, {
        settings: { ...currentSettings, filters: editedImage.metadata },
      });

      res.json({ image: updatedImage, metadata: editedImage.metadata });
    } catch (error) {
      console.error("Error editing image:", error);
      res.status(500).json({ message: "Failed to edit image" });
    }
  });

  app.post('/api/images/:id/upscale', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const imageId = parseInt(req.params.id);

      // Verify image belongs to user
      const image = await dbStorage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Check if user has enough credits (upscaling costs 1 credit)
      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < 1) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      const imageEditor = new ImageEditor();
      const upscaledImage = await imageEditor.upscaleImage(image.imageUrl);

      // Spend credits for upscaling
      await dbStorage.spendCredits(userId, 1, "Image upscaling", imageId);

      // Update image record
      const currentSettings = image.settings && typeof image.settings === 'object' ? image.settings as Record<string, any> : {};
      const updatedImage = await dbStorage.updateImage(imageId, {
        settings: { ...currentSettings, upscaled: upscaledImage.metadata },
      });

      res.json({ image: updatedImage, metadata: upscaledImage.metadata, creditsSpent: 1 });
    } catch (error) {
      console.error("Error upscaling image:", error);
      res.status(500).json({ message: "Failed to upscale image" });
    }
  });

  app.post('/api/images/:id/remove-background', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const imageId = parseInt(req.params.id);

      // Verify image belongs to user
      const image = await dbStorage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      // Check if user has enough credits (background removal costs 1 credit)
      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < 1) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      const imageEditor = new ImageEditor();
      const processedImage = await imageEditor.removeBackground(image.imageUrl);

      // Spend credits for background removal
      await dbStorage.spendCredits(userId, 1, "Background removal", imageId);

      // Update image record
      const currentSettings = image.settings && typeof image.settings === 'object' ? image.settings as Record<string, any> : {};
      const updatedImage = await dbStorage.updateImage(imageId, {
        settings: { ...currentSettings, backgroundRemoved: processedImage.metadata },
      });

      res.json({ image: updatedImage, metadata: processedImage.metadata, creditsSpent: 1 });
    } catch (error) {
      console.error("Error removing background:", error);
      res.status(500).json({ message: "Failed to remove background" });
    }
  });

  // Advanced Image Editing Routes
  app.post('/api/images/:id/variation', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const imageId = parseInt(req.params.id);
      const { variationType, intensity, prompt } = req.body;

      const image = await dbStorage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < 2) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      const imageEditor = new ImageEditor();
      const processedImage = await imageEditor.createVariation({
        imageUrl: image.imageUrl,
        variationType,
        intensity,
        prompt,
      });

      await dbStorage.spendCredits(userId, 2, "Image variation", imageId);

      const currentSettings = image.settings && typeof image.settings === 'object' ? image.settings as Record<string, any> : {};
      const updatedImage = await dbStorage.updateImage(imageId, {
        settings: { ...currentSettings, variation: processedImage.metadata },
      });

      res.json({ image: updatedImage, metadata: processedImage.metadata, creditsSpent: 2 });
    } catch (error) {
      console.error("Error creating image variation:", error);
      res.status(500).json({ message: "Failed to create image variation" });
    }
  });

  app.post('/api/images/:id/inpaint', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const imageId = parseInt(req.params.id);
      const { prompt, maskUrl, size } = req.body;

      const image = await dbStorage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < 3) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      const imageEditor = new ImageEditor();
      const processedImage = await imageEditor.inpaintImage({
        imageUrl: image.imageUrl,
        maskUrl,
        prompt,
        size,
      });

      await dbStorage.spendCredits(userId, 3, "Image inpainting", imageId);

      const currentSettings = image.settings && typeof image.settings === 'object' ? image.settings as Record<string, any> : {};
      const updatedImage = await dbStorage.updateImage(imageId, {
        settings: { ...currentSettings, inpainted: processedImage.metadata },
      });

      res.json({ image: updatedImage, metadata: processedImage.metadata, creditsSpent: 3 });
    } catch (error) {
      console.error("Error inpainting image:", error);
      res.status(500).json({ message: "Failed to inpaint image" });
    }
  });

  app.post('/api/images/:id/enhance', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const imageId = parseInt(req.params.id);
      const { enhancementType } = req.body;

      const image = await dbStorage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < 2) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      const imageEditor = new ImageEditor();
      const processedImage = await imageEditor.enhanceImage(image.imageUrl, enhancementType);

      await dbStorage.spendCredits(userId, 2, "Image enhancement", imageId);

      const currentSettings = image.settings && typeof image.settings === 'object' ? image.settings as Record<string, any> : {};
      const updatedImage = await dbStorage.updateImage(imageId, {
        settings: { ...currentSettings, enhanced: processedImage.metadata },
      });

      res.json({ image: updatedImage, metadata: processedImage.metadata, creditsSpent: 2 });
    } catch (error) {
      console.error("Error enhancing image:", error);
      res.status(500).json({ message: "Failed to enhance image" });
    }
  });

  app.post('/api/images/:id/colorize', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const imageId = parseInt(req.params.id);

      const image = await dbStorage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < 2) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      const imageEditor = new ImageEditor();
      const processedImage = await imageEditor.colorizeImage(image.imageUrl);

      await dbStorage.spendCredits(userId, 2, "Image colorization", imageId);

      const currentSettings = image.settings && typeof image.settings === 'object' ? image.settings as Record<string, any> : {};
      const updatedImage = await dbStorage.updateImage(imageId, {
        settings: { ...currentSettings, colorized: processedImage.metadata },
      });

      res.json({ image: updatedImage, metadata: processedImage.metadata, creditsSpent: 2 });
    } catch (error) {
      console.error("Error colorizing image:", error);
      res.status(500).json({ message: "Failed to colorize image" });
    }
  });

  app.post('/api/images/:id/restore', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const imageId = parseInt(req.params.id);

      const image = await dbStorage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < 2) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      const imageEditor = new ImageEditor();
      const processedImage = await imageEditor.restoreImage(image.imageUrl);

      await dbStorage.spendCredits(userId, 2, "Image restoration", imageId);

      const currentSettings = image.settings && typeof image.settings === 'object' ? image.settings as Record<string, any> : {};
      const updatedImage = await dbStorage.updateImage(imageId, {
        settings: { ...currentSettings, restored: processedImage.metadata },
      });

      res.json({ image: updatedImage, metadata: processedImage.metadata, creditsSpent: 2 });
    } catch (error) {
      console.error("Error restoring image:", error);
      res.status(500).json({ message: "Failed to restore image" });
    }
  });

  // Credits API
  app.get('/api/credits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const credits = await dbStorage.getUserCredits(userId);
      res.json({ credits });
    } catch (error) {
      console.error("Error fetching credits:", error);
      res.status(500).json({ message: "Failed to fetch credits" });
    }
  });

  app.get('/api/credits/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const transactions = await dbStorage.getCreditTransactions(userId, limit);
      res.json(transactions);
    } catch (error) {
      console.error("Error fetching credit transactions:", error);
      res.status(500).json({ message: "Failed to fetch credit transactions" });
    }
  });

  // Dashboard stats API
  app.get('/api/dashboard/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const images = await dbStorage.getUserImages(userId, 1000); // Get all user images for stats
      const transactions = await dbStorage.getCreditTransactions(userId, 1000);
      
      const totalGenerated = images.length;
      const creditsSpent = transactions
        .filter(t => t.type === 'spent')
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      // Find most used model
      const modelUsage = images.reduce((acc, img) => {
        acc[img.modelId] = (acc[img.modelId] || 0) + 1;
        return acc;
      }, {} as Record<number, number>);
      
      const favoriteModelId = Object.keys(modelUsage).reduce((a, b) => 
        modelUsage[Number(a)] > modelUsage[Number(b)] ? a : b, '0');
      
      const favoriteModel = favoriteModelId !== '0' 
        ? await dbStorage.getAiModel(Number(favoriteModelId))
        : null;

      res.json({
        totalGenerated,
        creditsSpent,
        favoriteModel: favoriteModel?.name || 'None',
        recentImages: images.slice(0, 5),
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Admin API
  app.get('/api/admin/stats', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const [totalUsers, activeSubscriptions, imagesGenerated, monthlyRevenue] = await Promise.all([
        dbStorage.getUserCount(),
        dbStorage.getActiveSubscriptionCount(),
        dbStorage.getTotalImagesGenerated(),
        dbStorage.getMonthlyRevenue(),
      ]);

      res.json({
        totalUsers,
        activeSubscriptions,
        imagesGenerated,
        monthlyRevenue,
      });
    } catch (error) {
      console.error("Error fetching admin stats:", error);
      res.status(500).json({ message: "Failed to fetch admin stats" });
    }
  });

  app.get('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const users = await dbStorage.getAllUsers(limit, offset);
      res.json(users);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id/credits', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.id;
      const adminUser = await dbStorage.getUser(adminUserId);
      
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetUserId = req.params.id;
      const { credits } = req.body;
      
      if (typeof credits !== 'number' || credits < 0) {
        return res.status(400).json({ message: "Invalid credits amount" });
      }

      await dbStorage.updateUserCredits(targetUserId, credits);
      res.json({ message: "Credits updated successfully" });
    } catch (error) {
      console.error("Error updating user credits:", error);
      res.status(500).json({ message: "Failed to update credits" });
    }
  });

  app.get('/api/admin/ai-models', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      console.log("Admin AI models request - userId:", userId);
      
      const user = await dbStorage.getUser(userId);
      console.log("Admin AI models request - user:", user ? { id: user.id, email: user.email, isAdmin: user.isAdmin } : null);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const models = await dbStorage.getAiModels();
      console.log("Admin AI models - fetched models count:", models.length);
      res.json(models);
    } catch (error) {
      console.error("Error fetching admin AI models:", error);
      res.status(500).json({ message: "Failed to fetch AI models" });
    }
  });

  // Credit assignment route
  app.post('/api/admin/users/:id/assign-credits', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.id;
      const adminUser = await dbStorage.getUser(adminUserId);
      
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetUserId = req.params.id;
      const { amount, description } = req.body;
      
      if (typeof amount !== 'number') {
        return res.status(400).json({ message: "Invalid amount" });
      }

      await dbStorage.assignCreditsToUser(targetUserId, amount, description || 'Admin assigned credits');
      res.json({ message: "Credits assigned successfully" });
    } catch (error) {
      console.error("Error assigning credits:", error);
      res.status(500).json({ message: "Failed to assign credits" });
    }
  });

  // System settings routes
  app.get('/api/admin/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const settings = await dbStorage.getSystemSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching system settings:", error);
      res.status(500).json({ message: "Failed to fetch system settings" });
    }
  });

  app.post('/api/admin/settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { key, value, description } = req.body;
      const setting = await dbStorage.updateSystemSetting(key, value, description);
      res.json(setting);
    } catch (error) {
      console.error("Error updating system setting:", error);
      res.status(500).json({ message: "Failed to update system setting" });
    }
  });

  // API keys routes
  app.get('/api/admin/api-keys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const apiKeys = await dbStorage.getApiKeys();
      // Don't expose actual key values in the response
      const sanitizedKeys = apiKeys.map(key => ({
        ...key,
        keyValue: key.keyValue.substring(0, 8) + '...' // Show only first 8 chars
      }));
      res.json(sanitizedKeys);
    } catch (error) {
      console.error("Error fetching API keys:", error);
      res.status(500).json({ message: "Failed to fetch API keys" });
    }
  });

  app.post('/api/admin/api-keys', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { provider, name, keyValue } = req.body;
      const apiKey = await dbStorage.createApiKey({ provider, name, keyValue });
      res.json({ ...apiKey, keyValue: apiKey.keyValue.substring(0, 8) + '...' });
    } catch (error) {
      console.error("Error creating API key:", error);
      res.status(500).json({ message: "Failed to create API key" });
    }
  });

  app.patch('/api/admin/api-keys/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const keyId = parseInt(req.params.id);
      const updates = req.body;
      
      if (isNaN(keyId)) {
        return res.status(400).json({ message: "Invalid API key ID" });
      }

      const apiKey = await dbStorage.updateApiKey(keyId, updates);
      
      res.json({ ...apiKey, keyValue: apiKey.keyValue.substring(0, 8) + '...' });
    } catch (error) {
      console.error("Error updating API key:", error);
      res.status(500).json({ message: "Failed to update API key" });
    }
  });

  app.delete('/api/admin/api-keys/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const keyId = parseInt(req.params.id);
      await dbStorage.deleteApiKey(keyId);
      res.json({ message: "API key deleted successfully" });
    } catch (error) {
      console.error("Error deleting API key:", error);
      res.status(500).json({ message: "Failed to delete API key" });
    }
  });

  app.patch('/api/admin/api-keys/:id/toggle', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const keyId = parseInt(req.params.id);
      const apiKey = await dbStorage.toggleApiKeyStatus(keyId);
      res.json({ ...apiKey, keyValue: apiKey.keyValue.substring(0, 8) + '...' });
    } catch (error) {
      console.error("Error toggling API key status:", error);
      res.status(500).json({ message: "Failed to toggle API key status" });
    }
  });

  // Bad Words Filter Management Routes
  app.get('/api/admin/bad-words', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const badWords = await dbStorage.getBadWords();
      res.json(badWords);
    } catch (error) {
      console.error("Error fetching bad words:", error);
      res.status(500).json({ message: "Failed to fetch bad words" });
    }
  });

  app.post('/api/admin/bad-words', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { word, severity } = req.body;
      
      if (!word || typeof word !== 'string') {
        return res.status(400).json({ message: "Word is required" });
      }

      const badWordData = {
        word: word.toLowerCase().trim(),
        severity: severity || 'moderate',
        addedBy: userId,
      };

      const badWord = await dbStorage.createBadWord(badWordData);
      res.json(badWord);
    } catch (error: any) {
      console.error("Error creating bad word:", error);
      if (error.message?.includes('unique')) {
        res.status(400).json({ message: "This word is already in the filter list" });
      } else {
        res.status(500).json({ message: "Failed to create bad word" });
      }
    }
  });

  app.patch('/api/admin/bad-words/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const badWordId = parseInt(req.params.id);
      const updates = req.body;
      
      if (isNaN(badWordId)) {
        return res.status(400).json({ message: "Invalid bad word ID" });
      }

      if (updates.word) {
        updates.word = updates.word.toLowerCase().trim();
      }

      const badWord = await dbStorage.updateBadWord(badWordId, updates);
      res.json(badWord);
    } catch (error) {
      console.error("Error updating bad word:", error);
      res.status(500).json({ message: "Failed to update bad word" });
    }
  });

  app.delete('/api/admin/bad-words/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const badWordId = parseInt(req.params.id);
      await dbStorage.deleteBadWord(badWordId);
      res.json({ message: "Bad word deleted successfully" });
    } catch (error) {
      console.error("Error deleting bad word:", error);
      res.status(500).json({ message: "Failed to delete bad word" });
    }
  });

  app.patch('/api/admin/bad-words/:id/toggle', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const badWordId = parseInt(req.params.id);
      const badWord = await dbStorage.toggleBadWordStatus(badWordId);
      res.json(badWord);
    } catch (error) {
      console.error("Error toggling bad word status:", error);
      res.status(500).json({ message: "Failed to toggle bad word status" });
    }
  });

  // Storage Configuration Routes
  app.post('/api/admin/storage/test', isAuthenticated, async (req: any, res) => {
    console.log("=== STORAGE TEST ENDPOINT HIT ===");
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      console.log("User ID:", userId, "Is Admin:", user?.isAdmin);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { provider, config } = req.body;
      
      console.log("Testing storage config:", { provider, config });
      
      // Test storage configuration
      let testResult = false;
      let errorMessage = '';

      try {
        if (provider === 'wasabi') {
          // Test Wasabi configuration
          const { accessKeyId, secretAccessKey, bucketName, region, endpoint } = config;
          
          console.log("Wasabi config fields:", { accessKeyId: !!accessKeyId, secretAccessKey: !!secretAccessKey, bucketName: !!bucketName, region: !!region });
          
          // Basic validation
          if (!accessKeyId || !secretAccessKey || !bucketName || !region) {
            throw new Error('Missing required Wasabi configuration fields: accessKeyId, secretAccessKey, bucketName, and region are required');
          }
          
          // Basic format validation
          if (accessKeyId.length < 3 || secretAccessKey.length < 10 || bucketName.length < 3) {
            throw new Error('Configuration values appear to be too short. Please check your credentials.');
          }
          
          // TODO: Implement actual Wasabi S3 connection test
          // For now, just validate the format
          console.log("Wasabi configuration passed validation");
          testResult = true;
          
        } else if (provider === 'backblaze') {
          // Test Backblaze configuration
          const { applicationKeyId, applicationKey, bucketId, bucketName, endpoint } = config;
          
          console.log("Testing Backblaze config fields:", { 
            applicationKeyId: !!applicationKeyId, 
            applicationKey: !!applicationKey, 
            bucketId: !!bucketId,
            bucketName: !!bucketName 
          });
          
          // Basic validation
          if (!applicationKeyId || !applicationKey || !bucketId) {
            throw new Error('Missing required Backblaze configuration fields: Application Key ID, Application Key, and Bucket ID are required');
          }
          
          // Basic format validation
          if (applicationKeyId.length < 10 || applicationKey.length < 20) {
            throw new Error('Application Key ID or Application Key appear to be too short. Please check your credentials.');
          }
          
          // Test actual Backblaze B2 connection
          try {
            console.log('Testing Backblaze B2 authorization...');
            
            const authResponse = await fetch('https://api.backblazeb2.com/b2api/v4/b2_authorize_account', {
              method: 'GET',
              headers: {
                'Authorization': `Basic ${Buffer.from(`${applicationKeyId}:${applicationKey}`).toString('base64')}`
              }
            });

            if (!authResponse.ok) {
              const errorText = await authResponse.text();
              console.error('Backblaze test authorization failed:', {
                status: authResponse.status,
                statusText: authResponse.statusText,
                error: errorText
              });
              
              let errorMessage = `Backblaze authorization failed (${authResponse.status})`;
              
              try {
                const errorData = JSON.parse(errorText);
                if (errorData.message) {
                  errorMessage += `: ${errorData.message}`;
                }
              } catch {
                // If error text is not JSON, use the status text
                errorMessage += `: ${authResponse.statusText}`;
              }
              
              throw new Error(errorMessage);
            }

            const authData = await authResponse.json();
            console.log('Backblaze authorization successful');
            
            // Get the correct API URL from the newer response structure
            const apiUrl = authData.apiInfo?.storageApi?.apiUrl || authData.apiUrl;
            
            // Test bucket access by getting upload URL
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
              console.error('Backblaze bucket access test failed:', {
                status: uploadUrlResponse.status,
                statusText: uploadUrlResponse.statusText,
                error: errorText
              });
              throw new Error(`Bucket access failed (${uploadUrlResponse.status}): Please check your Bucket ID`);
            }
            
            console.log('Backblaze bucket access test successful');
            testResult = true;
            
          } catch (authError: any) {
            console.error('Backblaze connection test failed:', authError);
            throw new Error(authError.message || 'Failed to connect to Backblaze B2');
          }
          
        } else if (provider === 'bunnycdn') {
          const { apiKey, storageZone, region, pullZoneUrl } = config;
          
          console.log('Testing Bunny CDN configuration:', {
            hasApiKey: !!apiKey,
            storageZone: !!storageZone,
            region: !!region,
            pullZoneUrl: !!pullZoneUrl
          });
          
          // Basic validation
          if (!apiKey || !storageZone || !pullZoneUrl) {
            throw new Error('Missing required Bunny CDN configuration fields: API Key, Storage Zone, and Pull Zone URL are required');
          }
          
          // Test actual Bunny CDN connection
          try {
            console.log('Testing Bunny CDN Storage access...');
            
            const regionPrefix = region && region !== 'ny' ? `${region}.` : '';
            const testUrl = `https://${regionPrefix}storage.bunnycdn.com/${storageZone}/test-connection.txt`;
            
            const testResponse = await fetch(testUrl, {
              method: 'PUT',
              headers: {
                'AccessKey': apiKey,
                'Content-Type': 'text/plain',
              },
              body: 'test'
            });

            if (!testResponse.ok) {
              const errorText = await testResponse.text();
              console.error('Bunny CDN connection test failed:', {
                status: testResponse.status,
                statusText: testResponse.statusText,
                error: errorText
              });
              throw new Error(`Bunny CDN connection failed (${testResponse.status}): Please check your API Key and Storage Zone`);
            }
            
            console.log('Bunny CDN connection test successful');
            testResult = true;
            
          } catch (authError: any) {
            console.error('Bunny CDN connection test failed:', authError);
            throw new Error(authError.message || 'Failed to connect to Bunny CDN');
          }
          
        } else {
          throw new Error('Unsupported storage provider');
        }
      } catch (error) {
        console.error("Storage test error:", error);
        errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      }

      res.json({ 
        success: testResult, 
        message: testResult ? 'Storage configuration test successful' : errorMessage 
      });
    } catch (error) {
      console.error("Error testing storage configuration:", error);
      res.status(500).json({ message: "Failed to test storage configuration" });
    }
  });

  app.post('/api/admin/storage/save', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { provider, config } = req.body;
      
      // Save storage configuration as system settings
      const configKey = `storage_${provider}_config`;
      const configValue = JSON.stringify(config);
      
      await dbStorage.updateSystemSetting(
        configKey, 
        configValue, 
        `${provider.charAt(0).toUpperCase() + provider.slice(1)} storage configuration`
      );

      // Update active storage provider if this is being set as primary
      if (config.isPrimary) {
        await dbStorage.updateSystemSetting(
          'active_storage_provider',
          provider,
          'Currently active storage provider'
        );
      }

      res.json({ 
        success: true, 
        message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} configuration saved successfully` 
      });
    } catch (error) {
      console.error("Error saving storage configuration:", error);
      res.status(500).json({ message: "Failed to save storage configuration" });
    }
  });

  // Save storage method selection
  app.post('/api/admin/storage/method', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { provider } = req.body;
      
      if (!provider || !['local', 'wasabi', 'backblaze', 'bunnycdn'].includes(provider)) {
        return res.status(400).json({ message: "Invalid storage provider" });
      }

      // Save the active storage method as a system setting
      await dbStorage.updateSystemSetting(
        'active_storage_provider', 
        provider, 
        `Active storage provider for image uploads`
      );

      res.json({ 
        success: true, 
        message: `Storage method updated to ${provider}` 
      });
    } catch (error) {
      console.error("Error saving storage method:", error);
      res.status(500).json({ message: "Failed to save storage method" });
    }
  });

  app.get('/api/admin/storage/config', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Get all storage configurations
      const settings = await dbStorage.getSystemSettings();
      const storageConfigs = {};
      let activeProvider = 'local'; // default

      for (const setting of settings) {
        if (setting.key.startsWith('storage_') && setting.key.endsWith('_config')) {
          const provider = setting.key.replace('storage_', '').replace('_config', '');
          try {
            storageConfigs[provider] = JSON.parse(setting.value);
          } catch (e) {
            console.error(`Error parsing storage config for ${provider}:`, e);
          }
        } else if (setting.key === 'active_storage_provider') {
          activeProvider = setting.value;
        }
      }

      res.json({ 
        configs: storageConfigs,
        activeProvider 
      });
    } catch (error) {
      console.error("Error fetching storage configuration:", error);
      res.status(500).json({ message: "Failed to fetch storage configuration" });
    }
  });

  // Batch Generation Routes
  app.post('/api/batch/create', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, modelId, prompts } = req.body;

      if (!name || !modelId || !prompts || !Array.isArray(prompts) || prompts.length === 0) {
        return res.status(400).json({ message: "Invalid batch generation request" });
      }

      // Get AI model details for credit calculation
      const model = await dbStorage.getAiModel(modelId);
      if (!model || !model.isActive) {
        return res.status(404).json({ message: "AI model not found or inactive" });
      }

      // Filter all prompts for inappropriate content
      for (let i = 0; i < prompts.length; i++) {
        const filterResult = await filterPrompt(prompts[i].prompt);
        if (!filterResult.isAllowed) {
          return res.status(400).json({ 
            message: `Prompt ${i + 1}: ${getFilterErrorMessage(filterResult)}`,
            filterResult: {
              blockedWords: filterResult.blockedWords,
              severity: filterResult.severity,
              promptIndex: i
            }
          });
        }
      }

      // Calculate total credits needed
      const totalCreditsNeeded = prompts.length * model.creditCost;
      
      // Check user credits
      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < totalCreditsNeeded) {
        return res.status(400).json({ 
          message: `Insufficient credits. Need ${totalCreditsNeeded}, have ${userCredits}` 
        });
      }

      // Create batch job
      const batchJob = await dbStorage.createBatchJob({
        userId,
        name,
        modelId,
        totalImages: prompts.length
      });

      // Create batch items
      const batchItems = [];
      for (let i = 0; i < prompts.length; i++) {
        const item = await dbStorage.createBatchItem({
          batchJobId: batchJob.id,
          prompt: prompts[i].prompt,
          settings: prompts[i].settings || {},
          processingOrder: i + 1
        });
        batchItems.push(item);
      }

      res.json({ batchJob, totalItems: batchItems.length });
    } catch (error) {
      console.error("Error creating batch job:", error);
      res.status(500).json({ message: "Failed to create batch job" });
    }
  });

  app.get('/api/batch/jobs', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const batchJobs = await dbStorage.getUserBatchJobs(userId, limit);
      res.json(batchJobs);
    } catch (error) {
      console.error("Error fetching batch jobs:", error);
      res.status(500).json({ message: "Failed to fetch batch jobs" });
    }
  });

  app.get('/api/batch/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const batchId = parseInt(req.params.id);
      
      const batchJob = await dbStorage.getBatchJob(batchId);
      if (!batchJob || batchJob.userId !== userId) {
        return res.status(404).json({ message: "Batch job not found" });
      }

      const batchItems = await dbStorage.getBatchItems(batchId);
      res.json({ ...batchJob, items: batchItems });
    } catch (error) {
      console.error("Error fetching batch job:", error);
      res.status(500).json({ message: "Failed to fetch batch job" });
    }
  });

  app.post('/api/batch/:id/start', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const batchId = parseInt(req.params.id);
      
      const batchJob = await dbStorage.getBatchJob(batchId);
      if (!batchJob || batchJob.userId !== userId) {
        return res.status(404).json({ message: "Batch job not found" });
      }

      if (batchJob.status !== 'pending') {
        return res.status(400).json({ message: "Batch job is not in pending status" });
      }

      // Update job status to processing
      await dbStorage.updateBatchJob(batchId, { status: 'processing' });

      // Start processing batch items in background
      processBatchJob(batchId);

      res.json({ message: "Batch job started" });
    } catch (error) {
      console.error("Error starting batch job:", error);
      res.status(500).json({ message: "Failed to start batch job" });
    }
  });

  app.delete('/api/batch/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const batchId = parseInt(req.params.id);
      
      const batchJob = await dbStorage.getBatchJob(batchId);
      if (!batchJob || batchJob.userId !== userId) {
        return res.status(404).json({ message: "Batch job not found" });
      }

      if (batchJob.status === 'processing') {
        return res.status(400).json({ message: "Cannot delete batch job while processing" });
      }

      await dbStorage.deleteBatchJob(batchId);
      res.json({ message: "Batch job deleted" });
    } catch (error) {
      console.error("Error deleting batch job:", error);
      res.status(500).json({ message: "Failed to delete batch job" });
    }
  });

  // Image Sharing Routes
  app.post('/api/images/:id/share', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const imageId = parseInt(req.params.id);
      const { permissions, description } = req.body;

      // Verify image belongs to user
      const image = await dbStorage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      const shareToken = nanoid(16);
      const shareData = {
        imageId,
        userId,
        shareToken,
        permissions: permissions || 'view',
        description: description || '',
      };

      const validatedData = insertImageShareSchema.parse(shareData);
      const imageShare = await dbStorage.shareImage(validatedData);
      
      res.json({ ...imageShare, shareUrl: `/shared/${shareToken}` });
    } catch (error) {
      console.error("Error sharing image:", error);
      res.status(500).json({ message: "Failed to share image" });
    }
  });

  app.get('/api/shares', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const shares = await dbStorage.getImageShares(userId);
      res.json(shares);
    } catch (error) {
      console.error("Error fetching shares:", error);
      res.status(500).json({ message: "Failed to fetch shares" });
    }
  });

  app.get('/api/shared/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const share = await dbStorage.getImageShare(token);
      
      if (!share) {
        return res.status(404).json({ message: "Shared image not found" });
      }

      await dbStorage.incrementShareViews(token);
      const image = await dbStorage.getImage(share.imageId);
      
      res.json({ share, image });
    } catch (error) {
      console.error("Error accessing shared image:", error);
      res.status(500).json({ message: "Failed to access shared image" });
    }
  });

  app.delete('/api/shares/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const shareId = parseInt(req.params.id);
      
      const share = await dbStorage.getImageShare(req.params.token);
      if (!share || share.userId !== userId) {
        return res.status(404).json({ message: "Share not found" });
      }

      await dbStorage.deleteImageShare(shareId);
      res.json({ message: "Share deleted successfully" });
    } catch (error) {
      console.error("Error deleting share:", error);
      res.status(500).json({ message: "Failed to delete share" });
    }
  });

  // Collection Routes
  app.post('/api/collections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { name, description, isPublic } = req.body;

      const shareToken = isPublic ? nanoid(16) : null;
      const collectionData = {
        userId,
        name,
        description: description || '',
        isPublic: isPublic || false,
        shareToken,
      };

      const validatedData = insertCollectionSchema.parse(collectionData);
      const collection = await dbStorage.createCollection(validatedData);
      
      res.json(collection);
    } catch (error) {
      console.error("Error creating collection:", error);
      res.status(500).json({ message: "Failed to create collection" });
    }
  });

  app.get('/api/collections', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const collections = await dbStorage.getUserCollections(userId);
      res.json(collections);
    } catch (error) {
      console.error("Error fetching collections:", error);
      res.status(500).json({ message: "Failed to fetch collections" });
    }
  });

  app.get('/api/collections/public', async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const collections = await dbStorage.getPublicCollections(limit);
      res.json(collections);
    } catch (error) {
      console.error("Error fetching public collections:", error);
      res.status(500).json({ message: "Failed to fetch public collections" });
    }
  });

  app.get('/api/collections/:id', async (req, res) => {
    try {
      const collectionId = parseInt(req.params.id);
      const collection = await dbStorage.getCollection(collectionId);
      
      if (!collection) {
        return res.status(404).json({ message: "Collection not found" });
      }

      const images = await dbStorage.getCollectionImages(collectionId);
      res.json({ collection, images });
    } catch (error) {
      console.error("Error fetching collection:", error);
      res.status(500).json({ message: "Failed to fetch collection" });
    }
  });

  app.post('/api/collections/:id/images', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const collectionId = parseInt(req.params.id);
      const { imageId } = req.body;

      // Verify collection belongs to user
      const collection = await dbStorage.getCollection(collectionId);
      if (!collection || collection.userId !== userId) {
        return res.status(404).json({ message: "Collection not found" });
      }

      // Verify image belongs to user
      const image = await dbStorage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      const itemData = { collectionId, imageId };
      const validatedData = insertCollectionItemSchema.parse(itemData);
      const item = await dbStorage.addImageToCollection(validatedData);
      
      res.json(item);
    } catch (error) {
      console.error("Error adding image to collection:", error);
      res.status(500).json({ message: "Failed to add image to collection" });
    }
  });

  app.delete('/api/collections/:id/images/:imageId', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const collectionId = parseInt(req.params.id);
      const imageId = parseInt(req.params.imageId);

      const collection = await dbStorage.getCollection(collectionId);
      if (!collection || collection.userId !== userId) {
        return res.status(404).json({ message: "Collection not found" });
      }

      await dbStorage.removeImageFromCollection(collectionId, imageId);
      res.json({ message: "Image removed from collection" });
    } catch (error) {
      console.error("Error removing image from collection:", error);
      res.status(500).json({ message: "Failed to remove image from collection" });
    }
  });

  // Comments Routes
  app.post('/api/images/:id/comments', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const imageId = parseInt(req.params.id);
      const { content } = req.body;

      const commentData = {
        imageId,
        userId,
        content,
        isApproved: false, // Comments need approval
      };

      const validatedData = insertImageCommentSchema.parse(commentData);
      const comment = await dbStorage.createComment(validatedData);
      
      res.json(comment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ message: "Failed to create comment" });
    }
  });

  app.get('/api/images/:id/comments', async (req, res) => {
    try {
      const imageId = parseInt(req.params.id);
      const comments = await dbStorage.getImageComments(imageId);
      res.json(comments);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ message: "Failed to fetch comments" });
    }
  });

  // Collaboration Routes
  app.post('/api/collaborations/invite', isAuthenticated, async (req: any, res) => {
    try {
      const fromUserId = req.user.id;
      const { toEmail, imageId, message, permissions } = req.body;

      const inviteToken = nanoid(24);
      const inviteData = {
        fromUserId,
        toEmail,
        imageId: imageId || null,
        inviteToken,
        message: message || '',
        permissions: permissions || 'view',
        status: 'pending',
      };

      const validatedData = insertCollaborationInviteSchema.parse(inviteData);
      const invite = await dbStorage.createCollaborationInvite(validatedData);
      
      res.json({ ...invite, inviteUrl: `/collaborate/${inviteToken}` });
    } catch (error) {
      console.error("Error creating collaboration invite:", error);
      res.status(500).json({ message: "Failed to create collaboration invite" });
    }
  });

  app.get('/api/collaborate/:token', async (req, res) => {
    try {
      const { token } = req.params;
      const invite = await dbStorage.getCollaborationInvite(token);
      
      if (!invite) {
        return res.status(404).json({ message: "Collaboration invite not found" });
      }

      res.json(invite);
    } catch (error) {
      console.error("Error fetching collaboration invite:", error);
      res.status(500).json({ message: "Failed to fetch collaboration invite" });
    }
  });

  app.post('/api/collaborate/:token/accept', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { token } = req.params;
      
      const invite = await dbStorage.getCollaborationInvite(token);
      if (!invite) {
        return res.status(404).json({ message: "Collaboration invite not found" });
      }

      if (invite.status !== 'pending') {
        return res.status(400).json({ message: "Invite already processed" });
      }

      await dbStorage.updateInviteStatus(invite.id, 'accepted');
      res.json({ message: "Collaboration invite accepted" });
    } catch (error) {
      console.error("Error accepting collaboration invite:", error);
      res.status(500).json({ message: "Failed to accept collaboration invite" });
    }
  });

  // Admin credit management endpoint
  app.post('/api/admin/users/credits', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, amount, description } = req.body;

      // Validate that the current user is an admin
      const currentUser = await dbStorage.getUser(req.user.id);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Add credits to the specified user
      await dbStorage.assignCreditsToUser(userId.toString(), amount, description);
      
      res.json({ message: "Credits added successfully" });
    } catch (error) {
      console.error("Error adding credits:", error);
      res.status(500).json({ message: "Failed to add credits" });
    }
  });

  // Admin plan assignment endpoint
  app.post('/api/admin/users/assign-plan', isAuthenticated, async (req: any, res) => {
    try {
      const { userId, planId } = req.body;

      // Validate that the current user is an admin
      const currentUser = await dbStorage.getUser(req.user.id);
      if (!currentUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      // Validate inputs
      if (!userId || (!planId && planId !== null)) {
        return res.status(400).json({ message: "User ID and plan ID are required" });
      }

      // Update user's plan
      await dbStorage.assignPlanToUser(userId, planId);
      
      res.json({ message: "Plan assigned successfully" });
    } catch (error) {
      console.error("Error assigning plan:", error);
      res.status(500).json({ message: "Failed to assign plan" });
    }
  });

  // Stripe payment routes
  app.post("/api/create-payment-intent", isAuthenticated, async (req: any, res) => {
    try {
      const { amount } = req.body;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res
        .status(500)
        .json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Credit purchase route
  app.post("/api/purchase-credits", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { amount, credits } = req.body;

      if (!amount || !credits) {
        return res.status(400).json({ message: "Amount and credits are required" });
      }

      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "usd",
        metadata: {
          userId: userId.toString(),
          credits: credits.toString(),
          type: 'credit_purchase'
        }
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  // Stripe webhook to handle successful payments
  app.post('/api/stripe/webhook', async (req, res) => {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig as string, process.env.STRIPE_WEBHOOK_SECRET || '');
    } catch (err: any) {
      console.log(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        
        if (paymentIntent.metadata?.type === 'credit_purchase') {
          const userId = paymentIntent.metadata.userId;
          const credits = parseInt(paymentIntent.metadata.credits);
          
          if (userId && credits) {
            try {
              await dbStorage.assignCreditsToUser(
                userId, 
                credits, 
                `Credit purchase - Payment ID: ${paymentIntent.id}`
              );
              console.log(`Successfully added ${credits} credits to user ${userId}`);
            } catch (error) {
              console.error('Error adding credits after payment:', error);
            }
          }
        }
        break;
      
      default:
        console.log(`Unhandled event type ${event.type}`);
    }

    res.json({received: true});
  });

  const httpServer = createServer(app);
  return httpServer;
}
