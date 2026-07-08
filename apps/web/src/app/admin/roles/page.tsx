'use client';
import { useState, useEffect } from 'react';
import { adminApi } from '@/lib/adminApi';

type Permission = {
  id: string;
  name: string;
  module: string;
  description?: string;
};

type Role = {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
};

export default function RolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState<Record<string, boolean>>({});
  const [savedMsg, setSavedMsg] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<Record<string, Set<string>>>({});

  useEffect(() => {
    Promise.all([
      adminApi.roles.list() as Promise<Role[] | { roles?: Role[] }>,
      adminApi.roles.permissions() as Promise<Permission[] | { permissions?: Permission[] }>,
    ])
      .then(([rolesData, permsData]) => {
        const rolesList: Role[] = Array.isArray(rolesData) ? rolesData : (rolesData as { roles?: Role[] }).roles ?? [];
        const permsList: Permission[] = Array.isArray(permsData) ? permsData : (permsData as { permissions?: Permission[] }).permissions ?? [];
        setRoles(rolesList);
        setAllPermissions(permsList);
        const init: Record<string, Set<string>> = {};
        rolesList.forEach((r) => { init[r.id] = new Set(r.permissions.map((p) => p.id)); });
        setSelected(init);
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  const toggle = (roleId: string, permId: string) => {
    setSelected((prev) => {
      const next = new Set(prev[roleId] ?? []);
      if (next.has(permId)) next.delete(permId); else next.add(permId);
      return { ...prev, [roleId]: next };
    });
  };

  const saveRole = async (roleId: string) => {
    setSaving((p) => ({ ...p, [roleId]: true }));
    setSavedMsg((p) => ({ ...p, [roleId]: '' }));
    try {
      await adminApi.roles.updatePermissions(roleId, Array.from(selected[roleId] ?? []));
      setSavedMsg((p) => ({ ...p, [roleId]: 'Saved!' }));
      setTimeout(() => setSavedMsg((p) => ({ ...p, [roleId]: '' })), 2500);
    } catch (e) {
      setSavedMsg((p) => ({ ...p, [roleId]: `Error: ${(e as Error).message}` }));
    } finally {
      setSaving((p) => ({ ...p, [roleId]: false }));
    }
  };

  const modules = [...new Set(allPermissions.map((p) => p.module))];

  if (loading)
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: '#1d6fe8', borderTopColor: 'transparent' }} />
      </div>
    );

  return (
    <div className="space-y-6 max-w-5xl">
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171' }}>{error}</div>
      )}

      <div>
        <h1 className="text-white font-black text-2xl">Roles &amp; Permissions</h1>
        <p className="text-sm mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>Configure role-based access controls</p>
      </div>

      {roles.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 gap-3 rounded-2xl" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.2)' }}>
          <span className="text-4xl">🛡️</span>
          <p className="text-sm">No roles configured</p>
        </div>
      ) : (
        <div className="space-y-5">
          {roles.map((role) => (
            <div key={role.id} className="rounded-2xl overflow-hidden" style={{ background: 'rgba(15,16,26,0.9)', border: '1px solid rgba(255,255,255,0.06)' }}>
              {/* Role header */}
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                <div>
                  <h2 className="text-white font-bold text-base capitalize">{role.name}</h2>
                  {role.description && <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>{role.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  {savedMsg[role.id] && (
                    <span className="text-xs" style={{ color: savedMsg[role.id].startsWith('Error') ? '#f87171' : '#34d399' }}>
                      {savedMsg[role.id]}
                    </span>
                  )}
                  <button
                    onClick={() => saveRole(role.id)}
                    disabled={saving[role.id]}
                    className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
                    style={{ background: 'linear-gradient(135deg,#1d6fe8,#4338ca)' }}
                  >
                    {saving[role.id] ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </div>

              {/* Permissions matrix */}
              <div className="p-5 grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {modules.map((mod) => {
                  const modPerms = allPermissions.filter((p) => p.module === mod);
                  return (
                    <div key={mod}>
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-2.5" style={{ color: 'rgba(255,255,255,0.3)' }}>
                        {mod}
                      </p>
                      <div className="space-y-1.5">
                        {modPerms.map((perm) => {
                          const checked = selected[role.id]?.has(perm.id) ?? false;
                          return (
                            <label
                              key={perm.id}
                              className="flex items-start gap-2.5 cursor-pointer group"
                            >
                              <div
                                className="w-4 h-4 rounded flex-shrink-0 mt-0.5 flex items-center justify-center transition-all"
                                style={{
                                  background: checked ? '#1d6fe8' : 'rgba(255,255,255,0.05)',
                                  border: checked ? '1px solid #1d6fe8' : '1px solid rgba(255,255,255,0.1)',
                                }}
                                onClick={() => toggle(role.id, perm.id)}
                              >
                                {checked && (
                                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                                    <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                  </svg>
                                )}
                              </div>
                              <div onClick={() => toggle(role.id, perm.id)}>
                                <p className="text-xs font-medium" style={{ color: checked ? 'white' : 'rgba(255,255,255,0.5)' }}>
                                  {perm.name}
                                </p>
                                {perm.description && (
                                  <p className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.2)' }}>{perm.description}</p>
                                )}
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
