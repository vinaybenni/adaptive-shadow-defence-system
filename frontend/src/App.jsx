import React, { useState, useEffect } from 'react';
import { Shield, Activity, List, Settings, AlertTriangle, Trash2, Sun, Moon, CheckCircle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from 'recharts';

const Dashboard = ({ stats, logs, connected }) => {
    const [activeFilter, setActiveFilter] = useState('all'); // 'all', 'risk-split', 'normal-only', 'suspicious-only', 'blocked-only'

    // Filter Logic
    const normalLogs = logs.filter(l => l.event === "Successful Login");
    const lowRiskLogs = logs.filter(l => l.risk === "LOW" && l.event !== "Successful Login");
    const highRiskLogs = logs.filter(l => l.risk === "HIGH");
    const suspiciousLogs = logs.filter(l => l.score > 20);
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
            <div className="grid grid-cols-4 gap-4 mb-8">
                <div
                    onClick={() => setActiveFilter(activeFilter === 'risk-split' ? 'all' : 'risk-split')}
                    className={`p-4 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] ${activeFilter === 'risk-split' ? 'bg-indigo-900/40 border-indigo-500 ring-2 ring-indigo-500/20' : 'bg-slate-800 border-slate-700'}`}
                >
                    <div className="text-slate-400 text-sm">Total Requests</div>
                    <div className="text-2xl font-bold text-slate-100">{stats.totalRequests.toLocaleString()}</div>
                    <div className="text-[10px] text-indigo-400 mt-1 uppercase font-bold">{activeFilter === 'risk-split' ? 'Viewing Split' : 'Click to Split Risk'}</div>
                </div>

                <div
                    onClick={() => setActiveFilter(activeFilter === 'normal-only' ? 'all' : 'normal-only')}
                    className={`p-4 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] ${activeFilter === 'normal-only' ? 'bg-emerald-900/40 border-emerald-500 ring-2 ring-emerald-500/20' : 'bg-slate-800 border-slate-700'}`}
                >
                    <div className="text-slate-400 text-sm">Normal User</div>
                    <div className="text-2xl font-bold text-emerald-400">{stats.normalUsers || 0}</div>
                    <div className="text-[10px] text-emerald-400 mt-1 uppercase font-bold">{activeFilter === 'normal-only' ? 'Filtering Success' : 'Click to Filter'}</div>
                </div>

                <div
                    onClick={() => setActiveFilter(activeFilter === 'suspicious-only' ? 'all' : 'suspicious-only')}
                    className={`p-4 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] ${activeFilter === 'suspicious-only' ? 'bg-orange-900/40 border-orange-500 ring-2 ring-orange-500/20' : 'bg-slate-800 border-slate-700'}`}
                >
                    <div className="text-slate-400 text-sm">Suspicious Users</div>
                    <div className="text-2xl font-bold text-orange-400">{stats.suspiciousUsers}</div>
                    <div className="text-[10px] text-orange-400 mt-1 uppercase font-bold">{activeFilter === 'suspicious-only' ? 'Filtering Suspicious' : 'Click to Filter'}</div>
                </div>
                <div
                    onClick={() => setActiveFilter(activeFilter === 'blocked-only' ? 'all' : 'blocked-only')}
                    className={`p-4 rounded-lg border transition-all cursor-pointer hover:scale-[1.02] ${activeFilter === 'blocked-only' ? 'bg-red-900/40 border-red-500 ring-2 ring-red-500/20' : 'bg-slate-800 border-slate-700'}`}
                >
                    <div className="text-slate-400 text-sm">Attack Type</div>
                    <div className="text-2xl font-bold text-red-500">{stats.uniqueAttackTypes || 0}</div>
                    <div className="text-[10px] text-red-400 mt-1 uppercase font-bold">{activeFilter === 'blocked-only' ? 'Viewing Types' : 'Click to View Types'}</div>
                </div>
            </div>

            {/* Content Area */}
            {activeFilter === 'risk-split' ? (
                <div className="grid grid-cols-2 gap-6">
                    {/* Low Risk Column */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-emerald-900/30">
                        <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                            <Activity size={18} /> Low Risk Traffic
                        </h3>
                        <LogTable logs={lowRiskLogs} emptyMsg="No low risk hits yet." />
                    </div>
                    {/* High Risk Column */}
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-red-900/30">
                        <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">
                            <AlertTriangle size={18} /> High Risk Traffic
                        </h3>
                        <LogTable logs={highRiskLogs} emptyMsg="No high risk hits yet." />
                    </div>
                </div>
            ) : activeFilter === 'normal-only' ? (
                <div className="bg-slate-800 p-4 rounded-lg border border-emerald-700">
                    <h3 className="text-emerald-400 font-bold mb-4 flex items-center gap-2">
                        <CheckCircle size={18} /> Successful Logins Only
                    </h3>
                    <LogTable logs={normalLogs} emptyMsg="No successful logins logged yet." />
                </div>
            ) : activeFilter === 'suspicious-only' ? (
                <div className="bg-slate-800 p-4 rounded-lg border border-orange-700">
                    <h3 className="text-orange-400 font-bold mb-4 flex items-center gap-2">
                        <AlertTriangle size={18} /> Suspicious Activity (Score &gt; 20)
                    </h3>
                    <LogTable logs={suspiciousLogs} emptyMsg="No suspicious activity detected yet." />
                </div>
            ) : activeFilter === 'blocked-only' ? (
                <div className="bg-slate-800 p-4 rounded-lg border border-red-700 h-80 flex flex-col">
                    <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2 shrink-0">
                        <Shield size={18} className="text-red-500" /> Blocked Attacks Breakdown
                    </h3>

                    {attackTypeData.length === 0 ? (
                        <div className="flex-1 flex items-center justify-center text-slate-500 italic">
                            No attack types accurately tracked yet.
                        </div>
                    ) : (
                        <div className="flex-1 w-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={attackTypeData}
                                    layout="vertical"
                                    margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" horizontal={false} />
                                    <XAxis type="number" hide />
                                    <YAxis
                                        dataKey="name"
                                        type="category"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }}
                                    />
                                    <Tooltip
                                        cursor={{ fill: '#1e293b' }}
                                        contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', borderRadius: '4px' }}
                                        itemStyle={{ color: '#f87171' }}
                                    />
                                    <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={40}>
                                        {attackTypeData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-slate-800 p-4 rounded-lg border border-slate-700">
                    <h3 className="text-slate-200 font-bold mb-4 flex items-center gap-2">
                        <Activity size={18} /> Live Activity Feed (IP Tracking)
                    </h3>
                    <LogTable logs={logs} emptyMsg="Waiting for traffic..." />
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

    const attackData = Object.entries(stats.attackTypes || {})
        .map(([name, count]) => ({
            name: name.replace(/_/g, ' ').toUpperCase(),
            count
        }))
        .sort((a, b) => b.count - a.count);

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
            <h1 className="text-3xl font-bold mb-6 text-purple-400">
                Shadow Monitor (Deception Environment)
            </h1>

            <div className="grid grid-cols-3 gap-6 mb-8">
                <div 
                    onClick={() => setActiveFilter('all')}
                    className={`p-6 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg ${activeFilter === 'all' ? 'bg-purple-900/40 border-purple-500' : 'bg-slate-900 border-slate-800'}`}
                >
                    <div className="text-slate-400 text-sm font-medium mb-1">Total Request In Shadow Domain </div>
                    <div className="text-4xl font-black text-white">{stats.totalRequests.toLocaleString()}</div>
                    {/* <div className="mt-2 text-[10px] text-purple-400 uppercase tracking-tighter font-bold"></div> */}
                </div>

                <div 
                    onClick={() => setActiveFilter('attacks')}
                    className={`p-6 rounded-xl border-2 transition-all cursor-pointer hover:shadow-lg ${activeFilter === 'attacks' ? 'bg-red-900/40 border-red-500' : 'bg-slate-900 border-slate-800'}`}
                >
                    <div className="text-slate-400 text-sm font-medium mb-1">Detected Attacks</div>
                    <div className="text-4xl font-black text-red-500">{stats.uniqueAttackTypes || 0} Types</div>
                    {/* <div className="mt-2 text-[10px] text-red-400 uppercase tracking-tighter font-bold">SQLi, XSS, etc.</div> */}
                </div>

                <div 
                    className="p-6 rounded-xl border-2 bg-slate-900 border-slate-800"
                >
                    <div className="text-slate-400 text-sm font-medium mb-1">Unique Attackers</div>
                    <div className="text-4xl font-black text-orange-500">{stats.uniqueAttackers || 0}</div>
                    {/* <div className="mt-2 text-[10px] text-orange-400 uppercase tracking-tighter font-bold">Distinct IP Sources</div> */}
                </div>
            </div>

            <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                    <h3 className="font-bold text-slate-200 flex items-center gap-2">
                        {activeFilter === 'all' ? 'Real-time Shadow Interactions' : 'Filtered Shadow Attack Feed'}
                    </h3>
                    <div className="text-xs text-slate-500">{filteredLogs.length} events showing</div>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-950/50 text-slate-500">
                            <tr>
                                <th className="p-4 font-semibold uppercase text-[10px]">Time</th>
                                <th className="p-4 font-semibold uppercase text-[10px]">Source IP</th>
                                <th className="p-4 font-semibold uppercase text-[10px]">Target Path</th>
                                <th className="p-4 font-semibold uppercase text-[10px]">Payload Snippet</th>
                                <th className="p-4 font-semibold uppercase text-[10px]">Agent</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/50">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="p-12 text-center text-slate-600 italic">No shadow activity detected yet.</td>
                                </tr>
                            ) : (
                                filteredLogs.map((log, i) => (
                                    <tr key={i} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="p-4 font-mono text-slate-400 text-[11px] whitespace-nowrap">{new Date(log.timestamp).toLocaleTimeString()}</td>
                                        <td className="p-4 text-orange-400 font-bold">{log.attacker_ip}</td>
                                        <td className="p-4 text-slate-300 font-mono text-[12px]"><span className="text-slate-500">/{log.shadow_host}</span>{log.path}</td>
                                        <td className="p-4 text-slate-500 italic max-w-xs truncate">{log.payload || "N/A"}</td>
                                        <td className="p-4 text-slate-400 text-[11px] max-w-[150px] truncate">{log.user_agent}</td>
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
        <h1 className="text-3xl font-bold mb-6 text-gray-400">Settings</h1>

        <div className="space-y-6">
            <div className="bg-slate-800 p-4 rounded border border-slate-700">
                <h3 className="font-bold mb-4 text-slate-200">Appearance</h3>
                <div className="flex items-center justify-between">
                    <span className="text-slate-400">Theme</span>
                    <button onClick={toggleTheme} className="flex items-center gap-2 bg-slate-900 border border-slate-600 px-4 py-2 rounded text-slate-200 hover:bg-slate-700 transition-colors">
                        {isDark ? <><Moon size={16} /> Dark Mode</> : <><Sun size={16} /> Light Mode</>}
                    </button>
                </div>
            </div>

            <div className="bg-slate-800 p-4 rounded border border-red-900/30">
                <h3 className="font-bold mb-2 text-red-500">Danger Zone</h3>
                <p className="text-xs text-slate-500 mb-4">Once you clear the dashboard data, there is no going back. Please be certain.</p>
                <div className="flex items-center justify-between">
                    <span className="text-slate-400 text-sm">Clear Statistics & Logs</span>
                    <button
                        onClick={() => {
                            if (window.confirm("Are you sure you want to clear ALL dashboard statistics and logs? This cannot be undone.")) {
                                onReset();
                            }
                        }}
                        className="flex items-center gap-2 bg-red-900/30 border border-red-800 px-4 py-2 rounded text-red-400 hover:bg-red-800 hover:text-white transition-all text-sm font-bold"
                    >
                        <Trash2 size={16} /> Clear Data
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
            <div className={`w-64 border-r flex flex-col ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
                <div className="p-6 flex items-center gap-3">
                    <Shield className="text-emerald-500 w-8 h-8" />
                    <span className={`font-bold text-xl tracking-wider ${isDark ? 'text-white' : 'text-slate-800'}`}>ASDS</span>
                </div>
                <nav className="flex-1 px-4 py-4 space-y-2">
                    <button onClick={() => setActiveTab('dashboard')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${activeTab === 'dashboard' ? (isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900') : 'text-slate-400 hover:bg-slate-800/50'}`}>
                        <Activity size={20} /> Dashboard
                    </button>
                    <button onClick={() => setActiveTab('applications')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${activeTab === 'applications' ? (isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900') : 'text-slate-400 hover:bg-slate-800/50'}`}>
                        <List size={20} /> Applications
                    </button>
                    <button onClick={() => setActiveTab('protection')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${activeTab === 'protection' ? (isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900') : 'text-slate-400 hover:bg-slate-800/50'}`}>
                        <AlertTriangle size={20} /> Protection
                    </button>
                     <button onClick={() => setActiveTab('settings')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-colors ${activeTab === 'settings' ? (isDark ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-900') : 'text-slate-400 hover:bg-slate-800/50'}`}>
                         <Settings size={20} /> Settings
                     </button>
                     <div className="pt-4 mt-4 border-t border-slate-800">
                        <button onClick={() => setActiveTab('shadow')} className={`flex items-center gap-3 w-full px-4 py-3 rounded-lg transition-all border-2 ${activeTab === 'shadow' ? 'bg-purple-900/20 border-purple-500 text-purple-400' : 'bg-transparent border-transparent text-slate-500 hover:bg-slate-800/50'}`}>
                            <Shield size={20} className={activeTab === 'shadow' ? 'text-purple-400' : 'text-slate-500'} /> Shadow Monitor
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
