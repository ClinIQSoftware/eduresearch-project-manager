"""Email service for EduResearch Project Manager.

Handles email sending operations using database-configured SMTP settings
and Jinja2 templates for email content rendering.
"""

import logging
import re
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path
from typing import List, Optional

from jinja2 import Environment, FileSystemLoader, select_autoescape
from sqlalchemy.orm import Session

from app.config import settings
from app.models.email_settings import EmailSettings
from app.models.join_request import JoinRequest
from app.models.task import Task
from app.models.user import User
from app.repositories import EmailSettingsRepository

logger = logging.getLogger(__name__)


class EmailService:
    """Service for email operations with template support."""

    def __init__(self, db: Session) -> None:
        """Initialize the EmailService.

        Args:
            db: SQLAlchemy database session.
        """
        self.db = db
        self.email_settings_repo = EmailSettingsRepository(db)

        # Set up Jinja2 template environment
        template_dir = Path(__file__).parent.parent / "templates" / "email"
        template_dir.mkdir(parents=True, exist_ok=True)

        self.jinja_env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
        )

    def _get_email_settings(
        self, institution_id: Optional[int] = None
    ) -> Optional[EmailSettings]:
        """Get email settings for an institution or global settings.

        Args:
            institution_id: Optional institution ID for institution-specific settings.

        Returns:
            EmailSettings if found and active, None otherwise.
        """
        # Try institution-specific settings first
        if institution_id:
            email_settings = self.email_settings_repo.get_for_institution(
                institution_id
            )
            if email_settings and email_settings.is_active:
                return email_settings

        # Fall back to global settings
        global_settings = self.email_settings_repo.get_global()
        if global_settings and global_settings.is_active:
            return global_settings

        return None

    def _render_template(self, template_name: str, context: dict) -> str:
        """Render a Jinja2 email template.

        Args:
            template_name: Name of the template file.
            context: Dictionary of variables to pass to the template.

        Returns:
            Rendered HTML string.
        """
        try:
            template = self.jinja_env.get_template(template_name)
            return template.render(**context)
        except Exception as e:
            logger.warning(f"Template {template_name} not found, using fallback: {e}")
            # Return a basic fallback if template doesn't exist
            return self._create_fallback_content(context)

    def _create_fallback_content(self, context: dict) -> str:
        """Create fallback HTML content when template is not available.

        Args:
            context: Dictionary of variables.

        Returns:
            Basic HTML string.
        """
        subject = context.get("subject", "Notification")
        message = context.get("message", "")
        return f"""
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>{subject}</h2>
            <p>{message}</p>
            <hr>
            <p style="color: #666; font-size: 12px;">
                EduResearch Project Manager
            </p>
        </body>
        </html>
        """

    def send_email(
        self,
        to: str,
        subject: str,
        html_content: str,
        institution_id: Optional[int] = None,
    ) -> bool:
        """Send an email using configured SMTP settings.

        Args:
            to: Recipient email address.
            subject: Email subject.
            html_content: HTML email body.
            institution_id: Optional institution ID for settings lookup.

        Returns:
            True if email was sent successfully, False otherwise.
        """
        email_settings = self._get_email_settings(institution_id)

        if not email_settings:
            logger.warning("No active email settings found, skipping email send")
            return False

        if not email_settings.smtp_user or not email_settings.smtp_password:
            logger.warning("SMTP credentials not configured, skipping email send")
            return False

        try:
            msg = MIMEMultipart("alternative")
            msg["Subject"] = subject
            msg["From"] = (
                f"{email_settings.from_name} "
                f"<{email_settings.from_email or email_settings.smtp_user}>"
            )
            msg["To"] = to

            # Create plain text version from HTML
            plain_text = re.sub("<[^<]+?>", "", html_content)
            plain_text = plain_text.replace("&nbsp;", " ").strip()

            msg.attach(MIMEText(plain_text, "plain"))
            msg.attach(MIMEText(html_content, "html"))

            with smtplib.SMTP(
                email_settings.smtp_host, email_settings.smtp_port
            ) as server:
                server.starttls()
                server.login(email_settings.smtp_user, email_settings.smtp_password)
                server.send_message(msg)

            logger.info(f"Email sent successfully to {to}")
            return True

        except Exception as e:
            logger.error(f"Failed to send email to {to}: {str(e)}")
            return False

    def send_welcome_email(
        self, user: User, temp_password: Optional[str] = None
    ) -> bool:
        """Send a welcome email to a new user.

        Args:
            user: The new user.
            temp_password: Optional temporary password to include.

        Returns:
            True if email was sent successfully.
        """
        context = {
            "user_name": user.name,
            "user_email": user.email,
            "temp_password": temp_password,
            "login_url": f"{settings.frontend_url}/login",
            "subject": "Welcome to EduResearch Project Manager",
        }

        html_content = self._render_template("welcome.html", context)
        if not html_content or "Template" in html_content:
            # Use fallback inline template
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>Welcome to EduResearch Project Manager!</h2>
                <p>Hello {user.name},</p>
                <p>Your account has been created.</p>
                {"<p><strong>Temporary Password:</strong> " + temp_password + "</p>" if temp_password else ""}
                <p>Please log in at: <a href="{settings.frontend_url}/login">{settings.frontend_url}/login</a></p>
                <hr>
                <p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
            </body>
            </html>
            """

        return self.send_email(
            to=user.email,
            subject="Welcome to EduResearch Project Manager",
            html_content=html_content,
            institution_id=user.institution_id,
        )

    def send_approval_request(self, user: User, admins: List[User]) -> bool:
        """Send approval request notification to admins.

        Args:
            user: The user requesting approval.
            admins: List of admin users to notify.

        Returns:
            True if at least one email was sent successfully.
        """
        context = {
            "user_name": user.name,
            "user_email": user.email,
            "approval_link": f"{settings.frontend_url}/admin/pending-users",
            "subject": f"New User Registration: {user.name}",
        }

        html_content = self._render_template("approval_request.html", context)
        if not html_content or "Template" in html_content:
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>New User Registration Requires Approval</h2>
                <p>A new user has registered and requires your approval:</p>
                <ul>
                    <li><strong>Name:</strong> {user.name}</li>
                    <li><strong>Email:</strong> {user.email}</li>
                </ul>
                <p><a href="{settings.frontend_url}/admin/pending-users">Review Request</a></p>
                <hr>
                <p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
            </body>
            </html>
            """

        sent_any = False
        for admin in admins:
            if self.send_email(
                to=admin.email,
                subject=f"New User Registration: {user.name}",
                html_content=html_content,
                institution_id=user.institution_id,
            ):
                sent_any = True

        return sent_any

    def send_approval_notification(self, user: User, approved: bool) -> bool:
        """Send notification to user about approval decision.

        Args:
            user: The user being notified.
            approved: Whether the user was approved or rejected.

        Returns:
            True if email was sent successfully.
        """
        status = "Approved" if approved else "Rejected"
        context = {
            "user_name": user.name,
            "approved": approved,
            "login_url": f"{settings.frontend_url}/login",
            "subject": f"Registration {status}",
        }

        html_content = self._render_template("approval_notification.html", context)
        if not html_content or "Template" in html_content:
            if approved:
                html_content = f"""
                <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Registration Approved</h2>
                    <p>Hello {user.name},</p>
                    <p>Your registration has been approved! You can now log in.</p>
                    <p><a href="{settings.frontend_url}/login">Log In</a></p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
                </body>
                </html>
                """
            else:
                html_content = f"""
                <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Registration Rejected</h2>
                    <p>Hello {user.name},</p>
                    <p>Unfortunately, your registration has been rejected.</p>
                    <p>Please contact an administrator for more information.</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
                </body>
                </html>
                """

        return self.send_email(
            to=user.email,
            subject=f"Registration {status}",
            html_content=html_content,
            institution_id=user.institution_id,
        )

    def send_join_request_notification(self, request: JoinRequest) -> bool:
        """Send notification to project lead about a new join request.

        Args:
            request: The join request (should have project and user loaded).

        Returns:
            True if email was sent successfully.
        """
        project = request.project
        requester = request.user

        if not project or not project.lead:
            logger.warning(
                "Cannot send join request notification: missing project or lead"
            )
            return False

        context = {
            "project_title": project.title,
            "requester_name": requester.name,
            "requester_email": requester.email,
            "message": request.message,
            "review_link": f"{settings.frontend_url}/projects/{project.id}",
            "subject": f"Join Request: {project.title}",
        }

        html_content = self._render_template("join_request.html", context)
        if not html_content or "Template" in html_content:
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>New Join Request</h2>
                <p><strong>{requester.name}</strong> has requested to join your project
                   <strong>{project.title}</strong>.</p>
                {"<p><strong>Message:</strong> " + request.message + "</p>" if request.message else ""}
                <p><a href="{settings.frontend_url}/projects/{project.id}">Review Request</a></p>
                <hr>
                <p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
            </body>
            </html>
            """

        return self.send_email(
            to=project.lead.email,
            subject=f"Join Request: {project.title}",
            html_content=html_content,
            institution_id=project.institution_id,
        )

    def send_join_response_notification(
        self, request: JoinRequest, approved: bool
    ) -> bool:
        """Send notification to user about join request decision.

        Args:
            request: The join request (should have project and user loaded).
            approved: Whether the request was approved or rejected.

        Returns:
            True if email was sent successfully.
        """
        project = request.project
        user = request.user

        status = "Approved" if approved else "Rejected"
        context = {
            "user_name": user.name,
            "project_title": project.title,
            "approved": approved,
            "project_link": f"{settings.frontend_url}/projects/{project.id}",
            "subject": f"Join Request {status}: {project.title}",
        }

        html_content = self._render_template("join_response.html", context)
        if not html_content or "Template" in html_content:
            if approved:
                html_content = f"""
                <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Join Request Approved</h2>
                    <p>Hello {user.name},</p>
                    <p>Your request to join <strong>{project.title}</strong> has been approved!</p>
                    <p><a href="{settings.frontend_url}/projects/{project.id}">View Project</a></p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
                </body>
                </html>
                """
            else:
                html_content = f"""
                <html>
                <body style="font-family: Arial, sans-serif; padding: 20px;">
                    <h2>Join Request Rejected</h2>
                    <p>Hello {user.name},</p>
                    <p>Your request to join <strong>{project.title}</strong> has been rejected.</p>
                    <hr>
                    <p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
                </body>
                </html>
                """

        return self.send_email(
            to=user.email,
            subject=f"Join Request {status}: {project.title}",
            html_content=html_content,
            institution_id=project.institution_id,
        )

    def send_task_assigned_notification(self, task: Task, assigned_to: User) -> bool:
        """Send notification when a task is assigned to a user.

        Args:
            task: The task that was assigned (should have project loaded).
            assigned_to: The user the task was assigned to.

        Returns:
            True if email was sent successfully.
        """
        project_name = task.project.title if task.project else "No Project"
        task_link = f"{settings.frontend_url}/tasks"

        context = {
            "user_name": assigned_to.name,
            "task_title": task.title,
            "task_description": task.description,
            "project_name": project_name,
            "priority": task.priority,
            "due_date": str(task.due_date) if task.due_date else None,
            "task_link": task_link,
            "subject": f"Task Assigned: {task.title}",
        }

        html_content = self._render_template("task_assigned.html", context)
        if not html_content or "Template" in html_content:
            html_content = f"""
            <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
                <h2>New Task Assigned</h2>
                <p>Hello {assigned_to.name},</p>
                <p>You have been assigned a new task:</p>
                <ul>
                    <li><strong>Task:</strong> {task.title}</li>
                    <li><strong>Project:</strong> {project_name}</li>
                    <li><strong>Priority:</strong> {task.priority}</li>
                    {"<li><strong>Due Date:</strong> " + str(task.due_date) + "</li>" if task.due_date else ""}
                </ul>
                {"<p><strong>Description:</strong> " + task.description + "</p>" if task.description else ""}
                <p><a href="{task_link}">View Task</a></p>
                <hr>
                <p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
            </body>
            </html>
            """

        institution_id = task.project.institution_id if task.project else None

        return self.send_email(
            to=assigned_to.email,
            subject=f"Task Assigned: {task.title}",
            html_content=html_content,
            institution_id=institution_id,
        )

    def test_email_settings(
        self, to: str, institution_id: Optional[int] = None
    ) -> bool:
        """Send a test email to verify SMTP settings.

        Args:
            to: Recipient email address.
            institution_id: Optional institution ID for settings lookup.

        Returns:
            True if test email was sent successfully.
        """
        html_content = """
        <html>
        <body style="font-family: Arial, sans-serif; padding: 20px;">
            <h2>Test Email</h2>
            <p>This is a test email from EduResearch Project Manager.</p>
            <p>If you received this email, your SMTP settings are configured correctly!</p>
            <hr>
            <p style="color: #666; font-size: 12px;">EduResearch Project Manager</p>
        </body>
        </html>
        """

        return self.send_email(
            to=to,
            subject="[Test] EduResearch Project Manager Email Settings",
            html_content=html_content,
            institution_id=institution_id,
        )
