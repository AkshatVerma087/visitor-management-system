import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '../../context/AuthContext';
import { visitors, invites as invitesApi } from '../../api';
import { getSocket } from '../../api/socket';
import { getImageUrl } from '../../config';
import { Check, X, Clock, CalendarDays, User, Plus, Loader2, History } from 'lucide-react';
import { toast } from 'sonner';
import InviteVisitorModal from './InviteVisitorModal';
import VisitDetailsModal from './VisitDetailsModal';
import InviteDetailsModal from './InviteDetailsModal';

export default function HostDashboard() {
  const { user, token } = useAuth();
  const [visits, setVisits] = useState([]);
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [selectedInvite, setSelectedInvite] = useState(null);
  const [processingAction, setProcessingAction] = useState({ id: null, action: null });

  // Fetch the current host's assigned visits from the API
  const fetchVisitsAndInvites = async () => {
    try {
      const [visitsData, invitesData] = await Promise.all([
        visitors.getHostVisits(),
        invitesApi.getInvites()
      ]);
      setVisits(visitsData);
      setInvites(invitesData);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch of visits on component mount
    fetchVisitsAndInvites();

    // Connect to Socket.io for real-time updates (same pattern as SecurityDashboard)
    const socket = getSocket();
    const todayStr = new Date().toISOString().split('T')[0];

    const handleConnect = () => {
      socket.emit('join:office', { officeId: user.office_id, date: todayStr });
    };

    if (socket.connected) {
      handleConnect();
    }
    socket.on('connect', handleConnect);

    const handleVisitUpdated = (updatedVisit) => {
      if (updatedVisit.host_id !== user.id) return;

      setVisits(prev => {
        const exists = prev.find(v => v.id === updatedVisit.id);
        if (exists) {
          return prev.map(v => v.id === updatedVisit.id ? updatedVisit : v);
        } else {
          return [updatedVisit, ...prev];
        }
      });
    };
    socket.on('visit:updated', handleVisitUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('visit:updated', handleVisitUpdated);
    };
  }, [token, user.office_id, user.id]);

  // Handle the action of approving or rejecting a specific visit
  const handleDecision = async (visitId, decision) => {
    setProcessingAction({ id: visitId, action: decision });
    try {
      const idempotency_key = crypto.randomUUID(); // Generate unique key for idempotency
      const data = await visitors.decision(visitId, { decision, idempotency_key });
      
      setVisits(prev => prev.map(v => 
        v.id === visitId ? { ...v, status: data.status } : v
      ));
      toast.success(`Visitor ${decision.toLowerCase()} successfully`);
    } catch (err) {
      toast.error(`Error: ${err.message}`);
    } finally {
      setProcessingAction({ id: null, action: null });
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-zinc-500">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
      <p>Loading your visits...</p>
    </div>
  );
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
        onSuccess={() => fetchVisitsAndInvites()}
      />

      <VisitDetailsModal 
        isOpen={!!selectedVisit}
        visit={selectedVisit}
        onClose={() => setSelectedVisit(null)}
      />

      <InviteDetailsModal 
        isOpen={!!selectedInvite}
        invite={selectedInvite}
        onClose={() => setSelectedInvite(null)}
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
              <div 
                key={visit.id} 
                className="bg-white border border-zinc-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                onClick={() => setSelectedVisit(visit)}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center space-x-4">
                    {visit.photo_url ? (
                      <img src={getImageUrl(visit.photo_url)} alt="Visitor" className="w-12 h-12 rounded-full object-cover shadow-sm border border-zinc-200" onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(visit.visitor_name)}&background=e0f2fe&color=0369a1`; }} />
                    ) : (
                      <div className="w-12 h-12 bg-zinc-100 rounded-full flex items-center justify-center border border-zinc-200">
                        <User className="w-6 h-6 text-zinc-400" />
                      </div>
                    )}
                    <div>
                      <h3 className="font-semibold text-zinc-900 text-lg">{visit.visitor_name}</h3>
                      <p className="text-sm text-zinc-500">
                        {visit.company || 'No Company'} • {visit.purpose || 'No Purpose'}
                      </p>
                      <p className="text-xs text-zinc-400 mt-1">
                        Duration: {
                          visit.expected_end_time 
                            ? Math.round((new Date(visit.expected_end_time) - new Date(visit.expected_arrival)) / 3600000) 
                            : 1
                        } Hour(s)
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-zinc-400">
                    {new Date(visit.expected_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                
                <div className="flex space-x-3 pt-3 border-t border-zinc-100">
                  <Button 
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white shadow-sm"
                    onClick={(e) => { e.stopPropagation(); handleDecision(visit.id, 'Approved'); }}
                    isLoading={processingAction.id === visit.id && processingAction.action === 'Approved'}
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button 
                    variant="outline"
                    className="flex-1 text-red-600 hover:bg-red-50 hover:text-red-700 border-red-200"
                    onClick={(e) => { e.stopPropagation(); handleDecision(visit.id, 'Rejected'); }}
                    isLoading={processingAction.id === visit.id && processingAction.action === 'Rejected'}
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

      {/* History section (Invites) */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center">
          <CalendarDays className="w-5 h-5 mr-2 text-zinc-400" />
          My Scheduled Invites
        </h2>
        <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden shadow-sm">
          {invites.length === 0 ? (
            <div className="p-8 text-center text-zinc-500">No scheduled invites found.</div>
          ) : (
            <div className="divide-y divide-zinc-100">
              {invites.map(invite => (
                <div 
                  key={invite.id} 
                  className="p-4 flex flex-col hover:bg-zinc-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedInvite(invite)}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold text-zinc-900 text-base">{invite.event_title}</p>
                      <p className="text-sm text-zinc-500">
                        {new Date(invite.visit_date).toLocaleDateString()} • {new Date(invite.start_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})} - {new Date(invite.end_time).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}
                      </p>
                    </div>
                    <div>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {invite.visits?.length || 0} Visitors
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Past Decisions / History Section */}
      <div>
        <h2 className="text-lg font-semibold text-zinc-900 mb-4 flex items-center">
          <History className="w-5 h-5 mr-2 text-zinc-400" />
          Past Decisions
        </h2>
        
        {pastVisits.length === 0 ? (
          <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center shadow-sm">
            <p className="text-zinc-500">No past decisions yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {pastVisits.map(visit => (
              <div 
                key={visit.id} 
                className="bg-white border border-zinc-200 rounded-xl p-5 flex items-center justify-between shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setSelectedVisit(visit)}
              >
                <div className="flex items-center space-x-4">
                  {visit.photo_url ? (
                    <img src={getImageUrl(visit.photo_url)} alt="Visitor" className="w-10 h-10 rounded-full object-cover shadow-sm border border-zinc-200" onError={(e) => { e.target.onerror = null; e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(visit.visitor_name)}&background=e0f2fe&color=0369a1`; }} />
                  ) : (
                    <div className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center border border-zinc-200">
                      <User className="w-5 h-5 text-zinc-400" />
                    </div>
                  )}
                  <div>
                    <h3 className="font-semibold text-zinc-900">{visit.visitor_name}</h3>
                    <p className="text-sm text-zinc-500">{new Date(visit.created_at || visit.expected_arrival).toLocaleDateString()} • {visit.company || 'Walk-in'}</p>
                  </div>
                </div>
                
                <div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    visit.status === 'Approved' || visit.status === 'CheckedIn' || visit.status === 'CheckedOut' ? 'bg-green-100 text-green-800' : 
                    visit.status === 'Rejected' ? 'bg-red-100 text-red-800' : 'bg-zinc-100 text-zinc-800'
                  }`}>
                    {visit.status === 'CheckedIn' || visit.status === 'CheckedOut' ? 'Approved' : visit.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
