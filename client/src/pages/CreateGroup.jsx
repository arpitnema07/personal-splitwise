import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { PlusCircle, ArrowLeft } from 'lucide-react';

function CreateGroup() {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.post('/groups/create', { name });
      navigate('/dashboard');
    } catch (err) {
      alert('Failed to create group');
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
                <PlusCircle size={32} className="text-[var(--primary)]" />
            </div>
            <h1 className="text-xl font-bold">Create a New Group</h1>
        </div>

        <form onSubmit={handleSubmit}>
          <label className="block text-sm font-medium mb-2 text-[var(--text-muted)]">Group Name</label>
          <input
            type="text"
            placeholder="e.g. Trip to Goa, Apartment 302"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoFocus
          />
          <button className="btn mt-4" type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create Group'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateGroup;
