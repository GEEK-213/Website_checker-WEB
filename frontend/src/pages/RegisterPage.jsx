import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { ShieldPlus, Mail, Lock, Server, CheckCircle2 } from 'lucide-react';
import './RegisterPage.css';

function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage('');
 
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Registration successful! Access request sent to ' + email + '. Please verify your identity.');
    }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
           <div className="auth-logo">
             <Server size={32} className="text-good" />
           </div>
           <h1>Identity Provisioning</h1>
           <p className="auth-subtitle">Establish new monitor credentials</p>
        </div>

        {!message ? (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Work Email</label>
              <div className="input-icon-wrapper">
                 <Mail size={18} className="input-icon" />
                 <input 
                  id="email" 
                  name="email"
                  type="email" 
                  placeholder="admin@enterprise.com" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  required 
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="password">Secure Passphrase</label>
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
              {loading ? 'Registering Identity...' : 'Generate Credentials'}
            </button>
          </form>
        ) : (
          <div className="auth-success">
             <CheckCircle2 size={32} className="text-good" />
             <p>{message}</p>
             <Link to="/login" className="btn-primary" style={{ marginTop: '1rem', textDecoration: 'none' }}>Back to Terminal</Link>
          </div>
        )}

        {error && (
          <div className="auth-error">
             <ShieldPlus size={16} />
             <span>{error}</span>
          </div>
        )}

        <div className="auth-footer">
           <p>
            Standard enterprise protocols apply. <br/>
            Already identified? <Link to="/login">Access Terminal</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default RegisterPage;