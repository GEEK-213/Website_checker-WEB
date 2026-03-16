import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext'; 
import { 
    LayoutDashboard, Globe, Download, Upload, Play, Trash2, 
    ArrowUpRight, AlertCircle, CheckCircle2, Clock, 
    Activity, Server, Search, LogOut, ExternalLink
} from 'lucide-react';
import './DashboardPage.css'; 

const API_BASE_URL = "/api/urls"; 

/**
 * Enterprise Status Component
 * Maps technical status to LED dots and professional labels
 */
const StatusIndicator = ({ status }) => {
    const config = {
        good:           { label: 'Optimal',    dot: 'good' },
        many_redirects: { label: 'Redirects',  dot: 'warning' },
        ssl_error:      { label: 'SSL Failure', dot: 'error' },
        db_error:       { label: 'DB Outage',   dot: 'error' },
        http_error:     { label: 'HTTP Issue',  dot: 'error' },
        timeout_error:  { label: 'Timeout',    dot: 'warning' },
        dns_error:      { label: 'Unreachable', dot: 'error' },
        adult_content:  { label: 'Insecure',   dot: 'warning' },
        error:          { label: 'Critical',   dot: 'error' }
    };

    const s = config[status] || { label: 'Unknown', dot: 'neutral' };
    
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={`led-dot ${s.dot}`}></span>
            <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{s.label}</span>
        </div>
    );
};

const DashboardPage = () => {
    const { session, signOut, user } = useAuth(); 
    const [websites, setWebsites] = useState([]);
    const [newWebsite, setNewWebsite] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState({ global: false, solo: {} });
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState(null);
    const [selectedItem, setSelectedItem] = useState(null);
    const [activeTab, setActiveTab] = useState('overview');
    const fileInputRef = useRef(null);

    const authHeaders = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token}`
    };

    const fetchData = async () => {
        if (!session) return; 
        try {
            const [urlsRes, resultsRes] = await Promise.all([
                fetch(`${API_BASE_URL}/all`, { headers: { 'Authorization': `Bearer ${session.access_token}` } }),
                fetch(`${API_BASE_URL}/results`, { headers: { 'Authorization': `Bearer ${session.access_token}` } })
            ]);
            const [urlsData, resultsData] = await Promise.all([urlsRes.json(), resultsRes.json()]);
            setWebsites(urlsData);
            setResults(resultsData);
            setError(null);
        } catch (err) {
            console.error("Fetch Data Error:", err);
            setError("Failed to fetch operational data. Check network status.");
        }
    };

    useEffect(() => {
        fetchData();
    }, [session]);

    const handleAddWebsite = async (e) => {
        e.preventDefault();
        if (newWebsite && !websites.some(site => site.url === newWebsite)) {
            const updated = [...websites, { url: newWebsite }];
            await fetch(`${API_BASE_URL}/save`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ urls: updated }),
            });
            setNewWebsite('');
            fetchData();
        }
    };

    const handleRemoveWebsite = async (id) => {
        const updated = websites.filter(s => s.id !== id);
        await fetch(`${API_BASE_URL}/save`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ urls: updated }),
        });
        fetchData();
    };

    const handleRunAllChecks = async () => {
        setLoading(prev => ({ ...prev, global: true }));
        try {
            const res = await fetch(`${API_BASE_URL}/check-all`, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            if (!res.ok) {
                const errData = await res.json();
                throw new Error(errData.error || "Global scan failed.");
            }
            await fetchData();
            setError(null);
        } catch (err) {
            console.error("Global Scan Error:", err);
            setError(err.message);
        } finally {
            setLoading(prev => ({ ...prev, global: false }));
        }
    };

    const handleRunSoloCheck = async (url, url_id) => {
        setLoading(prev => ({ ...prev, solo: { ...prev.solo, [url_id]: true } }));
        setError(null);
        try {
            const res = await fetch(`${API_BASE_URL}/check-solo`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ url, url_id }),
            });
            if (!res.ok) throw new Error("Solo diagnostic failed.");
            await fetchData();
        } catch (err) {
            console.error("Solo Check Error:", err);
            setError(err.message);
        } finally {
            setLoading(prev => ({ ...prev, solo: { ...prev.solo, [url_id]: false } }));
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (file) {
            const formData = new FormData();
            formData.append("file", file);
            await fetch(`${API_BASE_URL}/import`, { 
                method: "POST", 
                headers: { 'Authorization': `Bearer ${session.access_token}` }, 
                body: formData 
            });
            fetchData();
        }
    };

    const filteredResults = results.filter(r => 
        r.url.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const outageCount = results.filter(r => r.status !== 'good').length;
    const avgLatency = results.length > 0 
        ? Math.round(results.reduce((acc, curr) => acc + (curr.load_time || 0), 0) / results.length) 
        : 0;

    const handleExport = () => {
        const exportWithAuth = async () => {
            const res = await fetch(`${API_BASE_URL}/export`, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "monitor_report.csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
        exportWithAuth();
    };

    return (
        <div className="dashboard-container">
            {/* --- Enterprise Sidebar --- */}
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <Server size={24} className="text-good" />
                    <h1>Website Checker</h1>
                </div>

                <nav className="nav-group">
                    <a href="#" className="nav-item active">
                        <LayoutDashboard size={18} />
                        Monitor Dashboard
                    </a>
                </nav>

                <div className="sidebar-footer">
                    <div className="user-info">
                        <span className="user-email">{user?.email}</span>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, marginTop: '4px' }}>
                            Enterprise Tier
                        </div>
                    </div>
                    <button onClick={signOut} className="nav-item" style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer' }}>
                        <LogOut size={18} />
                        System Logout
                    </button>
                </div>
            </aside>

            {/* --- Main Operational Area --- */}
            <main className="main-wrapper">
                {error && (
                    <div style={{ padding: '15px', background: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', borderRadius: '4px', margin: '0 40px 20px 40px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertCircle size={20} />
                        <div><strong>Operational Failure:</strong> {error}</div>
                        <button onClick={() => setError(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#991b1b' }}>×</button>
                    </div>
                )}
                <header className="content-header">
                    <h2>Operational Intelligence</h2>
                    <div className="header-actions" style={{ display: 'flex', gap: '10px' }}>
                        <button className="btn-secondary" onClick={handleExport}>
                            <Download size={16} /> Export CSV
                        </button>
                        <button className="btn-secondary" onClick={() => fileInputRef.current.click()}>
                            <Upload size={16} /> Import
                        </button>
                        <input type="file" ref={fileInputRef} hidden accept=".csv" onChange={handleFileUpload} />
                        <button className="btn-primary" onClick={handleRunAllChecks} disabled={loading.global}>
                            {loading.global ? <div className="spinner-small" style={{ borderColor: 'white' }}></div> : <Activity size={16} />}
                            Initiate Global Scan
                        </button>
                    </div>
                </header>

                {/* --- Precision Metrics --- */}
                <div className="status-pills">
                    <div className="status-pill">
                        <span className="label">Managed Properties</span>
                        <span className="value">{websites.length}</span>
                    </div>
                    <div className="status-pill">
                        <span className="label">Network Outages</span>
                        <span className={`value ${outageCount > 0 ? 'text-error' : 'text-good'}`}>{outageCount}</span>
                    </div>
                    <div className="status-pill">
                        <span className="label">Avg Latency (ms)</span>
                        <span className="value">{avgLatency}ms</span>
                    </div>
                    <div className="status-pill">
                        <span className="label">Global Status</span>
                        <span className={`value ${outageCount === 0 ? 'text-good' : 'text-error'}`}>
                            {outageCount === 0 ? 'Optimal' : 'Investigating'}
                        </span>
                    </div>
                </div>

                {/* --- Monitor Control Panel --- */}
                <div className="url-management">
                    <form onSubmit={handleAddWebsite} className="url-input-container">
                        <Search className="input-icon" size={18} />
                        <input 
                            type="text" 
                            placeholder="Add domain for monitoring (https://...)" 
                            value={newWebsite}
                            onChange={e => setNewWebsite(e.target.value)}
                        />
                    </form>
                </div>

                <div className="search-container">
                    <div className="url-input-container" style={{ maxWidth: '400px' }}>
                        <Search className="input-icon" size={16} />
                        <input 
                            type="text" 
                            placeholder="Filter monitored properties..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            style={{ padding: '0.5rem 1rem 0.5rem 2.5rem' }}
                        />
                    </div>
                </div>

                {/* --- High-Density Monitoring Table --- */}
                <div className="data-table-container">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>Status</th>
                                <th>Property Destination</th>
                                <th>Latency</th>
                                <th>Last Check</th>
                                <th style={{ textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {results.length === 0 && (
                                <tr>
                                    <td colSpan="5" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                                        No active monitor data. Click 'Initiate Global Scan' to begin.
                                    </td>
                                </tr>
                            )}
                            {filteredResults.map(result => (
                                <tr key={result.id}>
                                    <td>
                                        <StatusIndicator status={result.status} />
                                    </td>
                                    <td>
                                        <div className="property-cell">
                                            <img 
                                                src={result.screenshot} 
                                                className="site-thumb" 
                                                alt="" 
                                                onError={e => e.target.src = "https://placehold.co/100x100/e2e8f0/64748b?text=N/A"}
                                            />
                                            <span style={{ fontWeight: 600 }}>{result.url}</span>
                                            <a href={result.url} target="_blank" rel="noreferrer" className="action-icon-btn">
                                                <ExternalLink size={14} />
                                            </a>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ color: (result.load_time > 2000) ? 'var(--status-warning)' : 'inherit' }}>
                                            {result.load_time ? `${result.load_time}ms` : '---'}
                                        </span>
                                    </td>
                                    <td>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                                            {new Date(result.created_at).toLocaleString()}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button 
                                            className="action-icon-btn" 
                                            title="View Analysis"
                                            onClick={() => setSelectedItem(result)}
                                            style={{ color: 'var(--brand-primary)', marginRight: '8px' }}
                                        >
                                            <ArrowUpRight size={16} />
                                        </button>
                                        <button 
                                            className="action-icon-btn" 
                                            title="Run Diagnostics"
                                            onClick={() => handleRunSoloCheck(result.url, result.url_id)}
                                            disabled={loading.solo[result.url_id]}
                                        >
                                            {loading.solo[result.url_id] ? <div className="spinner-small"></div> : <Play size={16} />}
                                        </button>
                                        <button 
                                            className="action-icon-btn danger" 
                                            title="Remove Monitor"
                                            onClick={() => handleRemoveWebsite(result.url_id)}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            {/* --- Analysis Detail Modal --- */}
            {selectedItem && (
                <div className="modal-overlay" onClick={() => setSelectedItem(null)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <header className="modal-header">
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <StatusIndicator status={selectedItem.status} />
                                <h3 style={{ margin: 0 }}>System Analysis: {selectedItem.url}</h3>
                            </div>
                            <button className="action-icon-btn" onClick={() => setSelectedItem(null)}>×</button>
                        </header>
                        
                        <div className="modal-body">
                            <div className="modal-tabs">
                                <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
                                <button className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>Security Audit</button>
                                <button className={`tab-btn ${activeTab === 'forensics' ? 'active' : ''}`} onClick={() => setActiveTab('forensics')}>Digital Forensics</button>
                            </div>

                            {loading.solo[selectedItem.url_id] && (
                                <div className="modal-loading-overlay">
                                    <div className="spinner-large"></div>
                                    <p>Conducting Deep Cyber Audit... Please wait.</p>
                                </div>
                            )}

                            {activeTab === 'overview' && (
                                <div className="diagnostic-grid">
                                    <div className="diagnostic-card">
                                        <h4>Visual Proof</h4>
                                        <div className="screenshot-container">
                                            <img 
                                                src={selectedItem.screenshot} 
                                                alt="Site Analysis" 
                                                onError={e => e.target.src = "https://placehold.co/600x400/e2e8f0/64748b?text=Visual+Capture+Unavailable"}
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="diagnostic-card">
                                        <h4>Technical Metadata</h4>
                                        <div className="metadata-list">
                                            <div className="metadata-item">
                                                <span>Response Time</span>
                                                <strong>{selectedItem.load_time ? `${selectedItem.load_time}ms` : 'N/A'}</strong>
                                            </div>
                                            <div className="metadata-item">
                                                <span>Last Verification</span>
                                                <strong>{new Date(selectedItem.created_at).toLocaleString()}</strong>
                                            </div>
                                            <div className="metadata-item">
                                                <span>Security Protocol</span>
                                                <strong>{selectedItem.url.startsWith('https') ? 'HTTPS (Secure)' : 'HTTP (Unsecured)'}</strong>
                                            </div>
                                        </div>

                                        <h4 style={{ marginTop: '20px' }}>Diagnostic Logs</h4>
                                        <pre className="error-log">
                                            {selectedItem.error_log || "No technical errors detected. System operating within optimal parameters."}
                                        </pre>
                                    </div>
                                </div>
                            )}

                            {activeTab === 'security' && (
                                <div className="diagnostic-grid">
                                    <div className="diagnostic-card">
                                        <div className="security-badge grade-a" style={{ 
                                            backgroundColor: selectedItem.security_details?.audit?.grade?.startsWith('A') ? '#dcfce7' : 
                                                            selectedItem.security_details?.audit?.grade === 'B' ? '#dbeafe' : '#fee2e2'
                                        }}>
                                            {selectedItem.security_details?.audit?.grade || 'N/A'}
                                        </div>
                                        <h4>Risk Assessment</h4>
                                        <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                                            The system detected a security score of <strong>{selectedItem.security_details?.audit?.score || 0}/100</strong>.
                                            This is based on SSL validity and presence of modern security headers.
                                        </p>
                                        
                                        <h4 style={{ marginTop: '20px' }}>Header Audit</h4>
                                        <div className="metadata-list">
                                            {['strict-transport-security', 'content-security-policy', 'x-frame-options', 'x-content-type-options'].map(h => (
                                                <div className="metadata-item" key={h}>
                                                    <span>{h.toUpperCase()}</span>
                                                    <span className={`header-status-badge ${selectedItem.security_details?.audit?.foundHeaders?.includes(h) ? 'badge-found' : 'badge-missing'}`}>
                                                        {selectedItem.security_details?.audit?.foundHeaders?.includes(h) ? 'ENFORCED' : 'MISSING'}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="diagnostic-card">
                                        <h4>SSL Intelligence</h4>
                                        {selectedItem.security_details?.ssl ? (
                                            <div className="metadata-list">
                                                <div className="metadata-item">
                                                    <span>Issuer</span>
                                                    <strong>{selectedItem.security_details.ssl.issuer}</strong>
                                                </div>
                                                <div className="metadata-item">
                                                    <span>Valid Until</span>
                                                    <strong>{new Date(selectedItem.security_details.ssl.validTo * 1000).toLocaleDateString()}</strong>
                                                </div>
                                                <div className="metadata-item">
                                                    <span>Protocol</span>
                                                    <strong>{selectedItem.security_details.ssl.protocol}</strong>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="error-log">No SSL details available. The connection might be unencrypted.</div>
                                        )}
                                    </div>
                                </div>
                            )}

                            {activeTab === 'forensics' && (
                                <div className="diagnostic-grid">
                                    <div className="diagnostic-card">
                                        <h4>Network Infrastructure</h4>
                                        <div className="metadata-list">
                                            <div className="metadata-item">
                                                <span>Edge Server</span>
                                                <strong>{selectedItem.security_details?.server || 'Common Edge'}</strong>
                                            </div>
                                            <div className="metadata-item">
                                                <span>Resolved IPs (A Records)</span>
                                                <div className="forensics-list">
                                                    {(selectedItem.security_details?.dns?.a || []).map(ip => (
                                                        <span key={ip} className="forensics-tag">{ip}</span>
                                                    )) || 'None'}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="diagnostic-card">
                                        <h4>Domain Intelligence</h4>
                                        <div className="metadata-item">
                                            <span>Mail Exchanges (MX)</span>
                                            <div className="forensics-list">
                                                {(selectedItem.security_details?.dns?.mx || []).map(m => (
                                                    <span key={m.exchange} className="forensics-tag">{m.exchange} ({m.priority})</span>
                                                )) || 'None'}
                                            </div>
                                        </div>
                                        <div className="metadata-item" style={{ marginTop: '15px' }}>
                                            <span>TXT / Verification Records</span>
                                            <div className="forensics-list">
                                                {(selectedItem.security_details?.dns?.txt || []).map(t => (
                                                    <div key={t.join(' ')} className="forensics-tag" style={{ display: 'block' }}>{t.join(' ').substring(0, 50)}...</div>
                                                )) || 'None'}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <footer className="modal-footer">
                            <button className="btn-secondary" onClick={() => setSelectedItem(null)}>Close Analysis</button>
                            <button 
                                className="btn-primary" 
                                disabled={loading.solo[selectedItem.url_id]}
                                onClick={async () => {
                                    await handleRunSoloCheck(selectedItem.url, selectedItem.url_id);
                                    // Refresh the selected item from the new results
                                    const updatedResults = await (await fetch(`${API_BASE_URL}/results`, { headers: { 'Authorization': `Bearer ${session.access_token}` } })).json();
                                    const freshItem = updatedResults.find(r => r.url_id === selectedItem.url_id);
                                    if (freshItem) setSelectedItem(freshItem);
                                }}
                            >
                                {loading.solo[selectedItem.url_id] ? "Scanning..." : <><Play size={14} /> Re-verify Now</>}
                            </button>
                        </footer>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DashboardPage;