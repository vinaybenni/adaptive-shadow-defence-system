import React, { useState, useEffect } from 'react';
import { Shield, Activity, List, Settings, AlertTriangle, Trash2, Sun, Moon, CheckCircle } from 'lucide-react';
import { BarChart, Bar, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, Legend } from 'recharts';

const Dashboard = ({ stats, logs, connected }) => {
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'risk-split', 'normal-only', 'suspicious-only', 'blocked-only'

    // Filter Logic
    const normalLogs = logs.filter(l => l.event === "Successful Login" || l.event === "login_success");
    const lowRiskLogs = logs.filter(l => (l.risk === "LOW" || l.risk === "MEDIUM") && l.event !== "Successful Login" && l.event !== "login_success");
    const highRiskLogs = logs.filter(l => l.risk === "HIGH");
    const suspiciousLogs = logs.filter(l => l.score >= 90);
    const blockedLogs = logs.filter(l => l.risk === "HIGH");

    // Format attack type stats for Recharts
    const attackTypeData = Object.entries(stats.attackTypes || {})
        .map(([name, count]) => ({
            name: name.replace(/_/g, ' ').toUpperCase(),
            count
        }))
        .sort((a, b) => b.count - a.count); // Highest counts first

    const COLORS = ['#ef4444', '#f97316', '#eab308', '#84cc16', '#06b6d4', '#6366f1'];

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6 text-emerald-400 dark:text-emerald-400">
                Security Dashboard
                {connected && <span className="ml-4 text-xs bg-emerald-900 text-emerald-300 px-2 py-1 rounded-full align-middle">LIVE</span>}
            </h1>
            <div className="grid grid-cols-4 gap-6 mb-10">
                <div
                    onClick={() => setActiveFilter(activeFilter === 'risk-split' ? 'all' : 'risk-split')}
                    className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer hover:scale-[1.03] hover:shadow-xl hover:shadow-indigo-500/10 backdrop-blur-md ${activeFilter === 'risk-split' ? 'bg-indigo-900/40 border-indigo-500 ring-4 ring-indigo-500/10' : 'bg-slate-900/60 border-slate-800'}`}
                >
                    <div className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Total Requests</div>
                    <div className="text-3xl font-black text-white">{stats.totalRequests.toLocaleString()}</div>
                    <div className="text-[10px] text-indigo-400 mt-2 font-black italic">{activeFilter === 'risk-split' ? 'VIEWING SPLIT' : 'CLICK TO REVEAL RISK'}</div>
                </div>

                <div
                    onClick={() => setActiveFilter(activeFilter === 'normal-only' ? 'all' : 'normal-only')}
                    className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer hover:scale-[1.03] hover:shadow-xl hover:shadow-emerald-500/10 backdrop-blur-md ${activeFilter === 'normal-only' ? 'bg-emerald-900/40 border-emerald-500 ring-4 ring-emerald-500/10' : 'bg-slate-900/60 border-slate-800'}`}
                >
                    <div className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Normal User</div>
                    <div className="text-3xl font-black text-emerald-400">{stats.normalUsers || 0}</div>
                    <div className="text-[10px] text-emerald-400 mt-2 font-black italic">{activeFilter === 'normal-only' ? 'FILTERING SUCCESS' : 'CLICK TO FILTER'}</div>
                </div>

                <div
                    onClick={() => setActiveFilter(activeFilter === 'suspicious-only' ? 'all' : 'suspicious-only')}
                    className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer hover:scale-[1.03] hover:shadow-xl hover:shadow-orange-500/10 backdrop-blur-md ${activeFilter === 'suspicious-only' ? 'bg-orange-900/40 border-orange-500 ring-4 ring-orange-500/10' : 'bg-slate-900/60 border-slate-800'}`}
                >
                    <div className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Suspicious Users</div>
                    <div className="text-3xl font-black text-orange-400">{stats.suspiciousUsers}</div>
                    <div className="text-[10px] text-orange-400 mt-2 font-black italic">{activeFilter === 'suspicious-only' ? 'FILTERING RISK' : 'CLICK TO FILTER'}</div>
                </div>

                <div
                    onClick={() => setActiveFilter(activeFilter === 'blocked-only' ? 'all' : 'blocked-only')}
                    className={`p-6 rounded-2xl border transition-all duration-300 cursor-pointer hover:scale-[1.03] hover:shadow-xl hover:shadow-red-500/10 backdrop-blur-md ${activeFilter === 'blocked-only' ? 'bg-red-900/40 border-red-500 ring-4 ring-red-500/10' : 'bg-slate-900/60 border-slate-800'}`}
                >
                    <div className="text-slate-400 text-xs uppercase tracking-widest font-bold mb-1">Attack Type</div>
                    <div className="text-3xl font-black text-red-500">{stats.uniqueAttackTypes || 0}</div>
                    <div className="text-[10px] text-red-400 mt-2 font-black italic">{activeFilter === 'blocked-only' ? 'VIEWING THREATS' : 'CLICK TO ANALYZE'}</div>
                </div>
            </div>

            {/* Content Area */}
            {activeFilter === 'risk-split' ? (
                <div className="grid grid-cols-2 gap-8">
                    {/* Low Risk Column */}
                    <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-emerald-500/10 shadow-2xl">
                        <h3 className="text-emerald-400 font-black mb-6 flex items-center gap-3 uppercase tracking-widest text-sm">
                            <div className="bg-emerald-500/20 p-1.5 rounded-lg border border-emerald-500/30"><Activity size={18} /></div>
                            Low / Medium Risk Traffic
                        </h3>
                        <LogTable logs={lowRiskLogs} emptyMsg="No low risk hits yet." />
                    </div>
                    {/* High Risk Column */}
                    <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-red-500/10 shadow-2xl">
                        <h3 className="text-red-400 font-black mb-6 flex items-center gap-3 uppercase tracking-widest text-sm">
                            <div className="bg-red-500/20 p-1.5 rounded-lg border border-red-500/30"><AlertTriangle size={18} /></div>
                            High Risk Traffic
                        </h3>
                        <LogTable logs={highRiskLogs} emptyMsg="No high risk hits yet." />
                    </div>
                </div>
            ) : activeFilter === 'normal-only' ? (
                <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-emerald-500/10 shadow-2xl">
                    <h3 className="text-emerald-400 font-black mb-6 flex items-center gap-3 uppercase tracking-widest text-sm">
                        <div className="bg-emerald-500/20 p-1.5 rounded-lg border border-emerald-500/30"><CheckCircle size={18} /></div>
                        Successful Logins Only
                    </h3>
                    <LogTable logs={normalLogs} emptyMsg="No successful logins logged yet." />
                </div>
            ) : activeFilter === 'suspicious-only' ? (
                <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-orange-500/10 shadow-2xl">
                    <h3 className="text-orange-400 font-black mb-6 flex items-center gap-3 uppercase tracking-widest text-sm">
                        <div className="bg-orange-500/20 p-1.5 rounded-lg border border-orange-500/30"><AlertTriangle size={18} /></div>
                        Suspicious Activity (Score &gt; 90)
                    </h3>
                    <LogTable logs={suspiciousLogs} emptyMsg="No suspicious activity detected yet." />
                </div>
            ) : activeFilter === 'blocked-only' ? (
                <div className="bg-slate-900/40 backdrop-blur-md p-8 rounded-3xl border border-red-500/10 shadow-2xl h-[450px] flex flex-col">
                    <h3 className="text-red-400 font-black mb-8 flex items-center gap-3 uppercase tracking-widest text-sm shrink-0">
                        <div className="bg-red-500/20 p-1.5 rounded-lg border border-red-500/30"><Shield size={18} /></div>
                        Threat Intelligence Feed
                    </h3>

                    {attackTypeData.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-slate-600 italic font-medium">
                            No persistent threats detected in current cycle.
                        </div>
                    ) : (
                        <div className="flex-1 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={attackTypeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={90}
                                        outerRadius={130}
                                        paddingAngle={5}
                                        dataKey="count"
                                        nameKey="name"
                                        stroke="none"
                                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                        labelLine={{ stroke: '#475569', strokeWidth: 1 }}
                                    >
                                        {attackTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} fillOpacity={0.9} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        cursor={{ fill: '#1e293b', opacity: 0.4 }}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.4)' }}
                                        itemStyle={{ color: '#f87171', fontWeight: 'bold' }}
                                    />
                                    <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#94a3b8', paddingTop: '20px' }}/>
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-2xl">
                    <h3 className="text-slate-200 font-black mb-6 flex items-center gap-3 uppercase tracking-widest text-sm">
                        <div className="bg-indigo-500/10 p-1.5 rounded-lg border border-indigo-500/30"><Activity size={18} className="text-indigo-400" /></div>
                        Live Intelligence Feed
                    </h3>
                    <LogTable logs={logs} emptyMsg="System online. Awaiting telemetry..." />
                </div>
            )}
        </div>
    );
};

const LogTable = ({ logs, emptyMsg }) => (
    <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-slate-300">
            <thead className="text-slate-500 border-b border-slate-700">
                <tr>
                    <th className="pb-2">Time</th>
                    <th className="pb-2">Client IP</th>
                    <th className="pb-2">Risk</th>
                    <th className="pb-2">Event</th>
                    <th className="pb-2 text-right">Score</th>
                </tr>
            </thead>
            <tbody>
                {logs.length === 0 ? (
                    <tr>
                        <td colSpan="5" className="py-8 text-center text-slate-600 italic">{emptyMsg}</td>
                    </tr>
                ) : (
                    logs.map(log => (
                        <tr key={log.id} className="border-b border-slate-800/50 hover:bg-slate-700/30 transition-colors">
                            <td className="py-2 font-mono text-slate-500 text-[11px]">{log.time}</td>
                            <td className="py-2 font-medium text-[12px]">{log.ip}</td>
                            <td className="py-2">
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${log.risk === 'HIGH' ? 'bg-red-900/50 text-red-400' :
                                    log.risk === 'MEDIUM' ? 'bg-orange-900/50 text-orange-400' :
                                        'bg-emerald-900/50 text-emerald-400'
                                    }`}>
                                    {log.risk}
                                </span>
                            </td>
                            <td className="py-2 text-slate-400 italic text-[12px] truncate max-w-[150px]">{log.event}</td>
                            <td className="py-2 text-right font-bold text-slate-100">{log.score}</td>
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    </div>
);

const ShadowMonitor = ({ stats, logs }) => {
    const [activeFilter, setActiveFilter] = useState('all');

    const filteredLogs = logs.filter(log => {
        if (activeFilter === 'all') return true;
        if (activeFilter === 'attacks') {
            const content = `${log.path} ${log.payload}`.toLowerCase();
            return /sql_injection|xss|path_traversal|os_command/.test(content);
        }
        return true;
    });

    return (
        <div className="p-6">
            <h1 className="text-3xl font-black mb-10 text-purple-400 uppercase tracking-tighter shadow-purple-500/20">
                Shadow Intelligence Monitor
            </h1>

            <div className="grid grid-cols-3 gap-8 mb-10">
                <div
                    onClick={() => setActiveFilter('all')}
                    className={`p-8 rounded-3xl border transition-all duration-500 cursor-pointer hover:scale-[1.03] hover:shadow-2xl backdrop-blur-md ${activeFilter === 'all' ? 'bg-purple-900/30 border-purple-500 ring-4 ring-purple-500/10' : 'bg-slate-900/40 border-slate-800 shadow-xl'}`}
                >
                    <div className="text-slate-500 text-xs uppercase tracking-widest font-black mb-2">Shadow Ingress</div>
                    <div className="text-4xl font-black text-white">{stats.totalRequests.toLocaleString()}</div>
                    <div className="mt-3 text-[10px] text-purple-400 font-black uppercase italic tracking-widest">{activeFilter === 'all' ? '● MONITORING ALL' : 'CLICK TO EXPAND'}</div>
                </div>

                <div
                    onClick={() => setActiveFilter('attacks')}
                    className={`p-8 rounded-3xl border transition-all duration-500 cursor-pointer hover:scale-[1.03] hover:shadow-2xl backdrop-blur-md ${activeFilter === 'attacks' ? 'bg-red-900/30 border-red-500 ring-4 ring-red-500/10' : 'bg-slate-900/40 border-slate-800 shadow-xl'}`}
                >
                    <div className="text-slate-500 text-xs uppercase tracking-widest font-black mb-2">Neutralized Threats</div>
                    <div className="text-4xl font-black text-red-500">{stats.uniqueAttackTypes || 0} <span className="text-lg text-red-900/60 uppercase">Vectors</span></div>
                    <div className="mt-3 text-[10px] text-red-400 font-black uppercase italic tracking-widest">{activeFilter === 'attacks' ? '● FILTERING THREATS' : 'CLICK TO ANALYZE'}</div>
                </div>

                <div className="p-8 rounded-3xl border bg-slate-900/40 border-slate-800 backdrop-blur-md shadow-xl transition-all duration-500 hover:shadow-orange-500/5">
                    <div className="text-slate-500 text-xs uppercase tracking-widest font-black mb-2">Unique Adversaries</div>
                    <div className="text-4xl font-black text-orange-500">{stats.uniqueAttackers || 0}</div>
                    <div className="mt-3 text-[10px] text-orange-400 font-black uppercase italic tracking-widest">TRACEABLE ENTITIES</div>
                </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md rounded-3xl border border-slate-800 shadow-2xl overflow-hidden ring-1 ring-white/5">
                <div className="p-6 border-b border-slate-800/50 flex justify-between items-center bg-slate-950/20">
                    <h3 className="font-black text-slate-200 flex items-center gap-3 uppercase tracking-widest text-xs">
                        <div className="bg-purple-500/10 p-1.5 rounded-lg border border-purple-500/30 text-purple-400"><Shield size={18} /></div>
                        {activeFilter === 'all' ? 'Live Shadow Interaction Stream' : 'Filtered Threat Vectors'}
                    </h3>
                    <div className="text-[10px] bg-slate-800 px-3 py-1 rounded-full text-slate-500 font-black uppercase tracking-widest">{filteredLogs.length} EVENTS LOADED</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm border-spacing-y-2">
                        <thead className="bg-slate-950/40 text-slate-500">
                            <tr>
                                <th className="p-6 font-black uppercase text-[10px] tracking-widest">Time</th>
                                <th className="p-6 font-black uppercase text-[10px] tracking-widest">	Client IP</th>
                                <th className="p-6 font-black uppercase text-[10px] tracking-widest">Path</th>
                                <th className="p-6 font-black uppercase text-[10px] tracking-widest">Payload Data</th>
                                <th className="p-6 font-black uppercase text-[10px] tracking-widest">Client Sign</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/30">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-20 text-center text-slate-700 italic font-medium uppercase tracking-widest text-xs">Waiting for shadow ingress...</td>
                                </tr>
                            ) : (
                                filteredLogs.map((log, i) => (
                                    <tr key={i} className="hover:bg-purple-500/5 transition-all duration-300">
                                        <td className="p-6 font-mono text-slate-500 text-[11px] whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                        <td className="p-6">
                                            <span className="bg-orange-900/20 text-orange-400 font-black px-2 py-1 rounded border border-orange-500/20 text-xs">
                                                {log.attacker_ip}
                                            </span>
                                        </td>
                                        <td className="p-6 text-slate-300 font-mono text-[12px]"><span className="text-slate-600 block text-[9px] uppercase font-bold tracking-tighter opacity-50 mb-1">Host: {log.shadow_host}</span>/{log.path}</td>
                                        <td className="p-6 text-slate-500 italic max-w-xs truncate font-medium">{log.payload || "CLEAN INGRESS"}</td>
                                        <td className="p-6 text-slate-600 text-[10px] max-w-[150px] truncate uppercase font-bold">{log.user_agent}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const Applications = () => {
    const [apps, setApps] = useState([]);
    const [realUrl, setRealUrl] = useState("");
    const [shadowUrl, setShadowUrl] = useState("");

    useEffect(() => {
        fetchApps();
    }, []);

    const fetchApps = async () => {
        try {
            const resp = await fetch("http://localhost:8010/api/v1/apps");
            if (resp.ok) {
                const data = await resp.json();
                setApps(data);
            }
        } catch (e) {
            console.error("Failed to fetch apps", e);
        }
    };

    const handleProtectApp = async () => {
        if (!realUrl) return;
        if (!shadowUrl) {
            alert("Shadow URL is required for website registration.");
            return;
        }

        let sanitizedDomain = realUrl.replace(/^(http:\/\/|https:\/\/)/, "").split('/')[0];
        if (sanitizedDomain.includes(":")) {
            sanitizedDomain = sanitizedDomain.split(":")[0];
        }

        const config = {
            name: sanitizedDomain.split('.')[0] || "app",
            domain: sanitizedDomain,
            real_upstream: realUrl,
            shadow_upstream: shadowUrl || null,
            protection_enabled: true
        };

        try {
            const resp = await fetch("http://localhost:8010/api/v1/apps", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(config)
            });

            if (resp.ok) {
                fetchApps();
                setRealUrl("");
                setShadowUrl("");
                alert(`Application Registered! Telemetry active on http://localhost:8010`);
            } else {
                alert("Failed to protect app");
            }
        } catch (e) {
            console.error("Failed to add app", e);
            alert("Backend Error: Ensure Agent 2 is running on port 8010");
        }
    };

    const handleDeleteApp = async (domainToDelete) => {
        if (!confirm(`Are you sure you want to remove protection for ${domainToDelete}?`)) return;
        try {
            const resp = await fetch(`http://localhost:8010/api/v1/apps/${domainToDelete}`, { method: "DELETE" });
            if (resp.ok) fetchApps();
        } catch (e) { console.error("Failed to delete app", e); }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6 text-blue-400">Applications</h1>

            <div className="bg-slate-800 p-4 rounded-lg border border-slate-700 mb-6">
                <h3 className="font-bold mb-4 text-slate-300">Manage No-Proxy Telemetry</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Real web URL</label>
                        <input
                            type="text"
                            placeholder=""
                            value={realUrl}
                            onChange={(e) => setRealUrl(e.target.value)}
                            className="bg-slate-900 border border-slate-600 p-2 rounded w-full text-slate-200"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Shadow web URL</label>
                        <input
                            type="text"
                            placeholder=""
                            value={shadowUrl}
                            onChange={(e) => setShadowUrl(e.target.value)}
                            className="bg-slate-900 border border-slate-600 p-2 rounded w-full text-slate-200"
                        />
                    </div>
                </div>

                <button onClick={handleProtectApp} className="mt-4 bg-blue-600 hover:bg-blue-500 px-6 py-2 rounded font-bold transition-colors text-white">
                    Register website
                </button>
            </div>

            <div className="bg-slate-900 rounded p-4">
                <div className="text-slate-400 mb-2">Active Apps ({apps.length}):</div>
                {apps.length === 0 ? <div className="text-slate-600 italic">No applications registered yet.</div> : (
                    apps.map((app, i) => (
                        <div key={i} className="mt-2 p-3 bg-slate-800 rounded flex justify-between items-center border border-slate-700">
                            <div>
                                <div className="font-bold text-slate-200">{app.domain}</div>

                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-green-400 text-sm bg-green-900/50 border border-green-800 px-2 py-1 rounded">Monitoring</span>
                                <button onClick={() => handleDeleteApp(app.domain)} className="text-slate-400 hover:text-red-400 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const ProtectionRules = ({ proposals }) => {
    const [blocklist, setBlocklist] = useState([]);
    const [ipToBlock, setIpToBlock] = useState("");

    useEffect(() => {
        fetchBlocklist();
    }, []);

    const fetchBlocklist = async () => {
        try {
            const resp = await fetch("http://localhost:8010/api/v1/blocklist");
            if (resp.ok) setBlocklist(await resp.json());
        } catch (e) { console.error(e); }
    };

    const handleBlock = async () => {
        const trimmedIp = ipToBlock.trim();
        if (!trimmedIp) return;
        try {
            const resp = await fetch("http://localhost:8010/api/v1/block", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ip: trimmedIp })
            });
            if (resp.ok) {
                setIpToBlock("");
                fetchBlocklist();
            }
        } catch (e) { console.error(e); }
    };

    const handleUnblock = async (ip) => {
        try {
            const resp = await fetch(`http://localhost:8010/api/v1/block/${ip}`, { method: "DELETE" });
            if (resp.ok) fetchBlocklist();
        } catch (e) { console.error(e); }
    };

    return (
        <div className="p-6">
            <h1 className="text-3xl font-bold mb-6 text-purple-400 flex items-center gap-3">
                <Shield size={32} /> Protection & Learning
            </h1>

            <div className="grid grid-cols-2 gap-6">
                <div className="space-y-6">
                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <h3 className="font-bold mb-4 text-emerald-400 flex items-center gap-2">
                            <CheckCircle size={18} /> Active Security Rules
                        </h3>
                        <div className="space-y-2">
                            {['SQL Injection Prevention', 'XSS Script Blocking', 'Brute Force Detection', 'Path Traversal Guard', 'OS Command Injection'].map(rule => (
                                <div key={rule} className="p-3 bg-slate-900 rounded flex justify-between items-center border border-slate-800">
                                    <span className="text-slate-200 text-sm">{rule}</span>
                                    <span className="text-[10px] bg-emerald-900 text-emerald-400 px-2 py-0.5 rounded uppercase font-bold">Enabled</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                        <h3 className="font-bold mb-4 text-red-400 flex items-center gap-2">
                            <AlertTriangle size={18} /> IP Blocklist Management
                        </h3>
                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                placeholder="Enter IP to block..."
                                value={ipToBlock}
                                onChange={(e) => setIpToBlock(e.target.value)}
                                className="bg-slate-900 border border-slate-600 p-2 rounded flex-1 text-slate-200 text-sm"
                            />
                            <button onClick={handleBlock} className="bg-red-600 hover:bg-red-500 px-4 py-2 rounded font-bold text-white text-sm transition-colors">
                                Block IP
                            </button>
                        </div>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                            {blocklist.length === 0 ? (
                                <div className="text-slate-600 text-sm italic p-2">No blocked IPs</div>
                            ) : (
                                blocklist.map(ip => (
                                    <div key={ip} className="p-2 bg-slate-900 rounded flex justify-between items-center border border-slate-800">
                                        <span className="text-slate-300 font-mono text-xs">{ip}</span>
                                        <button onClick={() => handleUnblock(ip)} className="text-xs text-slate-500 hover:text-emerald-400 font-bold uppercase">Unblock</button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <h3 className="font-bold mb-4 text-purple-400 flex items-center gap-2">
                        <Activity size={18} /> Agent 4: AI Learning Agent
                    </h3>
                    {proposals.length === 0 ? (
                        <div className="text-slate-600 italic text-center py-10 border-2 border-dashed border-slate-700 rounded">
                            Agent 4 is analyzing telemetry... <br /> No rule proposals yet.
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {proposals.map((prop, i) => (
                                <div key={i} className="bg-indigo-900/40 p-4 rounded-lg border border-indigo-700/50">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-indigo-200 font-bold">{prop.change_summary}</span>
                                        <button className="bg-emerald-600 hover:bg-emerald-500 px-3 py-1 rounded text-xs font-bold text-white transition-colors">Apply Rule</button>
                                    </div>
                                    <div className="text-[10px] font-mono text-indigo-400 bg-slate-900 p-2 rounded mb-2">
                                        {prop.diff}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const AppSettings = ({ isDark, toggleTheme, onReset }) => (
    <div className="p-6">
        <h1 className="text-3xl font-black mb-8 text-slate-500 uppercase tracking-tighter">Settings & Configuration</h1>

        <div className="space-y-8">
            <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-2xl">
                <h3 className="font-black mb-6 text-slate-300 uppercase tracking-widest text-xs flex items-center gap-2">
                    <div className="bg-slate-800 p-1.5 rounded-lg border border-slate-700"><Sun size={16} /></div> Appearance
                </h3>
                <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">System Theme</span>
                    <button onClick={toggleTheme} className="flex items-center gap-2 bg-slate-900 border border-slate-700 px-6 py-2.5 rounded-xl text-slate-200 hover:bg-slate-800 hover:border-indigo-500/50 transition-all duration-300 shadow-lg">
                        {isDark ? <><Moon size={16} className="text-indigo-400" /> Dark Mode</> : <><Sun size={16} className="text-yellow-400" /> Light Mode</>}
                    </button>
                </div>
            </div>

            <div className="bg-slate-900/40 backdrop-blur-md p-6 rounded-3xl border border-slate-800 shadow-2xl relative z-10">
                <h3 className="font-black mb-6 text-slate-300 uppercase tracking-widest text-xs flex items-center gap-2">
                    <div className="bg-emerald-500/10 p-1.5 rounded-lg border border-emerald-500/20"><Activity size={16} className="text-emerald-500" /></div> Diagnostics & Logs
                </h3>
                <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-medium">Operational Intelligence</span>
                    <div className="relative group">
                        <button className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 px-6 py-2.5 rounded-xl text-white font-bold transition-all duration-300 shadow-[0_10px_20px_rgba(16,185,129,0.2)] hover:shadow-[0_10px_25px_rgba(16,185,129,0.3)] hover:scale-[1.05]">
                            <List size={18} /> Download Logs
                        </button>
                        <div className="absolute right-0 mt-3 w-56 bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.5)] opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100] overflow-hidden ring-1 ring-white/5">
                            {['Agent 1', 'Agent 2', 'Agent 3', 'Agent 4'].map(agent => (
                                <button
                                    key={agent}
                                    onClick={() => {
                                        const url = `http://localhost:8010/api/v1/logs/${agent.toLowerCase().replace(' ', '')}`;
                                        const link = document.createElement('a');
                                        link.href = url;
                                        link.setAttribute('download', `${agent.toLowerCase().replace(' ', '_')}.log`);
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                    }}
                                    className="w-full text-left px-5 py-4 text-sm text-slate-300 hover:bg-emerald-500/10 hover:text-emerald-400 transition-all duration-200 border-b border-slate-800 last:border-0 flex items-center justify-between group/item"
                                >
                                    <span className="font-bold">{agent} Logs</span>
                                    <span className="text-[10px] bg-slate-800 px-1.5 py-0.5 rounded-md text-slate-500 font-black group-hover/item:bg-emerald-500/20 group-hover/item:text-emerald-400 transition-colors uppercase">.log</span>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-red-900/10 backdrop-blur-md p-6 rounded-3xl border border-red-900/30 shadow-2xl">
                <h3 className="font-black mb-2 text-red-500 uppercase tracking-widest text-xs">Danger Zone</h3>
                <p className="text-xs text-slate-500 mb-6 font-medium">Permanent destruction of logs and telemetry data. This action is irreversible.</p>
                <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm font-bold">Clear Core Intelligence</span>
                    <button
                        onClick={() => {
                            if (window.confirm("Are you sure you want to clear ALL dashboard statistics and logs? This cannot be undone.")) {
                                onReset();
                            }
                        }}
                        className="flex items-center gap-2 bg-red-900/20 border border-red-800/50 px-6 py-2.5 rounded-xl text-red-400 hover:bg-red-600 hover:text-white transition-all duration-300 text-sm font-black shadow-lg"
                    >
                        <Trash2 size={16} /> WIPE DATA
                    </button>
                </div>
            </div>
        </div>
    </div>
);

function App() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [isDark, setIsDark] = useState(true);
    const [stats, setStats] = useState({
        totalRequests: 0,
        normalUsers: 0,
        suspiciousUsers: 0,
        attacksBlocked: 0,
        uniqueAttackTypes: 0,
        shadowRouting: 0,
        attackTypes: {}
    });
    const [logs, setLogs] = useState([]);
    const [proposals, setProposals] = useState([]);
    const [shadowStats, setShadowStats] = useState({
        totalRequests: 0,
        uniqueAttackers: 0,
        attackTypes: {},
        uniqueAttackTypes: 0
    });
    const [shadowLogs, setShadowLogs] = useState([]);
    const [connected, setConnected] = useState(false);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const resp = await fetch("http://localhost:8010/api/v1/stats");
                if (resp.ok) {
                    const data = await resp.json();
                    if (data.stats) setStats(data.stats);
                    if (data.logs) {
                        setLogs(data.logs.map((log, i) => ({
                            id: `hist-${i}`,
                            time: new Date(log.timestamp).toLocaleTimeString(),
                            ip: log.client_ip || "Unknown",
                            risk: log.risk || (log.channel === "login.success" ? "LOW" : "LOW"),
                            score: log.score || 0,
                            event: log.explain || log.tags?.join(", ") || (log.channel === "login.success" ? "Successful Login" : "Traffic hit")
                        })));
                    }
                    if (data.stats && data.stats.shadowStats) setShadowStats(data.stats.shadowStats);
                    if (data.shadowLogs) setShadowLogs(data.shadowLogs);
                }
            } catch (e) { console.error("History fetch failed", e); }
        };
        fetchHistory();
    }, []);

    useEffect(() => {
        let ws;
        let retryInterval;
        const processedMsgs = new Set(); // De-duplication set

        const connect = () => {
            ws = new WebSocket("ws://localhost:8010/ws");
            ws.onopen = () => { setConnected(true); console.log("WS Connected"); };
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    // DE-DUPLICATION CHECK
                    if (data.msg_id && processedMsgs.has(data.msg_id)) {
                        console.warn("WS: Ignored duplicate message", data.msg_id);
                        return;
                    }
                    if (data.msg_id) processedMsgs.add(data.msg_id);

                    if (data.channel === "risk.events") {
                        if (data.stats) {
                            setStats(prev => ({
                                ...prev,
                                ...data.stats
                            }));
                        } else {
                            // Fallback for older messages
                            setStats(prev => ({
                                ...prev,
                                totalRequests: prev.totalRequests + 1,
                            }));
                        }
                        setLogs(prev => [{
                            id: data.msg_id || Date.now(),
                            time: new Date().toLocaleTimeString(),
                            ip: data.client_ip || "Unknown",
                            risk: data.risk,
                            score: data.score,
                            event: data.explain || data.tags?.join(", ") || "Traffic hit"
                        }, ...prev].slice(0, 50));
                    } else if (data.channel === "login.success") {
                        if (data.stats) {
                            setStats(prev => ({
                                ...prev,
                                ...data.stats
                            }));
                        } else {
                            setStats(prev => ({
                                ...prev,
                                normalUsers: prev.normalUsers + 1
                            }));
                        }
                        setLogs(prev => [{
                            id: data.msg_id || Date.now(),
                            time: new Date().toLocaleTimeString(),
                            ip: data.client_ip || "Unknown",
                            risk: 'LOW',
                            score: 0,
                            event: "Successful Login"
                        }, ...prev].slice(0, 50));
                    } else if (data.channel === "agent4.proposals") {
                        setProposals(prev => [data, ...prev].slice(0, 5));
                    } else if (data.channel === "stats.clear") {
                        setStats({
                            totalRequests: 0,
                            normalUsers: 0,
                            suspiciousUsers: 0,
                            attacksBlocked: 0,
                            uniqueAttackTypes: 0,
                            shadowRouting: 0,
                            attackTypes: {}
                        });
                        setShadowStats({
                            totalRequests: 0,
                            uniqueAttackers: 0,
                            attackTypes: {},
                            uniqueAttackTypes: 0
                        });
                        setLogs([]);
                        setShadowLogs([]);
                    }

                    // Always update stats if provided in any message
                    if (data.stats) {
                        setStats(prev => ({ ...prev, ...data.stats }));
                        if (data.stats.shadowStats) {
                            setShadowStats(data.stats.shadowStats);
                        }
                    }

                    if (data.channel === "shadow.activity") {
                        setShadowLogs(prev => [data, ...prev].slice(0, 50));
                    }
                } catch (e) { console.error("WS Parse Error", e); }
            };
            ws.onclose = () => { setConnected(false); retryInterval = setTimeout(connect, 3000); };
            ws.onerror = () => ws.close();
        };
        connect();
        return () => { if (ws) ws.close(); if (retryInterval) clearTimeout(retryInterval); };
    }, []);

    const toggleTheme = () => {
        setIsDark(!isDark);
        if (!isDark) document.documentElement.classList.add('dark');
        else document.documentElement.classList.remove('dark');
    };

    const handleResetStats = async () => {
        try {
            const resp = await fetch("http://localhost:8010/api/v1/stats/reset", { method: "POST" });
            if (resp.ok) {
                // The broadcast listener will handle the UI update for us
                console.log("Stats reset triggered successfully");
            }
        } catch (e) {
            console.error("Stats reset failed", e);
            alert("Failed to reset statistics. Please check connection.");
        }
    };

    return (
        <div className={`flex h-screen ${isDark ? 'bg-slate-950 text-slate-100' : 'bg-slate-100 text-slate-900'} font-sans transition-colors duration-200`}>
            {/* Sidebar */}
            <div className={`w-64 border-r flex flex-col ${isDark ? 'bg-slate-900/60 backdrop-blur-xl border-slate-800/50' : 'bg-white/80 backdrop-blur-xl border-slate-200'}`}>
                <div className="p-8 flex items-center gap-3">
                    <div className="bg-emerald-500/10 p-2 rounded-xl border border-emerald-500/20">
                        <Shield className="text-emerald-500 w-8 h-8 drop-shadow-[0_0_8px_rgba(16,185,129,0.3)]" />
                    </div>
                    <span className={`font-black text-2xl tracking-tighter ${isDark ? 'text-white' : 'text-slate-800'}`}>ASDS</span>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-3">
                    <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === 'dashboard' ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.1)]' : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'}`}>
                        <Activity size={20} /> <span className="font-bold text-sm">Dashboard</span>
                    </button>
                    <button onClick={() => setActiveTab('applications')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === 'applications' ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'}`}>
                        <List size={20} /> <span className="font-bold text-sm">Applications</span>
                    </button>
                    <button onClick={() => setActiveTab('protection')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === 'protection' ? 'bg-purple-600/10 text-purple-400 border border-purple-500/30 shadow-[0_0_15_rgba(168,85,247,0.1)]' : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'}`}>
                        <AlertTriangle size={20} /> <span className="font-bold text-sm">Protection</span>
                    </button>
                    <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-300 ${activeTab === 'settings' ? 'bg-slate-700/30 text-slate-200 border border-slate-600/50 shadow-[0_0_15_rgba(148,163,184,0.1)]' : 'text-slate-500 hover:bg-slate-800/40 hover:text-slate-300'}`}>
                        <Settings size={20} /> <span className="font-bold text-sm">Settings</span>
                    </button>
                    <div className="pt-6 mt-6 border-t border-slate-800/50">
                        <button onClick={() => setActiveTab('shadow')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all duration-300 border ${activeTab === 'shadow' ? 'bg-purple-900/30 border-purple-500 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.2)]' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-800/40 hover:text-purple-400'}`}>
                            <Shield size={20} /> <span className="font-bold text-sm uppercase tracking-widest">Shadow Monitor</span>
                        </button>
                    </div>
                </nav>
                <div className={`p-4 border-t text-xs text-center ${isDark ? 'border-slate-800 text-slate-500' : 'border-slate-200 text-slate-400'}`}>
                    System Online <br /> {connected ? "Telemetry Live" : "Offline"}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 overflow-auto">
                {activeTab === 'dashboard' && <Dashboard stats={stats} logs={logs} connected={connected} />}
                {activeTab === 'applications' && <Applications />}
                {activeTab === 'protection' && <ProtectionRules proposals={proposals} />}
                {activeTab === 'settings' && <AppSettings isDark={isDark} toggleTheme={toggleTheme} onReset={handleResetStats} />}
                {activeTab === 'shadow' && <ShadowMonitor stats={shadowStats} logs={shadowLogs} />}
            </div>
        </div>
    );
}

export default App;
