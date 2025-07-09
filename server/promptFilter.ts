import { storage } from "./storage";

export interface FilterResult {
  isAllowed: boolean;
  blockedWords: string[];
  severity: 'mild' | 'moderate' | 'severe' | null;
}

export async function filterPrompt(prompt: string): Promise<FilterResult> {
  try {
    // Get active bad words from database
    const badWords = await storage.getActiveBadWords();
    
    if (badWords.length === 0) {
      return {
        isAllowed: true,
        blockedWords: [],
        severity: null
      };
    }

    // Normalize prompt for checking
    const normalizedPrompt = prompt.toLowerCase().trim();
    
    // Check for bad words
    const foundBadWords: string[] = [];
    let highestSeverity: 'mild' | 'moderate' | 'severe' | null = null;
    
    for (const badWord of badWords) {
      const wordPattern = new RegExp(`\\b${badWord.word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      
      if (wordPattern.test(normalizedPrompt)) {
        foundBadWords.push(badWord.word);
        
        // Track highest severity
        if (!highestSeverity || 
            (badWord.severity === 'severe') ||
            (badWord.severity === 'moderate' && highestSeverity === 'mild')) {
          highestSeverity = badWord.severity as 'mild' | 'moderate' | 'severe';
        }
      }
    }

    return {
      isAllowed: foundBadWords.length === 0,
      blockedWords: foundBadWords,
      severity: highestSeverity
    };
    
  } catch (error) {
    console.error("Error filtering prompt:", error);
    // If there's an error, allow the prompt to prevent system failure
    return {
      isAllowed: true,
      blockedWords: [],
      severity: null
    };
  }
}

export function getFilterErrorMessage(result: FilterResult): string {
  if (result.isAllowed) {
    return "";
  }

  const wordCount = result.blockedWords.length;
  const wordText = wordCount === 1 ? "word" : "words";
  const wordsDisplay = result.blockedWords.slice(0, 3).map(word => `"${word}"`).join(", ");
  const extraText = wordCount > 3 ? ` and ${wordCount - 3} more` : "";

  switch (result.severity) {
    case 'severe':
      return `Your prompt contains inappropriate content and cannot be processed. Please revise your prompt and try again.`;
    case 'moderate':
      return `Your prompt contains prohibited ${wordText} (${wordsDisplay}${extraText}) that cannot be used. Please modify your prompt and try again.`;
    case 'mild':
      return `Please avoid using the ${wordText} (${wordsDisplay}${extraText}) in your prompt. Try rephrasing your request.`;
    default:
      return `Your prompt contains content that cannot be processed. Please revise and try again.`;
  }
}