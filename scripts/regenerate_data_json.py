"""
Regenerate dashboard/public/data.json with per-spec structure.
Each spec gets its own machine, ups, sheet_w, sheet_h etc.
"""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '../api'))
from sheets import fetch_data

print("Fetching data from Google Sheets...")
data = fetch_data()

out = os.path.join(os.path.dirname(__file__), '../dashboard/public/data.json')
with open(out, 'w') as f:
    json.dump(data, f, separators=(',', ':'))

cats = len(data['categories'])
subs = sum(len(v) for v in data['categories'].values())
specs = sum(len(s['specs']) for v in data['categories'].values() for s in v.values())
print(f"Done. {cats} categories, {subs} sub-categories, {specs} specs")
print(f"Saved to {out}")
