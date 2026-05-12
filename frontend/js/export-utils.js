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
    // Apply red font to specific cells: opts.redCells = [{row, col}] (0-based, row 0 = first data row after header)
    if(opts.redCells&&opts.redCells.length){
      opts.redCells.forEach(function(rc){
        var addr=XLSX.utils.encode_cell({r:rc.row+1,c:rc.col});// +1 for header row
        if(ws[addr])ws[addr].s={font:{color:{rgb:'FF0000'},bold:true}};
      });
    }
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
    var _nd=new Date();var _mn=['\u0e21\u0e01\u0e23\u0e32\u0e04\u0e21','\u0e01\u0e38\u0e21\u0e20\u0e32\u0e1e\u0e31\u0e19\u0e18\u0e4c','\u0e21\u0e35\u0e19\u0e32\u0e04\u0e21','\u0e40\u0e21\u0e29\u0e32\u0e22\u0e19','\u0e1e\u0e24\u0e29\u0e20\u0e32\u0e04\u0e21','\u0e21\u0e34\u0e16\u0e38\u0e19\u0e32\u0e22\u0e19','\u0e01\u0e23\u0e01\u0e0e\u0e32\u0e04\u0e21','\u0e2a\u0e34\u0e07\u0e2b\u0e32\u0e04\u0e21','\u0e01\u0e31\u0e19\u0e22\u0e32\u0e22\u0e19','\u0e15\u0e38\u0e25\u0e32\u0e04\u0e21','\u0e1e\u0e24\u0e28\u0e08\u0e34\u0e01\u0e32\u0e22\u0e19','\u0e18\u0e31\u0e19\u0e27\u0e32\u0e04\u0e21'];
    doc.text('PPK DriveHub - '+_nd.getDate()+' '+_mn[_nd.getMonth()]+' '+(_nd.getFullYear()+543),14,22);
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

  /**
   * Export multi-sheet Excel with report metadata header rows
   * @param {Object} opts
   * @param {string} opts.filename
   * @param {Array}  opts.sheets  - [{sheetName, headers, rows}]
   * @param {Object} opts.reportMeta - {reportedBy, reportedByPosition, dateRange, type}
   */
  async function exportExcelMultiSheet(opts){
    await loadScript(XLSX_URL);
    var meta=opts.reportMeta||{};
    var wb=XLSX.utils.book_new();
    opts.sheets.forEach(function(s){
      var headerRows=[
        ['\u0e23\u0e30\u0e1a\u0e1a PPK DriveHub | \u0e42\u0e23\u0e07\u0e40\u0e23\u0e35\u0e22\u0e19\u0e1e\u0e23\u0e30\u0e22\u0e32\u0e1e\u0e34\u0e17\u0e22\u0e32\u0e04\u0e21'],
        ['\u0e1c\u0e39\u0e49\u0e2d\u0e2d\u0e01\u0e23\u0e32\u0e22\u0e07\u0e32\u0e19: '+(meta.reportedBy||'-')+' | \u0e15\u0e33\u0e41\u0e2b\u0e19\u0e48\u0e07: '+(meta.reportedByPosition||'-')],
        ['\u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e2d\u0e2d\u0e01: '+new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'})+' | \u0e0a\u0e48\u0e27\u0e07\u0e02\u0e49\u0e2d\u0e21\u0e39\u0e25: '+(meta.dateRange||'-')+' | \u0e1b\u0e23\u0e30\u0e40\u0e20\u0e17: '+(meta.type||'-')],
        []
      ];
      var data=s.headers ? headerRows.concat([s.headers]).concat(s.rows) : headerRows.concat(s.rows);
      var ws=XLSX.utils.aoa_to_sheet(data);
      XLSX.utils.book_append_sheet(wb,ws,s.sheetName||'Sheet1');
    });
    XLSX.writeFile(wb,(opts.filename||'export')+'.xlsx');
  }

  var HTML2CANVAS_URL='https://cdn.jsdelivr.net/npm/html2canvas@1.4/dist/html2canvas.min.js';

  /**
   * Export official PDF (Thai-safe via html2canvas)
   * @param {Object} opts
   * @param {string} opts.title
   * @param {string} opts.subtitle
   * @param {string[]} opts.headers
   * @param {Array[]} opts.rows
   * @param {string} opts.dateRange
   * @param {string} opts.reportType  'queue'|'fuel'
   * @param {string} opts.preparedBy / opts.preparedByPos
   * @param {string} opts.checkedBy / opts.checkedByPos   (queue: vehicle chief)
   * @param {string} opts.approvedBy / opts.approvedByPos (queue: deputy director)
   * @param {string} opts.directorBy / opts.directorByPos (queue only: director)
   */
  async function exportOfficialPDF(opts){
    await loadScript(JSPDF_URL);
    await loadScript(HTML2CANVAS_URL);
    var title=opts.title||'\u0e23\u0e32\u0e22\u0e07\u0e32\u0e19';
    var dateRange=opts.dateRange||'-';
    // Build table rows HTML
    var theadCells=opts.headers.map(function(h){return '<th>'+_esc(h)+'</th>';}).join('');
    var tbodyRows=opts.rows.map(function(r,i){
      return '<tr'+(i%2===1?' style="background:#f5f5f5"':'')+'>'+
        (r.map?r.map(function(c){return '<td>'+_esc(c==null?'-':c)+'</td>';}).join(''):'')+'</tr>';
    }).join('');
    // Signature blocks
    var sigs='';
    if(opts.reportType==='fuel'){
      sigs='<table class="sig-table"><tr>'+
        '<td><div class="sig-box"><div class="sig-name">'+(opts.preparedBy||'...............')+
        '</div><div class="sig-pos">'+(opts.preparedByPos||'\u0e1c\u0e39\u0e49\u0e08\u0e31\u0e14\u0e17\u0e33/\u0e04\u0e19\u0e02\u0e31\u0e1a')+
        '</div></div></td>'+
        '<td><div class="sig-box"><div class="sig-name">'+(opts.checkedBy||'...............')+
        '</div><div class="sig-pos">'+(opts.checkedByPos||'\u0e2b\u0e31\u0e27\u0e2b\u0e19\u0e49\u0e32\u0e1e\u0e31\u0e2a\u0e14\u0e38')+
        '</div></div></td>'+
        '</tr></table>';
    } else {
      sigs='<table class="sig-table"><tr>'+
        '<td><div class="sig-box"><div class="sig-name">'+(opts.preparedBy||'...............')+
        '</div><div class="sig-pos">'+(opts.preparedByPos||'\u0e1c\u0e39\u0e49\u0e08\u0e31\u0e14\u0e17\u0e33/\u0e1c\u0e39\u0e49\u0e02\u0e2d')+
        '</div></div></td>'+
        '<td><div class="sig-box"><div class="sig-name">'+(opts.checkedBy||'...............')+
        '</div><div class="sig-pos">'+(opts.checkedByPos||'\u0e2b\u0e19.\u0e07\u0e32\u0e19\u0e22\u0e32\u0e19\u0e1e\u0e32\u0e2b\u0e19\u0e30')+
        '</div></div></td>'+
        '<td><div class="sig-box"><div class="sig-name">'+(opts.approvedBy||'...............')+
        '</div><div class="sig-pos">'+(opts.approvedByPos||'\u0e23\u0e2d\u0e07\u0e1c\u0e2d.\u0e1d\u0e48\u0e32\u0e22\u0e1a\u0e23\u0e34\u0e2b\u0e32\u0e23')+
        '</div></div></td>'+
        '<td><div class="sig-box"><div class="sig-name">'+(opts.directorBy||'...............')+
        '</div><div class="sig-pos">'+(opts.directorByPos||'\u0e1c\u0e2d.\u0e42\u0e23\u0e07\u0e40\u0e23\u0e35\u0e22\u0e19')+
        '</div></div></td>'+
        '</tr></table>';
    }
    var html='<div style="width:1050px;background:white;font-family:Sarabun,\'TH Sarabun New\',sans-serif;font-size:13pt;padding:15mm 12mm;color:#000;box-sizing:border-box;">'+
      '<div style="text-align:center;font-weight:bold;font-size:15pt;margin-bottom:4px;">\u0e42\u0e23\u0e07\u0e40\u0e23\u0e35\u0e22\u0e19\u0e1e\u0e23\u0e30\u0e22\u0e32\u0e1e\u0e34\u0e17\u0e22\u0e32\u0e04\u0e21</div>'+
      '<div style="text-align:center;font-size:14pt;margin-bottom:2px;">'+_esc(title)+'</div>'+
      (opts.subtitle?'<div style="text-align:center;font-size:12pt;margin-bottom:2px;">'+_esc(opts.subtitle)+'</div>':'')+
      '<div style="text-align:center;font-size:11pt;color:#555;margin-bottom:10px;">\u0e0a\u0e48\u0e27\u0e07\u0e40\u0e27\u0e25\u0e32: '+_esc(dateRange)+' | \u0e27\u0e31\u0e19\u0e17\u0e35\u0e48\u0e2d\u0e2d\u0e01: '+new Date().toLocaleDateString('th-TH',{year:'numeric',month:'long',day:'numeric'})+'</div>'+
      '<style>table.report-table{width:100%;border-collapse:collapse;font-size:11pt;}'+
      'table.report-table th{background:#4f46e5;color:#fff;padding:5px 6px;text-align:center;}'+
      'table.report-table td{border:1px solid #ccc;padding:4px 6px;}'+
      'table.sig-table{width:100%;margin-top:24px;border-collapse:collapse;}'+
      'table.sig-table td{width:25%;text-align:center;padding:8px;}'+
      '.sig-box{border-top:1px solid #333;padding-top:6px;margin-top:40px;}'+
      '.sig-name{font-weight:bold;font-size:11pt;}.sig-pos{font-size:10pt;color:#555;}</style>'+
      '<table class="report-table"><thead><tr>'+theadCells+'</tr></thead><tbody>'+tbodyRows+'</tbody></table>'+
      sigs+'</div>';
    var container=document.createElement('div');
    container.style.cssText='position:fixed;top:-99999px;left:-99999px;';
    container.innerHTML=html;
    document.body.appendChild(container);
    var canvas=await html2canvas(container.firstChild,{scale:1.5,useCORS:true,backgroundColor:'#ffffff'});
    document.body.removeChild(container);
    var imgData=canvas.toDataURL('image/jpeg',0.92);
    var imgW=297,imgH=Math.ceil(canvas.height*297/canvas.width);
    var doc=new jspdf.jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
    var pages=Math.ceil(imgH/210);
    for(var p=0;p<pages;p++){
      if(p>0)doc.addPage();
      doc.addImage(imgData,'JPEG',0,-(p*210),imgW,imgH);
    }
    doc.save((opts.filename||title)+'.pdf');
  }

  function _esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

  window.ExportUtils={exportExcel:exportExcel,exportPDF:exportPDF,exportCSV:exportCSV,exportExcelMultiSheet:exportExcelMultiSheet,exportOfficialPDF:exportOfficialPDF};
})();