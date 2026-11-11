import os
import re
from pythainlp import word_tokenize
from docx import Document
from docx.shared import Pt, Cm, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT, WD_ALIGN_VERTICAL
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

ZWS = "\u200b"

def insert_zwsp(text: str) -> str:
    """Insert zero-width space into Thai text runs for proper Word line breaking."""
    if not text:
        return ""
    thai_pattern = re.compile(r'([\u0E00-\u0E7F]+)')
    parts = thai_pattern.split(str(text))
    result = []
    for part in parts:
        if thai_pattern.fullmatch(part):
            tokens = word_tokenize(part, engine="newmm")
            result.append(ZWS.join(tokens))
        else:
            result.append(part)
    return "".join(result)

def set_cell_background(cell, fill_hex):
    """Set shading color of a table cell."""
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=100, bottom=100, left=150, right=150):
    """Set inner padding of a table cell in dxa (1 pt = 20 dxa)."""
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_table_borders(table, color="CCCCCC", sz="4", val="single"):
    """Set subtle borders for a table."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="none"/>'
        f'  <w:right w:val="none"/>'
        f'  <w:insideH w:val="{val}" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideV w:val="none"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def set_box_borders(table, color="999999", sz="6"):
    """Set full outline border for a box/table."""
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:right w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="E0E0E0"/>'
        f'  <w:insideV w:val="single" w:sz="4" w:space="0" w:color="E0E0E0"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def add_p(container, text="", font_name="TH Sarabun New", size=14, bold=False, color=None, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=0, space_after=2, line_spacing=1.15):
    """Add a styled paragraph with ZWS."""
    p = container.add_paragraph()
    p.alignment = align
    p.paragraph_format.space_before = Pt(space_before)
    p.paragraph_format.space_after = Pt(space_after)
    p.paragraph_format.line_spacing = line_spacing
    
    if text:
        run = p.add_run(insert_zwsp(text))
        run.font.name = font_name
        run.font.size = Pt(size)
        run.bold = bold
        if color:
            run.font.color.rgb = color
            
        rPr = run._r.get_or_add_rPr()
        rFonts = parse_xml(f'<w:rFonts {nsdecls("w")} w:ascii="{font_name}" w:hAnsi="{font_name}" w:cs="{font_name}"/>')
        rPr.append(rFonts)
    return p

def add_run(p, text, font_name="TH Sarabun New", size=14, bold=False, color=None):
    """Add run to existing paragraph with ZWS."""
    run = p.add_run(insert_zwsp(text))
    run.font.name = font_name
    run.font.size = Pt(size)
    run.bold = bold
    if color:
        run.font.color.rgb = color
    rPr = run._r.get_or_add_rPr()
    rFonts = parse_xml(f'<w:rFonts {nsdecls("w")} w:ascii="{font_name}" w:hAnsi="{font_name}" w:cs="{font_name}"/>')
    rPr.append(rFonts)
    return run

def create_repair_order_docx(data, output_filepath):
    doc = Document()
    
    # Page setup - A4 Portrait with 1.8cm margins
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(1.6)
    section.bottom_margin = Cm(1.6)
    section.left_margin = Cm(1.8)
    section.right_margin = Cm(1.8)

    # 1. Header Box
    header_tbl = doc.add_table(rows=1, cols=2)
    header_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    header_tbl.autofit = False
    
    # Left: Org name & Title
    c_left = header_tbl.rows[0].cells[0]
    c_left.width = Cm(12.0)
    set_cell_margins(c_left, top=60, bottom=60, left=60, right=60)
    p_org = add_p(c_left, "งานยานพาหนะ กลุ่มบริหารทั่วไป โรงเรียนพะเยาพิทยาคม", size=13, bold=True, color=RGBColor(30, 41, 59))
    p_title = add_p(c_left, "ใบส่งรถเข้าซ่อมบำรุง / สั่งตรวจสภาพ (Vehicle Repair Order)", size=15, bold=True, color=RGBColor(15, 23, 42), space_before=2)
    p_sub = add_p(c_left, "เอกสารส่งมอบรถและขอรับใบเสนอราคา (Quotation Authorization)", size=11, color=RGBColor(100, 116, 139))

    # Right: Document Ref & Date
    c_right = header_tbl.rows[0].cells[1]
    c_right.width = Cm(5.4)
    set_cell_margins(c_right, top=60, bottom=60, left=60, right=60)
    set_cell_background(c_right, "F8FAFC")
    p_doc = add_p(c_right, f"เลขที่เอกสาร: {data['doc_no']}", size=12, bold=True, color=RGBColor(15, 23, 42), align=WD_ALIGN_PARAGRAPH.RIGHT)
    p_date = add_p(c_right, f"วันที่ออกเอกสาร: {data['doc_date']}", size=12, color=RGBColor(51, 65, 85), align=WD_ALIGN_PARAGRAPH.RIGHT)
    p_status = add_p(c_right, f"สถานะ: ส่งตรวจสภาพ / รอเสนอราคา", size=11, bold=True, color=RGBColor(202, 138, 4), align=WD_ALIGN_PARAGRAPH.RIGHT)

    # Divider line
    p_div = add_p(doc, "", space_before=2, space_after=4)
    p_div_border = p_div.paragraph_format
    
    # 2. Section: Service Center & Vehicle Info (2-column layout)
    info_tbl = doc.add_table(rows=1, cols=2)
    info_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    info_tbl.autofit = False
    set_box_borders(info_tbl, color="CBD5E1", sz="6")
    
    # Left: Service Center
    c1 = info_tbl.rows[0].cells[0]
    c1.width = Cm(8.7)
    set_cell_margins(c1, top=100, bottom=100, left=140, right=140)
    set_cell_background(c1, "F1F5F9")
    add_p(c1, "ข้อมูลศูนย์บริการ / อู่ซ่อม", size=12, bold=True, color=RGBColor(30, 41, 59))
    p1 = add_p(c1, "ศูนย์บริการ: ", size=12, bold=True)
    add_run(p1, data['garage_name'], size=12, bold=False)
    p2 = add_p(c1, "ที่ตั้ง / สาขา: ", size=12, bold=True)
    add_run(p2, data.get('garage_branch', 'อำเภอเมืองพะเยา จังหวัดพะเยา'), size=12, bold=False)
    p3 = add_p(c1, "เจ้าหน้าที่รับเรื่อง (SA): ", size=12, bold=True)
    add_run(p3, "..................................................", size=12, bold=False)
    p4 = add_p(c1, "วันที่ส่งมอบรถ: ", size=12, bold=True)
    add_run(p4, data['doc_date'], size=12, bold=False)

    # Right: Vehicle Details
    c2 = info_tbl.rows[0].cells[1]
    c2.width = Cm(8.7)
    set_cell_margins(c2, top=100, bottom=100, left=140, right=140)
    set_cell_background(c2, "FFFFFF")
    add_p(c2, "ข้อมูลยานพาหนะ ณ วันส่งมอบ", size=12, bold=True, color=RGBColor(30, 41, 59))
    pv1 = add_p(c2, "หมายเลขทะเบียน: ", size=12, bold=True)
    add_run(pv1, data['plate'], size=13, bold=True, color=RGBColor(2, 132, 199))
    pv2 = add_p(c2, "ยี่ห้อ / รุ่น: ", size=12, bold=True)
    add_run(pv2, data['car_model'], size=12, bold=False)
    pv3 = add_p(c2, "เลขไมล์ ณ วันส่งซ่อม: ", size=12, bold=True)
    add_run(pv3, f"{data['mileage']:,} กิโลเมตร", size=13, bold=True, color=RGBColor(180, 83, 9))
    pv4 = add_p(c2, "ระดับน้ำมันเชื้อเพลิง: ", size=12, bold=True)
    add_run(pv4, "[  ] E    [  ] 1/4    [  ] 1/2    [ / ] 3/4    [  ] เต็มถัง", size=11, bold=False)

    add_p(doc, "", space_before=2, space_after=2)

    # 3. Work Scope / Service Type Checkboxes
    type_tbl = doc.add_table(rows=1, cols=4)
    type_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    type_tbl.autofit = False
    set_box_borders(type_tbl, color="E2E8F0", sz="4")
    
    types = [
        ("[✓] เช็คระยะตามกำหนด (PM)" if data['is_pm'] else "[  ] เช็คระยะตามกำหนด (PM)"),
        ("[✓] ซ่อมทั่วไป / แก้ไขอาการเสีย" if data['is_repair'] else "[  ] ซ่อมทั่วไป / แก้ไขอาการเสีย"),
        ("[  ] ซ่อมสี / ตัวถัง / เคลมประกัน",),
        ("[  ] เปลี่ยนยาง / แบตเตอรี่ / ช่วงล่าง",)
    ]
    for i, t in enumerate(types):
        cell = type_tbl.rows[0].cells[i]
        cell.width = Cm(4.35)
        set_cell_margins(cell, top=60, bottom=60, left=80, right=80)
        set_cell_background(cell, "F8FAFC" if "[✓]" in t[0] else "FFFFFF")
        txt = t[0] if isinstance(t, tuple) else t
        add_p(cell, txt, size=11, bold=("[✓]" in txt), color=RGBColor(15, 23, 42) if "[✓]" in txt else RGBColor(100, 116, 139), align=WD_ALIGN_PARAGRAPH.CENTER)

    add_p(doc, "", space_before=4, space_after=2)

    # 4. Symptoms & Action Items Table
    add_p(doc, "รายการงานที่ต้องการให้ดำเนินการ / อาการผิดปกติที่ตรวจพบ", size=13, bold=True, color=RGBColor(15, 23, 42), space_before=2, space_after=4)
    
    item_rows = len(data['items']) + 1
    items_tbl = doc.add_table(rows=item_rows, cols=3)
    items_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    items_tbl.autofit = False
    set_box_borders(items_tbl, color="CBD5E1", sz="5")

    # Header Row
    col_widths = [Cm(1.4), Cm(11.8), Cm(4.2)]
    headers = ["ลำดับ", "รายละเอียดงาน / อาการผิดปกติที่พบ", "ผลการตรวจสอบ / หมายเหตุ"]
    for j, h in enumerate(headers):
        c = items_tbl.rows[0].cells[j]
        c.width = col_widths[j]
        set_cell_margins(c, top=80, bottom=80, left=100, right=100)
        set_cell_background(c, "E2E8F0")
        add_p(c, h, size=12, bold=True, color=RGBColor(30, 41, 59), align=WD_ALIGN_PARAGRAPH.CENTER if j != 1 else WD_ALIGN_PARAGRAPH.LEFT)

    for idx, itm in enumerate(data['items'], 1):
        row = items_tbl.rows[idx]
        
        c0 = row.cells[0]
        c0.width = col_widths[0]
        set_cell_margins(c0, top=70, bottom=70, left=60, right=60)
        add_p(c0, str(idx), size=12, align=WD_ALIGN_PARAGRAPH.CENTER)

        c1 = row.cells[1]
        c1.width = col_widths[1]
        set_cell_margins(c1, top=70, bottom=70, left=100, right=100)
        add_p(c1, itm['title'], size=12, bold=True, color=RGBColor(15, 23, 42))
        if itm.get('desc'):
            add_p(c1, itm['desc'], size=11, color=RGBColor(71, 85, 105), space_before=1)

        c2 = row.cells[2]
        c2.width = col_widths[2]
        set_cell_margins(c2, top=70, bottom=70, left=60, right=60)
        add_p(c2, itm.get('note', '[  ] รอตรวจเช็ค'), size=11, color=RGBColor(100, 116, 139), align=WD_ALIGN_PARAGRAPH.CENTER)

    add_p(doc, "", space_before=4, space_after=2)

    # 5. Terms & Organization Requirements Box
    terms_box = doc.add_table(rows=1, cols=1)
    terms_box.alignment = WD_TABLE_ALIGNMENT.CENTER
    terms_box.autofit = False
    set_box_borders(terms_box, color="FDE047", sz="6")
    tb_cell = terms_box.rows[0].cells[0]
    tb_cell.width = Cm(17.4)
    set_cell_margins(tb_cell, top=80, bottom=80, left=120, right=120)
    set_cell_background(tb_cell, "FEFCE8")

    add_p(tb_cell, "เงื่อนไขและข้อกำหนดในการดำเนินการ (Terms & Conditions)", size=12, bold=True, color=RGBColor(133, 77, 14), space_after=3)
    terms = [
        "1. การเสนอราคา: ให้ศูนย์บริการตรวจเช็คและจัดทำ 'ใบเสนอราคา (Quotation)' ส่งให้ผู้ประสานงานพิจารณาอนุมัติก่อนลงมือดำเนินการซ่อมแซมหรือเปลี่ยนอะไหล่ทุกครั้ง",
        "2. การส่งคืนอะไหล่: ชิ้นส่วนอะไหล่เก่าที่ทำการเปลี่ยนออกทั้งหมด ต้องส่งมอบคืนให้กับโรงเรียนพะเยาพิทยาคมพร้อมตัวรถ",
        "3. การออกใบกำกับภาษี: ระบุชื่อ 'โรงเรียนพะเยาพิทยาคม' เลขประจำตัวผู้เสียภาษี 0994000300109 ที่อยู่: ตำบลเวียง อำเภอเมืองพะเยา จังหวัดพะเยา 56000",
        "4. การรับประกัน: งานซ่อมและอะไหล่แท้ต้องมีการรับประกันตามมาตรฐานศูนย์บริการโตโยต้า"
    ]
    for term in terms:
        add_p(tb_cell, term, size=11, color=RGBColor(113, 63, 18), space_before=1, space_after=1)

    add_p(doc, "", space_before=4, space_after=2)

    # 6. Signatures & Handover Grid (4 Boxes)
    sig_tbl = doc.add_table(rows=2, cols=2)
    sig_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    sig_tbl.autofit = False
    set_box_borders(sig_tbl, color="CBD5E1", sz="5")

    # Box 1: Coordinator / Requester
    b1 = sig_tbl.rows[0].cells[0]
    b1.width = Cm(8.7)
    set_cell_margins(b1, top=80, bottom=80, left=100, right=100)
    add_p(b1, "1. ผู้ประสานงานและสั่งซ่อม", size=11, bold=True, color=RGBColor(71, 85, 105))
    add_p(b1, "", space_before=14)
    add_p(b1, f"ลงชื่อ ................................................................", size=12, align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b1, f"({data['coordinator_name']})", size=12, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b1, f"ตำแหน่ง: {data['coordinator_title']}", size=11, color=RGBColor(71, 85, 105), align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b1, f"เบอร์โทรศัพท์: {data['coordinator_phone']}", size=11, color=RGBColor(71, 85, 105), align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b1, f"วันที่: {data['doc_date']}", size=11, align=WD_ALIGN_PARAGRAPH.CENTER)

    # Box 2: Authorizer / Approver
    b2 = sig_tbl.rows[0].cells[1]
    b2.width = Cm(8.7)
    set_cell_margins(b2, top=80, bottom=80, left=100, right=100)
    add_p(b2, "2. ผู้อนุมัติการส่งซ่อมบำรุง", size=11, bold=True, color=RGBColor(71, 85, 105))
    add_p(b2, "", space_before=14)
    add_p(b2, "ลงชื่อ ................................................................", size=12, align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b2, "(................................................................)", size=12, align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b2, "ตำแหน่ง: หัวหน้างานยานพาหนะ / รองผู้อำนวยการ", size=11, color=RGBColor(71, 85, 105), align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b2, "ความเห็น: [✓] อนุมัติส่งตรวจสภาพและขอใบเสนอราคา", size=11, bold=True, color=RGBColor(16, 185, 129), align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b2, f"วันที่: {data['doc_date']}", size=11, align=WD_ALIGN_PARAGRAPH.CENTER)

    # Box 3: Garage Receiver
    b3 = sig_tbl.rows[1].cells[0]
    b3.width = Cm(8.7)
    set_cell_margins(b3, top=80, bottom=80, left=100, right=100)
    add_p(b3, "3. เจ้าหน้าที่ศูนย์บริการผู้รับรถเข้าตรวจสภาพ", size=11, bold=True, color=RGBColor(71, 85, 105))
    add_p(b3, "", space_before=14)
    add_p(b3, "ลงชื่อ ................................................................", size=12, align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b3, "(................................................................)", size=12, align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b3, f"ผู้รับรถ ศูนย์บริการโตโยต้า (1994) พะเยา", size=11, color=RGBColor(71, 85, 105), align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b3, "สภาพรถรับเข้า: [  ] ปกติเรียบร้อย  [  ] มีรอยขูดขีด", size=11, color=RGBColor(71, 85, 105), align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b3, "วันที่รับรถ: ...... / ...... / 2569   เวลา: ............. น.", size=11, align=WD_ALIGN_PARAGRAPH.CENTER)

    # Box 4: Acceptance on Return
    b4 = sig_tbl.rows[1].cells[1]
    b4.width = Cm(8.7)
    set_cell_margins(b4, top=80, bottom=80, left=100, right=100)
    add_p(b4, "4. การตรวจรับรถกลับ (เมื่อซ่อมเสร็จ)", size=11, bold=True, color=RGBColor(71, 85, 105))
    add_p(b4, "", space_before=14)
    add_p(b4, "ลงชื่อ ................................................................", size=12, align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b4, "(................................................................)", size=12, align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b4, "เลขไมล์ตอนรับกลับ: .................... กม.", size=11, bold=True, color=RGBColor(15, 23, 42), align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b4, "ตรวจรับ: [  ] งานเรียบร้อย  [  ] รับคืนอะไหล่เก่าครบ", size=11, color=RGBColor(71, 85, 105), align=WD_ALIGN_PARAGRAPH.CENTER)
    add_p(b4, "วันที่รับรถคืน: ...... / ...... / 2569", size=11, align=WD_ALIGN_PARAGRAPH.CENTER)

    # Save
    doc.save(output_filepath)
    print(f"Created docx: {output_filepath}")

def create_repair_order_html(data, output_filepath):
    """Create pixel-perfect printable A4 HTML version."""
    items_html = ""
    for idx, itm in enumerate(data['items'], 1):
        desc_html = f"<div class='item-desc'>{itm['desc']}</div>" if itm.get('desc') else ""
        items_html += f"""
        <tr>
          <td style="text-align:center; font-weight:600;">{idx}</td>
          <td>
            <div class="item-title">{itm['title']}</div>
            {desc_html}
          </td>
          <td style="text-align:center; color:#64748b; font-size:13px;">{itm.get('note', '[ &nbsp; ] รอตรวจเช็ค')}</td>
        </tr>
        """

    pm_check = "[&#10003;]" if data['is_pm'] else "[ &nbsp; ]"
    repair_check = "[&#10003;]" if data['is_repair'] else "[ &nbsp; ]"
    pm_active = "active-badge" if data['is_pm'] else ""
    repair_active = "active-badge" if data['is_repair'] else ""

    html_content = f"""<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <title>ใบส่งรถเข้าซ่อมบำรุง - {data['plate']}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    @page {{
      size: A4 portrait;
      margin: 12mm 15mm;
    }}
    * {{
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }}
    body {{
      font-family: 'Sarabun', 'TH Sarabun New', Tahoma, sans-serif;
      font-size: 14px;
      line-height: 1.35;
      color: #0f172a;
      background: #f1f5f9;
      margin: 0;
      padding: 20px;
    }}
    .print-sheet {{
      background: #ffffff;
      width: 210mm;
      min-height: 297mm;
      padding: 16mm 18mm;
      margin: 0 auto 20px auto;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      position: relative;
    }}
    @media print {{
      body {{
        background: transparent;
        padding: 0;
      }}
      .print-sheet {{
        width: 100%;
        min-height: auto;
        padding: 0;
        margin: 0;
        box-shadow: none;
      }}
      .no-print {{
        display: none !important;
      }}
    }}
    .header-bar {{
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 10px;
      margin-bottom: 12px;
    }}
    .org-title {{
      font-size: 14px;
      font-weight: 700;
      color: #0369a1;
      margin-bottom: 2px;
    }}
    .doc-main-title {{
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }}
    .doc-subtitle {{
      font-size: 12px;
      color: #64748b;
    }}
    .doc-meta {{
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      text-align: right;
      font-size: 12px;
    }}
    .doc-meta .no {{
      font-size: 13px;
      font-weight: 700;
      color: #0284c7;
    }}
    .grid-2 {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 12px;
    }}
    .card-box {{
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      overflow: hidden;
    }}
    .card-box-header {{
      background: #f1f5f9;
      padding: 6px 12px;
      font-weight: 700;
      font-size: 13px;
      color: #1e293b;
      border-bottom: 1px solid #cbd5e1;
    }}
    .card-box-body {{
      padding: 8px 12px;
      font-size: 13px;
      line-height: 1.4;
    }}
    .card-box-body div {{
      margin-bottom: 3px;
    }}
    .highlight-val {{
      font-weight: 700;
      color: #0369a1;
    }}
    .mileage-val {{
      font-weight: 700;
      color: #b45309;
      font-size: 14px;
    }}
    .service-types {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
      margin-bottom: 12px;
    }}
    .type-pill {{
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 6px 4px;
      text-align: center;
      font-size: 12px;
      color: #64748b;
      background: #ffffff;
    }}
    .type-pill.active-badge {{
      border-color: #0284c7;
      background: #e0f2fe;
      color: #0369a1;
      font-weight: 700;
    }}
    table.data-table {{
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 13px;
    }}
    table.data-table th {{
      background: #e2e8f0;
      color: #1e293b;
      font-weight: 700;
      padding: 6px 10px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }}
    table.data-table td {{
      padding: 7px 10px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }}
    .item-title {{
      font-weight: 600;
      color: #0f172a;
    }}
    .item-desc {{
      font-size: 12px;
      color: #475569;
      margin-top: 2px;
    }}
    .terms-box {{
      background: #fefce8;
      border: 1px solid #fde047;
      border-radius: 6px;
      padding: 8px 12px;
      margin-bottom: 14px;
      font-size: 12px;
      color: #854d0e;
    }}
    .terms-title {{
      font-weight: 700;
      margin-bottom: 4px;
      color: #a16207;
      font-size: 12.5px;
    }}
    .terms-list {{
      margin: 0;
      padding-left: 18px;
    }}
    .terms-list li {{
      margin-bottom: 2px;
    }}
    .sig-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }}
    .sig-card {{
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 8px 10px;
      text-align: center;
      font-size: 12px;
      background: #ffffff;
    }}
    .sig-title {{
      font-weight: 700;
      color: #475569;
      text-align: left;
      margin-bottom: 22px;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 3px;
    }}
    .sig-line {{
      margin-bottom: 4px;
    }}
    .sig-name {{
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 2px;
    }}
    .sig-pos {{
      color: #64748b;
      font-size: 11px;
    }}
    .btn-print-bar {{
      max-width: 210mm;
      margin: 0 auto 12px auto;
      display: flex;
      justify-content: flex-end;
      gap: 10px;
    }}
    .btn {{
      padding: 8px 18px;
      border-radius: 6px;
      font-family: inherit;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
    }}
    .btn-primary {{
      background: #0284c7;
      color: #ffffff;
    }}
    .btn-primary:hover {{
      background: #0369a1;
    }}
    .btn-secondary {{
      background: #e2e8f0;
      color: #334155;
    }}
  </style>
</head>
<body>
  <div class="btn-print-bar no-print">
    <button class="btn btn-secondary" onclick="window.close()">ปิดหน้าต่าง</button>
    <button class="btn btn-primary" onclick="window.print()">สั่งพิมพ์เอกสาร A4 (Print)</button>
  </div>

  <div class="print-sheet">
    <!-- Header -->
    <div class="header-bar">
      <div>
        <div class="org-title">งานยานพาหนะ กลุ่มบริหารทั่วไป โรงเรียนพะเยาพิทยาคม</div>
        <div class="doc-main-title">ใบส่งรถเข้าซ่อมบำรุง / สั่งตรวจสภาพ (Vehicle Repair Order)</div>
        <div class="doc-subtitle">เอกสารส่งมอบรถและขอรับใบเสนอราคา (Quotation Authorization)</div>
      </div>
      <div class="doc-meta">
        <div>เลขที่: <span class="no">{data['doc_no']}</span></div>
        <div>วันที่ออกเอกสาร: {data['doc_date']}</div>
        <div style="color:#d97706; font-weight:600; margin-top:2px;">สถานะ: ส่งตรวจสภาพ / รอเสนอราคา</div>
      </div>
    </div>

    <!-- Info Grid -->
    <div class="grid-2">
      <div class="card-box">
        <div class="card-box-header">ข้อมูลศูนย์บริการ / อู่ซ่อม</div>
        <div class="card-box-body">
          <div><strong>ศูนย์บริการ:</strong> {data['garage_name']}</div>
          <div><strong>ที่ตั้ง / สาขา:</strong> {data.get('garage_branch', 'อำเภอเมืองพะเยา จังหวัดพะเยา')}</div>
          <div><strong>เจ้าหน้าที่รับเรื่อง (SA):</strong> ....................................................</div>
          <div><strong>วันที่นัดหมายส่งมอบ:</strong> {data['doc_date']}</div>
        </div>
      </div>

      <div class="card-box">
        <div class="card-box-header">ข้อมูลยานพาหนะ ณ วันส่งมอบ</div>
        <div class="card-box-body">
          <div><strong>หมายเลขทะเบียน:</strong> <span class="highlight-val" style="font-size:14px;">{data['plate']}</span></div>
          <div><strong>ยี่ห้อ / รุ่น:</strong> {data['car_model']}</div>
          <div><strong>เลขไมล์ ณ วันส่งซ่อม:</strong> <span class="mileage-val">{data['mileage']:,} กม.</span></div>
          <div><strong>ระดับน้ำมันเชื้อเพลิง:</strong> [ &nbsp; ] E &nbsp; [ &nbsp; ] 1/4 &nbsp; [ &nbsp; ] 1/2 &nbsp; [ &#10003; ] 3/4 &nbsp; [ &nbsp; ] เต็มถัง</div>
        </div>
      </div>
    </div>

    <!-- Service Type Badges -->
    <div class="service-types">
      <div class="type-pill {pm_active}">{pm_check} เช็คระยะตามกำหนด (PM)</div>
      <div class="type-pill {repair_active}">{repair_check} ซ่อมทั่วไป / แก้ไขอาการเสีย</div>
      <div class="type-pill">[ &nbsp; ] ซ่อมสี / ตัวถัง / เคลมประกัน</div>
      <div class="type-pill">[ &nbsp; ] เปลี่ยนยาง / แบตเตอรี่ / ช่วงล่าง</div>
    </div>

    <!-- Symptoms Table -->
    <div style="font-weight:700; font-size:13.5px; margin-bottom:6px; color:#0f172a;">
      รายการงานที่ต้องการให้ดำเนินการ / อาการผิดปกติที่ตรวจพบ
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 45px; text-align:center;">ลำดับ</th>
          <th>รายละเอียดงาน / อาการผิดปกติที่พบ</th>
          <th style="width: 140px; text-align:center;">ผลการตรวจ / หมายเหตุ</th>
        </tr>
      </thead>
      <tbody>
        {items_html}
      </tbody>
    </table>

    <!-- Terms -->
    <div class="terms-box">
      <div class="terms-title">เงื่อนไขและข้อกำหนดในการดำเนินการ (Terms & Conditions)</div>
      <ol class="terms-list">
        <li><strong>การเสนอราคา:</strong> ให้ศูนย์บริการตรวจเช็คและจัดทำ "ใบเสนอราคา (Quotation)" ส่งให้ผู้ประสานงานพิจารณาอนุมัติก่อนลงมือดำเนินการซ่อมแซมหรือเปลี่ยนอะไหล่ทุกครั้ง</li>
        <li><strong>การส่งคืนอะไหล่:</strong> ชิ้นส่วนอะไหล่เก่าที่ทำการเปลี่ยนออกทั้งหมด ต้องส่งมอบคืนให้กับโรงเรียนพะเยาพิทยาคมพร้อมตัวรถ</li>
        <li><strong>การออกใบกำกับภาษี:</strong> ระบุชื่อ "โรงเรียนพะเยาพิทยาคม" เลขประจำตัวผู้เสียภาษี 0994000300109 ที่อยู่: ตำบลเวียง อำเภอเมืองพะเยา จังหวัดพะเยา 56000</li>
        <li><strong>การรับประกัน:</strong> งานซ่อมและอะไหล่แท้ต้องมีการรับประกันตามมาตรฐานศูนย์บริการโตโยต้า</li>
      </ol>
    </div>

    <!-- Signatures (4 Boxes) -->
    <div class="sig-grid">
      <!-- 1 -->
      <div class="sig-card">
        <div class="sig-title">1. ผู้ประสานงานและสั่งซ่อม</div>
        <div class="sig-line">ลงชื่อ ................................................................</div>
        <div class="sig-name">({data['coordinator_name']})</div>
        <div class="sig-pos">{data['coordinator_title']}</div>
        <div class="sig-pos">โทรศัพท์: {data['coordinator_phone']}</div>
        <div class="sig-pos" style="margin-top:2px;">วันที่: {data['doc_date']}</div>
      </div>

      <!-- 2 -->
      <div class="sig-card">
        <div class="sig-title">2. ผู้อนุมัติการส่งซ่อมบำรุง</div>
        <div class="sig-line">ลงชื่อ ................................................................</div>
        <div class="sig-name">(................................................................)</div>
        <div class="sig-pos">หัวหน้างานยานพาหนะ / รองผู้อำนวยการ</div>
        <div class="sig-pos" style="color:#059669; font-weight:600; margin-top:2px;">[ &#10003; ] อนุมัติส่งตรวจสภาพและขอเสนอราคา</div>
        <div class="sig-pos">วันที่: {data['doc_date']}</div>
      </div>

      <!-- 3 -->
      <div class="sig-card">
        <div class="sig-title">3. ศูนย์บริการผู้รับรถเข้าตรวจสภาพ</div>
        <div class="sig-line">ลงชื่อ ................................................................</div>
        <div class="sig-name">(................................................................)</div>
        <div class="sig-pos">ผู้รับรถ ศูนย์บริการโตโยต้า (1994) พะเยา</div>
        <div class="sig-pos">สภาพรถรับเข้า: [ &nbsp; ] เรียบร้อยดี &nbsp; [ &nbsp; ] มีรอยขีดข่วน</div>
        <div class="sig-pos">วันที่รับรถ: ...... / ...... / 2569 &nbsp; เวลา: ........... น.</div>
      </div>

      <!-- 4 -->
      <div class="sig-card">
        <div class="sig-title">4. การตรวจรับรถกลับ (เมื่อซ่อมเสร็จ)</div>
        <div class="sig-line">ลงชื่อ ................................................................</div>
        <div class="sig-name">(................................................................)</div>
        <div class="sig-pos" style="font-weight:600; color:#0f172a;">เลขไมล์ตอนรับกลับ: .................... กม.</div>
        <div class="sig-pos">ตรวจรับ: [ &nbsp; ] งานเรียบร้อยดี &nbsp; [ &nbsp; ] ได้รับอะไหล่เก่าคืนครบ</div>
        <div class="sig-pos">วันที่รับคืน: ...... / ...... / 2569</div>
      </div>
    </div>

  </div>
</body>
</html>
"""
    with open(output_filepath, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"Created html: {output_filepath}")

def main():
    target_dir = r"D:\AI CURSER\ppk-drivehub\เอกสาร"
    os.makedirs(target_dir, exist_ok=True)

    # 1. Car 1: นข 2455 พะเยา
    data_2455 = {
        "doc_no": "WO-256911-001",
        "doc_date": "9 พฤศจิกายน 2569",
        "plate": "นข 2455 พะเยา",
        "car_model": "TOYOTA Commuter D4D (ดีเซล)",
        "mileage": 525907,
        "garage_name": "ศูนย์บริการโตโยต้า (1994) พะเยา",
        "garage_branch": "สาขาเมืองพะเยา จังหวัดพะเยา",
        "is_pm": True,
        "is_repair": False,
        "items": [
            {
                "title": "เช็คระยะเปลี่ยนถ่ายน้ำมันเครื่อง และไส้กรองน้ำมันเครื่อง",
                "desc": "เปลี่ยนถ่ายน้ำมันเครื่องเกรดมาตรฐานโตโยต้า พร้อมเปลี่ยนไส้กรองน้ำมันเครื่องและแหวนรองน็อตถ่าย",
                "note": "[  ] รอตรวจเช็ค"
            },
            {
                "title": "ตรวจเช็คระดับและสภาพของเหลวทุกระบบ",
                "desc": "ตรวจเช็คน้ำมันเบรก, น้ำยาหล่อเย็นหม้อน้ำ (Coolant), น้ำมันพวงมาลัยพาวเวอร์ และน้ำยาฉีดกระจก",
                "note": "[  ] รอตรวจเช็ค"
            },
            {
                "title": "ตรวจเช็คระบบเบรกและช่วงล่าง",
                "desc": "ตรวจสอบความหนาผ้าเบรกหน้า-หลัง จานเบรก สายอ่อนเบรก และทำความสะอาดชุดเบรก",
                "note": "[  ] รอตรวจเช็ค"
            },
            {
                "title": "ตรวจเช็คระบบกรองอากาศและระบบแอร์",
                "desc": "เป่าทำความสะอาด/ตรวจเช็คไส้กรองอากาศเครื่องยนต์ และไส้กรองอากาศแอร์ในห้องโดยสาร",
                "note": "[  ] รอตรวจเช็ค"
            },
            {
                "title": "ตรวจเช็คระบบไฟส่องสว่าง สัญญาณเตือน และแรงดันลมยางทั้ง 4 เส้น",
                "desc": "ตรวจเช็คไฟหน้า ไฟท้าย ไฟเลี้ยว ไฟเบรก แตร และตรวจวัดแรงดันลมยางพร้อมยางอะไหล่",
                "note": "[  ] รอตรวจเช็ค"
            }
        ],
        "coordinator_name": "นายพงศธร โพธิแก้ว",
        "coordinator_title": "รองหัวหน้างานยานพาหนะ โรงเรียนพะเยาพิทยาคม",
        "coordinator_phone": "095-696-1606"
    }

    # 2. Car 2: นข 1977 พะเยา
    data_1977 = {
        "doc_no": "WO-256911-002",
        "doc_date": "9 พฤศจิกายน 2569",
        "plate": "นข 1977 พะเยา",
        "car_model": "TOYOTA Ventury 2.7 V (เบนซิน)",
        "mileage": 447427,
        "garage_name": "ศูนย์บริการโตโยต้า (1994) พะเยา",
        "garage_branch": "สาขาเมืองพะเยา จังหวัดพะเยา",
        "is_pm": False,
        "is_repair": True,
        "items": [
            {
                "title": "ตรวจเช็คเสียงดังผิดปกติบริเวณเครื่องยนต์อย่างละเอียด",
                "desc": "มีเสียงดังผิดปกติขณะเครื่องยนต์ทำงาน ขอให้ช่างเทคนิคตรวจเช็คหาสาเหตุที่มาของเสียง เช่น ชุดวาล์ว, โซ่ราวลิ้น, ลูกรอกสายพาน, ไดชาร์จ หรือแบริ่งภายใน",
                "note": "[  ] ต้องหาสาเหตุ"
            },
            {
                "title": "ตรวจเช็คและวิเคราะห์อาการน้ำมันเครื่องหายโดยไม่ทราบสาเหตุ",
                "desc": "ระดับน้ำมันเครื่องลดลงผิดปกติ ขอให้ตรวจสอบการรั่วซึมภายนอก (ซีลหน้า-หลังเครื่อง, ซีลฝาวาล์ว, ปะเก็นอ่างน้ำมัน) และตรวจสอบการเผาไหม้ภายใน (ยางตีนวาล์ว, แหวนลูกสูบ)",
                "note": "[  ] ต้องตรวจสอบ"
            },
            {
                "title": "จัดทำใบเสนอราคา (Quotation) ค่าแรงและค่าอะไหล่",
                "desc": "เมื่อวิเคราะห์สาเหตุแน่ชัดแล้ว ให้ทำใบเสนอราคาระบุรายการอะไหล่แท้ที่จำเป็นต้องเปลี่ยน พร้อมค่าบริการ ส่งให้ผู้ประสานงานอนุมัติก่อนลงมือซ่อม",
                "note": "[  ] ขอเสนอราคา"
            },
            {
                "title": "ตรวจเช็คระบบระบายความร้อนและความร้อนสะสม",
                "desc": "ตรวจเช็คหม้อน้ำ ท่อยาง ฝาหม้อน้ำ และพัดลมระบายความร้อน เพื่อป้องกันปัญหาความร้อนขึ้นสูง",
                "note": "[  ] รอตรวจเช็ค"
            }
        ],
        "coordinator_name": "นายพงศธร โพธิแก้ว",
        "coordinator_title": "รองหัวหน้างานยานพาหนะ โรงเรียนพะเยาพิทยาคม",
        "coordinator_phone": "095-696-1606"
    }

    # Generate files
    docx_2455 = os.path.join(target_dir, "ใบแจ้งซ่อม_นข2455_โตโยต้าพะเยา.docx")
    html_2455 = os.path.join(target_dir, "ใบแจ้งซ่อม_นข2455_โตโยต้าพะเยา.html")
    create_repair_order_docx(data_2455, docx_2455)
    create_repair_order_html(data_2455, html_2455)

    docx_1977 = os.path.join(target_dir, "ใบแจ้งซ่อม_นข1977_โตโยต้าพะเยา.docx")
    html_1977 = os.path.join(target_dir, "ใบแจ้งซ่อม_นข1977_โตโยต้าพะเยา.html")
    create_repair_order_docx(data_1977, docx_1977)
    create_repair_order_html(data_1977, html_1977)

if __name__ == "__main__":
    main()
