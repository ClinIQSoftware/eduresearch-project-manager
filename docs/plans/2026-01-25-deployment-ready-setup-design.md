# Deployment-Ready Setup Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make EduResearch Project Manager deployment-ready with reliable platform admin seeding, email configuration guidance, and Email Templates admin UI.

**Architecture:** Move platform admin seeding from migrations to application startup (idempotent), add setup status endpoints for visibility, implement missing Email Templates Tab in admin dashboard.

**Tech Stack:** FastAPI, SQLAlchemy, React, React Query, TypeScript

---

## Task 1: Add `must_change_password` Field to Platform Admin

**Files:**
- Create: `backend/alembic/versions/018_add_platform_admin_must_change_password.py`
- Modify: `backend/app/models/platform_admin.py`

**Step 1: Write the migration**

```python
"""Add must_change_password to platform_admins.

Revision ID: 018
Revises: 017
Create Date: 2026-01-25
"""

from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "018"
down_revision: Union[str, None] = "017"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "platform_admins",
        sa.Column("must_change_password", sa.Boolean(), nullable=False, server_default=sa.text("true")),
    )


def downgrade() -> None:
    op.drop_column("platform_admins", "must_change_password")
```

**Step 2: Update PlatformAdmin model**

Add to the model class:
```python
must_change_password: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
```

**Step 3: Commit**

```bash
git add backend/alembic/versions/018_add_platform_admin_must_change_password.py backend/app/models/platform_admin.py
git commit -m "feat: add must_change_password field to platform_admins"
```

---

## Task 2: Create Startup Initialization Module

**Files:**
- Create: `backend/app/core/init.py`

**Step 1: Create the initialization module**

```python
"""Application startup initialization.

Handles idempotent seeding and configuration validation.
"""

import logging
from uuid import uuid4

from sqlalchemy.orm import Session
from passlib.context import CryptContext

from app.config import settings
from app.database import SessionLocal
from app.models.platform_admin import PlatformAdmin
from app.models.enterprise import Enterprise

logger = logging.getLogger(__name__)
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def validate_config() -> None:
    """Validate configuration and log warnings for missing optional settings."""
    # Required settings - fail fast
    if not settings.secret_key or settings.secret_key == "change-me-in-production":
        logger.error("SECRET_KEY is not set or using default value!")

    # Optional settings - warn
    if not settings.smtp_user:
        logger.warning("SMTP_USER not configured - email notifications disabled")

    if not settings.google_client_id:
        logger.info("GOOGLE_CLIENT_ID not set - Google OAuth disabled")

    if not settings.microsoft_client_id:
        logger.info("MICROSOFT_CLIENT_ID not set - Microsoft OAuth disabled")


def seed_default_enterprise(db: Session) -> Enterprise:
    """Ensure default enterprise exists for single-tenant deployments."""
    enterprise = db.query(Enterprise).filter(Enterprise.slug == "default").first()
    if not enterprise:
        enterprise = Enterprise(
            id=uuid4(),
            name="Default Enterprise",
            slug="default",
            is_active=True,
        )
        db.add(enterprise)
        db.commit()
        logger.info("Created default enterprise")
    return enterprise


def seed_platform_admin(db: Session) -> None:
    """Seed platform admin if none exists (idempotent)."""
    existing = db.query(PlatformAdmin).first()
    if existing:
        logger.info(f"Platform admin already exists: {existing.email}")
        return

    # Create from environment variables
    password_hash = pwd_context.hash(settings.platform_admin_password)
    admin = PlatformAdmin(
        id=uuid4(),
        email=settings.platform_admin_email,
        password_hash=password_hash,
        name=settings.platform_admin_name,
        is_active=True,
        must_change_password=True,
    )
    db.add(admin)
    db.commit()
    logger.info(f"Created platform admin: {admin.email}")
    logger.warning("Platform admin created with default password - change immediately!")


def run_startup_init() -> None:
    """Run all startup initialization tasks."""
    logger.info("Running startup initialization...")

    validate_config()

    db = SessionLocal()
    try:
        seed_default_enterprise(db)
        seed_platform_admin(db)
    finally:
        db.close()

    logger.info("Startup initialization complete")
```

**Step 2: Commit**

```bash
git add backend/app/core/init.py
git commit -m "feat: add startup initialization module for idempotent seeding"
```

---

## Task 3: Integrate Startup Init into Application Lifespan

**Files:**
- Modify: `backend/app/main.py`

**Step 1: Import and call init in lifespan**

Add to imports:
```python
from app.core.init import run_startup_init
```

Update lifespan function (or create if not exists):
```python
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    run_startup_init()
    yield
    # Shutdown (nothing needed)


app = FastAPI(
    title="EduResearch Project Manager API",
    lifespan=lifespan,
    # ... other config
)
```

**Step 2: Test locally**

Run: `cd backend && python -m uvicorn app.main:app --reload`
Expected: Logs show "Running startup initialization..." and "Created platform admin" on first run

**Step 3: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: integrate startup init into application lifespan"
```

---

## Task 4: Remove Seeding from Migration 017

**Files:**
- Modify: `backend/alembic/versions/017_add_platform_admins.py`

**Step 1: Remove bulk_insert from upgrade()**

Keep table creation, remove the seeding logic:
```python
def upgrade() -> None:
    # Create platform_admins table
    op.create_table(
        "platform_admins",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("email", sa.String(255), unique=True, nullable=False, index=True),
        sa.Column("password_hash", sa.String(255), nullable=True),
        sa.Column("name", sa.String(255), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    # Note: Platform admin seeding moved to application startup (app/core/init.py)
```

Remove imports no longer needed: `uuid`, `CryptContext`, `settings`

**Step 2: Commit**

```bash
git add backend/alembic/versions/017_add_platform_admins.py
git commit -m "refactor: move platform admin seeding from migration to startup"
```

---

## Task 5: Add Password Change Endpoint

**Files:**
- Modify: `backend/app/api/routes/platform_admin.py`
- Create: `backend/app/schemas/platform_admin.py` (if not exists)

**Step 1: Add schema for password change**

```python
from pydantic import BaseModel, field_validator

class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("new_password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("Password must be at least 8 characters")
        return v
```

**Step 2: Add endpoint to platform_admin routes**

```python
@router.post("/auth/change-password")
def change_password(
    request: PasswordChangeRequest,
    admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """Change platform admin password."""
    admin = db.query(PlatformAdmin).filter(PlatformAdmin.id == admin_id).first()
    if not admin:
        raise HTTPException(status_code=404, detail="Admin not found")

    if not pwd_context.verify(request.current_password, admin.password_hash):
        raise HTTPException(status_code=400, detail="Current password incorrect")

    admin.password_hash = pwd_context.hash(request.new_password)
    admin.must_change_password = False
    db.commit()

    return {"message": "Password changed successfully"}
```

**Step 3: Update login response to include must_change_password**

In the login endpoint, add to response:
```python
return {
    "access_token": token,
    "token_type": "bearer",
    "is_platform_admin": True,
    "must_change_password": admin.must_change_password,
}
```

**Step 4: Commit**

```bash
git add backend/app/api/routes/platform_admin.py backend/app/schemas/platform_admin.py
git commit -m "feat: add platform admin password change endpoint"
```

---

## Task 6: Add Setup Status Endpoint

**Files:**
- Modify: `backend/app/api/routes/platform_admin.py`

**Step 1: Add setup status endpoint**

```python
@router.get("/setup-status")
def get_setup_status(
    admin_id: UUID = Depends(require_platform_admin),
    db: Session = Depends(get_platform_db),
):
    """Get platform setup status for admin dashboard."""
    from app.config import settings

    admin = db.query(PlatformAdmin).filter(PlatformAdmin.id == admin_id).first()

    return {
        "platform_admin": {
            "configured": True,
            "must_change_password": admin.must_change_password if admin else True,
        },
        "email": {
            "configured": bool(settings.smtp_user and settings.smtp_password),
            "provider": settings.smtp_host if settings.smtp_user else None,
        },
        "oauth": {
            "google": bool(settings.google_client_id),
            "microsoft": bool(settings.microsoft_client_id),
        },
        "database": {
            "connected": True,  # If we got here, DB is connected
        },
    }
```

**Step 2: Commit**

```bash
git add backend/app/api/routes/platform_admin.py
git commit -m "feat: add setup status endpoint for platform admin"
```

---

## Task 7: Enhance Health Endpoint

**Files:**
- Modify: `backend/app/main.py`

**Step 1: Update health endpoint**

```python
@app.get("/health")
def health_check(detailed: bool = False, db: Session = Depends(get_db)):
    """Health check endpoint."""
    response = {"status": "healthy"}

    if detailed:
        # Check database
        try:
            db.execute(text("SELECT 1"))
            response["database"] = {"status": "connected"}
        except Exception as e:
            response["database"] = {"status": "error", "error": str(e)}
            response["status"] = "degraded"

        # Check email config
        from app.config import settings
        response["email"] = {
            "configured": bool(settings.smtp_user),
        }

    return response
```

**Step 2: Commit**

```bash
git add backend/app/main.py
git commit -m "feat: enhance health endpoint with optional detailed mode"
```

---

## Task 8: Update .env.example with Email Guidance

**Files:**
- Modify: `backend/.env.example`

**Step 1: Add detailed comments**

```bash
# =============================================================================
# REQUIRED CONFIGURATION
# =============================================================================

# Database connection (PostgreSQL recommended for production)
DATABASE_URL=postgresql://user:password@localhost:5432/eduresearch

# Secret key for JWT tokens (generate with: openssl rand -hex 32)
SECRET_KEY=change-me-in-production

# Application URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:8000

# Environment (development, staging, production)
ENVIRONMENT=development

# =============================================================================
# PLATFORM ADMIN (Created on first startup if no admin exists)
# =============================================================================

# IMPORTANT: Change these before first deployment!
PLATFORM_ADMIN_EMAIL=admin@yourdomain.com
PLATFORM_ADMIN_PASSWORD=ChangeThisPassword123!
PLATFORM_ADMIN_NAME=Platform Administrator

# =============================================================================
# EMAIL CONFIGURATION (Optional - app works without email)
# =============================================================================

# For Gmail:
#   1. Enable 2-factor authentication
#   2. Generate App Password: https://myaccount.google.com/apppasswords
#   3. Use the app password below (NOT your regular Gmail password)
#
# For other providers, use your SMTP credentials

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=
SMTP_PASSWORD=
FROM_EMAIL=
FROM_NAME=EduResearch Project Manager

# =============================================================================
# OAUTH PROVIDERS (Optional)
# =============================================================================

# Google OAuth (https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Microsoft OAuth (https://portal.azure.com/#blade/Microsoft_AAD_RegisteredApps)
MICROSOFT_CLIENT_ID=
MICROSOFT_CLIENT_SECRET=
MICROSOFT_TENANT_ID=common

# =============================================================================
# MULTI-TENANCY
# =============================================================================

# Base domain for subdomain routing (e.g., eduresearch.app)
BASE_DOMAIN=localhost:3000
```

**Step 2: Commit**

```bash
git add backend/.env.example
git commit -m "docs: improve .env.example with detailed email setup guidance"
```

---

## Task 9: Add Email Templates React Query Hooks

**Files:**
- Modify: `frontend/src/hooks/useAdmin.ts`

**Step 1: Add email template hooks**

```typescript
// Email Templates
export function useEmailTemplates(institutionId?: number) {
  return useQuery({
    queryKey: ['emailTemplates', institutionId],
    queryFn: () => api.getEmailTemplates(institutionId).then(r => r.data),
  });
}

export function useUpdateEmailTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ templateType, data, institutionId }: {
      templateType: string;
      data: { subject?: string; body?: string; is_active?: boolean };
      institutionId?: number;
    }) => api.updateEmailTemplate(templateType, data, institutionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['emailTemplates'] }),
  });
}

export function useTestTemplateEmail() {
  return useMutation({
    mutationFn: ({ templateType, recipientEmail, institutionId }: {
      templateType: string;
      recipientEmail: string;
      institutionId?: number;
    }) => api.sendTestEmail(templateType, recipientEmail, institutionId),
  });
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/useAdmin.ts
git commit -m "feat: add React Query hooks for email templates"
```

---

## Task 10: Create Email Templates Tab Component

**Files:**
- Create: `frontend/src/pages/admin/EmailTemplatesTab.tsx`

**Step 1: Create the component**

```typescript
import { useState } from 'react';
import { useEmailTemplates, useUpdateEmailTemplate, useTestTemplateEmail } from '../../hooks/useAdmin';
import { Button, Card, Modal, Input, Textarea, Checkbox, Table, LoadingSpinner, ErrorMessage } from '../../components/ui';

interface EmailTemplate {
  id: number;
  template_type: string;
  subject: string;
  body: string;
  is_active: boolean;
}

export default function EmailTemplatesTab() {
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [testEmail, setTestEmail] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const { data: templates, isLoading, error } = useEmailTemplates();
  const updateMutation = useUpdateEmailTemplate();
  const testMutation = useTestTemplateEmail();

  const handleSave = async () => {
    if (!editingTemplate) return;

    try {
      await updateMutation.mutateAsync({
        templateType: editingTemplate.template_type,
        data: {
          subject: editingTemplate.subject,
          body: editingTemplate.body,
          is_active: editingTemplate.is_active,
        },
      });
      setMessage({ type: 'success', text: 'Template saved successfully' });
      setEditingTemplate(null);
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to save template' });
    }
  };

  const handleTest = async () => {
    if (!editingTemplate || !testEmail) return;

    try {
      await testMutation.mutateAsync({
        templateType: editingTemplate.template_type,
        recipientEmail: testEmail,
      });
      setMessage({ type: 'success', text: `Test email sent to ${testEmail}` });
    } catch (err) {
      setMessage({ type: 'error', text: 'Failed to send test email' });
    }
  };

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message="Failed to load email templates" />;

  return (
    <div className="space-y-6">
      {message && (
        <div className={`p-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {message.text}
        </div>
      )}

      <Card>
        <Card.Header>
          <Card.Title>Email Templates</Card.Title>
          <Card.Description>
            Customize email notifications sent to users. Templates support variables like {'{{user_name}}'}, {'{{project_name}}'}, etc.
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.Head>Template Type</Table.Head>
                <Table.Head>Subject</Table.Head>
                <Table.Head>Active</Table.Head>
                <Table.Head>Actions</Table.Head>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {templates?.map((template: EmailTemplate) => (
                <Table.Row key={template.id}>
                  <Table.Cell className="font-medium">{template.template_type}</Table.Cell>
                  <Table.Cell>{template.subject}</Table.Cell>
                  <Table.Cell>
                    <span className={`px-2 py-1 rounded text-xs ${template.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                      {template.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </Table.Cell>
                  <Table.Cell>
                    <Button variant="outline" size="sm" onClick={() => setEditingTemplate(template)}>
                      Edit
                    </Button>
                  </Table.Cell>
                </Table.Row>
              ))}
            </Table.Body>
          </Table>
        </Card.Content>
      </Card>

      {/* Edit Modal */}
      <Modal open={!!editingTemplate} onClose={() => setEditingTemplate(null)}>
        <Modal.Header>
          <Modal.Title>Edit Email Template</Modal.Title>
        </Modal.Header>
        <Modal.Content>
          {editingTemplate && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Template Type</label>
                <Input value={editingTemplate.template_type} disabled />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Subject</label>
                <Input
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Body (HTML)</label>
                <Textarea
                  value={editingTemplate.body}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  rows={10}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  checked={editingTemplate.is_active}
                  onCheckedChange={(checked) => setEditingTemplate({ ...editingTemplate, is_active: !!checked })}
                />
                <label className="text-sm">Template Active</label>
              </div>

              <div className="border-t pt-4 mt-4">
                <label className="block text-sm font-medium mb-1">Send Test Email</label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="recipient@example.com"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e.target.value)}
                  />
                  <Button variant="outline" onClick={handleTest} disabled={testMutation.isPending}>
                    {testMutation.isPending ? 'Sending...' : 'Send Test'}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal.Content>
        <Modal.Footer>
          <Button variant="outline" onClick={() => setEditingTemplate(null)}>Cancel</Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/admin/EmailTemplatesTab.tsx
git commit -m "feat: add Email Templates Tab component"
```

---

## Task 11: Add Email Templates Route and Navigation

**Files:**
- Modify: `frontend/src/pages/admin/AdminLayout.tsx`
- Modify: `frontend/src/pages/admin/index.ts`
- Modify: `frontend/src/App.tsx`

**Step 1: Update AdminLayout tabs**

Add to adminTabs array:
```typescript
const adminTabs = [
  { to: '/admin/users', label: 'Users' },
  { to: '/admin/institutions', label: 'Institutions' },
  { to: '/admin/departments', label: 'Departments' },
  { to: '/admin/security', label: 'Security' },
  { to: '/admin/email', label: 'Email Settings' },
  { to: '/admin/email-templates', label: 'Email Templates' },  // NEW
  { to: '/admin/import', label: 'Import' },
];
```

**Step 2: Export from index.ts**

```typescript
export { default as EmailTemplatesTab } from './EmailTemplatesTab';
```

**Step 3: Add route in App.tsx**

```typescript
import { EmailTemplatesTab } from './pages/admin';

// In admin routes:
<Route path="email-templates" element={<EmailTemplatesTab />} />
```

**Step 4: Commit**

```bash
git add frontend/src/pages/admin/AdminLayout.tsx frontend/src/pages/admin/index.ts frontend/src/App.tsx
git commit -m "feat: add Email Templates route and navigation"
```

---

## Task 12: Update Deploy README

**Files:**
- Modify: `deploy/README.md`

**Step 1: Add post-deployment checklist**

Add section:
```markdown
## Post-Deployment Checklist

After deploying for the first time:

### 1. Change Platform Admin Password

The platform admin is created on first startup with credentials from environment variables.

1. Log in at `https://your-domain.com/login` with the admin credentials
2. You'll be prompted to change your password immediately
3. Use a strong, unique password

### 2. Configure Email (Optional)

Email notifications are optional but recommended. To enable:

1. Set SMTP environment variables (see backend/.env.example for Gmail instructions)
2. Check setup status: GET /api/platform/setup-status
3. Send a test email from Admin > Email Templates

### 3. Configure OAuth (Optional)

To enable social login:

1. Create OAuth credentials (Google Console / Azure Portal)
2. Set CLIENT_ID and CLIENT_SECRET environment variables
3. Redeploy to pick up new settings

### 4. Verify Setup

Check `/health?detailed=true` to verify:
- Database connection
- Email configuration status
```

**Step 2: Commit**

```bash
git add deploy/README.md
git commit -m "docs: add post-deployment checklist to deploy README"
```

---

## Verification

After all tasks complete:

1. **Backend Tests:**
   ```bash
   cd backend && pytest
   ```

2. **Frontend Build:**
   ```bash
   cd frontend && npm run build
   ```

3. **Manual Verification:**
   - Start fresh (delete platform_admins rows)
   - Restart backend - should create platform admin
   - Login with default credentials
   - Verify must_change_password in response
   - Navigate to Admin > Email Templates
   - Verify templates load
   - Check /health?detailed=true
   - Check /api/platform/setup-status
