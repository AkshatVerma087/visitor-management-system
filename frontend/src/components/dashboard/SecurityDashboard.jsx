import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Filter, Plus, X, Clock, CheckCircle2, AlertCircle, ChevronDown } from 'lucide-react';
import { io } from 'socket.io-client';

// Helper component for status badges
const StatusBadge = ({ status }) => {
  const styles = {
    Approved: 'bg-green-100 text-green-700 before:bg-green-500',
    Pending: 'bg-yellow-100 text-yellow-700 before:bg-yellow-500',
    CheckedIn: 'bg-blue-100 text-blue-700 before:bg-blue-500',
    CheckedOut: 'bg-zinc-100 text-zinc-600 before:bg-zinc-400',
    Overstay: 'bg-red-100 text-red-700 before:bg-red-500',
    Rejected: 'bg-red-100 text-red-700 before:bg-red-500',
  };

  const displayNames = {
    Approved: 'Approved',
    Pending: 'Pending',
    CheckedIn: 'Checked in',
    CheckedOut: 'Checked out',
    Overstay: 'Overstay',
    Rejected: 'Rejected'
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium relative pl-4 ${styles[status] || styles.Pending}`}>
      <span className={`absolute left-1.5 w-1.5 h-1.5 rounded-full ${styles[status]?.split(' ')[2]}`}></span>
      {displayNames[status] || status}
    </span>
  );
};

export default function SecurityDashboard() {
  const { user, token } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [activeTab, setActiveTab] = useState('All visitors');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Fetch today's visitors
  const fetchTodayVisitors = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:4000/api/visitors/today', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch today\'s visitors');
      const data = await res.json();
      setVisitors(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Setup Socket.io connection and listeners
  useEffect(() => {
    fetchTodayVisitors();

    const socket = io('http://localhost:4000', {
      withCredentials: true,
    });

    const todayStr = new Date().toISOString().split('T')[0];

    socket.on('connect', () => {
      socket.emit('join:office', { officeId: user.office_id, date: todayStr });
    });

    socket.on('visit:updated', (updatedVisit) => {
      setVisitors(prev => {
        const exists = prev.find(v => v.id === updatedVisit.id);
        if (exists) {
          // Update selected visitor if they are currently open
          setSelectedVisitor(curr => curr?.id === updatedVisit.id ? updatedVisit : curr);
          return prev.map(v => v.id === updatedVisit.id ? updatedVisit : v);
        } else {
          return [...prev, updatedVisit].sort((a, b) => new Date(a.expected_arrival) - new Date(b.expected_arrival));
        }
      });
    });

    return () => socket.disconnect();
  }, [fetchTodayVisitors, user.office_id]);

  const handleManualCheckout = async (visitId) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`http://localhost:4000/api/visitors/${visitId}/checkout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Checkout failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualCheckIn = async (visitId) => {
    setIsProcessing(true);
    try {
      const res = await fetch(`http://localhost:4000/api/visitors/${visitId}/checkin`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Check-in failed');
      }
    } catch (err) {
      alert(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    return {
      pending: visitors.filter(v => v.status === 'Pending').length,
      active: visitors.filter(v => v.status === 'CheckedIn').length,
      total: visitors.length
    };
  }, [visitors]);

  // Filtering
  const filteredVisitors = useMemo(() => {
    let filtered = visitors;
    
    // Tab filter
    if (activeTab === 'Pending') filtered = filtered.filter(v => v.status === 'Pending');
    if (activeTab === 'Active') filtered = filtered.filter(v => v.status === 'CheckedIn');
    if (activeTab === 'Pre-approved') filtered = filtered.filter(v => v.status === 'Approved');

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v => 
        v.visitor_name.toLowerCase().includes(query) ||
        (v.visitor_email && v.visitor_email.toLowerCase().includes(query)) ||
        (v.visitor_phone && v.visitor_phone.toLowerCase().includes(query))
      );
    }
    
    return filtered;
  }, [visitors, activeTab, searchQuery]);

  const tabs = ['All visitors', 'Pending', 'Active', 'Pre-approved'];

  if (loading) return <div className="p-8 text-center text-zinc-500">Loading dashboard...</div>;

  return (
    <div className="flex flex-col h-full bg-white font-sans text-sm">
      
      {/* Top Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="border border-zinc-200 rounded-xl p-6">
          <p className="text-xs font-semibold text-zinc-500 tracking-wider mb-2 uppercase">Pending Approval</p>
          <div className="text-4xl font-light text-orange-500">{stats.pending}</div>
          <p className="text-xs text-zinc-400 mt-2">Waiting for host response</p>
        </div>
        <div className="border border-zinc-200 rounded-xl p-6">
          <p className="text-xs font-semibold text-zinc-500 tracking-wider mb-2 uppercase">Active Visitors</p>
          <div className="text-4xl font-light text-emerald-500">{stats.active}</div>
          <p className="text-xs text-zinc-400 mt-2">Currently checked in</p>
        </div>
        <div className="border border-zinc-200 rounded-xl p-6">
          <p className="text-xs font-semibold text-zinc-500 tracking-wider mb-2 uppercase">Total Today</p>
          <div className="text-4xl font-light text-zinc-900">{stats.total}</div>
          <p className="text-xs text-zinc-400 mt-2">Since 12:00 AM</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-zinc-200 mb-6 flex space-x-8">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-3 font-medium transition-colors ${
              activeTab === tab 
                ? 'border-b-2 border-blue-600 text-zinc-900' 
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <Input 
            placeholder="Search by name, email or phone" 
            className="pl-9 h-9 border-zinc-200"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="h-9 border-zinc-200 text-zinc-700">
            <Filter className="w-4 h-4 mr-2" /> Filter
          </Button>
          <Button size="sm" className="h-9 bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" /> Register visitor
          </Button>
        </div>
      </div>

      {/* Layout Split: Table and Panel */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Table Area */}
        <div className={`flex-1 transition-all duration-300 ${selectedVisitor ? 'pr-6' : ''}`}>
          <div className="border border-zinc-200 rounded-xl overflow-hidden bg-white">
            <table className="w-full text-left text-sm">
              <thead className="bg-zinc-50 border-b border-zinc-200 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Visitor</th>
                  <th className="px-6 py-4 font-semibold">Host</th>
                  <th className="px-6 py-4 font-semibold">Purpose</th>
                  <th className="px-6 py-4 font-semibold">Check-in</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {filteredVisitors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-zinc-400">
                      No visitors found.
                    </td>
                  </tr>
                ) : (
                  filteredVisitors.map(v => (
                    <tr 
                      key={v.id} 
                      className={`hover:bg-zinc-50 cursor-pointer transition-colors ${selectedVisitor?.id === v.id ? 'bg-blue-50/50' : ''}`}
                      onClick={() => setSelectedVisitor(v)}
                    >
                      <td className="px-6 py-4">
                        <div className="font-medium text-zinc-900">{v.visitor_name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{v.company || 'Walk-in'}</div>
                      </td>
                      <td className="px-6 py-4 text-zinc-700">{v.host?.name || 'N/A'}</td>
                      <td className="px-6 py-4">
                        <span className="font-medium text-zinc-700">{v.purpose || 'Meeting'}</span>
                      </td>
                      <td className="px-6 py-4 text-zinc-500">
                        {v.check_in_time 
                          ? new Date(v.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          : new Date(v.expected_arrival).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                        }
                      </td>
                      <td className="px-6 py-4">
                        <StatusBadge status={v.status} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button className="text-blue-600 font-medium hover:text-blue-800">View</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Guest Details Side Panel */}
        {selectedVisitor && (
          <div className="w-[400px] bg-white border border-zinc-200 rounded-xl flex flex-col shadow-sm flex-shrink-0 animate-in slide-in-from-right-8 fade-in">
            {/* Panel Header */}
            <div className="flex justify-between items-center p-5 border-b border-zinc-100">
              <h3 className="font-semibold text-zinc-900">Guest Details</h3>
              <div className="flex items-center space-x-3">
                <StatusBadge status={selectedVisitor.status} />
                <button onClick={() => setSelectedVisitor(null)} className="text-zinc-400 hover:text-zinc-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Panel Body */}
            <div className="p-6 flex-1 overflow-y-auto">
              {/* Avatars */}
              <div className="flex items-center justify-between mb-8 relative">
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-16 border-t border-dashed border-zinc-300"></div>
                
                <div className="text-center z-10 bg-white px-2">
                  {selectedVisitor.photo_url ? (
                    <img src={selectedVisitor.photo_url} alt="Visitor" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm mx-auto mb-2" />
                  ) : (
                    <div className="w-12 h-12 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2 shadow-sm border-2 border-white">
                      {selectedVisitor.visitor_name.charAt(0)}
                    </div>
                  )}
                  <p className="font-semibold text-zinc-900 text-sm truncate w-24">{selectedVisitor.visitor_name}</p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Guest</p>
                </div>
                
                <div className="text-center z-10 bg-white px-2">
                  <div className="w-12 h-12 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg mx-auto mb-2">
                    {selectedVisitor.host?.name?.charAt(0) || 'H'}
                  </div>
                  <p className="font-semibold text-zinc-900 text-sm truncate w-24">{selectedVisitor.host?.name}</p>
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide">Host</p>
                </div>
              </div>

              {/* Timeline */}
              <div className="relative pl-4 border-l border-zinc-200 space-y-6 mb-8 ml-2">
                <div className="relative">
                  <div className={`absolute -left-[21px] w-2.5 h-2.5 rounded-full ring-4 ring-white ${selectedVisitor.check_in_time ? 'bg-green-500' : 'bg-zinc-300'}`}></div>
                  <p className="font-medium text-zinc-900 text-sm leading-none mb-1">Check-In</p>
                  <p className="text-xs text-zinc-500">
                    {selectedVisitor.check_in_time 
                      ? new Date(selectedVisitor.check_in_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : 'Pending'}
                  </p>
                </div>
                <div className="relative">
                  <div className={`absolute -left-[21px] w-2.5 h-2.5 rounded-full ring-4 ring-white ${selectedVisitor.check_out_time ? 'bg-zinc-500' : 'bg-zinc-300'}`}></div>
                  <p className="font-medium text-zinc-900 text-sm leading-none mb-1">Check-Out</p>
                  <p className="text-xs text-zinc-500">
                    {selectedVisitor.check_out_time 
                      ? new Date(selectedVisitor.check_out_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                      : '--'}
                  </p>
                </div>
              </div>

              {/* Visit Info */}
              <div className="mb-6">
                <h4 className="font-semibold text-zinc-900 mb-1">{selectedVisitor.purpose || 'Walk In Visitor'}</h4>
                <p className="text-xs text-zinc-500 mb-2">
                  {new Date(selectedVisitor.expected_arrival).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>

              {/* Other Details */}
              <div className="border-t border-zinc-100 pt-4 mb-6">
                <div className="flex justify-between items-center mb-3 cursor-pointer">
                  <h4 className="font-medium text-zinc-900 flex items-center">
                    <span className="w-4 h-4 mr-2 inline-flex items-center justify-center border border-zinc-300 rounded text-[10px]">📄</span>
                    Other Details
                  </h4>
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                </div>
                <ul className="space-y-2 text-sm text-zinc-600 pl-6 list-disc marker:text-zinc-300">
                  <li><span className="font-medium">Company:</span> {selectedVisitor.company || 'N/A'}</li>
                  <li><span className="font-medium">Email:</span> {selectedVisitor.visitor_email}</li>
                  <li><span className="font-medium">Phone:</span> {selectedVisitor.visitor_phone || 'N/A'}</li>
                </ul>
              </div>

              {/* Additional Information */}
              <div>
                <label className="block text-xs font-medium text-zinc-700 mb-2">Additional Information</label>
                <textarea 
                  className="w-full bg-zinc-50 border border-zinc-200 rounded-lg p-3 text-sm min-h-[100px] resize-none focus:outline-none focus:ring-1 focus:ring-blue-500"
                  placeholder="Input text"
                ></textarea>
                <p className="text-right text-[10px] text-zinc-400 mt-1">0/1000</p>
              </div>
            </div>

            {/* Panel Footer */}
            <div className="p-4 border-t border-zinc-100 bg-zinc-50 rounded-b-xl flex justify-center">
              {selectedVisitor.status === 'CheckedIn' ? (
                <Button 
                  className="w-full bg-[#0a235c] hover:bg-blue-900 text-white rounded-lg"
                  onClick={() => handleManualCheckout(selectedVisitor.id)}
                  disabled={isProcessing}
                >
                  Check-Out
                </Button>
              ) : selectedVisitor.status === 'Approved' ? (
                <Button 
                  className="w-full bg-green-600 hover:bg-green-700 text-white rounded-lg"
                  onClick={() => handleManualCheckIn(selectedVisitor.id)}
                  disabled={isProcessing}
                >
                  Check-In Visitor
                </Button>
              ) : selectedVisitor.status === 'Pending' ? (
                <p className="text-sm text-zinc-500 italic">Waiting for host approval.</p>
              ) : (
                <p className="text-sm text-zinc-500 italic">Visit completed.</p>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
