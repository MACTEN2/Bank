import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { register } from '../api/authService';

const Register = () => {
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(formData.name, formData.email, formData.password);
      setMessage('Registration successful! Redirecting to login...');
      setTimeout(() => navigate('/login'), 2000);
    } catch (err) {
      setMessage(err.response?.data?.detail || 'Registration failed');
    }
  };

  return (
    <div className="container">
      <h2>Create Bank User</h2>
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Full Name</label>
          <input type="text" required onChange={(e) => setFormData({...formData, name: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Email</label>
          <input type="email" required onChange={(e) => setFormData({...formData, email: e.target.value})} />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input type="password" required onChange={(e) => setFormData({...formData, password: e.target.value})} />
        </div>
        <button type="submit">Register</button>
      </form>
      {message && <p className={`status-message ${message.includes('successful') ? 'success' : 'error'}`}>{message}</p>}
      <p style={{textAlign: 'center', marginTop: '15px'}}>
        Already have a user? <Link to="/login">Login here</Link>
      </p>
    </div>
  );
};

export default Register;