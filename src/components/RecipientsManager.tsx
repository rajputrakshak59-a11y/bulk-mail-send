import React, { useState } from 'react';
import { Recipient } from '../types';
import { Users, Upload, Trash2, UserPlus, Sparkles } from 'lucide-react';

interface RecipientsManagerProps {
  recipients: Recipient[];
  onUpdateRecipients: (list: Recipient[]) => void;
}

export const RecipientsManager: React.FC<RecipientsManagerProps> = ({ recipients, onUpdateRecipients }) => {
  const [singleName, setSingleName] = useState('');
  const [singleEmail, setSingleEmail] = useState('');
  const [singleVars, setSingleVars] = useState('');
  const [singleCustomSubject, setSingleCustomSubject] = useState('');
  const [singleCustomBody, setSingleCustomBody] = useState('');
  const [csvText, setCsvText] = useState('');
  const [isDragging, setIsDragging] = useState(false);

  // Manual Add Recipient
  const handleAddSingle = () => {
    if (!singleEmail) return;

    const parsedVars: Record<string, string> = {};
    if (singleVars) {
      singleVars.split(';').forEach(p => {
        const [k, v] = p.split('=');
        if (k && v) {
          parsedVars[k.trim()] = v.trim();
        }
      });
    }

    const newRecipient: Recipient = {
      id: Math.random().toString(36).substring(7),
      name: singleName.trim(),
      email: singleEmail.trim(),
      variables: parsedVars,
      customSubject: singleCustomSubject.trim() || undefined,
      customBody: singleCustomBody.trim() || undefined,
      status: 'pending'
    };

    onUpdateRecipients([...recipients, newRecipient]);
    setSingleName('');
    setSingleEmail('');
    setSingleVars('');
    setSingleCustomSubject('');
    setSingleCustomBody('');
  };

  const parseAndAddCsvLines = (text: string) => {
    const lines = text.split('\n');
    const parsed: Recipient[] = [];

    let headers: string[] = [];

    lines.forEach((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return;

      const cells = trimmed.split(',').map(c => c.trim());
      
      if (index === 0 && (trimmed.toLowerCase().includes('email') || trimmed.toLowerCase().includes('name'))) {
        headers = cells.map(h => h.toLowerCase());
        return;
      }

      if (cells.length >= 1) {
        let name = '';
        let email = '';
        const variables: Record<string, string> = {};

        if (headers.length > 0) {
          cells.forEach((cell, cellIdx) => {
            const headerName = headers[cellIdx];
            if (headerName === 'name') name = cell;
            else if (headerName === 'email') email = cell;
            else if (headerName) {
              variables[headerName] = cell;
            }
          });
        } else {
          name = cells[0] || '';
          email = cells[1] || '';
          for (let i = 2; i < cells.length; i++) {
            variables[`var${i - 1}`] = cells[i];
          }
        }

        if (!email.includes('@') && name.includes('@')) {
          const temp = name;
          name = '';
          email = temp;
        }

        if (email && email.includes('@')) {
          parsed.push({
            id: Math.random().toString(36).substring(7),
            name,
            email,
            variables,
            status: 'pending'
          });
        }
      }
    });

    if (parsed.length > 0) {
      onUpdateRecipients([...recipients, ...parsed]);
      setCsvText('');
    }
  };

  const handleBulkAdd = () => {
    parseAndAddCsvLines(csvText);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        parseAndAddCsvLines(text);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          parseAndAddCsvLines(text);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDelete = (id: string) => {
    onUpdateRecipients(recipients.filter(r => r.id !== id));
  };

  const handleClearAll = () => {
    if (confirm("Are you sure you want to remove all recipients?")) {
      onUpdateRecipients([]);
    }
  };

  const loadTestData = () => {
    const placeholderRecipients: Recipient[] = [];
    for (let i = 1; i <= 25; i++) {
      placeholderRecipients.push({
        id: `client-${i}`,
        name: `Client Name ${i}`,
        email: `client${i}@example.com`,
        variables: {
          company: `Business Corp ${i}`,
          product: `Interactive Platform ${i}`
        },
        status: 'pending'
      });
    }
    onUpdateRecipients(placeholderRecipients);
  };

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-purple-500/20 shadow-2xl p-6 sm:p-8 space-y-8">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-900/30 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20 shadow-inner">
            <Users className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Recipients Directory ({recipients.length})</h2>
            <p className="text-purple-300 text-xs font-semibold">Upload customer address lists with custom template substitutions</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button 
            onClick={loadTestData}
            className="text-xs bg-purple-900/40 hover:bg-purple-900/75 text-purple-200 font-extrabold py-2.5 px-4 rounded-xl border border-purple-700/50 transition duration-150 cursor-pointer"
          >
            Demo-Load 25 Clients
          </button>
          
          {recipients.length > 0 && (
            <button 
              onClick={handleClearAll}
              className="text-xs bg-red-950/60 hover:bg-red-900/50 text-red-300 font-bold py-2.5 px-4 rounded-xl border border-red-800/60 transition duration-150 flex items-center gap-1.5 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All Clients
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Single client input row */}
        <div className="bg-slate-950/50 rounded-2xl p-6 border border-purple-500/10 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <UserPlus className="w-4 h-4 text-purple-400" />
            <h3 className="font-extrabold text-white text-sm tracking-wide">Add Single Recipient</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1">Full Client Name</label>
              <input 
                type="text" 
                placeholder="John Doe"
                value={singleName}
                onChange={e => setSingleName(e.target.value)}
                className="w-full bg-slate-900/90 border border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-purple-200 mb-1">Email Address *</label>
              <input 
                type="email" 
                placeholder="john@example.com"
                value={singleEmail}
                onChange={e => setSingleEmail(e.target.value)}
                className="w-full bg-slate-900/90 border border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-mono"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-purple-200 mb-1">Custom variables (e.g. key=val; key2=val2)</label>
            <input 
              type="text" 
              placeholder="company=Smart-Tech; product=Website Design"
              value={singleVars}
              onChange={e => setSingleVars(e.target.value)}
              className="w-full bg-slate-900/90 border border-purple-900/40 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-normal"
            />
            <p className="text-[10px] text-slate-400 mt-1.5">
              Available placeholders: <code className="bg-slate-900 px-1 py-0.5 rounded text-[10px] text-purple-300">{"{company}"}</code>, <code className="bg-slate-900 px-1 py-0.5 rounded text-[10px] text-purple-300">{"{product}"}</code>
            </p>
          </div>

          <div className="border border-amber-500/20 bg-amber-950/10 p-3.5 rounded-xl space-y-3.5">
            <span className="block text-[9px] font-black tracking-widest text-amber-400 font-orbitron uppercase">
              👑 CLIENT SPECIFIC MESSAGE OVERRIDE (OPTIONAL)
            </span>
            <div>
              <label className="block text-[10px] font-bold text-amber-200 mb-1">Custom Subject for this Recipient</label>
              <input 
                type="text" 
                placeholder="Type dynamic unique subject for this recipient"
                value={singleCustomSubject}
                onChange={e => setSingleCustomSubject(e.target.value)}
                className="w-full bg-slate-900/90 border border-amber-900/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-450 transition font-medium"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-amber-200 mb-1">Custom Message Body / Content</label>
              <textarea 
                rows={2}
                placeholder="Type dynamic custom message body for this client here..."
                value={singleCustomBody}
                onChange={e => setSingleCustomBody(e.target.value)}
                className="w-full bg-slate-900/90 border border-amber-900/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-450 transition font-sans resize-y font-semibold"
              />
            </div>
          </div>

          <button 
            onClick={handleAddSingle}
            disabled={!singleEmail}
            className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-black py-3 rounded-xl shadow-lg transition duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            ADD TO MASTER DIRECTORY
          </button>
        </div>

        {/* Drag n Drop Upload Box */}
        <div className="space-y-4">
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragging ? 'bg-purple-950/30 border-purple-500' : 'bg-slate-950/50 border-purple-900/40'
            }`}
          >
            <Upload className="w-10 h-10 text-purple-400 mx-auto mb-3 animate-bounce" />
            <h3 className="font-extrabold text-white text-xs mb-1">Drag &amp; Drop Client List File</h3>
            <p className="text-[11px] text-slate-300 mb-4">Accepts spreadsheet CSV or structured text format files</p>
            
            <input 
              type="file" 
              accept=".csv,.txt"
              onChange={handleFileUpload}
              className="hidden" 
              id="csv-file-upload-updated"
            />
            <label 
              htmlFor="csv-file-upload-updated" 
              className="cursor-pointer inline-flex items-center text-xs font-extrabold bg-slate-900 border border-purple-900/50 py-2.5 px-4 rounded-xl hover:bg-slate-800 transition"
            >
              Select CSV/TXT File
            </label>
          </div>

          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="Or paste comma separated cells directly (e.g., John, john@example.com)"
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
              className="flex-1 bg-slate-900 border border-purple-900/40 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-mono"
            />
            <button 
              onClick={handleBulkAdd}
              disabled={!csvText.trim()}
              className="bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-bold text-xs py-2.5 px-4 rounded-xl border border-purple-900/20"
            >
              Paste Add
            </button>
          </div>
        </div>
      </div>

      {/* RECIPIENTS TABLE */}
      {recipients.length > 0 && (
        <div className="border border-purple-900/20 rounded-2xl overflow-hidden bg-slate-950/30">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-900 text-purple-200 border-b border-purple-900/30 font-extrabold tracking-wide uppercase">
                <tr>
                  <th className="p-3.5">#</th>
                  <th className="p-3.5">Client Name</th>
                  <th className="p-3.5">Email Destination</th>
                  <th className="p-3.5">Custom Subject / Body</th>
                  <th className="p-3.5">Registered Custom Substitutes</th>
                  <th className="p-3.5 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-purple-900/10">
                {recipients.map((rec, index) => (
                  <tr key={rec.id} className="hover:bg-purple-950/10 transition">
                    <td className="p-3.5 text-purple-400 font-mono font-bold">{index + 1}</td>
                    <td className="p-3.5 font-bold text-white">{rec.name || <span className="text-zinc-500 italic">Unidentified</span>}</td>
                    <td className="p-3.5 font-mono text-indigo-200">{rec.email}</td>
                    <td className="p-3.5">
                      {rec.customSubject || rec.customBody ? (
                        <div className="space-y-1 max-w-xs text-[11px]">
                          {rec.customSubject && (
                            <div className="text-amber-350 font-bold truncate">
                              <span className="text-[9px] text-amber-500 font-mono font-bold uppercase mr-1 bg-amber-950/40 px-1 rounded border border-amber-800/20">Subj</span> 
                              "{rec.customSubject}"
                            </div>
                          )}
                          {rec.customBody && (
                            <div className="text-slate-300 font-medium line-clamp-2 leading-tight">
                              <span className="text-[9px] text-purple-400 font-mono font-bold uppercase mr-1 bg-purple-950/40 px-1 rounded border border-purple-800/20">Msg</span> 
                              {rec.customBody}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-[11px]">No custom overriding message</span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(rec.variables || {}).map(([key, val]) => (
                          <span key={key} className="bg-purple-950/50 text-purple-300 border border-purple-800/40 px-2 py-0.5 rounded text-[10px] font-mono font-medium">
                            {key}: {val}
                          </span>
                        ))}
                        {Object.keys(rec.variables || {}).length === 0 && (
                          <span className="text-zinc-500 italic text-[10px]">No template placeholders loaded</span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-right">
                      <button 
                        onClick={() => handleDelete(rec.id)}
                        className="text-slate-400 hover:text-red-400 p-2 hover:bg-red-500/10 rounded-lg duration-150 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
