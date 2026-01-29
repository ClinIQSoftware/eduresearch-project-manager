"""Tests for tenant enforcement middleware.

Verifies that get_db() logs warnings when used in tenant-scoped contexts,
and that get_unscoped_db() does not.
"""

import logging
import uuid

import pytest
from app.api.deps import get_db, get_unscoped_db
from app.middleware.tenant import tenant_context_var


class TestTenantContextGuard:
    """Test that get_db warns when called in tenant context."""

    def test_get_db_warns_in_tenant_context(self, caplog):
        """get_db() should log a warning when tenant context is active."""
        enterprise_id = uuid.uuid4()
        token = tenant_context_var.set(enterprise_id)
        try:
            with caplog.at_level(logging.WARNING, logger="app.api.deps"):
                gen = get_db()
                db = next(gen)
                try:
                    pass
                finally:
                    try:
                        next(gen)
                    except StopIteration:
                        pass

            assert any("get_db() used in tenant-scoped request" in r.message for r in caplog.records)
        finally:
            tenant_context_var.reset(token)

    def test_get_db_no_warning_outside_tenant_context(self, caplog):
        """get_db() should NOT warn when no tenant context is active."""
        with caplog.at_level(logging.WARNING, logger="app.api.deps"):
            gen = get_db()
            db = next(gen)
            try:
                pass
            finally:
                try:
                    next(gen)
                except StopIteration:
                    pass

        assert not any("get_db() used in tenant-scoped request" in r.message for r in caplog.records)

    def test_get_unscoped_db_no_warning_in_tenant_context(self, caplog):
        """get_unscoped_db() should never warn, even in tenant context."""
        enterprise_id = uuid.uuid4()
        token = tenant_context_var.set(enterprise_id)
        try:
            with caplog.at_level(logging.WARNING, logger="app.api.deps"):
                gen = get_unscoped_db()
                db = next(gen)
                try:
                    pass
                finally:
                    try:
                        next(gen)
                    except StopIteration:
                        pass

            assert not any("get_db()" in r.message for r in caplog.records)
        finally:
            tenant_context_var.reset(token)
