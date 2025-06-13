import uvicorn
import main as fastapi_app # Assuming your FastAPI instance is in main.py and named 'app'
import os
import sys

# Define a default port or get from environment variable
# This port must be known by your frontend and chosen carefully
PORT = int(os.environ.get("FASTAPI_PORT", 8000))
HOST = os.environ.get("FASTAPI_HOST", "127.0.0.1") # Use 127.0.0.1 for local desktop app communication

# Print statement for startup message. This will now go through the logger in whatsapp_sender if configured first,
# or use default system encoding.
print(f"Starting FastAPI server on http://{HOST}:{PORT}") 
try:
    uvicorn.run(fastapi_app.app, host=HOST, port=PORT, log_level="info")
except Exception as e:
    print(f"Error starting FastAPI: {e}") # This print statement might still use default encoding
    sys.exit(1)