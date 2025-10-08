import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext'; 
import { Folder, Globe, Upload, Download, Play, Trash2, Zap, AlertTriangle, CheckCircle, Clock, Database, GitBranch, Ban } from 'lucide-react';
import './DashboardPage.css'; 


const API_BASE_URL = "/api/urls"; 


const getStatusBadge = (status) => {
    switch (status) {
        case 'good':           return { text: 'Good',          Icon: CheckCircle,   className: 'status-good' };
        case 'many_redirects': return { text: 'Redirects',     Icon: GitBranch,     className: 'status-redirects' };
        case 'ssl_error':      return { text: 'SSL Error',     Icon: AlertTriangle, className: 'status-error' };
        case 'db_error':       return { text: 'DB Error',      Icon: Database,      className: 'status-error' };
        case 'http_error':     return { text: 'HTTP Error',    Icon: AlertTriangle, className: 'status-warning' };
        case 'timeout_error':  return { text: 'Timeout',       Icon: Clock,         className: 'status-neutral' };
        case 'dns_error':      return { text: 'Site Down',     Icon: AlertTriangle, className: 'status-error' };
        case 'adult_content':  return { text: 'Adult Content', Icon: Ban,           className: 'status-adult' };
        default:               return { text: 'Unknown',       Icon: AlertTriangle, className: 'status-neutral' };
    }
};

const DashboardPage = () => {
   
    const { session, signOut, user } = useAuth(); 

    const [websites, setWebsites] = useState([]);
    const [newWebsite, setNewWebsite] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState({ global: false, solo: {} });
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
            const urlsData = await urlsRes.json();
            const resultsData = await resultsRes.json();
            setWebsites(urlsData);
            setResults(resultsData);
        } catch (error) {
            console.error("Error fetching initial data:", error);
        }
    };

  
    useEffect(() => {
        fetchData();
    }, [session]);

    const handleAddWebsite = async (e) => {
        e.preventDefault();
        if (newWebsite && !websites.some(site => site.url === newWebsite)) {
            const newWebsites = [...websites, { url: newWebsite }];
            await fetch(`${API_BASE_URL}/save`, {
                method: 'POST',
                headers: authHeaders,
                body: JSON.stringify({ urls: newWebsites }),
            });
            setNewWebsite('');
            fetchData();
        }
    };
    
    const handleRemoveWebsite = async (idToRemove) => {
        const updatedWebsites = websites.filter((site) => site.id !== idToRemove);
        await fetch(`${API_BASE_URL}/save`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ urls: updatedWebsites }),
        });
        fetchData();
    };

    const handleRunAllChecks = async () => {
        setLoading(prev => ({ ...prev, global: true }));
        await fetch(`${API_BASE_URL}/check-all`, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
        fetchData();
        setLoading(prev => ({ ...prev, global: false }));
    };

    const handleRunSoloCheck = async (url, url_id) => {
        setLoading(prev => ({ ...prev, solo: { ...prev.solo, [url_id]: true } }));
        await fetch(`${API_BASE_URL}/check-solo`, {
            method: 'POST',
            headers: authHeaders,
            body: JSON.stringify({ url, url_id }),
        });
        fetchData();
        setLoading(prev => ({ ...prev, solo: { ...prev.solo, [url_id]: false } }));
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

    const handleExport = () => {
    
        const exportWithAuth = async () => {
            const res = await fetch(`${API_BASE_URL}/export`, { headers: { 'Authorization': `Bearer ${session.access_token}` } });
            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "urls.csv";
            document.body.appendChild(a);
            a.click();
            a.remove();
        }
        exportWithAuth();
    };
    
    const sitesChecked = results.length;
    const problemsDetected = results.filter(r => r.status !== 'good').length;

    return (
        <div className="dashboard">
            <aside className="sidebar">
                <h1 className="sidebar-header">
                    <Zap size={24} />
                    <span>Website Checker</span>
                </h1>
                <nav>
                    <a href="#" className="nav-link active">
                        <Folder size={20} />
                        <span>Dashboard</span>
                    </a>
                </nav>
             
                 <div className="sidebar-footer">
                    {user && <p className="user-email">{user.email}</p>}
                    <button onClick={signOut} className="logout-btn">Logout</button>
                </div>
            </aside>

            <main className="main-content">
                <header className="page-header">
                    <h2>Dashboard</h2>
                 
                    <div className="header-actions">
                        <button onClick={handleExport} className="action-btn">
                            <Download size={16} /> Export CSV
                        </button>
                        <button onClick={() => fileInputRef.current.click()} className="action-btn">
                            <Upload size={16} /> Import CSV
                        </button>
                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".csv" onChange={handleFileUpload} />
                        <button onClick={handleRunAllChecks} disabled={loading.global} className="action-btn primary">
                            {loading.global ? 'Scanning...' : 'Run All Checks'}
                        </button>
                    </div>
                </header>

                {/* The rest of your dashboard UI remains the same */}
                 <div className="stats-grid">
                     <div className="card stat-card">
                         <h3>Sites Checked</h3>
                         <p>{sitesChecked}</p>
                     </div>
                     <div className="card stat-card">
                         <h3>Problems Detected</h3>
                         <p className={problemsDetected > 0 ? 'text-danger' : 'text-success'}>{problemsDetected}</p>
                     </div>
                 </div>

                 <div className="content-grid">
                     <div className="card">
                         <h3 className="card-header">
                             <Globe size={20} /> Monitored Websites ({websites.length})
                         </h3>
                         <form onSubmit={handleAddWebsite}>
                             <input type="text" value={newWebsite} onChange={e => setNewWebsite(e.target.value)} placeholder="https://example.com" />
                         </form>
                         <ul className="website-list">
                             {websites.map(site => (
                                 <li key={site.id}>
                                     <span>{site.url}</span>
                                     <div className="website-actions">
                                         <button onClick={() => handleRunSoloCheck(site.url, site.id)} disabled={loading.solo[site.id]}>
                                             {loading.solo[site.id] ? <div className="spinner-small"></div> : <Play size={16} />}
                                         </button>
                                         <button onClick={() => handleRemoveWebsite(site.id)}>
                                             <Trash2 size={16} />
                                         </button>
                                     </div>
                                 </li>
                             ))}
                         </ul>
                     </div>

                     <div className="card results-card">
                         <h3 className="card-header">Results</h3>
                         <div className="results-grid">
                             {results.map(result => {
                                 const { text, Icon, className } = getStatusBadge(result.status);
                                 return (
                                     <div key={result.id} className="result-item">
                                         <img 
                                             src={result.screenshot} 
                                             alt={`Screenshot of ${result.url}`} 
                                             onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/600x400/f3f4f6/9ca3af?text=No+Image"; }} 
                                         />
                                         <div className="result-info">
                                             <p className="result-url">{result.url}</p>
                                             <span className={`status-badge ${className}`}>
                                                 <Icon size={12} /> {text}
                                             </span>
                                             {result.error_log && <p className="error-log">{result.error_log}</p>}
                                         </div>
                                     </div>
                                 );
                             })}
                         </div>
                     </div>
                 </div>
            </main>
        </div>
    );
};

export default DashboardPage;