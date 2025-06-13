import pandas as pd
import smtplib
import os
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
from typing import List, Optional, Dict
import time
import random

import sys
import appdirs
import logging
from logging.handlers import RotatingFileHandler

APP_AUTHOR = "YourCompany"
APP_NAME = "CampaignFlow"

LOG_FILE_PATH = os.path.join(appdirs.user_data_dir(APP_NAME, APP_AUTHOR), "app.log")
os.makedirs(os.path.dirname(LOG_FILE_PATH), exist_ok=True)

logger = logging.getLogger(__name__)
logger.setLevel(logging.INFO)

file_handler = RotatingFileHandler(LOG_FILE_PATH, maxBytes=1024*1024*5, backupCount=5, encoding='utf-8')
file_handler.setLevel(logging.INFO)

formatter = logging.Formatter('%(asctime)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
logger.addHandler(file_handler)

console_handler = logging.StreamHandler(sys.stdout)
console_handler.setLevel(logging.INFO)
try:
    if sys.stdout.encoding and sys.stdout.encoding.lower() != 'utf-8':
        console_handler.setFormatter(formatter)
    else:
        console_handler.setFormatter(formatter)
except Exception:
    console_handler.setFormatter(formatter)

logger.addHandler(console_handler)

def safe_print(message):
    logger.info(message)
# -----------------------------------------------------------------------------------

DELAY_BETWEEN_EMAILS = (5, 15) # Delay between sending each email

def replace_variables_in_message(template: str, row_data: dict, variables: List[str]) -> str:
    """
    Replace variables in message/subject template with actual data from CSV row.
    """
    personalized_text = template
    for variable in variables:
        placeholder = f"{{{variable}}}"
        if variable in row_data and pd.notna(row_data[variable]):
            value = str(row_data[variable])
        else:
            value = "" # Replace with empty string if variable is not found or is NaN
        personalized_text = personalized_text.replace(placeholder, value)
    return personalized_text

def send_single_email(
    sender_email: str,
    sender_password: str,
    receiver_email: str,
    subject: str,
    body: str,
    smtp_server: str,
    smtp_port: int,
    html_content: bool, # New parameter
    bcc_mode: bool,     # New parameter
    attachment_path: Optional[str] = None
) -> bool:
    """
    Sends a single email with optional attachment, supporting HTML and BCC.
    Returns True on success, False on failure.
    """
    msg = MIMEMultipart()
    msg['From'] = sender_email
    msg['Subject'] = subject

    if bcc_mode:
        msg['Bcc'] = receiver_email
    else:
        msg['To'] = receiver_email

    # Attach the message body (plain or HTML)
    if html_content:
        msg.attach(MIMEText(body, 'html', 'utf-8')) # Specify 'html' subtype and utf-8 encoding
    else:
        msg.attach(MIMEText(body, 'plain', 'utf-8')) # Specify 'plain' subtype and utf-8 encoding

    if attachment_path and os.path.exists(attachment_path):
        try:
            filename = os.path.basename(attachment_path)
            with open(attachment_path, "rb") as attachment:
                part = MIMEBase("application", "octet-stream")
                part.set_payload(attachment.read())
            encoders.encode_base64(part)
            part.add_header(
                "Content-Disposition",
                f"attachment; filename= {filename}",
            )
            msg.attach(part)
            safe_print(f"📎 Attached file: {filename}")
        except Exception as e:
            safe_print(f"❌ Error attaching file {attachment_path}: {e}")

    try:
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            
            # Use send_message which correctly handles To/Cc/Bcc headers
            # The 'send_message' method sends to all recipients in 'To', 'Cc', 'Bcc' headers.
            # If bcc_mode is true, the 'To' header will be empty, and the recipient will be in 'Bcc'.
            server.send_message(msg)
            
        send_type = "BCC" if bcc_mode else "TO"
        safe_print(f"✅ Email sent ({send_type}) to {receiver_email} with subject: '{subject}'")
        return True
    except smtplib.SMTPAuthenticationError:
        safe_print(f"❌ Authentication failed for {sender_email}. Check password/app password and SMTP settings. For Gmail/Outlook, use an App Password.")
        return False
    except smtplib.SMTPConnectError as e:
        safe_print(f"❌ Could not connect to SMTP server {smtp_server}:{smtp_port}. Error: {e}")
        safe_print("Please check your SMTP server address and port, and ensure your network allows outgoing connections on this port.")
        return False
    except Exception as e:
        safe_print(f"❌ Error sending email to {receiver_email}: {e}")
        return False

def send_emails_from_dataframe_enhanced(
    df: pd.DataFrame,
    subject_template: str,
    message_template: str,
    variables: List[str],
    sender_email: str,
    sender_password: str,
    smtp_server: str,
    smtp_port: int,
    html_content: bool, # New parameter
    bcc_mode: bool,     # New parameter
    media_path: Optional[str] = None
) -> Dict[str, int]: # Returns a dictionary with send results
    """
    Send personalized emails using dynamic variables from CSV.
    """
    successful_sends = 0
    failed_sends = 0

    safe_print(f"📧 Starting email campaign from {sender_email} (HTML: {html_content}, BCC: {bcc_mode})...")

    for index, row in df.iterrows():
        receiver_email = str(row.get("email", "")).strip()

        if not receiver_email:
            safe_print(f"⚠️ Skipping row {index+1}: 'email' column is empty or missing.")
            failed_sends += 1
            continue

        if "@" not in receiver_email or "." not in receiver_email.split("@")[-1]:
            safe_print(f"⚠️ Skipping invalid email address: '{receiver_email}' (row {index+1})")
            failed_sends += 1
            continue

        row_dict = row.to_dict()

        personalized_subject = replace_variables_in_message(subject_template, row_dict, variables)
        personalized_message = replace_variables_in_message(message_template, row_dict, variables)

        safe_print(f"Sending email to {receiver_email}...")

        success = send_single_email(
            sender_email=sender_email,
            sender_password=sender_password,
            receiver_email=receiver_email,
            subject=personalized_subject,
            body=personalized_message,
            smtp_server=smtp_server,
            smtp_port=smtp_port,
            html_content=html_content,
            bcc_mode=bcc_mode,
            attachment_path=media_path
        )

        if success:
            successful_sends += 1
        else:
            failed_sends += 1

        sleep_time = random.randint(*DELAY_BETWEEN_EMAILS)
        safe_print(f"⏱️ Sleeping {sleep_time}s before next email...\n")
        time.sleep(sleep_time)

    safe_print("🎉 Email campaign finished!")
    safe_print(f"Summary: {successful_sends} emails sent successfully, {failed_sends} failed.")
    return {"successful_sends": successful_sends, "failed_sends": failed_sends}