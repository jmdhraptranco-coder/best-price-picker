"""
Script to analyze: PV Calculations for SSR 2026-27 on RAW DATA.xls
Run with: python analyze_xls.py
Requires: pip install xlrd==1.2.0
"""
import sys
import os

FILE_PATH = r'C:\Users\AP TRANSCO\OneDrive - APTRANSCO\Pictures\best price picker\PV Calculations  for SSR 2026-27 on RAW DATA.xls'

print("Python version:", sys.version)
print("File exists:", os.path.exists(FILE_PATH))
print()

# ── xlrd (best for legacy .xls) ──────────────────────────────────────────────
try:
    import xlrd
    print(f"xlrd version: {xlrd.__version__}")
except ImportError:
    print("xlrd not found. Install with:  pip install xlrd==1.2.0")
    sys.exit(1)

wb = xlrd.open_workbook(FILE_PATH)
sheet_names = wb.sheet_names()
print(f"Total sheets: {len(sheet_names)}")
print("Sheet names:", sheet_names)
print()

# ── Helper: convert a cell to a readable Python value ────────────────────────
def cell_val(cell, wb):
    t = cell.ctype
    if t == xlrd.XL_CELL_EMPTY:
        return ""
    elif t == xlrd.XL_CELL_TEXT:
        return cell.value.strip()
    elif t == xlrd.XL_CELL_NUMBER:
        v = cell.value
        return int(v) if v == int(v) else round(v, 6)
    elif t == xlrd.XL_CELL_DATE:
        try:
            tup = xlrd.xldate_as_tuple(cell.value, wb.datemode)
            if tup[3:] == (0, 0, 0):
                return f"{tup[0]}-{tup[1]:02d}-{tup[2]:02d}"
            return f"{tup[0]}-{tup[1]:02d}-{tup[2]:02d} {tup[3]:02d}:{tup[4]:02d}"
        except Exception:
            return cell.value
    elif t == xlrd.XL_CELL_BOOLEAN:
        return bool(cell.value)
    else:
        return repr(cell.value)

# ── Iterate all sheets ────────────────────────────────────────────────────────
OUTPUT_LINES = []

def p(*args, **kwargs):
    line = " ".join(str(a) for a in args)
    print(line, **kwargs)
    OUTPUT_LINES.append(line)

for si, sname in enumerate(sheet_names):
    ws = wb.sheet_by_index(si)
    p("=" * 90)
    p(f'SHEET [{si}]: "{sname}"')
    p(f'Dimensions: {ws.nrows} rows  x  {ws.ncols} columns')
    p()

    max_display = min(35, ws.nrows)
    for r in range(max_display):
        row = [cell_val(ws.cell(r, c), wb) for c in range(ws.ncols)]
        p(f"  Row {r+1:3d}: {row}")

    if ws.nrows > max_display:
        p(f"  ... ({ws.nrows - max_display} more rows not shown)")

    # Also show last 5 rows if sheet has more than 35 rows
    if ws.nrows > 40:
        p(f"  --- Last 5 rows ---")
        for r in range(ws.nrows - 5, ws.nrows):
            row = [cell_val(ws.cell(r, c), wb) for c in range(ws.ncols)]
            p(f"  Row {r+1:3d}: {row}")

    p()

# Save to a text file alongside this script
out_path = os.path.join(os.path.dirname(FILE_PATH), "xls_analysis_output.txt")
with open(out_path, "w", encoding="utf-8") as f:
    f.write("\n".join(OUTPUT_LINES))
print(f"\nOutput also saved to: {out_path}")
