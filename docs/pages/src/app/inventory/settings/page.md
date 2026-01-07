# General Settings Page
**Path**: `src/app/inventory/settings/page.tsx`

## Purpose
Configuration of general tenant and business settings.

## Features
*   **Company Profile**: Name, contact details.
*   **Branding**: Primary color (mapped to CSS variables), Logo upload.
*   **Receipts**: Header/Footer text customization.
*   **Regional**: Currency and helper text settings.
*   **Form**: Large form using `react-hook-form` and `zod`.

## Dependencies
*   `~/trpc/react`: `api`
*   `~/components/upload-dropzone`: File uploads.
*   `react-color`: Color picker.
