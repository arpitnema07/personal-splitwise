import React, { useState, useEffect } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';
import { User, Save, Trash2, LogOut, Lock, Upload } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

function UserProfile() {
  const [user, setUser] = useState(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [avatar, setAvatar] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const { logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/users/me');
      setUser(res.data);
      setName(res.data.name);
      setEmail(res.data.email);
      setAvatar(res.data.avatar || '');
    } catch (err) {
      console.error("Failed to fetch profile", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { name, avatar };
      if (password) payload.password = password;
      
      await api.put('/users/update', payload);
      alert('Profile updated successfully!');
      setPassword(''); // Clear password field
    } catch (err) {
      alert('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleDisable = async () => {
    if (!window.confirm("Are you sure you want to disable your account? You will be logged out.")) return;
    try {
      await api.post('/users/disable');
      logout();
    } catch (err) {
      alert('Failed to disable account');
    }
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="container pb-20">
      <h1 className="text-2xl font-bold mb-6">My Profile</h1>

      <div className="card shadow-lg p-4 mb-6">
        <div className="flex flex-col items-center mb-6">
            <div className="w-8 h-8 rounded-full bg-[var(--bg-input)] flex items-center justify-center text-xs mb-3 border border-[var(--bg-card)] shadow overflow-hidden relative" style={{ width: '32px', height: '32px' }}>
                {avatar ? (
                   avatar.match(/^http|\/uploads/) ? (
                       <img 
                        src={avatar} 
                        alt="Avatar" 
                        className="w-full h-full object-cover block" 
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                       />
                   ) : <span className="text-sm">{avatar}</span>
                ) : <User size={16} className="text-[var(--text-muted)]" />}
            </div>
            <h2 className="text-xl font-bold">{user.name}</h2>
            <p className="text-[var(--text-muted)]">{user.email}</p>
        </div>

        <form onSubmit={handleUpdate}>
            <div className="mb-4">
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">FULL NAME</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required />
            </div>

            <div className="mb-4">
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">AVATAR</label>
                <div className="flex gap-3 items-center">
                     <div className="flex items-center justify-center w-8 h-8 bg-[var(--bg-input)] rounded-full text-2xl border border-[var(--border-color)] overflow-hidden shrink-0 relative" style={{ width: '32px', height: '32px' }}>
                        {avatar ? (
                           avatar.match(/^http|\/uploads/) ? (
                               <img 
                                src={avatar} 
                                alt="Avatar" 
                                className="w-full h-full object-cover block" 
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                               />
                           ) : <span className="text-sm">{avatar}</span>
                        ) : <User size={16} className="text-[var(--text-muted)]" />}
                     </div>
                     <div className="flex-1 flex gap-2">
                         <input 
                            type="text" 
                            value={avatar} 
                            onChange={e => setAvatar(e.target.value)} 
                            placeholder="Emoji or Image URL" 
                            className="flex-1" // Make it take available space
                         />
                         <label className="btn btn-secondary flex items-center justify-center cursor-pointer px-3" title="Upload Image">
                             <Upload size={20} />
                             <input 
                                type="file" 
                                accept="image/*"
                                className="hidden"
                                onChange={async (e) => {
                                    const file = e.target.files[0];
                                    if (!file) return;
                                    const formData = new FormData();
                                    formData.append('file', file);
                                    setLoading(true);
                                    try {
                                        const res = await api.post('/upload/', formData, {
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                        });
                                        const fullUrl = `${window.location.origin}${res.data.url}`;
                                        setAvatar(fullUrl);
                                    } catch (err) {
                                        alert('Failed to upload image');
                                        console.error(err);
                                    } finally {
                                        setLoading(false);
                                    }
                                }}
                             />
                         </label>
                     </div>
                </div>
            </div>

            <div className="mb-6">
                 <label className="block text-xs font-bold text-[var(--text-muted)] mb-1 flex items-center gap-1">
                    <Lock size={12} /> NEW PASSWORD (Optional)
                 </label>
                 <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Leave blank to keep current" />
            </div>

            <button type="submit" className="btn w-full flex items-center justify-center gap-2" disabled={saving}>
                {saving ? 'Saving...' : <><Save size={18} /> Update Profile</>}
            </button>
        </form>
      </div>

      <div className="card shadow-lg p-4 border border-[var(--error)] bg-[rgba(255,82,82,0.05)]">
         <h2 className="text-lg font-bold mb-2 text-[var(--error)]">Danger Zone</h2>
         <button onClick={handleDisable} className="btn bg-[var(--error)] hover:bg-red-700 text-white w-full flex items-center justify-center gap-2">
             <Trash2 size={18} /> Disable Account
         </button>
      </div>
      
      <div className="mt-8 text-center">
          <button onClick={logout} className="btn-ghost text-[var(--text-muted)] flex items-center justify-center gap-2 mx-auto">
             <LogOut size={18} /> Log Out
          </button>
      </div>
    </div>
  );
}

export default UserProfile;
