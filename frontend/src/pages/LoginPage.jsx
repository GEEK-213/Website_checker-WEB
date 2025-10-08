import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom'; // 1. Import useNavigate and Link
import { supabase } from '../supabaseClient';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate(); // 2. Initialize the navigate function

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
      // 3. On success, explicitly navigate to the dashboard
      navigate('/'); 
    }
  };

  return (
    <div>
      <h2>Login</h2>
      <form onSubmit={handleLogin}>
        <input 
          id="email" 
          name="email"
          type="email" 
          placeholder="Your email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          required 
        />
        <input 
          id="password" 
          name="password"
          type="password" 
          placeholder="Your password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          required 
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
      {error && <p style={{ color: 'red' }}>{error}</p>}
       <p>
        Don't have an account? <Link to="/register">Register</Link>
      </p>
    </div>
  );
}
export default LoginPage;