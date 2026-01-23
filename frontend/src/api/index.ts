// Re-export all API modules
export { default as client } from './client';

export * from './auth';
export * from './projects';
export * from './tasks';
export * from './institutions';
export * from './departments';
export * from './joinRequests';
export * from './files';
export * from './admin';

// Re-export with namespaces for cleaner imports
import * as authApi from './auth';
import * as projectsApi from './projects';
import * as tasksApi from './tasks';
import * as institutionsApi from './institutions';
import * as departmentsApi from './departments';
import * as joinRequestsApi from './joinRequests';
import * as filesApi from './files';
import * as adminApi from './admin';

export {
  authApi,
  projectsApi,
  tasksApi,
  institutionsApi,
  departmentsApi,
  joinRequestsApi,
  filesApi,
  adminApi,
};
