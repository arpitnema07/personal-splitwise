import React, { useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';
import { UserPlus, Users } from 'lucide-react';

function Register() {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/auth/register', formData);
      alert('Registration successful! Please login.');
      navigate('/login');
    } catch (err) {
      alert('Registration failed: ' + (err.response?.data?.detail || err.message));
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
             <h1 className="text-2xl font-bold">Create Account</h1>
             <p>Join Splitwise Clone today</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full">
          <input
            type="text"
            placeholder="Full Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            className="mb-6"
          />
          <button className="btn" type="submit" disabled={isLoading}>
             {isLoading ? 'Creating Account...' : (
                <span className="flex items-center gap-2">
                    <UserPlus size={20} /> Register
                </span>
            )}
          </button>
        </form>
        <p className="mt-6 text-sm">
          Already have an account? <Link to="/login" className="font-bold">Login</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
