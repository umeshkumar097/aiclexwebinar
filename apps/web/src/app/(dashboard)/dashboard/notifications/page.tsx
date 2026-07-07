'use client';

import { Film, FileText, CheckCircle2, UserPlus } from 'lucide-react';

const NOTIFICATIONS = [
  {
    id: 1,
    title: 'New Attendee Registration',
    desc: 'Ummesh registered for your upcoming semi-live session "ff".',
    time: '2 minutes ago',
    icon: UserPlus,
    color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
  },
  {
    id: 2,
    title: 'Recording Upload Completed',
    desc: 'Webinar recording has been successfully uploaded to the zonvowebinar R2 bucket.',
    time: '1 hour ago',
    icon: Film,
    color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  {
    id: 3,
    title: 'Session Analytics compiled',
    desc: 'Attendee duration and report statistics compiled for session "Ummesh Test".',
    time: '3 hours ago',
    icon: FileText,
    color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
  },
  {
    id: 4,
    title: 'Cloudflare R2 Integrations operational',
    desc: 'Connection to webinar.siteboard.in verified and CORS access established.',
    time: '1 day ago',
    icon: CheckCircle2,
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
];

export default function NotificationsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 text-white">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
        <p className="text-white/40 text-sm mt-1">Stay updated with registrations, recording status, and server alerts.</p>
      </div>

      <div className="border border-white/[0.06] rounded-2xl bg-[#0d0d14]/60 overflow-hidden divide-y divide-white/[0.04]">
        {NOTIFICATIONS.map((item) => (
          <div key={item.id} className="p-4 flex gap-4 hover:bg-white/[0.01] transition-colors items-start">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center border flex-shrink-0 ${item.color}`}>
              <item.icon className="w-4 h-4" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold text-sm text-white">{item.title}</p>
                <span className="text-[10px] text-white/30 font-medium flex-shrink-0">{item.time}</span>
              </div>
              <p className="text-white/50 text-xs mt-1 leading-relaxed">{item.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
