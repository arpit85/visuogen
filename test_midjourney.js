// Test script for Midjourney API
import fetch from 'node-fetch';

async function testMidjourneyAPI() {
  try {
    console.log("Testing Midjourney PiAPI connection...");
    
    const apiKey = process.env.PIAPI_API_KEY;
    if (!apiKey) {
      console.error("PIAPI_API_KEY not found in environment variables");
      return;
    }
    
    console.log("API Key exists, length:", apiKey.length);
    console.log("API Key prefix:", apiKey.substring(0, 8) + "...");
    
    const requestBody = {
      model: "midjourney",
      task_type: "imagine",
      input: {
        prompt: "test prompt",
        aspect_ratio: "1:1",
        process_mode: "fast",
        skip_prompt_check: false
      },
      config: {
        service_mode: "public"
      }
    };
    
    console.log("Request body:", JSON.stringify(requestBody, null, 2));
    
    const response = await fetch("https://api.piapi.ai/api/v1/task", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    
    console.log("Response status:", response.status);
    console.log("Response statusText:", response.statusText);
    console.log("Response headers:", Object.fromEntries(response.headers));
    
    const responseText = await response.text();
    console.log("Response body:", responseText);
    
    if (!response.ok) {
      console.error("Request failed with status:", response.status);
    } else {
      console.log("Request successful!");
    }
    
  } catch (error) {
    console.error("Error testing Midjourney API:", error);
  }
}

testMidjourneyAPI();