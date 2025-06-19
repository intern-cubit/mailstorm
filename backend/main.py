import os
import shutil
import tempfile
import json
import pandas as pd
import subprocess
import hashlib
import asyncio
import sys # Import sys for sys.exit()

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from contextlib import asynccontextmanager
import logging

# --- Logging Configuration ---
# Configure logging for better output in console and potentially files
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)
# logger.setLevel(logging.INFO) # Already set by basicConfig, but can override for this specific logger if needed

# --- Global Shutdown Event ---
shutdown_event = asyncio.Event()
SHUTDOWN_GRACE_PERIOD = 5 # seconds to wait for graceful shutdown before explicit exit

# --- FastAPI Lifespan Context Manager ---
@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    FastAPI lifespan context manager for startup and shutdown events.
    """
    logger.info("FastAPI app starting up...")
    yield # Application is ready to receive requests
    logger.info("FastAPI app received shutdown signal. Waiting for graceful termination...")

    try:
        # Wait for the shutdown event with a timeout
        await asyncio.wait_for(shutdown_event.wait(), timeout=SHUTDOWN_GRACE_PERIOD)
        logger.info("FastAPI app received shutdown signal and completed graceful wait.")
    except asyncio.TimeoutError:
        logger.warning(f"FastAPI app did not complete graceful shutdown within {SHUTDOWN_GRACE_PERIOD} seconds. Forcing exit.")
    except Exception as e:
        logger.error(f"Error during graceful shutdown wait: {e}", exc_info=True)

    # Any specific cleanup tasks that MUST run before the process exits
    # For example, closing database connections, flushing logs, etc.
    # Add them here if you have any.
    logger.info("FastAPI app proceeding with final cleanup and exit.")
    sys.exit(0) # Explicitly exit the process after graceful attempts

app = FastAPI(lifespan=lifespan)

# Add CORS middleware to allow cross-origin requests from your frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins, including http://localhost:5173 (for email app) and http://localhost:3000 (for activation app)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Determine the user-specific application data directory
if os.name == 'nt': # Check if the operating system is Windows
    app_data_dir = os.getenv('LOCALAPPDATA')
    if app_data_dir is None: # Fallback in case LOCALAPPDATA env var is not set (unlikely on modern Windows)
        app_data_dir = os.path.join(os.path.expanduser('~'), 'AppData', 'Local')
else: # For other OS (Linux/macOS), use XDG_DATA_HOME or a fallback in user home
    app_data_dir = os.getenv('XDG_DATA_HOME', os.path.join(os.path.expanduser('~'), '.local', 'share'))

# Create an application-specific directory within AppData
APP_NAME_DIR = "mailstorm" # Use your application's name
APP_DATA_PATH = os.path.join(app_data_dir, APP_NAME_DIR)

# Ensure the application data directory exists
try:
    os.makedirs(APP_DATA_PATH, exist_ok=True)
    logger.info(f"Ensured application data directory exists: {APP_DATA_PATH}")
except OSError as e:
    logger.critical(f"CRITICAL ERROR: Could not create application data directory {APP_DATA_PATH}: {e}")
    sys.exit(1) 

ACTIVATION_FILE = os.path.join(APP_DATA_PATH, "activation.txt")


class ActivationRequest(BaseModel):
    motherboardSerial: str
    processorId: str
    activationKey: str

class EmailConfig(BaseModel):
    senderEmail: str = Field(..., alias="senderEmail", description="Sender's email address")
    senderPassword: str = Field(..., alias="senderPassword", description="Sender's email password or app password")
    smtpServer: str = Field(..., alias="smtpServer", description="SMTP server address (e.g., smtp.gmail.com)")
    smtpPort: int = Field(587, alias="smtpPort", description="SMTP server port (e.g., 587 for TLS, 465 for SSL)")


def get_motherboard_serial():
    try:
        try:
            result = subprocess.check_output(
                ["powershell.exe", "-Command", "(Get-WmiObject Win32_BaseBoard).SerialNumber"],
                text=True,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            serial = result.strip()
            if serial:
                return serial
            else:
                logger.warning("Powershell returned empty motherboard serial. Falling back to wmic.")
        except (subprocess.CalledProcessError, FileNotFoundError, Exception) as e:
            logger.warning(f"Powershell WMI query for motherboard serial failed ({e}). Falling back to wmic.")

        result = subprocess.check_output("wmic baseboard get serialnumber", shell=True, text=True)
        serial = result.split('\n')[1].strip()
        return serial
    except Exception as e:
        logger.error(f"Failed to get motherboard serial: {e}")
        return f"Error getting motherboard serial: {e}"

def get_processor_id():
    try:
        try:
            result = subprocess.check_output(
                ["powershell.exe", "-Command", "(Get-WmiObject Win32_Processor).ProcessorId"],
                text=True,
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW
            )
            processor_id = result.strip()
            if processor_id:
                return processor_id
            else:
                logger.warning("Powershell returned empty processor ID. Falling back to wmic.")
        except (subprocess.CalledProcessError, FileNotFoundError, Exception) as e:
            logger.warning(f"Powershell WMI query for processor ID failed ({e}). Falling back to wmic.")

    except Exception as e:
        logger.warning(f"Initial attempt for processor ID failed. Falling back to wmic. Error: {e}")
    try:
        result = subprocess.check_output("wmic cpu get processorId", shell=True, text=True)
        processor_id = result.split('\n')[1].strip()
        return processor_id
    except Exception as e:
        logger.error(f"Failed to get processor ID: {e}")
        return f"Error getting processor ID: {e}"


def generate_activation_key(processorId: str, motherboardSerial: str) -> str:
    """
    Generates an activation key similar to the provided JavaScript function.
    """
    input_string = f"{processorId}:{motherboardSerial}".upper()

    hash_object = hashlib.sha512()
    hash_object.update(input_string.encode('utf-8'))
    hex_hash = hash_object.hexdigest().upper()

    big_int_value = int(hex_hash, 16)

    base36_chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    base36_result = ""
    while big_int_value > 0:
        big_int_value, remainder = divmod(big_int_value, 36)
        base36_result = base36_chars[remainder] + base36_result

    if not base36_result:
        base36_result = "0"

    base36 = base36_result.upper()

    raw_key = base36.zfill(16)[:16] # Ensure it's at least 16 chars and truncate if longer

    formatted_key = "-".join([raw_key[i:i+4] for i in range(0, len(raw_key), 4)])

    return formatted_key

@app.get("/system-info")
async def get_system_info_endpoint():
    motherboard_serial = get_motherboard_serial()
    processor_id = get_processor_id()

    if "Error" in motherboard_serial or "Error" in processor_id:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve complete system information. Motherboard: {motherboard_serial}, Processor: {processor_id}"
        )

    return {"motherboardSerial": motherboard_serial, "processorId": processor_id}


@app.post("/activate")
async def activate_system_endpoint(request: ActivationRequest):
    logger.info(f"Activation request received for Motherboard: '{request.motherboardSerial}', Processor: '{request.processorId}'")

    generated_key = generate_activation_key(request.processorId, request.motherboardSerial)
    logger.info(f"Generated Activation Key: {generated_key}")

    if generated_key == request.activationKey.upper():
        try:
            os.makedirs(os.path.dirname(ACTIVATION_FILE), exist_ok=True)
            with open(ACTIVATION_FILE, "w") as f:
                f.write(generated_key)
            logger.info(f"Activation successful. Key saved to {ACTIVATION_FILE}")
            return {"success": True, "message": "Activation successful!"}
        except IOError as e:
            logger.error(f"IOError saving activation file {ACTIVATION_FILE}: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save activation data due to file system error: {e}")
        except Exception as e:
            logger.error(f"Unexpected error saving activation file {ACTIVATION_FILE}: {e}", exc_info=True)
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred while saving activation data: {e}")
    else:
        logger.warning(f"Activation failed: Provided key '{request.activationKey}' does not match generated key '{generated_key}'.")
        return {"success": False, "message": "Activation failed: Invalid key."}

@app.get("/check-activation") 
async def check_activation_endpoint():
    motherboard_serial = get_motherboard_serial()
    processor_id = get_processor_id()

    if "Error" in motherboard_serial or "Error" in processor_id:
        error_message = f"Failed to retrieve system information for activation check. Motherboard: {motherboard_serial}, Processor: {processor_id}"
        logger.error(error_message)
        # Attempt to remove invalid activation file if system info fails
        if os.path.exists(ACTIVATION_FILE):
            try:
                os.remove(ACTIVATION_FILE)
                logger.info(f"Deleted potentially invalid activation file {ACTIVATION_FILE} due to system info error.")
            except OSError as e:
                logger.error(f"Error deleting activation file {ACTIVATION_FILE} during cleanup: {e}")
        return {"isActivated": False, "message": error_message}

    generated_key = generate_activation_key(processor_id, motherboard_serial)
    logger.info(f"Check Activation (Detail): Generated Key: {generated_key}")

    is_activated = False
    stored_key = None
    try:
        if os.path.exists(ACTIVATION_FILE):
            try:
                with open(ACTIVATION_FILE, "r") as f:
                    stored_key = f.read().strip()
                logger.info(f"Check Activation (Detail): Stored Key: {stored_key}")

                if generated_key == stored_key:
                    is_activated = True
                    logger.info("Check Activation (Detail): System is activated.")
                else:
                    logger.warning("Check Activation (Detail): Generated key does not match stored key. Deleting activation file.")
                    try:
                        os.remove(ACTIVATION_FILE)
                        logger.info(f"Deleted activation file {ACTIVATION_FILE} due to key mismatch.")
                    except OSError as e:
                        logger.error(f"Error deleting activation file {ACTIVATION_FILE} during mismatch: {e}")
            except IOError as e:
                logger.error(f"IOError reading activation file {ACTIVATION_FILE}: {e}")
                if os.path.exists(ACTIVATION_FILE):
                    try:
                        os.remove(ACTIVATION_FILE)
                        logger.error(f"Deleted unreadable activation file {ACTIVATION_FILE}.")
                    except OSError as e_del:
                        logger.error(f"Error deleting unreadable activation file {ACTIVATION_FILE}: {e_del}")
                is_activated = False
        else:
            logger.info("Check Activation (Detail): Activation file not found.")

    except Exception as e:
        logger.error(f"Unhandled error during activation check (detail): {e}", exc_info=True)
        if os.path.exists(ACTIVATION_FILE):
            try:
                os.remove(ACTIVATION_FILE)
                logger.error(f"Deleted activation file {ACTIVATION_FILE} due to error during check.")
            except OSError as e_del:
                logger.error(f"Error deleting activation file {ACTIVATION_FILE} due to error during check: {e_del}")
        is_activated = False

    return {"isActivated": is_activated, "message": "System is activated." if is_activated else "System is not activated."}

@app.post("/logout")
async def logout_endpoint():
    if os.path.exists(ACTIVATION_FILE):
        try:
            os.remove(ACTIVATION_FILE)
            logger.info(f"Activation file '{ACTIVATION_FILE}' deleted successfully for logout.")
            return JSONResponse(content={"success": True, "message": "Logged out successfully (activation file deleted)." })
        except OSError as e:
            logger.error(f"Error deleting activation file '{ACTIVATION_FILE}' during logout: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to delete activation file: {e}")
    else:
        logger.info("Logout requested, but no activation file found.")
        return JSONResponse(content={"success": True, "message": "No activation file found to delete (already logged out)." })

@app.post("/preview-csv")
async def preview_csv_endpoint(
    csv_file: UploadFile = File(..., description="CSV file to preview")
):
    if not csv_file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a CSV.")

    temp_dir = None
    try:
        temp_dir = tempfile.mkdtemp()
        csv_path = os.path.join(temp_dir, "preview.csv")

        with open(csv_path, "wb") as f:
            f.write(await csv_file.read())

        try:
            df = pd.read_csv(csv_path, encoding='utf-8')
        except UnicodeDecodeError:
            try:
                df = pd.read_csv(csv_path, encoding='latin1')
            except Exception as e:
                raise HTTPException(status_code=422, detail=f"Failed to parse CSV with fallback encoding: {e}")
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to parse CSV: {e}")

        columns = df.columns.tolist()
        preview_data = df.head(10).fillna("").to_dict('records')

        return JSONResponse({
            "status": "success",
            "columns": columns,
            "preview": preview_data,
            "total_rows": len(df)
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in /preview-csv: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")
    finally:
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except OSError as e:
                logger.error(f"Error cleaning up temp directory {temp_dir}: {e}")

@app.post("/send-emails")
async def send_emails_endpoint(
    subject: str = Form(..., description="Email subject template"),
    message: str = Form(..., description="Email body template (HTML or plain text) with variables like {name}"),
    csv_file: UploadFile = File(..., description="CSV with contact data"),
    variables: str = Form(..., description="JSON list of variable names used in template"),
    email_configs: str = Form(..., description="JSON list of sender email configurations"), # CHANGED
    media_file: UploadFile = File(None, description="Optional media file to attach to all emails."),
    html_content: bool = Form(False, description="True if the message is HTML, False for plain text"),
    bcc_mode: bool = Form(False, description="True to send emails as BCC, False for TO")
):
    try:
        variable_list = json.loads(variables)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid variables format. Must be a JSON array.")

    try:
        configs_data = json.loads(email_configs)
        email_configs_list = [EmailConfig(**config).model_dump(by_alias=True) for config in configs_data]

        if not email_configs_list:
            raise HTTPException(status_code=400, detail="No email configurations provided.")

        for config in email_configs_list:
            if not all([config['senderEmail'], config['senderPassword'], config['smtpServer'], config['smtpPort']]):
                raise HTTPException(status_code=400, detail="All fields in each email configuration must be filled.")

    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid email configurations format. Must be a JSON array of objects.")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error validating email configurations: {e}")

    if not csv_file.filename.lower().endswith(".csv"):
        raise HTTPException(status_code=400, detail="Uploaded file is not a CSV.")

    temp_dir = None
    try:
        temp_dir = tempfile.mkdtemp()
        csv_path = os.path.join(temp_dir, "contacts.csv")
        with open(csv_path, "wb") as f:
            f.write(await csv_file.read())

        try:
            df = pd.read_csv(csv_path, encoding='utf-8')
        except UnicodeDecodeError:
            try:
                df = pd.read_csv(csv_path, encoding='latin1')
            except Exception as e:
                raise HTTPException(status_code=422, detail=f"Failed to parse CSV with fallback encoding: {e}")
        except Exception as e:
            raise HTTPException(status_code=422, detail=f"Failed to parse CSV: {e}")

        missing_vars = [var for var in variable_list if var not in df.columns]
        if missing_vars:
            raise HTTPException(
                status_code=422,
                detail=f"Variables not found in CSV: {', '.join(missing_vars)}"
            )

        if 'email' not in df.columns:
            raise HTTPException(
                status_code=422,
                detail="CSV must contain an 'email' column for sending emails."
            )

        media_path = None
        if media_file:
            media_path = os.path.join(temp_dir, media_file.filename)
            with open(media_path, "wb") as f:
                f.write(await media_file.read())

        from email_sender import send_emails_from_dataframe_enhanced
        send_results = send_emails_from_dataframe_enhanced(
            df=df,
            subject_template=subject,
            message_template=message,
            variables=variable_list,
            email_configs=email_configs_list,
            media_path=media_path,
            html_content=html_content,
            bcc_mode=bcc_mode
        )
        logger.info(f"Email campaign completed: {len(send_results['successful_emails'])} successful, {len(send_results['failed_emails'])} failed.")
        return JSONResponse({
            "status": "success",
            "detail": f"Email campaign initiated. {len(send_results['successful_emails'])} emails successfully sent, {len(send_results['failed_emails'])} failed.",
            "successful_emails": send_results['successful_emails'],
            "failed_emails": send_results['failed_emails']
        })

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error in /send-emails: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {e}")
    finally:
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except OSError as e:
                logger.error(f"Error cleaning up temp directory {temp_dir}: {e}")

@app.get("/health")
async def health_check():
    logger.info("Health check requested.")
    return {"status": "healthy", "message": "Email Campaign API is running"}

@app.post("/shutdown")
async def shutdown_backend_endpoint():
    logger.info("Received shutdown request for backend. Signaling graceful exit...")
    shutdown_event.set() # Set the event to unblock the lifespan shutdown
    return {"message": "Backend received shutdown request. Attempting graceful exit."}