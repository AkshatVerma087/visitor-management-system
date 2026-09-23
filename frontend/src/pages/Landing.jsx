import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { QrCode, UserPlus, ShieldCheck, CheckSquare, ArrowRight, Table } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      {/* Navigation - STRICT SOLID NO BLUR */}
      <header className="border-b border-border bg-background sticky top-0 z-10">
        <div className="container mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-foreground" />
            <span className="font-bold text-lg tracking-tight">VMS</span>
          </div>
          <nav>
            <Button variant="outline" onClick={() => navigate('/login')} className="font-medium rounded-md shadow-none">
              Admin Login
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {/* Hero Section - NO TEXTURES, NO GLOWS */}
        <section className="py-20 md:py-32 px-4 md:px-8 container mx-auto">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto space-y-8">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight leading-tight text-foreground">
              Enterprise visitor management and security control.
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-2xl">
              A highly structured system for walk-in registration, host approval workflows, pre-approved QR fast-track check-in, and compliance monitoring.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Button size="lg" onClick={() => navigate('/kiosk')} className="w-full sm:w-auto font-medium rounded-md shadow-none px-8">
                Visitor Portal
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/login')} className="w-full sm:w-auto font-medium rounded-md shadow-none px-8">
                Access Security Portal
              </Button>
            </div>
          </div>
        </section>

        {/* Features Section - STRICT FLAT BORDERS, NO HOVER LIFTS */}
        <section className="py-24 border-t border-border bg-muted/40">
          <div className="container mx-auto px-4 md:px-8 max-w-6xl">
            <div className="mb-12">
              <h2 className="text-2xl font-bold tracking-tight mb-4">Core Infrastructure</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="rounded-md border border-border shadow-none bg-background">
                <CardHeader>
                  <UserPlus className="h-6 w-6 mb-2 text-foreground" />
                  <CardTitle className="text-lg">Walk-in Registration</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Allow guests to register themselves, capture required photo IDs, and notify their host via standardized workflows.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="rounded-md border border-border shadow-none bg-background">
                <CardHeader>
                  <QrCode className="h-6 w-6 mb-2 text-foreground" />
                  <CardTitle className="text-lg">QR Fast-Track</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Pre-registered guests scan unique, cryptographically signed QR codes for immediate, logged entry.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="rounded-md border border-border shadow-none bg-background">
                <CardHeader>
                  <CheckSquare className="h-6 w-6 mb-2 text-foreground" />
                  <CardTitle className="text-lg">Approval Workflows</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Employees receive structured notifications to approve or deny entry requests directly from their dashboard.
                  </CardDescription>
                </CardContent>
              </Card>

              <Card className="rounded-md border border-border shadow-none bg-background">
                <CardHeader>
                  <ShieldCheck className="h-6 w-6 mb-2 text-foreground" />
                  <CardTitle className="text-lg">Compliance Monitoring</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription className="text-sm">
                    Security personnel maintain real-time oversight of building occupancy and policy compliance.
                  </CardDescription>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      </main>

      {/* Footer - SOLID, NO FLUFF */}
      <footer className="border-t border-border bg-foreground py-10">
        <div className="container mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between text-xs text-background/70">
          <p>&copy; {new Date().getFullYear()} VMS Enterprise Infrastructure. All rights reserved.</p>
          <div className="mt-4 md:mt-0 space-x-6">
            <span className="cursor-not-allowed hover:text-background transition-colors">Privacy</span>
            <span className="cursor-not-allowed hover:text-background transition-colors">Terms</span>
            <span className="cursor-not-allowed hover:text-background transition-colors">System Status</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
