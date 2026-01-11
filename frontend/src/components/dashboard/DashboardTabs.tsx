export type DashboardView = 'personal' | 'department' | 'institution' | 'global';

interface DashboardTabsProps {
  activeView: DashboardView;
  onViewChange: (view: DashboardView) => void;
}

const tabs: { id: DashboardView; label: string; description: string }[] = [
  { id: 'personal', label: 'Personal', description: 'Projects you are part of' },
  { id: 'department', label: 'Department', description: 'All projects in your department' },
  { id: 'institution', label: 'Institution', description: 'All projects in your institution' },
  { id: 'global', label: 'Global', description: 'All projects across institutions' },
];

export function DashboardTabs({ activeView, onViewChange }: DashboardTabsProps) {
  return (
    <div className="border-b border-gray-200 mb-4 md:mb-6">
      <div className="overflow-x-auto">
        <nav
          className="flex space-x-2 md:space-x-8 min-w-max"
          aria-label="Dashboard views"
        >
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onViewChange(tab.id)}
              className={`py-3 px-2 md:px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                activeView === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
              aria-current={activeView === tab.id ? 'page' : undefined}
              title={tab.description}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
    </div>
  );
}
