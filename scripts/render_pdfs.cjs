const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();

    const tempDir = path.join(process.env.TEMP || 'C:\\temp', 'ppk_repair_render');

    const tasks = [
        {
            html: path.join(tempDir, 'render_2455.html'),
            pdf: 'D:/AI CURSER/ppk-drivehub/เอกสาร/ใบแจ้งซ่อม_นข2455_โตโยต้าพะเยา.pdf'
        },
        {
            html: path.join(tempDir, 'render_1977.html'),
            pdf: 'D:/AI CURSER/ppk-drivehub/เอกสาร/ใบแจ้งซ่อม_นข1977_โตโยต้าพะเยา.pdf'
        }
    ];

    for (const t of tasks) {
        const fileUrl = 'file:///' + path.resolve(t.html).replace(/\\/g, '/');
        await page.goto(fileUrl, { waitUntil: 'networkidle' });
        await page.pdf({
            path: t.pdf,
            format: 'A4',
            printBackground: true,
            margin: { top: '0mm', right: '0mm', bottom: '0mm', left: '0mm' }
        });
        console.log('Successfully rendered PDF:', t.pdf);
    }

    // Clean up temporary HTML directory
    try {
        fs.rmSync(tempDir, { recursive: true, force: true });
        console.log('Cleaned up temporary HTML files.');
    } catch (e) {
        console.warn('Could not remove tempDir:', e.message);
    }

    await browser.close();
})();

