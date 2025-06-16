import uvicorn
import main as fastapi_app
import os
import sys
import logging # Import logging to integrate with FastAPI's logging setup

# Configure logging for uvicorn, ensuring it respects the main app's logging settings
log_config = uvicorn.config.LOGGING_CONFIG
log_config["formatters"]["default"]["fmt"] = "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
log_config["formatters"]["access"]["fmt"] = '%(asctime)s - %(levelname)s - %(name)s - %(message)s'

# Define a default port and host
PORT = int(os.environ.get("FASTAPI_PORT", 8000))
HOST = os.environ.get("FASTAPI_HOST", "127.0.0.1")

# Use logging instead of print for better integration and handling in a packaged app
logging.info(f"Starting FastAPI server on http://{HOST}:{PORT}")

try:
    uvicorn.run(
        fastapi_app.app,
        host=HOST,
        port=PORT,
        log_level="info", # This will ensure INFO level messages from uvicorn are shown
        log_config=log_config # Apply the custom log format
    )
except Exception as e:
    logging.critical(f"CRITICAL ERROR: Failed to start FastAPI server: {e}", exc_info=True)
    sys.exit(1)