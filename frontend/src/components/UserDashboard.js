import React, { useState, useEffect, useCallback } from 'react';
import { 
  Container, Typography, Paper, Table, TableBody, TableCell, TableHead, 
  TableRow, Button, Box, CircularProgress, Grid, Card, CardContent, 
  TextField, InputAdornment, IconButton, Tooltip, Alert, Divider, AppBar, Toolbar,
  Snackbar, Fade
} from '@mui/material';
// Add this line to your terminal: npm install framer-motion
import { motion, AnimatePresence } from 'framer-motion'; 
import RefreshIcon from '@mui/icons-material/Refresh';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import HistoryIcon from '@mui/icons-material/History';

const UserDashboard = () => {
  const [account, setAccount] = useState({ balance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('');
  const [activeAction, setActiveAction] = useState('deposit');
  
  // Notification State
  const [notification, setNotification] = useState({ open: false, msg: '', type: 'success' });

  const handleLogout = () => {
    localStorage.removeItem('token');
    window.location.href = "/";
  };

  const notify = (msg, type = 'success') => {
    setNotification({ open: true, msg, type });
  };

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    const token = localStorage.getItem('token');
    if (!token) { handleLogout(); return; }

    try {
      const [accRes, txRes] = await Promise.all([
        fetch('http://localhost:8000/api/accounts/me', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('http://localhost:8000/api/transactions/me', { headers: { 'Authorization': `Bearer ${token}` } })
      ]);
      
      const accData = await accRes.json();
      const txData = await txRes.json();

      setAccount(accData || { balance: 0 });
      setTransactions(Array.isArray(txData) ? txData : []);
    } catch (err) {
      notify('Mainframe sync failed', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleAction = async () => {
    if (!amount || parseFloat(amount) <= 0) {
        notify('Please enter a valid amount', 'warning');
        return;
    }
    const token = localStorage.getItem('token');
    
    try {
      const res = await fetch(`http://localhost:8000/api/transactions/${activeAction}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({ amount: parseFloat(amount) })
      });

      if (!res.ok) throw new Error("Transaction declined by protocol.");

      notify(`${activeAction.toUpperCase()} successful. Balance updated.`, 'success');
      setAmount('');
      fetchData(); 
    } catch (err) {
      notify(err.message, 'error');
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', mt: 20 }}>
      <CircularProgress thickness={2} size={60} sx={{ color: '#0d2144' }} />
      <Typography sx={{ mt: 2, letterSpacing: 2, fontWeight: 600 }}>INITIALIZING TERMINAL...</Typography>
    </Box>
  );

  return (
    <Box sx={{ bgcolor: '#f0f2f5', minHeight: '100vh' }}>
      <AppBar position="sticky" sx={{ bgcolor: '#0d2144', backgroundImage: 'none' }}>
        <Toolbar>
          <AccountBalanceIcon sx={{ mr: 2 }} />
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 700, letterSpacing: 1 }}>VANGUARD TERMINAL</Typography>
          <Button color="inherit" onClick={handleLogout} startIcon={<LogoutIcon />}>Logout</Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ mt: 6 }}>
        <Grid container spacing={4}>
          
          {/* Animated Balance Card */}
          <Grid item xs={12} md={5}>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <Card elevation={6} sx={{ background: 'linear-gradient(135deg, #1a4388 0%, #061126 100%)', color: 'white', borderRadius: '28px', p: 2 }}>
                <CardContent>
                  <Typography variant="overline" sx={{ opacity: 0.6 }}>Current Liquidity</Typography>
                  <Typography variant="h2" sx={{ fontWeight: 800, my: 1 }}>
                    ${(account?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </Typography>
                  <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', my: 2 }} />
                  <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                    <Box component="span" sx={{ width: 8, height: 8, bgcolor: '#4caf50', borderRadius: '50%', mr: 1 }} />
                    Secure Mainframe Connection Active
                  </Typography>
                </CardContent>
              </Card>
            </motion.div>
          </Grid>

          {/* Action Panel with Smooth Transitions */}
          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={{ p: 4, borderRadius: '28px', border: '1px solid #e0e4e8' }}>
              <Box sx={{ mb: 4, display: 'flex', gap: 2 }}>
                {['deposit', 'withdraw'].map((type) => (
                  <Button 
                    key={type}
                    variant={activeAction === type ? 'contained' : 'outlined'}
                    onClick={() => setActiveAction(type)}
                    sx={{ borderRadius: '12px', px: 4, fontWeight: 700, transition: '0.3s' }}
                  >
                    {type}
                  </Button>
                ))}
              </Box>

              <Box sx={{ display: 'flex', gap: 2 }}>
                <TextField 
                  fullWidth 
                  label="Transaction Amount" 
                  type="number" 
                  value={amount} 
                  onChange={(e)=>setAmount(e.target.value)}
                  InputProps={{ startAdornment: <InputAdornment position="start">$</InputAdornment> }}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
                <Button 
                  variant="contained" 
                  onClick={handleAction}
                  sx={{ minWidth: '140px', borderRadius: '12px', bgcolor: '#0d2144' }}
                >
                  Confirm
                </Button>
              </Box>
            </Paper>
          </Grid>

          {/* History Ledger */}
          <Grid item xs={12}>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <Paper elevation={0} sx={{ borderRadius: '28px', border: '1px solid #e0e4e8', overflow: 'hidden' }}>
                <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#fff' }}>
                  <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                    <HistoryIcon sx={{ mr: 1, color: '#1a4388' }} /> Transaction Ledger
                  </Typography>
                  <IconButton onClick={fetchData}>
                    <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                  </IconButton>
                </Box>
                <Table>
                  <TableHead sx={{ bgcolor: '#fcfdfe' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>PROTOCOL</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>DATE</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700 }}>VALUE (USD)</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    <AnimatePresence>
                      {transactions.map((tx, i) => (
                        <TableRow 
                          component={motion.tr}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          key={tx._id || i} 
                          hover
                        >
                          <TableCell sx={{ fontWeight: 600 }}>{tx.type?.toUpperCase()}</TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>{new Date(tx.timestamp).toLocaleString()}</TableCell>
                          <TableCell align="right" sx={{ fontWeight: 800, color: tx.amount < 0 ? '#d32f2f' : '#2e7d32' }}>
                            {tx.amount < 0 ? '-' : '+'}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </Paper>
            </motion.div>
          </Grid>
        </Grid>
      </Container>

      {/* Modern Notifications */}
      <Snackbar 
        open={notification.open} 
        autoHideDuration={4000} 
        onClose={() => setNotification({ ...notification, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        TransitionComponent={Fade}
      >
        <Alert severity={notification.type} variant="filled" sx={{ width: '100%', borderRadius: '12px', fontWeight: 600 }}>
          {notification.msg}
        </Alert>
      </Snackbar>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </Box>
  );
};

export default UserDashboard;