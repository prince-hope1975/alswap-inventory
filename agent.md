## Coding Standards (MUST Follow)

### 1. Avoid `useEffect` in React Components

`useEffect` is an escape hatch. Before adding one, you **MUST** consider alternatives:

| Instead of `useEffect` for... | Use this instead |
|-------------------------------|------------------|
| Data transformation | Derived values during render (`const x = ...`) |
| User actions | Event handlers (`onClick`, `onSubmit`, etc.) |
| Expensive computations | `useMemo` |
| Resetting state on prop change | `key` prop on component |
| Fetching async data | TanStack Query (`useQuery`, `useMutation`) |

**When `useEffect` IS acceptable:**
- Subscribing to browser APIs (with cleanup)
- Integrating with non-React widgets
- One-time initialization on mount (empty `[]` deps)

**Checklist before adding `useEffect`:**
- [ ] This synchronizes with an external system that cannot run during render
- [ ] Cleanup logic is included if needed
- [ ] Alternatives (derived data, event handlers, `useMemo`, `key` props) were ruled out

### 2. DRY (Don't Repeat Yourself)

- **Extract repeated logic** into reusable functions, hooks, or utilities
- **Create shared components** for UI patterns used in multiple places
- **Use constants** for magic strings/numbers that appear more than once
- **Leverage existing utilities** in `@/lib/` before writing new ones
- **Check for existing hooks** in `@/hooks/` before creating new ones


# Agent Mandates

This file outlines the core mandates and architectural guidelines for the Alswap Inventory application. All changes and new features must adhere to these principles.

## 1. Aesthetic & Design Mandates
*   **Visual Excellence**: The application must not look basic. It should wow the user.
*   **Modern UI**: Use vibrant colors, glassmorphism, smooth gradients, and dark mode support.
*   **Typography**: Use modern fonts (Inter, Roboto, Outfit). Avoid browser defaults.
*   **Interactivity**: The interface must feel alive. Use hover effects, transitions, and micro-animations.
*   **Responsiveness**: Fully responsive layouts using Tailwind CSS.
*   **Components**: Reusable components must be used. Do not use ad-hoc styles when a component exists.

## 2. Technical Stack Mandates
*   **Framework**: Next.js (App Router).
*   **Language**: TypeScript.
*   **Styling**: Tailwind CSS (with `index.css` for global styles & theme variables).
*   **State Management**: React Query (TanStack Query) via tRPC.
*   **Data Fetching**: tRPC for type-safe API calls.
*   **Database**: Drizzle ORM (likely with an SQL backend).
*   **Local-First/Offline**: Dexie.js for offline POS capabilities (IndexedDB).
*   **Charts**: Recharts for analytics.
*   **Forms**: React Hook Form with Zod validation.

## 3. Architecture & Patterns
*   **Server Components**: Prefer Server Components for initial data fetching where possible (e.g., `await api.shop.getShopDetails()`).
*   **Client Components**: Use `"use client"` for interactive elements (forms, POS, dynamic charts).
*   **Error Handling**: Use `ErrorBoundary` around major page sections to prevent full page crashes.
*   **Offline First**: The POS system must work offline using `usePosSync` and local Dexie DB.
*   **Type Safety**: Strict TypeScript usage. No `any` unless absolutely necessary (and documented).
*   **Icons**: Lucide React.

## 4. Key Directives for AI Agents
*   **Do not regress on design**: Never simplify the UI to "basic HTML/CSS". Maintain the premium feel.
*   **Respect the offline logic**: When modifying POS, ensure offline sync logic (`pushData`, `pullData`) is preserved.
*   **Check strict mode**: Ensure no React hydration errors are introduced.
*   **Verify imports**: Use `~/` alias for imports.

## 5. Directory Structure
*   `src/app`: App Router pages and layouts.
*   `src/server/api`: tRPC routers.
*   `src/components`: Shared UI components.
*   `src/lib`: Utilities (db, maps, export, fuzzy-match).
*   `src/hooks`: Custom hooks (use-pos-sync, use-tenant-settings).


## 6. Documentation Mandates (MUST Follow)

### Overview Document
A high-level architecture overview is maintained at:
**[docs/overview.md](docs/overview.md)**

This file contains:
- Codebase structure summary
- Key data flows (POS sync, payments, auth)
- Entity relationships (products, orders, customers)
- Technology decisions

**Update `overview.md` when:**
- Adding new major features or modules
- Changing core data flows
- Modifying entity relationships

---

### Documentation Structure
Documentation mirrors the source structure:
```
docs/
├── overview.md           # High-level codebase summary
├── pages/                # Mirrors src/app/ (page documentation)
│   └── src/app/...
├── api/                  # API routes & tRPC routers
│   ├── routes/           # Next.js API routes (src/app/api/)
│   └── trpc/             # tRPC routers (src/server/api/routers/)
├── components/           # Shared UI components (src/components/)
└── hooks/                # Custom hooks (src/hooks/)
```

---

### When to Create/Update Documentation

| Trigger | Action |
|---------|--------|
| **New file created** | Create corresponding `.md` doc |
| **File significantly modified** | Update the existing `.md` doc |
| **File deleted** | Delete the corresponding `.md` doc |
| **New dependency added** | Add to Dependencies section |
| **Feature added/removed** | Update Features section |

---

### Documentation Templates

#### Pages Template (`docs/pages/...`)
```markdown
# [Page Name]
**Path**: `src/app/[path]/page.tsx`
**Route**: `/[route]`

## Purpose
[One-line description of what this page does]

## Features
- **[Feature Name]**: [Brief description]
- **[Feature Name]**: [Brief description]

## Key Components Used
- `ComponentName`: [What it's used for]

## Data Sources
- `api.[router].[procedure]`: [What data it fetches]

## Dependencies
- `[package]`: [Why it's used]
- `~/hooks/[hook]`: [What it provides]
```

---

#### API Routes Template (`docs/api/routes/...`)
```markdown
# [Route Name]
**Path**: `src/app/api/[path]/route.ts`
**Endpoint**: `[METHOD] /api/[endpoint]`

## Purpose
[One-line description]

## Request
- **Method**: GET | POST | PUT | DELETE
- **Auth Required**: Yes/No
- **Body** (if applicable):
  ```typescript
  {
    field: type;
  }
  ```

## Response
```typescript
{
  field: type;
}
```

## Error Codes
- `400`: [When this occurs]
- `401`: [When this occurs]
- `500`: [When this occurs]

## Dependencies
- [External services, env vars, etc.]
```

---

#### tRPC Routers Template (`docs/api/trpc/...`)
```markdown
# [Router Name] Router
**Path**: `src/server/api/routers/[name].ts`

## Purpose
[One-line description of this router's domain]

## Procedures

### `[procedureName]`
- **Type**: query | mutation
- **Auth**: Required/Public
- **Input**: `{ field: type }`
- **Output**: `{ field: type }`
- **Description**: [What it does]

### `[procedureName]`
...

## Dependencies
- `~/server/db`: [Tables accessed]
- `[package]`: [Why used]
```

---

#### Components Template (`docs/components/...`)
```markdown
# [Component Name]
**Path**: `src/components/[path]/[name].tsx`

## Purpose
[One-line description]

## Props
| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `propName` | `type` | Yes/No | `value` | [Description] |

## Usage Example
```tsx
<ComponentName prop="value" />
```

## Variants/States
- **[Variant]**: [Description]

## Dependencies
- `[package/component]`: [Why used]
```

---

#### Hooks Template (`docs/hooks/...`)
```markdown
# [Hook Name]
**Path**: `src/hooks/[name].ts`

## Purpose
[One-line description]

## Signature
```typescript
function useHookName(params: ParamType): ReturnType
```

## Parameters
| Param | Type | Required | Description |
|-------|------|----------|-------------|
| `param` | `type` | Yes/No | [Description] |

## Returns
| Property | Type | Description |
|----------|------|-------------|
| `property` | `type` | [Description] |

## Usage Example
```tsx
const { data, loading } = useHookName({ param: value });
```

## Dependencies
- `[package/hook]`: [Why used]
```

---

### Documentation Checklist (Before PR/Commit)

- [ ] New pages have corresponding `docs/pages/...` file
- [ ] New API routes have corresponding `docs/api/routes/...` file
- [ ] New tRPC procedures are documented in `docs/api/trpc/...`
- [ ] New shared components have `docs/components/...` file
- [ ] New hooks have `docs/hooks/...` file
- [ ] Modified files have updated documentation
- [ ] `docs/overview.md` updated if architecture changed

---
