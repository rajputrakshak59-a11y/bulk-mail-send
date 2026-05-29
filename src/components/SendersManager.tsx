import React, { useState } from 'react';
import { MailSenderSettings } from '../types';
import { Mail, CheckCircle, AlertTriangle, Trash2, Key, Users, Sparkles } from 'lucide-react';

interface AccountsManagerProps {
  senders: MailSenderSettings[];
  onUpdateSenders: (newSenders: MailSenderSettings[]) => void;
}

export const SendersManager: React.FC<AccountsManagerProps> = ({ senders, onUpdateSenders }) => {
  const [bulkInput, setBulkInput] = useState('');
  const [singleEmail, setSingleEmail] = useState('');
  const [singlePassword, setSinglePassword] = useState('');
  const [singleLimit, setSingleLimit] = useState(25);
  const [testingStatus, setTestingStatus] = useState<{ [key: string]: 'idle' | 'testing' | 'success' | 'failed' }>({});
  const [testError, setTestError] = useState<{ [key: string]: string }>({});

  const handleAddSingle = () => {
    if (!singleEmail || !singlePassword) return;

    const newSender: MailSenderSettings = {
      id: Math.random().toString(36).substring(7),
      email: singleEmail.trim(),
      appPassword: singlePassword.trim().replace(/\s+/g, ''),
      dailyLimit: singleLimit,
      sentToday: 0,
      status: 'active'
    };

    const updated = [...senders, newSender];
    onUpdateSenders(updated);
    
    // Clear form
    setSingleEmail('');
    setSinglePassword('');
  };

  const handleBulkAdd = () => {
    if (!bulkInput.trim()) return;

    const lines = bulkInput.split('\n');
    const newSenders: MailSenderSettings[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const parts = trimmed.split(',');
      if (parts.length >= 2) {
        const email = parts[0].trim();
        const appPassword = parts[1].trim().replace(/\s+/g, '');
        const limit = parts[2] ? Number(parts[2].trim()) : 25;

        if (email && appPassword && appPassword.length >= 12) {
          newSenders.push({
            id: Math.random().toString(36).substring(7),
            email,
            appPassword,
            dailyLimit: limit,
            sentToday: 0,
            status: 'active'
          });
        }
      }
    });

    if (newSenders.length > 0) {
      onUpdateSenders([...senders, ...newSenders]);
      setBulkInput('');
    }
  };

  const handleTestAccount = async (sender: MailSenderSettings) => {
    setTestingStatus(prev => ({ ...prev, [sender.id]: 'testing' }));
    try {
      const response = await fetch('/api/senders/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: sender.email, appPassword: sender.appPassword }),
      });
      const data = await response.json();
      if (data.success) {
        setTestingStatus(prev => ({ ...prev, [sender.id]: 'success' }));
        const updated = senders.map(s => s.id === sender.id ? { ...s, status: 'active' as const, error: undefined } : s);
        onUpdateSenders(updated);
      } else {
        setTestingStatus(prev => ({ ...prev, [sender.id]: 'failed' }));
        setTestError(prev => ({ ...prev, [sender.id]: data.error || 'Connection failed' }));
        const updated = senders.map(s => s.id === sender.id ? { ...s, status: 'invalid' as const, error: data.error } : s);
        onUpdateSenders(updated);
      }
    } catch (err: any) {
      setTestingStatus(prev => ({ ...prev, [sender.id]: 'failed' }));
      setTestError(prev => ({ ...prev, [sender.id]: err.message || 'Error occurred' }));
    }
  };

  const handleDeleteAccount = (id: string) => {
    const updated = senders.filter(s => s.id !== id);
    onUpdateSenders(updated);
  };

  const handleClearAll = async () => {
    if (confirm("Are you sure you want to clear all accounts?")) {
      const response = await fetch('/api/senders/clear', { method: 'POST' });
      if (response.ok) {
        onUpdateSenders([]);
      }
    }
  };

  const loadDummyAccounts = () => {
    const dummies: MailSenderSettings[] = [];
    for (let i = 1; i <= 200; i++) {
      dummies.push({
        id: `dummy-${i}`,
        email: `marketing.sender${i}@gmail.com`,
        appPassword: `abcd-efgh-ijkl-mno${i.toString().padStart(2, '0')}`,
        dailyLimit: 25,
        sentToday: 0,
        status: 'active'
      });
    }
    onUpdateSenders(dummies);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-purple-500/20 shadow-2xl p-6 sm:p-8 space-y-8">
      
      {/* HEADER ROW */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-900/30 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20 shadow-inner">
            <Key className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Configure GMail Sender Credentials</h2>
            <p className="text-purple-300 text-xs font-semibold">Automatic 16-Digit App Password looping & rotation</p>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={loadDummyAccounts}
            className="text-xs bg-purple-900/40 hover:bg-purple-900/70 text-purple-200 font-extrabold py-2.5 px-4 rounded-xl border border-purple-700/50 transition duration-150 cursor-pointer"
          >
            Demo-Load 200 Gmail Accounts
          </button>
          
          {senders.length > 0 && (
            <button 
              onClick={handleClearAll}
              className="text-xs bg-red-950/60 hover:bg-red-900/50 text-red-300 font-bold py-2.5 px-4 rounded-xl border border-red-800/60 transition duration-150 flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All ({senders.length})
            </button>
          )}
        </div>
      </div>

      {/* INPUT CORES COMPACT */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Single Gmail configure */}
        <div className="bg-slate-950/50 rounded-2xl p-6 border border-purple-500/10 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="font-extrabold text-white text-sm tracking-wide">Add Single Account</h3>
          </div>
          
          <div className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1">Gmail Address</label>
              <input 
                type="email" 
                placeholder="example@gmail.com"
                value={singleEmail}
                onChange={e => setSingleEmail(e.target.value)}
                className="w-full bg-slate-900/90 border border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1">16-Digit App Password</label>
              <input 
                type="password" 
                placeholder="xxxx xxxx xxxx xxxx"
                value={singlePassword}
                onChange={e => setSinglePassword(e.target.value)}
                className="w-full bg-slate-900/90 border border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-mono tracking-widest"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Generate in Google Account Settings under "2-Step Verification" &gt; "App Passwords".
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1">Sending limit (Per Mailer)</label>
              <input 
                type="number" 
                value={singleLimit}
                onChange={e => setSingleLimit(Number(e.target.value))}
                min="1"
                max="500"
                className="w-full bg-slate-900/90 border border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-bold"
              />
              <p className="text-[10.5px] text-indigo-300 mt-1 font-medium bg-indigo-950/30 p-2 rounded-lg border border-indigo-900/30">
                Recommended: 25 emails. Over 200 accounts, this triggers 5,000 inbox deliveries smoothly.
              </p>
            </div>

            <button
              onClick={handleAddSingle}
              disabled={!singleEmail || !singlePassword}
              className="w-full mt-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black py-3 rounded-xl transition duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-purple-950/30"
            >
              ADD SENDER TO ROTATOR LIST
            </button>
          </div>
        </div>

        {/* Bulk Add Gmails */}
        <div className="bg-slate-950/50 rounded-2xl p-6 border border-purple-500/10 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <h3 className="font-extrabold text-white text-sm tracking-wide">Bulk Accounts Import</h3>
            </div>
            <p className="text-[11px] text-slate-300">
              Format: <code className="bg-slate-900 p-1 rounded font-mono text-purple-300">email, appPassword, optionalLimit</code> (One account per line)
            </p>
            
            <textarea 
              rows={6}
              placeholder="one@gmail.com,abcd efgh ijkl mnop
two@gmail.com,pqrs tuvw xyza bcde,25"
              value={bulkInput}
              onChange={e => setBulkInput(e.target.value)}
              className="w-full bg-slate-900/90 border border-purple-900/40 rounded-xl px-4 py-3 text-xs text-white font-mono focus:outline-none focus:ring-2 focus:ring-purple-500 transition h-32 resize-none"
            />
          </div>

          <button
            onClick={handleBulkAdd}
            disabled={!bulkInput.trim()}
            className="w-full mt-4 bg-slate-800 hover:bg-slate-700 text-white text-xs font-black py-3 rounded-xl transition duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer border border-purple-900/30"
          >
            EXECUTE BULK IMPORT
          </button>
        </div>
      </div>

      {/* SENDER GRID AND VERIFICATIONS */}
      {senders.length > 0 && (
        <div className="space-y-4 pt-4">
          <h3 className="font-extrabold text-white text-base tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-purple-400" />
            Configured SMTP Pipelines ({senders.length}) 
            <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-800 px-3 py-1 rounded-full ml-auto">
              Ready Max Daily Volume: {senders.reduce((s, acc) => s + acc.dailyLimit, 0)} mails
            </span>
          </h3>

          <div className="max-h-80 overflow-y-auto border border-purple-900/20 rounded-2xl divide-y divide-purple-900/20 bg-slate-950/30 shadow-inner">
            {senders.map((sender, index) => (
              <div key={sender.id || index} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 hover:bg-purple-950/10 transition duration-150 gap-4">
                <div className="flex items-center gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-purple-900/30 text-purple-300 text-xs font-black flex items-center justify-center border border-purple-700/30">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-xs font-black text-white">{sender.email}</p>
                    <div className="flex flex-wrap items-center gap-2.5 mt-1">
                      <span className="text-[10px] text-zinc-400 font-mono">App Pass: ••••••••</span>
                      
                      <span className="text-[10px] text-indigo-300 bg-indigo-950/40 px-2 py-0.5 rounded border border-indigo-900/40 font-semibold">
                        Limit: {sender.sentToday}/{sender.dailyLimit} dispatched
                      </span>

                      {sender.status === 'active' ? (
                        <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3 text-emerald-400" /> Checked SMTP Active
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold text-red-300 bg-red-950/40 px-2 py-0.5 rounded border border-red-800 flex items-center gap-1" title={sender.error}>
                          <AlertTriangle className="w-3 h-3 text-red-400" /> Invalid/Incomplete: {sender.error || 'Failed'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 shrink-0">
                  <button 
                    onClick={() => handleTestAccount(sender)}
                    className="text-[11px] font-black tracking-wide text-purple-300 bg-purple-950/30 hover:bg-purple-900/50 border border-purple-800 px-3 py-1.5 rounded-lg transition duration-150 cursor-pointer"
                    disabled={testingStatus[sender.id] === 'testing'}
                  >
                    {testingStatus[sender.id] === 'testing' ? 'Verifying...' : 'Test SMTP Login'}
                  </button>
                  <button 
                    onClick={() => handleDeleteAccount(sender.id)}
                    className="text-slate-400 hover:text-red-400 rounded-lg p-2 hover:bg-red-500/10 transition duration-150 cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
