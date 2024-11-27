from http.server import HTTPServer, SimpleHTTPRequestHandler
import os
import json

class GameServerHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        # Special handling for songs directory listing
        if self.path == '/songs/':
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()

            # Get all subdirectories in the songs folder
            songs_path = os.path.join(os.getcwd(), 'songs')
            if os.path.exists(songs_path):
                song_dirs = [d for d in os.listdir(songs_path)
                           if os.path.isdir(os.path.join(songs_path, d))]
                self.wfile.write(json.dumps(song_dirs).encode())
            else:
                self.wfile.write(json.dumps([]).encode())
            return

        return super().do_GET()

def run(port=8000):
    os.chdir('static')
    server_address = ('', port)
    httpd = HTTPServer(server_address, GameServerHandler)
    print(f'Server running at http://localhost:{port}')
    httpd.serve_forever()

if __name__ == '__main__':
    run()
