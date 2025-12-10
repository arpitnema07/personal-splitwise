import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../api';
import { ArrowLeft, Check, Trash2 } from 'lucide-react';

function AddExpense() {
  const { groupId, expenseId } = useParams();
  const navigate = useNavigate();
  
  const [group, setGroup] = useState(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [payerId, setPayerId] = useState('');
  const [category, setCategory] = useState('General');
  const [tags, setTags] = useState('');
  
  const [splitType, setSplitType] = useState('equal');
  const [selectedMembers, setSelectedMembers] = useState([]);
  const [exactAmounts, setExactAmounts] = useState({});
  const [percentages, setPercentages] = useState({});
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const isEditMode = !!expenseId;

  const categories = ["General", "Food", "Travel", "Entertainment", "Home", "Utilities"];

  useEffect(() => {
    fetchGroupAndExpense();
  }, [groupId, expenseId]);

  const fetchGroupAndExpense = async () => {
    try {
      const groupRes = await api.get(`/groups/${groupId}`);
      setGroup(groupRes.data);
      
      const allMemberIds = groupRes.data.members_details.map(m => m.id);
      
      if (isEditMode) {
          const expRes = await api.get(`/expenses/${expenseId}`);
          const exp = expRes.data;
          
          setDescription(exp.description);
          setAmount(exp.amount);
          setPayerId(exp.payer_id);
          setCategory(exp.category || "General");
          setTags(exp.tags ? exp.tags.join(', ') : '');
          
          // Reconstruct split state... tricky but simple heuristic for now:
          // If keys match, assume check.
          const userIds = Object.keys(exp.split_details);
          setSelectedMembers(userIds);
          
          // Determine split type roughly? Or just default to exact to be safe since we have values?
          // Actually, let's default to 'equal' if values are equal, else 'exact'
          const values = Object.values(exp.split_details);
          const allEqual = values.every(v => Math.abs(v - values[0]) < 0.01);
          
          if (allEqual) {
              setSplitType('equal');
          } else {
              setSplitType('exact');
              setExactAmounts(exp.split_details);
          }

      } else {
         setSelectedMembers(allMemberIds);
         if (allMemberIds.length > 0) setPayerId(allMemberIds[0]);
      }
    } catch (err) {
      console.error("Failed to load data", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMember = (memberId) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== memberId));
    } else {
      setSelectedMembers([...selectedMembers, memberId]);
    }
  };

  const handleDelete = async () => {
      if(!window.confirm("Are you sure you want to delete this expense?")) return;
      try {
          await api.delete(`/expenses/${expenseId}`);
          navigate(`/groups/${groupId}`);
      } catch(err) {
          alert('Failed to delete');
      }
  };

  const handleSave = async () => {
    setSubmitting(true);
    try {
      const totalAmount = parseFloat(amount);
      let splitDetails = {};

      if (splitType === 'equal') {
        const share = totalAmount / selectedMembers.length;
        selectedMembers.forEach(mid => {
          splitDetails[mid] = share;
        });
      } else if (splitType === 'exact') {
        let sum = 0;
        selectedMembers.forEach(mid => {
           const val = parseFloat(exactAmounts[mid] || 0);
           splitDetails[mid] = val;
           sum += val;
        });
        if (Math.abs(sum - totalAmount) > 0.01) {
          alert(`Amounts sum to ${sum}, but total is ${totalAmount}`);
          setSubmitting(false);
          return;
        }
      } else if (splitType === 'percent') {
         let sum = 0;
         selectedMembers.forEach(mid => {
           const pct = parseFloat(percentages[mid] || 0);
           const share = (totalAmount * pct) / 100;
           splitDetails[mid] = share;
           sum += pct;
         });
         if (Math.abs(sum - 100) > 0.1) {
             alert(`Percentages sum to ${sum}%, must be 100%`);
             setSubmitting(false);
             return;
         }
      }

      const payload = {
        description,
        amount: totalAmount,
        payer_id: payerId,
        group_id: groupId,
        category,
        tags: tags.split(',').map(t => t.trim()).filter(t => t),
        split_details: splitDetails
      };

      if (isEditMode) {
          await api.put(`/expenses/${expenseId}`, payload);
      } else {
          await api.post('/expenses/add', payload);
      }
      
      navigate(`/groups/${groupId}`);
      
    } catch (err) {
      alert('Failed to save expense: ' + (err.response?.data?.detail || err.message));
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;

  return (
    <div className="container pb-20">
      <div className="flex items-center justify-between mb-6">
         <div className="flex items-center gap-2">
            <button onClick={() => navigate(-1)} className="btn-ghost" aria-label="Go Back">
                <ArrowLeft size={24} />
            </button>
            <h1 className="text-3xl font-bold relative">{isEditMode ? 'Edit Expense' : 'Add Expense'}</h1>
         </div>
         {isEditMode && (
             <button onClick={handleDelete} className="btn-ghost text-[var(--error)] hover:bg-[rgba(255,82,82,0.1)]">
                 <Trash2 size={24} />
             </button>
         )}
      </div>

      <div className="card shadow-lg p-4">
        {/* Main Details */}
        <div className="mb-3">
             <label className="text-xs font-bold text-[var(--text-muted)] mb-1 block">DESCRIPTION</label>
             <input type="text" value={description} onChange={e => setDescription(e.target.value)} placeholder="e.g. Dinner at Taj" autoFocus className="mb-0" />
        </div>

        <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
                 <label className="text-xs font-bold text-[var(--text-muted)] mb-1 block">AMOUNT ($)</label>
                 <input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className="text-xl font-bold font-mono mb-0" />
            </div>
            <div>
                 <label className="text-xs font-bold text-[var(--text-muted)] mb-1 block">CATEGORY</label>
                 <select value={category} onChange={e => setCategory(e.target.value)} className="mb-0">
                     {categories.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
            </div>
        </div>
        
        <div className="mb-3">
             <label className="text-xs font-bold text-[var(--text-muted)] mb-1 block">TAGS</label>
             <input type="text" value={tags} onChange={e => setTags(e.target.value)} placeholder="e.g. friday, drinks" className="mb-0" />
        </div>

        <div className="mb-4">
             <label className="text-xs font-bold text-[var(--text-muted)] mb-1 block">PAID BY</label>
             <select value={payerId} onChange={e => setPayerId(e.target.value)} className="mb-0">
                {group.members_details.map(m => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                ))}
             </select>
        </div>

        <hr className="border-[var(--border-color)] mb-4 opacity-30" />

        {/* Split Section */}
        <h3 className="font-bold mb-2 text-xs uppercase text-[var(--text-muted)] tracking-wider">Split Options</h3>
        
        <div className="segmented-control mb-4">
            {['equal', 'exact', 'percent'].map(type => (
                <button
                    key={type}
                    onClick={() => setSplitType(type)}
                    className={`segmented-item ${splitType === type ? 'active' : ''}`}
                >
                    {type}
                </button>
            ))}
        </div>

        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1 custom-scrollbar">
            <label className="block text-xs font-bold text-[var(--text-muted)] mb-2">Select Members Involved</label>
            {group.members_details.map(member => (
                <div key={member.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--bg-input)] transition-colors border border-[var(--border-color)] cursor-pointer" onClick={() => toggleMember(member.id)}>
                    <div className="flex items-center gap-4">
                        <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${selectedMembers.includes(member.id) ? 'bg-[var(--primary)] border-[var(--primary)] text-white' : 'border-[var(--text-muted)] bg-transparent'}`}>
                            {selectedMembers.includes(member.id) && <Check size={16} strokeWidth={3} />}
                        </div>
                        <span className={`text-sm ${selectedMembers.includes(member.id) ? 'font-bold text-[var(--text-main)]' : 'text-[var(--text-muted)]'}`}>{member.name}</span>
                    </div>
                    
                    {/* Inputs based on type */}
                    <div className="w-28 text-right" onClick={(e) => e.stopPropagation()}>
                        {selectedMembers.includes(member.id) && (
                            <>
                                {splitType === 'equal' && (
                                    <span className="text-sm font-mono text-[var(--text-muted)]">
                                        ${amount && selectedMembers.length > 0 ? (amount / selectedMembers.length).toFixed(2) : '0.00'}
                                    </span>
                                )}
                                {splitType === 'exact' && (
                                    <input 
                                        type="number" 
                                        className="mb-0 py-1 px-2 text-right bg-[var(--bg-main)] border border-[var(--border-color)] rounded h-8 text-sm focus:border-[var(--primary)]"
                                        placeholder="0.00"
                                        value={exactAmounts[member.id] || ''}
                                        onChange={(e) => setExactAmounts({...exactAmounts, [member.id]: e.target.value})}
                                    />
                                )}
                                {splitType === 'percent' && (
                                    <div className="relative flex items-center justify-end">
                                        <input 
                                            type="number" 
                                            className="mb-0 py-1 px-2 text-right bg-[var(--bg-main)] border border-[var(--border-color)] rounded h-8 text-sm w-16 focus:border-[var(--primary)]"
                                            placeholder="0"
                                            value={percentages[member.id] || ''}
                                            onChange={(e) => setPercentages({...percentages, [member.id]: e.target.value})}
                                        />
                                        <span className="ml-1 text-[var(--text-muted)] text-xs">%</span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            ))}
        </div>
        
        <button onClick={handleSave} disabled={submitting || !amount || selectedMembers.length === 0} className="btn w-full shadow-lg py-3 text-lg">
            {submitting ? 'Saving...' : (isEditMode ? 'Update Expense' : 'Save Expense')}
        </button>
      </div>
    </div>
  );
}

export default AddExpense;
