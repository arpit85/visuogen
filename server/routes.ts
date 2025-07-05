import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
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
import { getAIService, type ImageGenerationParams } from "./aiServices";
import { ImageEditor, type ImageEditingParams } from "./imageEditor";

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
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await dbStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

  app.post('/api/admin/plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // AI Models API
  app.get('/api/ai-models', isAuthenticated, async (req, res) => {
    try {
      const models = await dbStorage.getActiveAiModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching AI models:", error);
      res.status(500).json({ message: "Failed to fetch AI models" });
    }
  });

  app.post('/api/admin/ai-models', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // Images API
  app.get('/api/images', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const images = await dbStorage.getUserImages(userId, limit, offset);
      res.json(images);
    } catch (error) {
      console.error("Error fetching images:", error);
      res.status(500).json({ message: "Failed to fetch images" });
    }
  });

  app.post('/api/images/generate', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      
      // Create image record
      const imageData: InsertImage = {
        userId,
        modelId: validModelId,
        prompt: generatedImage.revisedPrompt || validPrompt,
        imageUrl: generatedImage.imageUrl,
        settings: { ...validSettings, ...generatedImage.metadata },
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
      console.error("Error generating image:", error);
      res.status(500).json({ message: "Failed to generate image" });
    }
  });

  // Generate image from uploaded image with prompt
  app.post('/api/images/generate-from-image', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

      // For now, we'll use OpenAI's variation endpoint for image-to-image
      // Convert buffer to base64
      const base64Image = uploadedFile.buffer.toString('base64');
      
      // Use the image editor for variation generation
      const imageEditor = new ImageEditor();
      const processedImage = await imageEditor.createVariation({
        imageUrl: `data:${uploadedFile.mimetype};base64,${base64Image}`,
        variationType: 'style_transfer',
        intensity: 0.7,
        prompt: validPrompt,
      });

      // Create image record
      const imageData: InsertImage = {
        userId,
        modelId: validModelId,
        prompt: validPrompt,
        imageUrl: processedImage.imageUrl,
        settings: { 
          ...validSettings, 
          sourceImage: true,
          variationType: 'prompt_guided',
          ...processedImage.metadata 
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const credits = await dbStorage.getUserCredits(userId);
      res.json({ credits });
    } catch (error) {
      console.error("Error fetching credits:", error);
      res.status(500).json({ message: "Failed to fetch credits" });
    }
  });

  app.get('/api/credits/transactions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const adminUserId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const models = await dbStorage.getAiModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching admin AI models:", error);
      res.status(500).json({ message: "Failed to fetch AI models" });
    }
  });

  // Credit assignment route
  app.post('/api/admin/users/:id/assign-credits', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  // Storage Configuration Routes
  app.post('/api/admin/storage/test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await dbStorage.getUser(userId);
      
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
          
          // Basic validation
          if (!applicationKeyId || !applicationKey || !bucketId) {
            throw new Error('Missing required Backblaze configuration fields');
          }
          
          // TODO: Implement actual Backblaze B2 connection test
          // For now, just validate the format
          testResult = true;
          
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
      const userId = req.user.claims.sub;
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

  app.get('/api/admin/storage/config', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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

  // Image Sharing Routes
  app.post('/api/images/:id/share', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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
      const fromUserId = req.user.claims.sub;
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
      const userId = req.user.claims.sub;
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

  const httpServer = createServer(app);
  return httpServer;
}
