# ApiMate — API Contract Guardian

ApiMate is a contract-first development platform built for frontend developers who need to work independently of a backend. It lets you define, version, and mock API contracts using JSON Schema — so your frontend team can build against a live, realistic API before the real backend exists.

---

## Overview

When backend APIs are not yet available, frontend development stalls. ApiMate solves this by giving developers a workspace to define what an API contract *should* look like, publish versioned schemas, and immediately consume them through live mock endpoints that return realistic, AI-enhanced data.

Every contract is versioned. Every version is immutable. Every breaking change is automatically detected and surfaced.

---

## Features

### Contract Management
- Organize API contracts inside projects
- Each contract maps to a specific API path (e.g. `/api/users`)
- Full create, update, and delete support with cascading cleanup

### Schema Versioning
- Publish JSON Schema definitions as immutable, sequentially numbered versions
- Version history is preserved and visible in the editor
- Duplicate versions are rejected — only meaningful changes are accepted

### Breaking Change Detection
Automatically compares each new version against the previous one and flags:
- `type_changed` — a field's type was modified
- `required_field_added` — a new required field was introduced
- `field_removed` — an existing field was removed

Breaking changes are highlighted in the version history panel.

### AI-Assisted Schema Editing
An embedded AI assistant (powered by Google Gemini) lets you describe schema changes in plain English. The schema is updated automatically without manual JSON editing.

### Live Mock API Endpoints
Every published contract version exposes two live HTTP endpoints:

| Method | Behavior |
|--------|----------|
| `GET` | Returns AI-enhanced, realistic mock data matching the schema |
| `POST` | Validates a request body against the schema and returns correction suggestions on failure |

### Client Code Generation
The schema editor generates ready-to-use model classes in:
- **Dart** — with constructor, `fromJson`, and `toJson`
- **Java** — with Jackson annotations, getters, and setters

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js (App Router), React 19, Tailwind CSS v4 |
| Backend / Database | Convex (real-time database + serverless functions) |
| Authentication | Clerk |
| AI | Google Gemini 2.5 Flash |
| Mock Data Generation | json-schema-faker, @faker-js/faker |
| Schema Validation | AJV, ajv-formats |

---

## Infrastructure

The Convex backend is hosted and managed centrally. **Users do not need to provision or configure their own Convex instance.** The backend is already deployed and shared across all users of the platform.

Authentication is handled via Clerk. Users sign in and all their projects and contracts are private to their account.

---

## Known Limitations

### Dynamic API Routes on Serverless Platforms
The mock API endpoints (`/api/mock/[contractId]/[version]`) are dynamic Next.js API routes. Due to restrictions of serverless deployment platforms (such as Vercel), **these routes cannot be deployed in a standard serverless environment**.

If you intend to self-host or deploy your own instance, you must use a runtime that supports dynamic API routes — such as a Node.js server, a containerized environment, or a platform with full server support.

---

## Using the Platform

### 1. Sign in
Create an account or sign in via Clerk authentication.

### 2. Create a Project
From the dashboard, initialize a new project to group your API contracts.

### 3. Define a Contract
Inside a project, define a contract by providing a name and an API path (e.g. `/api/users`).

### 4. Edit and Publish a Schema
Open the contract editor. Write or generate a JSON Schema, then click **Publish Version** to commit it. You can also use the AI assistant to describe changes in plain English.

### 5. Consume the Mock Endpoints
Once a version is published, use the **Mock** tab in the editor to find the live endpoint URLs for that version.

```bash
# Get realistic mock data
GET /api/mock/{contractId}/{versionNumber}

# Validate a payload against the contract
POST /api/mock/{contractId}/{versionNumber}
Content-Type: application/json

{ ...your payload... }
```

On a validation failure, the API returns the AJV error details along with an AI-suggested corrected payload.

### 6. Generate Client Code
Switch to the **Dart** or **Java** tab in the editor to view generated model classes based on the current schema.

---

## Mock API Rate Limiting

Mock endpoints are rate-limited to **100 requests per IP address per 60 seconds** to prevent abuse.

---

## Project Structure

```
├── app/
│   ├── api/mock/[contractId]/[version]/   # Mock data & validation endpoints
│   ├── dashboard/                          # Project, contract, and editor views
│   └── layout.tsx                          # Root layout with auth and Convex providers
├── components/
│   └── SchemaWorkspace.tsx                 # Core schema editor UI
├── convex/
│   ├── schema.ts                           # Database schema definition
│   ├── contracts.ts                        # Project and contract mutations & queries
│   ├── ai.ts                               # Gemini schema generation action
│   ├── public.ts                           # Public query used by mock endpoints
│   └── utils.ts                            # Breaking change detection logic
└── lib/
    └── codegen.ts                          # Dart and Java code generators
```
