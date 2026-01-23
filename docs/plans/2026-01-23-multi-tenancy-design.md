# Multi-Tenancy (Enterprise) Design

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add enterprise-level multi-tenancy so multiple organizations can use the platform with complete data isolation.

**Architecture:** Row-Level Security (RLS) with subdomain-based tenant identification. Single database with enterprise_id on all tables, RLS policies enforce isolation at the database level.

**Tech Stack:** PostgreSQL RLS, FastAPI middleware, SQLAlchemy 2.0, React subdomain detection

---

## 1. Entity Hierarchy

```
Enterprise (new - the tenant)
├── enterprise_id (UUID) - globally unique identifier
├── slug (string) - subdomain identifier: "acme" → acme.eduresearch.app
├── name (string) - display name: "Acme Corporation"
├── is_active (bool) - can disable entire tenant
├── created_at, updated_at
│
├── EnterpriseConfig (1:1)
│   ├── OAuth settings (Google client ID/secret, Microsoft, SAML)
│   ├── SMTP settings (host, port, credentials)
│   ├── Branding (logo URL, primary color, custom CSS)
│   └── Feature flags
│
└── All existing entities gain enterprise_id:
    ├── Institution (enterprise_id FK)
    ├── User (enterprise_id FK)
    ├── Project (enterprise_id FK)
    ├── Department (enterprise_id FK)
    ├── Task (enterprise_id FK)
    ├── JoinRequest (enterprise_id FK)
    ├── ProjectFile (enterprise_id FK)
    ├── Notification (enterprise_id FK)
    └── ... all tables
```

**Key Design Decisions:**
- **UUID for enterprise_id** - Prevents enumeration attacks, safe in URLs
- **Slug for subdomain** - Human-readable, validated format (lowercase, alphanumeric, hyphens)
- **enterprise_id on ALL tenant tables** - Enables RLS policies and future sharding
- **Denormalized enterprise_id** - Even if Project belongs to Institution, Project still has enterprise_id directly (faster queries, simpler RLS)

---

## 2. Database Schema & Row-Level Security

### Schema Layout

```sql
-- Platform schema (no RLS - platform admins only)
CREATE SCHEMA platform;

-- Platform tables
CREATE TABLE platform.enterprises (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(63) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT now(),
    updated_at TIMESTAMP
);

CREATE TABLE platform.enterprise_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    enterprise_id UUID REFERENCES platform.enterprises(id) ON DELETE CASCADE,

    -- OAuth/SSO
    google_oauth_enabled BOOLEAN DEFAULT false,
    google_client_id VARCHAR(255),
    google_client_secret_encrypted BYTEA,
    microsoft_oauth_enabled BOOLEAN DEFAULT false,
    microsoft_client_id VARCHAR(255),
    microsoft_client_secret_encrypted BYTEA,
    saml_enabled BOOLEAN DEFAULT false,
    saml_metadata_url VARCHAR(500),

    -- SMTP
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_user VARCHAR(255),
    smtp_password_encrypted BYTEA,
    smtp_from_email VARCHAR(255),
    smtp_from_name VARCHAR(255),

    -- Branding
    logo_url VARCHAR(500),
    primary_color VARCHAR(7) DEFAULT '#3B82F6',
    favicon_url VARCHAR(500),
    custom_css TEXT,

    -- Features
    features JSONB DEFAULT '{}',

    UNIQUE(enterprise_id)
);

CREATE TABLE platform.platform_admins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT now()
);

-- All tenant tables get enterprise_id column
-- Example: users table
ALTER TABLE users ADD COLUMN enterprise_id UUID NOT NULL;
CREATE INDEX idx_users_enterprise ON users(enterprise_id);
```

### Row-Level Security

```sql
-- Enable RLS on all tenant tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE join_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_alert_preferences ENABLE ROW LEVEL SECURITY;

-- Create isolation policy for each table
CREATE POLICY tenant_isolation ON users
    USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

CREATE POLICY tenant_isolation ON institutions
    USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);

-- ... repeat for all tables

-- Composite foreign keys include enterprise_id for referential integrity
ALTER TABLE projects
    ADD CONSTRAINT fk_project_institution
    FOREIGN KEY (enterprise_id, institution_id)
    REFERENCES institutions(enterprise_id, id);

ALTER TABLE departments
    ADD CONSTRAINT fk_department_institution
    FOREIGN KEY (enterprise_id, institution_id)
    REFERENCES institutions(enterprise_id, id);
```

---

## 3. FastAPI Middleware & Request Flow

### Request Flow

```
1. Request arrives: acme.eduresearch.app/api/projects
2. Middleware extracts subdomain: "acme"
3. Lookup enterprise by slug in platform.enterprises (cached)
4. Set PostgreSQL session variable: app.current_enterprise_id
5. RLS automatically filters all queries to that enterprise
6. Response returns only Acme's data
```

### Middleware Implementation

```python
# app/middleware/tenant.py
import re
from fastapi import Request, HTTPException
from sqlalchemy import text
from app.core.cache import redis_cache

SLUG_PATTERN = re.compile(r'^[a-z0-9]([a-z0-9-]*[a-z0-9])?$')

class TenantMiddleware:
    async def __call__(self, request: Request, call_next):
        host = request.headers.get("host", "")
        subdomain = host.split(".")[0]

        # Platform admin access
        if subdomain == "admin":
            request.state.is_platform_admin = True
            request.state.enterprise_id = None
            return await call_next(request)

        # Validate subdomain format
        if not SLUG_PATTERN.match(subdomain):
            raise HTTPException(400, "Invalid subdomain format")

        # Lookup enterprise (with caching)
        enterprise = await self._get_enterprise(subdomain)
        if not enterprise:
            raise HTTPException(404, "Enterprise not found")
        if not enterprise.is_active:
            raise HTTPException(403, "Enterprise is disabled")

        request.state.enterprise_id = enterprise.id
        request.state.enterprise = enterprise
        request.state.is_platform_admin = False

        return await call_next(request)

    async def _get_enterprise(self, slug: str):
        # Check cache first
        cached = await redis_cache.get(f"enterprise:{slug}")
        if cached:
            return cached

        # Query database
        enterprise = await db.query(Enterprise).filter_by(slug=slug).first()
        if enterprise:
            await redis_cache.set(f"enterprise:{slug}", enterprise, ttl=300)
        return enterprise
```

### Database Session with Tenant Context

```python
# app/database.py
from fastapi import Request, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

def get_tenant_db(request: Request) -> Session:
    """RLS-protected database session for tenant requests."""
    db = SessionLocal()
    try:
        if hasattr(request.state, 'enterprise_id') and request.state.enterprise_id:
            db.execute(text(
                f"SET app.current_enterprise_id = '{request.state.enterprise_id}'"
            ))
        yield db
    finally:
        db.close()

def get_platform_db() -> Session:
    """Non-RLS database session for platform admin operations."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

---

## 4. Frontend Changes

### Subdomain Detection

```typescript
// src/config/tenant.ts
const SLUG_PATTERN = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/;

export function getTenantSlug(): string {
  const host = window.location.hostname;

  // Development mode
  if (host === "localhost" || host === "127.0.0.1") {
    return localStorage.getItem("dev_tenant") || "demo";
  }

  const subdomain = host.split(".")[0];

  if (!SLUG_PATTERN.test(subdomain)) {
    throw new Error("Invalid tenant subdomain");
  }

  return subdomain;
}

export function isPlatformAdmin(): boolean {
  return getTenantSlug() === "admin";
}

export function getTenantUrl(slug: string, path: string = ""): string {
  const baseDomain = import.meta.env.VITE_BASE_DOMAIN || "eduresearch.app";
  return `https://${slug}.${baseDomain}${path}`;
}
```

### Branding Context

```typescript
// src/contexts/BrandingContext.tsx
interface EnterpriseBranding {
  logoUrl: string | null;
  primaryColor: string;
  faviconUrl: string | null;
  enterpriseName: string;
}

export function BrandingProvider({ children }: { children: ReactNode }) {
  const [branding, setBranding] = useState<EnterpriseBranding | null>(null);

  useEffect(() => {
    // Fetch branding on app init
    api.get('/enterprise/branding').then(res => {
      setBranding(res.data);

      // Apply CSS variables
      document.documentElement.style.setProperty(
        '--color-primary',
        res.data.primaryColor
      );

      // Update favicon
      if (res.data.faviconUrl) {
        const link = document.querySelector("link[rel~='icon']");
        if (link) link.href = res.data.faviconUrl;
      }
    });
  }, []);

  return (
    <BrandingContext.Provider value={branding}>
      {children}
    </BrandingContext.Provider>
  );
}
```

---

## 5. Platform Admin Dashboard

### Access Model

- URL: `admin.eduresearch.app`
- Requires `platform_admin` role (separate from regular superuser)
- Bypasses RLS (uses `get_platform_db()` dependency)
- Separate authentication from tenant users

### Capabilities

```
Platform Admin Dashboard
├── Enterprise Management
│   ├── Create new enterprise
│   ├── List all enterprises (with stats)
│   ├── Edit enterprise settings
│   ├── Activate/deactivate enterprise
│   ├── Delete enterprise (soft delete)
│   └── "Login as" enterprise admin (impersonation)
│
├── Usage Analytics
│   ├── Users per enterprise
│   ├── Projects per enterprise
│   ├── Storage usage
│   └── API request metrics
│
├── Platform Configuration
│   ├── Default settings for new enterprises
│   ├── Global feature flags
│   └── Platform announcements
│
└── Future: Billing & Subscriptions
```

---

## 6. Migration Strategy

### Phase 1: Add Columns (Non-Breaking)

```sql
-- Migration: 014_add_enterprise_multitenancy.py

-- Create platform schema
CREATE SCHEMA IF NOT EXISTS platform;

-- Create enterprise tables
CREATE TABLE platform.enterprises (...);
CREATE TABLE platform.enterprise_configs (...);
CREATE TABLE platform.platform_admins (...);

-- Add enterprise_id to all tenant tables (nullable first)
ALTER TABLE users ADD COLUMN enterprise_id UUID;
ALTER TABLE institutions ADD COLUMN enterprise_id UUID;
ALTER TABLE departments ADD COLUMN enterprise_id UUID;
ALTER TABLE projects ADD COLUMN enterprise_id UUID;
ALTER TABLE project_members ADD COLUMN enterprise_id UUID;
ALTER TABLE tasks ADD COLUMN enterprise_id UUID;
ALTER TABLE join_requests ADD COLUMN enterprise_id UUID;
ALTER TABLE project_files ADD COLUMN enterprise_id UUID;
-- ... all other tables

-- Create indexes
CREATE INDEX idx_users_enterprise ON users(enterprise_id);
CREATE INDEX idx_institutions_enterprise ON institutions(enterprise_id);
-- ... all tables
```

### Phase 2: Backfill Data

```sql
-- Create default enterprise for existing data
INSERT INTO platform.enterprises (id, slug, name, is_active)
VALUES ('00000000-0000-0000-0000-000000000001', 'default', 'Default Enterprise', true);

-- Backfill all records
UPDATE users SET enterprise_id = '00000000-0000-0000-0000-000000000001';
UPDATE institutions SET enterprise_id = '00000000-0000-0000-0000-000000000001';
-- ... all tables

-- Make columns NOT NULL
ALTER TABLE users ALTER COLUMN enterprise_id SET NOT NULL;
ALTER TABLE institutions ALTER COLUMN enterprise_id SET NOT NULL;
-- ... all tables
```

### Phase 3: Enable RLS

```sql
-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ... all tables

-- Create policies
CREATE POLICY tenant_isolation ON users
    USING (enterprise_id = current_setting('app.current_enterprise_id')::uuid);
-- ... all tables
```

### Rollback Plan

Each phase is independently reversible:
- Phase 1: `DROP COLUMN enterprise_id` from all tables
- Phase 2: No rollback needed (just data)
- Phase 3: `ALTER TABLE ... DISABLE ROW LEVEL SECURITY`

---

## 7. Security Considerations

### Subdomain Validation
- Strict regex validation: `^[a-z0-9]([a-z0-9-]*[a-z0-9])?$`
- Maximum length: 63 characters (DNS limit)
- Reserved slugs: `admin`, `api`, `www`, `app`, `static`

### Token Security
- JWT includes `enterprise_id` claim
- Validate subdomain matches token's enterprise on each request
- Token invalidation on enterprise deactivation

### RLS Bypass Prevention
- Application uses non-superuser database role
- Superuser connections only for migrations
- RLS policies use `USING` clause (applies to SELECT, UPDATE, DELETE)

### Cross-Tenant Attack Prevention
- Composite foreign keys prevent cross-tenant references
- All user input sanitized before use in queries
- Enterprise lookup cached but validated

---

## 8. Files to Create/Modify

### New Files
| File | Purpose |
|------|---------|
| `backend/app/models/enterprise.py` | Enterprise and EnterpriseConfig models |
| `backend/app/schemas/enterprise.py` | Pydantic schemas |
| `backend/app/middleware/tenant.py` | Tenant resolution middleware |
| `backend/app/api/routes/enterprise.py` | Enterprise management endpoints |
| `backend/app/api/routes/platform_admin.py` | Platform admin endpoints |
| `backend/alembic/versions/014_add_enterprise_multitenancy.py` | Migration |
| `frontend/src/config/tenant.ts` | Subdomain detection |
| `frontend/src/contexts/BrandingContext.tsx` | Per-tenant branding |

### Modified Files
| File | Change |
|------|--------|
| `backend/app/database.py` | Add tenant-aware session factory |
| `backend/app/main.py` | Add tenant middleware |
| `backend/app/models/*.py` | Add enterprise_id to all models |
| `backend/app/api/deps.py` | Add get_tenant_db dependency |
| `frontend/src/App.tsx` | Wrap with BrandingProvider |
| `frontend/src/api/client.ts` | No changes (subdomain in host header) |

---

## 9. Testing Strategy

### Unit Tests
- Middleware correctly extracts subdomain
- RLS policies filter correctly
- Enterprise config resolution with fallbacks

### Integration Tests
- Create enterprise, create user, verify isolation
- Cross-tenant access attempts blocked
- Platform admin can access all enterprises

### Security Tests
- Subdomain injection attempts
- JWT tampering with different enterprise_id
- Direct database access without RLS context

---

## 10. Future Considerations

### Separate Database per Enterprise
When an enterprise grows large:
1. Create dedicated database for that enterprise
2. Update enterprise config with connection string
3. Middleware routes to correct database
4. Application code unchanged (RLS still works)

### Billing Integration
- Track usage metrics per enterprise
- Integrate with Stripe for subscription billing
- Feature gating based on subscription tier
