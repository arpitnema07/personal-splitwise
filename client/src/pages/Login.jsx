import React, { useState } from 'react';
import api from '../api';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { LogIn, Users } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect') || '/dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const res = await api.post('/auth/login', { email, password });
      login(res.data.access_token);
      navigate(redirect);
    } catch (err) {
      alert('Login failed: ' + (err.response?.data?.detail || err.message));
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-[var(--bg-main)]">
      <div className="w-full max-w-md card flex flex-col items-center">
        <div className="mb-6 flex flex-col items-center">
             <div className="bg-[var(--bg-input)] p-4 rounded-full mb-4">
                 <Users size={40} className="text-[var(--primary)]" />
             </div>
             <h1 className="text-2xl font-bold">Welcome Back</h1>
             <p>Sign in to Splitwise Clone</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full">
          <input
            type="email"
            placeholder="Email Address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mb-4"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="mb-6"
          />
          <button className="btn" type="submit" disabled={isLoading}>
            {isLoading ? 'Logging in...' : (
                <span className="flex items-center gap-2">
                    <LogIn size={20} /> Login
                </span>
            )}
          </button>
        </form>
        
        <p className="mt-6 text-sm">
          Don't have an account? <Link to="/register" className="font-bold">Register</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;
