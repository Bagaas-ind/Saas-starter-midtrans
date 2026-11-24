# Contributing

Thanks for considering a contribution to SaaS Starter Midtrans.

## Before you start

- Search existing issues and pull requests before opening a new one.
- For significant changes, open an issue first to discuss the approach.
- Keep changes focused and avoid unrelated formatting or refactoring.

## Development setup

1. Fork the repository.
2. Clone your fork and install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local` and configure Supabase and Midtrans Sandbox credentials.
4. Apply `supabase/schema.sql` to a development Supabase project.
5. Start the app with `npm run dev`.

## Before opening a pull request

Run the checks that apply to your changes:

```bash
npx tsc --noEmit
npm run build
```

For payment-related changes, include a clear description of the Sandbox scenario tested. Never include real credentials, customer data, or payment secrets in commits, screenshots, or issue reports.

## Pull request guidelines

- Explain the problem and the proposed solution.
- List important files or database changes.
- Include test results and known limitations.
- Update documentation and `.env.example` when configuration changes.
- Keep database migrations safe to apply and document any manual steps.

By submitting a contribution, you agree that it will be distributed under the repository's MIT license.
