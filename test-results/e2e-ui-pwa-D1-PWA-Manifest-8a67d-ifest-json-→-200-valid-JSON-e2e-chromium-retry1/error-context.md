# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-pwa.spec.mjs >> D1: PWA Manifest >> GET /manifest.json → 200 + valid JSON
- Location: tests\e2e\ui-pwa.spec.mjs:50:3

# Error details

```
Error: apiRequestContext.get: connect ECONNREFUSED ::1:8788
Call log:
  - → GET http://localhost:8788/manifest.json
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```