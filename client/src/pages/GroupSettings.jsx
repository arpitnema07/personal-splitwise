import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Save, Trash2, Download, Image as ImageIcon, Upload } from 'lucide-react';

function GroupSettings() {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchGroup();
  }, [groupId]);

  const fetchGroup = async () => {
    try {
      const res = await api.get(`/groups/${groupId}`);
      setGroup(res.data);
      setName(res.data.name);
      setIcon(res.data.icon || '');
    } catch (err) {
      console.error("Failed to fetch group", err);
      alert("Failed to load group details");
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await api.put(`/groups/${groupId}`, { name, icon });
      alert('Group updated!');
    } catch (err) {
      console.error("Failed to update group", err);
      alert('Failed to update group');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this group? This action cannot be undone and will delete all expenses.")) return;
    
    setIsDeleting(true);
    try {
      await api.delete(`/groups/${groupId}`);
      navigate('/dashboard');
    } catch (err) {
       console.error("Failed to delete group", err);
       alert('Failed to delete group');
       setIsDeleting(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await api.get(`/groups/${groupId}/export`, {
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `group_${groupId}_expenses.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Failed to export", err);
      alert('Failed to export expenses');
    }
  };

  if (!group) return <div className="p-4 text-center">Loading...</div>;

  return (
    <div className="container pb-20">
      <div className="flex items-center gap-2 mb-6">
        <button onClick={() => navigate(`/groups/${groupId}`)} className="btn-ghost gap-2">
            <ArrowLeft size={20} />
        </button>
        <h1 className="text-2xl font-bold mb-0">Group Settings</h1>
      </div>

      <div className="card shadow-lg p-4 mb-6">
        <h2 className="text-lg font-bold mb-4">Edit Group Details</h2>
        <form onSubmit={handleUpdate}>
            <div className="mb-4">
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">GROUP NAME</label>
                <input type="text" value={name} onChange={e => setName(e.target.value)} required />
            </div>
            <div className="mb-6">
                <label className="block text-xs font-bold text-[var(--text-muted)] mb-1">GROUP ICON</label>
                <div className="flex gap-3 items-center">
                     <div className="flex items-center justify-center w-8 h-8 bg-[var(--bg-input)] rounded-full text-2xl border border-[var(--border-color)] overflow-hidden shrink-0 relative" style={{ width: '32px', height: '32px' }}>
                        {icon ? (
                           icon.match(/^http|\/uploads/) ? (
                               <img 
                                src={icon} 
                                alt="Icon" 
                                className="w-full h-full object-cover block"
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                               />
                           ) : <span className="text-sm">{icon}</span>
                        ) : <ImageIcon size={16} className="text-[var(--text-muted)]" />}
                     </div>
                     <div className="flex-1 flex gap-2">
                         <input 
                            type="text" 
                            value={icon} 
                            onChange={e => setIcon(e.target.value)} 
                            placeholder="Emoji or Image URL" 
                            className="flex-1"
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
                                    setIsLoading(true);
                                    try {
                                        const res = await api.post('/upload/', formData, {
                                            headers: { 'Content-Type': 'multipart/form-data' }
                                        });
                                        const fullUrl = `${window.location.origin}${res.data.url}`;
                                        setIcon(fullUrl);
                                    } catch (err) {
                                        alert('Failed to upload image');
                                        console.error(err);
                                    } finally {
                                        setIsLoading(false);
                                    }
                                }}
                             />
                         </label>
                     </div>
                </div>
            </div>
            
            <button type="submit" className="btn flex items-center justify-center gap-2" disabled={isLoading}>
                {isLoading ? 'Saving...' : <><Save size={18} /> Save Changes</>}
            </button>
        </form>
      </div>

      <div className="card shadow-lg p-4 mb-6">
         <h2 className="text-lg font-bold mb-4">Data & Privacy</h2>
         <div className="flex flex-col gap-3">
             <button onClick={handleExport} className="btn btn-secondary flex items-center justify-center gap-2">
                 <Download size={18} /> Export Expenses to CSV
             </button>
         </div>
      </div>

      <div className="card shadow-lg p-4 border border-[var(--error)] bg-[rgba(255,82,82,0.05)]">
         <h2 className="text-lg font-bold mb-2 text-[var(--error)]">Danger Zone</h2>
         <p className="text-sm text-[var(--text-muted)] mb-4">Deleting a group will permanently remove all members and expenses associated with it.</p>
         <button onClick={handleDelete} className="btn bg-[var(--error)] hover:bg-red-700 text-white flex items-center justify-center gap-2" disabled={isDeleting}>
             <Trash2 size={18} /> {isDeleting ? 'Deleting...' : 'Delete Group'}
         </button>
      </div>
    </div>
  );
}

export default GroupSettings;
