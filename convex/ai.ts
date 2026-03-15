import { action } from "./_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const generateSchema = action({
  args: { prompt: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("Unauthenticated");
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is not set in environment variables");
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
      systemInstruction: "You are an expert backend API designer. Focus purely on returning a valid JSON object matching the JSON Schema specification (draft-07 or newer). DO NOT wrap your response in markdown code blocks, do not include any conversational text. Return ONLY raw JSON.",
    });

    try {
      const result = await model.generateContent(
        `Create a JSON schema for the following prompt: ${args.prompt}. Include clear types, properties, and an array of required fields if applicable.`
      );

      const text = result.response.text();
      
      // Robustly extract JSON from potential markdown blocks
      let cleaned = text;
      const jsonMatch = text.match(/```json?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        cleaned = jsonMatch[1];
      } else {
        // Fallback for cases where it's not in blocks but might have stray chars
        cleaned = text.replace(/```json/g, "").replace(/```/g, "");
      }
      
      cleaned = cleaned.trim();

      // Ensure it parses correctly to valid JSON
      JSON.parse(cleaned);

      return cleaned;
    } catch (error) {
      throw new Error("Failed to generate schema: " + (error as Error).message);
    }
  },
});
