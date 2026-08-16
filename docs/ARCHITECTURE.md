# Architecture & Technical Reference

This document covers the internals of ApiMate: system architecture, data model, security design, and implementation history. For setup and everyday usage, see the [main README](../README.md).

## Contents

- [System Architecture](#system-architecture)
- [Request Flow](#request-flow)
- [Mock Data Generation](#mock-data-generation)
- [AI Security & Prompt Injection Protection](#ai-security--prompt-injection-protection)
- [Data Model](#data-model)
- [Full Project Structure](#full-project-structure)
- [Design System](#design-system)
- [Known Limitations](#known-limitations)
- [Roadmap](#roadmap)
- [Build History](#build-history)

---

## System Architecture

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

## Request Flow

### GET — fetch mock data

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
      - Gemini enhancement for realistic data
      - Fallback to Stage 1 if Gemini fails
  → Return enhanced mock data
```

### POST / PUT — validate a payload

```
Client POST /api/mock/{contractId}/{version}  { body }
  → Rate limit check (100 req/IP/60s)
  → Fetch schema from Convex
  → AJV.validate(schema, body)
  → If valid: return { success: true, validatedAt: "..." }
  → If invalid:
      - Gemini suggests a corrected payload and explanation
      - Fallback: return errors only if Gemini fails
  → Return { error, details: [...], properResponse: {...}, explanation: "..." }

PUT is an alias for POST — identical validation semantics.
```

## Mock Data Generation

Mock data is generated in two stages to balance speed, cost, and realism.

**Stage 1 — Rule-based (always runs).** `generateSmartMock()` produces data using field-name heuristics — emails look like emails, prices are plausible numbers, dates are ISO 8601, IDs are UUID v4. Instant, free, always succeeds.

**Stage 2 — AI enhancement (conditional).** If the client requests `mode=realistic` (the default) and the schema is under 8KB, Gemini refines the Stage 1 output for realism while preserving structure and field names. Falls back to Stage 1 output if the AI call fails or times out. Clients can skip this stage entirely with `?mode=fast`.

## AI Security & Prompt Injection Protection

ApiMate uses multiple defensive layers around AI calls to prevent prompt injection:

**Schema generation (`convex/ai.ts`)**
- User instructions capped at 500 characters
- Input sanitized — backticks, angle brackets, and newlines stripped, whitespace collapsed
- System instructions set at the API level and cannot be overridden by user input
- User input wrapped in explicit `--- INSTRUCTION START/END ---` delimiters
- Trusted (current schema) and untrusted (user instruction) content kept in separate prompt sections
- Output validated to confirm it's a JSON object, not an array or primitive

**Mock/validation endpoint (`app/api/mock/.../route.ts`)**
- Schemas over 8KB skip AI enhancement entirely (token abuse guard)
- Schema, payload, and validation errors are placed in clearly delimited prompt blocks
- Model is configured with an explicit `systemInstruction` and `responseMimeType`
- Any AI failure falls back gracefully to rule-based mock data or raw validation errors
- Requests are rate-limited to 100 per IP per 60 seconds, with automatic cleanup

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

**Cascade delete**

```
deleteProject(projectId)
  → delete all versions for each contract
  → delete all contracts
  → delete project
```

## Full Project Structure

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
│   │   ├── FeaturesSection.tsx           # Feature card grid
│   │   ├── HowItWorks.tsx                # Step-by-step flow
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
│   ├── ai.ts                             # Gemini schema generation action
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
├── next.config.ts                        # Next.js config
├── tailwind.config.ts                    # Tailwind config
├── tsconfig.json                         # TypeScript config
└── package.json
```

## Design System

ApiMate uses an Apple-inspired light theme with a consistent set of CSS custom properties.

**Color tokens**

```css
--bg-base:        #f5f5f7   /* page background */
--bg-elevated:    #ffffff   /* cards, panels */
--text-primary:   #1d1d1f   /* headings, body */
--text-secondary: #6e6e73   /* labels, descriptions */
--text-tertiary:  #aeaeb2   /* placeholders, metadata */
--accent:         #0071e3   /* primary CTA & active state color */
--accent-hover:   #0077ed
--accent-light:   rgba(0,113,227,0.08)  /* tinted backgrounds */
```

**Typography**

- Sans: DM Sans (300–700) — all UI text
- Mono: DM Mono (300–500) — code, paths, IDs, schema editor

**Reusable component classes**

| Class | Usage |
|---|---|
| `.button-primary` | Primary CTA button |
| `.button-secondary` | Outlined secondary button |
| `.panel` | Elevated card with border + shadow |
| `.panel-glass` | Glassmorphic surface with backdrop blur |
| `.sidebar-item` | Nav item with hover/active states |
| `.input-field` | Form input with focus ring |
| `.feature-card` | Hover-lift card for feature grids |
| `.modal-overlay` / `.modal-card` | Modal backdrop and container |
| `.gradient-text` / `.gradient-bg-hero` | Text and background gradient utilities |

## Known Limitations

**Serverless deployment.** The mock API route (`/api/mock/[contractId]/[version]`) is a fully dynamic Next.js API route. Some serverless platforms (e.g. Vercel Hobby) may not fully support dynamic route segments at runtime — deploy to a Node.js server, a container, or an adapted Edge Runtime setup instead.

**Schema complexity.** `json-schema-faker` covers most of JSON Schema draft-07 but has gaps with deeply nested `$ref`, `allOf`/`anyOf`/`oneOf` compositions, and non-standard custom formats.

**AI schema quality.** Output quality from the AI schema generator depends on how clearly the request is described. Ambiguous prompts may need manual cleanup afterward.

## Roadmap

**Near-term**
- Team collaboration — share projects with role-based access (owner / editor / viewer)
- OpenAPI import — generate contracts automatically from an existing OpenAPI 3.x spec
- Response delay simulation — configurable artificial latency per endpoint
- Request logging — timestamps, headers, and bodies for every mock request
- Expanded settings — account management, API key display, usage stats

**Medium-term**
- Webhook simulation — outbound payloads on a schedule or trigger
- GraphQL support — schema definitions with mock resolvers
- SDK generation — TypeScript, Python, and Go clients from contracts
- Contract testing — validate a real backend against a published contract
- Visual diff viewer between any two schema versions
- Custom faker directives (e.g. `x-faker: "internet.email"`)

**Long-term**
- CI/CD integration — fail a PR if a backend change breaks a published contract
- Multi-environment mocks — separate data sets per environment
- Analytics dashboard — endpoint usage, most-hit contracts, error rates
- Plugin system for additional code-gen languages (Kotlin, Swift, C#)
- Self-hosted mode via Docker Compose
- Public contract marketplace of reusable schemas

## Build History

ApiMate was built in phases, each delivering a working slice of functionality.

| Phase | Delivered |
|---|---|
| 1 — Foundation | Next.js + TypeScript app, Convex backend, Clerk auth, global design system |
| 2 — Core data layer | `projects` / `contracts` / `versions` tables, CRUD mutations & queries, cascade delete |
| 3 — Dashboard UI | Sidebar nav, projects grid, create/delete modals, empty states |
| 4 — Schema workspace | Split-pane editor, publish flow, version history, auto-sync to latest version |
| 5 — AI integration | AI-assisted schema generation with robust JSON extraction from model responses |
| 6 — Mock API endpoints | Dynamic GET/POST mock route, AJV validation, rate limiting |
| 7 — Code generation | Dart and Java model class generators |
| 8 — Breaking change detection | Type-change, required-field, and field-removal detection with version-level warnings |
| 9 — Landing page | Public marketing site: hero, features, how-it-works, footer |
