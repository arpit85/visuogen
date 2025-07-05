// Test script for getAIService function
import { getAIService } from './server/aiServices.js';

async function testAIServiceFlow() {
  try {
    console.log("Testing getAIService flow for model ID 2 (Midjourney)...");
    
    // Test the exact flow that happens in the generation endpoint
    const aiService = await getAIService(2);
    console.log("AI Service created successfully:", aiService.constructor.name);
    
    const generationParams = {
      prompt: "test prompt",
      size: "1024x1024",
      quality: "standard",
      style: "Photorealistic",
    };
    
    console.log("Generation params:", generationParams);
    
    const result = await aiService.generateImage(generationParams);
    console.log("Generation result:", result);
    
  } catch (error) {
    console.error("Error in AI service flow:", error.message);
    console.error("Full error:", error);
  }
}

testAIServiceFlow();