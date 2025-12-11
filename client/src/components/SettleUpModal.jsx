import React from 'react';
import { RefreshCw } from 'lucide-react';

const SettleUpModal = ({ isOpen, onClose, onSubmit, settleToUser, setSettleToUser, settleAmount, setSettleAmount, members }) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="card w-full max-w-md p-6 shadow-2xl relative animate-in zoom-in-95 duration-200 border border-[var(--border-color)]">
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 btn-icon"
                >
                    ✕
                </button>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                    <RefreshCw size={24} className="text-green-500" /> Settle Up
                </h2>
                <form onSubmit={onSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Paying to</label>
                        <select 
                            className="input w-full"
                            value={settleToUser}
                            onChange={setSettleToUser} // Expecting handler here
                            required
                        >
                            {members.map(m => (
                                <option key={m.id} value={m.id}>{m.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-[var(--text-muted)] mb-1">Amount</label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] font-bold">₹</span>
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
    );
};

export default SettleUpModal;
