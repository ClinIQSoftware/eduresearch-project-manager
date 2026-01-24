# Hierarchical Email Settings Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement a 3-tier hierarchical email settings system where Platform → Enterprise → Institution, with each level inheriting from its parent when not explicitly configured.

**Architecture:** Settings cascade downward with explicit overrides. Platform-level is the default for all enterprises. Each enterprise can override with their own SMTP config. Institutions can further override within their enterprise. The EmailService resolves settings by walking up the hierarchy until it finds active settings.

**Tech Stack:** FastAPI, SQLAlchemy, React, TypeScript, React Query

---

## Current State

- **EmailSettings model**: Has `institution_id` and `enterprise_id` fields (already added for multi-tenancy)
- **EmailService**: 2-tier fallback: Institution → Global (where global = NULL institution_id)
- **EmailSettingsRepository**: Has `get_for_institution()` and `get_global()` methods
- **Platform Admin Settings Tab**: Placeholder UI
- **Enterprise Admin Email Tab**: Works but has no enterprise context

## Target State

```
Platform Default (institution_id=NULL, enterprise_id=NULL)
    ↓ inherits
Enterprise Override (institution_id=NULL, enterprise_id=<uuid>)
    ↓ inherits
Institution Override (institution_id=<id>, enterprise_id=<uuid>)
```

---

## Task 1: Update EmailSettingsRepository

**Files:**
- Modify: `backend/app/repositories/settings_repository.py`

**Step 1: Add enterprise and platform methods to EmailSettingsRepository**

Add after `get_global()` method:

```python
def get_for_enterprise(self, enterprise_id: Optional[UUID]) -> Optional[EmailSettings]:
    """Get email settings for a specific enterprise (without institution override).

    Args:
        enterprise_id: The enterprise UUID.

    Returns:
        The email settings if found, None otherwise.
    """
    if enterprise_id is None:
        return None

    return (
        self.db.query(EmailSettings)
        .filter(
            EmailSettings.enterprise_id == enterprise_id,
            EmailSettings.institution_id.is_(None)
        )
        .first()
    )

def get_platform_default(self) -> Optional[EmailSettings]:
    """Get platform-wide default email settings (both enterprise_id and institution_id are NULL).

    Returns:
        The platform default email settings if found, None otherwise.
    """
    return (
        self.db.query(EmailSettings)
        .filter(
            EmailSettings.enterprise_id.is_(None),
            EmailSettings.institution_id.is_(None)
        )
        .first()
    )
```

**Step 2: Update imports at top of file**

Add `from uuid import UUID` to imports.

**Step 3: Commit**

```bash
git add backend/app/repositories/settings_repository.py
git commit -m "feat: add enterprise and platform-level email settings repository methods"
```

---

## Task 2: Update EmailService for 3-Tier Fallback

**Files:**
- Modify: `backend/app/services/email_service.py`

**Step 1: Update `_get_email_settings` method**

Replace the existing method with:

```python
def _get_email_settings(
    self,
    institution_id: Optional[int] = None,
    enterprise_id: Optional[UUID] = None
) -> Optional[EmailSettings]:
    """Get email settings using hierarchical fallback.

    Resolution order:
    1. Institution-specific settings (if institution_id provided)
    2. Enterprise-specific settings (if enterprise_id provided)
    3. Platform default settings

    Args:
        institution_id: Optional institution ID for institution-specific settings.
        enterprise_id: Optional enterprise UUID for enterprise-specific settings.

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

    # Try enterprise-specific settings
    if enterprise_id:
        email_settings = self.email_settings_repo.get_for_enterprise(
            enterprise_id
        )
        if email_settings and email_settings.is_active:
            return email_settings

    # Fall back to platform default settings
    platform_settings = self.email_settings_repo.get_platform_default()
    if platform_settings and platform_settings.is_active:
        return platform_settings

    return None
```

**Step 2: Add UUID import**

Add `from uuid import UUID` to imports at top.

**Step 3: Update all methods that call `_get_email_settings` to pass enterprise_id**

Update `send_email` method signature:

```python
def send_email(
    self,
    to: str,
    subject: str,
    html_content: str,
    institution_id: Optional[int] = None,
    enterprise_id: Optional[UUID] = None,
) -> bool:
```

And update the call inside:

```python
email_settings = self._get_email_settings(institution_id, enterprise_id)
```

**Step 4: Commit**

```bash
git add backend/app/services/email_service.py
git commit -m "feat: update EmailService with 3-tier hierarchical settings fallback"
```

---

## Task 3: Add Platform Admin Email Settings API

**Files:**
- Modify: `backend/app/api/routes/platform_admin.py`
- Modify: `backend/app/schemas/platform_admin.py`

**Step 1: Add email settings schemas to platform_admin.py schemas**

Add to `backend/app/schemas/platform_admin.py`:

```python
class PlatformEmailSettingsResponse(BaseModel):
    smtp_host: str
    smtp_port: int
    smtp_user: Optional[str] = None
    from_email: Optional[str] = None
    from_name: str
    is_active: bool

    model_config = {"from_attributes": True}


class PlatformEmailSettingsUpdate(BaseModel):
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    from_email: Optional[str] = None
    from_name: Optional[str] = None
    is_active: Optional[bool] = None


class TestEmailRequest(BaseModel):
    to: EmailStr
```

**Step 2: Add email settings routes to platform_admin.py**

Add imports at top:

```python
from app.models.email_settings import EmailSettings
from app.schemas.platform_admin import (
    # ... existing imports ...
    PlatformEmailSettingsResponse,
    PlatformEmailSettingsUpdate,
    TestEmailRequest,
)
from app.services.email_service import EmailService
```

Add routes at bottom:

```python
@router.get("/settings/email", response_model=PlatformEmailSettingsResponse)
def get_platform_email_settings(
    request: Request,
    db: Session = Depends(get_platform_db),
):
    """Get platform-wide default email settings."""
    require_platform_admin(request)

    settings = (
        db.query(EmailSettings)
        .filter(
            EmailSettings.enterprise_id.is_(None),
            EmailSettings.institution_id.is_(None)
        )
        .first()
    )

    if not settings:
        # Return defaults if no settings exist yet
        return PlatformEmailSettingsResponse(
            smtp_host="smtp.gmail.com",
            smtp_port=587,
            smtp_user=None,
            from_email=None,
            from_name="EduResearch Project Manager",
            is_active=False,
        )

    return settings


@router.put("/settings/email", response_model=PlatformEmailSettingsResponse)
def update_platform_email_settings(
    request: Request,
    settings_data: PlatformEmailSettingsUpdate,
    db: Session = Depends(get_platform_db),
):
    """Update platform-wide default email settings."""
    require_platform_admin(request)

    settings = (
        db.query(EmailSettings)
        .filter(
            EmailSettings.enterprise_id.is_(None),
            EmailSettings.institution_id.is_(None)
        )
        .first()
    )

    if not settings:
        # Create new platform settings
        settings = EmailSettings(
            enterprise_id=None,
            institution_id=None,
        )
        db.add(settings)

    # Update fields if provided
    update_data = settings_data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(settings, field, value)

    db.commit()
    db.refresh(settings)

    return settings


@router.post("/settings/email/test")
def test_platform_email(
    request: Request,
    test_data: TestEmailRequest,
    db: Session = Depends(get_platform_db),
):
    """Send a test email using platform default settings."""
    require_platform_admin(request)

    email_service = EmailService(db)
    success = email_service.test_email_settings(
        to=test_data.to,
        institution_id=None,
    )

    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to send test email. Check SMTP settings.",
        )

    return {"message": f"Test email sent to {test_data.to}"}
```

**Step 3: Commit**

```bash
git add backend/app/api/routes/platform_admin.py backend/app/schemas/platform_admin.py
git commit -m "feat: add platform admin email settings API endpoints"
```

---

## Task 4: Add Frontend Platform Admin API Functions

**Files:**
- Modify: `frontend/src/api/platformAdmin.ts`

**Step 1: Add email settings API functions**

Add to the file:

```typescript
export interface PlatformEmailSettings {
  smtp_host: string;
  smtp_port: number;
  smtp_user: string | null;
  from_email: string | null;
  from_name: string;
  is_active: boolean;
}

export interface PlatformEmailSettingsUpdate {
  smtp_host?: string;
  smtp_port?: number;
  smtp_user?: string;
  smtp_password?: string;
  from_email?: string;
  from_name?: string;
  is_active?: boolean;
}

export const getPlatformEmailSettings = () =>
  apiClient.get<PlatformEmailSettings>('/platform-admin/settings/email');

export const updatePlatformEmailSettings = (data: PlatformEmailSettingsUpdate) =>
  apiClient.put<PlatformEmailSettings>('/platform-admin/settings/email', data);

export const sendPlatformTestEmail = (to: string) =>
  apiClient.post('/platform-admin/settings/email/test', { to });
```

**Step 2: Commit**

```bash
git add frontend/src/api/platformAdmin.ts
git commit -m "feat: add platform admin email settings API functions"
```

---

## Task 5: Add Frontend Platform Admin Hooks

**Files:**
- Modify: `frontend/src/hooks/usePlatformAdmin.ts`

**Step 1: Add email settings hooks**

Add imports:

```typescript
import {
  getPlatformEmailSettings,
  updatePlatformEmailSettings,
  sendPlatformTestEmail,
  PlatformEmailSettingsUpdate,
} from '../api/platformAdmin';
```

Add hooks:

```typescript
export function usePlatformEmailSettings() {
  return useQuery({
    queryKey: ['platformEmailSettings'],
    queryFn: () => getPlatformEmailSettings().then(res => res.data),
  });
}

export function useUpdatePlatformEmailSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PlatformEmailSettingsUpdate) =>
      updatePlatformEmailSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformEmailSettings'] });
    },
  });
}

export function usePlatformTestEmail() {
  return useMutation({
    mutationFn: (to: string) => sendPlatformTestEmail(to),
  });
}
```

**Step 2: Commit**

```bash
git add frontend/src/hooks/usePlatformAdmin.ts
git commit -m "feat: add platform admin email settings React Query hooks"
```

---

## Task 6: Implement Platform Admin Settings Tab

**Files:**
- Modify: `frontend/src/pages/platform-admin/SettingsTab.tsx`

**Step 1: Replace placeholder with email settings form**

```typescript
import { useState, useEffect } from 'react';
import {
  usePlatformEmailSettings,
  useUpdatePlatformEmailSettings,
  usePlatformTestEmail,
} from '../../hooks/usePlatformAdmin';
import { getErrorMessage } from '../../utils/errorHandling';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card } from '../../components/ui/Card';
import { Checkbox } from '../../components/ui/Checkbox';
import { LoadingSpinner } from '../../components/ui/LoadingSpinner';

export default function SettingsTab() {
  const { data: settings, isLoading } = usePlatformEmailSettings();
  const updateSettings = useUpdatePlatformEmailSettings();
  const testEmail = usePlatformTestEmail();

  const [form, setForm] = useState({
    smtp_host: '',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    from_name: '',
    is_active: false,
  });
  const [testTo, setTestTo] = useState('');
  const [message, setMessage] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    if (settings) {
      setForm({
        smtp_host: settings.smtp_host || '',
        smtp_port: settings.smtp_port || 587,
        smtp_user: settings.smtp_user || '',
        smtp_password: '',
        from_email: settings.from_email || '',
        from_name: settings.from_name || '',
        is_active: settings.is_active,
      });
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      const data: Record<string, unknown> = {
        ...form,
        smtp_user: form.smtp_user || null,
        from_email: form.from_email || null,
      };
      if (!form.smtp_password) delete data.smtp_password;
      await updateSettings.mutateAsync(data);
      setForm((f) => ({ ...f, smtp_password: '' }));
      setMessage({ type: 'success', text: 'Settings saved successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  const handleTest = async () => {
    if (!testTo) {
      return setMessage({ type: 'error', text: 'Enter a test email address' });
    }
    try {
      await testEmail.mutateAsync(testTo);
      setMessage({ type: 'success', text: `Test email sent to ${testTo}` });
    } catch (error) {
      setMessage({ type: 'error', text: getErrorMessage(error) });
    }
  };

  if (isLoading) {
    return (
      <div className="py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl space-y-6">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-sm font-medium text-blue-800">Platform Default Settings</h3>
        <p className="text-sm text-blue-600 mt-1">
          These settings are inherited by all enterprises that don't have their own
          email configuration.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-50 text-green-600'
              : 'bg-red-50 text-red-600'
          }`}
        >
          {message.text}
        </div>
      )}

      <Card title="SMTP Configuration">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="SMTP Host"
            value={form.smtp_host}
            onChange={(v) => setForm({ ...form, smtp_host: v })}
            placeholder="smtp.gmail.com"
          />
          <Input
            label="SMTP Port"
            type="number"
            value={String(form.smtp_port)}
            onChange={(v) => setForm({ ...form, smtp_port: parseInt(v) || 587 })}
          />
          <Input
            label="SMTP Username"
            value={form.smtp_user}
            onChange={(v) => setForm({ ...form, smtp_user: v })}
            placeholder="your-email@gmail.com"
          />
          <Input
            label="SMTP Password"
            type="password"
            value={form.smtp_password}
            onChange={(v) => setForm({ ...form, smtp_password: v })}
            placeholder="Leave blank to keep existing"
          />
          <Input
            label="From Email"
            type="email"
            value={form.from_email}
            onChange={(v) => setForm({ ...form, from_email: v })}
            placeholder="noreply@domain.com"
          />
          <Input
            label="From Name"
            value={form.from_name}
            onChange={(v) => setForm({ ...form, from_name: v })}
            placeholder="EduResearch Project Manager"
          />
        </div>
        <div className="mt-4 flex items-center justify-between">
          <Checkbox
            label="Enable email notifications"
            checked={form.is_active}
            onChange={(v) => setForm({ ...form, is_active: v })}
          />
          <Button onClick={handleSave} loading={updateSettings.isPending}>
            Save Settings
          </Button>
        </div>
      </Card>

      <Card title="Test Email">
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <Input
              label="Recipient Email"
              type="email"
              value={testTo}
              onChange={setTestTo}
              placeholder="test@example.com"
            />
          </div>
          <Button onClick={handleTest} loading={testEmail.isPending}>
            Send Test
          </Button>
        </div>
      </Card>
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add frontend/src/pages/platform-admin/SettingsTab.tsx
git commit -m "feat: implement platform admin email settings UI"
```

---

## Task 7: Update Platform Admin Layout Navigation

**Files:**
- Modify: `frontend/src/pages/platform-admin/PlatformAdminLayout.tsx`

**Step 1: Rename Settings tab for clarity**

Update the tab label from 'Settings' to 'Email & Settings':

```typescript
const platformAdminTabs = [
  { to: '/platform-admin/enterprises', label: 'Enterprises' },
  { to: '/platform-admin/settings', label: 'Email & Settings' },
];
```

**Step 2: Commit**

```bash
git add frontend/src/pages/platform-admin/PlatformAdminLayout.tsx
git commit -m "feat: update platform admin navigation tab labels"
```

---

## Task 8: Build and Test

**Step 1: Rebuild Docker containers**

```bash
cd /Users/jd/Dropbox/Professional\ -\ Business/Apps/Education\ and\ research\ log\ and\ team/eduresearch-project-manager/.worktrees/multi-tenancy
docker compose -f docker-compose.local.yml up --build -d backend frontend
```

**Step 2: Verify the changes work**

1. Navigate to http://localhost:3000/login
2. Login as platform admin: platform-admin@eduresearch.app / PlatformAdmin123!
3. Navigate to the "Email & Settings" tab
4. Verify email settings form loads
5. Configure SMTP settings and save
6. Send a test email

**Step 3: Final commit for any fixes**

```bash
git add -A
git commit -m "fix: resolve any build or runtime issues"
```

---

## Files to Modify Summary

| File | Change |
|------|--------|
| `backend/app/repositories/settings_repository.py` | Add `get_for_enterprise()` and `get_platform_default()` methods |
| `backend/app/services/email_service.py` | Update fallback chain to 3-tier hierarchy |
| `backend/app/api/routes/platform_admin.py` | Add email settings endpoints |
| `backend/app/schemas/platform_admin.py` | Add email settings schemas |
| `frontend/src/api/platformAdmin.ts` | Add email settings API functions |
| `frontend/src/hooks/usePlatformAdmin.ts` | Add email settings hooks |
| `frontend/src/pages/platform-admin/SettingsTab.tsx` | Implement email settings UI |
| `frontend/src/pages/platform-admin/PlatformAdminLayout.tsx` | Update tab label |

---

## Verification Checklist

- [ ] Platform admin can configure default email settings
- [ ] Test email works from platform admin dashboard
- [ ] Email settings show "Platform Default Settings" info banner
- [ ] Enterprise admins will inherit platform settings when they don't have their own

---

## Future Enhancements (Not in this plan)

- Enterprise-level email override UI (in enterprise admin dashboard)
- Institution-level email override (already partially implemented)
- Visual inheritance indicator showing which level settings come from
- "Reset to platform defaults" button for enterprises
