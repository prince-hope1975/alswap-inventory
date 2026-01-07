# Reset Password Page
**Path**: `src/app/auth/reset-password/page.tsx`

## Purpose
Completes the password reset process using a token from the URL.

## Features
*   **Token Handling**: reads `token` from URL search params.
*   **Form**: New Password and Confirm Password.
*   **Mutation**: calls `api.auth.resetPassword`.
*   **Error Handling**: Shows invalid token error if applicable.

## Dependencies
*   `~/trpc/react`: `api`
*   `next/navigation`: `useSearchParams`
*   `react-hook-form`: Form handling.
