<div align="center">

<img src="public/API MATE.png" alt="ApiMate Logo" width="72" height="72" />

# ApiMate

**Build frontends before backends exist.**

ApiMate is a contract-first mock API platform. Define a JSON Schema, publish it, and instantly get a live endpoint returning realistic data — no backend required.

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![Convex](https://img.shields.io/badge/Convex-1.31-orange?logo=convex)](https://convex.dev)
[![Clerk](https://img.shields.io/badge/Clerk-Auth-purple?logo=clerk)](https://clerk.dev)
[![Gemini](https://img.shields.io/badge/Gemini-2.5_Flash-blue?logo=google)](https://ai.google.dev)
[![License: MIT](https://img.shields.io/badge/License-MIT-green)](LICENSE)

[Live Demo](https://api-mate-gamma.vercel.app) · [Report Bug](issues) · [Request Feature](issues)

</div>

---

## Table of Contents

- [What is ApiMate?](#what-is-apimate)
- [How It Works](#how-it-works)
- [Features](#features)
- [Architecture](#architecture)
- [Project Structure](#project-structure)
- [Data Model](#data-model)
- [Implementation Plan](#implementation-plan)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Design System](#design-system)
- [Known Limitations](#known-limitations)
- [Future Scope](#future-scope)
- [Contributing](#contributing)

---

## What is ApiMate?

Frontend development often stalls waiting on backend APIs. ApiMate eliminates that blocker.

You define what an API *should* return using a JSON Schema. ApiMate versions it, detects breaking changes, and serves a live mock endpoint that returns realistic, schema-valid data on every request. When the real backend is ready, you swap one URL.

**The core loop:**

```
Define Schema → Publish Version → Get Live Endpoint → Build Frontend → Swap URL
```

---

## How It Works

### 1. Create a Project
A project is a logical container for related API contracts — e.g. "Acme Dashboard API".

### 2. Define a Contract
A contract maps a name to an API path: `User Profile → /api/users`. Each contract can have many versioned schemas.

### 3. Write or Generate a Schema
Open the schema workspace. Write a JSON Schema manually, or use the AI assistant — describe what you want in plain English and Gemini 2.5 Flash generates the schema for you.

```json
{
  "type": "object",
  "properties": {
    "id":    { "type": "integer" },
    "name":  { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "role":  { "enum": ["admin", "user"] }
  },
  "required": ["id", "name", "email"]
}
```

### 4. Publish a Version
Click **Publish Version**. ApiMate:
- Validates the JSON is a valid schema object
- Compares it against the previous version
- Flags any breaking changes (type changes, removed fields, new required fields)
- Stores it as an immutable, sequentially numbered version

### 5. Hit the Mock Endpoint
The published version is immediately live:

```bash
GET /api/mock/{contractId}/{versionNumber}/{path}
# → Returns realistic fake data matching your schema

POST /api/mock/{contractId}/{versionNumber}/{path}
# → Validates your payload against the schema
# → Returns AJV errors + AI-suggested fix on failure
```

### 6. Generate Client Code
Switch to the **Dart** or **Java** tab to get model classes generated from your schema — ready to paste into your mobile or backend project.

---

## Features

| Feature | Description |
|---|---|
| Contract Management | Organize contracts inside projects with full CRUD |
| Schema Versioning | Immutable, sequential versions with full history |
| Breaking Change Detection | Auto-detects type changes, removed fields, new required fields |
| AI Schema Generation | Describe changes in English, Gemini writes the schema |
| AI Security Hardening | Input sanitization, prompt delimiters, system instructions, length limits |
| Two-Stage Mock Data | Fast rule-based generation + optional Gemini enhancement |
| Live Mock Endpoints | GET returns fake data, POST validates payloads |
| Intelligent Validation | AJV errors + AI-generated corrected payload suggestions |
| Code Generation | Dart and Java model classes from any schema |
| Version Restore | Restore any previous version as a new version |
| Endpoint Controls | Disable/enable mock endpoints per contract from Settings |
| Auth & Ownership | All projects are private to the authenticated user |

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Browser (Next.js)                    │
│                                                          │
│  Landing Page    Dashboard    Schema Workspace           │
│  (public)        (auth)       (auth)                     │
└──────────┬───────────┬──────────────┬────────────────────┘
           │           │              │
           │    Clerk Auth      Convex React Hooks
           │           │              │
           ▼           ▼              ▼
┌──────────────────────────────────────────────────────────┐
│                    Convex Backend                         │
│                                                          │
│  contracts.ts   ai.ts    public.ts    utils.ts           │
│  (mutations &   (Gemini  (public      (breaking          │
│   queries)       action)  queries)     change diff)      │
│                                                          │
│  ┌─────────────────────────────────────────────────┐    │
│  │              Convex Database                     │    │
│  │  projects → contracts → versions                 │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
           │
           ▼
┌──────────────────────────────────────────────────────────┐
│              Next.js API Route (Mock Endpoint)            │
│  /api/mock/[contractId]/[version]/[...path]             │
│                                                          │
│  GET  → Stage 1: Rule-based mock → Stage 2: Gemini      │
│         enhancement (realistic mode) → return data       │
│  POST → AJV validation → error + Gemini fix suggestion   │
└──────────────────────────────────────────────────────────┘
```

### Request Flow — Mock Endpoint (GET)

```
Client GET /api/mock/{contractId}/{version}/{path}?count=10&mode=realistic
  → Rate limit check (100 req/IP/60s)
  → Fetch schema from Convex (public.getVersionSchema)
  → Check if endpoint is disabled
  → Parse query params (count, mode)
  → Stage 1: Rule-based mock generation (generateSmartMock)
      - Smart defaults based on field names (email, name, price, etc.)
      - Handles objects, arrays, primitives
  → Stage 2 (if mode=realistic & schema < 8KB):
      - Gemini 2.0-flash enhancement for realistic data
      - Fallback to Stage 1 if Gemini fails
  → Return enhanced mock data
```

### Request Flow — Mock Endpoint (POST / PUT)

```
Client POST /api/mock/{contractId}/{version}  { body }
  → Rate limit check (100 req/IP/60s)
  → Fetch schema from Convex
  → AJV.validate(schema, body)
  → If valid: return { success: true, validatedAt: "..." }
  → If invalid:
      - Gemini 2.0-flash suggests a corrected payload and explanation
      - Fallback: return errors only if Gemini fails
  → Return { error, details: [...], properResponse: {...}, explanation: "..." }

PUT is an alias for POST — identical validation semantics.
```

### AI Security & Prompt Injection Protection

ApiMate uses multiple defensive layers to prevent prompt injection attacks:

#### convex/ai.ts (Schema Generation)
- **Input length cap**: User instructions limited to 500 characters
- **Input sanitization**: Strips backticks, angle brackets, newlines, and collapses whitespace
- **System instructions**: Set at API level (cannot be overridden by user prompts)
- **Prompt delimiters**: User input wrapped in `--- INSTRUCTION START/END ---` blocks
- **Separation of concerns**: Current schema (trusted) and user instruction (untrusted) sent in separate sections
- **Output validation**: Verifies response is a JSON object, not array or primitive

#### app/api/mock/.../route.ts (Mock Data & Validation)
- **Schema size guard**: Skips AI enhancement if schema exceeds 8KB (prevents token abuse)
- **Structured prompts**: Schema, user payload, and validation errors each placed in delimited blocks
- **System role enforcement**: Model configured with `systemInstruction` and `responseMimeType`
- **Graceful fallbacks**: If Gemini fails, returns rule-based mock or raw AJV errors
- **Rate limiting**: 100 requests per IP per 60 seconds with automatic cleanup

### Two-Stage Mock Data Generation

Mock data is generated in two stages to balance speed, cost, and realism:

#### Stage 1 — Rule-Based Generation (Always)
The `generateSmartMock()` function produces mock data using field name heuristics:
- **Email fields**: `user123@gmail.com`
- **Name fields**: `John`, `Doe`, `Wireless Bluetooth Headphones`
- **Prices**: Random values between 100–5000
- **Dates/Times**: ISO 8601 formatted timestamps
- **UUIDs**: Standard UUID v4 format
- **Status**: `"active"`
- **URLs**: `https://example.com/...`

This stage runs instantly, has zero AI cost, and always succeeds.

#### Stage 2 — Gemini Enhancement (Conditional)
If the client requests `mode=realistic` (default) and the schema is under 8KB:
- Gemini 2.0-flash refines the baseline mock data for realism
- Preserves structure and field names
- Replaces placeholder values with believable fake data
- Falls back to Stage 1 if Gemini fails or times out

Clients can bypass Stage 2 by setting `?mode=fast` for instant responses.

---

## Project Structure

```
apimate/
├── app/
│   ├── api/
│   │   └── mock/
│   │       └── [contractId]/
│   │           └── [version]/
│   │               └── [...path]/
│   │                   └── route.ts      # Mock data & validation endpoint
│   ├── dashboard/
│   │   ├── layout.tsx                    # Dashboard shell with sidebar
│   │   ├── page.tsx                      # Projects list
│   │   ├── CreateProjectModal.tsx        # New project modal
│   │   ├── settings/
│   │   │   └── page.tsx                  # Settings page (endpoint controls + version restore)
│   │   └── [projectId]/
│   │       ├── page.tsx                  # Project detail + contract list
│   │       └── [contractId]/
│   │           └── page.tsx              # Schema workspace wrapper
│   ├── globals.css                       # Design system tokens + utility classes
│   ├── layout.tsx                        # Root layout (Clerk + Convex providers)
│   └── page.tsx                          # Public landing page
│
├── components/
│   ├── Home/
│   │   ├── Header.tsx                    # Sticky nav with auth state
│   │   ├── HeroSection.tsx               # Hero with code mockup cards
│   │   ├── FeaturesSection.tsx           # 5-feature card grid
│   │   ├── HowItWorks.tsx                # 3-step horizontal flow
│   │   └── Footer.tsx                    # Footer with links
│   ├── Dashboard/
│   │   └── Sidebar.tsx                   # Persistent left sidebar
│   ├── SchemaWorkspace.tsx               # Core editor (schema + AI + tabs)
│   ├── ConfirmModal.tsx                  # Reusable destructive action modal
│   └── ConvexClientProvider.tsx          # Convex context wrapper
│
├── convex/
│   ├── schema.ts                         # Database schema (projects/contracts/versions)
│   ├── contracts.ts                      # All project/contract/version mutations & queries
│   ├── ai.ts                             # Gemini schema generation action (2.5-flash)
│   ├── public.ts                         # Public queries for mock API route
│   ├── utils.ts                          # Breaking change detection logic
│   ├── auth.config.ts                    # Clerk auth configuration for Convex
│   └── myFunctions.ts                    # Misc helper functions
│
├── lib/
│   └── codegen.ts                        # Dart + Java model class generators
│
├── public/
│   └── API MATE.png                      # App icon
│
├── .env.local                            # Environment variables (not committed)
├── .prettierrc                           # Prettier config
├── next.config.ts                        # Next.js config
├── tailwind.config.ts                    # Tailwind v4 config
├── tsconfig.json                         # TypeScript config
└── package.json
```

---

## Data Model

```
projects
  _id          : Id<"projects">
  name         : string
  userId       : string          ← Clerk subject (owner)
  createdBy    : string?         ← legacy field
  description  : string?

contracts
  _id          : Id<"contracts">
  projectId    : Id<"projects">  ← FK → projects
  name         : string
  path         : string          ← e.g. "/api/users"
  isDisabled   : boolean?
  [index: by_projectId]

versions
  _id            : Id<"versions">
  contractId     : Id<"contracts">  ← FK → contracts
  versionNumber  : number
  schema         : string           ← JSON string (immutable)
  breakingChanges: Array<{
    type    : string   ← "type_changed" | "required_field_added" | "field_removed"
    path    : string   ← JSON path to the changed field
    message : string
  }>?
  [index: by_contractId]
  [index: by_contractId_version]
```

### Cascade Delete

```
deleteProject(projectId)
  → delete all versions for each contract
  → delete all contracts
  → delete project
```

---

## Implementation Plan

The project was built in phases, each delivering a working slice of functionality.

### Phase 1 — Foundation
- [x] Next.js 16 app with App Router and TypeScript
- [x] Convex backend setup with schema definition
- [x] Clerk authentication integration
- [x] Root layout with providers (Clerk + Convex)
- [x] Global CSS design system (tokens, typography, utilities)

### Phase 2 — Core Data Layer
- [x] `projects` table with user ownership
- [x] `contracts` table with project FK and path
- [x] `versions` table with immutable schema storage
- [x] CRUD mutations: createProject, createContract, createVersion
- [x] Queries: getProjects, getContracts, getContractWithVersions
- [x] Cascade delete for projects

### Phase 3 — Dashboard UI
- [x] Sidebar navigation with active state
- [x] Projects grid with shimmer loading states
- [x] Create Project modal
- [x] Confirm delete modal (reusable)
- [x] Project detail page with contract list
- [x] Empty states for projects and contracts

### Phase 4 — Schema Workspace
- [x] Split-pane editor layout
- [x] JSON schema textarea with live editing
- [x] Publish Version with client-side validation
- [x] Version history tab with breaking change display
- [x] Auto-sync editor to latest published version on load

### Phase 5 — AI Integration
- [x] Gemini 2.5 Flash action in Convex (`convex/ai.ts`)
- [x] AI chat bar in schema workspace
- [x] Schema replaced in editor on AI response
- [x] Robust JSON extraction from Gemini markdown responses

### Phase 6 — Mock API Endpoints
- [x] Dynamic Next.js API route `/api/mock/[contractId]/[version]`
- [x] GET: json-schema-faker data generation
- [x] POST: AJV schema validation with error response
- [x] Rate limiting (100 req/IP/60s)
- [x] Public Convex query for schema fetching

### Phase 7 — Code Generation
- [x] Dart model class generator (constructor, fromJson, toJson)
- [x] Java model class generator (Jackson annotations, getters/setters)
- [x] Dart and Java tabs in schema workspace

### Phase 8 — Breaking Change Detection
- [x] `detectBreakingChanges(oldSchema, newSchema)` utility
- [x] Detects: type changes, required field additions, field removals
- [x] Breaking changes stored on version record
- [x] Warning display in version history tab

### Phase 9 — Landing Page
- [x] Header with scroll-aware glassmorphic effect
- [x] Hero section with dual code card mockup
- [x] Features section (5 cards, staggered animation)
- [x] How It Works section (3-step horizontal flow)
- [x] Footer

---

## Tech Stack

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| Framework | Next.js | 16.1.6 | App Router, SSR, API routes |
| UI | React | 19.2.4 | Component model |
| Language | TypeScript | 5.9.3 | Type safety |
| Backend | Convex | 1.31.7 | Serverless DB + real-time functions |
| Auth | Clerk | 6.37.3 | OAuth, user management |
| AI | @google/generative-ai | 0.24.1 | Gemini 2.5-flash (schema gen) + 2.0-flash (mock/validation) |
| Mock Data | @faker-js/faker | 8.0.0 | Realistic values |
| Validation | AJV + ajv-formats | 8.18.0 | JSON Schema validation |
| Styling | Tailwind CSS | 4.1.18 | Utility classes |
| Icons | Lucide React | 0.576.0 | Icon set |
| Utilities | Lodash | 4.17.23 | Data manipulation |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Convex](https://convex.dev) account
- A [Clerk](https://clerk.dev) account
- A [Google AI Studio](https://aistudio.google.com) API key (Gemini)

### Installation

```bash
# Clone the repo
git clone https://github.com/your-username/apimate.git
cd apimate

# Install dependencies
npm install

# Set up environment variables
cp .env.local.example .env.local
# Fill in your keys (see Environment Variables section)

# Start development (runs Next.js + Convex in parallel)
npm run dev
```

The app will be available at `http://localhost:3000`.  
The Convex dashboard will open automatically.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js + Convex dev servers in parallel |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run lint` | ESLint check |

---

## Environment Variables

Create a `.env.local` file in the root:

```env
# Convex
CONVEX_DEPLOYMENT=your-convex-deployment-slug
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Google Gemini (set in Convex dashboard environment variables)
GEMINI_API_KEY=AIza...
```

> The `GEMINI_API_KEY` is used server-side inside Convex actions. Set it in your Convex project's environment variables via the Convex dashboard, not in `.env.local`.

---

## API Reference

### Mock Endpoint — GET

Returns mock data matching the published schema. The `{path}` segment mirrors the contract's configured API path and can be any depth (e.g. `/api/users/profile`).

```
GET /api/mock/{contractId}/{versionNumber}/{path}
```

**Query Parameters**

| Parameter | Type | Default | Description |
|---|---|---|---|
| `count` | integer | — | Number of items to generate. Maximum 50. Only meaningful for object-type schemas. |
| `mode` | string | `realistic` | `realistic` — Gemini-enhanced data (default). `fast` — Rule-based only, instant response. |

**Response 200**
```json
{ "id": 1847, "name": "Jordan Lee", "email": "j.lee@acme.io", "role": "admin" }
```

With `?count=2`:
```json
[
  { "id": 1847, "name": "Jordan Lee", "email": "j.lee@acme.io", "role": "admin" },
  { "id": 2031, "name": "Sam Rivera", "email": "s.rivera@acme.io", "role": "user" }
]
```

**Response 400** — Invalid `count` parameter  
**Response 403** — Endpoint is disabled  
**Response 404** — Contract or version not found  
**Response 429** — Rate limit exceeded (100 req/IP/60s)

---

### Mock Endpoint — POST / PUT

Validates a request body against the published schema. On failure, Gemini 2.0-flash suggests a corrected payload.

```
POST /api/mock/{contractId}/{versionNumber}/{path}
Content-Type: application/json

{ ...your payload... }
```

**Response 200 — Valid**
```json
{
  "success": true,
  "message": "Payload strictly matches the contract",
  "validatedAt": "2026-07-03T07:10:00.000Z"
}
```

**Response 400 — Invalid**
```json
{
  "error": "Contract Mismatch",
  "details": [
    { "instancePath": "/email", "message": "must match format \"email\"" }
  ],
  "properResponse": {
    "id": 1,
    "name": "Alex Kim",
    "email": "alex.kim@example.com",
    "role": "user"
  },
  "explanation": "The email field was missing a valid format. Updated to a properly formatted address."
}
```

> If Gemini is unavailable, the response omits `properResponse` and `explanation` and returns only `error` and `details`.

**PUT** is an alias for POST with identical validation semantics.

---

## Design System

ApiMate uses an Apple-inspired light theme with a consistent set of CSS custom properties.

### Color Tokens

```css
--bg-base:        #f5f5f7   /* page background */
--bg-elevated:    #ffffff   /* cards, panels */
--text-primary:   #1d1d1f   /* headings, body */
--text-secondary: #6e6e73   /* labels, descriptions */
--text-tertiary:  #aeaeb2   /* placeholders, metadata */
--accent:         #0071e3   /* Apple Blue — CTAs, active states */
--accent-hover:   #0077ed
--accent-light:   rgba(0,113,227,0.08)  /* tinted backgrounds */
```

### Typography

- **Sans**: DM Sans (300–700) — all UI text
- **Mono**: DM Mono (300–500) — code, paths, IDs, schema editor

### Component Classes

| Class | Usage |
|---|---|
| `.button-primary` | Blue CTA button with spring animation |
| `.button-secondary` | White outlined button |
| `.panel` | Elevated white card with border + shadow |
| `.panel-glass` | Glassmorphic surface with backdrop blur |
| `.sidebar-item` | Nav item with hover/active states |
| `.input-field` | Form input with focus ring |
| `.feature-card` | Hover-lift card for feature grids |
| `.modal-overlay` | Blurred backdrop for modals |
| `.modal-card` | Centered modal container |
| `.gradient-text` | Text gradient (dark → accent blue) |
| `.gradient-bg-hero` | Radial blue-tinted hero background |

---

## Known Limitations

### Serverless Deployment
The mock API routes (`/api/mock/[contractId]/[version]`) are dynamic Next.js API routes. Standard serverless platforms (Vercel Hobby, etc.) may not support fully dynamic route segments at runtime. For production deployment, use:
- A Node.js server (`npm start`)
- A containerized environment (Docker)
- Vercel with Edge Runtime (requires adaptation)

### Schema Complexity
`json-schema-faker` handles most JSON Schema draft-07 features but has gaps with deeply nested `$ref`, `allOf`/`anyOf`/`oneOf` compositions, and custom formats beyond the standard set.

### AI Schema Quality
Gemini output quality depends on prompt clarity. Very ambiguous prompts may produce schemas that need manual adjustment.

---

## Future Scope

### Near-term

- [ ] **Team Collaboration** — Share projects with other users, role-based access (owner / editor / viewer)
- [ ] **OpenAPI Import** — Import an existing OpenAPI 3.x spec and auto-generate contracts from all paths
- [ ] **Response Delay Simulation** — Configure artificial latency per endpoint to simulate real network conditions
- [ ] **Request Logging** — Log all incoming mock requests with timestamps, headers, and bodies for debugging
- [ ] **Settings Page** — Account management, API key display, usage stats

### Medium-term

- [ ] **Webhook Simulation** — Define outbound webhook payloads that fire on a schedule or trigger
- [ ] **GraphQL Support** — Define GraphQL schemas and get mock resolvers
- [ ] **SDK Generation** — Generate TypeScript, Python, and Go API clients from contracts
- [ ] **Contract Testing** — Run automated tests that validate a real backend against a published contract
- [ ] **Diff Viewer** — Visual side-by-side diff between any two versions of a schema
- [ ] **Custom Faker Rules** — Annotate schema fields with custom faker directives (e.g. `x-faker: "internet.email"`)

### Long-term

- [ ] **CI/CD Integration** — GitHub Action that fails a PR if a backend change breaks a published contract
- [ ] **Multi-environment Mocks** — Separate mock data sets per environment (dev / staging / prod)
- [ ] **Analytics Dashboard** — Track mock endpoint usage, most-hit contracts, error rates
- [ ] **Plugin System** — Allow custom code generators for additional languages (Kotlin, Swift, C#)
- [ ] **Self-hosted Mode** — Docker Compose setup for teams that need on-premise deployment
- [ ] **Contract Marketplace** — Public library of reusable schemas (e.g. standard user, payment, address schemas)

---

## Contributing

Contributions are welcome. Please open an issue first to discuss what you'd like to change.

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m "feat: describe your change"
git push origin feature/your-feature-name
# Open a pull request
```

Please follow the existing code style. Run `npm run lint` before submitting.

---

## License

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  Made with ♥ for frontend developers · <a href="#">ApiMate</a>
</div>
