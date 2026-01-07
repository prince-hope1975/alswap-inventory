# Users Page
**Path**: `src/app/inventory/users/page.tsx`

## Purpose
Staff and user access management.

## Features
*   **List**: Display users with roles (Admin, Manager, Cashier).
*   **CRUD**: Create, Update, Delete users via modal forms.
*   **Roles**: Role-based access control configuration (implied by role selection).
*   **Search**: Filter users by name/email.

## Dependencies
*   `~/trpc/react`: `api` (IAM router).
*   `lucide-react`: Role icons.
