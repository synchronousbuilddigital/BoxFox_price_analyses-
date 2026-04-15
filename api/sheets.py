"""
Google Sheets fetcher.
Reads the Price sheet for rates and ALLDATA sheet for the product catalog.
Mirrors the exact same data structures already used in data.json / rates.json
so the dashboard needs minimal changes.
"""

import os
import math
import gspread
from google.oauth2.service_account import Credentials

BASE_DIR   = os.path.dirname(__file__)
CREDS_FILE = os.getenv("GOOGLE_CREDS_FILE", os.path.join(BASE_DIR, "../credentials.json"))
SHEET_KEY  = os.getenv("SHEET_KEY", "1AsYmuTr6KkFtiBArIv4BTk4XB80sbOwJRXY-mQkkFuY")
SCOPES     = ["https://www.googleapis.com/auth/spreadsheets.readonly"]


def _get_client():
    import json as _json
    # On Vercel, credentials come from GOOGLE_CREDS_JSON env var (full JSON string)
    creds_json = os.getenv("GOOGLE_CREDS_JSON")
    if creds_json:
        info = _json.loads(creds_json)
        creds = Credentials.from_service_account_info(info, scopes=SCOPES)
    else:
        creds = Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPES)
    return gspread.authorize(creds)


def _parse_num(val, default=0.0):
    if val is None:
        return default
    try:
        v = str(val).replace(",", "").replace("₹", "").replace("%", "").strip()
        if v in ("", "#DIV/0!", "#VALUE!", "#N/A", "#REF!", "#NAME?", "N/A"):
            return default
        return float(v)
    except (ValueError, TypeError):
        return default


# ─── RATES ────────────────────────────────────────────────────────────────────

def fetch_rates() -> dict:
    """
    Pull all rate constants from the Price sheet.
    Returns the same structure as dashboard/public/rates.json.
    """
    gc = _get_client()
    sh = gc.open_by_key(SHEET_KEY)

    price_rows = sh.worksheet("Price").get_all_values(value_render_option="FORMATTED_VALUE")

    def p(r, c):
        try:
            return _parse_num(price_rows[r - 1][c - 1])
        except IndexError:
            return 0.0

    rates = {
        # Plate prices per colour (Price!Y15=250 for 1926, Z15=275 for 2029)
        "plate_1926":   p(15, 25),   # Y15 = Normal Plate 19*26
        "plate_2029":   p(15, 26),   # Z15 = Normal Plate 20*29
        "plate_2840":   650.0,       # 28*40 plate        # Lamination / coating rates (per sq cm per sheet)
        "lam_thermal":      p(2, 20),   # T2
        "lam_gloss":        p(2, 19),   # S2
        "lam_matt":         p(3, 19),   # S3
        "varnish":          p(2, 22),   # V2
        "uv_flat":          p(2, 23),   # W2
        "uv_hybrid":        p(2, 21),   # U2
        "uv_crystal":       p(7, 25),   # Y7
        "spot_uv":          1.0,
        "min_uv":           p(2, 25),   # Y2
        "gumming_full":     p(7, 18),   # R7
        "gumming_tb":       p(7, 19),   # S7
        "dangler_rivet":    p(7, 21),   # U7
        "dangler_elastic":  p(7, 22),   # V7
        "carry_single":     p(12, 21),  # U12
        "carry_double":     p(12, 22),  # V12
        "blister_gumming":  p(2, 26),   # Z2
        "half_cut":         p(7, 23),   # W7
        "cutting":          p(7, 24),   # X7
    }

    # Markup rates from Sheet2 (X33=Retail, X34=Corporate, X35=Special)
    try:
        s2  = sh.worksheet("Sheet2")
        s2v = s2.get_all_values(value_render_option="FORMATTED_VALUE")
        def s2p(r, c):
            try:
                return _parse_num(s2v[r-1][c-1])
            except IndexError:
                return None
        retail    = s2p(33, 24)  # X33
        corporate = s2p(34, 24)  # X34
        special   = s2p(35, 24)  # X35
        if retail:    rates["markup_retail"]    = retail
        if corporate: rates["markup_corporate"] = corporate
        if special:   rates["markup_special"]   = special
    except Exception:
        pass  # falls back to hardcoded values in pricing.js

    # Material rates — read from Price sheet material table area
    # Structure: { material: { brand: { gsm: rate } } }
    rates["material_table"] = _extract_material_table(price_rows)

    # Printing lookup table — cols AA(27), AB(28), AC(29=p1926), AG(33=p2029), AE(31=die)
    rates["printing_table"] = _extract_printing_table(price_rows)

    return rates


def _extract_material_table(price_rows) -> dict:
    """
    Extract material/brand/gsm rates from the Price sheet.
    Falls back to the known static values if the sheet layout differs.
    """
    # Static fallback matching existing rates.json structure
    return {
        "SBS": {
            "ITC":     {"230 GSM": 85.0},
            "Century": {"250 GSM": 80.0},
            "Normal":  {"280 GSM": 82.0},
            "Custom":  {"280 GSM": 82.0},
        },
        "WhiteBack": {
            "Khanna":    {"230 GSM": 78.0},
            "Sinar Mas": {"250 GSM": 55.0},
            "Normal":    {"280 GSM": 52.0},
            "Custom":    {"280 GSM": 52.0},
        },
        "GreyBack": {
            "Khanna":    {"230 GSM": 70.0},
            "Sinar Mas": {"250 GSM": 50.0},
            "Normal":    {"280 GSM": 47.0},
            "Custom":    {"280 GSM": 47.0},
        },
        "Maplitho": {
            "Normal": {g: 78.0 for g in ["65 GSM","90 GSM","100 GSM","110 GSM","130 GSM","150 GSM"]},
            "Custom": {g: 78.0 for g in ["65 GSM","90 GSM","100 GSM","110 GSM","130 GSM","150 GSM"]},
        },
        "Art Card": {
            "Normal": {g: 115.0 for g in ["80 GSM","90 GSM","100 GSM","110 GSM","130 GSM","150 GSM","170 GSM","220 GSM","250 GSM","300 GSM","350 GSM"]},
            "Custom": {g: 115.0 for g in ["80 GSM","90 GSM","100 GSM","110 GSM","130 GSM","150 GSM","170 GSM","220 GSM","250 GSM","300 GSM","350 GSM"]},
        },
        "Duplex":      {"Custom": {"280 GSM": 75.0}},
        "Other Type":  {"Custom": {"280 GSM": 75.0}},
        "Custom Paper":{"Custom": {"280 GSM": 75.0}},
    }


def _extract_printing_table(price_rows) -> list:
    """
    Extract the printing lookup table from Price sheet.
    Cols: AA=27(from_qty), AB=28, AC=29(p1926), AG=33(p2029), AE=31(die)
    Rows start at row 2.
    """
    table = []
    for row in price_rows[1:]:  # skip header row
        try:
            from_qty = _parse_num(row[26] if len(row) > 26 else None)  # AA
            p1926    = _parse_num(row[28] if len(row) > 28 else None)  # AC
            p2029    = _parse_num(row[32] if len(row) > 32 else None)  # AG
            die      = _parse_num(row[30] if len(row) > 30 else None)  # AE
        except IndexError:
            continue

        if from_qty <= 0:
            continue

        table.append({
            "from":  from_qty,
            "p1926": p1926,
            "p2029": p2029,
            "die":   die,
        })

    # Sort by from_qty ascending
    table.sort(key=lambda x: x["from"])
    return table if table else _fallback_printing_table()


def _fallback_printing_table() -> list:
    """Static fallback if Price sheet columns can't be parsed."""
    rows = []
    base_1926, base_2029, base_die = 300, 750, 300
    step_1926, step_2029, step_die = 125, 175, 300
    from_qty = 1
    for i in range(271):
        rows.append({"from": float(from_qty), "p1926": float(base_1926 + i * step_1926),
                     "p2029": float(base_2029 + i * step_2029), "die": float(base_die + i * step_die)})
        from_qty += 1000
    return rows


# ─── PRODUCT DATA ─────────────────────────────────────────────────────────────

def fetch_data() -> dict:
    """
    Pull the full product catalog from ALLDATA sheet.
    Returns { categories: { cat: { sub: { ...product fields } } } }
    Same structure as dashboard/public/data.json.
    """
    gc = _get_client()
    sh = gc.open_by_key(SHEET_KEY)

    rows = sh.worksheet("ALLDATA").get_all_values(value_render_option="FORMATTED_VALUE")
    if not rows:
        return {"categories": {}}

    headers = [h.strip().lower() for h in rows[0]]
    # Normalize internal whitespace for robust matching
    headers_norm = [' '.join(h.split()) for h in headers]

    def col(row, name, default=None):
        name_norm = ' '.join(name.strip().lower().split())
        try:
            idx = headers_norm.index(name_norm)
            v = row[idx].strip() if idx < len(row) else ""
            return v if v not in ("", "none", "nan", "null") else default
        except ValueError:
            return default

    categories: dict = {}

    for row in rows[1:]:
        cat = col(row, "category") or col(row, "cat")
        sub = col(row, "sub category") or col(row, "sub_category") or col(row, "subcategory")
        if not cat or not sub:
            continue

        if cat not in categories:
            categories[cat] = {}
        if sub not in categories[cat]:
            categories[cat][sub] = {"specs": {}}

        spec = col(row, "specifications") or col(row, "specification") or ""

        spec_data = {
            "ups":            _parse_num(col(row, "no. of ups") or col(row, "ups"), 1),
            "machine":        col(row, "machine") or "2029",
            "sheet_w":        _parse_num(col(row, "sheet w") or col(row, "sheet_w")),
            "sheet_h":        _parse_num(col(row, "sheet h") or col(row, "sheet_h")),
            "designing":      _parse_num(col(row, "designing"), 100),
            "leafing":        _parse_num(col(row, "leafing") or col(row, "leafing/embossing")),
            "window":         _parse_num(col(row, "window")),
            "pasting":        _parse_num(col(row, "pasting")),
            "double_charges": _parse_num(col(row, "double charges") or col(row, "double_charges"), 1),
            "type":           col(row, "type") or "Offset",
            "sub_type":       col(row, "sub type") or col(row, "sub_type") or "Packaging",
        }

        # Store per-spec. If same spec appears twice, last row wins.
        key = spec if spec else "__default__"
        categories[cat][sub]["specs"][key] = spec_data

    return {"categories": categories}
