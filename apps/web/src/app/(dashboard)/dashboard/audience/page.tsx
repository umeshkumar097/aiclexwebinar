'use client';

import { useState, useEffect, useCallback } from 'react';
import { Users, Search, Mail, Clock } from 'lucide-react';
import { webinarApi, type Webinar } from '@/lib/api';

interface AudienceMember {
  email: string;
  name: string;
  registeredCount: number;
  attendedCount: number;
  totalDurationSeconds: number;
  webinarsList: { id: string; title: string; type: 'registered' | 'attended'; date: string }[];
}

export default function AudiencePage() {
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<AudienceMember[]>([]);
  const [search, setSearch] = useState('');

  const fetchAudience = useCallback(async () => {
    try {
      const res = await webinarApi.list({ limit: 100 });
      const webinars: Webinar[] = res.items;

      // In-memory mapping of unique users by email (or name if email is empty)
      const audienceMap = new Map<string, AudienceMember>();

      webinars.forEach((webinar) => {
        const settings = webinar.settings || {};
        const registrants = (settings.registrants as any[]) || [];
        const attendees = (settings.attendees as any[]) || [];
        const dateStr = webinar.scheduledAt
          ? new Date(webinar.scheduledAt).toLocaleDateString()
          : '—';

        // 1. Process registrants
        registrants.forEach((r) => {
          const email = r.email?.trim().toLowerCase() || '';
          if (!email) return;

          if (!audienceMap.has(email)) {
            audienceMap.set(email, {
              email,
              name: r.name,
              registeredCount: 0,
              attendedCount: 0,
              totalDurationSeconds: 0,
              webinarsList: [],
            });
          }

          const member = audienceMap.get(email)!;
          member.registeredCount++;
          member.webinarsList.push({
            id: webinar.id,
            title: webinar.title,
            type: 'registered',
            date: dateStr,
          });
        });

        // 2. Process actual attendees
        attendees.forEach((a) => {
          // If no email, match by name or fallback to a dummy email
          const email = a.email?.trim().toLowerCase() || `guest-${a.name.replace(/\s+/g, '').toLowerCase()}`;

          if (!audienceMap.has(email)) {
            audienceMap.set(email, {
              email: a.email ? email : email, // use the generated guest-{name} key, not a static 'Guest'
              name: a.name,
              registeredCount: 0,
              attendedCount: 0,
              totalDurationSeconds: 0,
              webinarsList: [],
            });
          }

          const member = audienceMap.get(email)!;
          member.attendedCount++;
          member.totalDurationSeconds += a.durationSeconds || 0;

          // Avoid duplicate entries in webinarsList
          const alreadyListed = member.webinarsList.some((w) => w.id === webinar.id && w.type === 'attended');
          if (!alreadyListed) {
            member.webinarsList.push({
              id: webinar.id,
              title: webinar.title,
              type: 'attended',
              date: dateStr,
            });
          }
        });
      });

      setMembers(Array.from(audienceMap.values()));
    } catch (err) {
      console.error('Failed to load audience data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchAudience();
  }, [fetchAudience]);

  // Filter based on search input
  const filtered = members.filter(
    (m) =>
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const formatDuration = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    if (m === 0) return `${s}s`;
    return `${m}m ${s}s`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-foreground">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Audience Directory</h1>
        <p className="text-muted-foreground text-sm mt-1">
          View all registrants, attendees, and watch history across all your live and semi-live webinars.
        </p>
      </div>

      {/* Toolbar */}
      <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground mr-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="bg-transparent border-none text-sm text-foreground placeholder-white/20 focus:outline-none w-full"
        />
      </div>

      {/* Directory Table */}
      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center bg-slate-50">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground">No contacts found</h3>
          <p className="text-muted-foreground text-xs mt-1">
            Attendees who register or join your webinars will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Contact</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registered</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attended</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Total Watch Time</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((member, idx) => (
                  <tr key={`${member.email}-${idx}`} className="hover:bg-slate-50 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-xs font-bold text-foreground">
                          {member.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-sm text-foreground">{member.name}</p>
                          <p className="text-muted-foreground text-xs flex items-center gap-1 mt-0.5">
                            <Mail className="w-3 h-3" />
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4 text-sm font-medium text-foreground">
                      {member.registeredCount} {member.registeredCount === 1 ? 'webinar' : 'webinars'}
                    </td>
                    <td className="p-4 text-sm font-medium text-foreground">
                      {member.attendedCount} {member.attendedCount === 1 ? 'session' : 'sessions'}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-1.5 text-sm text-emerald-400 font-medium">
                        <Clock className="w-3.5 h-3.5" />
                        {formatDuration(member.totalDurationSeconds)}
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {member.webinarsList.map((w, idx) => (
                          <span
                            key={idx}
                            className={`text-[9px] px-2 py-0.5 rounded-lg border ${
                              w.type === 'attended'
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                : 'bg-blue-500/10 border-blue-500/20 text-blue-400'
                            }`}
                            title={`${w.title} (${w.date})`}
                          >
                            {w.title.substring(0, 15)}…
                          </span>
                        ))}
                      </div>
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
}
