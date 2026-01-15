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


    async def send_welcome_email(
        self,
        to_email: str,
        user_name: str,
        temp_password: str,
        login_url: str = None
    ):
        """Send welcome email with temporary password to new user."""
        login_url = login_url or f"{settings.frontend_url}/login"
        subject = "[EduResearch] Welcome - Your Account Has Been Created"
        body = f"""
Hello {user_name},

Your EduResearch Project Manager account has been created.

Your login credentials:
Email: {to_email}
Temporary Password: {temp_password}

Please log in and change your password on first login, or connect your Google/Microsoft account for easier access.

Login here: {login_url}

Best regards,
EduResearch Project Manager
        """
        html_body = f"""
<html>
<body>
<h2>Welcome to EduResearch Project Manager!</h2>
<p>Hello {user_name},</p>
<p>Your account has been created.</p>
<h3>Your Login Credentials:</h3>
<p><strong>Email:</strong> {to_email}</p>
<p><strong>Temporary Password:</strong> <code style="background: #f0f0f0; padding: 2px 6px; border-radius: 3px;">{temp_password}</code></p>
<p>Please log in and change your password on first login, or connect your Google/Microsoft account for easier access.</p>
<p><a href="{login_url}" style="display: inline-block; background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Log In Now</a></p>
<hr>
<p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
</body>
</html>
        """
        return await self.send_email(to_email, subject, body, html_body)

    def _render_template(self, template: str, context: dict) -> str:
        """Replace {{variable}} placeholders with values from context."""
        result = template
        for key, value in context.items():
            placeholder = f"{{{{{key}}}}}"
            result = result.replace(placeholder, str(value) if value else "")
        return result

    async def send_templated_email(
        self,
        to_email: str,
        subject_template: str,
        body_template: str,
        context: dict
    ) -> bool:
        """Send email using templates with variable substitution."""
        subject = self._render_template(subject_template, context)
        html_body = self._render_template(body_template, context)
        # Create plain text version by stripping HTML
        import re
        plain_body = re.sub('<[^<]+?>', '', html_body)
        plain_body = plain_body.replace('&nbsp;', ' ').strip()

        return await self.send_email(to_email, subject, plain_body, html_body)

    async def send_user_approval_request(
        self,
        admin_email: str,
        user_name: str,
        user_email: str,
        institution_name: str = None,
        department_name: str = None
    ):
        """Send email to admin when a new user requires approval."""
        approval_link = f"{settings.frontend_url}/admin/pending-users"
        subject = f"[EduResearch] New User Registration Requires Approval - {user_name}"
        body = f"""
Hello,

A new user has registered and requires your approval:

Name: {user_name}
Email: {user_email}
Institution: {institution_name or 'Not specified'}
Department: {department_name or 'Not specified'}

Please log in to approve or reject this registration:
{approval_link}

Best regards,
EduResearch Project Manager
        """
        html_body = f"""
<html>
<body>
<h2>New User Registration</h2>
<p>A new user has registered and requires your approval:</p>
<ul>
    <li><strong>Name:</strong> {user_name}</li>
    <li><strong>Email:</strong> {user_email}</li>
    <li><strong>Institution:</strong> {institution_name or 'Not specified'}</li>
    <li><strong>Department:</strong> {department_name or 'Not specified'}</li>
</ul>
<p><a href="{approval_link}" style="display: inline-block; background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Request</a></p>
<hr>
<p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
</body>
</html>
        """
        return await self.send_email(admin_email, subject, body, html_body)

    async def send_task_assignment(
        self,
        to_email: str,
        task_title: str,
        task_description: str = None,
        project_name: str = None,
        priority: str = None,
        due_date: str = None,
        assigned_by: str = None
    ):
        """Send email when a task is assigned to a user."""
        task_link = f"{settings.frontend_url}/tasks"
        subject = f"[EduResearch] Task Assigned: {task_title}"
        body = f"""
Hello,

You have been assigned a new task{f" by {assigned_by}" if assigned_by else ""}:

Task: {task_title}
{f"Project: {project_name}" if project_name else ""}
{f"Priority: {priority}" if priority else ""}
{f"Due Date: {due_date}" if due_date else ""}

{f"Description: {task_description}" if task_description else ""}

View your tasks: {task_link}

Best regards,
EduResearch Project Manager
        """
        html_body = f"""
<html>
<body>
<h2>New Task Assignment</h2>
<p>You have been assigned a new task{f" by <strong>{assigned_by}</strong>" if assigned_by else ""}:</p>
<ul>
    <li><strong>Task:</strong> {task_title}</li>
    {f"<li><strong>Project:</strong> {project_name}</li>" if project_name else ""}
    {f"<li><strong>Priority:</strong> {priority}</li>" if priority else ""}
    {f"<li><strong>Due Date:</strong> {due_date}</li>" if due_date else ""}
</ul>
{f"<p><strong>Description:</strong></p><p>{task_description}</p>" if task_description else ""}
<p><a href="{task_link}" style="display: inline-block; background: #3B82F6; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Task</a></p>
<hr>
<p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
</body>
</html>
        """
        return await self.send_email(to_email, subject, body, html_body)

    async def send_keyword_alert(
        self,
        to_email: str,
        user_name: str,
        projects: List[dict],
        frequency: str
    ):
        """Send keyword match alert email with new matching projects.

        Args:
            to_email: Recipient email
            user_name: User's display name
            projects: List of dicts with 'project' and 'matched_keywords' keys
            frequency: Alert frequency (daily/weekly/monthly) for display
        """
        frequency_label = {
            "daily": "Daily",
            "weekly": "Weekly",
            "monthly": "Monthly"
        }.get(frequency, frequency.capitalize())

        subject = f"[EduResearch] {frequency_label} Digest: New Projects Matching Your Interests"

        # Build project list for email
        project_list_text = ""
        project_list_html = ""

        for item in projects:
            p = item["project"]
            matched = item.get("matched_keywords", [])
            keywords_str = ", ".join(matched) if matched else "your keywords"

            # Plain text version
            project_list_text += f"\n- {p.title}"
            if p.description:
                desc_preview = p.description[:100] + "..." if len(p.description) > 100 else p.description
                project_list_text += f"\n  {desc_preview}"
            project_list_text += f"\n  Matched: {keywords_str}\n"

            # HTML version
            project_list_html += f"""
            <div style="border: 1px solid #e5e7eb; padding: 16px; margin-bottom: 16px; border-radius: 8px;">
                <h3 style="margin: 0 0 8px 0; color: #1f2937;">{p.title}</h3>
                <p style="color: #6b7280; margin: 8px 0; font-size: 14px;">
                    {(p.description[:150] + '...') if p.description and len(p.description) > 150 else (p.description or 'No description')}
                </p>
                <p style="font-size: 12px; color: #9ca3af; margin: 8px 0;">
                    <strong>Matched keywords:</strong> {keywords_str}
                </p>
                <a href="{settings.frontend_url}/projects/{p.id}"
                   style="display: inline-block; background: #3B82F6; color: white; padding: 8px 16px;
                          text-decoration: none; border-radius: 4px; font-size: 14px;">
                    View Project
                </a>
            </div>
            """

        body = f"""
Hello {user_name},

Here are new projects matching your interests ({frequency_label.lower()} digest):
{project_list_text}

View all matching projects: {settings.frontend_url}/projects

To manage your keyword preferences, visit: {settings.frontend_url}/settings

Best regards,
EduResearch Project Manager
        """

        html_body = f"""
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1f2937; margin-bottom: 24px;">New Projects Matching Your Interests</h2>
    <p style="color: #4b5563; margin-bottom: 20px;">
        Hello {user_name},<br><br>
        Here are new projects that match your keyword preferences ({frequency_label.lower()} digest):
    </p>

    {project_list_html}

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
        <p style="color: #6b7280; font-size: 14px;">
            <a href="{settings.frontend_url}/projects" style="color: #3B82F6;">View all matching projects</a> |
            <a href="{settings.frontend_url}/settings" style="color: #3B82F6;">Manage keyword preferences</a>
        </p>
    </div>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px;">EduResearch Project Manager</p>
</body>
</html>
        """

        return await self.send_email(to_email, subject, body, html_body)

    async def send_meeting_reminder(
        self,
        to_emails: List[str],
        project_title: str,
        meeting_date: str,
        days_until: int,
        project_id: int
    ):
        """Send meeting reminder email to all project members.

        Args:
            to_emails: List of member email addresses
            project_title: Name of the project
            meeting_date: Formatted meeting date string
            days_until: Number of days until meeting
            project_id: Project ID for linking
        """
        days_text = "tomorrow" if days_until == 1 else f"in {days_until} days"
        subject = f"[EduResearch] Meeting Reminder: {project_title} - {days_text}"

        body = f"""
Hello,

This is a reminder that the project "{project_title}" has a meeting scheduled {days_text}.

Meeting Date: {meeting_date}

Please make sure to prepare for the meeting and review any relevant materials.

View project details: {settings.frontend_url}/projects/{project_id}

Best regards,
EduResearch Project Manager
        """

        html_body = f"""
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #1f2937;">Meeting Reminder</h2>
    <p>This is a reminder that the project <strong>{project_title}</strong> has a meeting scheduled <strong>{days_text}</strong>.</p>

    <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 20px 0;">
        <p style="margin: 0;"><strong>Meeting Date:</strong> {meeting_date}</p>
    </div>

    <p>Please make sure to prepare for the meeting and review any relevant materials.</p>

    <p>
        <a href="{settings.frontend_url}/projects/{project_id}"
           style="display: inline-block; background: #3B82F6; color: white; padding: 10px 20px;
                  text-decoration: none; border-radius: 5px;">
            View Project
        </a>
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px;">EduResearch Project Manager</p>
</body>
</html>
        """

        for email in to_emails:
            await self.send_email(email, subject, body, html_body)

    async def send_deadline_reminder(
        self,
        to_emails: List[str],
        project_title: str,
        deadline_date: str,
        days_until: int,
        project_id: int
    ):
        """Send deadline reminder email to all project members.

        Args:
            to_emails: List of member email addresses
            project_title: Name of the project
            deadline_date: Formatted deadline date string
            days_until: Number of days until deadline
            project_id: Project ID for linking
        """
        urgency = "urgent" if days_until <= 3 else ""
        days_text = "tomorrow" if days_until == 1 else f"in {days_until} days"
        subject = f"[EduResearch] {'URGENT ' if urgency else ''}Deadline Reminder: {project_title} - {days_text}"

        body = f"""
Hello,

This is a reminder that the project "{project_title}" has a deadline approaching {days_text}.

Deadline: {deadline_date}

Please ensure all required work is completed before the deadline.

View project details: {settings.frontend_url}/projects/{project_id}

Best regards,
EduResearch Project Manager
        """

        urgency_color = "#DC2626" if urgency else "#F59E0B"
        html_body = f"""
<html>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: {urgency_color};">{'⚠️ ' if urgency else ''}Deadline Reminder</h2>
    <p>This is a reminder that the project <strong>{project_title}</strong> has a deadline approaching <strong>{days_text}</strong>.</p>

    <div style="background: {'#FEF2F2' if urgency else '#FFFBEB'}; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid {urgency_color};">
        <p style="margin: 0;"><strong>Deadline:</strong> {deadline_date}</p>
    </div>

    <p>Please ensure all required work is completed before the deadline.</p>

    <p>
        <a href="{settings.frontend_url}/projects/{project_id}"
           style="display: inline-block; background: #3B82F6; color: white; padding: 10px 20px;
                  text-decoration: none; border-radius: 5px;">
            View Project
        </a>
    </p>

    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
    <p style="color: #9ca3af; font-size: 12px;">EduResearch Project Manager</p>
</body>
</html>
        """

        for email in to_emails:
            await self.send_email(email, subject, body, html_body)


# Default email service instance (uses environment variables)
email_service = EmailService()


def get_email_service_from_db(db, institution_id: int = None) -> EmailService:
    """Get an EmailService configured with database settings.

    Args:
        db: Database session
        institution_id: Optional institution ID to get institution-specific settings

    Returns:
        EmailService configured with database settings, or default if none found
    """
    from app.models.email_settings import EmailSettings

    # Try institution-specific settings first
    if institution_id:
        settings = db.query(EmailSettings).filter(
            EmailSettings.institution_id == institution_id
        ).first()
        if settings and settings.smtp_user and settings.smtp_password:
            return EmailService(
                smtp_host=settings.smtp_host,
                smtp_port=settings.smtp_port,
                smtp_user=settings.smtp_user,
                smtp_password=settings.smtp_password,
                from_email=settings.from_email,
                from_name=settings.from_name
            )

    # Fall back to global settings
    global_settings = db.query(EmailSettings).filter(
        EmailSettings.institution_id.is_(None)
    ).first()

    if global_settings and global_settings.smtp_user and global_settings.smtp_password:
        return EmailService(
            smtp_host=global_settings.smtp_host,
            smtp_port=global_settings.smtp_port,
            smtp_user=global_settings.smtp_user,
            smtp_password=global_settings.smtp_password,
            from_email=global_settings.from_email,
            from_name=global_settings.from_name
        )

    # Fall back to default (environment variables)
    return email_service
