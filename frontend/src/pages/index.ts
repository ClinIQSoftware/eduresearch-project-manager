// Auth Pages
export { default as Login } from './Login';
export { default as Register } from './Register';
export { default as AuthCallback } from './AuthCallback';

// Main Pages
export { default as Dashboard } from './Dashboard';
export { default as Projects } from './Projects';
export { default as ProjectDetail } from './ProjectDetail';
export { default as Tasks } from './Tasks';
export { default as JoinRequests } from './JoinRequests';
export { default as TimeTracking } from './TimeTracking';
export { default as PendingUsers } from './PendingUsers';

// Note: Settings, Reports, and Admin pages are imported directly from their
// subdirectories in App.tsx to avoid naming conflicts (e.g., SecurityTab exists
// in both admin/ and settings/).
