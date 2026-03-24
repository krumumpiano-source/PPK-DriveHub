// Score Viewer Functions

async function displayScore(score) {
    const viewerContainer = document.getElementById('score-viewer');
    if (!viewerContainer) return;

    // ล้างเนื้อหาเดิม
    viewerContainer.innerHTML = '';

    if (!score.file_url) {
        viewerContainer.innerHTML = '<p>ไม่พบไฟล์โน้ต</p>';
        return;
    }

    // ตรวจสอบประเภทไฟล์จาก URL หรือ file_id
    // Google Drive download URL มักจะเป็น: .../uc?export=download&id=...
    const url = score.file_url || '';
    
    // ตรวจสอบว่าเป็น PDF หรือ Image จาก URL
    if (url.includes('.pdf') || url.includes('application/pdf')) {
        // แสดง PDF
        const iframe = document.createElement('iframe');
        iframe.src = url;
        iframe.style.width = '100%';
        iframe.style.height = '800px';
        iframe.style.border = 'none';
        viewerContainer.appendChild(iframe);
    } else if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        // แสดงรูปภาพ
        const img = document.createElement('img');
        img.src = url;
        img.alt = score.title || 'โน้ตเพลง';
        img.style.width = '100%';
        img.style.height = 'auto';
        img.style.maxWidth = '100%';
        viewerContainer.appendChild(img);
    } else {
        // ลิงก์ดาวน์โหลด (สำหรับไฟล์อื่นๆ)
        const downloadLink = document.createElement('a');
        downloadLink.href = url;
        downloadLink.textContent = 'ดาวน์โหลดโน้ต';
        downloadLink.className = 'btn btn-primary';
        downloadLink.download = (score.title || 'score') + '.pdf';
        downloadLink.target = '_blank';
        viewerContainer.appendChild(downloadLink);
        
        // แสดงข้อความเพิ่มเติม
        const info = document.createElement('p');
        info.textContent = 'คลิกปุ่มด้านบนเพื่อดาวน์โหลดไฟล์โน้ต';
        info.style.marginTop = '1rem';
        info.style.color = '#6c757d';
        viewerContainer.appendChild(info);
    }
    
    // Note: การ log การเข้าถึงถูกทำใน backend แล้ว (scores.gs)
}
