# Sign Up Page
**Path**: `src/app/auth/signup/page.tsx`

## Purpose
Registration page for new shop owners/tenants.

## Features
*   **Form**: Company name, Full Name, Email, Password, Confirm Password.
*   **Validation**: Zod schema ensures passwords match and fields are valid.
*   **Mutation**: calls `api.auth.register`.
*   **Success Flow**: Redirects to sign in page with `?registered=true`.

## Dependencies
*   `~/trpc/react`: `api`
*   `react-hook-form`: Form handling.
