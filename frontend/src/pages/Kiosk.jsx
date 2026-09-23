import { useState, useEffect, useRef, useCallback } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, CheckCircle2, UserCircle, Camera, RefreshCcw, QrCode, ClipboardList, XCircle, ShieldCheck } from 'lucide-react';
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
      <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-md shadow-lg border-border text-center py-12 bg-card">
          <CheckCircle2 className="w-16 h-16 text-primary mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold mb-2">You're all set!</CardTitle>
          <CardDescription className="text-lg">
            Your host has been notified. Please have a seat.
          </CardDescription>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4 md:p-8 font-sans">
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8 items-start">
        
        {/* LEFT COLUMN: Main Form Area */}
        <Card className="shadow-lg border-border bg-card overflow-hidden">
          
          {/* Top Navigation Pill */}
          <div className="p-4 border-b border-border flex justify-center bg-background">
            <div className="flex bg-muted p-1 rounded-lg">
              <button
                type="button"
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'walkin' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => { setMode('walkin'); setScanResult(null); }}
              >
                <ClipboardList className="w-4 h-4 inline-block mr-2" /> Walk-In
              </button>
              <button
                type="button"
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'qrscan' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => { setMode('qrscan'); setScanResult(null); }}
              >
                <QrCode className="w-4 h-4 inline-block mr-2" /> Scan QR
              </button>
              <button
                type="button"
                className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${mode === 'checkout' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => { setMode('checkout'); setScanResult(null); setError(''); }}
              >
                <CheckCircle2 className="w-4 h-4 inline-block mr-2" /> Check Out
              </button>
            </div>
          </div>

          {/* Welcome Header */}
          <div className="text-center py-8 px-6 border-b border-border bg-card">
            <div className="mx-auto w-14 h-14 bg-primary/10 rounded-2xl flex items-center justify-center mb-4">
              <ShieldCheck className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground mb-2">Welcome</h1>
            <p className="text-sm text-muted-foreground">
              {mode === 'walkin' ? 'Please register below to notify your host of your arrival' :
               mode === 'qrscan' ? 'Scan your QR e-pass for instant check-in' :
               'Enter your email to check out'}
            </p>
          </div>

          {/* ==================== QR SCAN MODE ==================== */}
          {mode === 'qrscan' && (
            <div className="p-8">
              {scanResult ? (
                <div className="text-center py-8">
                  {scanResult.success ? (
                    <>
                      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <p className="text-xl font-bold text-foreground mb-2">Checked In!</p>
                      <p className="text-muted-foreground">{scanResult.message}</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                      <p className="text-xl font-bold text-foreground mb-2">Check-In Failed</p>
                      <p className="text-red-600 mb-4">{scanResult.message}</p>
                    </>
                  )}
                  <Button
                    className="mt-6"
                    onClick={() => { setScanResult(null); setMode('qrscan'); }}
                  >
                    Scan Another
                  </Button>
                </div>
              ) : (
                <div>
                  {scanning && (
                    <p className="text-center text-muted-foreground mb-4">Processing check-in...</p>
                  )}
                  <div id="qr-reader" className="rounded-lg overflow-hidden border border-border"></div>
                  <p className="text-sm text-muted-foreground text-center mt-4">
                    Point your camera at the QR code on your e-pass
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ==================== WALK-IN FORM MODE ==================== */}
          {mode === 'walkin' && (
            <form onSubmit={handleSubmit} className="divide-y divide-border">
              {error && <div className="p-4 bg-red-50 text-red-600 text-sm border-b border-red-100">{error}</div>}
              
              {/* SECTION: YOUR DETAILS */}
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <h3 className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Your Details</h3>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="visitor_name">Full Name *</Label>
                    <Input id="visitor_name" placeholder="Jane Doe" required value={formData.visitor_name} onChange={handleChange} className="shadow-none bg-background" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="visitor_email">Email *</Label>
                      <Input id="visitor_email" type="email" placeholder="jane@example.com" required value={formData.visitor_email} onChange={handleChange} className="shadow-none bg-background" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="visitor_phone">Phone</Label>
                      <Input id="visitor_phone" type="tel" placeholder="(555) 000-0000" value={formData.visitor_phone} onChange={handleChange} className="shadow-none bg-background" />
                    </div>
                  </div>
                </div>
              </div>

              {/* SECTION: VISIT DETAILS */}
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <h3 className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Visit Details</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input id="company" placeholder="Acme Corp" value={formData.company} onChange={handleChange} className="shadow-none bg-background" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="purpose">Purpose of Visit</Label>
                    <Input id="purpose" placeholder="Meeting" value={formData.purpose} onChange={handleChange} className="shadow-none bg-background" />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="host_id">Who are you visiting? *</Label>
                    <div className="relative">
                      <UserCircle className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                      <select 
                        id="host_id" 
                        className="pl-9 flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
                      className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
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
              </div>

              {/* SECTION: SECURITY PHOTO */}
              <div className="p-8 space-y-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-primary" />
                  <h3 className="text-xs font-bold text-muted-foreground tracking-widest uppercase">Security Photo</h3>
                </div>
                
                <div className="space-y-2">
                  <div className="border border-border rounded-lg overflow-hidden bg-muted/50 flex flex-col items-center justify-center p-4 min-h-[240px]">
                    {!formData.photo_url ? (
                      <>
                        <Webcam
                          audio={false}
                          ref={webcamRef}
                          screenshotFormat="image/jpeg"
                          className="w-full max-w-[280px] rounded border border-border shadow-sm mb-4"
                          videoConstraints={{ facingMode: "user" }}
                        />
                        <Button type="button" onClick={capturePhoto} variant="secondary" className="bg-background shadow-none border border-border">
                          <Camera className="w-4 h-4 mr-2" /> Take Photo
                        </Button>
                      </>
                    ) : (
                      <>
                        <img src={formData.photo_url} alt="Security snapshot" className="w-full max-w-[280px] rounded border border-border shadow-sm mb-4" />
                        <Button type="button" onClick={retakePhoto} variant="outline" className="shadow-none">
                          <RefreshCcw className="w-4 h-4 mr-2" /> Retake
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* SUBMIT */}
              <div className="p-8 bg-muted/30">
                <Button type="submit" className="w-full font-semibold h-12 text-lg" disabled={loading || !formData.photo_url}>
                  {loading ? 'Processing...' : 'Complete Check In'}
                </Button>
              </div>
            </form>
          )}

          {/* ==================== CHECK-OUT MODE ==================== */}
          {mode === 'checkout' && (
            <div className="p-8">
              {scanResult ? (
                <div className="text-center py-8">
                  {scanResult.success ? (
                    <>
                      <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-4" />
                      <p className="text-xl font-bold text-foreground mb-2">Checked Out!</p>
                      <p className="text-muted-foreground">{scanResult.message}</p>
                    </>
                  ) : (
                    <>
                      <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
                      <p className="text-xl font-bold text-foreground mb-2">Check-Out Failed</p>
                      <p className="text-red-600 mb-4">{scanResult.message}</p>
                    </>
                  )}
                  <Button
                    className="mt-6"
                    onClick={() => { setScanResult(null); }}
                  >
                    Back
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleCheckoutSubmit} className="space-y-4 max-w-sm mx-auto">
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
                      className="shadow-none"
                    />
                  </div>
                  <Button type="submit" className="w-full font-semibold h-11" disabled={checkoutLoading || !checkoutEmail}>
                    {checkoutLoading ? 'Processing...' : 'Check Out Now'}
                  </Button>
                </form>
              )}
            </div>
          )}
        </Card>

        {/* RIGHT COLUMN: Live Visitor Pass Preview */}
        <div className="hidden lg:block relative">
          <div className="sticky top-8 space-y-3">
            <p className="text-xs text-muted-foreground text-center font-medium">Your pass builds as you register</p>
            
            <Card className="overflow-hidden border-border shadow-lg bg-card">
              <div className="bg-primary text-primary-foreground px-4 py-3 text-xs font-bold tracking-widest uppercase">
                Visitor Pass
              </div>
              
              <CardContent className="p-8 flex flex-col items-center">
                {/* Avatar */}
                <div className="w-24 h-24 rounded-full bg-muted border border-border flex items-center justify-center mb-5 overflow-hidden">
                  {formData.photo_url ? (
                    <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <UserCircle className="w-10 h-10 text-muted-foreground/30" />
                  )}
                </div>
                
                <h3 className="text-xl font-bold text-foreground mb-1 text-center line-clamp-1">
                  {formData.visitor_name || 'Your name'}
                </h3>
                <p className="text-sm text-muted-foreground mb-8 text-center line-clamp-1">
                  {formData.company || 'Company'}
                </p>

                <div className="w-full space-y-3 text-sm">
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Visiting:</span>
                    <span className="font-medium text-foreground text-right truncate max-w-[140px]">
                      {formData.host_id ? hosts.find(h => h.id === formData.host_id)?.name || '—' : '—'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-border pb-2">
                    <span className="text-muted-foreground">Duration:</span>
                    <span className="font-medium text-foreground">
                      {formData.duration_hours ? `${formData.duration_hours} Hour(s)` : '—'}
                    </span>
                  </div>
                </div>

                <div className="w-full mt-10">
                  <div className={`w-full py-2.5 rounded border text-center text-xs font-bold tracking-widest uppercase transition-colors ${
                    formData.visitor_name && formData.visitor_email && formData.host_id && formData.photo_url 
                      ? 'bg-primary/10 border-primary text-primary' 
                      : 'bg-muted border-border border-dashed text-muted-foreground'
                  }`}>
                    {formData.visitor_name && formData.visitor_email && formData.host_id && formData.photo_url 
                      ? 'Ready to Check In' 
                      : 'Awaiting Details'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>
    </div>
  );
}
