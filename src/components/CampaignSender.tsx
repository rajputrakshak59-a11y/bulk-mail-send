import React, { useState, useEffect } from 'react';
import { MailSenderSettings, Recipient, MailCampaign } from '../types';
import { Play, Pause, RefreshCw, Send, CheckCircle2, AlertCircle, Sparkles, Volume2 } from 'lucide-react';

interface CampaignTriggerProps {
  senders: MailSenderSettings[];
  recipients: Recipient[];
}

export const CampaignSender: React.FC<CampaignTriggerProps> = ({ senders, recipients }) => {
  const [subject, setSubject] = useState('Greetings {name}, special personal invitation');
  const [body, setBody] = useState(`Dear {name},

We noticed you are managing operations, and we wanted to offer a custom tailored evaluation. 

Let us know if we can schedule a quick 10-minute discovery call next week.

Best Regards,
Outreach Team`);

  const [campaign, setCampaign] = useState<MailCampaign | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isPolling, setIsPolling] = useState(false);
  const [generatorPrompt, setGeneratorPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Auto-poll campaign status when active
  useEffect(() => {
    let interval: any;
    if (campaign && (campaign.status === 'running' || isPolling)) {
      interval = setInterval(async () => {
        try {
          const res = await fetch(`/api/campaign/${campaign.id}`);
          const data = await res.json();
          if (data.success) {
            setCampaign(data.campaign);
            if (data.campaign.status === 'completed' || data.campaign.status === 'failed' || data.campaign.status === 'paused') {
              setIsPolling(false);
            }
          }
        } catch (err) {
          console.error("Error polling campaign:", err);
        }
      }, 2000);
    }
    return () => clearInterval(interval);
  }, [campaign, isPolling]);

  const playClickSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // A5 note
      gain.gain.setValueAtTime(0.1, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      osc.start();
      osc.stop(ctx.currentTime + 0.2);
    } catch (_) {}
  };

  const handleStartCampaign = async () => {
    playClickSound();
    if (senders.length === 0) {
      setErrorMessage("Please setup at least one Active Gmail sender in Step 1 first!");
      return;
    }
    if (recipients.length === 0) {
      setErrorMessage("Please load or import at least 1 recipient client in Step 2 first!");
      return;
    }

    setErrorMessage('');
    setIsCreating(true);

    try {
      const response = await fetch('/api/campaign/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, body, senders, recipients }),
      });
      const data = await response.json();
      if (data.success) {
        setCampaign(data.campaign);
        await handleControl(data.campaign.id, 'start');
      } else {
        setErrorMessage(data.error || 'Could not instantiate campaign');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error configuring bulk mailing campaign');
    } finally {
      setIsCreating(false);
    }
  };

  const handleControl = async (campaignId: string, action: 'start' | 'pause' | 'resume') => {
    playClickSound();
    try {
      const response = await fetch(`/api/campaign/${campaignId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (data.success) {
        setCampaign(data.campaign);
        if (action === 'start' || action === 'resume') {
          setIsPolling(true);
        } else {
          setIsPolling(false);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const generateAIEmail = async () => {
    if (!generatorPrompt.trim()) return;
    setIsGenerating(true);
    setErrorMessage('');
    try {
      const response = await fetch('/api/gemini/writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: generatorPrompt })
      });
      const data = await response.json();
      if (data.success) {
        if (data.subject) setSubject(data.subject);
        if (data.body) setBody(data.body);
        setGeneratorPrompt('');
      } else {
        setErrorMessage(data.error || 'Failed to generate cold email content from Gemini.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Connection failing to prompt generation engine.');
    } finally {
      setIsGenerating(false);
    }
  };

  const getStats = () => {
    if (!campaign) return { total: 0, sent: 0, failed: 0, pending: 0, current: 0 };
    const total = campaign.recipients.length;
    const sent = campaign.recipients.filter(r => r.status === 'sent').length;
    const failed = campaign.recipients.filter(r => r.status === 'failed').length;
    const pending = campaign.recipients.filter(r => r.status === 'pending').length;
    const current = campaign.currentIndex;
    return { total, sent, failed, pending, current };
  };

  const stats = getStats();

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-3xl border border-purple-500/20 shadow-2xl p-6 sm:p-8 space-y-8">
      
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-purple-900/30 pb-6">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-purple-500/10 text-purple-400 rounded-2xl border border-purple-500/20 shadow-inner">
            <Send className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight">Campaign Dispatcher Panel</h2>
            <p className="text-purple-300 text-xs font-semibold">Write highly tailored templates & rotate automatically over Gmail senders</p>
          </div>
        </div>
      </div>

      {errorMessage && (
        <div className="p-4 bg-red-950/40 border-2 border-red-800/60 text-red-300 rounded-2xl text-xs flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
          <div>{errorMessage}</div>
        </div>
      )}

      {/* AI TEMPLATE GENERATION BOX */}
      <div className="bg-gradient-to-r from-purple-950/40 via-indigo-950/40 to-slate-950/40 border border-purple-500/10 rounded-2xl p-5 shadow-inner">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4.5 h-4.5 text-purple-400 animate-pulse" />
          <h4 className="text-xs font-black text-purple-200 tracking-wider uppercase font-mono">
            RAKSHAK'S AI COLD-WRITING RADAR (POWERED BY GEMINI)
          </h4>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <input 
            type="text" 
            placeholder="e.g. Write a premium proposal letter for web construction, use {name} and {company}..."
            value={generatorPrompt}
            onChange={e => setGeneratorPrompt(e.target.value)}
            className="flex-1 bg-slate-900/90 border border-purple-900/40 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500 transition font-medium"
          />
          <button 
            onClick={generateAIEmail}
            disabled={isGenerating || !generatorPrompt.trim()}
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2.5 px-5 rounded-xl border border-purple-400/30 shadow-lg transition duration-150 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
          >
            {isGenerating ? 'Drafting...' : 'AUTO-WRITE PROPOSAL'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* TEMPLATE EDITING PANEL */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="relative group bg-slate-950/60 p-5 rounded-2xl border-2 border-purple-500/20 hover:border-purple-500/50 transition-all duration-300">
            <div className="absolute top-2 right-4 text-[9px] font-bold font-orbitron text-amber-400 bg-amber-950/40 px-2.5 py-1 rounded-full border border-amber-800/40 tracking-wider">
              EDITABLE SUBJECT
            </div>
            <label className="block text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-200 to-yellow-400 uppercase tracking-widest mb-2 font-orbitron">
              Campaign Subject Template *
            </label>
            <input 
              type="text" 
              value={subject}
              onChange={e => setSubject(e.target.value)}
              className="w-full bg-slate-900/90 border border-purple-900/40 hover:border-purple-500/50 focus:border-amber-400 rounded-xl px-4 py-3.5 text-sm font-bold text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all duration-150"
              placeholder="Enter subject here (e.g. Greetings {name}, high conversion offer inside)"
            />
            <p className="text-[10px] text-slate-400 mt-2">
              Supports dynamic placeholders like <code className="text-amber-400 bg-slate-900 px-1 py-0.5 rounded font-mono">{"{name}"}</code> and custom CSV keys.
            </p>
          </div>

          <div className="relative group bg-slate-950/60 p-5 rounded-2xl border-2 border-purple-500/20 hover:border-purple-500/50 transition-all duration-300">
            <div className="absolute top-2 right-4 text-[9px] font-bold font-orbitron text-purple-400 bg-purple-950/40 px-2.5 py-1 rounded-full border border-purple-800/40 tracking-wider">
              EDITABLE MESSAGE BODY
            </div>
            <label className="block text-xs font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-300 to-indigo-300 uppercase tracking-widest mb-2 font-orbitron">
              Email Message Content (Supports HTML/Text with variables) *
            </label>
            <textarea 
              rows={11}
              value={body}
              onChange={e => setBody(e.target.value)}
              className="w-full bg-slate-900/90 border border-purple-900/40 hover:border-purple-500/50 focus:border-purple-400 rounded-xl px-4 py-4 text-xs font-mono text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition-all duration-150 leading-relaxed font-semibold resize-y"
              placeholder="Type or paste your message template here. Write whatever message body you want to send..."
            />
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between mt-3.5 gap-2 bg-slate-900/60 p-3 rounded-xl border border-purple-900/20">
              <span className="text-[10px] text-slate-400">
                Variables: Use <code className="bg-slate-950 text-amber-300 font-mono font-bold px-1.5 py-0.5 rounded border border-amber-900/40">{"{name}"}</code> or uploaded Excel/CSV headers.
              </span>
              <span className="text-[11px] text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 font-black tracking-wider font-orbitron">
                PREMIUM ROTATION SYSTEM ENGINE
              </span>
            </div>
          </div>

          {(!campaign || campaign.status === 'idle') && (
            <button
              onClick={handleStartCampaign}
              disabled={isCreating}
              className="w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black py-4.5 px-6 rounded-2xl shadow-2xl shadow-purple-950/40 border border-purple-400/40 transition-all transform hover:-translate-y-1 active:translate-y-0 active:scale-[0.99] flex items-center justify-center gap-2.5 cursor-pointer text-sm font-orbitron tracking-widest"
            >
              <Send className="w-5 h-5 text-purple-200 group-hover:scale-110 transition animate-pulse" />
              {isCreating ? 'Pre-Compiling Sequence...' : 'START LOOP RUN (25 MAILS PER GMAIL)'}
            </button>
          )}
        </div>

        {/* OPERATIONS CONSOLE MONITOR RIGHT SIDE */}
        <div className="bg-slate-950/70 rounded-2xl border border-purple-950/80 p-5 space-y-4">
          <h3 className="font-extrabold text-white text-xs tracking-widest uppercase font-mono text-purple-400 flex items-center gap-1.5 border-b border-purple-950/80 pb-3">
            <span className="w-2 h-2 rounded-full bg-purple-500 animate-ping"></span>
            Real-time Pipeline Dispatch Console
          </h3>

          {!campaign ? (
            <div className="h-64 text-center flex flex-col items-center justify-center text-slate-500 p-6 border border-dashed border-purple-900/20 rounded-2xl bg-slate-900/30">
              <Send className="w-8 h-8 opacity-20 text-purple-500 mb-3" />
              <p className="text-xs font-bold text-purple-300/60 uppercase tracking-wider font-mono">Sequence Standby</p>
              <p className="text-[10.5px] text-slate-500 mt-2 leading-relaxed">
                Add your 16-digit app passwords, load recipient names, and press "Start Loop Run" to initialize beautiful transmission.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              
              <div className="bg-slate-900/60 border border-purple-900/30 rounded-xl p-4 space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-widest font-bold uppercase text-slate-400 font-mono">Transmission State</span>
                  <span className={`text-[10px] items-center font-black tracking-widest px-2.5 py-1 rounded border uppercase font-mono ${
                    campaign.status === 'running' ? 'text-blue-300 bg-blue-950 border-blue-800 animate-pulse' :
                    campaign.status === 'completed' ? 'text-emerald-300 bg-emerald-950 border-emerald-800' :
                    campaign.status === 'paused' ? 'text-amber-300 bg-amber-950 border-amber-800' : 'text-slate-400 bg-slate-950 border-slate-800'
                  }`}>
                    ● {campaign.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-purple-950/60">
                    <p className="text-xl font-black text-white">{stats.sent}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Mails Sent</p>
                  </div>
                  <div className="bg-slate-950 p-2.5 rounded-lg border border-purple-950/60">
                    <p className="text-xl font-black text-red-400">{stats.failed}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">D bounces</p>
                  </div>
                </div>

                {/* Progress bar info */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between text-[11px] font-mono text-slate-300">
                    <span>Parsed Clients:</span>
                    <span className="font-bold">{stats.current} / {stats.total}</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden border border-purple-950/40">
                    <div 
                      className="bg-gradient-to-r from-purple-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${(stats.current / stats.total) * 100}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Console control operations */}
              <div className="flex gap-2">
                {campaign.status === 'running' ? (
                  <button 
                    onClick={() => handleControl(campaign.id, 'pause')}
                    className="flex-1 bg-amber-900/40 hover:bg-amber-900/70 border border-amber-800 text-amber-200 text-xs font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Pause className="w-4 h-4" /> PAUSE LOOP
                  </button>
                ) : (campaign.status === 'paused' || campaign.status === 'failed') ? (
                  <button 
                    onClick={() => handleControl(campaign.id, 'resume')}
                    className="flex-1 bg-emerald-900/40 hover:bg-emerald-800/40 border border-emerald-800 text-emerald-200 text-xs font-black py-2.5 rounded-xl flex items-center justify-center gap-1.5 transition cursor-pointer"
                  >
                    <Play className="w-4 h-4" /> RESUME SEQUENCE
                  </button>
                ) : null}

                <button 
                  onClick={async () => {
                    playClickSound();
                    const res = await fetch(`/api/campaign/${campaign.id}`);
                    const data = await res.json();
                    if (data.success) setCampaign(data.campaign);
                  }}
                  className="bg-slate-900 hover:bg-slate-800 border border-purple-950/80 text-purple-300 rounded-xl p-2.5 transition shrink-0 cursor-pointer"
                  title="Force Refresh Metrics"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Delivery logs terminal */}
              <div className="space-y-2 pt-2">
                <span className="text-[10px] tracking-widest font-black uppercase text-purple-400 font-mono">
                  LIVE DELIVERIES STATUS PROTOCOLS
                </span>
                <div className="bg-slate-950 border border-purple-950/80 text-slate-300 p-3 rounded-2xl font-mono text-[10px] h-48 overflow-y-auto space-y-1.5 shadow-inner leading-relaxed">
                  {campaign.recipients.map((rec, index) => (
                    <div key={rec.id} className="border-b border-purple-900/10 pb-1.5 last:border-none">
                      <div className="flex items-center justify-between gap-2.5">
                        <span className="text-[10px] text-slate-400 font-bold">#{index + 1}</span>
                        <span className="truncate max-w-[140px] font-medium text-slate-200" title={rec.email}>
                          {rec.email}
                        </span>
                        {rec.status === 'sent' && <span className="text-emerald-400 font-black">✔ OK</span>}
                        {rec.status === 'failed' && <span className="text-red-400 font-black">✗ ERR</span>}
                        {rec.status === 'sending' && <span className="text-blue-400 animate-pulse">⚙ WORK</span>}
                        {rec.status === 'pending' && <span className="text-slate-600">⏰ CLUE</span>}
                      </div>
                      
                      {rec.sentBySenderEmail && (
                        <div className="text-[9px] text-zinc-500 mt-0.5">
                          Rotator node: <span className="text-purple-300 font-medium">{rec.sentBySenderEmail}</span>
                        </div>
                      )}

                      {rec.error && (
                        <div className="text-red-400 text-[9.5px] mt-0.5 italic leading-snug">
                          Reason: {rec.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
};
