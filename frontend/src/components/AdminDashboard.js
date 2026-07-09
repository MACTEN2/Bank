import React, { useState, useEffect } from 'react';
import { 
  Container, Typography, Paper, Table, TableBody, TableCell, TableHead, 
  TableRow, Button, Box, CircularProgress, Alert, Tabs, Tab, TextField, Grid, Card, CardContent 
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/Lock';
import PeopleIcon from '@mui/icons-material/People';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const token = localStorage.getItem('token');
      try {
        const [uRes, aRes] = await Promise.all([
          fetch('http://localhost:8000/api/admin/users/all', { headers: { 'Authorization': `Bearer ${token}` } }),
          fetch('http://localhost:8000/api/admin/accounts/all', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);
        
        if (!uRes.ok || !aRes.ok) throw new Error("Unauthorized Access");

        setUsers(await uRes.json());
        setAccounts(await aRes.json());
      } catch (err) { 
        setError("Failed to sync with Vanguard Mainframe. Please re-login.");
      } finally { 
        setLoading(false); 
      }
    };
    fetchData();
  }, []);

  // Safe Data Mapping: Links account user_id to the User email
  const getUserEmail = (userId) => {
    if (!userId) return "N/A";
    const user = users.find(u => u._id === userId);
    return user ? user.email : "Unknown Owner";
  };

  // Search Logic
  const filteredUsers = users.filter(u => u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredAccounts = accounts.filter(acc => getUserEmail(acc.user_id).toLowerCase().includes(searchTerm.toLowerCase()));

  // Vanguard Stats Logic
  const totalLiquidity = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/";
  };

  if (loading) return <Box sx={{ textAlign: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <Container maxWidth="lg" sx={{ mt: 5, mb: 5 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#1a4388' }}>Vanguard Command Center</Typography>
        <Button variant="contained" color="error" onClick={handleLogout}>Secure Logout</Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* 1. Statistics Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderLeft: '5px solid #1a4388' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PeopleIcon color="primary" />
                <Typography color="textSecondary">Active Customers</Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1 }}>{users.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderLeft: '5px solid #4caf50' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccountBalanceWalletIcon sx={{ color: '#4caf50' }} />
                <Typography color="textSecondary">Total Accounts</Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1 }}>{accounts.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card elevation={3} sx={{ borderLeft: '5px solid #ff9800' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <TrendingUpIcon sx={{ color: '#ff9800' }} />
                <Typography color="textSecondary">System Liquidity</Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1 }}>${totalLiquidity.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 2. Search & Tab Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Customer Directory" />
          <Tab label="Global Ledger" />
        </Tabs>
        <TextField 
          size="small" 
          placeholder={tabValue === 0 ? "Search by email..." : "Search by owner email..."} 
          InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'gray' }} /> }}
          onChange={(e) => setSearchTerm(e.target.value)}
          sx={{ ml: 'auto', width: '350px', bgcolor: 'white' }}
        />
      </Box>

      {/* 3. Main Audit Table */}
      <Paper elevation={4} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
        <Table>
          <TableHead sx={{ bgcolor: '#1a4388' }}>
            <TableRow>
              {tabValue === 0 ? (
                <>
                  <TableCell sx={{ color: 'white' }}><strong>User ID</strong></TableCell>
                  <TableCell sx={{ color: 'white' }}><strong>Email Address</strong></TableCell>
                  <TableCell sx={{ color: 'white' }}><strong>System Role</strong></TableCell>
                </>
              ) : (
                <>
                  <TableCell sx={{ color: 'white' }}><strong>Account Owner</strong></TableCell>
                  <TableCell sx={{ color: 'white' }}><strong>Account ID</strong></TableCell>
                  <TableCell sx={{ color: 'white' }}><strong>Balance</strong></TableCell>
                  <TableCell sx={{ color: 'white' }}><strong>Type</strong></TableCell>
                </>
              )}
              <TableCell sx={{ color: 'white', textAlign: 'center' }}><strong>Actions</strong></TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {(tabValue === 0 ? filteredUsers : filteredAccounts).map((item) => (
              <TableRow key={item._id} hover>
                {tabValue === 0 ? (
                  <>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'gray' }}>{item._id}</TableCell>
                    <TableCell sx={{ fontWeight: '500' }}>{item.email}</TableCell>
                    {/* FIXED: Added guard for toUpperCase() */}
                    <TableCell>{item.role ? item.role.toUpperCase() : "USER"}</TableCell>
                  </>
                ) : (
                  <>
                    <TableCell sx={{ fontWeight: 'bold', color: '#1a4388' }}>{getUserEmail(item.user_id)}</TableCell>
                    <TableCell sx={{ fontSize: '0.8rem', color: 'gray' }}>{item._id}</TableCell>
                    <TableCell sx={{ fontWeight: 'bold', color: item.balance < 0 ? '#d32f2f' : '#2e7d32' }}>
                      ${(item.balance || 0).toLocaleString()}
                    </TableCell>
                    <TableCell>{item.account_type || "Checking"}</TableCell>
                  </>
                )}
                <TableCell sx={{ textAlign: 'center' }}>
                  <Button startIcon={<LockIcon />} size="small" variant="outlined" color="error">
                    Freeze
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Container>
  );
};

export default AdminDashboard;