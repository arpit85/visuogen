import { db } from "./db";
import { plans, aiModels } from "@shared/schema";

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

    // Create sample AI models
    const insertedModels = await db.insert(aiModels).values([
      {
        name: 'DALL-E 3',
        description: 'OpenAI\'s latest image generation model with high quality and prompt adherence',
        creditCost: 3,
        maxResolution: '1792x1024',
        averageGenerationTime: 30,
        isActive: true
      },
      {
        name: 'Midjourney (PiAPI)',
        description: 'Artistic and creative image generation with exceptional quality',
        creditCost: 2,
        maxResolution: '1024x1024', 
        averageGenerationTime: 60,
        isActive: false
      },
      {
        name: 'Stable Diffusion',
        description: 'Fast and versatile image generation with great customization options',
        creditCost: 1,
        maxResolution: '1024x1024',
        averageGenerationTime: 15,
        isActive: false
      }
    ]).onConflictDoNothing().returning();

    console.log(`Created ${insertedModels.length} AI models`);
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