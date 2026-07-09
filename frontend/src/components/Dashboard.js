import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom'; // Import navigate
import { getAccountDetails, depositMoney, withdrawMoney, getTransactionHistory } from '../api/bankService';
import api from '../api/axiosConfig';

const Dashboard = () => { // Removed prop to use localStorage directly
  const [account, setAccount] = useState(null);
  const [transactions, setTransactions] = useState([]);
  const [amount, setAmount] = useState(0);
  const [message, setMessage] = useState('');
  const [allAccounts, setAllAccounts] = useState([]);

  const navigate = useNavigate();
  const storedAccountId = localStorage.getItem('accountId'); 

  const handleLogout = () => {
    localStorage.clear(); // Wipes token and accountId
    navigate('/login');    // Redirects to login
  };

 const loadData = useCallback(async () => {
    if (!storedAccountId) return;
    try {
      const accRes = await getAccountDetails(storedAccountId);
      const txRes = await getTransactionHistory(storedAccountId);
      setAccount(accRes.data);
      setTransactions(txRes.data);
    } catch (err) {
      setMessage("Failed to load banking data.");
    }
  }, [storedAccountId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleDeposit = async () => {
    if (amount <= 0) return setMessage("Enter a positive amount");
    try {
      await depositMoney(storedAccountId, amount);
      setMessage("success: Deposit successful!");
      setAmount(0);
      loadData();
    } catch (err) {
      setMessage("Error processing deposit.");
    }
  };

  // 4. Added Withdraw Logic (Requirement 6.1)
  const handleWithdraw = async () => {
    if (amount <= 0) return setMessage("Enter a positive amount");
    if (amount > account?.balance) return setMessage("Insufficient funds");
    
    try {
      await withdrawMoney(storedAccountId, amount);
      setMessage("success: Withdrawal successful!");
      setAmount(0);
      loadData();
    } catch (err) {
      setMessage("Error processing withdrawal.");
    }
  };

  return (
    <div className="container" style={{ maxWidth: '800px', margin: '40px auto', padding: '20px', fontFamily: 'Arial, sans-serif' }}>
  
        {/* Header Row with Spaced Out Logout */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
            <h2 style={{ margin: 0 }}>Bank Account: {account?.account_type || "Loading..."}</h2>
            <button 
            onClick={handleLogout} 
            style={{ 
                backgroundColor: '#555', 
                color: 'white', 
                padding: '8px 20px', 
                border: 'none', 
                borderRadius: '4px', 
                cursor: 'pointer',
                fontWeight: 'bold' 
            }}
            >
            Logout
            </button>
        </div>

        {/* Balance Card Section */}
        <div className="balance-card" style={{ backgroundColor: '#003a80', color: 'white', padding: '30px', borderRadius: '12px', textAlign: 'center', marginBottom: '40px', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
            <p style={{ margin: '0 0 10px 0', opacity: 0.9, fontSize: '1.1rem' }}>Current Balance</p>
            <div className="balance-amount" style={{ fontSize: '2.5rem', fontWeight: 'bold' }}>
            ${account?.balance !== undefined ? account.balance.toFixed(2) : "0.00"}
            </div>
        </div>

        {/* Transaction Input Section */}
        <div style={{ backgroundColor: '#f9f9f9', padding: '20px', borderRadius: '8px', marginBottom: '30px' }}>
            <div className="form-group" style={{ marginBottom: '20px' }}>
            <label style={{ fontWeight: 'bold', display: 'block', marginBottom: '8px' }}>Amount to Process</label>
            <input 
                type="number" 
                value={amount} 
                onChange={(e) => setAmount(parseFloat(e.target.value))} 
                placeholder="0.00"
                style={{ display: 'block', width: '100%', padding: '12px', boxSizing: 'border-box', border: '1px solid #ccc', borderRadius: '4px', fontSize: '1rem' }}
            />
            </div>

            <div style={{ display: 'flex', gap: '15px' }}>
            <button onClick={handleDeposit} style={{ flex: 1, backgroundColor: '#003a80', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Deposit Funds
            </button>
            <button onClick={handleWithdraw} style={{ flex: 1, backgroundColor: '#d9534f', color: 'white', padding: '12px', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>
                Withdraw Funds
            </button>
            </div>
        </div>

        {/* Status Messages */}
        {message && (
            <div style={{ 
            marginBottom: '30px', 
            padding: '15px', 
            borderRadius: '4px',
            textAlign: 'center',
            fontWeight: '500',
            backgroundColor: message.includes('success') ? '#d4edda' : '#f8d7da',
            color: message.includes('success') ? '#155724' : '#721c24',
            border: `1px solid ${message.includes('success') ? '#c3e6cb' : '#f5c6cb'}`
            }}>
            {message.replace('success: ', '')}
            </div>
        )}

        {/* Transaction History Section */}
        <div style={{ marginTop: '40px' }}>
            <h3 style={{ borderBottom: '2px solid #eee', paddingBottom: '10px', marginBottom: '20px' }}>Transaction History</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
                <tr style={{ backgroundColor: '#f4f4f4' }}>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Date</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Type</th>
                <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #ddd' }}>Amount</th>
                </tr>
            </thead>
            <tbody>
                {transactions.length > 0 ? (
                transactions.map((tx) => (
                    <tr key={tx._id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ padding: '12px' }}>{new Date(tx.created_at).toLocaleDateString()}</td>
                    <td style={{ padding: '12px', fontWeight: 'bold', color: tx.txn_type === 'deposit' ? '#28a745' : '#dc3545' }}>
                        {tx.txn_type.toUpperCase()}
                    </td>
                    <td style={{ padding: '12px', fontWeight: '500' }}>${tx.amount.toFixed(2)}</td>
                    </tr>
                ))
                ) : (
                <tr>
                    <td colSpan="3" style={{ padding: '20px', textAlign: 'center', color: '#888' }}>No transactions found.</td>
                </tr>
                )}
            </tbody>
        </table>
     </div>
    </div>
  );
};

export default Dashboard;