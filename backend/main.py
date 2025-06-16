import os
import shutil
import tempfile
import json
import pandas as pd
import subprocess  # For system info
import hashlib     # For hashing
# Removed: import logging

from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Removed: logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI()

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
    app_data_dir = os.path.getenv('XDG_DATA_HOME', os.path.join(os.path.expanduser('~'), '.local', 'share'))

# Create an application-specific directory within AppData
APP_NAME_DIR = "mailstorm" # Use your application's name
APP_DATA_PATH = os.path.join(app_data_dir, APP_NAME_DIR)

# Ensure the application data directory exists
# This should be done at application startup or before any file operations.
try:
    os.makedirs(APP_DATA_PATH, exist_ok=True)
    print(f"Ensured application data directory exists: {APP_DATA_PATH}") # Replaced logging.info
except OSError as e:
    print(f"CRITICAL ERROR: Could not create application data directory {APP_DATA_PATH}: {e}") # Replaced logging.critical
    # If this fails, the application might not be able to save activation data.
    # Consider raising an exception or having a global error handler for startup issues.

# Define the full path to the activation file
ACTIVATION_FILE = os.path.join(APP_DATA_PATH, "activation.txt")


class ActivationRequest(BaseModel):
    motherboardSerial: str
    processorId: str
    activationKey: str

def get_motherboard_serial():
    try:
        # Using powershell for potentially more robust WMI queries on modern Windows
        # Fallback to wmic if powershell fails or is not preferred
        try:
            result = subprocess.check_output(
                ["powershell.exe", "-Command", "(Get-WmiObject Win32_BaseBoard).SerialNumber"],
                text=True, # Decode to string directly
                stderr=subprocess.PIPE,
                creationflags=subprocess.CREATE_NO_WINDOW # Hide the console window on Windows
            )
            serial = result.strip()
            if serial:
                return serial
            else:
                print("Powershell returned empty motherboard serial. Falling back to wmic.") # Replaced logging.warning
        except (subprocess.CalledProcessError, FileNotFoundError, Exception) as e:
            print(f"Powershell WMI query for motherboard serial failed ({e}). Falling back to wmic.") # Replaced logging.warning

        # WMIC fallback
        result = subprocess.check_output("wmic baseboard get serialnumber", shell=True, text=True)
        serial = result.split('\n')[1].strip()
        return serial
    except Exception as e:
        print(f"Failed to get motherboard serial: {e}") # Replaced logging.error
        return f"Error getting motherboard serial: {e}"

def get_processor_id():
    try:
        # Using powershell for potentially more robust WMI queries on modern Windows
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
                print("Powershell returned empty processor ID. Falling back to wmic.") # Replaced logging.warning
        except (subprocess.CalledProcessError, FileNotFoundError, Exception) as e:
            print(f"Powershell WMI query for processor ID failed ({e}). Falling back to wmic.") # Replaced logging.warning

        # WMIC fallback
        result = subprocess.check_output("wmic cpu get processorId", shell=True, text=True)
        processor_id = result.split('\n')[1].strip()
        return processor_id
    except Exception as e:
        print(f"Failed to get processor ID: {e}") # Replaced logging.error
        return f"Error getting processor ID: {e}"

def generate_activation_key(processorId: str, motherboardSerial: str) -> str:
    """
    Generates an activation key similar to the provided JavaScript function.
    """
    input_string = f"{processorId}:{motherboardSerial}".upper()

    # SHA256 hash
    hash_object = hashlib.sha256()
    hash_object.update(input_string.encode('utf-8'))
    hex_hash = hash_object.hexdigest().upper()

    # Convert hex to BigInt (Python int) and then to Base36
    big_int_value = int(hex_hash, 16)
    
    # Custom Base36 conversion
    base36_chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    base36_result = ""
    while big_int_value > 0:
        big_int_value, remainder = divmod(big_int_value, 36)
        base36_result = base36_chars[remainder] + base36_result
    
    if not base36_result: # Handle case where hash is 0
        base36_result = "0"
        
    base36 = base36_result.upper()

    # Pad and slice to 16 characters
    raw_key = base36.zfill(16)[:16]

    # Format with hyphens
    formatted_key = "-".join([raw_key[i:i+4] for i in range(0, len(raw_key), 4)])

    return formatted_key

@app.get("/system-info")
async def get_system_info_endpoint():
    """
    Retrieves the motherboard serial number and processor ID of the system.
    Note: This uses Windows-specific `wmic` or `powershell` commands.
    """
    motherboard_serial = get_motherboard_serial()
    processor_id = get_processor_id()
    
    # Check if system info retrieval had an error before returning
    if "Error" in motherboard_serial or "Error" in processor_id:
        # If there's an error, raise an HTTP 500 so the frontend knows something went wrong.
        raise HTTPException(
            status_code=500,
            detail=f"Failed to retrieve complete system information. Motherboard: {motherboard_serial}, Processor: {processor_id}"
        )
    
    return {"motherboardSerial": motherboard_serial, "processorId": processor_id}


@app.post("/activate")
async def activate_system_endpoint(request: ActivationRequest):
    """
    Activates the system by comparing a generated activation key (based on system IDs)
    with the activation key provided by the user. If they match, the generated key
    is saved to a local file.
    """
    print(f"Activation request received for Motherboard: '{request.motherboardSerial}', Processor: '{request.processorId}'") # Replaced logging.info

    # Generate the activation key using the system's hardware IDs
    generated_key = generate_activation_key(request.processorId, request.motherboardSerial)
    print(f"Generated Activation Key: {generated_key}") # Replaced logging.info

    # Compare the generated key directly with the provided activation key
    if generated_key == request.activationKey.upper(): # Ensure case-insensitive comparison
        try:
            # Ensure the directory exists before writing the file
            os.makedirs(os.path.dirname(ACTIVATION_FILE), exist_ok=True)
            with open(ACTIVATION_FILE, "w") as f:
                f.write(generated_key)
            print(f"Activation successful. Key saved to {ACTIVATION_FILE}") # Replaced logging.info
            return {"success": True, "message": "Activation successful!"}
        except IOError as e:
            # Specific error for file writing issues
            print(f"IOError saving activation file {ACTIVATION_FILE}: {e}") # Replaced logging.error
            raise HTTPException(status_code=500, detail=f"Failed to save activation data due to file system error: {e}")
        except Exception as e:
            # General catch-all for other unexpected errors during file saving
            print(f"Unexpected error saving activation file {ACTIVATION_FILE}: {e}") # Replaced logging.error
            raise HTTPException(status_code=500, detail=f"An unexpected error occurred while saving activation data: {e}")
    else:
        print(f"Activation failed: Provided key '{request.activationKey}' does not match generated key '{generated_key}'.") # Replaced logging.warning
        return {"success": False, "message": "Activation failed: Invalid key."}

@app.get("/check-activation")
async def check_activation_endpoint():
    """
    Checks the activation status of the system.
    It retrieves system hardware IDs, generates an activation key,
    and compares it with the key stored in the activation file.
    """
    motherboard_serial = get_motherboard_serial()
    processor_id = get_processor_id()

    # If system info cannot be retrieved, treat as not activated and clean up any old file
    if "Error" in motherboard_serial or "Error" in processor_id:
        error_message = f"Failed to retrieve system information for activation check. Motherboard: {motherboard_serial}, Processor: {processor_id}"
        print(error_message) # Replaced logging.error
        if os.path.exists(ACTIVATION_FILE):
            try:
                os.remove(ACTIVATION_FILE)
                print(f"Deleted invalid {ACTIVATION_FILE} due to system info retrieval error.") # Replaced logging.info
            except OSError as e:
                print(f"Error deleting activation file {ACTIVATION_FILE} during cleanup: {e}") # Replaced logging.error
        return {"isActivated": False, "message": error_message}

    generated_key = generate_activation_key(processor_id, motherboard_serial)
    print(f"Check Activation: Generated Key: {generated_key}") # Replaced logging.info

    is_activated = False
    stored_key = None
    try:
        if os.path.exists(ACTIVATION_FILE):
            try:
                with open(ACTIVATION_FILE, "r") as f:
                    stored_key = f.read().strip()
                print(f"Check Activation: Stored Key: {stored_key}") # Replaced logging.info

                if generated_key == stored_key:
                    is_activated = True
                    print("Check Activation: System is activated.") # Replaced logging.info
                else:
                    print("Check Activation: Generated key does not match stored key. Deleting activation file.") # Replaced logging.warning
                    try:
                        os.remove(ACTIVATION_FILE)
                        print(f"Deleted invalid {ACTIVATION_FILE}.") # Replaced logging.info
                    except OSError as e:
                        print(f"Error deleting activation file {ACTIVATION_FILE} during mismatch: {e}") # Replaced logging.error
            except IOError as e:
                print(f"IOError reading activation file {ACTIVATION_FILE}: {e}") # Replaced logging.error
                # If cannot read, assume not activated and clean up to prevent future issues
                if os.path.exists(ACTIVATION_FILE):
                    try:
                        os.remove(ACTIVATION_FILE)
                        print(f"Deleted unreadable {ACTIVATION_FILE}.") # Replaced logging.info
                    except OSError as e_del:
                        print(f"Error deleting unreadable activation file {ACTIVATION_FILE}: {e_del}") # Replaced logging.error
                is_activated = False
        else:
            print("Check Activation: Activation file not found.") # Replaced logging.info

    except Exception as e:
        print(f"Unhandled error during activation check: {e}") # Replaced logging.error, removed exc_info=True
        # If any error occurs during file reading/comparison, assume not activated and clean up
        if os.path.exists(ACTIVATION_FILE):
            try:
                os.remove(ACTIVATION_FILE)
                print(f"Deleted invalid {ACTIVATION_FILE} due to error during check.") # Replaced logging.info
            except OSError as e_del:
                print(f"Error deleting activation file {ACTIVATION_FILE} during general error cleanup: {e_del}") # Replaced logging.error
        is_activated = False
    
    return {"isActivated": is_activated, "message": "System is activated." if is_activated else "System is not activated."}


@app.post("/preview-csv")
async def preview_csv_endpoint(
    csv_file: UploadFile = File(..., description="CSV file to preview")
):
    """
    Preview the uploaded CSV file and return column names and first few rows.
    """
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
        print(f"Unexpected error in /preview-csv: {e}") # Replaced logging.error, removed exc_info=True
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")
    finally:
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except OSError as e:
                print(f"Error cleaning up temp directory {temp_dir}: {e}") # Replaced logging.error


@app.post("/send-emails") # Renamed endpoint for clarity
async def send_emails_endpoint(
    subject: str = Form(..., description="Email subject template"),
    message: str = Form(..., description="Email body template (HTML or plain text) with variables like {name}"),
    csv_file: UploadFile = File(..., description="CSV with contact data"),
    variables: str = Form(..., description="JSON list of variable names used in template"),
    media_file: UploadFile = File(None, description="Optional media file to attach to all emails."),
    sender_email: str = Form(..., description="Sender's email address"),
    sender_password: str = Form(..., description="Sender's email password or app password"),
    smtp_server: str = Form(..., description="SMTP server address (e.g., smtp.gmail.com)"),
    smtp_port: int = Form(587, description="SMTP server port (e.g., 587 for TLS, 465 for SSL)"),
    html_content: bool = Form(False, description="True if the message is HTML, False for plain text"),
    bcc_mode: bool = Form(False, description="True to send emails as BCC, False for TO")
):
    try:
        variable_list = json.loads(variables)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid variables format. Must be a JSON array.")

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

        # Check if required variables exist in CSV columns
        missing_vars = [var for var in variable_list if var not in df.columns]
        if missing_vars:
            raise HTTPException(
                status_code=422,
                detail=f"Variables not found in CSV: {', '.join(missing_vars)}"
            )

        # Ensure we have an 'email' column
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

        # You would need to have an 'email_sender.py' file in the same directory
        # containing the 'send_emails_from_dataframe_enhanced' function.
        # For the purpose of this merge, this import is kept as is.
        from email_sender import send_emails_from_dataframe_enhanced

        send_results = send_emails_from_dataframe_enhanced(
            df=df,
            subject_template=subject,
            message_template=message,
            variables=variable_list,
            media_path=media_path,
            sender_email=sender_email,
            sender_password=sender_password,
            smtp_server=smtp_server,
            smtp_port=smtp_port,
            html_content=html_content,
            bcc_mode=bcc_mode
        )
        print(f"Email campaign completed: {len(send_results['successful_emails'])} successful, {len(send_results['failed_emails'])} failed.")
        return JSONResponse({
            "status": "success",
            "detail": f"Email campaign initiated. {len(send_results['successful_emails'])} emails successfully sent, {len(send_results['failed_emails'])} failed.",
            "successful_emails": send_results['successful_emails'],
            "failed_emails": send_results['failed_emails']
        })

    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error in /send-emails: {e}") # Replaced logging.error, removed exc_info=True
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {e}")
    finally:
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except OSError as e:
                print(f"Error cleaning up temp directory {temp_dir}: {e}") # Replaced logging.error

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Email Campaign API is running"}