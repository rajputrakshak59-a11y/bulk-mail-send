import express from "express";
import path from "path";
import nodemailer from "nodemailer";
import { createServer as createViteServer } from "vite";
import fs from "fs";
import { createAIEmailTemplate } from "./server/gemini.ts";

// Simple in-memory storage for settings, campaigns, and senders
// To prevent loss on file rebuilds, we hold it in a simple memory structure.
interface Recipient {
  id: string;
  name: string;
  email: string;
  variables: Record<string, string>;
  customSubject?: string;
  customBody?: string;
  status: 'pending' | 'sending' | 'sent' | 'failed';
  error?: string;
  sentBySenderEmail?: string;
  sentAt?: string;
}

interface MailSenderSettings {
  id: string;
  email: string;
  appPassword: string;
  dailyLimit: number;
  sentToday: number;
  status: 'active' | 'invalid' | 'rate-limited';
  error?: string;
}

interface CampaignState {
  id: string;
  subject: string;
  body: string;
  senders: MailSenderSettings[];
  recipients: Recipient[];
  status: 'idle' | 'running' | 'paused' | 'completed' | 'failed';
  currentIndex: number;
  createdTime: string;
  delayMs?: number;
}

const activeCampaigns: Record<string, CampaignState> = {};
let emailAccounts: MailSenderSettings[] = [];

// Helper sleep function for rate-limiting simulation/prevention between emails
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Route - Get current sender accounts
  app.get("/api/senders", (req, res) => {
    res.json({ senders: emailAccounts });
  });

  // API Route - Save/Add sender accounts
  app.post("/api/senders", (req, res) => {
    const { senders } = req.body;
    if (Array.isArray(senders)) {
      emailAccounts = senders.map(s => ({
        id: s.id || Math.random().toString(36).substring(7),
        email: s.email,
        appPassword: s.appPassword ? s.appPassword.replace(/\s+/g, '') : '', // cleanse whitespace in app passwords
        dailyLimit: Number(s.dailyLimit) || 25,
        sentToday: Number(s.sentToday) || 0,
        status: s.status || 'active',
        error: s.error || ''
      }));
    }
    res.json({ success: true, senders: emailAccounts });
  });

  // API Route - Clear all sender accounts
  app.post("/api/senders/clear", (req, res) => {
    emailAccounts = [];
    res.json({ success: true, senders: [] });
  });

  // API Route - Test a single sender login and send a test email
  app.post("/api/senders/test", async (req, res) => {
    const { email, appPassword } = req.body;
    if (!email || !appPassword) {
      return res.status(400).json({ success: false, error: "Please provide both Gmail address and 16-digit App Password." });
    }

    const cleansedPassword = appPassword.replace(/\s+/g, '');

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: email,
        pass: cleansedPassword,
      },
    });

    try {
      await transporter.verify();
      res.json({ success: true, message: "Connection verified! Senders credential is correct." });
    } catch (error: any) {
      res.status(400).json({ success: false, error: error.message || "Authentication failed. Make sure App Passwords 16-digit is correct and enabled." });
    }
  });

  // API Route - Create campaign & trigger process
  app.post("/api/campaign/create", (req, res) => {
    const { subject, body, recipients, senders, delayMs } = req.body;
    if (!subject || !body || !recipients || !recipients.length) {
      return res.status(400).json({ success: false, error: "Missing campaign details or recipients" });
    }

    const currentCampaignSenders = (senders && senders.length) ? senders : emailAccounts;

    if (!currentCampaignSenders || !currentCampaignSenders.length) {
      return res.status(400).json({ success: false, error: "Please add at least one active sender Gmail account first." });
    }

    const campaignId = Math.random().toString(36).substring(7);

    activeCampaigns[campaignId] = {
      id: campaignId,
      subject,
      body,
      senders: JSON.parse(JSON.stringify(currentCampaignSenders)),
      recipients: recipients.map((r: any) => ({
        id: r.id || Math.random().toString(36).substring(7),
        name: r.name || '',
        email: r.email,
        variables: r.variables || {},
        customSubject: r.customSubject || '',
        customBody: r.customBody || '',
        status: 'pending'
      })),
      status: 'idle',
      currentIndex: 0,
      createdTime: new Date().toISOString(),
      delayMs: Number(delayMs) || 1500
    };

    res.json({ success: true, campaign: activeCampaigns[campaignId] });
  });

  // API Route - Server side Gemini Writer endpoint
  app.post("/api/gemini/writer", async (req, res) => {
    const { prompt } = req.body;
    if (!prompt) {
      return res.status(400).json({ success: false, error: "Please provide target prompt for writing dynamic cold emails." });
    }
    try {
      const template = await createAIEmailTemplate(prompt);
      res.json({ success: true, ...template });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message || "Failed to utilize AI writing models." });
    }
  });

  // API Route - Fetch campaign status
  app.get("/api/campaign/:id", (req, res) => {
    const campaign = activeCampaigns[req.params.id];
    if (!campaign) {
      return res.status(404).json({ success: false, error: "Campaign not found" });
    }
    res.json({ success: true, campaign });
  });

  // API Route - Control campaign (start, pause, resume)
  app.post("/api/campaign/:id/control", (req, res) => {
    const { action } = req.body; // 'start', 'pause', 'resume'
    const campaign = activeCampaigns[req.params.id];
    if (!campaign) {
      return res.status(404).json({ success: false, error: "Campaign not found" });
    }

    if (action === 'start' || action === 'resume') {
      if (campaign.status === 'running') {
        return res.json({ success: true, message: "Campaign is already running", campaign });
      }
      campaign.status = 'running';
      // Trigger background processing
      runCampaignInBg(campaign.id);
    } else if (action === 'pause') {
      campaign.status = 'paused';
    }

    res.json({ success: true, campaign });
  });

  // Background sending worker logic (In-Memory worker)
  async function runCampaignInBg(campaignId: string) {
    const campaign = activeCampaigns[campaignId];
    if (!campaign) return;

    while (campaign.status === 'running' && campaign.currentIndex < campaign.recipients.length) {
      const recipient = campaign.recipients[campaign.currentIndex];
      
      if (!recipient || recipient.status === 'sent') {
        campaign.currentIndex++;
        continue;
      }

      recipient.status = 'sending';

      // Find an available active sender with quota left
      const sender = campaign.senders.find(s => s.status === 'active' && s.sentToday < s.dailyLimit);

      if (!sender) {
        recipient.status = 'failed';
        recipient.error = 'No active Gmail accounts available with remaining quota (Limit: 25 emails per account reached). Please add more sender accounts.';
        campaign.status = 'failed';
        break;
      }

      // Configure SMTP transport dynamically with 16-digit password
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: sender.email,
          pass: sender.appPassword
        }
      });

      // Prepare Dynamic substitution variables
      let personalizedSubject = recipient.customSubject && recipient.customSubject.trim() !== '' 
        ? recipient.customSubject 
        : campaign.subject;
      let personalizedBody = recipient.customBody && recipient.customBody.trim() !== '' 
        ? recipient.customBody 
        : campaign.body;

      // Primary name variable replacement
      personalizedSubject = personalizedSubject.replace(/{name}/gi, recipient.name);
      personalizedBody = personalizedBody.replace(/{name}/gi, recipient.name);

      // Custom placeholder substitution fields
      Object.entries(recipient.variables || {}).forEach(([key, val]) => {
        const regex = new RegExp(`{${key}}`, 'gi');
        personalizedSubject = personalizedSubject.replace(regex, val);
        personalizedBody = personalizedBody.replace(regex, val);
      });

      try {
        // Send actual mail to recipient
        await transporter.sendMail({
          from: `"${sender.email}" <${sender.email}>`,
          to: recipient.email,
          subject: personalizedSubject,
          html: personalizedBody.replace(/\n/g, '<br/>'),
          text: personalizedBody
        });

        recipient.status = 'sent';
        recipient.sentBySenderEmail = sender.email;
        recipient.sentAt = new Date().toISOString();
        
        // Update stats on sender
        sender.sentToday++;
        
        // Also update the global list if matched
        const globalSender = emailAccounts.find(s => s.email === sender.email);
        if (globalSender) {
          globalSender.sentToday = sender.sentToday;
        }

      } catch (err: any) {
        recipient.status = 'failed';
        recipient.error = err.message || 'SMTP delivery failing';
        
        // Mark sender invalid or rate-limited if login fails or limit hits
        if (err.message && (err.message.includes('Username and Password not accepted') || err.message.includes('Invalid login'))) {
          sender.status = 'invalid';
          sender.error = 'Invalid 16-digit app password or username rejected.';
          const globalSender = emailAccounts.find(s => s.email === sender.email);
          if (globalSender) {
            globalSender.status = 'invalid';
            globalSender.error = sender.error;
          }
        }
      }

      campaign.currentIndex++;

      // Delay to respect Gmail connection pool & prevent immediate back-to-back spam blocks
      await delay(campaign.delayMs || 1500);
    }

    if (campaign.currentIndex >= campaign.recipients.length && campaign.status === 'running') {
      campaign.status = 'completed';
    }
  }

  // Vite middleware for dev or production custom static handler
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
});
