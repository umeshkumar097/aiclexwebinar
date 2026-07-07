'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart3, Clock, Users, ArrowUpRight, Play, Download, Search, ChevronRight, X, Mail, Calendar } from 'lucide-react';
import { webinarApi, type Webinar } from '@/lib/api';

// Format helper
const fmtTime = (s: number) => {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
};

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(true);
  const [webinars, setWebinars] = useState<Webinar[]>([]);
  const [search, setSearch] = useState('');
  const [selectedWebinar, setSelectedWebinar] = useState<Webinar | null>(null);

  const fetchWebinars = useCallback(async () => {
    try {
      const res = await webinarApi.list({ limit: 100 });
      setWebinars(res.items);
    } catch (err) {
      console.error('Failed to load webinars for reports:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchWebinars();
  }, [fetchWebinars]);

  // Calculations for summary stats
  const totalWebinars = webinars.length;
  const totalRegistrations = webinars.reduce((sum, w) => sum + (w.registeredCount || 0), 0);
  const totalJoins = webinars.reduce((sum, w) => sum + (w.attendeeCount || 0), 0);
  const averageAttendance = totalRegistrations > 0 ? Math.round((totalJoins / totalRegistrations) * 100) : 0;

  const totalWatchTime = webinars.reduce((sum, w) => {
    const attendees = (w.settings?.attendees as any[]) || [];
    const watchSum = attendees.reduce((acc, a) => acc + (a.durationSeconds || 0), 0);
    return sum + watchSum;
  }, 0);
  void totalWatchTime; // Mark as read


  // Filter webinars based on search
  const filtered = webinars.filter((w) =>
    w.title.toLowerCase().includes(search.toLowerCase())
  );

  // CSV Exporter for a single webinar report
  const downloadWebinarReport = (webinar: Webinar) => {
    const registrants = (webinar.settings?.registrants as any[]) || [];
    const attendees = (webinar.settings?.attendees as any[]) || [];

    // Header
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Name,Email,Status,Registration Date,Join Date,Watch Duration (Seconds),Watch Duration (Formatted)\n';

    // Map registrants and match with attendees
    registrants.forEach((reg) => {
      const email = reg.email?.trim().toLowerCase();
      const att = attendees.find((a) => a.email?.trim().toLowerCase() === email);

      const status = att ? 'Attended' : 'Registered Only';
      const regDate = reg.registeredAt ? new Date(reg.registeredAt).toLocaleString() : '—';
      const joinDate = att?.joinedAt ? new Date(att.joinedAt).toLocaleString() : '—';
      const duration = att?.durationSeconds || 0;
      const durationFmt = att ? fmtTime(duration) : '—';

      const row = `"${reg.name}","${reg.email}","${status}","${regDate}","${joinDate}",${duration},"${durationFmt}"`;
      csvContent += row + '\n';
    });

    // Add guests who attended but did not register
    attendees.forEach((att) => {
      const email = att.email?.trim().toLowerCase();
      const registered = registrants.some((r) => r.email?.trim().toLowerCase() === email);

      if (!registered) {
        const joinDate = att.joinedAt ? new Date(att.joinedAt).toLocaleString() : '—';
        const duration = att.durationSeconds || 0;
        const durationFmt = fmtTime(duration);

        const row = `"${att.name}","${att.email || 'Guest'}","Attended (Unregistered)","—","${joinDate}",${duration},"${durationFmt}"`;
        csvContent += row + '\n';
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `webinar_report_${webinar.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Exporter for all webinars summary
  const downloadAllReport = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    csvContent += 'Webinar Title,Date,Mode,Status,Registrations,Joins,Attendance Rate (%),Total Watch Duration (Seconds)\n';

    webinars.forEach((w) => {
      const date = w.scheduledAt ? new Date(w.scheduledAt).toLocaleDateString() : '—';
      const attendees = (w.settings?.attendees as any[]) || [];
      const watchSum = attendees.reduce((acc, a) => acc + (a.durationSeconds || 0), 0);
      const rate = w.registeredCount > 0 ? Math.round((w.attendeeCount / w.registeredCount) * 100) : 0;

      const row = `"${w.title}","${date}","${w.mode}","${w.status}",${w.registeredCount},${w.attendeeCount},${rate},${watchSum}`;
      csvContent += row + '\n';
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `all_webinars_summary_report.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 text-foreground">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Analytics & Reports</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track registrations, join rates, and audience watch times across all your webinars.
          </p>
        </div>
        <button
          onClick={downloadAllReport}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-foreground font-semibold text-sm transition-colors"
        >
          <Download className="w-4 h-4" />
          Export All Summary
        </button>
      </div>

      {/* Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Sessions', val: totalWebinars, icon: BarChart3, color: 'text-violet-400' },
          { label: 'Total Registrations', val: totalRegistrations, icon: Users, color: 'text-indigo-400' },
          { label: 'Total Joins / Attendees', val: totalJoins, icon: Play, color: 'text-emerald-400' },
          { label: 'Avg Attendance Rate', val: `${averageAttendance}%`, icon: ArrowUpRight, color: 'text-amber-400' },
        ].map((item, idx) => (
          <div key={idx} className="bg-white shadow-sm border border-slate-200 rounded-2xl p-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground font-medium">{item.label}</span>
              <item.icon className={`w-4 h-4 ${item.color}`} />
            </div>
            <p className="text-2xl font-bold">{item.val}</p>
          </div>
        ))}
      </div>

      {/* Search Filter */}
      <div className="flex items-center bg-white shadow-sm border border-slate-200 rounded-xl px-3 py-2 max-w-sm">
        <Search className="w-4 h-4 text-muted-foreground mr-2" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search webinar by title…"
          className="bg-transparent border-none text-sm text-foreground placeholder-muted-foreground focus:outline-none w-full"
        />
      </div>

      {/* Reports Table */}
      {loading ? (
        <div className="py-20 flex items-center justify-center">
          <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="border border-dashed border-slate-200 rounded-2xl p-12 text-center bg-slate-50">
          <h3 className="font-semibold text-foreground">No webinar reports available</h3>
          <p className="text-muted-foreground text-xs mt-1">Webinars will show registration and audience tracking statistics once created.</p>
        </div>
      ) : (
        <div className="border border-slate-200 rounded-2xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Webinar Session</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mode</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Registrations</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Joins</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Attendance Rate</th>
                  <th className="p-4 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filtered.map((w) => {
                  const rate = w.registeredCount > 0 ? Math.round((w.attendeeCount / w.registeredCount) * 100) : 0;
                  return (
                    <tr key={w.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-4">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{w.title}</p>
                          <p className="text-muted-foreground text-xs flex items-center gap-1.5 mt-1">
                            <Calendar className="w-3 h-3" />
                            {w.scheduledAt ? new Date(w.scheduledAt).toLocaleString() : '—'}
                          </p>
                        </div>
                      </td>
                      <td className="p-4 text-sm font-medium text-foreground capitalize">
                        {w.mode === 'semi_live' ? '🎬 Semi-Live' : '📡 Fully Live'}
                      </td>
                      <td className="p-4 text-sm font-semibold text-indigo-400">
                        {w.registeredCount || 0}
                      </td>
                      <td className="p-4 text-sm font-semibold text-emerald-400">
                        {w.attendeeCount || 0}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${rate > 50 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                              style={{ width: `${rate}%` }}
                            />
                          </div>
                          <span className="text-xs font-bold">{rate}%</span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setSelectedWebinar(w)}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 border border-slate-200 hover:bg-slate-200 flex items-center gap-1 transition-colors"
                          >
                            Details
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => downloadWebinarReport(w)}
                            className="p-2 rounded-lg bg-violet-600/10 hover:bg-violet-600/20 border border-violet-500/20 text-violet-400 transition-colors"
                            title="Download CSV"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Webinar Details Modal */}
      {selectedWebinar && (() => {
        const registrants = (selectedWebinar.settings?.registrants as any[]) || [];
        const attendees = (selectedWebinar.settings?.attendees as any[]) || [];

        return (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden max-w-3xl w-full shadow-2xl relative flex flex-col max-h-[85vh]">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-foreground font-bold text-lg">{selectedWebinar.title}</h3>
                  <p className="text-muted-foreground text-xs mt-0.5">Session Attendee Report & Activity Log</p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => downloadWebinarReport(selectedWebinar)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#5271ff] hover:bg-blue-600 text-foreground text-xs font-semibold transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" />
                    CSV Report
                  </button>
                  <button
                    onClick={() => setSelectedWebinar(null)}
                    className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 overflow-y-auto space-y-6 flex-1">
                {/* Stats */}
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Registrations</p>
                    <p className="text-xl font-bold text-indigo-400 mt-1">{registrants.length}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Attended</p>
                    <p className="text-xl font-bold text-emerald-400 mt-1">{attendees.length}</p>
                  </div>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Attendance Rate</p>
                    <p className="text-xl font-bold text-violet-400 mt-1">
                      {registrants.length > 0 ? Math.round((attendees.length / registrants.length) * 100) : 0}%
                    </p>
                  </div>
                </div>

                {/* Attendee details list */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm border-b border-slate-200 pb-2">Registrant & Attendee Activity</h4>

                  {registrants.length === 0 && attendees.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-xs">No registrations or joins recorded for this webinar.</div>
                  ) : (
                    <div className="space-y-2">
                      {/* Combine unique users */}
                      {registrants.map((reg) => {
                        const email = reg.email?.trim().toLowerCase();
                        const att = attendees.find((a) => a.email?.trim().toLowerCase() === email);

                        return (
                          <div
                            key={reg.id}
                            className="bg-white shadow-sm border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <p className="font-semibold text-foreground text-sm">{reg.name}</p>
                              <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <Mail className="w-3.5 h-3.5" />
                                {reg.email}
                              </p>
                            </div>
                            <div className="flex flex-wrap sm:flex-nowrap items-center gap-4 text-right">
                              <div>
                                <p className="text-muted-foreground font-medium">Status</p>
                                <span className={`inline-block px-2 py-0.5 rounded-lg border mt-0.5 font-bold ${
                                  att
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                                }`}>
                                  {att ? 'Attended' : 'Registered Only'}
                                </span>
                              </div>
                              {att && (
                                <div>
                                  <p className="text-muted-foreground font-medium">Watch Duration</p>
                                  <p className="text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                                    <Clock className="w-3.5 h-3.5" />
                                    {fmtTime(att.durationSeconds || 0)}
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {/* Add guest attendees who didn't register */}
                      {attendees.map((att) => {
                        const email = att.email?.trim().toLowerCase();
                        const registered = registrants.some((r) => r.email?.trim().toLowerCase() === email);

                        if (registered) return null;

                        return (
                          <div
                            key={att.id}
                            className="bg-white shadow-sm border border-slate-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                          >
                            <div>
                              <p className="font-semibold text-foreground text-sm">{att.name}</p>
                              <p className="text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                <Mail className="w-3.5 h-3.5" />
                                {att.email || 'Guest attendee'}
                              </p>
                            </div>
                            <div className="flex items-center gap-4 text-right">
                              <div>
                                <p className="text-muted-foreground font-medium">Status</p>
                                <span className="inline-block px-2 py-0.5 rounded-lg border mt-0.5 font-bold bg-emerald-500/10 border-emerald-500/20 text-emerald-400">
                                  Attended (Guest)
                                </span>
                              </div>
                              <div>
                                <p className="text-muted-foreground font-medium">Watch Duration</p>
                                <p className="text-emerald-400 font-bold mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3.5 h-3.5" />
                                  {fmtTime(att.durationSeconds || 0)}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
