# Multi-Tenancy Architecture Review Prompt

Copy this prompt to ChatGPT and Gemini to get their feedback:

---

## Context

I'm building a multi-tenant SaaS application for education/research project management. The stack is:
- **Backend**: FastAPI + SQLAlchemy 2.0 + PostgreSQL
- **Frontend**: React + TypeScript + Vite
- **Current structure**: Institution → Department → Users/Projects/Tasks

## Requirements

1. Add "Enterprise" as a new top-level tenant layer above Institution
2. Each Enterprise is completely isolated (can't see other enterprises' data)
3. Subdomain-per-enterprise access: `acme.eduresearch.app`, `bigcorp.eduresearch.app`
4. Platform admin dashboard at `admin.eduresearch.app` to manage all enterprises
5. Per-enterprise configuration: OAuth/SSO providers, SMTP settings, branding
6. Start with schema-per-enterprise, migrate heavy tenants to separate databases later

## Proposed Architecture Options

### Option A: Schema-per-Enterprise
```
Database
├── platform_schema (enterprise registry, platform admins)
├── enterprise_acme (all tables for Acme)
├── enterprise_bigcorp (all tables for BigCorp)
└── enterprise_xxx (new schema per tenant)
```

### Option B: Row-Level Security (RLS)
```
Database
├── platform_schema (enterprise registry, platform admins)
└── tenant_data_schema
    ├── institutions (enterprise_id + RLS policy)
    ├── users (enterprise_id + RLS policy)
    ├── projects (enterprise_id + RLS policy)
    └── ... all tables have enterprise_id + RLS
```

### Option C: Hybrid
```
Database
├── public schema
│   ├── enterprises (tenant registry)
│   ├── enterprise_configs (SSO, SMTP, branding per tenant)
│   └── platform_admins
└── tenant_data schema (RLS-protected)
    └── All tenant tables with enterprise_id column
```

## Questions

1. **Which option do you recommend and why?** Consider: operational complexity, security, performance at scale, migration complexity.

2. **How should subdomain → tenant resolution work?** Middleware that extracts subdomain and sets database context?

3. **For SQLAlchemy + FastAPI, what's the best pattern for:**
   - Setting the tenant context per request
   - Ensuring RLS policies are enforced
   - Handling the platform admin who needs cross-tenant access

4. **What are the security concerns with subdomain-based tenant identification?** How to prevent tenant spoofing?

5. **Migration strategy**: How to add `enterprise_id` to all existing tables and backfill data for existing users?

6. **Any gotchas or anti-patterns to avoid?**

---

Please provide specific code examples for FastAPI middleware and SQLAlchemy session configuration where applicable.
