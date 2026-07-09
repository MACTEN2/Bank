import React, { useState } from 'react';
import api from '../api/axiosConfig';

const AccountCreate = ({ onAccountCreated }) => {
  const [type, setType] = useState('Checking');

  const handleCreate = async () => {
    try {
      const res = await api.post('/accounts/', { account_type: type });
      onAccountCreated(res.data.id); // Pass the new ID up to the parent
    } catch (err) {
      alert("Error creating account");
    }
  };

  return (
    <div className="container" style={{marginTop: '20px'}}>
      <h3>Open a New Account</h3>
      <div className="form-group">
        <label>Account Type</label>
        <select value={type} onChange={(e) => setType(e.target.value)} style={{width: '100%', padding: '10px'}}>
          <option value="Checking">Checking</option>
          <option value="Savings">Savings</option>
        </select>
      </div>
      <button onClick={handleCreate}>Create Account</button>
    </div>
  );
};

export default AccountCreate;