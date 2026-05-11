import re

path = r"d:\AI CURSER\ppk-drivehub\frontend\reports.html"
content = open(path, encoding='utf-8-sig').read()

# Remove all the old per-tab export buttons between the refresh button and </div> of actions-bar
# Strategy: find actions-bar div and replace completely
old_section = '''      <div class="actions-bar">
        <button class="btn btn-secondary" onclick="loadReport()">
          🔃 รีเฟรช
        </button>
        <button class="btn btn-primary" id="btnExportFuel" onclick="exportReport()" style="display:none">
          📊 Export Excel น้ำมัน
        </button>
        <button class="btn btn-secondary" id="btnPrint" onclick="printFuelReport()" style="display:none">
          🖨️ พิมพ์รายงาน
        </button>'''

new_section = '''      <div class="actions-bar">
        <button class="btn btn-secondary" onclick="loadReport()">
          🔃 รีเฟรช
        </button>
        <button class="btn btn-primary" onclick="exportCurrent()">
          📊 Export Excel (.xlsx)
        </button>
        <button class="btn btn-secondary" id="btnPrint" onclick="printFuelReport()" style="display:none">
          🖨️ พิมพ์รายงาน
        </button>'''

if old_section in content:
    print("FOUND old_section - replacing...")
    content2 = content.replace(old_section, new_section, 1)
else:
    print("NOT FOUND exact. Trying looser match...")
    # Try to remove specific lines with btnExportFuel/Trips/Expenses/Audit
    import re
    # Remove the 3 export button blocks that still remain
    for btn_id in ['btnExportTrips', 'btnExportExpenses', 'btnExportAudit']:
        pattern = r'\s*<button class="btn btn-primary" id="' + btn_id + r'"[^>]*>\s*.*?\s*</button>'
        m = re.search(pattern, content, re.DOTALL)
        if m:
            print(f"Removing {btn_id}")
            content = content.replace(m.group(0), '', 1)
    content2 = content

# Also remove remaining btnExportFuel button if old_section match failed
if old_section not in content:
    pattern = r'\s*<button class="btn btn-primary" id="btnExportFuel"[^>]*>\s*.*?\s*</button>'
    m = re.search(pattern, content2, re.DOTALL)
    if m:
        print(f"Removing btnExportFuel")
        content2 = content2.replace(m.group(0), '', 1)

# Now add the exportCurrent button after the refresh button if not already there
if 'exportCurrent()' not in content2:
    old_refresh = '''        <button class="btn btn-secondary" onclick="loadReport()">
          🔃 รีเฟรช
        </button>'''
    new_refresh = '''        <button class="btn btn-secondary" onclick="loadReport()">
          🔃 รีเฟรช
        </button>
        <button class="btn btn-primary" onclick="exportCurrent()">
          📊 Export Excel (.xlsx)
        </button>'''
    if old_refresh in content2:
        content2 = content2.replace(old_refresh, new_refresh, 1)
        print("Added exportCurrent button after refresh")
    else:
        print("Could not add button - manual fix needed")

open(path, 'w', encoding='utf-8-sig').write(content2)
print("SAVED")
