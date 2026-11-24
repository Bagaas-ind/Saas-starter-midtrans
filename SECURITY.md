# Security Policy

## Supported status

This project is an early-stage open-source starter kit. It is not yet represented as production-ready software. Do not use it to process live payments until the security and production-readiness items in the README have been reviewed and tested.

## Reporting a vulnerability

Please do not disclose exploitable vulnerabilities in public issues.

Use GitHub's **Private vulnerability reporting** feature for this repository, if enabled. If private reporting is unavailable, contact the repository maintainer privately through their GitHub profile and include:

- A description of the issue and its potential impact.
- A minimal reproduction or proof of concept.
- The affected file, route, or configuration.
- Any suggested mitigation.

Please allow time for the maintainer to investigate before making the issue public.

## Secrets

Never include Supabase service-role keys, Midtrans server keys, access tokens, or real customer/payment data in reports or commits. Rotate any credential that may have been exposed.
