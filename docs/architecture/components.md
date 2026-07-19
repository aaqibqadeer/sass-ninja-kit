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

| Component                                                                                                                         | Location                          | Purpose                                                                                        | Key Props                                                                                                                    | Used In             |
| --------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `Button`                                                                                                                          | `components/ui/button.tsx`        | Clickable action / link-styled action.                                                         | `variant` (default \| destructive \| outline \| secondary \| ghost \| link), `size` (default \| sm \| lg \| icon), `asChild` | `app/page.tsx`      |
| `Card` (+ `CardHeader`, `CardTitle`, `CardDescription`, `CardAction`, `CardContent`, `CardFooter`)                                | `components/ui/card.tsx`          | Surface container for grouped content.                                                         | standard `div` props via `className` composition                                                                             | `app/page.tsx`      |
| `Input`                                                                                                                           | `components/ui/input.tsx`         | Single-line text/email/etc. form field.                                                        | native `input` props (`type`, `placeholder`, `disabled`, …)                                                                  | `app/page.tsx`      |
| `Label`                                                                                                                           | `components/ui/label.tsx`         | Accessible label for a form control.                                                           | native `label` props, `htmlFor`                                                                                              | `app/page.tsx`      |
| `DropdownMenu` (+ `DropdownMenuTrigger`, `DropdownMenuContent`, `DropdownMenuItem`, `DropdownMenuLabel`, `DropdownMenuSeparator`) | `components/ui/dropdown-menu.tsx` | Radix dropdown menu (new-york).                                                                | Radix `DropdownMenu.*` props; `Item` `onSelect`, `inset`                                                                     | `WorkspaceSwitcher` |
| `Dialog` (+ `DialogTrigger`, `DialogContent`, `DialogHeader`, `DialogFooter`, `DialogTitle`, `DialogDescription`, `DialogClose`)  | `components/ui/dialog.tsx`        | Radix modal dialog (new-york). Built-in close button uses inline SVG (no icon-lib dependency). | `open`, `onOpenChange`; Radix `Dialog.*` props                                                                               | `WorkspaceSwitcher` |

## `/components/shared` — custom reusable components

| Component           | Location                                  | Purpose                                                                                                                                | Key Props                                                 | Used In                                 |
| ------------------- | ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------- |
| `WorkspaceSwitcher` | `components/shared/WorkspaceSwitcher.tsx` | Active-org dropdown + "Create organization" dialog. Render only when `features.multiTenant`.                                           | `organizations: {id,name}[]`, `activeOrgId`               | `app/dashboard/page.tsx`                |
| `FileUpload`        | `components/shared/FileUpload.tsx`        | Presigned-URL file uploader (POST `/api/storage/upload-url` → PUT to storage). Renders null when `features.storage` is off.            | `onUploaded?(: {key})`, `accept?`, `label?`, `maxSizeMb?` | _(Phase 6 — drop into any form)_        |
| `PhoneVerify`       | `components/shared/PhoneVerify.tsx`       | Two-step SMS verification (start → check). Placement-agnostic via `onVerified`. Renders null when `features.phoneVerification` is off. | `defaultPhone?`, `onVerified?(phone)`                     | _(Phase 6 — signup / settings / modal)_ |

Other candidates (per §9.2) — empty states, data tables, confirmation dialogs,
avatars, badges, loading skeletons, pagination, toasts — are built here the first
time they're needed, with an entry added in the same commit.

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

## `/components/org` — multi-tenant feature components (Phase 4)

Feature-scoped (§9.4): reusable within the org/multi-tenant surface, gated behind
`features.multiTenant`. Promote to `/components/shared` if a second, unrelated
feature needs the same pattern.

| Component            | Location                                | Purpose                                                    | Key Props                  | Used In                              |
| -------------------- | --------------------------------------- | ---------------------------------------------------------- | -------------------------- | ------------------------------------ |
| `CreateOrgForm`      | `components/org/CreateOrgForm.tsx`      | Create an org (POST `/api/org`) and switch to it.          | `onSuccess?`               | `WorkspaceSwitcher`                  |
| `InviteMemberForm`   | `components/org/InviteMemberForm.tsx`   | Invite a member by email + role to the active org (admin). | _(none)_                   | `app/settings/organization/page.tsx` |
| `MemberList`         | `components/org/MemberList.tsx`         | Roster with role change + remove (admin); self-row locked. | `members`, `currentUserId` | `app/settings/organization/page.tsx` |
| `PendingInvites`     | `components/org/PendingInvites.tsx`     | Pending invitations with a revoke action (admin).          | `invites`                  | `app/settings/organization/page.tsx` |
| `AcceptInviteButton` | `components/org/AcceptInviteButton.tsx` | Accept an invitation (POST `/api/org/invitations/accept`). | `token`                    | `app/invite/[token]/page.tsx`        |
