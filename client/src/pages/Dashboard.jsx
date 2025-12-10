import React, { useState, useEffect } from 'react';
import api from '../api';
import { Link } from 'react-router-dom';
import { PlusCircle, Users, ArrowRight, Activity, TrendingUp, DollarSign } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

function Dashboard() {
  const [groups, setGroups] = useState([]);
  const [stats, setStats] = useState({ total_spent: 0, monthly_activity: [] });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [groupsRes, statsRes] = await Promise.all([
            api.get('/groups/my'),
            api.get('/users/stats')
        ]);
        setGroups(groupsRes.data);
        setStats(statsRes.data);
      } catch (err) {
        console.error("Failed to fetch dashboard data", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="pb-20">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
      </div>

    {/* Global Stats */}
    {/* Global Stats */}
      {/* Overall Net Balance Banner */}
      {stats.net_balance !== undefined && Math.abs(stats.net_balance) >= 0.01 && (
          <div 
            className="mb-6 p-4 rounded-xl border flex items-center gap-4"
            style={{ 
                backgroundColor: stats.net_balance > 0 ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)",
                borderColor: stats.net_balance > 0 ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"
            }}
          >
            <div 
                className="rounded-full flex items-center justify-center font-bold text-2xl text-white"
                style={{ 
                    backgroundColor: stats.net_balance > 0 ? "#22c55e" : "#ef4444",
                    width: '48px', height: '48px', minWidth: '48px'
                }}
            >
                {stats.net_balance > 0 ? "+" : "-"}
            </div>
            <p 
                className="text-lg font-bold leading-none" 
                style={{ color: stats.net_balance > 0 ? "#22c55e" : "#ef4444", margin: 0 }}
            >
                Overall, {stats.net_balance > 0 ? "you are owed" : "you owe"} <span className="text-2xl ml-1">${Math.abs(stats.net_balance).toLocaleString()}</span>
            </p>
          </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
           <div className="grid grid-cols-2 gap-4">
               {/* Total Paid (Cash Out) */}
               <div className="card p-4 flex flex-col justify-between bg-[var(--bg-card)] border border-[var(--border-color)]">
                   <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-[var(--secondary)]" />
                       <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">Total Paid</span>
                   </div>
                   <div className="text-2xl font-bold text-[var(--text-main)]">
                       ${stats.total_paid?.toLocaleString() ?? 0}
                   </div>
               </div>

               {/* Total Spent (My Share / Cost) */}
               <div className="card p-4 flex flex-col justify-between bg-[var(--bg-card)] border border-[var(--border-color)]">
                   <div className="flex items-center gap-2 mb-2">
                       <DollarSign size={16} className="text-[var(--primary)]" />
                       <span className="text-xs text-[var(--text-muted)] font-bold uppercase tracking-wider">My Share</span>
                   </div>
                   <div className="text-2xl font-bold text-[var(--text-main)]">
                       ${stats.total_spent?.toLocaleString() ?? 0}
                   </div>
               </div>
           </div>
           
           <div className="card p-4 flex flex-col bg-[var(--bg-card)] border border-[var(--border-color)]">
               <div className="flex items-center gap-3 mb-4">
                   <div className="p-2 bg-[rgba(255,255,255,0.1)] rounded-full text-[var(--text-main)]">
                       <Activity size={20} />
                   </div>
                   <span className="text-[var(--text-muted)] font-medium">Monthly Activity</span>
               </div>
               <div style={{ width: '100%', height: 300, minHeight: 300 }}>
                {stats.monthly_activity && stats.monthly_activity.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.monthly_activity}>
                            <XAxis dataKey="name" tick={{fill: 'var(--text-muted)', fontSize: 12}} />
                            <Tooltip 
                                contentStyle={{ backgroundColor: 'var(--bg-card)', borderColor: 'var(--border-color)', borderRadius: '8px' }}
                                itemStyle={{ color: 'var(--text-main)' }}
                                cursor={{fill: 'rgba(255,255,255,0.05)'}}
                            />
                            <Bar dataKey="amount" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center h-full text-xs text-[var(--text-muted)]">No activity yet</div>
                )}
               </div>
           </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link to="/groups/create" className="card flex flex-col items-center justify-center p-4 hover:bg-[var(--bg-card)] border border-[var(--primary)] bg-[rgba(28,194,159,0.1)] text-center no-underline transition-all hover:scale-[1.02]">
          <div className="bg-[var(--primary)] p-3 rounded-full mb-2 text-white">
            <PlusCircle size={24} />
          </div>
          <span className="font-bold text-[var(--text-main)]">Create Group</span>
        </Link>
        <Link to="/groups/join" className="card flex flex-col items-center justify-center p-4 hover:bg-[var(--bg-card)] border border-[var(--secondary)] bg-[rgba(135,140,147,0.1)] text-center no-underline transition-all hover:scale-[1.02]">
          <div className="bg-[var(--secondary)] p-3 rounded-full mb-2 text-white">
            <Users size={24} />
          </div>
          <span className="font-bold text-[var(--text-main)]">Join Group</span>
        </Link>
      </div>

      <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
        <Users size={20} className="text-[var(--primary)]" /> My Groups
      </h2>

      {loading ? (
        <p className="text-center text-[var(--text-muted)] py-8">Loading dashboard...</p>
      ) : groups.length === 0 ? (
        <div className="card text-center py-8 border-dashed border-2 border-[var(--border-color)] bg-transparent">
          <p className="mb-4 text-[var(--text-muted)]">You are not part of any groups yet.</p>
          <Link to="/groups/create" className="btn inline-flex w-auto px-6">Get Started</Link>
        </div>
      ) : (
        <div className="grid gap-4">
          {groups.map((group) => (
            <Link key={group._id} to={`/groups/${group._id}`} className="card flex items-center justify-between hover:border-[var(--primary)] transition-all no-underline p-4 group">
              <div className="flex items-center gap-4">
                 <div className="w-8 h-8 bg-gradient-to-br from-[var(--bg-input)] to-[var(--bg-main)] rounded-full flex items-center justify-center text-xs font-bold border border-[var(--border-color)] overflow-hidden shrink-0 relative" style={{ width: '32px', height: '32px' }}>
                    {group.icon ? (
                       group.icon.match(/^http|\/uploads/) ? (
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
                 <div>
                    <h3 className="text-lg font-bold mb-1 group-hover:text-[var(--primary)] transition-colors">{group.name}</h3>
                    <p className="text-xs text-[var(--text-muted)] flex items-center gap-2">
                        <Users size={14} /> {group.members.length} members
                    </p>
                 </div>
              </div>
              <ArrowRight size={20} className="text-[var(--text-muted)] group-hover:translate-x-1 transition-transform" />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;
