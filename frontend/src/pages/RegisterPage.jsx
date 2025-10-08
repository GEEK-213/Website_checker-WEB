import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';

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

    // Use the Supabase signUp function
    const { error } = await supabase.auth.signUp({
      email: email,
      password: password,
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage('Registration successful! Please check your email to verify your account.');
    }
    setLoading(false);
  };

  return (
    <div>
      <h2>Register a New Account</h2>
      <form onSubmit={handleRegister}>
        <div>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            placeholder="Your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" disabled={loading}>
          {loading ? 'Registering...' : 'Register'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      {message && <p style={{ color: 'green' }}>{message}</p>}

      <p>
        Already have an account? <Link to="/login">Log In</Link>
      </p>
    </div>
  );
}

export default RegisterPage;