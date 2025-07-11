import React from 'react';
import { Home, Users, Calendar, Plus } from 'lucide-react';

type ViewType = 'dashboard' | 'workers' | 'generate' | 'edit';

interface NavigationProps {
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
}

const Navigation: React.FC<NavigationProps> = ({ currentView, onNavigate }) => {
  const navItems: Array<{ id: ViewType; label: string; icon: typeof Home }> = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'workers', label: 'Workers', icon: Users },
    { id: 'generate', label: 'Generate', icon: Plus },
    { id: 'edit', label: 'Schedule', icon: Calendar },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 safe-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center flex-1 h-full px-2 transition-colors ${
                isActive
                  ? 'text-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
              disabled={item.id === 'edit' && currentView !== 'edit'}
            >
              <Icon className="w-5 h-5 mb-1" />
              <span className="text-xs">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default Navigation;