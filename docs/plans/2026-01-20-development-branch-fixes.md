# Development Branch Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix all import errors, consolidate duplicate modules, register missing routes, and prepare the development branch for deployment and merge to main.

**Architecture:** The codebase has been rewritten with a layered architecture (services, repositories, core modules). Two duplicate dependency modules exist (`app/dependencies.py` and `app/api/deps.py`) that need consolidation. Missing route registrations need to be added for analytics and timetracking.

**Tech Stack:** FastAPI, SQLAlchemy 2.0, React, TypeScript, Tailwind CSS

---

## Summary of Issues

| Priority | Issue | Files Affected |
|----------|-------|----------------|
| HIGH | Duplicate dependency modules with conflicting implementations | `app/dependencies.py`, `app/api/deps.py` |
| HIGH | Missing route registrations | `analytics.py`, `timetracking.py` |
| MEDIUM | Inconsistent imports (some routes use `app.dependencies`, others use `app.api.deps`) | `keywords.py`, `reports.py` |
| MEDIUM | Direct service imports instead of package exports | `keywords.py` |

---

### Task 1: Consolidate Dependency Modules

**Files:**
- Keep: `backend/app/api/deps.py` (uses AuthService, better architecture)
- Delete: `backend/app/dependencies.py`
- Modify: `backend/app/api/routes/keywords.py`
- Modify: `backend/app/api/routes/reports.py`

**Step 1: Update keywords.py imports**

Change line 16 from:
```python
from app.dependencies import get_current_user
```
to:
```python
from app.api.deps import get_current_user, get_db
```

Also change line 6 from:
```python
from app.database import get_db
```
to remove it (already importing from deps).

And change line 17 from:
```python
from app.services.email_service import EmailService
```
to:
```python
from app.services import EmailService
```

**Step 2: Update reports.py imports**

Change lines 4 and 8 from:
```python
from app.database import get_db
...
from app.dependencies import get_current_user
```
to:
```python
from app.api.deps import get_current_user, get_db
```

**Step 3: Update analytics.py imports**

Change line 6 from:
```python
from app.database import get_db
```
to:
```python
from app.api.deps import get_db
```

**Step 4: Update timetracking.py imports**

Change line 5 from:
```python
from app.database import get_db
```
to:
```python
from app.api.deps import get_db
```

**Step 5: Delete the duplicate module**

Delete: `backend/app/dependencies.py`

**Step 6: Verify no other files import from dependencies.py**

Run: `grep -r "from app.dependencies" backend/`
Expected: No results

---

### Task 2: Register Missing Routes

**Files:**
- Modify: `backend/app/api/routes/__init__.py`
- Modify: `backend/app/main.py`

**Step 1: Update routes/__init__.py**

Add imports for analytics and timetracking routers:

```python
from app.api.routes.analytics import router as analytics_router
from app.api.routes.timetracking import router as timetracking_router
```

Add to `__all__`:
```python
__all__ = [
    ...existing exports...,
    "analytics_router",
    "timetracking_router",
]
```

**Step 2: Update main.py**

Add imports:
```python
from app.api.routes import (
    ...existing imports...,
    analytics_router,
    timetracking_router,
)
```

Add router registrations:
```python
# Analytics routes
app.include_router(analytics_router, prefix="/api/analytics", tags=["Analytics"])

# Time tracking routes
app.include_router(timetracking_router, prefix="/api/time-entries", tags=["Time Tracking"])
```

---

### Task 3: Verify Backend Startup

**Step 1: Test Python imports**

Run: `cd backend && python -c "from app.main import app; print('OK')"`
Expected: `OK`

**Step 2: Start the backend server**

Run: `cd backend && uvicorn app.main:app --reload --port 8001`
Expected: Server starts without import errors

**Step 3: Test API endpoints**

Run: `curl http://localhost:8001/health`
Expected: `{"status": "healthy"}`

---

### Task 4: Verify Frontend Build

**Step 1: Install dependencies**

Run: `cd frontend && npm install`
Expected: Successful install

**Step 2: Run TypeScript check**

Run: `cd frontend && npx tsc --noEmit`
Expected: No errors

**Step 3: Build the frontend**

Run: `cd frontend && npm run build`
Expected: Successful build

---

### Task 5: Commit All Fixes

**Step 1: Stage changes**

```bash
git add -A
```

**Step 2: Commit**

```bash
git commit -m "fix: consolidate dependency modules and register missing routes

- Remove duplicate app/dependencies.py module
- Standardize all routes to use app/api/deps.py
- Register analytics and timetracking routes in main.py
- Fix direct service imports to use package exports

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

**Step 3: Push to remote**

```bash
git push origin development
```

---

## Verification Checklist

- [ ] All routes import from `app.api.deps` (not `app.dependencies`)
- [ ] All services imported from `app.services` package (not direct files)
- [ ] `app/dependencies.py` is deleted
- [ ] Analytics routes registered at `/api/analytics`
- [ ] Time tracking routes registered at `/api/time-entries`
- [ ] Backend starts without errors
- [ ] Frontend builds without errors
- [ ] All changes committed and pushed

---

## Post-Fix Testing

After fixes are applied, test these critical flows:

1. **Authentication**: Login, get current user
2. **Projects**: List, create, view details
3. **Tasks**: List, create, update status
4. **Analytics**: Get summary (if time entries exist)
5. **Admin**: List users, view settings
