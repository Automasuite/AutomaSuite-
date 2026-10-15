"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { Lead, LeadStatus, starterLeads, statusOptions } from "@/lib/demo-data";

type View = "Overview" | "Leads" | "Campaigns" | "Signals" | "Analytics";
const nav: {name: View; icon: string}[] = [
  { name: "Overview", icon: "▦" }, { name: "Leads", icon: "◎" },
  { name: "Campaigns", icon: "↗" }, { name: "Signals", icon: "⌁" }, { name: "Analytics", icon: "▥" },
];
const emptyForm = { name: "", company: "", email: "", phone: "", source: "Manual entry", signal: "" };
const initials = (name: string) => name.split(" ").map((part) => part[0]).slice(0, 2).join("").toUpperCase();

export default function Home() {
  const [view, setView] = useState<View>("Overview");
  const [leads, setLeads] = useState<Lead[]>(starterLeads);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All statuses");
  const [showAdd, setShowAdd] = useState(false);
  const [notice, setNotice] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("automasuite-leadgen-leads-v1");
      if (saved) setLeads(JSON.parse(saved) as Lead[]);
    } catch { /* Keep the starter workspace if browser storage is unavailable. */ }
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) window.localStorage.setItem("automasuite-leadgen-leads-v1", JSON.stringify(leads));
  }, [leads, loaded]);

  const visibleLeads = useMemo(() => leads.filter((lead) => {
    const matchesQuery = [lead.name, lead.company, lead.email, lead.phone, lead.source].join(" ").toLowerCase().includes(query.toLowerCase());
    return matchesQuery && (filter === "All statuses" || lead.status === filter);
  }), [leads, query, filter]);
  const qualified = leads.filter((lead) => lead.status === "Qualified").length;
  const converted = leads.filter((lead) => lead.status === "Converted").length;
  const hotLeads = leads.filter((lead) => lead.score >= 80 && !["Converted", "Not a fit"].includes(lead.status)).length;
  const conversionRate = leads.length ? Math.round(converted / leads.length * 100) : 0;

  function addLead(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const lead: Lead = {
      id: `lead-${Date.now()}`, ...form, status: "New",
      score: form.signal.trim() ? 55 : 30,
      signal: form.signal.trim() || "No verified buying signal yet",
      nextAction: form.signal.trim() ? "Review signal and qualify fit" : "Research fit before outreach",
      updatedAt: "Just now",
    };
    setLeads((current) => [lead, ...current]);
    setForm(emptyForm); setShowAdd(false); setView("Leads");
    setNotice("Lead added to your workspace.");
    window.setTimeout(() => setNotice(""), 3200);
  }
  function updateStatus(id: string, status: LeadStatus) {
    setLeads((current) => current.map((lead) => lead.id === id ? { ...lead, status, updatedAt: "Just now" } : lead));
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <a className="brand" href="#" onClick={(e) => { e.preventDefault(); setView("Overview"); }}>
        <span className="brand-mark"><span>A</span><i>↗</i></span>
        <span className="brand-copy"><b>Automa<span>Suite</span></b><small>LEADGEN PRO</small></span>
      </a>
      <div className="workspace-label">WORKSPACE</div>
      <div className="workspace-switch"><span className="workspace-avatar">T</span><span><b>Taiwo’s workspace</b><small>Growth workspace</small></span><span className="chevron">⌄</span></div>
      <div className="nav-label">MAIN MENU</div>
      <nav className="nav-list">{nav.map((item) => <button key={item.name} className={view === item.name ? "nav-item active" : "nav-item"} onClick={() => setView(item.name)}><span className="nav-icon">{item.icon}</span>{item.name}{item.name === "Leads" && <span className="nav-count">{leads.length}</span>}</button>)}</nav>
      <div className="sidebar-bottom">
        <div className="help-card"><div className="help-icon">✦</div><b>Make every lead count.</b><p>Focus on the signals that make outreach relevant.</p><button onClick={() => setView("Signals")}>Explore lead signals <span>→</span></button></div>
        <div className="profile"><div className="profile-avatar">TO</div><div><b>Taiwo Obanowa</b><small>Workspace owner</small></div><button className="dots" aria-label="Profile menu">···</button></div>
      </div>
    </aside>

    <section className="main-panel">
      <header className="topbar"><div className="breadcrumb"><span>Workspace</span><b>/</b><strong>{view}</strong></div><div className="top-actions"><span className="environment"><i/> Demo workspace</span><button className="icon-button" aria-label="Notifications">♧<i/></button><div className="top-avatar">T</div></div></header>
      <div className="content">
        {notice && <div className="toast">✓ {notice}</div>}
        <div className="page-heading"><div><div className="eyebrow"><span className="eyebrow-dot"/> YOUR GROWTH COMMAND CENTRE</div><h1>{view === "Overview" ? "Turn leads into growth." : view === "Leads" ? "Your leads, in one place." : view === "Signals" ? "Know who to contact — and why." : view === "Campaigns" ? "Campaigns that move leads forward." : "Measure what moves revenue."}</h1><p>{view === "Overview" ? "See your pipeline clearly. Focus on the next best action, not just more activity." : view === "Leads" ? "Capture, qualify and manage prospects from first signal to conversion." : view === "Signals" ? "Use real context to decide whether to contact, nurture or wait." : view === "Campaigns" ? "Plan relevant outreach and keep every follow-up connected to the lead." : "Understand lead quality, engagement and conversion at a glance."}</p></div><button className="primary-button" onClick={() => setShowAdd(true)}><span>＋</span> Add a lead</button></div>

        <div className="welcome-strip"><div className="welcome-symbol">✳</div><div><b>Good morning, Taiwo <span>✦</span></b><p>Growth starts with the right conversation. Here’s your workspace at a glance.</p></div><div className="welcome-right"><span>YOUR FOCUS TODAY</span><b>Follow up with {hotLeads} high-intent {hotLeads === 1 ? "lead" : "leads"}</b></div></div>

        <div className="metric-grid">
          <Metric icon="◎" label="Total leads" value={leads.length.toString()} note="In your workspace" color="blue" />
          <Metric icon="✳" label="High-priority leads" value={hotLeads.toString()} note="Score of 80 or above" color="green" />
          <Metric icon="↗" label="Qualified leads" value={qualified.toString()} note="Ready for next steps" color="purple" />
          <Metric icon="◉" label="Conversion rate" value={`${conversionRate}%`} note={`${converted} converted so far`} color="orange" />
        </div>

        <div className="section-grid">
          <section className="panel lead-panel">
            <div className="panel-heading"><div><h2>{view === "Signals" ? "Lead signals to review" : view === "Campaigns" ? "Campaign-ready leads" : "Lead pipeline"}</h2><p>{view === "Signals" ? "Prioritise evidence over assumptions." : "A live view of prospects and their next steps."}</p></div><button className="text-button" onClick={() => setView("Leads")}>View all leads <span>→</span></button></div>
            <div className="table-tools"><div className="search-box"><span>⌕</span><input aria-label="Search leads" placeholder="Search leads, companies..." value={query} onChange={(e) => setQuery(e.target.value)} /></div><select aria-label="Filter by status" value={filter} onChange={(e) => setFilter(e.target.value)}><option>All statuses</option>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></div>
            <div className="table-wrap"><table><thead><tr><th>LEAD / COMPANY</th><th>STATUS</th><th>LEAD SCORE</th><th>NEXT BEST ACTION</th><th></th></tr></thead><tbody>{visibleLeads.slice(0, view === "Overview" ? 5 : undefined).map((lead) => <tr key={lead.id}><td><div className="lead-cell"><div className="lead-avatar">{initials(lead.name)}</div><div><b>{lead.name}</b><small>{lead.company || lead.email || lead.phone}</small></div></div></td><td><select className={`status-select status-${lead.status.toLowerCase().replaceAll(" ", "-")}`} value={lead.status} onChange={(e) => updateStatus(lead.id, e.target.value as LeadStatus)} aria-label={`Status for ${lead.name}`}>{statusOptions.map((status) => <option key={status}>{status}</option>)}</select></td><td><div className="score-cell"><div className="score-track"><span style={{width:`${lead.score}%`}}/></div><b>{lead.score}</b></div></td><td><span className="next-action">{lead.nextAction}</span></td><td><button className="row-menu" aria-label={`Details for ${lead.name}`} onClick={() => { setQuery(lead.name); setView("Leads"); }}>···</button></td></tr>)}</tbody></table>{visibleLeads.length === 0 && <div className="empty-state"><b>No leads found</b><p>Try another search or add a new lead.</p><button className="text-button" onClick={() => {setQuery("");setFilter("All statuses");}}>Clear filters</button></div>}</div>
            <div className="table-footer"><span>Showing <b>{Math.min(visibleLeads.length, view === "Overview" ? 5 : visibleLeads.length)}</b> of <b>{visibleLeads.length}</b> leads</span><button onClick={() => setView("Leads")}>Open lead manager <span>→</span></button></div>
          </section>

          <div className="right-column">
            <section className="panel signal-panel"><div className="panel-heading"><div><h2>Signal-led outreach</h2><p>Choose the next move with intent.</p></div><span className="sparkle">✦</span></div><div className="signal-option signal-now"><div className="signal-icon">↗</div><div><b>Contact now</b><p>Strong intent, clear fit, timely reason.</p></div><span className="signal-number">{hotLeads}</span></div><div className="signal-option signal-nurture"><div className="signal-icon">◷</div><div><b>Research / nurture</b><p>Potential fit; more context needed.</p></div><span className="signal-number">{leads.filter(l=>l.status==="Nurturing"||l.status==="New").length}</span></div><div className="signal-option signal-wait"><div className="signal-icon">⊘</div><div><b>Don't contact yet</b><p>No clear reason to interrupt them.</p></div><span className="signal-number">{leads.filter(l=>l.score<40).length}</span></div><div className="signal-footnote"><span>ⓘ</span> Recommendations are based on sample lead data in this demo.</div></section>
            <section className="panel source-panel"><div className="panel-heading"><div><h2>Lead sources</h2><p>Where prospects enter your pipeline.</p></div><span className="source-icon">⌁</span></div>{Object.entries(leads.reduce<Record<string,number>>((acc,lead)=>{acc[lead.source]=(acc[lead.source]||0)+1;return acc;},{})).slice(0,4).map(([source,count],i)=><div className="source-row" key={source}><div className={`source-dot source-${i}`}/><span>{source}</span><div className="source-bar"><i style={{width:`${count/leads.length*100}%`}}/></div><b>{count}</b></div>)}<button className="source-link" onClick={()=>setView("Analytics")}>Explore performance <span>→</span></button></section>
          </div>
        </div>
        <footer className="footer"><span>© 2026 AutomaSuite</span><span><i/> LeadGen Pro · Demo mode</span><span>Built to turn conversations into customers.</span></footer>
      </div>
    </section>

    {showAdd && <div className="modal-backdrop" onMouseDown={(e) => {if(e.target===e.currentTarget)setShowAdd(false);}}><form className="lead-modal" onSubmit={addLead}><div className="modal-top"><div><div className="eyebrow">LEAD MANAGEMENT</div><h2>Add a new lead</h2><p>Capture the details and the reason they may be relevant.</p></div><button type="button" className="close-button" onClick={() => setShowAdd(false)} aria-label="Close">×</button></div><label>Full name *<input required value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} placeholder="e.g. Ada Okoro"/></label><label>Company / business<input value={form.company} onChange={(e)=>setForm({...form,company:e.target.value})} placeholder="Company name"/></label><div className="form-row"><label>Email address<input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} placeholder="ada@company.com"/></label><label>Phone / WhatsApp<input value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} placeholder="+234..."/></label></div><label>Lead source<select value={form.source} onChange={(e)=>setForm({...form,source:e.target.value})}><option>Manual entry</option><option>Website enquiry</option><option>WhatsApp</option><option>LinkedIn</option><option>Referral</option><option>Webinar</option><option>Campaign</option></select></label><label>Buying signal / context<textarea value={form.signal} onChange={(e)=>setForm({...form,signal:e.target.value})} placeholder="What happened that makes this lead relevant now?" rows={3}/><small className="field-hint">A specific signal helps you choose a useful next step instead of sending a generic message.</small></label><div className="modal-actions"><button type="button" className="secondary-button" onClick={()=>setShowAdd(false)}>Cancel</button><button type="submit" className="primary-button">＋ Save lead</button></div></form></div>}
  </main>;
}

function Metric({icon,label,value,note,color}:{icon:string;label:string;value:string;note:string;color:string}) {
  return <div className="metric-card"><div className={`metric-icon metric-${color}`}>{icon}</div><div className="metric-label">{label}</div><div className="metric-value">{value}</div><div className="metric-note"><span className="metric-note-dot"/> {note}</div></div>;
}
