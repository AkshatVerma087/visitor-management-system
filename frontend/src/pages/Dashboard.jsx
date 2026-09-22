import { useAuth } from '../context/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { Building2, LogOut } from 'lucide-react';
import HostDashboard from '../components/dashboard/HostDashboard';
import SecurityDashboard from '../components/dashboard/SecurityDashboard';
import AdminDashboard from '../components/dashboard/AdminDashboard';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const todayStr = new Date().toLocaleDateString('en-US', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans">
      {/* Top Navigation Bar */}
      <header className="h-16 border-b border-zinc-200 flex items-center justify-between px-8 bg-white shrink-0">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center shadow-sm">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-semibold text-zinc-900 tracking-tight text-lg">
            {user?.role === 'Security' ? 'Front Desk' : 'VMS'}
          </span>
        </div>
        
        <div className="flex items-center space-x-6">
          <span className="text-sm text-zinc-500">{todayStr}</span>
          <span className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full capitalize">
            {user?.role === 'Security' ? 'Front Desk' : user?.role}
          </span>
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center text-white font-medium text-sm">
              {user?.name?.charAt(0) || 'U'}
            </div>
            <button onClick={handleLogout} className="text-zinc-400 hover:text-red-500 transition-colors" title="Logout">
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-auto bg-white p-8">
        <div className="max-w-[1600px] mx-auto h-full">
          {/* We remove the "Dashboard Overview" global header because the mockup shows it inside the specific component */}
          {user?.role === 'Host' && <HostDashboard />}
          {user?.role === 'Security' && <SecurityDashboard />}
          {user?.role === 'Admin' && <AdminDashboard />}
        </div>
      </main>
    </div>
  );
}
