/**
 * PPK DriveHub — Frontend Config (Cloudflare Edition)
 * ใช้ relative path เพราะ frontend และ API อยู่บน domain เดียวกัน (Cloudflare Pages)
 */
const CONFIG = {
    SYSTEM_NAME: 'PPK DriveHub',
    SYSTEM_SUBTITLE: 'ระบบบริหารจัดการยานพาหนะ โรงเรียนพะเยาพิทยาคม',
    SYSTEM_VERSION: '2.0.0',
    SCHOOL_NAME: 'โรงเรียนพะเยาพิทยาคม',
    ACADEMIC_YEAR: '2569',
    // API is on same origin — no base URL needed
    API_BASE_URL: '',
};
