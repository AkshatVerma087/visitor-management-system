import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus, Trash2, Mail } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function InviteVisitorModal({ isOpen, onClose, onSuccess }) {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // New invite state
  const [inviteData, setInviteData] = useState({
    event_title: '',
    visit_date: '',
    start_time: '',
    end_time: '',
    note: ''
  });
  
  // List of visitors for this invite
  const [visitors, setVisitors] = useState([{ visitor_name: '', visitor_email: '', company: '' }]);
  
  // Generated QRs to show after success
  const [generatedQRs, setGeneratedQRs] = useState(null);

  if (!isOpen) return null;

  const handleInviteChange = (e) => setInviteData({ ...inviteData, [e.target.id]: e.target.value });
  
  const handleVisitorChange = (index, field, value) => {
    const newVisitors = [...visitors];
    newVisitors[index][field] = value;
    setVisitors(newVisitors);
  };

  const addVisitorRow = () => {
    setVisitors([...visitors, { visitor_name: '', visitor_email: '', company: '' }]);
  };

  const removeVisitorRow = (index) => {
    setVisitors(visitors.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:4000/api/invites', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ ...inviteData, visitors })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create invite');
      
      // Successfully created, show the QR codes generated
      setGeneratedQRs(data.visits);
      
      if (onSuccess) {
        onSuccess(data); // Refresh dashboard lists
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetAndClose = () => {
    setInviteData({ event_title: '', visit_date: '', start_time: '', end_time: '', note: '' });
    setVisitors([{ visitor_name: '', visitor_email: '', company: '' }]);
    setGeneratedQRs(null);
    setError('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative">
        <button onClick={resetAndClose} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600">
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-zinc-900 mb-6">
            {generatedQRs ? 'Invites Sent successfully!' : 'Pre-Register Visitors'}
          </h2>

          {error && <div className="mb-6 p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}

          {generatedQRs ? (
            <div className="space-y-6">
              <p className="text-zinc-600">
                The following QR codes have been "emailed" to your guests. They can scan these at the Front Desk Kiosk to bypass the queue.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {generatedQRs.map(visit => (
                  <div key={visit.id} className="border border-zinc-200 rounded-lg p-4 flex flex-col items-center">
                    <p className="font-semibold text-zinc-900 mb-2">{visit.visitor_name}</p>
                    <img src={visit.qr_code} alt="QR Code" className="w-32 h-32 mb-2" />
                    <p className="text-xs text-zinc-400 text-center flex items-center">
                      <Mail className="w-3 h-3 mr-1" />
                      Sent to {visit.visitor_email}
                    </p>
                  </div>
                ))}
              </div>
              <Button onClick={resetAndClose} className="w-full">Done</Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Event Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-zinc-900 border-b border-zinc-100 pb-2">Event Details</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="event_title">Meeting / Event Title</Label>
                    <Input id="event_title" required value={inviteData.event_title} onChange={handleInviteChange} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="visit_date">Date</Label>
                    <Input type="date" id="visit_date" required value={inviteData.visit_date} onChange={handleInviteChange} />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-2">
                      <Label htmlFor="start_time">Start Time</Label>
                      <Input type="time" id="start_time" required value={inviteData.start_time} onChange={handleInviteChange} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="end_time">End Time</Label>
                      <Input type="time" id="end_time" required value={inviteData.end_time} onChange={handleInviteChange} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Visitors List */}
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-zinc-100 pb-2">
                  <h3 className="font-semibold text-zinc-900">Guest List</h3>
                  <Button type="button" variant="outline" size="sm" onClick={addVisitorRow}>
                    <Plus className="w-4 h-4 mr-2" /> Add Guest
                  </Button>
                </div>
                
                {visitors.map((visitor, index) => (
                  <div key={index} className="flex items-start space-x-3 bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Input placeholder="Name" required value={visitor.visitor_name} onChange={e => handleVisitorChange(index, 'visitor_name', e.target.value)} />
                      <Input type="email" placeholder="Email" required value={visitor.visitor_email} onChange={e => handleVisitorChange(index, 'visitor_email', e.target.value)} />
                      <Input placeholder="Company (Opt)" value={visitor.company} onChange={e => handleVisitorChange(index, 'company', e.target.value)} />
                    </div>
                    {visitors.length > 1 && (
                      <Button type="button" variant="ghost" className="text-red-500 hover:bg-red-50 hover:text-red-600 px-2" onClick={() => removeVisitorRow(index)}>
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-zinc-200 flex justify-end space-x-3">
                <Button type="button" variant="ghost" onClick={resetAndClose}>Cancel</Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700" disabled={loading}>
                  {loading ? 'Processing...' : 'Send Invites'}
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
