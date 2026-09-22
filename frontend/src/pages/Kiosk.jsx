import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, CheckCircle2, UserCircle, Camera, RefreshCcw, QrCode, ClipboardList, XCircle } from 'lucide-react';
import Webcam from 'react-webcam';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { visitors, employees } from '../api';

export default function Kiosk() {
  // ---- Mode toggle: "walkin" for manual form, "qrscan" for pre-approved QR scan ----
  const [mode, setMode] = useState('walkin');

  // ---- Walk-in form state ----
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
    photo_url: '',
    duration_hours: '1'
  });

  const webcamRef = useRef(null);

  // ---- QR scan state ----
  const [scanResult, setScanResult] = useState(null); // { success: bool, message: string }
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef(null);

  // ---- Check-out state ----
  const [checkoutEmail, setCheckoutEmail] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // Capture photo from webcam
  const capturePhoto = useCallback((e) => {
    e.preventDefault();
    if (webcamRef.current) {
      const imageSrc = webcamRef.current.getScreenshot();
      setFormData(prev => ({ ...prev, photo_url: imageSrc }));
    }
  }, [webcamRef]);

  // Retake photo — clear the captured image
  const retakePhoto = (e) => {
    e.preventDefault();
    setFormData(prev => ({ ...prev, photo_url: '' }));
  };

  // Fetch available hosts when kiosk loads (needed for walk-in form dropdown)
  useEffect(() => {
    employees.getHosts()
      .then(data => setHosts(data))
      .catch(err => console.error('Failed to fetch hosts:', err));
  }, []);

  // ---- QR Scanner setup and cleanup ----
  useEffect(() => {
    // Only initialize the scanner when in QR mode
    if (mode !== 'qrscan') return;

    // Small delay to let the DOM mount the scanner container
    const timer = setTimeout(() => {
      const scanner = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        rememberLastUsedCamera: true
      }, false); // false = don't start automatically

      scanner.render(
        // On successful QR decode — attempt check-in
        async (decodedText) => {
          // Stop scanning to prevent duplicate calls
          scanner.clear().catch(() => {});
          setScanning(true);

          try {
            // The QR code contains the visit UUID — call the check-in API
            const data = await visitors.qrCheckIn(decodedText);

            // Show success screen
            setScanResult({ success: true, message: `Welcome, ${data.visitor_name}! You are checked in.` });
          } catch (err) {
            setScanResult({ success: false, message: err.message });
          } finally {
            setScanning(false);
          }
        },
        // On scan error (silent — user hasn't aimed camera yet)
        () => {}
      );

      scannerRef.current = scanner;
    }, 100);

    // Cleanup scanner when leaving QR mode or unmounting
    return () => {
      clearTimeout(timer);
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, [mode]);

  // Handle walk-in form field changes
  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  // Submit walk-in registration form
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = await visitors.registerWalkIn(formData);
      
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        setFormData({
          visitor_name: '', visitor_email: '', visitor_phone: '', company: '', purpose: '', host_id: '', photo_url: ''
        });
      }, 5000); // Reset after 5 seconds

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Submit check-out form
  const handleCheckoutSubmit = async (e) => {
    e.preventDefault();
    setCheckoutLoading(true);
    setError('');

    try {
      const data = await visitors.kioskCheckout({ email: checkoutEmail });
      setScanResult({ success: true, message: `Goodbye, ${data.visitor_name}! You are successfully checked out.` });
      setCheckoutEmail('');
    } catch (err) {
      setScanResult({ success: false, message: err.message });
    } finally {
      setCheckoutLoading(false);
    }
  };

  // ---- Success screen (shown after walk-in registration) ----
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
            {mode === 'walkin' ? 'Please register below to notify your host of your arrival' :
             mode === 'qrscan' ? 'Scan your QR e-pass for instant check-in' :
             'Enter your email to check out'}
          </CardDescription>

          {/* ---- Mode toggle buttons ---- */}
          <div className="flex gap-2 mt-4 justify-center">
            <Button
              variant={mode === 'walkin' ? 'default' : 'outline'}
              className={mode === 'walkin' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-zinc-600'}
              onClick={() => { setMode('walkin'); setScanResult(null); }}
            >
              <ClipboardList className="w-4 h-4 mr-2" /> Walk-In
            </Button>
            <Button
              variant={mode === 'qrscan' ? 'default' : 'outline'}
              className={mode === 'qrscan' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-zinc-600'}
              onClick={() => { setMode('qrscan'); setScanResult(null); }}
            >
              <QrCode className="w-4 h-4 mr-2" /> Scan QR
            </Button>
            <Button
              variant={mode === 'checkout' ? 'default' : 'outline'}
              className={mode === 'checkout' ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'text-zinc-600'}
              onClick={() => { setMode('checkout'); setScanResult(null); setError(''); }}
            >
              <CheckCircle2 className="w-4 h-4 mr-2" /> Check Out
            </Button>
          </div>
        </CardHeader>

        {/* ==================== QR SCAN MODE ==================== */}
        {mode === 'qrscan' && (
          <CardContent className="pt-6 pb-8">
            {scanResult ? (
              // Show result after scanning
              <div className="text-center py-8">
                {scanResult.success ? (
                  <>
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-xl font-bold text-zinc-900 mb-2">Checked In!</p>
                    <p className="text-zinc-500">{scanResult.message}</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <p className="text-xl font-bold text-zinc-900 mb-2">Check-In Failed</p>
                    <p className="text-red-600 mb-4">{scanResult.message}</p>
                  </>
                )}
                <Button
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => { setScanResult(null); setMode('qrscan'); }}
                >
                  Scan Another
                </Button>
              </div>
            ) : (
              // Show the QR camera scanner
              <div>
                {scanning && (
                  <p className="text-center text-zinc-500 mb-4">Processing check-in...</p>
                )}
                <div id="qr-reader" className="rounded-lg overflow-hidden"></div>
                <p className="text-sm text-zinc-400 text-center mt-4">
                  Point your camera at the QR code on your e-pass
                </p>
              </div>
            )}
          </CardContent>
        )}

        {/* ==================== WALK-IN FORM MODE ==================== */}
        {mode === 'walkin' && (
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

              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
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
                <div className="space-y-2">
                  <Label htmlFor="duration_hours">Expected Duration *</Label>
                  <select 
                    id="duration_hours" 
                    className="flex h-10 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-950 shadow-sm"
                    required
                    value={formData.duration_hours}
                    onChange={handleChange}
                  >
                    <option value="1">1 Hour</option>
                    <option value="2">2 Hours</option>
                    <option value="4">4 Hours</option>
                    <option value="8">Full Day (8 Hours)</option>
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
        )}

        {/* ==================== CHECK-OUT MODE ==================== */}
        {mode === 'checkout' && (
          <CardContent className="pt-6 pb-8">
            {scanResult ? (
              <div className="text-center py-8">
                {scanResult.success ? (
                  <>
                    <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                    <p className="text-xl font-bold text-zinc-900 mb-2">Checked Out!</p>
                    <p className="text-zinc-500">{scanResult.message}</p>
                  </>
                ) : (
                  <>
                    <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                    <p className="text-xl font-bold text-zinc-900 mb-2">Check-Out Failed</p>
                    <p className="text-red-600 mb-4">{scanResult.message}</p>
                  </>
                )}
                <Button
                  className="mt-6 bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => { setScanResult(null); }}
                >
                  Back
                </Button>
              </div>
            ) : (
              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-md text-sm">{error}</div>}
                <div className="space-y-2">
                  <Label htmlFor="checkout_email">Email Address</Label>
                  <Input 
                    id="checkout_email" 
                    type="email" 
                    placeholder="Enter your email to check out" 
                    required 
                    value={checkoutEmail} 
                    onChange={(e) => setCheckoutEmail(e.target.value)} 
                  />
                </div>
                <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-12" disabled={checkoutLoading || !checkoutEmail}>
                  {checkoutLoading ? 'Processing...' : 'Check Out Now'}
                </Button>
              </form>
            )}
          </CardContent>
        )}
      </Card>
    </div>
  );
}
