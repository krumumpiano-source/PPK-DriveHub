# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e\queue.spec.mjs >> 10. UI — queue-manage.html >> เข้าหน้า user-management.html โดยตรง → redirect ไป login หรือ unauthorized
- Location: tests\e2e\queue.spec.mjs:938:3

# Error details

```
Error: browserType.launch: Executable doesn't exist at C:\Users\krumu\AppData\Local\ms-playwright\chromium_headless_shell-1217\chrome-headless-shell-win64\chrome-headless-shell.exe
╔════════════════════════════════════════════════════════════╗
║ Looks like Playwright was just installed or updated.       ║
║ Please run the following command to download new browsers: ║
║                                                            ║
║     npx playwright install                                 ║
║                                                            ║
║ <3 Playwright Team                                         ║
╚════════════════════════════════════════════════════════════╝
```