import React, { useState, useEffect, useRef } from 'react';
import { Mail, Settings, RefreshCw, Sparkles, ShieldCheck, Play, Pause, AlertCircle, Eye, EyeOff, CheckCircle2, Flame, RefreshCcw, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Recipient {
  id: string;
  name: string;
  email: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  error?: string;
}

export default function App() {
  // Gmail & Credentials State (Left Card)
  const [gmail, setGmail] = useState(() => localStorage.getItem('rakshak_gmail') || 'you@gmail.com');
  const [appPassword, setAppPassword] = useState(() => localStorage.getItem('rakshak_password') || '');
  const [showPassword, setShowPassword] = useState(false);
  const [senderName, setSenderName] = useState(() => localStorage.getItem('rakshak_sender_name') || 'Rakshak Rajput');
  
  // Message Content (Left Card)
  const [subject, setSubject] = useState('Greetings {name}, premium customized presentation');
  const [body, setBody] = useState(`Dear {name},

We noticed you are managing operations, and we wanted to offer a custom tailored evaluation. 

Let us know if we can schedule a quick 10-minute discovery call next week.

Best Regards,
Outreach Team`);

  // Recipients State (Right Card Top)
  const [rawRecipients, setRawRecipients] = useState(`john@example.com
jane@example.com`);
  const [parsedRecipients, setParsedRecipients] = useState<Recipient[]>([]);

  // Sound Engine
  const playSoundChime = (freq = 880, duration = 0.15) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.05);
    } catch (_) {}
  };

  // Sound effects of Welcome Entrance
  const playWelcomeSound = () => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
      gain1.gain.setValueAtTime(0.1, ctx.currentTime);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.4);

      setTimeout(() => {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.frequency.setValueAtTime(783.99, ctx.currentTime); // G5
        gain2.gain.setValueAtTime(0.12, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.52);
      }, 120);
    } catch (_) {}
  };

  // Save Credentials locally for comfort
  useEffect(() => {
    localStorage.setItem('rakshak_gmail', gmail);
    localStorage.setItem('rakshak_password', appPassword);
    localStorage.setItem('rakshak_sender_name', senderName);
  }, [gmail, appPassword, senderName]);

  // Dynamic parse recipients on edit text to show count real-time in the header
  useEffect(() => {
    if (!rawRecipients.trim()) {
      setParsedRecipients([]);
      return;
    }
    const lines = rawRecipients.split(/[\n,;]/);
    const parsed: Recipient[] = [];
    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed) return;

      // Extract raw emails
      const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
      const match = trimmed.match(emailRegex);
      if (match) {
        const email = match[0];
        let name = trimmed.replace(email, '').replace(/["'<>()&]/g, '').trim();
        if (name.endsWith(',')) name = name.slice(0, -1).trim();

        parsed.push({
          id: Math.random().toString(36).substring(7),
          name: name || email.split('@')[0],
          email,
          status: 'pending'
        });
      }
    });
    setParsedRecipients(parsed);
  }, [rawRecipients]);

  // timing / rate settings (user instruction speed adjustment)
  // Lightning Speed: 2 seconds for 25 mails (approx 80ms)
  // Fast Speed: 1 second for 5 mails (200ms)
  // Safe Speed: 10 seconds for 25 mails (400ms)
  // Custom Slider: from 50ms up to 5000ms delay per email
  const [delayMs, setDelayMs] = useState(400); 

  // Welcome banner state
  const [welcomeOpen, setWelcomeOpen] = useState(true);

  // Campaign State
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [campaignStatus, setCampaignStatus] = useState<'idle' | 'running' | 'paused' | 'completed' | 'failed'>('idle');
  const [activeRecipients, setActiveRecipients] = useState<Recipient[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // States for interactive notifications
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isTestingCredentials, setIsTestingCredentials] = useState(false);
  const [isCreatingCampaign, setIsCreatingCampaign] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [aiPrompt, setAiPrompt] = useState('');

  // Auto-polling for real-time state when running
  useEffect(() => {
    let timer: any;
    if (campaignId && campaignStatus === 'running') {
      timer = setInterval(async () => {
        try {
          const res = await fetch(`/api/campaign/${campaignId}`);
          const data = await res.json();
          if (data.success && data.campaign) {
            setCampaignStatus(data.campaign.status);
            setCurrentIndex(data.campaign.currentIndex);
            setActiveRecipients(data.campaign.recipients);
            if (data.campaign.status === 'completed' || data.campaign.status === 'failed' || data.campaign.status === 'paused') {
              setCampaignStatus(data.campaign.status);
            }
          }
        } catch (err) {
          console.error('Error fetching loop update: ', err);
        }
      }, 900);
    }
    return () => clearInterval(timer);
  }, [campaignId, campaignStatus]);

  // Test active gmail credential block
  const handleTestCredential = async () => {
    playSoundChime(600, 0.1);
    if (!gmail || gmail === 'you@gmail.com') {
      setErrorMessage("Enter a valid Gmail user credential first.");
      return;
    }
    if (!appPassword) {
      setErrorMessage("Please type your 16-character Google App Password.");
      return;
    }

    setIsTestingCredentials(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/senders/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: gmail, appPassword })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage("Connection Verified! Gmail authenticated successfully.");
        playSoundChime(880, 0.25);
      } else {
        setErrorMessage(data.error || "Authentication failed. Double check your 16-digit app password.");
        playSoundChime(350, 0.3);
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to contact SMTP verification server.");
    } finally {
      setIsTestingCredentials(false);
    }
  };

  // Launch Gemini AI content generator wizard
  const handleGenerateAIProposal = async () => {
    playSoundChime(600, 0.1);
    if (!aiPrompt.trim()) return;
    setIsGeneratingAI(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const res = await fetch('/api/gemini/writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: aiPrompt })
      });
      const data = await res.json();
      if (data.success) {
        if (data.subject) setSubject(data.subject);
        if (data.body) setBody(data.body);
        setSuccessMessage("Gemini smart cold proposal drafted successfully!");
        setAiPrompt('');
        playSoundChime(950, 0.2);
      } else {
        setErrorMessage(data.error || "Failed to make call to AI Gemini server.");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to retrieve template proposal text.");
    } finally {
      setIsGeneratingAI(false);
    }
  };

  // Start sequence transmission loop
  const handleStartSending = async () => {
    playSoundChime(750, 0.15);
    if (parsedRecipients.length === 0) {
      setErrorMessage("Please load or paste at least one recipient email address first.");
      return;
    }
    if (!gmail || gmail === 'you@gmail.com') {
      setErrorMessage("Configure your sender Gmail first.");
      return;
    }
    if (!appPassword) {
      setErrorMessage("Configure your 16-character App Password to allow SMTP connection.");
      return;
    }

    setIsCreatingCampaign(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // Create campaign dynamically
      const sendersPayload = [{
        id: 'active-sender',
        email: gmail.trim(),
        appPassword: appPassword.replace(/\s+/g, ''),
        dailyLimit: 2500,
        sentToday: 0,
        status: 'active' as const
      }];

      const res = await fetch('/api/campaign/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subject.trim(),
          body: body.trim(),
          recipients: parsedRecipients,
          senders: sendersPayload,
          delayMs: delayMs
        })
      });

      const data = await res.json();
      if (data.success && data.campaign) {
        setCampaignId(data.campaign.id);
        setActiveRecipients(data.campaign.recipients);
        setCurrentIndex(0);

        // Turn sending on
        const controlRes = await fetch(`/api/campaign/${data.campaign.id}/control`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'start' })
        });
        const controlData = await controlRes.json();
        if (controlData.success) {
          setCampaignStatus('running');
          setSuccessMessage(`Delivery loop started! Moving at 1 email every ${delayMs}ms.`);
        }
      } else {
        setErrorMessage(data.error || "Could not instantiate transaction sequence.");
      }
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to initiate sending session.");
    } finally {
      setIsCreatingCampaign(false);
    }
  };

  // Switch between play/pause loop sending
  const handlePauseResume = async () => {
    if (!campaignId) return;
    playSoundChime(800, 0.12);
    const toggleAction = campaignStatus === 'running' ? 'pause' : 'resume';
    try {
      const res = await fetch(`/api/campaign/${campaignId}/control`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: toggleAction })
      });
      const data = await res.json();
      if (data.success) {
        setCampaignStatus(data.campaign.status);
        if (toggleAction === 'resume') {
          setSuccessMessage("Sending loop resumed successfully!");
        } else {
          setSuccessMessage("Sending loop paused! Standby...");
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Fully clear sending progress to begin again
  const handleResetProgress = () => {
    playSoundChime(450, 0.2);
    setCampaignId(null);
    setCampaignStatus('idle');
    setCurrentIndex(0);
    // Refresh list of active recipients from the paste textarea
    if (rawRecipients) {
      setRawRecipients(prev => prev); // triggers parse
    }
    setSuccessMessage("Progress monitor stats reset to standby successfully.");
  };

  const dismissWelcome = () => {
    playWelcomeSound();
    setWelcomeOpen(false);
  };

  // Math calculated stats counters
  const totalCount = parsedRecipients.length;
  const sentCount = campaignId ? activeRecipients.filter(r => r.status === 'sent').length : 0;
  const failedCount = campaignId ? activeRecipients.filter(r => r.status === 'failed').length : 0;
  const remainingCount = totalCount - sentCount - failedCount;

  return (
    <div className="relative min-h-screen bg-slate-950 font-sans antialiased text-slate-100 overflow-x-hidden selection:bg-purple-600 selection:text-white">
      
      {/* BACKGROUND TEXT WATERMARK */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden opacity-[0.012] select-none flex flex-wrap gap-x-24 gap-y-16 items-center justify-center p-8">
        {Array.from({ length: 24 }).map((_, i) => (
          <div 
            key={i} 
            className="text-3xl font-black tracking-[0.25em] font-mono text-purple-400 uppercase rotate-[-20deg] whitespace-nowrap"
          >
            RAKSHAK ROTATOR
          </div>
        ))}
      </div>

      {/* AMBIENT GLOW BACKDROPS */}
      <div className="pointer-events-none fixed top-12 left-1/3 w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[160px] z-0"></div>
      <div className="pointer-events-none fixed bottom-12 right-1/3 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[140px] z-0"></div>

      {/* WELCOME ENTRANCE COVER POPUP */}
      {welcomeOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/96 backdrop-blur-md">
          <div className="relative max-w-sm w-full bg-slate-900 border border-purple-500/20 rounded-2xl p-6 text-center shadow-[0_0_40px_rgba(168,85,247,0.15)]">
            
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-purple-500 to-transparent"></div>
            
            <div className="w-12 h-12 mx-auto rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 mb-4 shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>

            <p className="text-[9px] tracking-[0.22em] font-bold text-purple-400 uppercase font-mono mb-1">
              SMTP ROTATOR MATRIX
            </p>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">
              WELCOME <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-300 font-bold uppercase font-sans">RAKSHAK</span>
            </h2>

            <p className="text-slate-400 text-[11px] max-w-[260px] mx-auto mb-5 leading-normal">
              Your bulk mailers are active. Load clients & start dispatching high-speed rotators now.
            </p>

            <div className="border border-purple-500/15 bg-purple-950/20 rounded-xl py-2 px-3 mb-5 inline-flex flex-col items-center justify-center w-full">
              <span className="text-[8px] tracking-widest text-slate-500 font-bold uppercase mb-0.5">
                DEVELOPED BY CREATOR
              </span>
              <span className="text-[11px] text-purple-300 font-extrabold tracking-widest font-mono">
                RAKSHAK
              </span>
            </div>

            <button
              onClick={dismissWelcome}
              className="group relative w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold py-2.5 px-4 rounded-xl shadow-md transition-all cursor-pointer"
            >
              CONFIRM & OPEN ENGINE
            </button>
          </div>
        </div>
      )}

      {/* HEADER BAR */}
      <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-lg border-b border-purple-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center text-white border border-purple-500/30">
              <Mail className="w-4.5 h-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] tracking-wider bg-purple-900/50 text-purple-300 border border-purple-700/50 font-black px-1 rounded font-mono">
                  SUPREME SENDER
                </span>
                <span className="text-[10px] text-indigo-300 font-bold font-mono">
                  RAKSHAK
                </span>
              </div>
              <h1 className="text-sm font-black tracking-tight text-white font-sans">
                Professional Bulk GMail Rotator Platform
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] bg-purple-950/50 text-purple-300 font-semibold px-2.5 py-1 rounded-lg flex items-center gap-1.5 border border-purple-500/20">
              <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> SECURE INTEGRATED
            </span>
          </div>
        </div>
      </header>

      {/* MAIN LAYOUT WRAPPER */}
      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* BANNER NOTIFICATIONS */}
        {errorMessage && (
          <div className="p-3.5 bg-red-950/45 border border-red-800/60 text-red-300 rounded-xl text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0 text-red-400" />
            <div>
              <span className="font-extrabold uppercase mr-1">ERROR PROTOCOL:</span> {errorMessage}
            </div>
          </div>
        )}
        {successMessage && (
          <div className="p-3.5 bg-emerald-950/45 border border-emerald-800/60 text-emerald-300 rounded-xl text-xs flex items-start gap-2.5">
            <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0 text-emerald-400" />
            <div>
              <span className="font-extrabold uppercase mr-1">SUCCESS STATUS:</span> {successMessage}
            </div>
          </div>
        )}

        {/* AI smart text planner */}
        <div className="bg-gradient-to-r from-purple-950/30 via-slate-900/40 to-indigo-950/30 border border-purple-500/10 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-purple-400 animate-pulse" />
            <h4 className="text-[10px] font-black text-purple-200 tracking-wider uppercase font-mono">
              RAKSHAK's AI COLD-EMAIL WRITER (POWERED BY GEMINI)
            </h4>
          </div>
          <div className="flex gap-2">
            <input 
              type="text" 
              placeholder="e.g. Write a premium proposal letter for web construction, use {name} variable..."
              value={aiPrompt}
              onChange={e => setAiPrompt(e.target.value)}
              className="flex-1 bg-slate-900/90 border border-purple-900/40 rounded-lg px-3.5 py-2 text-xs text-white focus:outline-none focus:border-purple-500 transition font-medium"
            />
            <button 
              onClick={handleGenerateAIProposal}
              disabled={isGeneratingAI || !aiPrompt.trim()}
              className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs py-2 px-4 rounded-lg border border-purple-400/30 shadow transition duration-155 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
            >
              {isGeneratingAI ? 'Drafting...' : 'AI DRAFT'}
            </button>
          </div>
        </div>

        {/* SIDE-BY-SIDE DOUBLE COLUMNS SYSTEM GRAPH */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* COLUMN 1: COMPOSE MESSAGE (LEFT) */}
          <div className="bg-slate-900/65 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-2xl p-5 space-y-4">
            
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
              <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl border border-purple-500/20">
                <Mail className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white tracking-wide">Compose Message</h2>
                <p className="text-[11px] text-slate-400">Configure single smtp node & payload body below</p>
              </div>
            </div>

            {/* Your Gmail and Password Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1">Your Gmail</label>
                <input 
                  type="email" 
                  value={gmail}
                  onChange={e => setGmail(e.target.value)}
                  placeholder="you@gmail.com"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all font-semibold"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-[10px] font-black tracking-wider text-slate-400 uppercase">App Password</label>
                  <button 
                    onClick={() => handleTestCredential()}
                    disabled={isTestingCredentials}
                    className="text-[9px] text-purple-400 hover:text-purple-300 font-bold uppercase tracking-wider cursor-pointer"
                  >
                    {isTestingCredentials ? 'Checking...' : '✓ Test SMTP'}
                  </button>
                </div>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={appPassword}
                    onChange={e => setAppPassword(e.target.value)}
                    placeholder="16-char app password"
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-3 pr-8 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all font-mono font-bold tracking-widest"
                  />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(prev => !prev)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Sender Name */}
            <div>
              <label className="block text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1">Sender Name</label>
              <input 
                type="text" 
                value={senderName}
                onChange={e => setSenderName(e.target.value)}
                placeholder="E.g., John Doe"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all font-medium"
              />
            </div>

            {/* Email Subject */}
            <div>
              <label className="block text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1">Email Subject</label>
              <input 
                type="text" 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Enter subject line..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all font-bold"
              />
            </div>

            {/* Email Body */}
            <div>
              <label className="block text-[10px] font-black tracking-wider text-slate-400 uppercase mb-1">Message Body (Plain Text)</label>
              <textarea 
                rows={9}
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Write your email here..."
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all leading-relaxed font-mono resize-none font-semibold"
              />
              <p className="text-[10px] text-slate-500 mt-1.5 font-mono">
                Supports <code className="text-purple-300">{"{name}"}</code> variable for dynamic substitution during sending loop.
              </p>
            </div>

          </div>

          {/* COLUMN 2: RECIPIENTS & PROGRESS MONITOR (RIGHT) */}
          <div className="space-y-6">
            
            {/* CARDS 2A: RECIPIENTS */}
            <div className="bg-slate-900/65 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-2xl p-5 space-y-3.5">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-purple-400" />
                  <span className="text-sm font-black text-white">Recipients</span>
                </div>
                <span className="text-[10px] bg-indigo-950/70 text-indigo-300 font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-800/40">
                  {totalCount} found
                </span>
              </div>

              <textarea 
                rows={4}
                value={rawRecipients}
                onChange={e => setRawRecipients(e.target.value)}
                placeholder="Paste emails (comma separated, new lines, or Excel copy)"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-purple-500 transition-all font-mono leading-relaxed resize-y font-semibold"
              />
            </div>

            {/* CARD 2B: PROGRESS MONITOR */}
            <div className="bg-slate-900/65 backdrop-blur-md rounded-2xl border border-slate-800/80 shadow-2xl p-5 space-y-4">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                <div className="flex items-center gap-2">
                  <Play className="w-4 h-4 text-emerald-400 animate-pulse" />
                  <span className="text-sm font-black text-white">Progress Monitor</span>
                </div>
                <span className={`text-[9px] px-2 py-0.5 rounded border uppercase font-mono font-bold tracking-wider ${
                  campaignStatus === 'running' ? 'text-blue-400 bg-blue-950/60 border-blue-800 animate-pulse' :
                  campaignStatus === 'completed' ? 'text-emerald-400 bg-emerald-950/60 border-emerald-800' :
                  campaignStatus === 'paused' ? 'text-amber-400 bg-amber-950/60 border-amber-800' : 'text-slate-500 bg-slate-950 border-slate-800'
                }`}>
                  ● {campaignStatus}
                </span>
              </div>

              {/* Stats Counters Grid (4 counters) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                  <p className="text-2xl font-black text-purple-400">{totalCount}</p>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest font-mono">TOTAL</p>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                  <p className="text-2xl font-black text-emerald-400">{sentCount}</p>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest font-mono">SENT</p>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                  <p className="text-2xl font-black text-red-400">{failedCount}</p>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest font-mono">FAILED</p>
                </div>
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-850">
                  <p className="text-2xl font-black text-slate-300">{remainingCount >= 0 ? remainingCount : 0}</p>
                  <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest font-mono">REMAINING</p>
                </div>
              </div>

              {/* CUSTOM TRANSMISSION SPEED CONTROLLER (USER OPTION CONFIG) */}
              <div className="bg-slate-950/50 p-3.5 rounded-xl border border-slate-850/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                  <span className="text-[10px] font-black text-purple-300 font-mono tracking-wider uppercase block">
                    ⌛ TRANSMISSION SPEED REGULATOR
                  </span>
                  <span className="text-[10px] text-indigo-400 font-bold font-mono">
                    Delay: <span className="text-white font-extrabold">{delayMs} ms</span> / email
                  </span>
                </div>

                {/* Range Slider */}
                <input 
                  type="range" 
                  min="50" 
                  max="2500" 
                  step="50"
                  value={delayMs}
                  onChange={e => setDelayMs(Number(e.target.value))}
                  className="w-full h-1.5 bg-slate-900 rounded-lg appearance-none cursor-pointer accent-purple-500"
                />

                {/* Fast-jump Presets */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                  <button 
                    onClick={() => { setDelayMs(80); playSoundChime(950, 0.08); }}
                    className={`text-[9px] py-1.5 px-2 rounded-lg font-bold border transition ${
                      delayMs === 80 
                        ? 'bg-purple-950/65 border-purple-500 text-purple-300' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⚡ Ultra Speed (2s/25)
                  </button>
                  <button 
                    onClick={() => { setDelayMs(200); playSoundChime(880, 0.08); }}
                    className={`text-[9px] py-1.5 px-2 rounded-lg font-bold border transition ${
                      delayMs === 200 
                        ? 'bg-purple-950/65 border-purple-500 text-purple-300' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🚀 Fast Speed (1s/5)
                  </button>
                  <button 
                    onClick={() => { setDelayMs(400); playSoundChime(800, 0.08); }}
                    className={`text-[9px] py-1.5 px-2 rounded-lg font-bold border transition ${
                      delayMs === 400 
                        ? 'bg-purple-950/65 border-purple-500 text-purple-300' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🛡 Safe (10s/25)
                  </button>
                  <button 
                    onClick={() => { setDelayMs(1500); playSoundChime(650, 0.08); }}
                    className={`text-[9px] py-1.5 px-2 rounded-lg font-bold border transition ${
                      delayMs === 1500 
                        ? 'bg-purple-950/65 border-purple-500 text-purple-300' 
                        : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    🐢 Standard Sleep
                  </button>
                </div>
                <div className="text-[9.5px] text-slate-500 italic text-center pt-0.5">
                  Estimated sequence duration: <span className="text-slate-300 font-mono font-bold">{((totalCount * delayMs) / 1000).toFixed(1)} seconds</span>.
                </div>
              </div>

              {/* Primary Actions Trigger Bar */}
              <div className="flex gap-2.5 pt-1.5">
                {campaignStatus === 'idle' || campaignStatus === 'completed' || campaignStatus === 'failed' ? (
                  <button 
                    onClick={handleStartSending}
                    disabled={isCreatingCampaign}
                    className="flex-1 bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:to-indigo-500 text-white fill-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition duration-150 cursor-pointer"
                  >
                    {isCreatingCampaign ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        PREPARING TRANSPORT SEQUENCE...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 text-purple-200 shrink-0" />
                        START DISPATCH SEQUENCER LOOP
                      </>
                    )}
                  </button>
                ) : (
                  <button 
                    onClick={handlePauseResume}
                    className={`flex-1 text-white font-extrabold text-xs py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition duration-155 cursor-pointer ${
                      campaignStatus === 'running' 
                        ? 'bg-amber-600 hover:bg-amber-500' 
                        : 'bg-emerald-600 hover:bg-emerald-500'
                    }`}
                  >
                    {campaignStatus === 'running' ? (
                      <>
                        <Pause className="w-4 h-4 text-amber-200" />
                        PAUSE DISPATCH TRANSMISSION
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 text-emerald-200" />
                        RESUME SEQUENCE NOW
                      </>
                    )}
                  </button>
                )}

                <button 
                  onClick={handleResetProgress}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-slate-750 text-slate-400 hover:text-white px-4 rounded-xl transition font-black text-xs flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  title="Reset monitor counters to standby"
                >
                  <RefreshCcw className="w-4 h-4" /> Reset
                </button>
              </div>

              {/* Raw real-time transaction logger terminal */}
              <div className="space-y-1.5 font-mono pt-2 border-t border-slate-850">
                <span className="text-[9px] tracking-widest font-black uppercase text-purple-400 font-mono block">
                  LIVE INTERFACE DISPATCH LOGSTREAM
                </span>
                <div className="bg-slate-950 border border-slate-905 p-3 rounded-xl text-[9.5px] h-36 overflow-y-auto space-y-1.5 shadow-inner leading-relaxed text-slate-400 font-mono">
                  {campaignId ? (
                    activeRecipients.map((rec, index) => (
                      <div key={rec.id} className="border-b border-slate-900 pb-1.5 last:border-none flex flex-col">
                        <div className="flex items-center justify-between gap-2.5">
                          <span className="text-[9px] text-slate-600 font-bold">#{index + 1}</span>
                          <span className="truncate max-w-[170px] font-medium text-slate-300">
                            {rec.email}
                          </span>
                          {rec.status === 'sent' && <span className="text-emerald-400 font-black">✔ SENT SENT</span>}
                          {rec.status === 'failed' && <span className="text-red-400 font-black">✗ FAILED</span>}
                          {rec.status === 'sending' && <span className="text-blue-400 animate-pulse">⚙ WORK</span>}
                          {rec.status === 'pending' && <span className="text-slate-650">⏰ QUEUED</span>}
                        </div>
                        {rec.error && (
                          <div className="text-red-400/80 text-[8.5px] mt-0.5 italic leading-tight">
                            ✗ Cause: {rec.error}
                          </div>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="text-slate-600 italic text-center pt-8">
                      No active sends loaded. Ready for Rakshak's commands...
                    </div>
                  )}
                </div>
              </div>

            </div>

          </div>

        </div>

        {/* CUSTOM SIGNATURE FOOTER */}
        <footer className="text-center py-6 border-t border-purple-950/40 mt-10 space-y-2 relative z-10">
          <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase">
            SECURE AUTOMATIC DISPATCH PROTOCOL PLATFORM. ALL RIGHTS RESERVED.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs text-purple-400 font-semibold">
            <span>Designed with Premium Quality for</span>
            <span className="text-white bg-purple-950/40 px-2.5 py-0.5 rounded border border-purple-900/50 font-black tracking-widest font-mono text-[10.5px]">
              RAKSHAK RAJPUT
            </span>
          </div>
        </footer>

      </main>
    </div>
  );
}
