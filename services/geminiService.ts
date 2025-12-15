
import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    throw new Error("API_KEY is not defined in the environment.");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Generates a realistic image based on a sketch and a prompt using Gemini 2.5 Flash Image.
 * This utilizes the image-to-image (editing/generation) capabilities.
 */
export const generateImageFromSketch = async (
  base64Sketch: string,
  userPrompt: string,
  style: string = 'Realistic'
): Promise<{ text?: string; imageUrl?: string }> => {
  const ai = getClient();
  
  // Clean the base64 string if it contains metadata header
  const cleanBase64 = base64Sketch.replace(/^data:image\/(png|jpeg|jpg);base64,/, '');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            text: `You are an expert digital artist. Your task is to transform the attached rough sketch into a high-quality, detailed image.
            
            Target Style: ${style}
            User Description: "${userPrompt}"
            
            Instructions:
            1. Strictly adhere to the "${style}" art style.
            2. Preserve the composition, perspective, and key structural elements of the sketch.
            3. Replace rough lines with realistic textures, lighting, and high-quality rendering suitable for the requested style.
            4. If the description is empty, interpret the subject solely from the visual sketch but apply the target style.
            5. Return ONLY the generated image if possible, or a very brief confirmation text.`
          },
          {
            inlineData: {
              mimeType: 'image/png',
              data: cleanBase64
            }
          }
        ]
      },
      config: {
        // We do not set responseMimeType for image generation models typically unless specific JSON is needed, 
        // but here we expect an image in the parts.
      }
    });

    let resultText = "";
    let resultImage = "";

    // Parse response
    if (response.candidates && response.candidates[0].content && response.candidates[0].content.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          resultImage = `data:image/png;base64,${part.inlineData.data}`;
        } else if (part.text) {
          resultText += part.text;
        }
      }
    }

    return { text: resultText, imageUrl: resultImage };

  } catch (error) {
    console.error("Gemini API Error:", error);
    throw error;
  }
};
