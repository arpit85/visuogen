import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./storage";
import { setupEmailAuth, isAuthenticated } from "./emailAuth";
import { 
  insertPlanSchema, 
  insertAiModelSchema, 
  insertImageSchema,
  insertVideoSchema,
  insertCreditTransactionSchema,
  insertApiKeySchema,
  insertSystemSettingSchema,
  insertImageShareSchema,
  insertCollectionSchema,
  insertCollectionItemSchema,
  insertImageCommentSchema,
  insertCollaborationInviteSchema,
  insertCouponSchema,
  insertCouponBatchSchema,
  insertSmtpSettingsSchema,
  type InsertImage,
  type InsertVideo 
} from "@shared/schema";
import { nanoid } from "nanoid";
import { z } from "zod";
import multer from "multer";
import { getAIService, OpenAIService, type ImageGenerationParams } from "./aiServices";
import { createStorageService } from "./storageService";
import { filterPrompt, getFilterErrorMessage } from "./promptFilter";
import { emailService } from "./emailService";
import { clipDropService } from "./clipdropService";
import { notificationService } from "./notificationService";
import { analyticsService } from "./analytics";
import bcrypt from "bcrypt";
import Stripe from "stripe";



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

  // User Profile Update API
  app.put('/api/user/profile', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const { firstName, lastName, email } = req.body;
      
      if (!firstName || !lastName || !email) {
        return res.status(400).json({ message: "All fields are required" });
      }

      const user = await dbStorage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const updatedUser = await dbStorage.updateUser(userId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim()
      });

      const { password: _, ...userWithoutPassword } = updatedUser;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ message: "Failed to update profile" });
    }
  });

  // Password reset endpoints
  app.post('/api/auth/forgot-password', async (req, res) => {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({ message: "Email is required" });
      }

      const user = await dbStorage.getUserByEmail(email);
      
      // Always return success to prevent email enumeration
      if (!user) {
        return res.json({ message: "If an account with this email exists, you will receive a password reset link." });
      }

      // Generate reset token
      const resetToken = nanoid(32);
      const expiresAt = new Date(Date.now() + 3600000); // 1 hour from now

      // Save reset token
      await dbStorage.createPasswordResetToken({
        userId: user.id,
        token: resetToken,
        expiresAt
      });

      // Send reset email
      const emailSent = await emailService.sendPasswordResetEmail(email, resetToken);
      
      if (!emailSent) {
        console.error('Failed to send password reset email');
      }

      res.json({ message: "If an account with this email exists, you will receive a password reset link." });
    } catch (error) {
      console.error("Error in forgot password:", error);
      res.status(500).json({ message: "Failed to process password reset request" });
    }
  });

  app.post('/api/auth/reset-password', async (req, res) => {
    try {
      const { token, password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token and password are required" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Validate password requirements
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({ 
          message: "Password must contain at least one uppercase letter, one lowercase letter, and one number" 
        });
      }

      // Get reset token
      const resetToken = await dbStorage.getPasswordResetToken(token);
      
      if (!resetToken) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      // Get user
      const user = await dbStorage.getUser(resetToken.userId);
      if (!user) {
        return res.status(400).json({ message: "User not found" });
      }

      // Hash new password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Update user password
      await dbStorage.updateUser(user.id, { password: hashedPassword });

      // Mark token as used
      await dbStorage.markPasswordResetTokenAsUsed(token);

      // Clean up expired tokens
      await dbStorage.deleteExpiredPasswordResetTokens();

      res.json({ message: "Password reset successful" });
    } catch (error) {
      console.error("Error in reset password:", error);
      res.status(500).json({ message: "Failed to reset password" });
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
          id: null,
          name: "Free Plan",
          description: "Basic image generation with all AI models",
          price: "0.00",
          creditsPerMonth: 0,
          features: ["All AI models", "Basic generation", "Standard support"],
          isActive: true
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

  app.delete('/api/admin/ai-models/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const modelId = parseInt(req.params.id);
      await dbStorage.deleteAiModel(modelId);
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting AI model:", error);
      res.status(500).json({ message: "Failed to delete AI model" });
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

      // Send notification and log activity
      await notificationService.logActivity({
        userId,
        action: 'image_generated',
        details: { imageId: image.id, modelName: model.name, creditCost: model.creditCost },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });

      await notificationService.sendImageGeneratedNotification(userId, image.id, model.name);

      // Check if user has low credits after generation
      const remainingCredits = await dbStorage.getUserCredits(userId);
      if (remainingCredits <= 10) {
        await notificationService.sendLowCreditsNotification(userId, remainingCredits);
      }

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

  // New Standalone Image Editor API Routes
  app.post('/api/editor/upload', isAuthenticated, upload.single('image'), async (req: any, res) => {
    try {
      const userId = req.user.id;
      const file = req.file;

      if (!file) {
        return res.status(400).json({ message: "No image file provided" });
      }

      // Create storage service for uploading
      const storageService = await createStorageService(dbStorage);
      const uploadResult = await storageService.uploadImageFromBuffer(file.buffer, file.originalname);

      res.json({ 
        imageUrl: uploadResult.url,
        originalName: file.originalname,
        size: file.size
      });
    } catch (error) {
      console.error("Error uploading image:", error);
      res.status(500).json({ message: "Failed to upload image" });
    }
  });

  app.post('/api/editor/remove-background', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { imageUrl } = req.body;

      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < 1) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      const processedImage = await clipDropService.removeBackground(imageUrl);

      await dbStorage.spendCredits(userId, 1, "Clipdrop background removal");

      res.json({ 
        metadata: processedImage.metadata, 
        creditsSpent: 1, 
        processedImageUrl: processedImage.imageUrl 
      });
    } catch (error) {
      console.error("Error removing background:", error);
      res.status(500).json({ message: "Failed to remove background" });
    }
  });

  app.post('/api/editor/upscale', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { imageUrl, targetWidth = 2048, targetHeight = 2048 } = req.body;

      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < 1) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      const processedImage = await clipDropService.upscaleImage(imageUrl, targetWidth, targetHeight);

      await dbStorage.spendCredits(userId, 1, "Clipdrop image upscaling");

      res.json({ 
        metadata: processedImage.metadata, 
        creditsSpent: 1, 
        processedImageUrl: processedImage.imageUrl 
      });
    } catch (error) {
      console.error("Error upscaling image:", error);
      res.status(500).json({ message: "Failed to upscale image" });
    }
  });

  app.post('/api/editor/cleanup', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { imageUrl, maskUrl, mode = 'fast' } = req.body;

      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < 1) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // For now, use a placeholder mask if not provided
      const finalMaskUrl = maskUrl || imageUrl; // Clipdrop can work without explicit mask

      const processedImage = await clipDropService.cleanup(imageUrl, finalMaskUrl, mode);

      await dbStorage.spendCredits(userId, 1, "Clipdrop image cleanup");

      res.json({ 
        metadata: processedImage.metadata, 
        creditsSpent: 1, 
        processedImageUrl: processedImage.imageUrl 
      });
    } catch (error) {
      console.error("Error cleaning up image:", error);
      res.status(500).json({ message: "Failed to cleanup image" });
    }
  });

  app.post('/api/editor/text-inpainting', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { imageUrl, maskUrl, textPrompt } = req.body;

      if (!textPrompt) {
        return res.status(400).json({ message: "Text prompt is required for text inpainting" });
      }

      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < 1) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // For now, use a placeholder mask if not provided
      const finalMaskUrl = maskUrl || imageUrl;

      const processedImage = await clipDropService.textInpainting(imageUrl, finalMaskUrl, textPrompt);

      await dbStorage.spendCredits(userId, 1, "Clipdrop text inpainting");

      res.json({ 
        metadata: processedImage.metadata, 
        creditsSpent: 1, 
        processedImageUrl: processedImage.imageUrl 
      });
    } catch (error) {
      console.error("Error performing text inpainting:", error);
      res.status(500).json({ message: "Failed to perform text inpainting" });
    }
  });

  app.post('/api/editor/reimagine', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { imageUrl } = req.body;

      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < 1) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      const processedImage = await clipDropService.reimagine(imageUrl);

      await dbStorage.spendCredits(userId, 1, "Clipdrop image reimagining");

      res.json({ 
        metadata: processedImage.metadata, 
        creditsSpent: 1, 
        processedImageUrl: processedImage.imageUrl 
      });
    } catch (error) {
      console.error("Error reimagining image:", error);
      res.status(500).json({ message: "Failed to reimagine image" });
    }
  });

  // Video generation API
  app.get('/api/video-models', isAuthenticated, async (req: any, res) => {
    try {
      const { getVideoService } = await import('./videoServices');
      const videoService = await getVideoService();
      const models = videoService.getAvailableModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching video models:", error);
      res.status(500).json({ message: "Failed to fetch video models" });
    }
  });

  app.post('/api/generate-video', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { prompt, modelName, duration, resolution, aspectRatio } = req.body;

      if (!prompt) {
        return res.status(400).json({ message: "Prompt is required" });
      }

      // Get video service and model
      const { getVideoService } = await import('./videoServices');
      const videoService = await getVideoService();
      console.log('Received modelName:', modelName);
      const model = videoService.getModelByName(modelName || 'veo-2');
      console.log('Found model:', model);
      
      if (!model) {
        return res.status(400).json({ message: "Invalid model selected" });
      }

      // Check user credits
      const userCredits = await dbStorage.getUserCredits(userId);
      if (userCredits < model.creditCost) {
        return res.status(400).json({ 
          message: `Insufficient credits. Required: ${model.creditCost}, Available: ${userCredits}` 
        });
      }

      // Check for bad words (reuse existing filter)
      const { filterPrompt } = await import('./promptFilter');
      const filterResult = await filterPrompt(prompt);
      if (!filterResult.isAllowed) {
        return res.status(400).json({ 
          message: "Prompt contains prohibited content",
          blockedWords: filterResult.blockedWords 
        });
      }

      // Generate video
      console.log('Starting video generation with params:', {
        prompt,
        modelName: modelName || 'veo-2',
        duration: duration || 6,
        resolution: resolution || '1080p',
        aspectRatio: aspectRatio || '16:9',
      });
      
      const videoResult = await videoService.generateVideo({
        prompt,
        modelName: modelName || 'veo-2',
        duration: duration || 6,
        resolution: resolution || '1080p',
        aspectRatio: aspectRatio || '16:9',
      });
      
      console.log('Video generation completed:', videoResult);

      // Upload video to storage to ensure permanent storage
      let finalVideoUrl = videoResult.videoUrl;
      let finalThumbnailUrl = videoResult.thumbnailUrl;
      
      try {
        // Get storage configuration from database
        const storageConfig = await dbStorage.getStorageConfig();
        console.log('Storage config:', { 
          method: storageConfig?.method,
          hasConfig: !!storageConfig?.config 
        });
        
        if (storageConfig?.method && storageConfig?.method !== 'local' && storageConfig?.config) {
          const { StorageService } = await import('./storageService');
          const storageService = new StorageService(storageConfig.config, storageConfig.method);
          
          console.log('Uploading video to storage provider:', storageConfig.method);
          const uploadResult = await storageService.uploadVideoFromUrl(
            videoResult.videoUrl.toString(),
            `video_${Date.now()}.mp4`
          );
          
          finalVideoUrl = uploadResult.url;
          console.log('Video uploaded successfully to storage:', uploadResult.url);
        } else {
          // Force local storage as fallback to preserve videos permanently
          console.log('No cloud storage provider configured, using local storage to preserve video');
          const { StorageService } = await import('./storageService');
          const storageService = new StorageService({}, 'local');
          
          const uploadResult = await storageService.uploadVideoFromUrl(
            videoResult.videoUrl.toString(),
            `video_${Date.now()}.mp4`
          );
          
          finalVideoUrl = uploadResult.url;
          console.log('Video stored locally to prevent Replicate deletion:', uploadResult.url);
        }
      } catch (error) {
        console.error('Failed to upload video to storage:', error);
        console.log('WARNING: Using Replicate URL - video may be deleted after some time');
        // Continue with Replicate URL as fallback
      }

      // Save video to database
      console.log('Saving video to database with data:', {
        userId,
        finalVideoUrl,
        finalThumbnailUrl,
        duration: videoResult.duration,
        resolution: videoResult.resolution,
        fileSize: videoResult.fileSize,
      });
      
      const videoData = {
        userId,
        modelId: 0, // For now, using 0 since we're using video service models
        prompt,
        videoUrl: finalVideoUrl.toString(),
        thumbnailUrl: finalThumbnailUrl,
        settings: { 
          duration, 
          resolution, 
          aspectRatio,
          modelName: model.name
        },
        duration: videoResult.duration,
        resolution: videoResult.resolution,
        fileSize: videoResult.fileSize,
        status: 'completed',
        isFavorite: false,
        isPublic: false,
      };

      const savedVideo = await dbStorage.createVideo(videoData);
      console.log('Video saved successfully with ID:', savedVideo.id);

      // Deduct credits
      await dbStorage.spendCredits(userId, model.creditCost, `Video generation with ${model.name}`);

      console.log('Video generation successful:', {
        videoId: savedVideo.id,
        videoUrl: finalVideoUrl,
        thumbnailUrl: finalThumbnailUrl,
        duration: videoResult.duration,
        resolution: videoResult.resolution,
        fileSize: videoResult.fileSize,
      });

      res.json({
        video: {
          id: savedVideo.id,
          videoUrl: finalVideoUrl,
          thumbnailUrl: finalThumbnailUrl,
          duration: videoResult.duration,
          resolution: videoResult.resolution,
          fileSize: videoResult.fileSize,
          prompt,
          modelName: model.name,
          creditsUsed: model.creditCost,
        },
        creditsRemaining: userCredits - model.creditCost,
      });

    } catch (error) {
      console.error("Error generating video:", error);
      res.status(500).json({ message: "Failed to generate video" });
    }
  });

  // Get user videos
  app.get('/api/videos', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const videos = await dbStorage.getUserVideos(userId, limit, offset);
      res.json(videos);
    } catch (error) {
      console.error("Error fetching user videos:", error);
      res.status(500).json({ message: "Failed to fetch videos" });
    }
  });

  // Video favoriting
  app.post('/api/videos/:id/favorite', isAuthenticated, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Verify video belongs to user
      const video = await dbStorage.getVideo(videoId);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      const updatedVideo = await dbStorage.toggleVideoFavorite(videoId);
      res.json(updatedVideo);
    } catch (error) {
      console.error("Error toggling video favorite:", error);
      res.status(500).json({ message: "Failed to toggle video favorite" });
    }
  });

  // Video deletion
  app.delete('/api/videos/:id', isAuthenticated, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user.id;
      
      // Verify video belongs to user
      const video = await dbStorage.getVideo(videoId);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      await dbStorage.deleteVideo(videoId);
      res.json({ message: "Video deleted successfully" });
    } catch (error) {
      console.error("Error deleting video:", error);
      res.status(500).json({ message: "Failed to delete video" });
    }
  });

  // Video visibility toggle
  app.post('/api/videos/:id/visibility', isAuthenticated, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user.id;
      const { isPublic } = req.body;
      
      // Verify video belongs to user
      const video = await dbStorage.getVideo(videoId);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      const updatedVideo = await dbStorage.updateVideo(videoId, { isPublic });
      res.json(updatedVideo);
    } catch (error) {
      console.error("Error updating video visibility:", error);
      res.status(500).json({ message: "Failed to update video visibility" });
    }
  });

  // Video sharing
  app.post('/api/videos/:id/share', isAuthenticated, async (req: any, res) => {
    try {
      const videoId = parseInt(req.params.id);
      const userId = req.user.id;
      const { permissions = "view", allowDownload = true, isPublic = true } = req.body;
      
      // Verify video belongs to user
      const video = await dbStorage.getVideo(videoId);
      if (!video || video.userId !== userId) {
        return res.status(404).json({ message: "Video not found" });
      }
      
      // Generate unique share token
      const { nanoid } = await import('nanoid');
      const shareToken = nanoid(32);
      
      // Create video share record
      const shareData = {
        videoId,
        userId,
        shareToken,
        permissions,
        isPublic,
        allowComments: true,
        viewCount: 0,
        isActive: true
      };
      
      const videoShare = await dbStorage.createVideoShare(shareData);
      res.json({ shareToken, shareUrl: `/shared/video/${shareToken}` });
    } catch (error) {
      console.error("Error creating video share:", error);
      res.status(500).json({ message: "Failed to create video share" });
    }
  });

  // Local video serving endpoint
  app.get('/api/video/local/:filename', async (req, res) => {
    try {
      const { filename } = req.params;
      const path = await import('path');
      const fs = await import('fs');
      
      const filePath = path.join(process.cwd(), 'uploads', 'videos', filename);
      
      // Check if file exists
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: 'Video file not found' });
      }
      
      // Set appropriate headers for video streaming
      res.setHeader('Content-Type', 'video/mp4');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
      
      // Stream the video file
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
      
    } catch (error) {
      console.error('Error serving local video:', error);
      res.status(500).json({ message: 'Failed to serve video file' });
    }
  });

  // Video download/proxy endpoint
  app.get('/api/video/:videoId/download', isAuthenticated, async (req: any, res) => {
    try {
      const { videoId } = req.params;
      const userId = req.user.id;
      const { action } = req.query; // 'play' or 'download'
      
      // Get video from database
      const videos = await dbStorage.getUserVideos(userId, 100, 0); // Get enough videos to find the one
      const video = videos.find((v: any) => v.id.toString() === videoId);
      
      if (!video) {
        return res.status(404).json({ message: 'Video not found' });
      }
      
      // Clean the video URL (remove extra quotes if present)
      let videoUrl = video.videoUrl;
      if (typeof videoUrl === 'string' && videoUrl.startsWith('"') && videoUrl.endsWith('"')) {
        videoUrl = videoUrl.slice(1, -1);
      }
      
      console.log('Video download request:', { videoId, action, videoUrl });
      
      // Fetch video from storage/Replicate
      const videoResponse = await fetch(videoUrl);
      if (!videoResponse.ok) {
        console.error('Failed to fetch video:', videoResponse.status, videoResponse.statusText);
        return res.status(404).json({ message: 'Video file not found or expired' });
      }
      
      // Set appropriate headers based on action
      const filename = `video_${videoId}.mp4`;
      res.setHeader('Content-Type', 'video/mp4');
      
      if (action === 'download') {
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      } else {
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Accept-Ranges', 'bytes');
      }
      
      // Get video as buffer and send it
      const buffer = await videoResponse.arrayBuffer();
      res.send(Buffer.from(buffer));
      
    } catch (error: any) {
      console.error('Error handling video download:', error);
      res.status(500).json({ message: 'Failed to process video' });
    }
  });

  // Video proxy endpoint to handle CORS and proper video serving
  app.get('/api/video-proxy', isAuthenticated, async (req: any, res) => {
    try {
      const { url } = req.query;
      
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "Video URL is required" });
      }

      // Validate URL is from trusted sources
      if (!url.includes('replicate.delivery') && !url.includes('replicate.com') && !url.includes('replicate')) {
        return res.status(400).json({ message: "Invalid video source" });
      }

      console.log('Proxying video URL:', url);

      // Fetch the video from the original URL
      const videoResponse = await fetch(url);
      
      if (!videoResponse.ok) {
        throw new Error(`Failed to fetch video: ${videoResponse.status}`);
      }

      // Set proper headers for video streaming
      res.set({
        'Content-Type': videoResponse.headers.get('content-type') || 'video/mp4',
        'Content-Length': videoResponse.headers.get('content-length'),
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'public, max-age=31536000',
      });

      // Stream the video data
      videoResponse.body?.pipe(res);
      
    } catch (error) {
      console.error("Error proxying video:", error);
      res.status(500).json({ message: "Failed to proxy video" });
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

  // User management routes
  app.post('/api/admin/users', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.id;
      const adminUser = await dbStorage.getUser(adminUserId);
      
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const { email, firstName, lastName, password, isAdmin = false } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const user = await dbStorage.createUser({
        email,
        firstName: firstName || null,
        lastName: lastName || null,
        password: hashedPassword,
        isAdmin,
        credits: 50 // Default starting credits
      });

      // Don't return password in response
      const { password: _, ...userWithoutPassword } = user;
      res.status(201).json(userWithoutPassword);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error.constraint === 'users_email_unique') {
        res.status(409).json({ message: "Email already exists" });
      } else {
        res.status(500).json({ message: "Failed to create user" });
      }
    }
  });

  app.patch('/api/admin/users/:id/password', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.id;
      const adminUser = await dbStorage.getUser(adminUserId);
      
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetUserId = req.params.id;
      const { password } = req.body;
      
      if (!password || password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters long" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      await dbStorage.updateUserPassword(targetUserId, hashedPassword);
      res.json({ message: "Password updated successfully" });
    } catch (error) {
      console.error("Error updating user password:", error);
      res.status(500).json({ message: "Failed to update password" });
    }
  });

  app.delete('/api/admin/users/:id', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.id;
      const adminUser = await dbStorage.getUser(adminUserId);
      
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetUserId = req.params.id;
      
      // Prevent admin from deleting themselves
      if (targetUserId === adminUserId.toString()) {
        return res.status(400).json({ message: "Cannot delete your own account" });
      }

      await dbStorage.deleteUser(targetUserId);
      res.json({ message: "User deleted successfully" });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
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

  // Social sharing endpoints
  app.post("/api/social-shares", isAuthenticated, async (req: any, res) => {
    try {
      const { imageId, platform, shareText, hashtags } = req.body;
      const userId = req.user.id;
      
      // Get client IP and user agent
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('User-Agent');
      
      const newSocialShare = await dbStorage.createSocialShare({
        imageId,
        userId,
        platform,
        shareText: shareText || null,
        hashtags: hashtags || null,
        ipAddress,
        userAgent,
      });
      
      res.json(newSocialShare);
    } catch (error) {
      console.error("Error creating social share:", error);
      res.status(500).json({ message: "Failed to record social share" });
    }
  });

  app.get("/api/social-shares/:imageId", async (req, res) => {
    try {
      const { imageId } = req.params;
      const socialShares = await dbStorage.getSocialSharesByImage(parseInt(imageId));
      res.json(socialShares);
    } catch (error) {
      console.error("Error fetching social shares:", error);
      res.status(500).json({ message: "Failed to fetch social shares" });
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

  // Coupon Management Routes
  app.get('/api/admin/coupons', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const coupons = await dbStorage.getCoupons();
      res.json(coupons);
    } catch (error) {
      console.error("Error fetching coupons:", error);
      res.status(500).json({ message: "Failed to fetch coupons" });
    }
  });

  app.post('/api/admin/coupons', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const couponData = insertCouponSchema.parse({
        ...req.body,
        createdBy: userId
      });

      const coupon = await dbStorage.createCoupon(couponData);
      res.json(coupon);
    } catch (error) {
      console.error("Error creating coupon:", error);
      res.status(500).json({ message: "Failed to create coupon" });
    }
  });

  app.put('/api/admin/coupons/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const couponId = parseInt(req.params.id);
      const updates = req.body;

      const coupon = await dbStorage.updateCoupon(couponId, updates);
      res.json(coupon);
    } catch (error) {
      console.error("Error updating coupon:", error);
      res.status(500).json({ message: "Failed to update coupon" });
    }
  });

  app.delete('/api/admin/coupons/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const couponId = parseInt(req.params.id);
      await dbStorage.deleteCoupon(couponId);
      res.json({ message: "Coupon deleted successfully" });
    } catch (error) {
      console.error("Error deleting coupon:", error);
      res.status(500).json({ message: "Failed to delete coupon" });
    }
  });

  // Coupon Batch Management Routes
  app.get('/api/admin/coupon-batches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const batches = await dbStorage.getCouponBatches();
      res.json(batches);
    } catch (error) {
      console.error("Error fetching coupon batches:", error);
      res.status(500).json({ message: "Failed to fetch coupon batches" });
    }
  });

  app.post('/api/admin/coupon-batches', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const batchData = insertCouponBatchSchema.parse({
        ...req.body,
        createdBy: userId.toString()
      });
      
      // Set totalCoupons to quantity for backward compatibility
      if (!batchData.totalCoupons && batchData.quantity) {
        (batchData as any).totalCoupons = batchData.quantity;
      }

      const batch = await dbStorage.createCouponBatch(batchData);
      
      // Start generating coupons asynchronously
      setTimeout(async () => {
        try {
          await dbStorage.generateCouponsForBatch(batch.id);
        } catch (error) {
          console.error("Error generating coupons for batch:", error);
        }
      }, 100);

      res.json(batch);
    } catch (error) {
      console.error("Error creating coupon batch:", error);
      res.status(500).json({ message: "Failed to create coupon batch" });
    }
  });

  app.delete('/api/admin/coupon-batches/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const batchId = parseInt(req.params.id);
      await dbStorage.deleteCouponBatch(batchId);
      res.json({ message: "Coupon batch deleted successfully" });
    } catch (error) {
      console.error("Error deleting coupon batch:", error);
      res.status(500).json({ message: "Failed to delete coupon batch" });
    }
  });

  // Notification API endpoints
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await notificationService.getUserNotifications(userId, page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const notificationId = parseInt(req.params.id);
      
      await notificationService.markAsRead(notificationId, userId);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.patch('/api/notifications/mark-all-read', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      
      await notificationService.markAllAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ message: "Failed to mark all notifications as read" });
    }
  });

  app.delete('/api/notifications/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const notificationId = parseInt(req.params.id);
      
      await notificationService.deleteNotification(notificationId, userId);
      res.json({ message: "Notification deleted" });
    } catch (error) {
      console.error("Error deleting notification:", error);
      res.status(500).json({ message: "Failed to delete notification" });
    }
  });

  app.get('/api/user/activities', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      
      const result = await notificationService.getUserActivity(userId, page, limit);
      res.json(result);
    } catch (error) {
      console.error("Error fetching user activities:", error);
      res.status(500).json({ message: "Failed to fetch user activities" });
    }
  });

  app.patch('/api/user/email-notifications', isAuthenticated, async (req: any, res) => {
    try {
      const userId = (req.session as any)?.userId;
      const { enabled } = req.body;
      
      await notificationService.toggleEmailNotifications(userId, enabled);
      res.json({ message: "Email notification settings updated" });
    } catch (error) {
      console.error("Error updating email notification settings:", error);
      res.status(500).json({ message: "Failed to update email notification settings" });
    }
  });

  // User Coupon Redemption Routes
  app.post('/api/coupons/redeem', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const { code } = req.body;
      const ipAddress = req.ip || req.connection?.remoteAddress;

      if (!code || typeof code !== 'string') {
        return res.status(400).json({ message: "Coupon code is required" });
      }

      const result = await dbStorage.redeemCoupon(userId, code.trim().toUpperCase(), ipAddress);
      
      if (result.success) {
        res.json(result);
      } else {
        res.status(400).json(result);
      }
    } catch (error) {
      console.error("Error redeeming coupon:", error);
      res.status(500).json({ message: "Failed to redeem coupon" });
    }
  });

  app.get('/api/coupons/my-redemptions', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const redemptions = await dbStorage.getUserCouponRedemptions(userId);
      res.json(redemptions);
    } catch (error) {
      console.error("Error fetching user coupon redemptions:", error);
      res.status(500).json({ message: "Failed to fetch coupon redemptions" });
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
          const amount = paymentIntent.amount / 100; // Convert from cents to dollars
          
          if (userId && credits) {
            try {
              await dbStorage.assignCreditsToUser(
                userId, 
                credits, 
                `Credit purchase - Payment ID: ${paymentIntent.id}`
              );
              
              // Log activity and send notification
              await notificationService.logActivity({
                userId: parseInt(userId),
                action: 'credits_purchased',
                details: { credits, amount, paymentIntentId: paymentIntent.id }
              });

              await notificationService.sendCreditsPurchasedNotification(parseInt(userId), credits, amount);
              
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

  // SMTP Settings Admin Routes
  app.get('/api/admin/smtp-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const settings = await dbStorage.getSmtpSettings();
      res.json(settings);
    } catch (error) {
      console.error("Error fetching SMTP settings:", error);
      res.status(500).json({ message: "Failed to fetch SMTP settings" });
    }
  });

  app.post('/api/admin/smtp-settings', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const settingsData = insertSmtpSettingsSchema.parse(req.body);
      const settings = await dbStorage.createSmtpSettings(settingsData);
      res.json(settings);
    } catch (error) {
      console.error("Error creating SMTP settings:", error);
      res.status(500).json({ message: "Failed to create SMTP settings" });
    }
  });

  app.put('/api/admin/smtp-settings/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const settingsId = parseInt(req.params.id);
      const updates = insertSmtpSettingsSchema.partial().parse(req.body);
      const settings = await dbStorage.updateSmtpSettings(settingsId, updates);
      res.json(settings);
    } catch (error) {
      console.error("Error updating SMTP settings:", error);
      res.status(500).json({ message: "Failed to update SMTP settings" });
    }
  });

  app.post('/api/admin/smtp-settings/:id/test', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.id;
      const user = await dbStorage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const settingsId = parseInt(req.params.id);
      const settings = await dbStorage.getSmtpSettings();
      
      if (!settings || settings.id !== settingsId) {
        return res.status(404).json({ message: "SMTP settings not found" });
      }

      // Test SMTP connection
      let testResult = { success: false, message: '' };
      
      try {
        // Try to import nodemailer dynamically
        let nodemailer;
        try {
          nodemailer = await import('nodemailer');
        } catch (error) {
          console.log('Nodemailer not available, performing basic validation test');
          
          // If nodemailer is not available, perform basic validation
          if (!settings.host || !settings.port || !settings.username || !settings.password) {
            testResult = { success: false, message: 'SMTP configuration incomplete. Please check all required fields.' };
          } else if (settings.port < 1 || settings.port > 65535) {
            testResult = { success: false, message: 'Invalid port number. Port must be between 1 and 65535.' };
          } else if (!settings.fromEmail || !settings.fromEmail.includes('@')) {
            testResult = { success: false, message: 'Invalid from email address format.' };
          } else {
            testResult = { success: true, message: 'SMTP configuration validated successfully. Install nodemailer package for full connection testing.' };
          }
          
          // Skip nodemailer testing and go to database update
          await dbStorage.testSmtpSettings(settingsId, testResult);
          return res.json(testResult);
        }
        
        // Nodemailer is available, use it for full testing
        const transporter = nodemailer.default.createTransporter({
          host: settings.host,
          port: settings.port,
          secure: settings.secure,
          auth: {
            user: settings.username,
            pass: settings.password,
          },
        });

        // Verify connection
        await transporter.verify();
        
        // Send test email
        await transporter.sendMail({
          from: `"${settings.fromName}" <${settings.fromEmail}>`,
          to: settings.fromEmail, // Send test email to the configured from email
          subject: 'SMTP Configuration Test - VisuoGen',
          html: `
            <h2>SMTP Test Successful</h2>
            <p>This is a test email to verify your SMTP configuration is working correctly.</p>
            <p>Configuration details:</p>
            <ul>
              <li>Host: ${settings.host}</li>
              <li>Port: ${settings.port}</li>
              <li>Secure: ${settings.secure}</li>
              <li>From: ${settings.fromName} &lt;${settings.fromEmail}&gt;</li>
            </ul>
            <p>Test sent at: ${new Date().toISOString()}</p>
          `
        });

        testResult = { success: true, message: 'SMTP connection successful and test email sent' };
      } catch (error) {
        console.error('SMTP test error:', error);
        testResult = { success: false, message: error.message };
      }

      // Update test results in database
      await dbStorage.testSmtpSettings(settingsId, testResult);
      
      res.json(testResult);
    } catch (error) {
      console.error("Error testing SMTP settings:", error);
      res.status(500).json({ message: "Failed to test SMTP settings" });
    }
  });

  // Video migration endpoint to move existing videos to local storage
  app.post('/api/admin/migrate-videos', isAuthenticated, async (req: any, res) => {
    try {
      const user = await dbStorage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      console.log('Starting video migration to local storage...');
      
      // Get all user videos from database
      const allUserVideos = await dbStorage.getAllVideos(); // We need to implement this method
      let migratedCount = 0;
      let failedCount = 0;
      const results = [];

      for (const video of allUserVideos) {
        try {
          // Skip if already using local storage
          if (video.videoUrl.includes('/api/video/local/')) {
            console.log(`Video ${video.id} already using local storage, skipping`);
            continue;
          }

          // Clean the video URL (remove extra quotes if present)
          let videoUrl = video.videoUrl;
          if (typeof videoUrl === 'string' && videoUrl.startsWith('"') && videoUrl.endsWith('"')) {
            videoUrl = videoUrl.slice(1, -1);
          }

          console.log(`Migrating video ${video.id} from ${videoUrl}`);

          // Use storage service to download and store locally
          const { StorageService } = await import('./storageService');
          const storageService = new StorageService({}, 'local');
          
          const uploadResult = await storageService.uploadVideoFromUrl(
            videoUrl,
            `migrated_video_${video.id}_${Date.now()}.mp4`
          );

          // Update video URL in database
          await dbStorage.updateVideoUrl(video.id, uploadResult.url);
          
          migratedCount++;
          results.push({ 
            videoId: video.id, 
            status: 'success', 
            oldUrl: videoUrl,
            newUrl: uploadResult.url 
          });
          console.log(`Successfully migrated video ${video.id} to local storage`);

        } catch (error) {
          failedCount++;
          results.push({ 
            videoId: video.id, 
            status: 'failed', 
            error: error.message 
          });
          console.error(`Failed to migrate video ${video.id}:`, error);
        }
      }

      console.log(`Migration completed: ${migratedCount} successful, ${failedCount} failed`);
      
      res.json({
        message: `Video migration completed`,
        migrated: migratedCount,
        failed: failedCount,
        results
      });

    } catch (error) {
      console.error("Error migrating videos:", error);
      res.status(500).json({ message: "Failed to migrate videos" });
    }
  });

  // Analytics endpoints
  app.get("/api/admin/analytics/dashboard", isAuthenticated, async (req: any, res) => {
    try {
      const user = await dbStorage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const days = parseInt(req.query.days as string) || 30;
      const dashboardStats = await analyticsService.getDashboardStats(days);
      res.json(dashboardStats);
    } catch (error) {
      console.error("Error fetching analytics dashboard:", error);
      res.status(500).json({ message: "Failed to fetch analytics data" });
    }
  });

  app.get("/api/admin/analytics/realtime", isAuthenticated, async (req: any, res) => {
    try {
      const user = await dbStorage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const realtimeStats = await analyticsService.getRealTimeStats();
      res.json(realtimeStats);
    } catch (error) {
      console.error("Error fetching real-time analytics:", error);
      res.status(500).json({ message: "Failed to fetch real-time data" });
    }
  });

  app.get("/api/admin/analytics/models", isAuthenticated, async (req: any, res) => {
    try {
      const user = await dbStorage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const days = parseInt(req.query.days as string) || 30;
      const topModels = await analyticsService.getTopModels(days);
      res.json(topModels);
    } catch (error) {
      console.error("Error fetching model analytics:", error);
      res.status(500).json({ message: "Failed to fetch model data" });
    }
  });

  app.get("/api/admin/analytics/users", isAuthenticated, async (req: any, res) => {
    try {
      const user = await dbStorage.getUser(req.user.id);
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const days = parseInt(req.query.days as string) || 30;
      const userBehavior = await analyticsService.getUserBehavior(days);
      res.json(userBehavior);
    } catch (error) {
      console.error("Error fetching user analytics:", error);
      res.status(500).json({ message: "Failed to fetch user behavior data" });
    }
  });

  // Track analytics events
  app.post("/api/analytics/track", async (req, res) => {
    try {
      const { eventType, eventData, sessionId } = req.body;
      
      const analyticsData = {
        userId: req.user?.id || null,
        sessionId: sessionId || null,
        eventType,
        eventData,
        userAgent: req.headers["user-agent"] || null,
        ipAddress: req.ip || req.connection.remoteAddress || null,
        referrer: req.headers.referer || null,
        country: null, // Could be enhanced with IP geolocation
      };

      await analyticsService.trackEvent(analyticsData);
      res.json({ success: true });
    } catch (error) {
      console.error("Error tracking analytics event:", error);
      res.status(500).json({ message: "Failed to track event" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
