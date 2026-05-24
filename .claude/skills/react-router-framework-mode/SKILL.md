---
name: react-router-framework-mode
description: Build full-stack React applications using React Router's framework mode. Use when configuring routes, working with loaders and actions, handling forms, handling navigation, pending/optimistic UI, error boundaries, or working with react-router.config.ts or other react router conventions.
license: MIT
---

# React Router Framework Mode

Framework mode is React Router's full-stack development experience with file-based routing, server-side, client-side, and static rendering strategies, data loading and mutations, and type-safe route module API.

## When to Apply

- Configuring new routes (`app/routes.ts`)
- Loading data with `loader` or `clientLoader`
- Handling mutations with `action` or `clientAction`
- Navigating with `<Link>`, `<NavLink>`, `<Form>`, `redirect`, and `useNavigate`
- Implementing pending/loading UI states
- Configuring SSR, SPA mode, or pre-rendering (`react-router.config.ts`)
- Implementing authentication

## References

Load the relevant reference for detailed guidance on the specific API/concept:

| Reference | Use When |
|-----------|----------|
| `references/routing.md` | Configuring routes, nested routes, dynamic segments |
| `references/route-modules.md` | Understanding all route module exports |
| `references/special-files.md` | Customizing root.tsx, adding global nav/footer, fonts |
| `references/data-loading.md` | Loading data with loaders, streaming, caching |
| `references/actions.md` | Handling forms, mutations, validation |
| `references/navigation.md` | Links, programmatic navigation, redirects |
| `references/pending-ui.md` | Loading states, optimistic UI |
| `references/error-handling.md` | Error boundaries, error reporting |
| `references/rendering-strategies.md` | SSR vs SPA vs pre-rendering configuration |
| `references/middleware.md` | Adding middleware (requires v7.9.0+) |
| `references/sessions.md` | Cookie sessions, authentication, protected routes |
| `references/type-safety.md` | Auto-generated route types, type imports, type safety |

## Version Compatibility

Some features require specific React Router versions. **Always verify before implementing:**

```
npm list react-router
```

| Feature | Minimum Version | Notes |
|---------|-----------------|-------|
| Middleware | 7.9.0+ | Requires `v8_middleware` flag |
| Core framework features | 7.0.0+ | loaders, actions, Form, etc. |

## Critical Patterns

### Forms & Mutations

**Search forms** — use `<Form method="get">`, NOT `onSubmit` with `setSearchParams`:

```jsx
// ✅ Correct
<Form method="get">
  <input name="q" />
</Form>
```

**Inline mutations** — use `useFetcher`, NOT `<Form>` (which causes page navigation):

```jsx
const fetcher = useFetcher();
const optimistic = fetcher.formData?.get("favorite") === "true" ?? isFavorite;

<fetcher.Form method="post" action={`/favorites/${id}`}>
  <button>{optimistic ? "★" : "☆"}</button>
</fetcher.Form>;
```

**Mutations that navigate** — use `<Form method="post">`:

```jsx
<Form method="post">
  <button name="intent" value="delete">Delete</button>
</Form>
```

### Returning errors from actions

Use `data()` with a status code, not a plain object:

```tsx
import { data } from "react-router";

export async function action({ request }: Route.ActionArgs) {
  const errors: Record<string, string> = {};
  if (!email.includes("@")) errors.email = "Invalid email";
  if (Object.keys(errors).length > 0) {
    return data({ errors }, { status: 400 });
  }
  return redirect("/dashboard");
}
```

### Route Module Exports

**`meta` uses `loaderData`**, not deprecated `data`:

```jsx
// ✅ Correct
export function meta({ loaderData }: Route.MetaArgs) { ... }
```

### Layouts

**Global UI belongs in `root.tsx`** — don't create separate layout files for nav/footer.

## Further Documentation

https://reactrouter.com/docs
