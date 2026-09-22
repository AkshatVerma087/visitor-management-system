import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, CheckCircle2, UserCircle, Camera, RefreshCcw } from 'lucide-react';
import Webcam from 'react-webcam';

export default function Kiosk() {
  const [hosts, setHosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    visitor_name: '',
    visitor_email: '',
    visitor_phone: '',
    company: '',
    purpose: '',
    host_id: '',
    photo_url: ''
  });

  const webcamRef = useRef(null);

  const capturePhoto = useCallback((e) => {
    e.preventDefault();
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setFormData(prev => ({ ...prev, photo_url: imageSrc }));
    }
  }, [webcamRef]);

  const retakePhoto = (e) => {
    e.preventDefault();
    setFormData(prev => ({ ...prev, photo_url: '' }));
  };

  useEffect(() => {
    // Fetch available hosts when kiosk loads
    fetch('http://localhost:4000/api/employees/hosts')
      .then(res => res.json())
      .then(data => setHosts(data))
      .catch(err => console.error('Failed to fetch hosts:', err));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('http://localhost:4000/api/visitors/walk-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Registration failed');
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          visitor_name: '', visitor_email: '', visitor_phone: '', company: '', purpose: '', host_id: ''
        });
      }, 5000); // Reset after 5 seconds

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
        <Card className="w-full max-w-md shadow-xl border-zinc-200 text-center py-12">
          <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold mb-2">You're all set!</CardTitle>
          <CardDescription className="text-lg">
            Your host has been notified. Please have a seat.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-lg shadow-xl border-zinc-200">
        <CardHeader className="text-center pb-6 border-b border-zinc-100">
          <div className="mx-auto w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
            <Building2 className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-3xl font-bold tracking-tight text-zinc-900">Welcome</CardTitle>
          <CardDescription className="text-zinc-500">
            Please register below to notify your host of your arrival
          </CardDescription>
        </CardHeader>
        
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4 pt-6">
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}
            
            <div className="space-y-2">
              <Label htmlFor="visitor_name">Full Name *</Label>
              <Input id="visitor_name" placeholder="Jane Doe" required value={formData.visitor_name} onChange={handleChange} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="visitor_email">Email *</Label>
                <Input id="visitor_email" type="email" placeholder="jane@example.com" required value={formData.visitor_email} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="visitor_phone">Phone</Label>
                <Input id="visitor_phone" type="tel" placeholder="(555) 000-0000" value={formData.visitor_phone} onChange={handleChange} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input id="company" placeholder="Acme Corp" value={formData.company} onChange={handleChange} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose of Visit</Label>
                <Input id="purpose" placeholder="Meeting" value={formData.purpose} onChange={handleChange} />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <Label htmlFor="host_id">Who are you visiting? *</Label>
              <div className="relative">
                <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 w-5 h-5" />
                <select 
                  id="host_id" 
                  className="pl-10 flex h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 shadow-sm"
                  required
                  value={formData.host_id}
                  onChange={handleChange}
                >
                  <option value="" disabled>Select your host...</option>
                  {hosts.map(host => (
                    <option key={host.id} value={host.id}>{host.name} ({host.office?.name})</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-2 pt-2 pb-4">
              <Label>Mandatory Security Photo *</Label>
              <div className="border border-zinc-200 rounded-lg overflow-hidden bg-zinc-100 flex flex-col items-center justify-center p-2 min-h-[240px]">
                {!formData.photo_url ? (
                  <>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      className="w-full max-w-[320px] rounded"
                      videoConstraints={{ facingMode: "user" }}
                    />
                    <Button onClick={capturePhoto} variant="secondary" className="mt-3 bg-white shadow-sm hover:bg-zinc-50 border border-zinc-200">
                      <Camera className="w-4 h-4 mr-2" /> Take Photo
                    </Button>
                  </>
                ) : (
                  <>
                    <img src={formData.photo_url} alt="Security snapshot" className="w-full max-w-[320px] rounded" />
                    <Button onClick={retakePhoto} variant="outline" className="mt-3 text-zinc-600">
                      <RefreshCcw className="w-4 h-4 mr-2" /> Retake
                    </Button>
                  </>
                )}
              </div>
            </div>

          </CardContent>
          <CardFooter className="pb-8">
            <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12 text-lg shadow-sm" disabled={loading || !formData.photo_url}>
              {loading ? 'Processing...' : 'Check In'}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
