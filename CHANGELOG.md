# Changelog

Plain-English, one line per phase.

- **Phase 1 — Project Scaffolding & Environment**: set up the basic skeleton for the app — an
  empty Expo (React Native) app on the frontend and an empty Cloudflare Workers backend, both with
  a working health-check, tests, linting, and a CI pipeline that runs on every push.
- **Phase 2 — Database Schema & Migrations**: created the four database tables the app needs
  (users, protein preferences, logged meals, and the "usual meals" library), plus a tool to apply
  or roll back those changes safely, and tests proving both directions work.
