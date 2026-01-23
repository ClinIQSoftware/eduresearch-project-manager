"""Add reminder email template

Revision ID: 013
Revises: 012
Create Date: 2026-01-23

"""
from alembic import op


# revision identifiers, used by Alembic.
revision = '013'
down_revision = '012'
branch_labels = None
depends_on = None


REMINDER_TEMPLATE = {
    "template_type": "reminder",
    "subject": "Reminder: {{reminder_type}} - {{item_name}}",
    "body": """<html>
<body>
<h2>{{reminder_type}}</h2>
<p>This is a reminder about an upcoming {{reminder_type_lower}}:</p>
<ul>
    <li><strong>Project:</strong> {{project_name}}</li>
    <li><strong>{{item_label}}:</strong> {{item_name}}</li>
    <li><strong>Date:</strong> {{date}}</li>
</ul>
{{#if description}}
<p><strong>Details:</strong></p>
<p>{{description}}</p>
{{/if}}
<p><a href="{{project_link}}">View Project</a></p>
<p style="color: #666; font-size: 12px;">You can manage your reminder preferences in your account settings.</p>
</body>
</html>"""
}


def upgrade():
    # Insert reminder template (global, no institution_id)
    op.execute(
        f"""INSERT INTO email_templates (template_type, subject, body, is_active)
        VALUES ('{REMINDER_TEMPLATE["template_type"]}', '{REMINDER_TEMPLATE["subject"].replace("'", "''")}', '{REMINDER_TEMPLATE["body"].replace("'", "''")}', true)"""
    )


def downgrade():
    op.execute("DELETE FROM email_templates WHERE template_type = 'reminder'")
