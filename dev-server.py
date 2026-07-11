#!/usr/bin/env python3
"""Dev server: static files with caching disabled, so CSS/JS edits
always arrive on plain reload (Chrome heuristically caches assets
served without Cache-Control headers)."""

import http.server
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, must-revalidate')
        super().end_headers()


if __name__ == '__main__':
    http.server.ThreadingHTTPServer(('', PORT), NoCacheHandler).serve_forever()
