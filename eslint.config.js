import js from '@eslint/js';

export default [
  {
    ...js.configs.recommended,
    files: ['functions/**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        // Cloudflare Workers globals
        fetch: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        URL: 'readonly',
        URLSearchParams: 'readonly',
        Headers: 'readonly',
        FormData: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        crypto: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        btoa: 'readonly',
        atob: 'readonly',
        ReadableStream: 'readonly',
        WritableStream: 'readonly',
        TransformStream: 'readonly',
        Blob: 'readonly',
        File: 'readonly',
        Event: 'readonly',
        EventTarget: 'readonly',
        AbortController: 'readonly',
        AbortSignal: 'readonly',
        structuredClone: 'readonly',
        queueMicrotask: 'readonly',
      },
    },
    rules: {
      // ป้องกัน TDZ bug (ใช้ตัวแปรก่อน declare)
      'no-use-before-define': ['error', { functions: false, classes: false, variables: true }],

      // ป้องกัน bug ทั่วไปอื่น ๆ ใน Workers code
      'no-undef': 'error',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-constant-condition': 'error',
      'no-unreachable': 'error',
      'no-duplicate-case': 'error',

      // ปิด rule ที่ไม่เหมาะกับ Workers pattern
      'no-console': 'off',
    },
  },
];
