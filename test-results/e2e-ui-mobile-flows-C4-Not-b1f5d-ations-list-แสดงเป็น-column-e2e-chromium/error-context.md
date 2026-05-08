# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-mobile-flows.spec.mjs >> C4: Notifications — Mobile >> notifications: list แสดงเป็น column
- Location: tests\e2e\ui-mobile-flows.spec.mjs:199:3

# Error details

```
Error: apiRequestContext.get: connect ECONNREFUSED ::1:8788
Call log:
  - → GET http://localhost:8788/api/setup
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```