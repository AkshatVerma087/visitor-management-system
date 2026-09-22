import { X, User, Phone, Mail, Building, FileText, Clock, Calendar } from 'lucide-react';
import { getImageUrl } from '../../config';

export default function VisitDetailsModal({ isOpen, onClose, visit }) {
  if (!isOpen || !visit) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto relative"
        onClick={e => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute right-4 top-4 text-zinc-400 hover:text-zinc-600">
          <X className="w-5 h-5" />
        </button>

        <div className="p-8">
          <div className="flex flex-col items-center mb-6">
            {visit.photo_url ? (
              <img src={getImageUrl(visit.photo_url)} alt="Visitor" className="w-24 h-24 rounded-full object-cover shadow-md border-2 border-zinc-100 mb-4" />
            ) : (
              <div className="w-24 h-24 bg-zinc-100 rounded-full flex items-center justify-center border-2 border-zinc-200 mb-4">
                <User className="w-10 h-10 text-zinc-400" />
              </div>
            )}
            <h2 className="text-2xl font-bold text-zinc-900">{visit.visitor_name}</h2>
            <span className={`mt-2 inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              visit.status === 'Approved' || visit.status === 'CheckedIn' || visit.status === 'CheckedOut' ? 'bg-green-100 text-green-800' : 
              visit.status === 'Rejected' ? 'bg-red-100 text-red-800' : 
              visit.status === 'Pending' ? 'bg-blue-100 text-blue-800' : 'bg-zinc-100 text-zinc-800'
            }`}>
              {visit.status === 'CheckedIn' || visit.status === 'CheckedOut' ? 'Approved' : visit.status}
            </span>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start space-x-3">
                <Mail className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Email</p>
                  <p className="text-zinc-900">{visit.visitor_email}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Phone className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Phone</p>
                  <p className="text-zinc-900">{visit.visitor_phone || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Building className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Company</p>
                  <p className="text-zinc-900">{visit.company || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <FileText className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Purpose</p>
                  <p className="text-zinc-900">{visit.purpose || 'N/A'}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Expected Arrival</p>
                  <p className="text-zinc-900">{new Date(visit.expected_arrival).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Clock className="w-5 h-5 text-zinc-400 mt-0.5" />
                <div>
                  <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">Duration</p>
                  <p className="text-zinc-900">{visit.expected_end_time ? Math.round((new Date(visit.expected_end_time) - new Date(visit.expected_arrival)) / 3600000) : 1} Hour(s)</p>
                </div>
              </div>
            </div>
            
            {(visit.check_in_time || visit.check_out_time) && (
              <div className="mt-6 pt-4 border-t border-zinc-100">
                <h3 className="text-sm font-semibold text-zinc-900 mb-3">Timeline</h3>
                <div className="space-y-2">
                  {visit.check_in_time && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Checked In</span>
                      <span className="text-zinc-900">{new Date(visit.check_in_time).toLocaleString([], { timeStyle: 'short' })}</span>
                    </div>
                  )}
                  {visit.check_out_time && (
                    <div className="flex justify-between text-sm">
                      <span className="text-zinc-500">Checked Out</span>
                      <span className="text-zinc-900">{new Date(visit.check_out_time).toLocaleString([], { timeStyle: 'short' })}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
