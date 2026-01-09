import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from typing import Optional, List
import logging
from app.config import settings

logger = logging.getLogger(__name__)


class EmailService:
    def __init__(
        self,
        smtp_host: str = None,
        smtp_port: int = None,
        smtp_user: str = None,
        smtp_password: str = None,
        from_email: str = None,
        from_name: str = None
    ):
        self.smtp_host = smtp_host or settings.smtp_host
        self.smtp_port = smtp_port or settings.smtp_port
        self.smtp_user = smtp_user or settings.smtp_user
        self.smtp_password = smtp_password or settings.smtp_password
        self.from_email = from_email or settings.from_email
        self.from_name = from_name or settings.from_name

    async def send_email(
        self,
        to_email: str,
        subject: str,
        body: str,
        html_body: Optional[str] = None,
        attachments: Optional[List[tuple]] = None  # List of (filename, content, content_type)
    ) -> bool:
        if not self.smtp_user or not self.smtp_password:
            logger.warning("Email not configured, skipping send")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = f"{self.from_name} <{self.from_email or self.smtp_user}>"
            msg["To"] = to_email

            # Add plain text body
            msg.attach(MIMEText(body, "plain"))

            # Add HTML body if provided
            if html_body:
                msg.attach(MIMEText(html_body, "html"))

            # Add attachments if provided
            if attachments:
                for filename, content, content_type in attachments:
                    part = MIMEBase("application", "octet-stream")
                    part.set_payload(content)
                    encoders.encode_base64(part)
                    part.add_header(
                        "Content-Disposition",
                        f"attachment; filename={filename}"
                    )
                    msg.attach(part)

            await aiosmtplib.send(
                msg,
                hostname=self.smtp_host,
                port=self.smtp_port,
                username=self.smtp_user,
                password=self.smtp_password,
                start_tls=True
            )

            logger.info(f"Email sent successfully to {to_email}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False

    async def send_project_update_notification(
        self,
        to_emails: List[str],
        project_title: str,
        update_summary: str,
        updated_by: str
    ):
        subject = f"[EduResearch] Project Update: {project_title}"
        body = f"""
Hello,

The project "{project_title}" has been updated by {updated_by}.

Update Summary:
{update_summary}

Log in to view the full details.

Best regards,
EduResearch Project Manager
        """
        html_body = f"""
<html>
<body>
<h2>Project Update: {project_title}</h2>
<p>The project has been updated by <strong>{updated_by}</strong>.</p>
<h3>Update Summary:</h3>
<p>{update_summary}</p>
<p><a href="{settings.frontend_url}/projects">View Project</a></p>
<hr>
<p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
</body>
</html>
        """

        for email in to_emails:
            await self.send_email(email, subject, body, html_body)

    async def send_join_request_notification(
        self,
        to_email: str,
        project_title: str,
        requester_name: str,
        requester_email: str,
        message: Optional[str] = None
    ):
        subject = f"[EduResearch] Join Request: {project_title}"
        body = f"""
Hello,

{requester_name} ({requester_email}) has requested to join your project "{project_title}".

{"Message: " + message if message else ""}

Log in to review and respond to this request.

Best regards,
EduResearch Project Manager
        """
        html_body = f"""
<html>
<body>
<h2>New Join Request</h2>
<p><strong>{requester_name}</strong> ({requester_email}) has requested to join your project <strong>{project_title}</strong>.</p>
{"<p><strong>Message:</strong> " + message + "</p>" if message else ""}
<p><a href="{settings.frontend_url}/join-requests">Review Request</a></p>
<hr>
<p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
</body>
</html>
        """
        await self.send_email(to_email, subject, body, html_body)

    async def send_join_request_response(
        self,
        to_email: str,
        project_title: str,
        approved: bool
    ):
        status = "approved" if approved else "rejected"
        subject = f"[EduResearch] Join Request {status.capitalize()}: {project_title}"
        body = f"""
Hello,

Your request to join the project "{project_title}" has been {status}.

{"You can now access the project." if approved else ""}

Best regards,
EduResearch Project Manager
        """
        html_body = f"""
<html>
<body>
<h2>Join Request {status.capitalize()}</h2>
<p>Your request to join the project <strong>{project_title}</strong> has been <strong>{status}</strong>.</p>
{"<p>You can now access the project.</p>" if approved else ""}
<p><a href="{settings.frontend_url}/projects">View Projects</a></p>
<hr>
<p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
</body>
</html>
        """
        await self.send_email(to_email, subject, body, html_body)

    async def send_file_upload_notification(
        self,
        to_email: str,
        project_title: str,
        uploader_name: str,
        filename: str,
        file_content: bytes = None
    ):
        subject = f"[EduResearch] New File Uploaded: {project_title}"
        body = f"""
Hello,

{uploader_name} has uploaded a new file to your project "{project_title}".

File: {filename}

{"The file is attached to this email." if file_content else "Log in to download the file."}

Best regards,
EduResearch Project Manager
        """
        html_body = f"""
<html>
<body>
<h2>New File Uploaded</h2>
<p><strong>{uploader_name}</strong> has uploaded a new file to your project <strong>{project_title}</strong>.</p>
<p><strong>File:</strong> {filename}</p>
{"<p>The file is attached to this email.</p>" if file_content else "<p>Log in to download the file.</p>"}
<p><a href="{settings.frontend_url}/projects">View Project</a></p>
<hr>
<p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
</body>
</html>
        """

        attachments = None
        if file_content:
            attachments = [(filename, file_content, "application/octet-stream")]

        await self.send_email(to_email, subject, body, html_body, attachments)


# Default email service instance
email_service = EmailService()
