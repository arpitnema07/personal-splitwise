import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, User, Share2, ArrowLeft, Receipt, RefreshCw, Edit2, Settings } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';

function GroupDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [group, setGroup] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [balances, setBalances] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('expenses'); // 'expenses' or 'balances'

  useEffect(() => {
    fetchGroupData();
  }, [id]);

  const fetchGroupData = async () => {
    try {
      setLoading(true);
      const groupRes = await api.get(`/groups/${id}`);
      setGroup(groupRes.data);

      const expensesRes = await api.get(`/expenses/group/${id}`);
      setExpenses(expensesRes.data.reverse()); // Show newest first

      const balancesRes = await api.get(`/expenses/group/${id}/balances`);
      setBalances(balancesRes.data);
    } catch (err) {
      console.error("Failed to fetch group details", err);
    } finally {
      setLoading(false);
    }
  };

  const getMemberData = (userId) => {
    if (!group) return { name: 'Unknown', avatar: null };
    const member = group.members_details.find(m => m.id === userId);
    return member || { name: 'Unknown', avatar: null };
  };

  const renderAvatar = (user, size = "w-8 h-8", fontSize = "text-xs") => {
      // Determines pixel size for strict inline styling based on Tailwind class
      const pxSize = size.includes("w-4") ? "16px" : "32px";
      const style = { width: pxSize, height: pxSize, minWidth: pxSize, minHeight: pxSize, objectFit: 'cover' };
      const containerStyle = { width: pxSize, height: pxSize, minWidth: pxSize, minHeight: pxSize };

      if (user.avatar) {
          return user.avatar.match(/^http|\/uploads/) ? 
            <img 
                src={user.avatar} 
                alt={user.name} 
                className={`${size} rounded-full object-cover border border-[var(--border-color)] block`} 
                style={style} 
            /> :
            <div className={`${size} bg-[var(--bg-input)] rounded-full flex items-center justify-center ${fontSize} border border-[var(--border-color)] shrink-0 text-[var(--text-main)]`} style={containerStyle}>{user.avatar}</div>;
      }
      // Default fallback if no avatar is set - show User icon
      return (
        <div className={`${size} bg-[var(--bg-input)] rounded-full flex items-center justify-center border border-[var(--border-color)] text-[var(--text-muted)] shrink-0`} style={containerStyle}>
            <User size={size.includes("w-4") ? 10 : 16} />
        </div>
      );
  };

  const handleShare = () => {
    if (!group) return;
    const link = `${window.location.origin}/groups/join?code=${group.invite_code}`;
    navigator.clipboard.writeText(link);
    alert('Invite link copied to clipboard!');
  };

  const [settleModalOpen, setSettleModalOpen] = useState(false);
  const [settleToUser, setSettleToUser] = useState('');
  const [settleAmount, setSettleAmount] = useState('');

  const openSettleUp = () => {
      // Find who I owe
      if (!user) return;
      
      const myDebts = balances.filter(b => b.from === (user.id || user._id));
      
      if (myDebts.length > 0) {
          setSettleToUser(myDebts[0].to);
          setSettleAmount(myDebts[0].amount);
      } else {
          // Fallback
          const otherMembers = group.members_details.filter(m => m.id !== (user.id || user._id));
          if (otherMembers.length > 0) {
              const firstMemberId = otherMembers[0].id;
              setSettleToUser(firstMemberId);
              // Check if owing this specific person (unlikely here but good for consistency)
              const debt = balances.find(b => b.from === (user.id || user._id) && b.to === firstMemberId);
              setSettleAmount(debt ? debt.amount : '');
          }
      }
      setSettleModalOpen(true);
  };

  const handleRecipientChange = (e) => {
      const newRecipientId = e.target.value;
      setSettleToUser(newRecipientId);
      
      // Auto-populate amount based on debt to this user
      if (user) {
          const debt = balances.find(b => b.from === (user.id || user._id) && b.to === newRecipientId);
          if (debt) {
              setSettleAmount(debt.amount);
          } else {
              setSettleAmount(''); // Or keep previous? Better to clear or let user type if no calculated debt
          }
      }
  };

  const handleSettleUpSubmit = async (e) => {
      e.preventDefault();
      try {
          // Create settlement expense
          const recipientId = settleToUser;
          const splitDetails = {};
          splitDetails[recipientId] = parseFloat(settleAmount);

          await api.post('/expenses/add', {
              group_id: id,
              description: 'Settle Up',
              amount: parseFloat(settleAmount),
              currency: 'USD', // Default for now
              category: 'Payment', // Special category
              date: new Date().toISOString(),
              payer_id: user.id || user._id,
              split_type: 'exact',
              split_details: splitDetails,
              notes: 'Settlement payment'
          });
          
          setSettleModalOpen(false);
          // Small delay to ensure DB updates before refetching? Usually not needed if await works.
          fetchGroupData(); 
      } catch (err) {
          console.error(err);
          alert('Failed to record settlement: ' + (err.response?.data?.detail || err.message));
      }
  };

  if (loading) return <div className="p-4 text-center">Loading...</div>;
  if (!group) return <div className="p-4 text-center">Group not found</div>;

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
            <Link to="/dashboard" className="text-[var(--text-main)] hover:text-[var(--primary)] transition-colors flex items-center justify-center -ml-1 p-1">
                <ArrowLeft size={24} />
            </Link>
            <div className="flex items-center gap-3">
                 <div className="w-8 h-8 bg-gradient-to-br from-[var(--bg-input)] to-[var(--bg-main)] rounded-full flex items-center justify-center text-xs font-bold border border-[var(--border-color)] overflow-hidden shrink-0 relative" style={{ width: '32px', height: '32px' }}>
                    {group.icon ? (
                       group.icon.match(/^http/) ? (
                           <img 
                            src={group.icon} 
                            alt={group.name} 
                            className="w-full h-full object-cover block"
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                           />
                       ) : <span className="text-sm">{group.icon}</span>
                    ) : (
                       group.name.charAt(0).toUpperCase()
                    )}
                 </div>
                 <h1 className="text-2xl font-bold m-0 leading-none">{group.name}</h1>
            </div>
        </div>
        <div className="flex gap-2">
            <Link to={`/groups/${id}/settings`} className="btn-icon btn-secondary text-[var(--text-main)]" title="Group Settings">
                <Settings size={20} />
            </Link>
            <button onClick={handleShare} className="btn-icon btn-secondary text-[var(--text-main)]" title="Share Invite Code">
                <Share2 size={20} />
            </button>
            <Link to={`/groups/${id}/add-expense`} className="btn-icon bg-[var(--primary)] text-white" title="Add Expense">
                <PlusCircle size={20} />
            </Link>
        </div>
      </div>

      {/* Personal Balance Banner */}
      {(() => {
        if (!user) return null;
        
        // Handle potential differences in ID field name (_id vs id)
        const userId = user.id || user._id;

        if (!userId) return null;

        let myPaid = 0;
        let myShare = 0;

        expenses.forEach(exp => {
            if (exp.payer_id === userId) {
                myPaid += exp.amount;
            }
            if (exp.split_details && exp.split_details[userId]) {
                myShare += exp.split_details[userId];
            }
        });

        const netBalance = myPaid - myShare;
        if (Math.abs(netBalance) < 0.01) return null; // Settled up

        const isPositive = netBalance > 0;
        const color = isPositive ? "#22c55e" : "#ef4444"; // dim green/red
        const bgColor = isPositive ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)";
        const borderColor = isPositive ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)";
        const icon = isPositive ? "+" : "-";
        const text = isPositive ? "you are owed" : "you owe";

        return (
            <div 
                className="mb-6 p-4 rounded-xl border flex items-center gap-4"
                style={{ backgroundColor: bgColor, borderColor: borderColor }}
            >
                <div 
                    className="rounded-full flex items-center justify-center font-bold text-2xl text-white"
                    style={{ backgroundColor: color, width: '48px', height: '48px', minWidth: '48px' }}
                >
                    {icon}
                </div>
                <p className="text-lg font-bold leading-none" style={{ color: color, margin: 0 }}>
                    Overall, {text} <span className="text-2xl ml-1">${Math.abs(netBalance).toFixed(2)}</span>
                </p>
                
                {/* Settle Up Button if negative balance */}
                {!isPositive && (
                    <button 
                        onClick={openSettleUp}
                        className="ml-auto btn"
                        style={{ 
                            backgroundColor: 'white', 
                            color: '#ef4444', 
                            width: 'auto', 
                            padding: '8px 16px',
                            border: '1px solid currentColor' 
                        }}
                    >
                        Settle Up
                    </button>
                )}
            </div>
        );
      })()}

      {/* Settle Up Modal */}
      {settleModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="card w-full max-w-md p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 border border-[var(--border-color)]">
                <button 
                    onClick={() => setSettleModalOpen(false)}
                    className="absolute top-4 right-4 btn-icon"
                >
                    ✕
                </button>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <RefreshCw size={24} className="text-green-500" /> Settle Up
                </h2>
                <form onSubmit={handleSettleUpSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Paying to</label>
                        <select 
                            className="input w-full"
                            value={settleToUser}
                            onChange={handleRecipientChange}
                            required
                        >
                            {group.members_details
                                .filter(m => m.id !== (user.id || user._id))
                                .map(m => (
                                    <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold">$</span>
                            <input 
                                type="number" 
                                step="0.01"
                                className="input w-full pl-8 font-mono text-lg"
                                value={settleAmount}
                                onChange={(e) => setSettleAmount(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="pt-2">
                        <button type="submit" className="btn btn-primary w-full py-3 text-lg">
                            Record Payment
                        </button>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] text-center mt-2">
                        This will create a payment expense record.
                    </p>
                </form>
            </div>
        </div>
      )}

      {/* Tabs - Segmented Control */}
      <div className="segmented-control mb-6 grid grid-cols-3">
        <button 
          className={`segmented-item ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          Expenses
        </button>
        <button 
          className={`segmented-item ${activeTab === 'balances' ? 'active' : ''}`}
          onClick={() => setActiveTab('balances')}
        >
          Balances
        </button>
        <button 
          className={`segmented-item ${activeTab === 'charts' ? 'active' : ''}`}
          onClick={() => setActiveTab('charts')}
        >
          Charts
        </button>
      </div>

      {/* Content */}
      <div className="flex flex-col gap-4">
        {activeTab === 'expenses' && (
          expenses.length === 0 ? (
            <div className="text-center py-10 text-[var(--text-muted)]">
                <Receipt size={48} className="mx-auto mb-2 opacity-50" />
                <p>No expenses yet.</p>
                <Link to={`/groups/${id}/add-expense`} className="btn-ghost text-[var(--primary)] font-bold">Add your first expense</Link>
            </div>
          ) : (
            expenses.map(exp => (
              <div key={exp._id} className="card p-4 flex justify-between items-center group relative hover:border-[var(--primary)] transition-colors cursor-pointer" onClick={() => window.location.href=`/groups/${id}/edit-expense/${exp._id}`}>
                <div className="flex items-center gap-3">
                    <div className="bg-[var(--bg-input)] p-2 rounded-full text-[var(--text-muted)]">
                        {/* Could replace with payer avatar, but receipt icon is also fine. Let's stick to receipt for generic list, or maybe category icon */}
                        <Receipt size={20} />
                    </div>
                    <div>
                        <h4 className="font-bold m-0">{exp.description}</h4>
                        <div className="flex items-center gap-2 text-xs text-[var(--text-muted)] mt-1">
                             <div className="flex items-center gap-1">
                                {renderAvatar(getMemberData(exp.payer_id), "w-4 h-4", "text-[8px]")}
                                <span className="font-bold text-[var(--text-main)]">{getMemberData(exp.payer_id).name}</span>
                             </div>
                            <span>paid ${exp.amount}</span>
                            {exp.category && <span>• {exp.category}</span>}
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="font-mono font-bold text-lg">${exp.amount}</span>
                </div>
              </div>
            ))
          )
        )}

        {activeTab === 'balances' && (
          balances.length === 0 ? (
             <div className="text-center py-10 text-[var(--text-muted)]">
                <RefreshCw size={48} className="mx-auto mb-2 opacity-50" />
                <p>All settled up!</p>
            </div>
          ) : (
            <div className="space-y-2">
            {balances.map((settlement, idx) => {
               const fromUser = getMemberData(settlement.from);
               const toUser = getMemberData(settlement.to);
               return (
               <div key={idx} className="balance-item">
                    <div className="balance-user flex flex-col items-center">
                        <div className="mb-2">
                             {renderAvatar(fromUser, "w-8 h-8")}
                        </div>
                        <span className="text-xs font-bold truncate w-full px-1">{fromUser.name}</span>
                   </div>
                   
                   <div className="balance-arrow px-2">
                        <span className="text-[9px] uppercase font-bold text-[var(--text-muted)] mb-1">PAYS</span>
                        <div className="w-full h-[1px] bg-[var(--border-color)] relative">
                             <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-1 bg-[var(--text-muted)] rounded-full"></div>
                        </div>
                   </div>

                   <div className="balance-amount bg-[var(--bg-input)] text-[var(--text-main)] px-3 py-1 rounded-md text-sm font-mono font-bold mx-2">
                       ${settlement.amount}
                   </div>
                   
                   <div className="balance-arrow px-2 rotate-180 opacity-0"></div>

                    <div className="balance-user flex flex-col items-center">
                         <div className="mb-2">
                             {renderAvatar(toUser, "w-8 h-8")}
                        </div>
                        <span className="text-xs font-bold truncate w-full px-1">{toUser.name}</span>
                   </div>
               </div>
               );
            })}
            </div>
          )
        )}

        {activeTab === 'charts' && (
             <div className="grid gap-6">
                 {/* Category Breakdown */}
                 <div className="card p-4 bg-[var(--bg-card)] border border-[var(--border-color)]">
                     <h3 className="font-bold mb-4 flex items-center gap-2 text-[var(--text-main)]">
                         <Receipt size={18} className="text-[var(--primary)]"/> Spending by Category
                     </h3>
                     <div style={{ width: '100%', height: 300, minHeight: 300 }}>
                        {(() => {
                            const catData = {};
                            expenses.forEach(e => {
                                const c = e.category || 'General';
                                catData[c] = (catData[c] || 0) + e.amount;
                            });
                            const data = Object.keys(catData).map(k => ({ name: k, value: catData[k] }));
                            const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];
                            
                            if (data.length === 0) return <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">No expenses to display</div>;

                            return (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={data}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={60}
                                            outerRadius={80}
                                            paddingAngle={5}
                                            dataKey="value"
                                        >
                                            {data.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} stroke="var(--bg-card)" strokeWidth={2} />
                                            ))}
                                        </Pie>
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-main)' }} />
                                    </PieChart>
                                </ResponsiveContainer>
                            );
                        })()}
                     </div>
                 </div>

                 {/* User Spending */}
                 <div className="card p-4 bg-[var(--bg-card)] border border-[var(--border-color)]">
                     <h3 className="font-bold mb-4 flex items-center gap-2 text-[var(--text-main)]">
                         <User size={18} className="text-[var(--secondary)]"/> Total Paid by User
                     </h3>
                     <div style={{ width: '100%', height: 300, minHeight: 300 }}>
                        {(() => {
                            const userData = {};
                            expenses.forEach(e => {
                                const userName = getMemberData(e.payer_id).name;
                                userData[userName] = (userData[userName] || 0) + e.amount;
                            });
                            const data = Object.keys(userData).map(k => ({ name: k, amount: userData[k] }));
                            
                            if (data.length === 0) return <div className="h-full flex items-center justify-center text-[var(--text-muted)] text-sm">No expenses to display</div>;

                            return (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={data}>
                                        <XAxis dataKey="name" tick={{fill: 'var(--text-muted)', fontSize: 12}} interval={0} />
                                        <Tooltip contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }} itemStyle={{ color: 'var(--text-main)' }} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                                        <Bar dataKey="amount" fill="var(--secondary)" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            );
                        })()}
                     </div>
                 </div>
             </div>
        )}
      </div>
    </div>
  );
}

export default GroupDetails;
