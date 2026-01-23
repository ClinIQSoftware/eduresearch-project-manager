"""Add email templates table

Revision ID: 007
Revises: 006
Create Date: 2025-01-10

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "007"
down_revision = "006"
branch_labels = None
depends_on = None


# Default email templates
DEFAULT_TEMPLATES = [
    {
        "template_type": "user_approval_request",
        "subject": "New User Registration Requires Approval - {{user_name}}",
        "body": """<html>
<body>
<h2>New User Registration</h2>
<p>A new user has registered and requires your approval:</p>
<ul>
    <li><strong>Name:</strong> {{user_name}}</li>
    <li><strong>Email:</strong> {{user_email}}</li>
    <li><strong>Institution:</strong> {{institution_name}}</li>
    <li><strong>Department:</strong> {{department_name}}</li>
</ul>
<p>Please log in to approve or reject this registration:</p>
<p><a href="{{approval_link}}">{{approval_link}}</a></p>
</body>
</html>""",
    },
    {
        "template_type": "join_request",
        "subject": "Join Request for {{project_name}}",
        "body": """<html>
<body>
<h2>Project Join Request</h2>
<p><strong>{{requester_name}}</strong> has requested to join your project "{{project_name}}".</p>
<p><strong>Message from requester:</strong></p>
<blockquote>{{message}}</blockquote>
<p>Please log in to approve or reject this request:</p>
<p><a href="{{project_link}}">{{project_link}}</a></p>
</body>
</html>""",
    },
    {
        "template_type": "task_assignment",
        "subject": "Task Assigned: {{task_title}}",
        "body": """<html>
<body>
<h2>New Task Assignment</h2>
<p>You have been assigned a new task:</p>
<ul>
    <li><strong>Task:</strong> {{task_title}}</li>
    <li><strong>Project:</strong> {{project_name}}</li>
    <li><strong>Priority:</strong> {{priority}}</li>
    <li><strong>Due Date:</strong> {{due_date}}</li>
</ul>
<p><strong>Description:</strong></p>
<p>{{description}}</p>
<p><a href="{{task_link}}">View Task</a></p>
</body>
</html>""",
    },
]


def upgrade():
    # Create email_templates table
    op.create_table(
        "email_templates",
        sa.Column("id", sa.Integer(), primary_key=True, index=True),
        sa.Column(
            "institution_id",
            sa.Integer(),
            sa.ForeignKey("institutions.id"),
            nullable=True,
        ),
        sa.Column("template_type", sa.String(50), nullable=False),
        sa.Column("subject", sa.String(255), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("is_active", sa.Boolean(), default=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
    )

    # Insert default templates (global, no institution_id)
    for template in DEFAULT_TEMPLATES:
        op.execute(
            f"""INSERT INTO email_templates (template_type, subject, body, is_active)
            VALUES ('{template["template_type"]}', '{template["subject"].replace("'", "''")}', '{template["body"].replace("'", "''")}', true)"""
        )


def downgrade():
    op.drop_table("email_templates")
