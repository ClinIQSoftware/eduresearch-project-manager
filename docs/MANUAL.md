# EduResearch Project Manager - User Manual

A comprehensive guide to using the EduResearch Project Manager platform for education and research project collaboration.

---

## Table of Contents

1. [Introduction](#introduction)
2. [Getting Started](#getting-started)
3. [User Roles](#user-roles)
4. [User Guide](#user-guide)
5. [Institution Admin Guide](#institution-admin-guide)
6. [Platform Admin Guide](#platform-admin-guide)
7. [Multi-Tenancy (Enterprise)](#multi-tenancy-enterprise)
8. [Email Notifications](#email-notifications)
9. [Configuration Reference](#configuration-reference)
10. [Troubleshooting](#troubleshooting)

---

## Introduction

EduResearch Project Manager is a collaborative platform designed for educational institutions and research organizations to manage projects, coordinate teams, and track research activities.

### Key Features

- **Project Management**: Create, organize, and track research projects
- **Team Collaboration**: Invite members, manage roles, and coordinate work
- **Task Management**: Break down projects into actionable tasks
- **File Sharing**: Upload and share project documents
- **Join Requests**: Allow users to request membership to projects
- **Reports**: Generate reports on projects, leads, and user involvement
- **Email Notifications**: Automated notifications for key events
- **Multi-Tenancy**: Support for multiple enterprises with complete data isolation
- **OAuth Authentication**: Sign in with Google or Microsoft accounts

---

## Getting Started

### Creating an Account

1. Navigate to your organization's EduResearch URL (e.g., `yourcompany.eduresearch.app`)
2. Click **Register** on the login page
3. Fill in your details:
   - Email address
   - Password (minimum 8 characters)
   - First and last name
   - Phone number (optional)
   - Bio (optional)
   - Select your institution (if applicable)
   - Select your department (if applicable)
4. Click **Create Account**
5. Wait for an administrator to approve your account (if approval is required)

### Logging In

You can log in using:

- **Email and Password**: Enter your registered email and password
- **Google OAuth**: Click "Sign in with Google" (if enabled by your organization)
- **Microsoft OAuth**: Click "Sign in with Microsoft" (if enabled by your organization)

### First-Time Setup

After logging in for the first time:

1. Complete your profile in the **Settings** page
2. Set up keyword preferences to receive alerts about relevant projects
3. Configure email notification preferences

---

## User Roles

EduResearch has three levels of user roles:

### Regular User
- View all projects
- Join projects (via request or invitation)
- Create new projects (becomes project lead)
- Manage tasks on projects they're members of
- Upload files to their projects

### Superuser (Institution Admin)
All regular user permissions, plus:
- Access the Admin Dashboard
- Manage users within their institution
- Manage departments
- Configure institution settings
- Approve new user registrations

### Platform Admin
- Access the Platform Admin Dashboard
- Manage all enterprises
- Configure platform-wide settings
- View platform-wide statistics
- Create and manage enterprises

---

## User Guide

### Dashboard

The dashboard provides an overview of your activity:

- **Your Projects**: Projects you're a member of
- **Pending Requests**: Join requests awaiting approval
- **Recent Activity**: Latest updates across your projects
- **Quick Actions**: Create project, browse projects

### Projects

#### Viewing Projects

1. Click **Projects** in the sidebar
2. Use filters to narrow down:
   - Classification (Education, Research, Quality Improvement, Administrative)
   - Status (Preparation, Recruitment, Analysis, Writing, Published, On Hold, Completed)
   - Lead name
   - Institution

#### Creating a Project

1. Click **New Project**
2. Fill in the project details:
   - **Title**: Clear, descriptive project name
   - **Description**: Detailed project description
   - **Classification**: Choose the project type
   - **Status**: Current project phase
   - **Keywords**: Comma-separated keywords for discovery
   - **Institution**: Your institution (optional)
   - **Department**: Your department (optional)
   - **Funding Source**: Grant or funding information (optional)
   - **Expected End Date**: Target completion date (optional)
   - **Next Meeting Date**: Upcoming meeting (optional)
3. Click **Create Project**

You automatically become the project lead.

#### Managing Project Members

As a project lead:

1. Open your project
2. Go to the **Members** tab
3. To add a member:
   - Click **Add Member**
   - Search for a user by name or email
   - Select their role (Lead or Member)
4. To change a member's role:
   - Click on their current role
   - Select the new role
5. To remove a member:
   - Click the **Remove** button next to their name

#### Join Requests

**Requesting to Join a Project:**
1. Open the project page
2. Click **Request to Join**
3. Add a message explaining your interest (optional)
4. Wait for a project lead to approve

**Approving Join Requests (as Lead):**
1. Open your project
2. Go to the **Join Requests** tab
3. Review pending requests
4. Click **Approve** or **Reject**

### Tasks

#### Creating Tasks

1. Open a project
2. Go to the **Tasks** tab
3. Click **Add Task**
4. Fill in:
   - **Title**: Task name
   - **Description**: Detailed description
   - **Due Date**: When the task should be completed
   - **Priority**: Low, Medium, High, Urgent
   - **Assignee**: Team member responsible (optional)
5. Click **Create Task**

#### Managing Tasks

- **Update Status**: Click on a task and change its status
- **Edit Task**: Click the edit button to modify details
- **Complete Task**: Mark as completed when done
- **Delete Task**: Remove unnecessary tasks

### Files

#### Uploading Files

1. Open a project
2. Go to the **Files** tab
3. Click **Upload** or drag and drop files
4. Files are automatically shared with all project members
5. Project leads receive email notifications of new uploads

#### Downloading Files

1. Click on any file to download
2. View file details including upload date and uploader

### Reports

Access reports from the **Reports** section:

- **Projects with Leads**: List of all projects and their leads
- **Leads with Projects**: List of all leads and their projects
- **User Involvement**: Summary of user participation across projects

### Settings

#### Profile Settings

Update your personal information:
- Name
- Phone number
- Bio
- Institution and department

#### Keyword Preferences

Set up keywords to receive alerts when new projects match your interests:

1. Go to **Settings** > **Keyword Preferences**
2. Add keywords relevant to your research interests
3. You'll receive notifications when new projects include these keywords

#### Email Preferences

Configure which email notifications you receive:
- Project updates
- Task assignments
- Join request notifications
- File upload alerts

---

## Institution Admin Guide

### Accessing the Admin Dashboard

1. Log in with a superuser account
2. Click **Admin** in the navigation menu

### Managing Users

#### Viewing Users

1. Go to **Admin** > **Users**
2. View all users in your institution
3. Filter by status, role, or search by name

#### Approving Users

When new users register:
1. Go to **Admin** > **Users**
2. Find users with "Pending Approval" status
3. Click **Approve** to grant access or **Reject** to deny

#### Editing Users

1. Click on a user's name
2. Modify their details:
   - Name, email, phone
   - Institution and department
   - User role
   - Active/inactive status
3. Save changes

#### Making a User Superuser

1. Edit the user
2. Toggle the **Superuser** switch
3. Save changes

### Managing Departments

#### Creating Departments

1. Go to **Admin** > **Departments**
2. Click **Add Department**
3. Enter:
   - Department name
   - Associated institution
4. Click **Create**

#### Editing Departments

1. Click on a department name
2. Modify the details
3. Save changes

### Managing Institutions

#### Viewing Institutions

1. Go to **Admin** > **Institutions**
2. View all institutions in your enterprise

#### Creating Institutions

1. Click **Add Institution**
2. Enter the institution name
3. Click **Create**

### Email Settings

Configure email settings for your institution:

1. Go to **Admin** > **Email Settings**
2. Configure SMTP settings:
   - SMTP Host (e.g., smtp.gmail.com)
   - SMTP Port (typically 587)
   - SMTP Username
   - SMTP Password
   - From Email
   - From Name
3. Enable/disable email notifications
4. Click **Save**

#### Testing Email

1. Enter a test email address
2. Click **Send Test Email**
3. Check the inbox for the test message

### Email Templates

Customize email templates for different notification types:

1. Go to **Admin** > **Email Templates**
2. Select a template to edit:
   - Welcome Email
   - Join Request Notification
   - Join Response
   - Task Assignment
   - Project Update
   - File Upload Notification
   - Approval Request
   - Approval Notification
3. Modify the subject and body
4. Use available placeholders (e.g., `{{user_name}}`, `{{project_title}}`)
5. Click **Save**

### Security Settings

1. Go to **Admin** > **Security**
2. Configure:
   - Password requirements
   - Session timeout
   - Login attempt limits

### Data Import

Import data in bulk:

1. Go to **Admin** > **Import**
2. Download the template CSV file
3. Fill in the data
4. Upload the completed CSV
5. Review and confirm the import

---

## Platform Admin Guide

### Overview

Platform Admins manage the entire EduResearch platform across all enterprises. Access the Platform Admin Dashboard at `admin.yourplatform.com` or via the Platform Admin login.

### Logging In

1. Navigate to the Platform Admin URL
2. Enter your platform admin email and password
3. Click **Login**

Default credentials (change immediately after first login):
- Email: `platform-admin@eduresearch.app`
- Password: `PlatformAdmin123!`

### Dashboard

The Platform Admin Dashboard shows:
- Total enterprises
- Active enterprises
- Total users across all enterprises
- Total projects
- Total institutions

### Managing Enterprises

#### Viewing Enterprises

1. Go to **Enterprises** tab
2. View all enterprises with:
   - Name and slug
   - Status (active/inactive)
   - User count
   - Project count
   - Created date

#### Creating an Enterprise

1. Click **Create Enterprise**
2. Enter:
   - **Slug**: Subdomain identifier (e.g., `acme` for `acme.eduresearch.app`)
     - Must be lowercase
     - Only letters, numbers, and hyphens
     - Cannot start or end with a hyphen
   - **Name**: Display name (e.g., "Acme Corporation")
3. Click **Create**

The enterprise is immediately accessible at `slug.yourdomain.com`.

#### Editing an Enterprise

1. Click on an enterprise
2. Modify:
   - Name
   - Active status
3. Save changes

#### Deactivating an Enterprise

1. Click on the enterprise
2. Toggle **Active** to off
3. Save

Deactivated enterprises cannot be accessed by users.

### Platform Settings

#### Admin Credentials

Update your platform admin credentials:

1. Go to **Settings** tab
2. In the **Admin Credentials** section:
   - Modify your email
   - Modify your name
   - Enter a new password (leave blank to keep current)
   - Confirm new password
3. Enter your current password
4. Click **Update Credentials**

#### Email Settings

Configure platform-wide email settings:

1. Go to **Settings** tab
2. Configure SMTP settings:
   - SMTP Host
   - SMTP Port
   - SMTP Username
   - SMTP Password
   - From Email
   - From Name
3. Enable/disable email notifications
4. Click **Save Settings**

These settings are inherited by all enterprises that don't have their own email configuration.

#### Testing Email

1. Enter a recipient email
2. Click **Send Test**
3. Verify the email was received

---

## Multi-Tenancy (Enterprise)

### Overview

EduResearch supports multi-tenancy, allowing multiple organizations (enterprises) to use the same platform with complete data isolation.

### How It Works

- Each enterprise has its own subdomain: `enterprise-slug.eduresearch.app`
- Data is completely isolated between enterprises
- Each enterprise can have its own:
  - Users and institutions
  - Projects and tasks
  - Email settings
  - OAuth configuration
  - Branding

### Enterprise Hierarchy

```
Enterprise (e.g., "Acme Corporation")
└── Institutions (e.g., "Medical Center", "Research Lab")
    └── Departments (e.g., "Cardiology", "Neurology")
        └── Users
            └── Projects
                └── Tasks, Files, Members
```

### Subdomain Access

- Users access their enterprise at: `your-enterprise.eduresearch.app`
- Platform admins access at: `admin.eduresearch.app`

### Data Isolation

- Users in one enterprise cannot see data from other enterprises
- Authentication is separate per enterprise
- Each enterprise can have different settings

---

## Email Notifications

### Types of Notifications

| Notification | Trigger | Recipients |
|-------------|---------|------------|
| Welcome Email | User registration approved | New user |
| Join Request | User requests to join project | Project leads |
| Join Response | Request approved/rejected | Requesting user |
| Task Assigned | Task assigned to user | Assignee |
| Project Update | Project details changed | Project members |
| File Upload | New file uploaded | Project leads |
| Approval Request | User needs approval | Admins |
| Approval Notification | User approved/rejected | User |
| Meeting Reminder | Upcoming meeting | Project members |
| Deadline Reminder | Upcoming deadline | Task assignees |

### Email Hierarchy

Email settings follow a hierarchy:

1. **Institution Settings** (if configured)
2. **Enterprise Settings** (if configured)
3. **Platform Default Settings** (fallback)

This allows enterprises and institutions to customize their email settings while falling back to platform defaults.

### Configuring Email

#### Gmail Setup

1. Enable 2-Factor Authentication on your Google account
2. Generate an App Password at https://myaccount.google.com/apppasswords
3. Use these settings:
   - SMTP Host: `smtp.gmail.com`
   - SMTP Port: `587`
   - SMTP Username: `your-email@gmail.com`
   - SMTP Password: `your-app-password`
   - From Email: `your-email@gmail.com`

#### Other Email Providers

| Provider | Host | Port |
|----------|------|------|
| Gmail | smtp.gmail.com | 587 |
| Outlook/Office 365 | smtp.office365.com | 587 |
| Yahoo | smtp.mail.yahoo.com | 587 |
| Amazon SES | email-smtp.region.amazonaws.com | 587 |
| SendGrid | smtp.sendgrid.net | 587 |
| Mailgun | smtp.mailgun.org | 587 |

---

## Configuration Reference

### Environment Variables

#### Backend

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `SECRET_KEY` | Yes | - | JWT signing key |
| `ENVIRONMENT` | No | development | Environment (development, production) |
| `FRONTEND_URL` | Yes (prod) | http://localhost:5173 | Frontend URL |
| `BACKEND_URL` | Yes (prod) | http://localhost:8000 | Backend URL |
| `GOOGLE_CLIENT_ID` | No | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | - | Google OAuth client secret |
| `MICROSOFT_CLIENT_ID` | No | - | Microsoft OAuth client ID |
| `MICROSOFT_CLIENT_SECRET` | No | - | Microsoft OAuth client secret |
| `MICROSOFT_TENANT_ID` | No | common | Microsoft tenant ID |
| `SMTP_HOST` | No | smtp.gmail.com | SMTP server host |
| `SMTP_PORT` | No | 587 | SMTP server port |
| `SMTP_USER` | No | - | SMTP username |
| `SMTP_PASSWORD` | No | - | SMTP password |
| `FROM_EMAIL` | No | - | Sender email address |
| `FROM_NAME` | No | EduResearch Project Manager | Sender name |
| `BASE_DOMAIN` | No | localhost:3000 | Base domain for subdomains |
| `PLATFORM_ADMIN_EMAIL` | No | platform-admin@eduresearch.app | Initial platform admin email |
| `PLATFORM_ADMIN_PASSWORD` | No | PlatformAdmin123! | Initial platform admin password |
| `PLATFORM_ADMIN_NAME` | No | Platform Administrator | Initial platform admin name |

#### Frontend

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_API_URL` | Yes (prod) | Backend API base URL |

### Project Classifications

| Classification | Description |
|----------------|-------------|
| Education | Educational programs, courses, curricula |
| Research | Research studies, experiments, publications |
| Quality Improvement | Process improvements, efficiency projects |
| Administrative | Operational, administrative projects |

### Project Statuses

| Status | Description |
|--------|-------------|
| Preparation | Initial planning and setup |
| Recruitment | Recruiting participants or team |
| Analysis | Data collection and analysis |
| Writing | Documentation and publication |
| Published | Project published/completed |
| On Hold | Temporarily paused |
| Completed | Project finished |

### Task Priorities

| Priority | Use When |
|----------|----------|
| Low | Nice to have, no deadline pressure |
| Medium | Standard priority |
| High | Important, should be completed soon |
| Urgent | Critical, needs immediate attention |

---

## Troubleshooting

### Login Issues

**Problem: Can't log in**
- Verify your email and password are correct
- Check if your account has been approved by an admin
- If using OAuth, ensure your organization has enabled it
- Try resetting your password

**Problem: OAuth not working**
- Ensure the OAuth provider is configured by your admin
- Clear browser cookies and try again
- Check if popup blockers are interfering

### Email Issues

**Problem: Not receiving emails**
- Check your spam/junk folder
- Verify email settings are configured in Admin > Email Settings
- Test the email configuration with a test email
- Ensure email notifications are enabled

**Problem: Test email fails**
- Verify SMTP credentials are correct
- Check if your email provider requires an app password
- Ensure the SMTP port is correct (typically 587)
- Check firewall/network restrictions

### Project Issues

**Problem: Can't create a project**
- Ensure you're logged in
- Check if your account is approved
- Verify you have the necessary permissions

**Problem: Can't see a project**
- Projects may be filtered - check your filters
- You may not be a member of the project
- The project may belong to a different enterprise

### File Upload Issues

**Problem: File upload fails**
- Check the file size (default limit: 10MB)
- Ensure you're a member of the project
- Try a different file format
- Check your internet connection

### Performance Issues

**Problem: Pages load slowly**
- Clear browser cache
- Check your internet connection
- The server may be under heavy load
- Try a different browser

### Getting Help

If you continue to experience issues:

1. Check the [GitHub Issues](https://github.com/ClinIQSoftware/eduresearch-project-manager/issues) for known problems
2. Report new issues with:
   - Steps to reproduce the problem
   - Expected vs actual behavior
   - Browser and operating system
   - Screenshots if helpful

---

## Appendix: Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search |
| `Esc` | Close modal/dropdown |

---

## Appendix: API Reference

For developers integrating with EduResearch:

- **API Documentation**: `/docs` (Swagger UI)
- **API Specification**: `/redoc` (ReDoc)
- **Base URL**: `https://your-api-domain.com/api`

### Authentication

All API requests (except login/register) require a Bearer token:

```
Authorization: Bearer <your-jwt-token>
```

### Common Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Login and get token |
| POST | `/auth/register` | Register new account |
| GET | `/auth/me` | Get current user |
| GET | `/projects` | List all projects |
| POST | `/projects` | Create project |
| GET | `/projects/{id}` | Get project details |
| GET | `/tasks` | List tasks |
| POST | `/tasks` | Create task |
| GET | `/reports/projects-with-leads` | Projects with leads report |

---

*Last updated: January 2026*

*Version: 2.0*
