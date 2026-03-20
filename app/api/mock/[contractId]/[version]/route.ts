import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { GoogleGenerativeAI } from "@google/generative-ai";

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  generationConfig: { responseMimeType: "application/json" }
});

const rateLimiter = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT_SEC = 60;
const MAX_REQUESTS = 100;

function checkRateLimit(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("x-real-ip") ||
    "127.0.0.1";
  const now = Date.now();

  const record = rateLimiter.get(ip);
  if (!record || (now - record.timestamp) > RATE_LIMIT_SEC * 1000) {
    rateLimiter.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (record.count >= MAX_REQUESTS) {
    return false;
  }

  record.count++;
  return true;
}

async function getVersionSchema(
  contractId: string,
  versionNumberStr: string
): Promise<{ schema: any; error?: string; status?: number }> {
  const versionNum = parseInt(versionNumberStr, 10);
  if (isNaN(versionNum)) {
    return { schema: {}, error: "Invalid version parameter", status: 400 };
  }

  try {
    const schemaData = await fetchQuery(api.public.getVersionSchema, {
      contractId: contractId as Id<"contracts">,
      versionNumber: versionNum,
    });

    if (!schemaData) {
      return { schema: {}, error: "Version not found", status: 404 };
    }

    if (schemaData.isDisabled) {
      return { schema: {}, error: "This endpoint has been disabled by the owner.", status: 403 };
    }

    return { schema: JSON.parse(schemaData.schema) };
  } catch (e) {
    return { schema: {}, error: "Invalid contract or version ID formatting", status: 400 };
  }
}

/**
 * Smart Rule-Based Data Generator
 * Infers field meanings from property names and descriptions 
 * to generate realistic baseline data.
 */
function generateSmartMock(schema: any, propName: string = ""): any {
  if (!schema) return null;

  const type = schema.type;
  const name = propName.toLowerCase();
  const desc = (schema.description || "").toLowerCase();

  // If the schema requires specific examples, use them as baseline
  if (schema.example) return schema.example;
  if (schema.examples && Array.isArray(schema.examples) && schema.examples.length > 0) {
    return schema.examples[0];
  }

  // Handle Arrays
  if (type === "array") {
    const items = [];
    const minItems = schema.minItems || 2;
    for (let i = 0; i < minItems; i++) {
      items.push(generateSmartMock(schema.items || {}, propName));
    }
    return items;
  }

  // Handle Objects
  if (type === "object" || schema.properties) {
    const obj: any = {};
    if (schema.properties) {
      for (const [key, value] of Object.entries(schema.properties)) {
        obj[key] = generateSmartMock(value, key);
      }
    }
    return obj;
  }

  // Handle Strings
  if (type === "string") {
    if (schema.enum && Array.isArray(schema.enum)) {
      return schema.enum[0];
    }
    if (name.includes("email") || desc.includes("email")) return "user123@gmail.com";
    if (name.includes("first") && name.includes("name")) return "John";
    if (name.includes("last") && name.includes("name")) return "Doe";
    if (name.includes("name") || desc.includes("name")) return "Wireless Bluetooth Headphones";
    if (name.includes("desc") || desc.includes("desc")) return "High quality wireless headphones with noise cancellation";
    if (name.includes("city") || desc.includes("city") || name.includes("location") || desc.includes("location")) return "Mumbai";
    if (name.includes("url") || name.includes("link") || desc.includes("url") || desc.includes("link")) return "https://example.com/item";
    if (name.includes("uuid") || name.includes("id")) return "a1b2c3d4-e5f6-7890-1234-56789abcdef0";
    if (name.includes("date") || desc.includes("date")) return new Date().toISOString().split('T')[0];
    if (name.includes("time") || desc.includes("time")) return new Date().toISOString();
    if (name.includes("avatar") || name.includes("image")) return "https://example.com/avatar.jpg";
    if (name.includes("phone")) return "+1-555-0198";
    if (name.includes("status")) return "active";

    return "Sample text";
  }

  // Handle Numbers & Integers
  if (type === "number" || type === "integer") {
    const min = schema.minimum !== undefined ? schema.minimum : 1;
    const max = schema.maximum !== undefined ? schema.maximum : 1000;

    // Semantic rules
    if (name.includes("price") || desc.includes("price") || name.includes("cost") || desc.includes("cost")) {
      return Math.floor(Math.random() * (5000 - 100 + 1)) + 100;
    }
    if (name.includes("age") || desc.includes("age")) {
      return Math.floor(Math.random() * (65 - 18 + 1)) + 18;
    }
    if (name.includes("stock") || name.includes("qty") || name.includes("quantity")) {
      return type === "integer" ? Math.floor(Math.random() * 100) : +(Math.random() * 100).toFixed(2);
    }
    if (name.includes("rating")) return +(Math.random() * (5 - 1) + 1).toFixed(1);

    // Default random bounds
    if (type === "integer") {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
    return Math.floor((Math.random() * (max - min) + min) * 100) / 100;
  }

  // Handle Booleans
  if (type === "boolean") {
    if (name.includes("active") || name.includes("enabled") || name.includes("is") || name.includes("has")) return true;
    return Math.random() > 0.5;
  }

  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: { contractId: string; version: string } }
) {
  if (!checkRateLimit(request)) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  let contractId, version;
  try {
    const paramsResult = await context.params;
    contractId = paramsResult.contractId;
    version = paramsResult.version;
  } catch (err) {
    // some next setups don't need await for context.params
    contractId = context.params.contractId;
    version = context.params.version;
  }

  const { schema, error, status } = await getVersionSchema(contractId, version);
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const { searchParams } = new URL(request.url);
    const countParam = searchParams.get("count");
    const count = countParam ? parseInt(countParam, 10) : null;
    let modeParam = searchParams.get("mode") || "realistic"; // optional mode

    // Stage 1: Baseline Context-Aware Generation
    let baselineMock: any;
    if (schema.type === "object" && count && count > 0) {
      baselineMock = [];
      for (let i = 0; i < count; i++) {
        baselineMock.push(generateSmartMock(schema));
      }
    } else if (schema.type === "array" && count && count > 0) {
      const clonedSchema = JSON.parse(JSON.stringify(schema));
      clonedSchema.minItems = count;
      clonedSchema.maxItems = count;
      baselineMock = generateSmartMock(clonedSchema);
    } else {
      baselineMock = generateSmartMock(schema);
    }

    // Optional early return if explicitly set to bypass AI
    if (modeParam === "fast") {
      return NextResponse.json(baselineMock);
    }

    // Stage 2: AI Validation Layer (Gemini)
    const promptSchema = (schema.type === "object" && count && count > 0) 
      ? { type: "array", items: schema } 
      : schema;

    const prompt = `You are a data validation and enhancement AI.

Input:
1. JSON Schema
${JSON.stringify(promptSchema, null, 2)}

2. Generated mock data
${JSON.stringify(baselineMock, null, 2)}

Task:
- Ensure all values are realistic and meaningful
- Replace gibberish text with human-readable values
- Keep data consistent with field descriptions
- Do NOT change structure or field names
- Keep values fake but believable

Output:
Return corrected JSON only.`;

    try {
      const result = await model.generateContent(prompt);
      const perfectedData = JSON.parse(result.response.text());
      return NextResponse.json(perfectedData);
    } catch (geminiErr) {
      console.error("Gemini mock enhancement failed:", geminiErr);
      // Fallback to baseline if Gemini fails
      return NextResponse.json(baselineMock);
    }
  } catch (err: any) {
    return NextResponse.json(
      { error: "Failed to generate mock data", details: err.message },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  context: { params: { contractId: string; version: string } }
) {
  if (!checkRateLimit(request)) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  let contractId, version;
  try {
    const paramsResult = await context.params;
    contractId = paramsResult.contractId;
    version = paramsResult.version;
  } catch (err) {
    contractId = context.params.contractId;
    version = context.params.version;
  }

  const { schema, error, status } = await getVersionSchema(contractId, version);
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await request.json();

    const validate = ajv.compile(schema);
    const valid = validate(body);

    if (!valid) {
      const prompt = `
        You are an API contract assistant. A payload failed JSON schema validation.
        
        JSON SCHEMA:
        ${JSON.stringify(schema, null, 2)}
        
        USER INPUT:
        ${JSON.stringify(body, null, 2)}
        
        VALIDATION ERRORS:
        ${JSON.stringify(validate.errors, null, 2)}
        
        Task:
        1. Identify missing or incorrect fields based on the validation errors.
        2. Create a "Corrected Payload" that COMPLIES with the schema. 
        3. Keep as much of the original data as possible, but fix anything that violates the schema (especially missing fields or type mismatches).
        4. Provide a brief explanation of what you fixed.

        Return exactly this JSON structure:
        {
          "correctedPayload": { ... },
          "explanation": "string"
        }
      `;

      try {
        const result = await model.generateContent(prompt);
        const geminiResponse = JSON.parse(result.response.text());

        return NextResponse.json(
          {
            error: "Contract Mismatch",
            details: validate.errors,
            properResponse: geminiResponse.correctedPayload,
            explanation: geminiResponse.explanation
          },
          { status: 400 }
        );
      } catch (geminiErr) {
        console.error("Gemini recovery failed:", geminiErr);
        return NextResponse.json(
          {
            error: "Contract Mismatch",
            details: validate.errors
          },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      message: "Payload strictly matches the contract",
      validedAt: new Date().toISOString()
    });

  } catch (err: any) {
    return NextResponse.json(
      { error: "Invalid JSON body provided." },
      { status: 400 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  context: { params: { contractId: string; version: string } }
) {
  return POST(request, context);
}
