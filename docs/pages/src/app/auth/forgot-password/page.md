# Forgot Password Page
**Path**: `src/app/auth/forgot-password/page.tsx`

## Purpose
Initiates the password reset flow.

## Features
*   **Form**: Email input.
*   **Mutation**: calls `api.auth.forgotPassword`.
*   **Feedback**: Shows success message instructing user to check email.

## Dependencies
*   `~/trpc/react`: `api`
*   `react-hook-form`: Form handling.
