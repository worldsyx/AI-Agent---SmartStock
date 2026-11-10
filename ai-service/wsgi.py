import os
import sys

# Ensure the ai-service directory is in sys.path regardless of working directory
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in sys.path:
    sys.path.insert(0, current_dir)

from app import create_app

app = create_app()

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    print(f"======================================================")
    print(f" SmartStock AI Data Service running on port {port}")
    print(f" URL: http://127.0.0.1:{port}")
    print(f" Health check: http://127.0.0.1:{port}/health")
    print(f"======================================================")
    app.run(host='0.0.0.0', port=port, debug=False)
