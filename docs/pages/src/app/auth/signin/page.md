# Sign In Page
**Path**: `src/app/auth/signin/page.tsx`

## Purpose
Allows existing users to sign in to the inventory dashboard.

## Features
*   **Form**: Email and password fields using `react-hook-form` and `zod`.
*   **Authentication**: Uses `next-auth/react` `signIn` method ("credentials" provider).
*   **Error Handling**: Displays invalid credentials error.
*   **Navigation**: Redirects to `/inventory` on success.

## Dependencies
*   `next-auth/react`: `signIn`
*   `react-hook-form`: Form handling.
*   `zod`: Validation.
*   `lucide-react`: Icons (`Loader2`).
