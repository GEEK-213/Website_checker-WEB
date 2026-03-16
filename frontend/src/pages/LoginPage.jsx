import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; 
import { supabase } from '../supabaseClient';
import { ShieldCheck, Mail, Lock, Server } from 'lucide-react';
import './LoginPage.css';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); 

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ 
      email: email, 
      password: password 
    });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
    } else {
      navigate('/'); 
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
           <div className="auth-logo">
             <Server size={32} className="text-good" />
           </div>
           <h1>Infrastructure Login</h1>
           <p className="auth-subtitle">Website Checker Enterprise Terminal</p>
        </div>

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label htmlFor="email">Security Identity</label>
            <div className="input-icon-wrapper">
               <Mail size={18} className="input-icon" />
               <input 
                id="email" 
                name="email"
                type="email" 
                placeholder="registered@enterprise.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Access Key</label>
            <div className="input-icon-wrapper">
               <Lock size={18} className="input-icon" />
               <input 
                id="password" 
                name="password"
                type="password" 
                placeholder="••••••••" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn-primary auth-submit" disabled={loading}>
            {loading ? 'Authenticating...' : 'Enter System'}
          </button>
        </form>

        {error && (
          <div className="auth-error">
             <ShieldCheck size={16} />
             <span>{error}</span>
          </div>
        )}

        <div className="auth-footer">
           <p>
            Unauthorized access is restricted. <br/>
            Need an account? <Link to="/register">Request Access</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
export default LoginPage;