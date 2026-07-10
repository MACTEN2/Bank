import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, Button, Box, CircularProgress, Grid, Card, CardContent,
  TextField, InputAdornment, IconButton, Alert, Divider,
  Snackbar, Fade, Chip, Tooltip, Stack
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getMyAccount, getMyTransactions, depositMoney, withdrawMoney, transferMoney } from '../api/bankService';
import { getAxiosErrorMessage } from '../utils/apiError';
import { useThemeMode, headingColor } from '../ThemeModeContext';
import SpendingChart from './SpendingChart';
import QuickStats from './QuickStats';
import DebitCard from './DebitCard';
import SavingsGoals from './SavingsGoals';
import DashboardLayout from './DashboardLayout';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
};

const ACTIONS = ['deposit', 'withdraw', 'transfer'];

const isDebitType = (txnType) => txnType === 'withdrawal' || txnType === 'admin_debit';

const UserDashboard = () => {
  const { mode } = useThemeMode();
  const [account, setAccount] = useState({ balance: 0 });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [amount, setAmount] = useState('');
  const [recipientId, setRecipientId] = useState('');
  const [activeAction, setActiveAction] = useState('deposit');
  const [submitting, setSubmitting] = useState(false);

  // Notification State
  const [notification, setNotification] = useState({ open: false, msg: '', type: 'success' });

  const userName = localStorage.getItem('name') || 'there';
  const firstName = userName.split(' ')[0];
  const isFirstLogin = localStorage.getItem('firstLogin') === 'true';

  useEffect(() => {
    // Only show the first-time welcome once; subsequent visits (or a
    // refresh) fall back to the normal "welcome back" greeting.
    if (isFirstLogin) {
      localStorage.setItem('firstLogin', 'false');
    }
  }, [isFirstLogin]);

  const notify = (msg, type = 'success') => {
    setNotification({ open: true, msg, type });
  };

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [accRes, txRes] = await Promise.all([getMyAccount(), getMyTransactions()]);
      setAccount(accRes.data || { balance: 0 });
      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
    } catch (err) {
      notify('Unable to reach the bank. Please try again shortly.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const copyAccountId = () => {
    if (account?._id) {
      navigator.clipboard.writeText(account._id);
      notify('Account ID copied to clipboard', 'success');
    }
  };

  const handleAction = async () => {
    const numericAmount = parseFloat(amount);
    if (!amount || numericAmount <= 0) {
      notify('Please enter a valid amount', 'warning');
      return;
    }
    if (activeAction === 'transfer' && !recipientId.trim()) {
      notify('Please enter a recipient account ID', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      if (activeAction === 'deposit') {
        await depositMoney(numericAmount);
        notify('Deposit successful. Balance updated.', 'success');
      } else if (activeAction === 'withdraw') {
        await withdrawMoney(numericAmount);
        notify('Withdrawal successful. Balance updated.', 'success');
      } else {
        await transferMoney(recipientId.trim(), numericAmount);
        notify(`Transfer of $${numericAmount.toLocaleString()} sent successfully.`, 'success');
        setRecipientId('');
      }
      setAmount('');
      fetchData();
    } catch (err) {
      notify(getAxiosErrorMessage(err, 'Transaction declined.'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
      <CircularProgress thickness={2} size={60} sx={{ color: headingColor(mode) }} />
      <Typography sx={{ mt: 2, letterSpacing: 2, fontWeight: 600, color: headingColor(mode) }}>PREPARING YOUR ACCOUNT...</Typography>
    </Box>
  );

  return (
    <DashboardLayout>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Personalized Greeting */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Box sx={{ mb: 4 }}>
            {isFirstLogin ? (
              <>
                <Typography variant="h4" sx={{ fontWeight: 800, color: headingColor(mode) }}>
                  Thank you for joining us, {firstName}! 🎉
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5, maxWidth: 640 }}>
                  Welcome to Sterling Bank — we're thrilled to have you with us. Your Checking
                  account is ready to go, so take a look around and let us know if there's
                  anything we can help you with.
                </Typography>
              </>
            ) : (
              <>
                <Typography variant="h4" sx={{ fontWeight: 800, color: headingColor(mode) }}>
                  Welcome back, {firstName}
                </Typography>
                <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
                  {getGreeting()} — here's where things stand with your account today.
                </Typography>
              </>
            )}
          </Box>
        </motion.div>

        <QuickStats transactions={transactions} />

        {/* Two consistent columns: everything "mine" on the left, everything
            "actionable" on the right, so edges line up top to bottom. */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Stack spacing={4}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                <Card elevation={6} sx={{ background: 'linear-gradient(135deg, #1a4388 0%, #061126 100%)', color: 'white', borderRadius: '28px', p: 2 }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Typography variant="overline" sx={{ opacity: 0.6 }}>Current Balance</Typography>
                      <Chip label={account?.account_type || 'Checking'} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.12)', color: '#fff', fontWeight: 600 }} />
                    </Box>
                    <Typography variant="h2" sx={{ fontWeight: 800, my: 1 }}>
                      ${(account?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Typography>
                    <Divider sx={{ bgcolor: 'rgba(255,255,255,0.1)', my: 2 }} />
                    <Typography variant="caption" sx={{ display: 'flex', alignItems: 'center', opacity: 0.8 }}>
                      <Box component="span" sx={{ width: 8, height: 8, bgcolor: '#4caf50', borderRadius: '50%', mr: 1 }} />
                      Secure connection active
                    </Typography>
                    {account?._id && (
                      <Box sx={{ display: 'flex', alignItems: 'center', mt: 1.5, opacity: 0.85 }}>
                        <Typography variant="caption" sx={{ mr: 0.5 }}>
                          Account ID: {account._id.slice(0, 10)}…
                        </Typography>
                        <Tooltip title="Copy full account ID — share it with others to receive transfers">
                          <IconButton size="small" onClick={copyAccountId} sx={{ color: 'inherit' }}>
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <DebitCard account={account} holderName={userName} />
              </Box>

              <Paper elevation={0} sx={{ p: 4, borderRadius: '28px', border: '1px solid', borderColor: 'divider' }}>
                <SavingsGoals />
              </Paper>
            </Stack>
          </Grid>

          <Grid item xs={12} md={7}>
            <Stack spacing={4}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: '28px', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 800, mb: 3 }}>Move Money</Typography>
                <Box sx={{ mb: 3, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                  {ACTIONS.map((type) => (
                    <Button
                      key={type}
                      variant={activeAction === type ? 'contained' : 'outlined'}
                      onClick={() => setActiveAction(type)}
                      sx={{
                        borderRadius: '12px', px: 4, fontWeight: 700, textTransform: 'capitalize', transition: '0.3s',
                        ...(activeAction === type && { bgcolor: '#0d2144', '&:hover': { bgcolor: '#14346b' } })
                      }}
                    >
                      {type}
                    </Button>
                  ))}
                </Box>

                {activeAction === 'transfer' && (
                  <TextField
                    fullWidth
                    label="Recipient Account ID"
                    value={recipientId}
                    onChange={(e) => setRecipientId(e.target.value)}
                    placeholder="Paste the recipient's account ID"
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                )}

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
                    disabled={submitting}
                    sx={{ minWidth: '140px', borderRadius: '12px', bgcolor: '#0d2144', fontWeight: 700, textTransform: 'none', '&:hover': { bgcolor: '#14346b' } }}
                  >
                    {submitting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Confirm'}
                  </Button>
                </Box>
              </Paper>

              <Paper elevation={0} sx={{ p: 4, borderRadius: '28px', border: '1px solid', borderColor: 'divider' }}>
                <SpendingChart transactions={transactions} />
              </Paper>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Paper elevation={0} sx={{ borderRadius: '28px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                  <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                      <HistoryIcon sx={{ mr: 1, color: '#1a4388' }} /> Transaction History
                    </Typography>
                    <IconButton onClick={fetchData}>
                      <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                    </IconButton>
                  </Box>
                  <Table>
                    <TableHead sx={{ bgcolor: 'action.hover' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>TYPE</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>DATE</TableCell>
                        <TableCell align="right" sx={{ fontWeight: 700 }}>AMOUNT (USD)</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      <AnimatePresence>
                        {transactions.length > 0 ? transactions.map((tx, i) => (
                          <TableRow
                            component={motion.tr}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            key={tx._id || i}
                            hover
                          >
                            <TableCell sx={{ fontWeight: 600 }}>{tx.txn_type?.replace('_', ' ').toUpperCase()}</TableCell>
                            <TableCell sx={{ color: 'text.secondary' }}>{new Date(tx.created_at).toLocaleString()}{tx.reason ? ` · ${tx.reason}` : ''}</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 800, color: isDebitType(tx.txn_type) ? '#d32f2f' : '#2e7d32' }}>
                              {isDebitType(tx.txn_type) ? '-' : '+'}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </TableCell>
                          </TableRow>
                        )) : (
                          <TableRow>
                            <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
                              No transactions yet — your activity will show up here.
                            </TableCell>
                          </TableRow>
                        )}
                      </AnimatePresence>
                    </TableBody>
                  </Table>
                </Paper>
              </motion.div>
            </Stack>
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
    </DashboardLayout>
  );
};

export default UserDashboard;
