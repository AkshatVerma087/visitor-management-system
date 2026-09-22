import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth as authApi, offices } from '../api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { UserPlus, Building2, Eye, EyeOff, UserCircle, Lock, Mail, ChevronRight } from 'lucide-react';

export default function Register() {
  const { login } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Host',
    office_id: ''
  });
  const [availableOffices, setAvailableOffices] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    offices.getOffices()
      .then(data => {
        setAvailableOffices(data);
        if (data.length > 0) setFormData(prev => ({ ...prev, office_id: data[0].id }));
      })
      .catch(err => console.error('Failed to fetch offices:', err));
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.id]: e.target.value });
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { name, email, password, role, office_id } = formData;
      const registerData = await authApi.register({ name, email, password, role, office_id });
      
      // Immediately log them in
      const loginData = await authApi.login({ email, password });
      
      login(loginData.token, loginData.user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-50 p-4">
      <Card className="w-full max-w-md shadow-lg border-zinc-200">
        <CardHeader className="space-y-2 flex flex-col items-center pb-4">
          <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mb-2 shadow-sm border border-blue-700">
            <Building2 className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900">Create Account</CardTitle>
          <CardDescription className="text-center text-zinc-500">
            Register a new employee for the VMS system
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleRegister}>
          <CardContent className="space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-md border border-red-200">
                {error}
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" placeholder="John Doe" value={formData.name} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="john@example.com" value={formData.email} onChange={handleChange} required />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? 'text' : 'password'} 
                  value={formData.password}
                  onChange={handleChange}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="office_id">Office</Label>
              <select 
                id="office_id" 
                value={formData.office_id} 
                onChange={handleChange} 
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                required
              >
                {availableOffices.map(o => (
                  <option key={o.id} value={o.id}>{o.name} - {o.address}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select 
                id="role" 
                value={formData.role} 
                onChange={handleChange} 
                className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-base shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                required
              >
                <option value="Host">Host</option>
                <option value="Security">Front Desk / Security</option>
                <option value="Admin">Admin</option>
              </select>
            </div>

          </CardContent>
          <CardFooter className="flex flex-col space-y-4 pt-2">
            <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-all" type="submit" disabled={loading}>
              {loading ? 'Creating account...' : 'Create account'}
              {!loading && <UserPlus className="w-4 h-4 ml-2" />}
            </Button>
            <div className="text-sm text-center text-zinc-500">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:underline font-medium">
                Sign in
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
