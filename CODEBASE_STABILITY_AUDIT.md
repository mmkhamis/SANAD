# Codebase Stability Audit — Wallet App

> Generated: 2026-04-15
> Scope: Full codebase — auth, services, hooks, screens, edge functions, UI components

---

## A. Current Issues Found

### A1. Edge Functions Have Zero JWT Verification

| Severity | P0 — CRITICAL |
|----------|---------------|
| **Affected** | All 7 edge functions in `supabase/functions/` |
| **Root cause** | None of the edge functions validate the `Authorization: Bearer <JWT>` header. The client sends it via `invokeWithRetry()`, but the server ignores it. |
| **Impact** | Anyone with the public anon key (visible in the JS bundle) can call `parse-transaction`, `ocr-receipt`, `transcribe-voice`, and `match-voice-review` directly — burning OpenAI API credits without authentication. |
| **Fix** | Add a JWT verification guard at the top of every edge function. See Section F1 for a reusable helper. |

**Files:**
- `supabase/functions/parse-transaction/index.ts`
- `supabase/functions/ocr-receipt/index.ts`
- `supabase/functions/transcribe-voice/index.ts`
- `supabase/functions/match-voice-review/index.ts`
- `supabase/functions/get-asset-prices/index.ts`

---

### A2. Twilio Credentials Committed in Plain Text

| Severity | P0 — CRITICAL |
|----------|---------------|
| **Affected** | `supabase/functions/.env` |
| **Root cause** | File contains `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, and `TWILIO_WHATSAPP_NUMBER` in plain text. While the root `.gitignore` excludes `.env`, the `supabase/functions/.env` path may not be excluded. |
| **Impact** | Credential leak if repo is shared, forked, or made public. |
| **Fix** | 1) Rotate the Twilio credentials immediately. 2) Move them to Supabase Dashboard → Edge Functions → Secrets. 3) Add `supabase/functions/.env` to `.gitignore` explicitly. 4) Run `git rm --cached supabase/functions/.env` if already tracked. |

---

### A3. WhatsApp Webhook Has No Signature Verification

| Severity | P0 — CRITICAL |
|----------|---------------|
| **Affected** | `supabase/functions/whatsapp-webhook/index.ts` |
| **Root cause** | The webhook accepts any POST request without verifying Twilio's `X-Twilio-Signature` header. |
| **Impact** | Attackers can send forged webhook payloads to inject arbitrary transactions into any user's account. |
| **Fix** | Verify the `X-Twilio-Signature` header using Twilio's HMAC-SHA1 validation before processing any message. |

---

### A4. `process-whatsapp` Falls Back to First Profile in DB

| Severity | MEDIUM |
|----------|--------|
| **Affected** | `supabase/functions/process-whatsapp/index.ts` — `resolveUser()` function |
| **Root cause** | If a phone number doesn't match any profile, the function falls back to `.select('id').limit(1).single()` — selecting the **first** profile in the database — then creates transactions for that random user. |
| **Fix** | Remove the fallback. If no profile matches, log a warning and skip processing. |

---

### A5. Transaction Search — Unsanitized Filter Interpolation

| Severity | MEDIUM |
|----------|--------|
| **Affected** | `services/transaction-service.ts` line 68–70 |
| **Root cause** | `filters.search` is user input interpolated directly into a PostgREST `.or()` filter string without sanitization. |
| **Code** |
```typescript
query = query.or(
  `description.ilike.%${filters.search}%,merchant.ilike.%${filters.search}%`,
);
```
| **Fix** | Sanitize like `community-service.ts` already does: `filters.search.replace(/[%_,()]/g, '')` |

---

### A6. TanStack Query Hooks Lack `enabled` Auth Guards

| Severity | MEDIUM |
|----------|--------|
| **Affected** | 14 query hooks |
| **Root cause** | None of the data-fetching hooks have `enabled: isAuthenticated` or similar guards. They rely entirely on `_layout.tsx` rendering `<LoadingScreen>` while auth is loading. This is fragile — any race condition or routing edge case causes cascading 401s. |

**Unguarded hooks:**
- `useDashboard.ts`
- `useCategories.ts`
- `useBudgets.ts`
- `useAccounts.ts`
- `useTransactions.ts`
- `useSubscriptions.ts`
- `useMonthlyLogs.ts`
- `useGoals.ts`
- `useInsights.ts`
- `useAssets.ts`
- `useHabits.ts`
- `useBenchmarks.ts`
- `useTrash.ts`
- `useReviewTransactions.ts`

Only `useCommunity.ts` uses `enabled` guards (for dynamic params, not auth).

| **Fix** | Add `enabled: !!useAuthStore.getState().user` to every query hook, or create a `useAuthenticatedQuery` wrapper (see Section F). |

---

### A7. Missing Error Boundaries on 8 Screens

| Severity | MEDIUM |
|----------|--------|
| **Affected** | Screens without `<ErrorBoundary>` wrappers |

**Screens WITH ErrorBoundary (good):**
- `index.tsx`, `transactions.tsx`, `analytics.tsx`, `add.tsx`, `goals.tsx`
- `subscriptions.tsx`, `smart-input.tsx`

**Screens WITHOUT ErrorBoundary (missing):**
- `profile.tsx`
- `community.tsx`
- `community-detail.tsx`
- `assets.tsx`
- `review.tsx`
- `trash.tsx`
- `split-event.tsx`
- `create-split-event.tsx`

| **Fix** | Wrap each screen's default export with `<ErrorBoundary>`. |

---

### A8. `useAuthBootstrap` — Implicit `setLoading(false)` Coupling

| Severity | LOW |
|----------|-----|
| **Affected** | `hooks/useAuthBootstrap.ts` |
| **Root cause** | `setLoading` is destructured but never called directly. `setUser()` and `clearUser()` both set `isLoading: false` as a side effect inside the store. If someone refactors either function without updating `isLoading`, the app gets stuck on the loading screen. |
| **Fix** | Add explicit `setLoading(false)` in the `finally` block of `bootstrap()`. |

---

### A9. `useInsights` Directly Imports Supabase Client

| Severity | LOW |
|----------|-----|
| **Affected** | `hooks/useInsights.ts` line 14 |
| **Root cause** | The hook imports `supabase` directly for a realtime subscription. This violates the project rule: _"No Supabase calls inside screens or components."_ |
| **Fix** | Move the realtime subscription to a service file or a dedicated `lib/realtime.ts`. |

---

## B. Structural Risks

### B1. Weak Auth Boundary — Single Loading Gate

The entire auth protection relies on one `if (isLoading) return <LoadingScreen />` in `_layout.tsx`. If this gate is bypassed (deep links, `router.replace`, React Suspense), all screens render and all queries fire unauthenticated.

**Risk:** Cascading 401 errors → poor UX, wasted API calls, potential data leaks.

### B2. Edge Functions Are Open Endpoints

The Supabase anon key is embedded in the client JS bundle. Since edge functions perform no JWT verification, they are de facto public APIs. This means:
- Any user can call `ocr-receipt` or `transcribe-voice` with arbitrary data
- OpenAI API costs are completely uncontrolled
- No rate limiting exists

### B3. `getSession()` Cache Staleness

`@supabase/supabase-js` v2.64+ returns a **cached** session from `getSession()`. The access token may be expired even though `expires_at` says otherwise. Any code path that calls `getSession()` and trusts the token without refreshing is vulnerable.

**Current state:** `ensureFreshSession()` in `lib/supabase.ts` was fixed to return the token directly from `refreshSession()`. However, any future code that calls `getSession()` directly will hit this bug.

### B4. No Centralized Request Error Classification

Error handling varies across the codebase:
- Edge function errors are extracted in `invokeWithRetry` via `error.context.json()`
- Service functions throw `new Error(error.message)` from Supabase SDK
- Screens catch with `try/catch` and show `Alert.alert()`
- Some catch blocks are empty: `catch {}` or `catch { /* ignore */ }`

There is no centralized error classifier that distinguishes:
- Auth errors (→ sign out / redirect)
- Network errors (→ retry / offline banner)
- Validation errors (→ show to user)
- Server errors (→ generic fallback)

### B5. Mutation Cache Invalidation Gaps

Several mutation hooks don't invalidate related query keys:
- Subscription mutations don't invalidate `dashboard` (dashboard shows subscription totals)
- Commitment mutations don't invalidate `commitmentsDue` (separate query key)
- Budget mutations don't invalidate `goals` (goals derived from budgets)

This causes stale data on related screens until manual refresh.

---

## C. Preventive Guardrails

### C1. JSX Structure Rules

1. **Never use `condition && <Component />`** for non-boolean conditions.  
   Use `condition ? <Component /> : null` to avoid rendering `0` or `""`.

2. **Every `.map()` must return JSX wrapped in a single root element** with a unique `key` that is not array index (prefer `item.id`).

3. **Limit View nesting to 5 levels max.** Extract deeper nesting into named sub-components.

4. **Conditional blocks inside JSX must be wrapped in `{( )}` parentheses** to make intent clear:
   ```tsx
   {isLoaded ? (
     <View>
       <Text>Content</Text>
     </View>
   ) : null}
   ```

5. **Keep closures out of JSX props** for components that use `React.memo`. Extract to `useCallback`.

### C2. Auth Preconditions

1. **Every TanStack Query hook must include `enabled: !!userId`** (or equivalent auth guard). Never rely solely on the layout loading gate.

2. **Never call `getSession()` to read a token.** Use `ensureFreshSession()` from `lib/supabase.ts` which returns a guaranteed-fresh token.

3. **Edge functions must verify JWT** before processing. Use the `verifyJwt()` helper (Section F1).

4. **Mutations that create/update data must check `useAuthStore.getState().isAuthenticated`** before executing. This catches cases where a stale UI remains visible after sign-out.

### C3. Supabase Request Conventions

1. **All Supabase data access must go through `services/` files only.** Hooks and screens never import `supabase` directly.

2. **All edge function calls must use `invokeWithRetry()`** from `lib/supabase.ts`. No raw `supabase.functions.invoke()`.

3. **All `.or()` / `.ilike()` filters with user input must sanitize** with:
   ```typescript
   const safe = input.replace(/[%_,()]/g, '');
   ```

4. **Secrets must live in Supabase Dashboard → Edge Functions → Secrets.** Never commit `.env` files with credentials.

### C4. Error Handling Strategy

1. **Every screen must be wrapped in `<ErrorBoundary>`.** No exceptions.

2. **Every data-driven screen must handle 3 states:** loading, error, empty.

3. **Empty `catch {}` blocks are banned.** Catch blocks must either:
   - Log the error (even if swallowed)
   - Re-throw to the caller
   - Show user feedback

4. **Auth errors must trigger sign-out.** Use the pattern in `invokeWithRetry` where 401/JWT errors attempt refresh then sign out on failure.

### C5. Query & Mutation Conventions

1. **Mutations must invalidate all affected query keys** — not just the direct one. Example: deleting a transaction must invalidate `transactions`, `dashboard`, and `analytics`.

2. **Queries depending on dynamic params must use `enabled`:**
   ```typescript
   useQuery({
     queryKey: ['detail', id],
     queryFn: () => fetchById(id!),
     enabled: !!id,
   });
   ```

3. **Never use `queryClient` outside hooks.** Access it via `useQueryClient()` inside components or pass it explicitly in service functions.

---

## D. Required Refactors

### P0 — Must Fix Now

| # | Refactor | Effort |
|---|----------|--------|
| D1 | Add JWT verification to all 5 AI edge functions | 1 hour |
| D2 | Rotate Twilio credentials & move to Supabase Dashboard Secrets | 15 min |
| D3 | Add `supabase/functions/.env` to `.gitignore` and `git rm --cached` | 5 min |
| D4 | Sanitize `filters.search` in `transaction-service.ts` line 68 | 5 min |

### P1 — Important

| # | Refactor | Effort |
|---|----------|--------|
| D5 | Add `enabled` auth guard to all 14 query hooks | 1 hour |
| D6 | Add `<ErrorBoundary>` to 8 unprotected screens | 30 min |
| D7 | Add explicit `setLoading(false)` in `useAuthBootstrap` bootstrap `finally` | 5 min |
| D8 | Remove `process-whatsapp` first-profile fallback | 10 min |
| D9 | Add Twilio signature verification to `whatsapp-webhook` | 1 hour |

### P2 — Cleanup & Resilience

| # | Refactor | Effort |
|---|----------|--------|
| D10 | Move `useInsights` realtime subscription to `services/` or `lib/` | 30 min |
| D11 | Audit all empty `catch {}` blocks and add logging or remove | 1 hour |
| D12 | Add cross-domain query invalidation to subscription/budget/commitment mutations | 30 min |
| D13 | Replace `key={index}` with `key={item.id}` in `GoalInsights.tsx` map | 5 min |

---

## E. Reusable Checklists

### E1. JSX / UI Checklist

Before merging any UI change:

- [ ] Every `<View>` has a matching `</View>` — verify tag nesting
- [ ] Conditional rendering uses `? ... : null` — not bare `&&` with non-booleans
- [ ] Every `.map()` has a unique `key` prop (not array index)
- [ ] View nesting is ≤ 5 levels — extract sub-components if deeper
- [ ] Screen is wrapped in `<ErrorBoundary>`
- [ ] Screen handles loading, error, and empty states
- [ ] No inline `StyleSheet.create` — use NativeWind classes or constants
- [ ] `FlashList` used instead of `FlatList`; `expo-image` instead of RN `Image`

### E2. Auth / API Checklist

Before merging any auth-related change:

- [ ] `getSession()` is NOT used to read access tokens — use `ensureFreshSession()`
- [ ] Edge functions verify JWT via `supabase.auth.getUser()` before processing
- [ ] No credentials in source code or `.env` files committed to repo
- [ ] `invokeWithRetry()` is used for all edge function calls
- [ ] Auth errors (401 / invalid JWT) trigger session refresh → sign out fallback
- [ ] No `supabase` import in screens or hooks (only in `services/` and `lib/`)

### E3. Supabase / Database Checklist

- [ ] All data mutations go through `services/` layer
- [ ] `.or()` / `.ilike()` filters sanitize user input
- [ ] Mutations invalidate all affected TanStack Query keys
- [ ] Row Level Security (RLS) is enabled on all tables
- [ ] Edge function secrets are in Supabase Dashboard, not in code

### E4. Async / Query Checklist

- [ ] Every `useQuery` that depends on auth has `enabled: !!user` guard
- [ ] Every `useQuery` with dynamic params has `enabled: !!param`
- [ ] Mutations use `onSuccess` or `onSettled` for cache invalidation
- [ ] No empty `catch {}` blocks — either log, re-throw, or show feedback
- [ ] Long-running operations (OCR, voice) show loading indicators
- [ ] Haptic feedback on user-initiated actions

### E5. Receipt Scan / OCR Checklist

- [ ] Image is resized to ≤ 1024px before base64 encoding (`expo-image-manipulator`)
- [ ] `base64: false` on `ImagePicker` — use `manipulateAsync` for base64 instead
- [ ] `mediaTypes: ['images']` (not deprecated `MediaTypeOptions.Images`)
- [ ] MIME type derived from file extension and passed to edge function
- [ ] Edge function uses `detail: 'low'` for Vision API (not `'high'`)
- [ ] Auth token is fresh before calling edge function
- [ ] Error feedback shown to user on failure — no silent `catch {}`

### E6. Voice Input Checklist

- [ ] Recording preset overrides iOS output to `.m4a` with `IOSOutputFormat.MPEG4AAC`
- [ ] MIME type derived from audio URI extension and sent with `audio_base64`
- [ ] Edge function maps MIME to correct file extension for OpenAI
- [ ] Recording is cleaned up (`deleteAsync`) after processing
- [ ] Transcription result is validated (non-empty) before auto-parsing

---

## F. Suggested Utility Files & Helpers

### F1. Edge Function JWT Guard — `supabase/functions/_shared/auth.ts`

```typescript
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

/**
 * Verify the JWT from the Authorization header.
 * Returns the authenticated user ID or a 401 Response.
 */
export async function verifyAuth(
  req: Request,
): Promise<{ userId: string } | Response> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return new Response(
      JSON.stringify({ error: 'Missing authorization header' }),
      { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    return new Response(
      JSON.stringify({ error: 'Invalid or expired token' }),
      { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } },
    );
  }

  return { userId: user.id };
}
```

**Usage in any edge function:**
```typescript
import { verifyAuth } from '../_shared/auth.ts';

// Inside handler, after OPTIONS check:
const auth = await verifyAuth(req);
if (auth instanceof Response) return auth; // 401
const { userId } = auth;
```

---

### F2. Sanitized PostgREST Filter — `lib/filters.ts`

```typescript
/** Sanitize user input for use in PostgREST .or()/.ilike() filters. */
export function sanitizeFilterInput(input: string): string {
  return input.replace(/[%_,()]/g, '').trim();
}
```

---

### F3. Auth-Gated Query Factory — `lib/authenticated-query.ts`

```typescript
import { useAuthStore } from '../store/auth-store';
import { useQuery, type UseQueryOptions, type QueryKey } from '@tanstack/react-query';

/**
 * A useQuery wrapper that automatically disables when user is not authenticated.
 * Prevents 401 cascades during auth loading or after sign-out.
 */
export function useAuthenticatedQuery<T>(
  options: UseQueryOptions<T, Error, T, QueryKey>,
) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  return useQuery({
    ...options,
    enabled: isAuthenticated && (options.enabled ?? true),
  });
}
```

**Usage (drop-in replacement):**
```typescript
// Before:
const { data } = useQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard });

// After:
const { data } = useAuthenticatedQuery({ queryKey: ['dashboard'], queryFn: fetchDashboard });
```

---

## G. Summary

### Biggest Current Risks

1. **Edge functions are open to the public** — any attacker with the anon key can burn OpenAI credits
2. **Twilio credentials in source control** — rotate immediately
3. **No query auth guards** — fragile single-gate protection against 401 cascades
4. **WhatsApp webhook accepts unverified payloads** — transaction injection risk

### Most Urgent Fixes

1. Add JWT verification to all edge functions (P0)
2. Rotate Twilio credentials + move to Dashboard Secrets (P0)
3. Sanitize transaction search input (P0)
4. Add `enabled` auth guards to all 14 query hooks (P1)
5. Add ErrorBoundary to 8 unprotected screens (P1)

### What This Audit Covers

- 7 edge functions audited for auth, error handling, CORS
- 14 query hooks audited for auth guards and cache invalidation
- 10+ service files audited for input sanitization and error handling
- 16 tab screens audited for error boundaries and state handling
- Auth bootstrap flow audited for race conditions
- JSX patterns audited for structural risks
- Concrete checklists for 6 domains
- 3 reusable utility file proposals with full code
