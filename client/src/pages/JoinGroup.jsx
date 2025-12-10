import React, { useState } from 'react';
import api from '../api';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Users, ArrowLeft, Link as LinkIcon } from 'lucide-react';

function JoinGroup() {
  const [searchParams] = useSearchParams();
  const initialCode = searchParams.get('code') || '';
  
  const [inviteCode, setInviteCode] = useState(initialCode);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inviteCode) return;
    
    setIsLoading(true);
    try {
      await api.post(`/groups/join/${inviteCode}`);
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to join group: ' + (err.response?.data?.detail || err.message));
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <button onClick={() => navigate(-1)} className="btn-ghost gap-2 mb-6">
        <ArrowLeft size={20} />
      </button>

      <div className="card max-w-lg mx-auto">
        <div className="flex flex-col items-center mb-6">
            <div className="bg-[var(--bg-input)] p-3 rounded-full mb-3">
                <LinkIcon size={32} className="text-[var(--primary)]" />
            </div>
            <h1 className="text-xl font-bold">Join a Group</h1>
            <p className="text-sm text-center mt-2">Enter the invite code shared by your friend to join the group.</p>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Invite Code</label>
          <input
            type="text"
            placeholder="e.g. 8f7a2b3c"
            value={inviteCode}
            onChange={(e) => setInviteCode(e.target.value)}
            required
            className="text-center font-mono text-lg tracking-widest uppercase"
          />
          <button className="btn mt-4" type="submit" disabled={isLoading}>
            {isLoading ? 'Joining...' : 'Join Group'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default JoinGroup;
