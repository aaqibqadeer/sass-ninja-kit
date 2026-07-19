<!--
  ============================================================================
  COMPONENT CATALOG — living document (CLAUDE.md §9).

  Every new shared component MUST be added here in the SAME COMMIT it's
  introduced. Check this file BEFORE building a new component — reuse or extend
  an existing one before duplicating.

  Scope: everything in /components/ui (shadcn primitives) and /components/shared
  (our own reusable components). Feature-scoped components (/components/<feature>)
  are listed only once they're promoted to /shared per §9.4.
  ============================================================================
-->

# Component Catalog

Living catalog of every reusable component in the template.

## `/components/ui` — shadcn primitives

Unmodified shadcn/ui primitives (style: new-york). Tracked from day one so the
catalog reflects _all_ reusable UI, not just custom components.

| Component                                                                                          | Location                   | Purpose                                 | Key Props                                                                                                                    | Used In        |
| -------------------------------------------------------------------------------------------------- | -------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | -------------- |
| `Button`                                                                                           | `components/ui/button.tsx` | Clickable action / link-styled action.  | `variant` (default \| destructive \| outline \| secondary \| ghost \| link), `size` (default \| sm \| lg \| icon), `asChild` | `app/page.tsx` |
| `Card` (+ `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`) | `components/ui/card.tsx`   | Surface container for grouped content.  | standard `div` props via `className` composition                                                                             | `app/page.tsx` |
| `Input`                                                                                            | `components/ui/input.tsx`  | Single-line text/email/etc. form field. | native `input` props (`type`, `placeholder`, `disabled`, …)                                                                  | `app/page.tsx` |
| `Label`                                                                                            | `components/ui/label.tsx`  | Accessible label for a form control.    | native `label` props, `htmlFor`                                                                                              | `app/page.tsx` |

## `/components/shared` — custom reusable components

_None yet._ The first candidates (per §9.2) are form fields, empty states, data
tables, modals, confirmation dialogs, file uploads, avatars, badges, loading
skeletons, pagination, and toasts — each built here the first time it's needed,
with an entry added to this table in the same commit.

## `/components/auth` — auth feature components (Phase 3)

Feature-scoped (§9.4): reusable within auth. Each reads `config/features.ts` and
renders only enabled methods, so they degrade gracefully when a flag is off.

| Component           | Location                                | Purpose                                                              | Key Props | Used In                       |
| ------------------- | --------------------------------------- | -------------------------------------------------------------------- | --------- | ----------------------------- |
| `LoginForm`         | `components/auth/LoginForm.tsx`         | Sign-in card: password + magic-link + OAuth, per enabled flags.      | `next?`   | `app/login/page.tsx`          |
| `SignupForm`        | `components/auth/SignupForm.tsx`        | Registration card: email/password + OAuth.                           | _(none)_  | `app/signup/page.tsx`         |
| `ResetPasswordForm` | `components/auth/ResetPasswordForm.tsx` | Dual-mode: request a reset link, or set a new password with a token. | `token?`  | `app/reset-password/page.tsx` |
| `MagicLinkForm`     | `components/auth/MagicLinkForm.tsx`     | Passwordless email link request.                                     | _(none)_  | `LoginForm`                   |
| `OAuthButtons`      | `components/auth/OAuthButtons.tsx`      | One button per enabled OAuth provider.                               | `next?`   | `LoginForm`, `SignupForm`     |
| `LogoutButton`      | `components/auth/LogoutButton.tsx`      | Clears the session and redirects to login.                           | _(none)_  | `app/dashboard/page.tsx`      |
| `AuthDivider`       | `components/auth/AuthDivider.tsx`       | Labelled "or" separator between method groups.                       | `label?`  | `LoginForm`, `SignupForm`     |
