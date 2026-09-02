import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const Register = () => {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    
    try {
      await axios.post('http://localhost:5000/api/register', {
        name,
        password
      });
      
      navigate('/login');
    } catch (err) {
      setError(err.response?.data?.error || 'An error occurred during registration');
    }
  };

  return (
    <div className="glass-container">
      <h2>Create Account</h2>
      {error && <div className="error-msg">{error}</div>}
      <form onSubmit={handleRegister}>
        <div className="form-group">
          <label>Username</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Choose a username"
            required
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Choose a password"
            required
          />
        </div>
        <button type="submit">Register</button>
      </form>
      <Link to="/login" className="nav-link">
        Already have an account? Sign In
      </Link>
    </div>
  );
};

export default Register;
