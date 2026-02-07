
import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult } from "../types";
import { CATEGORIES } from "../constants";

// Always use const ai = new GoogleGenAI({apiKey: process.env.API_KEY});
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Performs high-speed OCR using Gemini 3 Flash.
 * Optimized for Al Saqr Welding & Blacksmith LLC's business workflow.
 */
export const performOCR = async (base64Image: string): Promise<OCRResult> => {
  const model = "gemini-3-flash-preview";
  
  const categoriesList = CATEGORIES.join(", ");
  
  const response = await ai.models.generateContent({
    model,
    contents: {
      parts: [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Image.split(',')[1] || base64Image,
          },
        },
        {
          text: `OCR Task for Al Saqr Welding.
Extract exactly:
1. Vendor (Name)
2. Date (YYYY-MM-DD)
3. Total Amount (Number)
4. Items: [{description, quantity, price}]
Categorize as one of: [${categoriesList}].
Return JSON only. Accuracy is critical.`,
        },
      ],
    },
    config: {
      responseMimeType: "application/json",
      thinkingConfig: { thinkingBudget: 0 }, // Disable thinking for maximum speed
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          date: { type: Type.STRING },
          vendor: { type: Type.STRING },
          amount: { type: Type.NUMBER },
          currency: { type: Type.STRING },
          category: { type: Type.STRING },
          items: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                quantity: { type: Type.NUMBER },
                price: { type: Type.NUMBER }
              },
              required: ['description', 'quantity', 'price']
            }
          }
        },
        required: ['date', 'vendor', 'amount', 'currency', 'category', 'items'],
      },
    },
  });

  try {
    const text = response.text || "{}";
    const result = JSON.parse(text) as OCRResult;
    
    if (!CATEGORIES.includes(result.category)) {
      const bestMatch = CATEGORIES.find(c => 
        result.category.toLowerCase().includes(c.toLowerCase()) || 
        c.toLowerCase().includes(result.category.toLowerCase())
      );
      result.category = bestMatch || 'Others';
    }
    
    return result;
  } catch (e) {
    console.error("Fast OCR failed", e);
    return {
      date: new Date().toISOString().split('T')[0],
      vendor: 'Check Receipt Manually',
      amount: 0,
      currency: 'AED',
      category: 'Others',
      items: []
    };
  }
};

export const chatWithAssistant = async (history: { role: 'user' | 'model', parts: { text: string }[] }[], message: string) => {
  const model = "gemini-3-pro-preview";
  const chat = ai.chats.create({
    model,
    history: history,
    config: {
      systemInstruction: "Al Saqr Finance Assistant. Professional, precise.",
      thinkingConfig: { thinkingBudget: 8000 }
    }
  });
  const response = await chat.sendMessage({ message });
  return response.text;
};
