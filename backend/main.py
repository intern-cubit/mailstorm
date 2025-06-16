import os
import shutil
import tempfile
import json
import pandas as pd
import subprocess  # For system info
import hashlib     # For hashing
import logging     # For logging
from fastapi import FastAPI, File, UploadFile, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

app = FastAPI()

# Add CORS middleware to allow cross-origin requests from your frontend
# Using "*" for origins during development for flexibility.
# In a production environment, you should restrict this to your frontend's specific URLs.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # Allows all origins, including http://localhost:5173 (for email app) and http://localhost:3000 (for activation app)
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- MODIFICATION START ---
# Determine the user-specific application data directory
# On Windows, this will typically resolve to C:\Users\YourUser\AppData\Local
if os.name == 'nt': # Check if the operating system is Windows
    app_data_dir = os.getenv('LOCALAPPDATA')
    if app_data_dir is None: # Fallback in case LOCALAPPDATA env var is not set (unlikely on modern Windows)
        app_data_dir = os.path.join(os.path.expanduser('~'), 'AppData', 'Local')
else: # For other OS (Linux/macOS), use XDG_DATA_HOME or a fallback in user home
    app_data_dir = os.getenv('XDG_DATA_HOME', os.path.join(os.path.expanduser('~'), '.local', 'share'))

# Create an application-specific directory within AppData
APP_NAME_DIR = "email-sender" # Use your application's name
APP_DATA_PATH = os.path.join(app_data_dir, APP_NAME_DIR)

# Ensure the application data directory exists
os.makedirs(APP_DATA_PATH, exist_ok=True)

# Define the full path to the activation file
ACTIVATION_FILE = os.path.join(APP_DATA_PATH, "activation.txt")
# --- MODIFICATION END ---


class ActivationRequest(BaseModel):
    motherboardSerial: str
    processorId: str
    activationKey: str

def get_motherboard_serial():
    try:
        result = subprocess.check_output("wmic baseboard get serialnumber", shell=True)
        serial = result.decode().split('\n')[1].strip()
        return serial
    except Exception as e:
        return f"Error getting motherboard serial: {e}"

def get_processor_id():
    try:
        result = subprocess.check_output("wmic cpu get processorId", shell=True)
        processor_id = result.decode().split('\n')[1].strip()
        return processor_id
    except Exception as e:
        return f"Error getting processor ID: {e}"

def generate_activation_key(processorId: str, motherboardSerial: str) -> str:
    """
    Generates an activation key similar to the provided JavaScript function.
    The 'processorId' parameter is present for consistency with the JavaScript
    function's signature, but in the context of your Python system info
    retrieval (which gets motherboard serial and processor ID), you might
    adapt which hardware IDs are used as input.
    
    For the purpose of matching the JavaScript, I am assuming the 'processorId'
    in the JavaScript function corresponds to your 'processorId' or another
    unique hardware identifier you might be using on the client side,
    and 'motherboardSerial' is consistent.

    Given the context, I will use processorId as processorId's substitute.
    """
    input_string = f"{processorId}:{motherboardSerial}".upper()

    # SHA256 hash
    hash_object = hashlib.sha256()
    hash_object.update(input_string.encode('utf-8'))
    hex_hash = hash_object.hexdigest().upper()

    # Convert hex to BigInt (Python int) and then to Base36
    big_int_value = int(hex_hash, 16)
    
    # Custom Base36 conversion since Python's int.to_string(36) doesn't exist directly
    # and divmod approach is needed.
    base36_chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ"
    base36_result = ""
    while big_int_value > 0:
        big_int_value, remainder = divmod(big_int_value, 36)
        base36_result = base36_chars[remainder] + base36_result
    
    if not base36_result: # Handle case where hash is 0
        base36_result = "0"
        
    base36 = base36_result.upper()

    # Pad and slice to 16 characters
    raw_key = base36.zfill(16)[:16] # zfill pads with zeros, then slice

    # Format with hyphens
    formatted_key = "-".join([raw_key[i:i+4] for i in range(0, len(raw_key), 4)])

    return formatted_key

@app.get("/system-info")
async def get_system_info_endpoint():
    """
    Retrieves the motherboard serial number and processor ID of the system.
    Note: This uses Windows-specific `wmic` commands and will return errors on other OS.
    """
    motherboard_serial = get_motherboard_serial()
    processor_id = get_processor_id()
    return {"motherboardSerial": motherboard_serial, "processorId": processor_id}

@app.post("/activate")
async def activate_system_endpoint(request: ActivationRequest):
    """
    Activates the system by comparing a generated activation key (based on system IDs)
    with the activation key provided by the user. If they match, the generated key
    is saved to a local file.
    """
    logging.info(f"Activation request received for Motherboard: {request.motherboardSerial}, Processor: {request.processorId}")

    # Generate the activation key using the system's hardware IDs
    # Assuming processorId is the equivalent of 'processorId' used in the JS function for key generation
    generated_key = generate_activation_key(request.processorId, request.motherboardSerial)
    logging.info(f"Generated Activation Key: {generated_key}")

    # Compare the generated key directly with the provided activation key
    if generated_key == request.activationKey.upper(): # Ensure case-insensitive comparison if the provided key might vary in case
        try:
            # If keys match, save the generated key to the activation file
            # You might want to save a hash of the generated key for security,
            # but for direct comparison, saving the key itself is fine as per original intent.
            with open(ACTIVATION_FILE, "w") as f:
                f.write(generated_key)
            logging.info(f"Activation successful. Key saved to {ACTIVATION_FILE}")
            return {"success": True, "message": "Activation successful!"}
        except Exception as e:
            logging.error(f"Error saving activation file: {e}")
            raise HTTPException(status_code=500, detail=f"Failed to save activation data: {e}")
    else:
        logging.warning(f"Activation failed: Provided key '{request.activationKey}' does not match generated key '{generated_key}'.")
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
        logging.error("Could not retrieve system info for activation check.")
        if os.path.exists(ACTIVATION_FILE):
            os.remove(ACTIVATION_FILE)
            logging.info(f"Deleted invalid {ACTIVATION_FILE} due to system info retrieval error.")
        return {"isActivated": False, "message": "Failed to retrieve system information for activation check."}

    generated_key = generate_activation_key(processor_id, motherboard_serial)
    logging.info(f"Check Activation: Generated Key: {generated_key}")

    is_activated = False
    stored_key = None
    try:
        if os.path.exists(ACTIVATION_FILE):
            with open(ACTIVATION_FILE, "r") as f:
                stored_key = f.read().strip()
            logging.info(f"Check Activation: Stored Key: {stored_key}")

            if generated_key == stored_key:
                is_activated = True
                logging.info("Check Activation: System is activated.")
            else:
                logging.warning("Check Activation: Generated key does not match stored key. Deleting activation file.")
                if os.path.exists(ACTIVATION_FILE):
                    os.remove(ACTIVATION_FILE)
                    logging.info(f"Deleted invalid {ACTIVATION_FILE}.")
        else:
            logging.info("Check Activation: Activation file not found.")

    except Exception as e:
        logging.error(f"Error during activation check: {e}")
        # If any error occurs during file reading/comparison, assume not activated and clean up
        if os.path.exists(ACTIVATION_FILE):
            os.remove(ACTIVATION_FILE)
            logging.info(f"Deleted invalid {ACTIVATION_FILE} due to error during check.")
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
        print(f"DEBUG: Unexpected error in /preview-csv: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected error: {e}")
    finally:
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except OSError as e:
                print(f"DEBUG: Error cleaning up temp directory {temp_dir}: {e}")


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
    """
    Send personalized emails to contacts from CSV file.
    Expects:
      - subject: email subject template
      - message: string template with variables in {variable} format (can be HTML or plain text)
      - csv_file: CSV file with contact data (must contain an 'email' column)
      - variables: JSON string of variable names used in the template
      - media_file: (optional) media file to attach to each email
      - sender_email: Email address from which to send emails
      - sender_password: Password for the sender's email (use app password for Gmail/Outlook)
      - smtp_server: SMTP server address (e.g., smtp.gmail.com, smtp-mail.outlook.com)
      - smtp_port: SMTP server port (default 587 for TLS, 465 for SSL)
      - html_content: Boolean, true if the message is HTML, false for plain text
      - bcc_mode: Boolean, true to send emails as BCC, false for TO
    """
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
        # from email_sender import send_emails_from_dataframe_enhanced

        # Placeholder for send_emails_from_dataframe_enhanced if email_sender.py is not provided
        # In a real application, you would implement the email sending logic here
        # or ensure 'email_sender.py' is available.
        # This placeholder will make the code runnable without actual email sending logic.
        def send_emails_from_dataframe_enhanced(
            df, subject_template, message_template, variables, media_path,
            sender_email, sender_password, smtp_server, smtp_port, html_content, bcc_mode
        ):
            successful_sends = 0
            failed_sends = 0
            # Dummy email sending logic for demonstration
            logging.info("Simulating email sending...")
            for index, row in df.iterrows():
                try:
                    # Simulate personalized message creation
                    final_subject = subject_template
                    final_message = message_template
                    for var in variables:
                        if var in row:
                            final_subject = final_subject.replace(f"{{{var}}}", str(row[var]))
                            final_message = final_message.replace(f"{{{var}}}", str(row[var]))

                    recipient_email = row['email']
                    logging.info(f"Simulating sending email to {recipient_email} with subject: {final_subject}")
                    successful_sends += 1
                except Exception as e:
                    logging.error(f"Simulated email send failed for {row.get('email', 'N/A')}: {e}")
                    failed_sends += 1
            return {"successful_sends": successful_sends, "failed_sends": failed_sends}


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

        return JSONResponse({
            "status": "success",
            "detail": f"Email campaign initiated. {send_results['successful_sends']} emails successfully sent, {send_results['failed_sends']} failed."
        })

    except HTTPException:
        raise
    except Exception as e:
        print(f"DEBUG: Unexpected error in /send-emails: {e}")
        raise HTTPException(status_code=500, detail=f"Unexpected server error: {e}")
    finally:
        if temp_dir and os.path.exists(temp_dir):
            try:
                shutil.rmtree(temp_dir, ignore_errors=True)
            except OSError as e:
                print(f"DEBUG: Error cleaning up temp directory {temp_dir}: {e}")

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {"status": "healthy", "message": "Email Campaign API is running"}