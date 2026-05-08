# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\ui-responsive.spec.mjs >> Table Scroll บน Mobile >> vehicles — .table-wrap overflow-x: auto บน 390px
- Location: tests\e2e\ui-responsive.spec.mjs:101:5

# Error details

```
Error: apiRequestContext.get: connect ECONNREFUSED ::1:8788
Call log:
  - → GET http://localhost:8788/api/setup
    - user-agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.7727.15 Safari/537.36
    - accept: */*
    - accept-encoding: gzip,deflate,br

```