
import { GoogleGenAI, Type } from "@google/genai";
import { OCRResult } from "../types";
import { CATEGORIES } from "../constants";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * ULTRA TURBO OCR ENGINE v3.0 - Industrial Strength
 * Optimized for Al Saqr Welding. Extreme precision on line items.
 */
export const performOCR = async (base64Image: string): Promise<OCRResult> => {
  const model = "gemini-3-flash-preview";
  const catList = CATEGORIES.join(",");
  
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
        { text: "EXTRACT_DATA" },
      ],
    },
    config: {
      systemInstruction: `You are a high-speed industrial OCR engine. 
Output strictly JSON. 
Detect: Date(YYYY-MM-DD), Vendor, Total Amount(Float), Currency, Category(one of: [${catList}]), and Line Items.
For items: [{description: string, quantity: number, price: number}].
If handwriting or blurry, use best professional guess. Total must be numeric.`,
      responseMimeType: "application/json",
      temperature: 0, 
      maxOutputTokens: 1000,
    },
  });

  try {
    const text = response.text || "{}";
    const result = JSON.parse(text) as OCRResult;
    
    // Numeric sanitation for industrial reliability
    const sanitizeNum = (val: any) => {
      if (typeof val === 'number') return val;
      const parsed = parseFloat(String(val).replace(/[^0-9.]/g, ''));
      return isNaN(parsed) ? 0 : parsed;
    };

    result.amount = sanitizeNum(result.amount);
    
    if (result.items) {
      result.items = result.items.map(item => ({
        description: item.description || 'Unknown Item',
        quantity: sanitizeNum(item.quantity) || 1,
        price: sanitizeNum(item.price) || 0
      }));
    } else {
      result.items = [];
    }

    // Fallback category logic
    if (!CATEGORIES.includes(result.category)) {
      result.category = CATEGORIES.find(c => 
        result.category?.toLowerCase().includes(c.toLowerCase())
      ) || 'Others';
    }
    
    return result;
  } catch (e) {
    console.error("OCR Parse Failure:", e);
    return {
      date: new Date().toISOString().split('T')[0],
      vendor: 'Manual Correction Required',
      amount: 0,
      currency: 'AED',
      category: 'Others',
      items: []
    };
  }
};

export const chatWithAssistant = async (history: { role: 'user' | 'model', parts: { text: string }[] }[], message: string) => {
  const model = "gemini-3-flash-preview";
  const chat = ai.chats.create({
    model,
    history: history,
    config: {
      systemInstruction: "You are the Al Saqr Finance Assistant. Fast, direct, industrial tone. Expert in UAE labor law and site expenses.",
    }
  });
  const response = await chat.sendMessage({ message });
  return response.text;
};
