import gspread
from google.oauth2.service_account import Credentials
from openpyxl.utils import get_column_letter

CREDS_FILE = 'credentials.json'
SHEET_KEY  = '1AsYmuTr6KkFtiBArIv4BTk4XB80sbOwJRXY-mQkkFuY'
SCOPES     = ['https://www.googleapis.com/auth/spreadsheets.readonly']

creds = Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPES)
gc    = gspread.authorize(creds)
sh    = gc.open_by_key(SHEET_KEY)

ws = sh.worksheet('Sheet2')
formulas = ws.get_all_values(value_render_option='FORMULA')
values   = ws.get_all_values(value_render_option='FORMATTED_VALUE')

print('=== SHEET2 - ALL CELLS WITH CONTENT (rows 1-120) ===')
for r in range(min(120, len(formulas))):
    for c in range(len(formulas[r])):
        f = formulas[r][c]
        v = values[r][c] if r < len(values) and c < len(values[r]) else ''
        if f or v:
            col = get_column_letter(c+1)
            print('  Sheet2!%s%d: formula=%r  value=%r' % (col, r+1, f, v))
