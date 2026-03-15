import { NextRequest, NextResponse } from "next/server";
import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import { generate, define } from "json-schema-faker";
import { faker } from "@faker-js/faker";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Setup JSONSchemaFaker
define("faker", () => faker);

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
): Promise<{ schema: object; error?: string; status?: number }> {
  const versionNum = parseInt(versionNumberStr, 10);
  if (isNaN(versionNum)) {
    return { schema: {}, error: "Invalid version parameter", status: 400 };
  }

  // Next.js doesn't easily talk to Convex from an API route without a token
  // unless the query is public or we pass a token. We'll need a public query
  // to fetch the contract version for the mock endpoint. Let's assume we have it.

  try {
    const schemaData = await fetchQuery(api.public.getVersionSchema, {
      contractId: contractId as Id<"contracts">,
      versionNumber: versionNum,
    });

    if (!schemaData) {
      return { schema: {}, error: "Version not found", status: 404 };
    }

    return { schema: JSON.parse(schemaData.schema) };
  } catch (e) {
    return { schema: {}, error: "Invalid contract or version ID formatting", status: 400 };
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { contractId: string; version: string } }
) {
  if (!checkRateLimit(request)) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const { contractId, version } = await params;

  const { schema, error, status } = await getVersionSchema(contractId, version);
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  try {
    // Stage 1: Baseline Generation
    const baselineMock = await generate(schema as any);

    // Stage 2: Gemini Verification & Enhancement
    const prompt = `
      You are an AI data perfectionist. I have generated a baseline mock response for a specific JSON schema.
      The baseline data might contain generic gibberish (like "A9CEizp" or "cA") where it should have realistic values.
      
      JSON SCHEMA:
      ${JSON.stringify(schema, null, 2)}
      
      BASELINE MOCK:
      ${JSON.stringify(baselineMock, null, 2)}
      
      TASK:
      1. Review the baseline mock against the schema's "title", "description", and especially "example" fields.
      2. Identify any generic, random, or unrealistic values.
      3. Replace them with high-quality, realistic data that fits the context of the schema.
      4. If the schema provides an "example", prioritize using that pattern or value.
      5. Ensure ALL required fields are present and correctly formatted (emails, URIs, dates, etc.).
      
      Return ONLY the perfected JSON data without any markdown formatting or explanations.
    `;

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
  { params }: { params: { contractId: string; version: string } }
) {
  if (!checkRateLimit(request)) {
    return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
  }

  const { contractId, version } = await params;

  const { schema, error, status } = await getVersionSchema(contractId, version);
  if (error) {
    return NextResponse.json({ error }, { status });
  }

  try {
    const body = await request.json();

    const validate = ajv.compile(schema);
    const valid = validate(body);

    if (!valid) {
      // Use Gemini to create a proper response if validation fails
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
