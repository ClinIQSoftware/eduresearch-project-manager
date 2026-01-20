# Code Quality Fixes Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Fix 5 code quality issues identified during systematic debugging review.

**Architecture:** Simple targeted fixes to existing files - no new features, just corrections to documentation, type hints, and unused imports.

**Tech Stack:** Python 3.x, FastAPI, SQLAlchemy, bcrypt

---

## Issues to Fix

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | Outdated docstring (says passlib, uses bcrypt) | `backend/app/core/security.py` | Low |
| 2 | Relationship cardinality mismatch (List vs singular) | `backend/app/models/user.py` | Medium |
| 3 | Unused `Header` import | `backend/app/api/routes/keywords.py` | Low |
| 4 | Relationship back_populates mismatch | `backend/app/models/user_alert_preference.py` | Medium |
| 5 | Unused `enum` import in user_alert_preference.py | `backend/app/models/user_alert_preference.py` | Low |

---

### Task 1: Fix Outdated Docstring in security.py

**Files:**
- Modify: `backend/app/core/security.py:1-6`

**Step 1: Update the module docstring**

Change lines 1-6 from:
```python
"""
Security utilities for the EduResearch Project Manager.

Provides password hashing and JWT token operations for authentication.
Uses passlib with bcrypt for password hashing and python-jose for JWT tokens.
"""
```

To:
```python
"""
Security utilities for the EduResearch Project Manager.

Provides password hashing and JWT token operations for authentication.
Uses bcrypt directly for password hashing and python-jose for JWT tokens.
"""
```

**Step 2: Verify the file still imports correctly**

Run: `cd backend && venv/Scripts/python -c "from app.core.security import hash_password, verify_password; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add backend/app/core/security.py
git commit -m "docs: fix security.py docstring - uses bcrypt directly, not passlib"
```

---

### Task 2: Fix Relationship Cardinality in user.py

**Files:**
- Modify: `backend/app/models/user.py:115-117`

**Context:** `UserAlertPreference` has `unique=True` on `user_id`, meaning there can only be ONE preference per user, not a list. The relationship should be singular (`Optional`) not plural (`List`).

**Step 1: Update the alert_preferences relationship**

Change lines 115-117 from:
```python
    alert_preferences: Mapped[List["UserAlertPreference"]] = relationship(
        "UserAlertPreference", back_populates="user", cascade="all, delete-orphan"
    )
```

To:
```python
    alert_preference: Mapped[Optional["UserAlertPreference"]] = relationship(
        "UserAlertPreference", back_populates="user", cascade="all, delete-orphan", uselist=False
    )
```

**Step 2: Update the back_populates in UserAlertPreference**

In `backend/app/models/user_alert_preference.py`, change line 30 from:
```python
    user = relationship("User", back_populates="alert_preferences")
```

To:
```python
    user = relationship("User", back_populates="alert_preference")
```

**Step 3: Verify the models still load correctly**

Run: `cd backend && venv/Scripts/python -c "from app.models import User, UserAlertPreference; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add backend/app/models/user.py backend/app/models/user_alert_preference.py
git commit -m "fix: correct alert_preferences relationship to singular (user has one preference)"
```

---

### Task 3: Remove Unused Header Import in keywords.py

**Files:**
- Modify: `backend/app/api/routes/keywords.py:1`

**Step 1: Remove Header from the import statement**

Change line 1 from:
```python
from fastapi import APIRouter, Depends, HTTPException, status, Header, Query
```

To:
```python
from fastapi import APIRouter, Depends, HTTPException, status, Query
```

**Step 2: Verify the router still loads correctly**

Run: `cd backend && venv/Scripts/python -c "from app.api.routes.keywords import router; print('OK')"`
Expected: `OK`

**Step 3: Commit**

```bash
git add backend/app/api/routes/keywords.py
git commit -m "refactor: remove unused Header import from keywords.py"
```

---

### Task 4: Remove Unused enum Import in user_alert_preference.py

**Files:**
- Modify: `backend/app/models/user_alert_preference.py:5`

**Context:** The `AlertFrequency` class uses `enum.Enum` but the class is never actually used in the codebase (the column uses String(20) with string values). The import is dead code.

**Step 1: Remove the unused enum import**

Change line 5 from:
```python
import enum
```

To: (delete the line entirely)

**Step 2: Remove the unused AlertFrequency class**

Delete lines 9-13:
```python
class AlertFrequency(str, enum.Enum):
    disabled = "disabled"
    daily = "daily"
    weekly = "weekly"
    monthly = "monthly"
```

**Step 3: Verify the model still loads correctly**

Run: `cd backend && venv/Scripts/python -c "from app.models.user_alert_preference import UserAlertPreference; print('OK')"`
Expected: `OK`

**Step 4: Commit**

```bash
git add backend/app/models/user_alert_preference.py
git commit -m "refactor: remove unused AlertFrequency enum and enum import"
```

---

### Task 5: Final Verification

**Step 1: Run full import check**

Run: `cd backend && venv/Scripts/python -c "from app.main import app; print('App loaded OK')"`
Expected: `App loaded OK`

**Step 2: Test keywords endpoints still work**

Run: `curl -s http://localhost:8000/api/keywords -H "Authorization: Bearer <valid_token>" | head -50`
Expected: JSON response with keywords list

**Step 3: Create final commit if any cleanup needed**

If all tests pass, no additional commit needed.

---

## Summary of Changes

| File | Change |
|------|--------|
| `backend/app/core/security.py` | Fix docstring: "passlib" → "bcrypt directly" |
| `backend/app/models/user.py` | Change `alert_preferences: List` → `alert_preference: Optional` with `uselist=False` |
| `backend/app/models/user_alert_preference.py` | Fix `back_populates`, remove unused enum import and class |
| `backend/app/api/routes/keywords.py` | Remove unused `Header` import |

## Testing Notes

- No new tests needed - these are documentation and cleanup changes
- Existing functionality should remain unchanged
- Verify app loads and keywords endpoints still work after changes
