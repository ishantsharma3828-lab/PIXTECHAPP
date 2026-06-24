
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY as string });

export async function generateTitles(prompt: string): Promise<string[]> {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `You are a creative director for a social media influencer. Your task is to generate 5 short, punchy, and professional titles for an Instagram Reel. The titles should be in Arabic. They need to be intriguing and make people want to click. The topic of the reel is: "${prompt}". The style should be similar to these examples: 'أفضل كنترولر', 'خمن المنتج', 'هل تعرف هالمعلومة؟'. Return the response as a JSON object with a single key 'titles' which is an array of strings. For example: {\"titles\": [\"عنوان ١\", \"عنوان ٢\"]}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            titles: {
              type: Type.ARRAY,
              items: {
                type: Type.STRING,
                description: "A catchy title for the reel."
              }
            }
          }
        }
      }
    });

    const jsonText = response.text.trim();
    const result = JSON.parse(jsonText);

    if (result && Array.isArray(result.titles)) {
      return result.titles;
    } else {
      console.error("Unexpected JSON structure:", result);
      return [];
    }
  } catch (error) {
    console.error("Error calling Gemini API:", error);
    throw new Error("Failed to generate titles from AI.");
  }
}
