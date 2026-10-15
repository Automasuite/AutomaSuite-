export type LeadStatus = "New" | "Qualified" | "Contacted" | "Nurturing" | "Converted" | "Not a fit";
export type Lead = {
  id: string; name: string; company: string; email: string; phone: string;
  source: string; status: LeadStatus; score: number; signal: string;
  nextAction: string; updatedAt: string;
};

export const starterLeads: Lead[] = [
  { id: "lead-1001", name: "Amara Okafor", company: "Northstar Properties", email: "amara@example.com", phone: "+234 803 555 0142", source: "Website enquiry", status: "Qualified", score: 92, signal: "Requested pricing and a product walkthrough", nextAction: "Offer a 15-minute discovery call", updatedAt: "Today" },
  { id: "lead-1002", name: "Daniel Yusuf", company: "DYL Retail", email: "daniel@example.com", phone: "+234 809 555 0177", source: "Referral", status: "Contacted", score: 78, signal: "Replied to the first follow-up", nextAction: "Clarify team size and use case", updatedAt: "Today" },
  { id: "lead-1003", name: "Ifeoma Nwosu", company: "Nwosu Consulting", email: "ifeoma@example.com", phone: "+234 812 555 0194", source: "LinkedIn", status: "New", score: 64, signal: "Downloaded the lead generation guide", nextAction: "Research fit before outreach", updatedAt: "Yesterday" },
  { id: "lead-1004", name: "Musa Bello", company: "Bello Ventures", email: "musa@example.com", phone: "+234 806 555 0128", source: "WhatsApp", status: "Nurturing", score: 55, signal: "Interested, but timing is unclear", nextAction: "Share a relevant case example", updatedAt: "Yesterday" },
  { id: "lead-1005", name: "Chidinma Eze", company: "Eze Digital", email: "chidinma@example.com", phone: "+234 814 555 0113", source: "Webinar", status: "Converted", score: 98, signal: "Confirmed purchase requirements", nextAction: "Schedule onboarding", updatedAt: "Oct 12" },
  { id: "lead-1006", name: "Tunde Adebayo", company: "TA Logistics", email: "tunde@example.com", phone: "+234 701 555 0188", source: "Manual entry", status: "New", score: 38, signal: "No verified buying signal yet", nextAction: "Research / nurture; don't contact yet", updatedAt: "Oct 11" },
];

export const statusOptions: LeadStatus[] = ["New", "Qualified", "Contacted", "Nurturing", "Converted", "Not a fit"];
