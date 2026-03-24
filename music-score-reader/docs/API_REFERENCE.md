# API Reference
โปรแกรมอ่านโน้ตเพลงเพื่อการศึกษา

## Base URL
```
YOUR_GAS_WEB_APP_URL
```

## Authentication
API ส่วนใหญ่ต้องใช้ Bearer Token (ยกเว้น login)

Header:
```
Authorization: Bearer {token}
```

## Endpoints

### 1. Login
**POST** `?path=login`

Request Body:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "token": "base64_encoded_token",
  "user_id": "uuid",
  "email": "user@example.com",
  "role": "admin"
}
```

---

### 2. List Public Scores
**GET** `?path=scores/public`

Headers: `Authorization: Bearer {token}`

Response:
```json
{
  "success": true,
  "scores": [
    {
      "score_id": "uuid",
      "title": "ชื่อโน้ต",
      "score_type": "admin_public",
      "visibility": "public",
      "owner_id": "uuid",
      "file_id": "drive_file_id",
      "created_at": "2025-02-04T10:00:00Z"
    }
  ]
}
```

---

### 3. List Restricted Scores
**GET** `?path=scores/restricted`

Headers: `Authorization: Bearer {token}`

Response:
```json
{
  "success": true,
  "scores": [
    {
      "score_id": "uuid",
      "title": "ชื่อโน้ต",
      "score_type": "private_custom",
      "visibility": "restricted",
      "owner_id": "uuid",
      "file_id": "drive_file_id",
      "created_at": "2025-02-04T10:00:00Z"
    }
  ]
}
```

---

### 4. Get Score by ID
**GET** `?path=scores/get&id={score_id}`

Headers: `Authorization: Bearer {token}`

Response (มีสิทธิ์):
```json
{
  "success": true,
  "hasAccess": true,
  "score": {
    "score_id": "uuid",
    "title": "ชื่อโน้ต",
    "score_type": "admin_public",
    "visibility": "public",
    "file_url": "https://drive.google.com/uc?export=download&id=...",
    "owner_id": "uuid"
  }
}
```

Response (ไม่มีสิทธิ์):
```json
{
  "success": true,
  "hasAccess": false,
  "message": "Access denied"
}
```

---

### 5. Add Score (Admin Only)
**POST** `?path=scores/add`

Headers: `Authorization: Bearer {token}`

Request Body:
```json
{
  "title": "ชื่อโน้ต",
  "score_type": "admin_public",
  "visibility": "public",
  "owner_id": "admin_user_id",
  "file_id": "drive_file_id"
}
```

Response:
```json
{
  "success": true,
  "score_id": "uuid"
}
```

---

### 6. Grant License (Admin Only)
**POST** `?path=licenses/grant`

Headers: `Authorization: Bearer {token}`

Request Body:
```json
{
  "user_id": "uuid",
  "score_id": "uuid"
}
```

Response:
```json
{
  "success": true,
  "license_id": "uuid"
}
```

---

### 7. Check License
**GET** `?path=licenses/check&id={score_id}`

Headers: `Authorization: Bearer {token}`

Response:
```json
{
  "success": true,
  "hasLicense": true
}
```

---

### 8. Report Copyright Violation
**POST** `?path=takedown/report`

Request Body:
```json
{
  "score_id": "uuid",
  "reporter_email": "reporter@example.com",
  "reason": "ละเมิดลิขสิทธิ์",
  "evidence": "หลักฐานหรือลิงก์"
}
```

Response:
```json
{
  "success": true,
  "report_id": "uuid"
}
```

---

## Error Responses

### Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized"
}
```

### Invalid Endpoint
```json
{
  "success": false,
  "message": "Invalid endpoint"
}
```

### Internal Server Error
```json
{
  "success": false,
  "message": "Internal server error",
  "error": "Error details"
}
```

---

## Status Codes

- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden (Admin only)
- `404` - Not Found
- `500` - Internal Server Error

---

## Notes

1. **Token Format**: Token เป็น base64 encoded string (ใน production ควรใช้ JWT)
2. **File URLs**: ไม่ใช้ Drive Share Link โดยตรง แต่ใช้ Download URL ผ่าน backend
3. **Caching**: Public scores ควร cache ที่ frontend (5 นาที)
4. **Logging**: การเข้าถึง restricted scores จะถูก log อัตโนมัติ
