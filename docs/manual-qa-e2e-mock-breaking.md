# API Contract Guardian – Manual QA (MVP E2E Hardening)

## Scope

Validate end-to-end integration between:

- Version publishing (`convex/contracts.ts#createVersion`)
- Deterministic breaking change detection (`convex/utils.ts`)
- Dynamic mock endpoint (`/api/mock/[contractId]/[version]`)

## Preconditions

- Dev stack running (`npm run dev`)
- Valid `NEXT_PUBLIC_CONVEX_URL`
- At least one project + contract created

## Test Matrix (Single Contract)

### Step 1 — Publish V1 (baseline)

Use schema:

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "email": { "type": "string", "format": "email" }
  },
  "required": ["id"]
}
```

Expected:

- Version created as `v1`
- `breakingChanges` is empty

### Step 2 — Publish V2 (non-breaking)

Add optional field only:

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "string" },
    "email": { "type": "string", "format": "email" },
    "displayName": { "type": "string" }
  },
  "required": ["id"]
}
```

Expected:

- Version created as `v2`
- `breakingChanges` remains empty

### Step 3 — Publish V3 (breaking)

Change type and add required field:

```json
{
  "type": "object",
  "properties": {
    "id": { "type": "number" },
    "email": { "type": "string", "format": "email" },
    "displayName": { "type": "string" }
  },
  "required": ["id", "displayName"]
}
```

Expected:

- Version created as `v3`
- `breakingChanges` contains type-change and new-required-field entries

## Mock Endpoint Validation

Assume `CONTRACT_ID` and versions exist.

### GET should return mock payload

- `GET /api/mock/CONTRACT_ID/1`
  Expected:
- `200`
- JSON body conforms to version schema

### Invalid version param

- `GET /api/mock/CONTRACT_ID/abc`
  Expected:
- `400` with `Invalid version parameter`

### POST valid payload

- `POST /api/mock/CONTRACT_ID/3` with valid schema body
  Expected:
- `200`
- Response includes `schemaHash`

### POST invalid payload

- `POST /api/mock/CONTRACT_ID/3` with type mismatch
  Expected:
- `400` with `Contract Mismatch` and AJV error details

### PUT behavior parity

- `PUT /api/mock/CONTRACT_ID/3` with same body as POST tests
  Expected:
- Same validation behavior as POST

## Publish Guardrails

### Invalid schema rejection

Try creating a version with non-object schema payload.
Expected:

- Mutation fails with `Invalid schema: expected a JSON object`

### Duplicate schema rejection

Publish identical schema twice in sequence.
Expected:

- Second publish fails with `No schema changes detected from latest version`

## Pass Criteria

- Breaking/non-breaking classification is deterministic and consistent with schema edits
- Mock route validates request payloads per selected version
- Route and mutation error handling is explicit and stable
