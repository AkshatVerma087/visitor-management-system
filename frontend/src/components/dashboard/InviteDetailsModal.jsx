import { X, Calendar, Clock, MapPin, AlignLeft, Users, Mail, User } from 'lucide-react';
import { getImageUrl } from '../../config';

export default function InviteDetailsModal({ isOpen, onClose, invite }) {
  if (!isOpen || !invite) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600">
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <h2 className="text-2xl font-bold text-zinc-900 mb-2">{invite.event_title}</h2>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mb-6">
            {invite.visit_type}
          </span>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Date</p>
                  <p className="text-zinc-900">{new Date(invite.visit_date).toLocaleDateString([], { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Time Window</p>
                  <p className="text-zinc-900">
                    {new Date(invite.start_time).toLocaleTimeString([], { timeStyle: 'short' })} - {new Date(invite.end_time).toLocaleTimeString([], { timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <AlignLeft className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Notes</p>
                  <p className="text-zinc-900">{invite.note || 'No additional notes provided.'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Users className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Total Guests</p>
                  <p className="text-zinc-900">{invite.visits?.length || 0} Expected</p>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-100 pt-6">
            <h3 className="text-lg font-semibold text-zinc-900 mb-4">Guest List</h3>
            {invite.visits && invite.visits.length > 0 ? (
              <div className="space-y-3">
                {invite.visits.map(v => (
                  <div key={v.id} className="flex items-center p-4 bg-zinc-50 border border-zinc-200 rounded-lg">
                    {v.qr_code_url ? (
                      <img src={v.qr_code_url} alt="QR" className="w-16 h-16 mr-4 bg-white p-1 border border-zinc-200 rounded-md shadow-sm" />
                    ) : (
                      <div className="w-16 h-16 mr-4 bg-zinc-200 flex items-center justify-center rounded-md border border-zinc-300">
                        <User className="w-6 h-6 text-zinc-400" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-semibold text-zinc-900">{v.visitor_name}</p>
                      <div className="flex items-center text-sm text-zinc-500 mt-1">
                        <Mail className="w-4 h-4 mr-1" />
                        {v.visitor_email}
                      </div>
                      {v.company && <p className="text-sm text-zinc-500 mt-1">Company: {v.company}</p>}
                    </div>
                    <div>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        v.status === 'Approved' || v.status === 'CheckedIn' || v.status === 'CheckedOut' ? 'bg-green-100 text-green-800' : 
                        v.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
                        v.status === 'Pending' ? 'bg-blue-100 text-blue-800' : 'bg-zinc-100 text-zinc-800'
                      }`}>
                        {v.status === 'CheckedIn' || v.status === 'CheckedOut' ? 'Approved' : v.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-zinc-500 italic">No guests associated with this invite.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
