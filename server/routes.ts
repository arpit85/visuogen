import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { 
  insertPlanSchema, 
  insertAiModelSchema, 
  insertImageSchema,
  insertCreditTransactionSchema,
  type InsertImage 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Auth middleware
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Plans API
  app.get('/api/plans', async (req, res) => {
    try {
      const plans = await storage.getPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching plans:", error);
      res.status(500).json({ message: "Failed to fetch plans" });
    }
  });

  app.post('/api/admin/plans', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const planData = insertPlanSchema.parse(req.body);
      const plan = await storage.createPlan(planData);
      res.json(plan);
    } catch (error) {
      console.error("Error creating plan:", error);
      res.status(500).json({ message: "Failed to create plan" });
    }
  });

  app.patch('/api/admin/plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const planId = parseInt(req.params.id);
      const updates = insertPlanSchema.partial().parse(req.body);
      const plan = await storage.updatePlan(planId, updates);
      res.json(plan);
    } catch (error) {
      console.error("Error updating plan:", error);
      res.status(500).json({ message: "Failed to update plan" });
    }
  });

  app.delete('/api/admin/plans/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const planId = parseInt(req.params.id);
      await storage.deletePlan(planId);
      res.json({ message: "Plan deleted successfully" });
    } catch (error) {
      console.error("Error deleting plan:", error);
      res.status(500).json({ message: "Failed to delete plan" });
    }
  });

  // AI Models API
  app.get('/api/ai-models', isAuthenticated, async (req, res) => {
    try {
      const models = await storage.getActiveAiModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching AI models:", error);
      res.status(500).json({ message: "Failed to fetch AI models" });
    }
  });

  app.post('/api/admin/ai-models', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const modelData = insertAiModelSchema.parse(req.body);
      const model = await storage.createAiModel(modelData);
      res.json(model);
    } catch (error) {
      console.error("Error creating AI model:", error);
      res.status(500).json({ message: "Failed to create AI model" });
    }
  });

  app.patch('/api/admin/ai-models/:id', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const modelId = parseInt(req.params.id);
      const updates = insertAiModelSchema.partial().parse(req.body);
      const model = await storage.updateAiModel(modelId, updates);
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
      
      const images = await storage.getUserImages(userId, limit, offset);
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
      const model = await storage.getAiModel(validModelId);
      if (!model || !model.isActive) {
        return res.status(400).json({ message: "Invalid AI model" });
      }

      // Check if user has enough credits
      const userCredits = await storage.getUserCredits(userId);
      if (userCredits < model.creditCost) {
        return res.status(400).json({ message: "Insufficient credits" });
      }

      // Simulate AI image generation (in real app, call actual AI service)
      const mockImageUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&h=600&seed=${Date.now()}`;
      
      // Create image record
      const imageData: InsertImage = {
        userId,
        modelId: validModelId,
        prompt: validPrompt,
        imageUrl: mockImageUrl,
        settings: validSettings,
      };

      const image = await storage.createImage(imageData);

      // Spend credits
      await storage.spendCredits(
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

  app.patch('/api/images/:id/favorite', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const imageId = parseInt(req.params.id);
      
      // Verify image belongs to user
      const image = await storage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      const updatedImage = await storage.toggleImageFavorite(imageId);
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
      const image = await storage.getImage(imageId);
      if (!image || image.userId !== userId) {
        return res.status(404).json({ message: "Image not found" });
      }

      await storage.deleteImage(imageId);
      res.json({ message: "Image deleted successfully" });
    } catch (error) {
      console.error("Error deleting image:", error);
      res.status(500).json({ message: "Failed to delete image" });
    }
  });

  // Credits API
  app.get('/api/credits', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const credits = await storage.getUserCredits(userId);
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
      
      const transactions = await storage.getCreditTransactions(userId, limit);
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
      const images = await storage.getUserImages(userId, 1000); // Get all user images for stats
      const transactions = await storage.getCreditTransactions(userId, 1000);
      
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
        ? await storage.getAiModel(Number(favoriteModelId))
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
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const [totalUsers, activeSubscriptions, imagesGenerated, monthlyRevenue] = await Promise.all([
        storage.getUserCount(),
        storage.getActiveSubscriptionCount(),
        storage.getTotalImagesGenerated(),
        storage.getMonthlyRevenue(),
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
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const limit = parseInt(req.query.limit as string) || 50;
      const offset = parseInt(req.query.offset as string) || 0;
      
      const users = await storage.getAllUsers(limit, offset);
      res.json(users);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/admin/users/:id/credits', isAuthenticated, async (req: any, res) => {
    try {
      const adminUserId = req.user.claims.sub;
      const adminUser = await storage.getUser(adminUserId);
      
      if (!adminUser?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const targetUserId = req.params.id;
      const { credits } = req.body;
      
      if (typeof credits !== 'number' || credits < 0) {
        return res.status(400).json({ message: "Invalid credits amount" });
      }

      await storage.updateUserCredits(targetUserId, credits);
      res.json({ message: "Credits updated successfully" });
    } catch (error) {
      console.error("Error updating user credits:", error);
      res.status(500).json({ message: "Failed to update credits" });
    }
  });

  app.get('/api/admin/ai-models', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      
      if (!user?.isAdmin) {
        return res.status(403).json({ message: "Admin access required" });
      }

      const models = await storage.getAiModels();
      res.json(models);
    } catch (error) {
      console.error("Error fetching admin AI models:", error);
      res.status(500).json({ message: "Failed to fetch AI models" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
