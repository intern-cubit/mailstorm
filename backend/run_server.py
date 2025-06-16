import uvicorn
import main as fastapi_app # Import your FastAPI app from main.py
import os
import sys
import logging

# Configure logging for uvicorn, ensuring it respects the main app's logging settings
log_config = uvicorn.config.LOGGING_CONFIG
log_config["formatters"]["default"]["fmt"] = "%(asctime)s - %(levelname)s - %(name)s - %(message)s"
log_config["formatters"]["access"]["fmt"] = '%(asctime)s - %(levelname)s - %(name)s - %(message)s'

# Define a default port and host
PORT = int(os.environ.get("FASTAPI_PORT", 8000))
HOST = os.environ.get("FASTAPI_HOST", "127.0.0.1")

# Get a logger for run_server.py
server_logger = logging.getLogger("run_server")
server_logger.setLevel(logging.INFO) # Set level for this logger
# Ensure the handler is only added once to avoid duplicate log messages
if not server_logger.handlers:
    handler = logging.StreamHandler(sys.stdout)
    formatter = logging.Formatter(log_config["formatters"]["default"]["fmt"])
    handler.setFormatter(formatter)
    server_logger.addHandler(handler)

# Apply uvicorn's log config globally as well, or ensure your main app's loggers are configured.
# This ensures uvicorn's internal messages also use the desired format.
logging.config.dictConfig(log_config)

server_logger.info(f"Starting FastAPI server on http://{HOST}:{PORT}")

try:
    # Create a Uvicorn server configuration
    config = uvicorn.Config(
        app=fastapi_app.app, # Reference the app from main.py
        host=HOST,
        port=PORT,
        log_level="info",
        log_config=log_config,
        lifespan="on" # Explicitly turn on lifespan management
    )

    # Create a Uvicorn Server instance
    server = uvicorn.Server(config)

    # Run the server. This call will block until the server is stopped.
    # The server will stop when the `shutdown_event` in `main.py` is set,
    # because the `lifespan` context manager will then complete.
    server.run()

    server_logger.info("Uvicorn server has gracefully stopped.")

except Exception as e:
    server_logger.critical(f"CRITICAL ERROR: Failed to start or run FastAPI server: {e}", exc_info=True)
    sys.exit(1)