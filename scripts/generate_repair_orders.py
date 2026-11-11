import os
import re
from pythainlp import word_tokenize
from docx import Document
from docx.shared import Pt, Cm, Inches, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import OxmlElement, parse_xml
from docx.oxml.ns import nsdecls, qn

ZWS = "\u200b"

def insert_zwsp(text: str) -> str:
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
    tcPr = cell._tc.get_or_add_tcPr()
    shd = parse_xml(f'<w:shd {nsdecls("w")} w:fill="{fill_hex}"/>')
    tcPr.append(shd)

def set_cell_margins(cell, top=25, bottom=25, left=45, right=45):
    tcPr = cell._tc.get_or_add_tcPr()
    tcMar = OxmlElement('w:tcMar')
    for m, val in [('top', top), ('bottom', bottom), ('left', left), ('right', right)]:
        node = OxmlElement(f'w:{m}')
        node.set(qn('w:w'), str(val))
        node.set(qn('w:type'), 'dxa')
        tcMar.append(node)
    tcPr.append(tcMar)

def set_box_borders(table, color="94A3B8", sz="4"):
    tblPr = table._tbl.tblPr
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:bottom w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:left w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:right w:val="single" w:sz="{sz}" w:space="0" w:color="{color}"/>'
        f'  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
        f'  <w:insideV w:val="single" w:sz="4" w:space="0" w:color="{color}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)

def get_or_add_p(cell, text="", font_name="TH Sarabun New", size=11.5, bold=False, color=None, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=0, space_after=0.5, line_spacing=1.05):
    """Reuse existing first paragraph of a cell or add a new one without creating empty lines."""
    if len(cell.paragraphs) == 1 and not cell.paragraphs[0].text.strip():
        p = cell.paragraphs[0]
    else:
        p = cell.add_paragraph()
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

def add_doc_p(doc, text="", font_name="TH Sarabun New", size=12, bold=False, color=None, align=WD_ALIGN_PARAGRAPH.LEFT, space_before=0, space_after=1, line_spacing=1.05):
    p = doc.add_paragraph()
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

def add_run(p, text, font_name="TH Sarabun New", size=11.5, bold=False, color=None):
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
    
    # Page setup - A4 Portrait with 1.0cm top/bottom, 1.2cm left/right margins to guarantee 1 single page in Word
    section = doc.sections[0]
    section.page_width = Cm(21.0)
    section.page_height = Cm(29.7)
    section.top_margin = Cm(1.0)
    section.bottom_margin = Cm(1.0)
    section.left_margin = Cm(1.2)
    section.right_margin = Cm(1.2)

    # 1. Header (No Garuda - Clean, Authoritative & Official)
    add_doc_p(doc, "ใบส่งซ่อมยานพาหนะ", size=17, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_before=0, space_after=1, color=RGBColor(15, 23, 42))
    add_doc_p(doc, "งานยานพาหนะ กลุ่มบริหารงานบุคคล โรงเรียนพะเยาพิทยาคม", size=13, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=1, color=RGBColor(30, 41, 59))
    add_doc_p(doc, "สังกัดสำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพะเยา  เลขที่ ๒๔๔ ถนนพหลโยธิน ตำบลเวียง อำเภอเมืองพะเยา จังหวัดพะเยา ๕๖๐๐๐ โทรศัพท์ ๐๕๔-๔๓๑๘๗๑", size=10, align=WD_ALIGN_PARAGRAPH.CENTER, color=RGBColor(71, 85, 105), space_after=3)

    # Document Reference & Date Row
    ref_tbl = doc.add_table(rows=1, cols=2)
    ref_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    ref_tbl.autofit = False
    
    c_ref_l = ref_tbl.rows[0].cells[0]
    c_ref_l.width = Cm(10.5)
    set_cell_margins(c_ref_l, top=10, bottom=10, left=20, right=20)
    p_num = get_or_add_p(c_ref_l, f"เลขที่เอกสาร: {data['doc_no']}", size=11, bold=True, space_after=0)
    add_run(p_num, "   (ส่งตรวจสภาพและขอรับใบเสนอราคา)", size=10.5, color=RGBColor(100, 116, 139))

    c_ref_r = ref_tbl.rows[0].cells[1]
    c_ref_r.width = Cm(8.1)
    set_cell_margins(c_ref_r, top=10, bottom=10, left=20, right=20)
    get_or_add_p(c_ref_r, f"วันที่ส่งซ่อม: {data['doc_date']}", size=11, bold=True, align=WD_ALIGN_PARAGRAPH.RIGHT, space_after=0)

    # 2. Section: Service Center & Vehicle Info Table (Side by Side)
    info_tbl = doc.add_table(rows=1, cols=2)
    info_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    info_tbl.autofit = False
    set_box_borders(info_tbl, color="94A3B8", sz="4")

    # Left: Service Center
    c1 = info_tbl.rows[0].cells[0]
    c1.width = Cm(9.3)
    set_cell_margins(c1, top=35, bottom=35, left=50, right=50)
    set_cell_background(c1, "F8FAFC")
    get_or_add_p(c1, "ข้อมูลศูนย์บริการ", size=11, bold=True, color=RGBColor(15, 23, 42), space_after=1)
    
    p_gname = get_or_add_p(c1, "ศูนย์บริการ: ", size=10.5, bold=True, space_after=1)
    add_run(p_gname, data['garage_name'], size=10.5, bold=True, color=RGBColor(2, 132, 199))
    
    p_gaddr = get_or_add_p(c1, "ที่อยู่: ", size=10, bold=True, space_after=1)
    add_run(p_gaddr, data['garage_address'], size=10, bold=False)

    p_gtel = get_or_add_p(c1, "โทรศัพท์: ", size=10, bold=True, space_after=1)
    add_run(p_gtel, data['garage_phone'], size=10, bold=False)

    p_gsa = get_or_add_p(c1, "ที่ปรึกษาบริการ (SA): ", size=10, bold=True, space_after=0)
    add_run(p_gsa, "..........................................................", size=10, bold=False)

    # Right: Vehicle Details & Handover
    c2 = info_tbl.rows[0].cells[1]
    c2.width = Cm(9.3)
    set_cell_margins(c2, top=35, bottom=35, left=50, right=50)
    set_cell_background(c2, "FFFFFF")
    get_or_add_p(c2, "ข้อมูลยานพาหนะ ณ วันส่งมอบ", size=11, bold=True, color=RGBColor(15, 23, 42), space_after=1)

    p_v1 = get_or_add_p(c2, "หมายเลขทะเบียน: ", size=10.5, bold=True, space_after=1)
    add_run(p_v1, data['plate'], size=11.5, bold=True, color=RGBColor(15, 23, 42))

    p_v2 = get_or_add_p(c2, "ยี่ห้อ / รุ่น: ", size=10, bold=True, space_after=1)
    add_run(p_v2, data['car_model'], size=10, bold=False)

    p_v3 = get_or_add_p(c2, "เลขไมล์ส่งซ่อม: ", size=10, bold=True, space_after=1)
    add_run(p_v3, f"{data['mileage']:,} กม.", size=10.5, bold=True, color=RGBColor(180, 83, 9))
    add_run(p_v3, "   ระดับน้ำมัน: [✓] 3/4", size=10, bold=False)

    p_v4 = get_or_add_p(c2, "ผู้นำส่งมอบรถ: ", size=10, bold=True, space_after=1)
    add_run(p_v4, f"{data['driver_name']} (โทร. {data['driver_phone']})", size=10, bold=False)

    p_v5 = get_or_add_p(c2, "ผู้ประสานงานสั่งซ่อม: ", size=10, bold=True, color=RGBColor(15, 23, 42), space_after=0)
    add_run(p_v5, f"{data['coordinator_name']} (โทร. {data['coordinator_phone']})", size=10, bold=True, color=RGBColor(2, 132, 199))

    # 3. Work Type Checkboxes Table
    type_tbl = doc.add_table(rows=1, cols=4)
    type_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    type_tbl.autofit = False
    set_box_borders(type_tbl, color="CBD5E1", sz="4")
    
    types = [
        ("[✓] เช็คระยะตามกำหนด (PM)" if data['is_pm'] else "[  ] เช็คระยะตามกำหนด (PM)"),
        ("[✓] ซ่อมทั่วไป / แก้ไขอาการเสีย" if data['is_repair'] else "[  ] ซ่อมทั่วไป / แก้ไขอาการเสีย"),
        ("[  ] ซ่อมสี / ตัวถัง / เคลมประกัน",),
        ("[  ] ตรวจเช็คระบบความปลอดภัย / ช่วงล่าง",)
    ]
    for i, t in enumerate(types):
        cell = type_tbl.rows[0].cells[i]
        cell.width = Cm(4.65)
        set_cell_margins(cell, top=25, bottom=25, left=25, right=25)
        set_cell_background(cell, "F1F5F9" if "[✓]" in t[0] else "FFFFFF")
        txt = t[0] if isinstance(t, tuple) else t
        get_or_add_p(cell, txt, size=10, bold=("[✓]" in txt), color=RGBColor(15, 23, 42) if "[✓]" in txt else RGBColor(100, 116, 139), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0)

    # 4. Symptoms / Requested Action Items Table
    add_doc_p(doc, "รายการงานที่ขอรับบริการ / อาการที่ตรวจพบ", size=11, bold=True, color=RGBColor(15, 23, 42), space_before=2, space_after=1)
    
    item_rows = len(data['items']) + 1
    items_tbl = doc.add_table(rows=item_rows, cols=3)
    items_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    items_tbl.autofit = False
    set_box_borders(items_tbl, color="94A3B8", sz="4")

    col_widths = [Cm(1.4), Cm(13.5), Cm(3.7)]
    headers = ["ลำดับ", "รายการงาน / รายละเอียดอาการที่ตรวจพบ", "ผลการตรวจเช็ค"]
    for j, h in enumerate(headers):
        c = items_tbl.rows[0].cells[j]
        c.width = col_widths[j]
        set_cell_margins(c, top=30, bottom=30, left=45, right=45)
        set_cell_background(c, "E2E8F0")
        get_or_add_p(c, h, size=10.5, bold=True, color=RGBColor(30, 41, 59), align=WD_ALIGN_PARAGRAPH.CENTER if j != 1 else WD_ALIGN_PARAGRAPH.LEFT, space_after=0)

    for idx, itm in enumerate(data['items'], 1):
        row = items_tbl.rows[idx]
        
        c0 = row.cells[0]
        c0.width = col_widths[0]
        set_cell_margins(c0, top=30, bottom=30, left=25, right=25)
        get_or_add_p(c0, str(idx), size=10.5, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0)

        c1 = row.cells[1]
        c1.width = col_widths[1]
        set_cell_margins(c1, top=30, bottom=30, left=45, right=45)
        get_or_add_p(c1, itm['title'], size=10.5, bold=True, color=RGBColor(15, 23, 42), space_after=0)
        if itm.get('desc'):
            get_or_add_p(c1, itm['desc'], size=9.5, color=RGBColor(71, 85, 105), space_before=0.5, space_after=0)

        c2 = row.cells[2]
        c2.width = col_widths[2]
        set_cell_margins(c2, top=30, bottom=30, left=25, right=25)
        get_or_add_p(c2, itm.get('note', '[  ] รอผลตรวจเช็ค'), size=9.5, color=RGBColor(100, 116, 139), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0)

    # 5. Terms & Requirements Box
    add_doc_p(doc, "", space_before=1.5, space_after=0)
    terms_box = doc.add_table(rows=1, cols=1)
    terms_box.alignment = WD_TABLE_ALIGNMENT.CENTER
    terms_box.autofit = False
    set_box_borders(terms_box, color="0284C7", sz="4")
    tb_cell = terms_box.rows[0].cells[0]
    tb_cell.width = Cm(18.6)
    set_cell_margins(tb_cell, top=30, bottom=30, left=50, right=50)
    set_cell_background(tb_cell, "F0F9FF")

    get_or_add_p(tb_cell, "การติดต่อประสานงานและข้อกำหนดการซ่อมบำรุง", size=10.5, bold=True, color=RGBColor(3, 105, 161), space_after=0.5)
    
    p_coord = get_or_add_p(tb_cell, "การประสานงานและพิจารณาซ่อม: ", size=10, bold=True, color=RGBColor(15, 23, 42), space_after=0.5)
    add_run(p_coord, f"ขอความอนุเคราะห์ศูนย์บริการโปรดติดต่อแจ้งผลการตรวจเช็ค และส่งใบเสนอราคา เพื่อพิจารณาอนุมัติซ่อมโดยตรงที่ ", size=10, bold=False)
    add_run(p_coord, f"{data['coordinator_name']} (รองหัวหน้างานยานพาหนะ) โทรศัพท์ {data['coordinator_phone']}", size=10, bold=True, color=RGBColor(3, 105, 161))

    terms = [
        "๑. การเสนอราคา: ขอความอนุเคราะห์จัดทำใบเสนอราคา (Quotation) ส่งให้ผู้ประสานงานพิจารณาอนุมัติก่อนดำเนินการซ่อมหรือเปลี่ยนอะไหล่",
        "๒. การส่งคืนอะไหล่: ขอรับคืนชิ้นส่วนอะไหล่เก่าที่ทำการเปลี่ยนออกทั้งหมดส่งมอบพร้อมตัวรถ",
        "๓. การรับประกัน: งานซ่อมและอะไหล่แท้ได้รับการรับประกันคุณภาพตามมาตรฐานศูนย์บริการโตโยต้า"
    ]
    for term in terms:
        get_or_add_p(tb_cell, term, size=9.5, color=RGBColor(51, 65, 85), space_before=0, space_after=0.5)

    # 6. Signatures Table (4 Boxes)
    add_doc_p(doc, "", space_before=1.5, space_after=0)
    sig_tbl = doc.add_table(rows=2, cols=2)
    sig_tbl.alignment = WD_TABLE_ALIGNMENT.CENTER
    sig_tbl.autofit = False
    set_box_borders(sig_tbl, color="CBD5E1", sz="4")

    # 1: Coordinator / Requester
    b1 = sig_tbl.rows[0].cells[0]
    b1.width = Cm(9.3)
    set_cell_margins(b1, top=30, bottom=30, left=35, right=35)
    get_or_add_p(b1, "๑. ผู้ประสานงานและสั่งซ่อม", size=10, bold=True, color=RGBColor(71, 85, 105), space_after=8)
    get_or_add_p(b1, f"ลงชื่อ ................................................................", size=10.5, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0.5)
    get_or_add_p(b1, f"({data['coordinator_name']})", size=10.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0.5)
    get_or_add_p(b1, f"ตำแหน่ง: {data['coordinator_title']}", size=9.5, color=RGBColor(71, 85, 105), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0.5)
    get_or_add_p(b1, f"โทรศัพท์: {data['coordinator_phone']}", size=9.5, color=RGBColor(71, 85, 105), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0)

    # 2: Driver Delivering
    b2 = sig_tbl.rows[0].cells[1]
    b2.width = Cm(9.3)
    set_cell_margins(b2, top=30, bottom=30, left=35, right=35)
    get_or_add_p(b2, "๒. พนักงานขับรถผู้นำส่งมอบรถ", size=10, bold=True, color=RGBColor(71, 85, 105), space_after=8)
    get_or_add_p(b2, "ลงชื่อ ................................................................", size=10.5, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0.5)
    get_or_add_p(b2, f"({data['driver_name']})", size=10.5, bold=True, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0.5)
    get_or_add_p(b2, "ตำแหน่ง: พนักงานขับรถ งานยานพาหนะ", size=9.5, color=RGBColor(71, 85, 105), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0.5)
    get_or_add_p(b2, f"โทรศัพท์: {data['driver_phone']}", size=9.5, color=RGBColor(71, 85, 105), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0)

    # 3: Garage Receiver
    b3 = sig_tbl.rows[1].cells[0]
    b3.width = Cm(9.3)
    set_cell_margins(b3, top=30, bottom=30, left=35, right=35)
    get_or_add_p(b3, "๓. เจ้าหน้าที่ศูนย์บริการผู้รับรถเข้าตรวจสภาพ", size=10, bold=True, color=RGBColor(71, 85, 105), space_after=8)
    get_or_add_p(b3, "ลงชื่อ ................................................................", size=10.5, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0.5)
    get_or_add_p(b3, "(................................................................)", size=10.5, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0.5)
    get_or_add_p(b3, f"ผู้รับรถ บริษัท โตโยต้าพะเยา (1994) จำกัด", size=9.5, color=RGBColor(71, 85, 105), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0.5)
    get_or_add_p(b3, "สภาพรับรถ: [  ] เรียบร้อยดี   วันที่ ...../...../๒๕๖๙", size=9.5, color=RGBColor(71, 85, 105), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0)

    # 4: Approver
    b4 = sig_tbl.rows[1].cells[1]
    b4.width = Cm(9.3)
    set_cell_margins(b4, top=30, bottom=30, left=35, right=35)
    get_or_add_p(b4, "๔. ผู้อนุมัติการส่งซ่อมบำรุง", size=10, bold=True, color=RGBColor(71, 85, 105), space_after=8)
    get_or_add_p(b4, "ลงชื่อ ................................................................", size=10.5, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0.5)
    get_or_add_p(b4, "(................................................................)", size=10.5, align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0.5)
    get_or_add_p(b4, "หัวหน้างานยานพาหนะ / รองผู้อำนวยการกลุ่มบริหารงานบุคคล", size=9.5, color=RGBColor(71, 85, 105), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0.5)
    get_or_add_p(b4, "ความเห็น: [✓] อนุมัติส่งตรวจสภาพและขอใบเสนอราคา", size=9.5, bold=True, color=RGBColor(16, 185, 129), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0)

    # 7. Acceptance Footer
    add_doc_p(doc, "", space_before=1, space_after=0)
    add_doc_p(doc, "การตรวจรับรถกลับเมื่อซ่อมเสร็จ: ได้ตรวจรับรถยนต์คืนในสภาพเรียบร้อยดี และได้รับอะไหล่เก่าคืนครบถ้วน (เลขไมล์ตอนรับกลับ: .................... กม.) ลงชื่อ ........................................................ ผู้ตรวจรับ วันที่ ...../...../๒๕๖๙", size=8.8, color=RGBColor(100, 116, 139), align=WD_ALIGN_PARAGRAPH.CENTER, space_after=0)

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
          <td style="text-align:center; color:#64748b; font-size:11.5px;">{itm.get('note', '[ &nbsp; ] รอผลตรวจเช็ค')}</td>
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
  <title>ใบส่งซ่อมยานพาหนะ - {data['plate']}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Sarabun:ital,wght@0,300;0,400;0,500;0,600;0,700;1,400&display=swap" rel="stylesheet">
  <style>
    @page {{
      size: A4 portrait;
      margin: 8mm 10mm 8mm 10mm;
    }}
    * {{
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }}
    html, body {{
      margin: 0;
      padding: 0;
      background: #f1f5f9;
      font-family: 'Sarabun', 'TH Sarabun New', Tahoma, sans-serif;
      font-size: 12.5px;
      line-height: 1.28;
      color: #0f172a;
    }}
    .print-sheet {{
      background: #ffffff;
      width: 210mm;
      max-height: 297mm;
      box-sizing: border-box;
      padding: 8mm 11mm;
      margin: 10px auto;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
      position: relative;
      overflow: hidden;
    }}
    @media print {{
      body {{
        background: transparent;
        padding: 0;
      }}
      .print-sheet {{
        width: 100%;
        height: 100%;
        max-height: 100vh;
        padding: 0;
        margin: 0;
        box-shadow: none;
        overflow: hidden;
        page-break-after: avoid !important;
        page-break-inside: avoid !important;
      }}
      .no-print {{
        display: none !important;
      }}
    }}
    .header-center {{
      text-align: center;
      margin-bottom: 6px;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 4px;
    }}
    .doc-main-title {{
      font-size: 19px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 1px;
    }}
    .org-title {{
      font-size: 14px;
      font-weight: 700;
      color: #0369a1;
      margin-bottom: 1px;
    }}
    .org-subtitle {{
      font-size: 11px;
      color: #64748b;
    }}
    .ref-bar {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 3px 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      margin-bottom: 6px;
      font-size: 12px;
    }}
    .grid-2 {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 6px;
    }}
    .card-box {{
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      overflow: hidden;
    }}
    .card-box-header {{
      background: #f1f5f9;
      padding: 3px 8px;
      font-weight: 700;
      font-size: 12px;
      color: #1e293b;
      border-bottom: 1px solid #cbd5e1;
    }}
    .card-box-body {{
      padding: 5px 8px;
      font-size: 11.8px;
      line-height: 1.35;
    }}
    .card-box-body div {{
      margin-bottom: 1.5px;
    }}
    .highlight-val {{
      font-weight: 700;
      color: #0369a1;
    }}
    .mileage-val {{
      font-weight: 700;
      color: #b45309;
      font-size: 12.5px;
    }}
    .service-types {{
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 5px;
      margin-bottom: 6px;
    }}
    .type-pill {{
      border: 1px solid #e2e8f0;
      border-radius: 4px;
      padding: 3px 2px;
      text-align: center;
      font-size: 11px;
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
      margin-bottom: 6px;
      font-size: 11.8px;
    }}
    table.data-table th {{
      background: #e2e8f0;
      color: #1e293b;
      font-weight: 700;
      padding: 4px 6px;
      border: 1px solid #cbd5e1;
      text-align: left;
    }}
    table.data-table td {{
      padding: 5px 6px;
      border: 1px solid #cbd5e1;
      vertical-align: top;
    }}
    .item-title {{
      font-weight: 600;
      color: #0f172a;
    }}
    .item-desc {{
      font-size: 11px;
      color: #475569;
      margin-top: 1px;
    }}
    .terms-box {{
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 4px;
      padding: 5px 8px;
      margin-bottom: 6px;
      font-size: 11.2px;
      color: #0f172a;
    }}
    .terms-title {{
      font-weight: 700;
      margin-bottom: 2px;
      color: #0369a1;
      font-size: 11.8px;
    }}
    .terms-list {{
      margin: 0;
      padding-left: 16px;
      color: #334155;
    }}
    .terms-list li {{
      margin-bottom: 1px;
    }}
    .sig-grid {{
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 5px;
      margin-bottom: 4px;
    }}
    .sig-card {{
      border: 1px solid #cbd5e1;
      border-radius: 4px;
      padding: 5px 6px;
      text-align: center;
      font-size: 11px;
      background: #ffffff;
    }}
    .sig-title {{
      font-weight: 700;
      color: #475569;
      text-align: left;
      margin-bottom: 12px;
      border-bottom: 1px dashed #e2e8f0;
      padding-bottom: 1px;
      font-size: 11px;
    }}
    .sig-line {{
      margin-bottom: 1.5px;
    }}
    .sig-name {{
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 1px;
    }}
    .sig-pos {{
      color: #64748b;
      font-size: 10.2px;
    }}
    .footer-note {{
      font-size: 10px;
      color: #64748b;
      text-align: center;
      border-top: 1px dashed #e2e8f0;
      padding-top: 3px;
      margin-top: 2px;
    }}
    .btn-print-bar {{
      max-width: 210mm;
      margin: 8px auto;
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }}
    .btn {{
      padding: 6px 14px;
      border-radius: 4px;
      font-family: inherit;
      font-size: 13px;
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
    <!-- Header (No Garuda - Clean, Professional & Official) -->
    <div class="header-center">
      <div class="doc-main-title">ใบส่งซ่อมยานพาหนะ</div>
      <div class="org-title">งานยานพาหนะ กลุ่มบริหารงานบุคคล โรงเรียนพะเยาพิทยาคม</div>
      <div class="org-subtitle">
        สังกัดสำนักงานเขตพื้นที่การศึกษามัธยมศึกษาพะเยา &bull; เลขที่ ๒๔๔ ถนนพหลโยธิน ตำบลเวียง อำเภอเมืองพะเยา จังหวัดพะเยา ๕๖๐๐๐ &bull; โทร. ๐๕๔-๔๓๑๘๗๑
      </div>
    </div>

    <!-- Ref Bar -->
    <div class="ref-bar">
      <div>
        <strong>เลขที่เอกสาร:</strong> <span style="font-weight:700; color:#0284c7;">{data['doc_no']}</span>
        <span style="color:#64748b; font-size:11.2px; margin-left:6px;">(ส่งตรวจสภาพและขอรับใบเสนอราคา)</span>
      </div>
      <div>
        <strong>วันที่ส่งซ่อม:</strong> {data['doc_date']}
      </div>
    </div>

    <!-- Info Grid -->
    <div class="grid-2">
      <!-- Service Center (Complete Toyota Phayao Details) -->
      <div class="card-box">
        <div class="card-box-header">ข้อมูลศูนย์บริการ</div>
        <div class="card-box-body">
          <div><strong>ศูนย์บริการ:</strong> <span class="highlight-val">{data['garage_name']}</span></div>
          <div><strong>ที่อยู่:</strong> {data['garage_address']}</div>
          <div><strong>โทรศัพท์:</strong> {data['garage_phone']}</div>
          <div><strong>ที่ปรึกษาบริการ (SA):</strong> ...........................................................</div>
        </div>
      </div>

      <!-- Vehicle Details & Handover -->
      <div class="card-box">
        <div class="card-box-header">ข้อมูลยานพาหนะ ณ วันส่งมอบ</div>
        <div class="card-box-body">
          <div><strong>หมายเลขทะเบียน:</strong> <span style="font-weight:700; font-size:13px; color:#0f172a;">{data['plate']}</span></div>
          <div><strong>ยี่ห้อ / รุ่น:</strong> {data['car_model']}</div>
          <div><strong>เลขไมล์ส่งซ่อม:</strong> <span class="mileage-val">{data['mileage']:,} กม.</span> &nbsp; <strong>น้ำมัน:</strong> [ &#10003; ] 3/4</div>
          <div><strong>ผู้นำส่งมอบรถ:</strong> {data['driver_name']} (โทร. {data['driver_phone']})</div>
          <div><strong>ผู้ประสานงานสั่งซ่อม:</strong> <span style="color:#0369a1; font-weight:700;">{data['coordinator_name']} (โทร. {data['coordinator_phone']})</span></div>
        </div>
      </div>
    </div>

    <!-- Service Type Badges -->
    <div class="service-types">
      <div class="type-pill {pm_active}">{pm_check} เช็คระยะตามกำหนด (PM)</div>
      <div class="type-pill {repair_active}">{repair_check} ซ่อมทั่วไป / แก้ไขอาการเสีย</div>
      <div class="type-pill">[ &nbsp; ] ซ่อมสี / ตัวถัง / เคลมประกัน</div>
      <div class="type-pill">[ &nbsp; ] ตรวจเช็คระบบความปลอดภัย / ช่วงล่าง</div>
    </div>

    <!-- Symptoms Table -->
    <div style="font-weight:700; font-size:12.2px; margin-bottom:3px; color:#0f172a;">
      รายการงานที่ขอรับบริการ / อาการที่ตรวจพบ
    </div>
    <table class="data-table">
      <thead>
        <tr>
          <th style="width: 35px; text-align:center;">ลำดับ</th>
          <th>รายการงาน / รายละเอียดอาการที่ตรวจพบ</th>
          <th style="width: 120px; text-align:center;">ผลการตรวจเช็ค</th>
        </tr>
      </thead>
      <tbody>
        {items_html}
      </tbody>
    </table>

    <!-- Terms (Polite, Professional & Clear Contact) -->
    <div class="terms-box">
      <div class="terms-title">การติดต่อประสานงานและข้อกำหนดการซ่อมบำรุง</div>
      <div style="margin-bottom: 3px; line-height: 1.35;">
        <strong>การประสานงานและพิจารณาซ่อม:</strong> ขอความอนุเคราะห์ศูนย์บริการโปรดติดต่อแจ้งผลการตรวจเช็ค และเสนอราคาเพื่อพิจารณาอนุมัติซ่อมโดยตรงที่ <strong>{data['coordinator_name']}</strong> (รองหัวหน้างานยานพาหนะ) โทรศัพท์ <span style="font-weight:700; color:#0369a1;">{data['coordinator_phone']}</span>
      </div>
      <ol class="terms-list">
        <li><strong>การเสนอราคา:</strong> ขอความอนุเคราะห์จัดทำใบเสนอราคา (Quotation) ส่งให้ผู้ประสานงานพิจารณาอนุมัติก่อนดำเนินการซ่อมหรือเปลี่ยนอะไหล่</li>
        <li><strong>การส่งคืนอะไหล่:</strong> ขอรับคืนชิ้นส่วนอะไหล่เก่าที่ทำการเปลี่ยนออกทั้งหมดส่งมอบพร้อมตัวรถ</li>
        <li><strong>การรับประกัน:</strong> งานซ่อมและอะไหล่แท้ได้รับการรับประกันคุณภาพตามมาตรฐานศูนย์บริการโตโยต้า</li>
      </ol>
    </div>

    <!-- Signatures (4 Boxes) -->
    <div class="sig-grid">
      <!-- 1: Coordinator / Authorizer Directly -->
      <div class="sig-card">
        <div class="sig-title">๑. ผู้ประสานงานและสั่งซ่อม</div>
        <div class="sig-line">ลงชื่อ ................................................................</div>
        <div class="sig-name">({data['coordinator_name']})</div>
        <div class="sig-pos">{data['coordinator_title']}</div>
        <div class="sig-pos">โทรศัพท์: {data['coordinator_phone']}</div>
      </div>

      <!-- 2: Driver Delivering -->
      <div class="sig-card">
        <div class="sig-title">๒. พนักงานขับรถผู้นำส่งมอบรถ</div>
        <div class="sig-line">ลงชื่อ ................................................................</div>
        <div class="sig-name">({data['driver_name']})</div>
        <div class="sig-pos">พนักงานขับรถ งานยานพาหนะ</div>
        <div class="sig-pos">โทรศัพท์: {data['driver_phone']}</div>
      </div>

      <!-- 3: Garage Receiver -->
      <div class="sig-card">
        <div class="sig-title">๓. เจ้าหน้าที่ศูนย์บริการผู้รับรถเข้าตรวจสภาพ</div>
        <div class="sig-line">ลงชื่อ ................................................................</div>
        <div class="sig-name">(................................................................)</div>
        <div class="sig-pos">ผู้รับรถ บริษัท โตโยต้าพะเยา (1994) จำกัด</div>
        <div class="sig-pos">สภาพรับรถ: [ &nbsp; ] เรียบร้อยดี &nbsp; วันที่ ...../...../๒๕๖๙</div>
      </div>

      <!-- 4: Approver -->
      <div class="sig-card">
        <div class="sig-title">๔. ผู้อนุมัติการส่งซ่อมบำรุง</div>
        <div class="sig-line">ลงชื่อ ................................................................</div>
        <div class="sig-name">(................................................................)</div>
        <div class="sig-pos">หัวหน้างานยานพาหนะ / รองผู้อำนวยการกลุ่มบริหารงานบุคคล</div>
        <div class="sig-pos" style="color:#059669; font-weight:600;">[ &#10003; ] อนุมัติส่งตรวจสภาพและขอเสนอราคา</div>
      </div>
    </div>

    <!-- Compact Acceptance Footer -->
    <div class="footer-note">
      <strong>การตรวจรับรถกลับเมื่อซ่อมเสร็จ:</strong> ได้ตรวจรับรถยนต์คืนในสภาพเรียบร้อยดี และได้รับอะไหล่เก่าคืนครบถ้วน (เลขไมล์ตอนรับกลับ: .................... กม.) ลงชื่อ ........................................................ ผู้ตรวจรับ วันที่ ...../...../๒๕๖๙
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

    # 1. Car 1: นข 2455 พะเยา (เช็คระยะตามมาตรฐานศูนย์)
    data_2455 = {
        "doc_no": "WO-256911-001",
        "doc_date": "๙ พฤศจิกายน ๒๕๖๙",
        "plate": "นข ๒๔๕๕ พะเยา",
        "car_model": "TOYOTA Commuter D4D",
        "mileage": 525907,
        "garage_name": "บริษัท โตโยต้าพะเยา (1994) จำกัด (สำนักงานใหญ่)",
        "garage_address": "เลขที่ ๔๐๓/๑๑ ถนนพหลโยธิน ตำบลแม่ต๋ำ อำเภอเมืองพะเยา จังหวัดพะเยา ๕๖๐๐๐",
        "garage_phone": "๐๕๔-๔๑๔๙๙๙, ๐๕๔-๔๑๒๐๓๖-๔๐ (Call Center: ๐๕๔-๔๑๔๙๐๐)",
        "is_pm": True,
        "is_repair": False,
        "driver_name": "นายสุรเชษฐ์ บุริวงค์",
        "driver_phone": "๐๖๒-๐๙๘-๑๔๒๙",
        "items": [
            {
                "title": "เช็คระยะเปลี่ยนถ่ายน้ำมันเครื่อง ตามรอบมาตรฐานศูนย์บริการโตโยต้า",
                "desc": "ดำเนินการเช็คระยะตามมาตรฐานศูนย์บริการ (เลขไมล์ปัจจุบัน ๕๒๕,๙๐๗ กม.)",
                "note": "[  ] รอผลตรวจเช็ค"
            }
        ],
        "coordinator_name": "นายพงศธร โพธิแก้ว",
        "coordinator_title": "รองหัวหน้างานยานพาหนะ กลุ่มบริหารงานบุคคล",
        "coordinator_phone": "๐๙๕-๖๙๖-๑๖๐๖"
    }

    # 2. Car 2: นข 1977 พะเยา (เสียงดังหน้าเครื่อง & น้ำมันเครื่องหายไฟโชว์)
    data_1977 = {
        "doc_no": "WO-256911-002",
        "doc_date": "๙ พฤศจิกายน ๒๕๖๙",
        "plate": "นข ๑๙๗๗ พะเยา",
        "car_model": "TOYOTA Ventury 2.7 V",
        "mileage": 447427,
        "garage_name": "บริษัท โตโยต้าพะเยา (1994) จำกัด (สำนักงานใหญ่)",
        "garage_address": "เลขที่ ๔๐๓/๑๑ ถนนพหลโยธิน ตำบลแม่ต๋ำ อำเภอเมืองพะเยา จังหวัดพะเยา ๕๖๐๐๐",
        "garage_phone": "๐๕๔-๔๑๔๙๙๙, ๐๕๔-๔๑๒๐๓๖-๔๐ (Call Center: ๐๕๔-๔๑๔๙๐๐)",
        "is_pm": False,
        "is_repair": True,
        "driver_name": "นายสมชาย พรมศร",
        "driver_phone": "๐๘๐-๐๑๖-๙๑๙๔",
        "items": [
            {
                "title": "มีเสียงดังด้านหน้าเครื่องยนต์ในขณะใช้งาน",
                "desc": "ขอความอนุเคราะห์ช่างเทคนิคตรวจเช็คหาสาเหตุที่มาของเสียง",
                "note": "[  ] รอผลตรวจเช็ค"
            },
            {
                "title": "มีอาการน้ำมันเครื่องหายในระดับที่ไฟโชว์เตือน",
                "desc": "ขอความอนุเคราะห์ตรวจเช็คหาสาเหตุการรั่วซึมหรือการพร่องของระดับน้ำมันเครื่อง",
                "note": "[  ] รอผลตรวจเช็ค"
            }
        ],
        "coordinator_name": "นายพงศธร โพธิแก้ว",
        "coordinator_title": "รองหัวหน้างานยานพาหนะ กลุ่มบริหารงานบุคคล",
        "coordinator_phone": "๐๙๕-๖๙๖-๑๖๐๖"
    }

    # Generate files directly
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
