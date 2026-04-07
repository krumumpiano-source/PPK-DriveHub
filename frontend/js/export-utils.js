/* export-utils.js — Shared PDF/Excel export helpers for PPK DriveHub */
(function(){
  'use strict';

  // Lazy-load libraries from CDN
  var JSPDF_URL='https://cdn.jsdelivr.net/npm/jspdf@2/dist/jspdf.umd.min.js';
  var AUTOTABLE_URL='https://cdn.jsdelivr.net/npm/jspdf-autotable@3/dist/jspdf.plugin.autotable.min.js';
  var XLSX_URL='https://cdn.jsdelivr.net/npm/xlsx@0.18/dist/xlsx.full.min.js';

  function loadScript(url){
    return new Promise(function(resolve,reject){
      if(document.querySelector('script[src="'+url+'"]')){resolve();return}
      var s=document.createElement('script');s.src=url;s.onload=resolve;s.onerror=reject;document.head.appendChild(s);
    });
  }

  /**
   * Export table data to Excel (.xlsx)
   * @param {Object} opts
   * @param {string} opts.filename - file name without extension
   * @param {string} opts.sheetName - sheet name (default: 'Sheet1')
   * @param {string[]} opts.headers - column headers
   * @param {Array[]} opts.rows - 2D array of cell values
   */
  async function exportExcel(opts){
    await loadScript(XLSX_URL);
    var ws=XLSX.utils.aoa_to_sheet([opts.headers].concat(opts.rows));
    var wb=XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb,ws,opts.sheetName||'Sheet1');
    XLSX.writeFile(wb,(opts.filename||'export')+'.xlsx');
  }

  /**
   * Export table data to PDF
   * @param {Object} opts
   * @param {string} opts.filename
   * @param {string} opts.title - document title
   * @param {string[]} opts.headers
   * @param {Array[]} opts.rows
   * @param {string} [opts.orientation] - 'portrait' or 'landscape'
   */
  async function exportPDF(opts){
    await loadScript(JSPDF_URL);
    await loadScript(AUTOTABLE_URL);
    var doc=new jspdf.jsPDF({orientation:opts.orientation||'landscape',unit:'mm',format:'a4'});
    // Use built-in Helvetica (no Thai font — Thai will show as boxes, but numeric data works fine)
    doc.setFontSize(14);
    doc.text(opts.title||'Report',14,15);
    doc.setFontSize(9);
    doc.text('PPK DriveHub - '+new Date().toLocaleDateString('th-TH'),14,22);
    doc.autoTable({
      head:[opts.headers],
      body:opts.rows,
      startY:26,
      styles:{fontSize:8,cellPadding:2},
      headStyles:{fillColor:[99,102,241]},
      alternateRowStyles:{fillColor:[245,245,250]}
    });
    doc.save((opts.filename||'report')+'.pdf');
  }

  /**
   * Export data to CSV with BOM for Excel compatibility
   */
  function exportCSV(opts){
    function esc(v){var s=String(v==null?'':v);return(s.indexOf(',')>=0||s.indexOf('"')>=0||s.indexOf('\n')>=0)?'"'+s.replace(/"/g,'""')+'"':s}
    var lines=[opts.headers.map(esc).join(',')];
    opts.rows.forEach(function(r){lines.push(r.map(esc).join(','))});
    var csv='\ufeff'+lines.join('\r\n');
    var blob=new Blob([csv],{type:'text/csv;charset=utf-8;'});
    var url=URL.createObjectURL(blob);
    var a=document.createElement('a');a.href=url;a.download=(opts.filename||'export')+'.csv';
    document.body.appendChild(a);a.click();document.body.removeChild(a);URL.revokeObjectURL(url);
  }

  window.ExportUtils={exportExcel:exportExcel,exportPDF:exportPDF,exportCSV:exportCSV};
})();