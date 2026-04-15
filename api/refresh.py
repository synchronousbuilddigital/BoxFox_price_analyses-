from http.server import BaseHTTPRequestHandler
import json, sys, os
sys.path.insert(0, os.path.dirname(__file__))
from cache import _cache

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        _cache.clear()
        body = json.dumps({"status": "cache cleared"}).encode()
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)
