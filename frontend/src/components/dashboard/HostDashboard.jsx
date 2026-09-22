import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { Check, X, Clock, CalendarDays, User, Plus } from 'lucide-react';
import InviteVisitorModal from './InviteVisitorModal';

export default function HostDashboard() {
  const { user, token } = useAuth();
  const [visits, setVisits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

  // Fetch the current host's assigned visits from the API
  const fetchVisits = async () => {
    try {
      const res = await fetch('http://localhost:4000/api/visitors/host', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch visits');
      const data = await res.json();
      setVisits(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch of visits on component mount or token change
    fetchVisits();
    // In a real app we might poll or use websockets here for live updates
  }, [token]);

  // Handle the action of approving or rejecting a specific visit
  const handleDecision = async (visitId, decision) => {
    try {
      // Use random string as simple idempotency key for this demo
      const idempotency_key = `${visitId}-${decision}-${Date.now()}`;
      
      const res = await fetch(`http://localhost:4000/api/visitors/${visitId}/decision`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ decision, idempotency_key })
      });
      
      if (!res.ok) throw new Error('Failed to process decision');
      
      // Optimistically update the local state to reflect the change immediately
      setVisits(visits.map(v => v.id === visitId ? { ...v, status: decision } : v));
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading your visits...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  const pendingVisits = visits.filter(v => v.status === 'Pending');
  const pastVisits = visits.filter(v => v.status !== 'Pending');

  return (
    <div className="space-y-8">
      {/* Header Actions */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Host Dashboard</h1>
          <p className="text-zinc-500">Manage your upcoming and pending visits.</p>
        </div>
        <Button onClick={() => setIsInviteModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 shadow-sm">
          <Plus className="w-4 h-4 mr-2" />
          Pre-Register Visitor
        </Button>
      </div>

      <InviteVisitorModal 
        isOpen={isInviteModalOpen} 
        onClose={() => setIsInviteModalOpen(false)} 
        onSuccess={() => fetchVisits()}
      />

      {/* Action required section */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center">
          <Clock className="w-5 h-5 mr-2 text-blue-600" />
          Pending Approvals
          {pendingVisits.length > 0 && (
            <span className="ml-3 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {pendingVisits.length}
            </span>
          )}
        </h2>

        {pendingVisits.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center shadow-sm">
            <p className="text-zinc-500">No visitors waiting for approval right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pendingVisits.map(visit => (
              <div key={visit.id} className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-4">
                    {visit.photo_url ? (
                      <img src={visit.photo_url} alt="Visitor" className="w-12 h-12 rounded-full object-cover shadow-sm border border-zinc-200" />
                    ) : (
                      <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center border border-zinc-200">
                        <User className="w-6 h-6 text-zinc-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-zinc-900 text-lg">{visit.visitor_name}</h3>
                      <p className="text-sm text-zinc-500">{visit.company || 'No Company'} • {visit.purpose || 'No Purpose'}</p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(visit.expected_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div className="flex space-x-3 pt-3 border-t border-zinc-100">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                    onClick={() => handleDecision(visit.id, 'Approved')}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                    onClick={() => handleDecision(visit.id, 'Rejected')}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History section */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center">
          <CalendarDays className="w-5 h-5 mr-2 text-zinc-400" />
          Recent Activity
        </h2>
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
          {pastVisits.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No recent activity.</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {pastVisits.slice(0, 10).map(visit => (
                <div key={visit.id} className="p-4 flex items-center justify-between hover:bg-zinc-50 transition-colors">
                  <div>
                    <p className="font-medium text-zinc-900">{visit.visitor_name}</p>
                    <p className="text-sm text-zinc-500">{new Date(visit.expected_arrival).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      visit.status === 'Approved' ? 'bg-green-100 text-green-800' :
                      visit.status === 'Rejected' ? 'bg-red-100 text-red-800' :
                      'bg-zinc-100 text-zinc-800'
                    }`}>
                      {visit.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
