import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { PlusCircle, Share2, ArrowLeft, Receipt, RefreshCw, Settings, User } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from 'recharts';
import Avatar from '../components/Avatar';
import SettleUpModal from '../components/SettleUpModal';

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
                 <Avatar user={group} size="w-8 h-8" />
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
        const color = isPositive ? "#22c55e" : "#ef4444";
        const bgColor = isPositive ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)";
        const borderColor = isPositive ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)";
        const icon = isPositive ? "+" : "-";
        const text = isPositive ? "you are owed" : "you owe";

        return (
            <div 
                className="mb-6 p-4 rounded-xl border flex items-center gap-4 justify-between"
                style={{ backgroundColor: bgColor, borderColor: borderColor }}
            >
                <div className="flex items-center gap-4 flex-1">
                    <div 
                        className="rounded-full flex items-center justify-center font-bold text-2xl text-white w-12 h-12 min-w-12 shrink-0"
                        style={{ backgroundColor: color }}
                    >
                        {icon}
                    </div>
                    <p className="text-lg font-bold leading-none m-0" style={{ color: color }}>
                        Overall, {text} <span className="text-2xl ml-1">${Math.abs(netBalance).toFixed(2)}</span>
                    </p>
                </div>
                
                    <button 
                        onClick={openSettleUp}
                        className="btn bg-white text-red-500 px-3 py-1 text-sm border border-current hover:bg-red-50 shrink-0"
                        style={{ width: 'auto' }}
                    >
                        Settle Up
                    </button>
            </div>
        );
      })()}

      {/* Settle Up Modal */}
      {/* Settle Up Modal */}
      <SettleUpModal 
        isOpen={settleModalOpen}
        onClose={() => setSettleModalOpen(false)}
        onSubmit={handleSettleUpSubmit}
        settleToUser={settleToUser}
        setSettleToUser={handleRecipientChange}
        settleAmount={settleAmount}
        setSettleAmount={setSettleAmount}
        members={group.members_details.filter(m => m.id !== (user.id || user._id))}
      />

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
                                <Avatar user={getMemberData(exp.payer_id)} size="w-4 h-4" fontSize="text-[8px]" />
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
                             <Avatar user={fromUser} size="w-8 h-8" />
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
                             <Avatar user={toUser} size="w-8 h-8" />
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
