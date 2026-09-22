import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { admin } from '../../api';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Users, BarChart3, Clock, CheckCircle2, Shield, Calendar } from 'lucide-react';

export default function AdminDashboard() {
  const { token } = useAuth();
  const [stats, setStats] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    const fetchAdminData = async () => {
      try {
        const [statsData, employeesData, approvalsData] = await Promise.all([
          admin.getStats(),
          admin.getEmployees(),
          admin.getApprovals()
        ]);

        setStats(statsData);
        setEmployees(employeesData);
        setApprovals(approvalsData);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminData();
  }, [token]);

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading admin view...</div>;
  if (error) return <div className="p-8 text-center text-red-500 bg-red-50 rounded-xl">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-zinc-900">Admin Overview</h2>
        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
          <Shield className="w-3 h-3 mr-1" />
          God Mode
        </span>
      </div>

      {/* Analytics Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Visitors Today</CardTitle>
              <Users className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.visitorsToday}</div>
              <p className="text-xs text-zinc-500">{stats.visitorsThisWeek} this week</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active (Checked In)</CardTitle>
              <CheckCircle2 className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeVisits}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <Clock className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pendingVisits}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
              <Shield className="h-4 w-4 text-zinc-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalEmployees}</div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Employees Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Employee Directory</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 uppercase bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Office</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 font-medium text-zinc-900">{emp.name}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex px-2 py-0.5 rounded text-xs ${
                          emp.role === 'Admin' ? 'bg-purple-100 text-purple-700' :
                          emp.role === 'Security' ? 'bg-blue-100 text-blue-700' :
                          'bg-zinc-100 text-zinc-700'
                        }`}>
                          {emp.role}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-zinc-500">{emp.office?.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Audit Log Table */}
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent Approvals Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-zinc-500 uppercase bg-zinc-50">
                  <tr>
                    <th className="px-4 py-3">Time</th>
                    <th className="px-4 py-3">Visitor</th>
                    <th className="px-4 py-3">Host</th>
                    <th className="px-4 py-3">Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {approvals.map(approval => (
                    <tr key={approval.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-3 text-zinc-500">
                        {new Date(approval.decided_at).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="px-4 py-3 font-medium text-zinc-900">
                        {approval.visit?.visitor_name}
                      </td>
                      <td className="px-4 py-3">{approval.decider?.name}</td>
                      <td className="px-4 py-3">
                        <span className={approval.decision === 'Approved' ? 'text-green-600' : 'text-red-600'}>
                          {approval.decision}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {approvals.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-4 py-8 text-center text-zinc-500">
                        No approvals recorded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
