import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, Button, Box, CircularProgress, Grid, Card, CardContent,
  TextField, InputAdornment, IconButton, Alert, Divider,
  Snackbar, Fade, Chip, Tooltip, Stack, MenuItem
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import RefreshIcon from '@mui/icons-material/Refresh';
import HistoryIcon from '@mui/icons-material/History';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DownloadIcon from '@mui/icons-material/Download';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import {
  getMyAccount, getMyTransactions, exportMyTransactions, depositMoney, withdrawMoney, transferMoney,
  toggleCardLock, downloadStatement
} from '../api/bankService';
import { processRecurringTransfers } from '../api/recurringService';
import { getMyBeneficiaries } from '../api/beneficiaryService';
import { getAxiosErrorMessage } from '../utils/apiError';
import { useThemeMode, headingColor } from '../ThemeModeContext';
import { SPENDING_CATEGORIES } from '../constants';
import SpendingChart from './SpendingChart';
import QuickStats from './QuickStats';
import DebitCard from './DebitCard';
import SavingsGoals from './SavingsGoals';
import Budgets from './Budgets';
import RecurringTransfers from './RecurringTransfers';
import SavedRecipients from './SavedRecipients';
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
  const [category, setCategory] = useState('');
  const [activeAction, setActiveAction] = useState('deposit');
  const [submitting, setSubmitting] = useState(false);

  // Transaction search/filter state
  const [filters, setFilters] = useState({ startDate: '', endDate: '', txnType: '', minAmount: '', maxAmount: '' });
  const [exporting, setExporting] = useState(false);

  // Saved recipients quick-select
  const [beneficiaries, setBeneficiaries] = useState([]);

  // Self-service card lock
  const [lockingCard, setLockingCard] = useState(false);

  // Monthly PDF statement
  const now = new Date();
  const [statementMonth, setStatementMonth] = useState(
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  );
  const [downloadingStatement, setDownloadingStatement] = useState(false);

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

  const buildTxnParams = () => {
    const params = {};
    if (filters.startDate) params.start_date = filters.startDate;
    if (filters.endDate) params.end_date = filters.endDate;
    if (filters.txnType) params.txn_type = filters.txnType;
    if (filters.minAmount) params.min_amount = filters.minAmount;
    if (filters.maxAmount) params.max_amount = filters.maxAmount;
    return params;
  };

  const fetchData = useCallback(async () => {
    setRefreshing(true);
    try {
      const [accRes, txRes] = await Promise.all([getMyAccount(), getMyTransactions(buildTxnParams())]);
      setAccount(accRes.data || { balance: 0 });
      setTransactions(Array.isArray(txRes.data) ? txRes.data : []);
    } catch (err) {
      notify('Unable to reach the bank. Please try again shortly.', 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // No background worker in this app — simulate scheduled execution by
  // processing any due recurring transfers once when the dashboard loads.
  useEffect(() => {
    processRecurringTransfers().then((res) => {
      if (res.data?.processed?.length) fetchData();
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    getMyBeneficiaries().then((res) => setBeneficiaries(res.data)).catch(() => {});
  }, []);

  const handleToggleCardLock = async () => {
    setLockingCard(true);
    try {
      const res = await toggleCardLock();
      setAccount((prev) => ({ ...prev, status: res.data.status, frozen_reason: res.data.frozen_reason }));
      notify(res.data.status === 'frozen' ? 'Your card has been locked.' : 'Your card has been unlocked.', 'success');
    } catch (err) {
      notify(getAxiosErrorMessage(err, 'Could not update your card lock status.'), 'error');
    } finally {
      setLockingCard(false);
    }
  };

  const handleDownloadStatement = async () => {
    const [year, month] = statementMonth.split('-').map(Number);
    if (!year || !month) return;
    setDownloadingStatement(true);
    try {
      const res = await downloadStatement(year, month);
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statement-${statementMonth}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      notify(getAxiosErrorMessage(err, 'Could not download the statement.'), 'error');
    } finally {
      setDownloadingStatement(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const res = await exportMyTransactions(buildTxnParams());
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'transactions.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      notify(getAxiosErrorMessage(err, 'Could not export transactions.'), 'error');
    } finally {
      setExporting(false);
    }
  };

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
        await withdrawMoney(numericAmount, category || undefined);
        notify('Withdrawal successful. Balance updated.', 'success');
      } else {
        await transferMoney(recipientId.trim(), numericAmount, category || undefined);
        notify(`Transfer of $${numericAmount.toLocaleString()} sent successfully.`, 'success');
        setRecipientId('');
      }
      setAmount('');
      setCategory('');
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
      <Container maxWidth={false} sx={{ py: 6, maxWidth: { xs: '100%', xl: 1800 }, mx: 'auto' }}>
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
          <Grid item xs={12} md={5} lg={4}>
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
                        <Typography variant="caption" sx={{ mr: 0.5, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                          Account ID: {account._id}
                        </Typography>
                        <Tooltip title="Copy account ID — give this to others so they can transfer to you">
                          <IconButton size="small" onClick={copyAccountId} sx={{ color: 'inherit' }}>
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>

              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
                <DebitCard account={account} holderName={userName} locked={account?.status === 'frozen'} />
                <Button
                  size="small"
                  startIcon={account?.status === 'frozen' ? <LockOpenIcon /> : <LockIcon />}
                  onClick={handleToggleCardLock}
                  disabled={lockingCard}
                  color={account?.status === 'frozen' ? 'success' : 'inherit'}
                  sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                  {lockingCard ? 'Updating…' : account?.status === 'frozen' ? 'Unlock card' : 'Lock card'}
                </Button>
              </Box>

              <Paper elevation={0} sx={{ p: 4, borderRadius: '28px', border: '1px solid', borderColor: 'divider' }}>
                <SavingsGoals />
              </Paper>

              <Paper elevation={0} sx={{ p: 4, borderRadius: '28px', border: '1px solid', borderColor: 'divider' }}>
                <Budgets />
              </Paper>

              <Paper elevation={0} sx={{ p: 4, borderRadius: '28px', border: '1px solid', borderColor: 'divider' }}>
                <RecurringTransfers />
              </Paper>

              <Paper elevation={0} sx={{ p: 4, borderRadius: '28px', border: '1px solid', borderColor: 'divider' }}>
                <SavedRecipients />
              </Paper>
            </Stack>
          </Grid>

          <Grid item xs={12} md={7} lg={8}>
            <Stack spacing={4}>
              {/* Side by side once there's enough width to spare (xl+); stacked
                  full-width below that, same as before. */}
              <Grid container spacing={4}>
                <Grid item xs={12} xl={6}>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: '28px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
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

                    {activeAction === 'transfer' && beneficiaries.length > 0 && (
                      <TextField
                        select
                        fullWidth
                        label="Saved recipient (optional)"
                        value=""
                        onChange={(e) => setRecipientId(e.target.value)}
                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                      >
                        {beneficiaries.map((b) => (
                          <MenuItem key={b._id} value={b.account_id}>{b.nickname}</MenuItem>
                        ))}
                      </TextField>
                    )}

                    {activeAction === 'transfer' && (
                      <TextField
                        fullWidth
                        label="Recipient Account ID"
                        value={recipientId}
                        onChange={(e) => setRecipientId(e.target.value)}
                        placeholder="Paste the recipient's account ID, or pick a saved recipient above"
                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                      />
                    )}

                    {activeAction !== 'deposit' && (
                      <TextField
                        select
                        fullWidth
                        label="Category (optional)"
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                        sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                      >
                        <MenuItem value="">No category</MenuItem>
                        {SPENDING_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                      </TextField>
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
                </Grid>

                <Grid item xs={12} xl={6}>
                  <Paper elevation={0} sx={{ p: 4, borderRadius: '28px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
                    <SpendingChart transactions={transactions} />
                  </Paper>
                </Grid>
              </Grid>

              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <Paper elevation={0} sx={{ borderRadius: '28px', border: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
                  <Box sx={{ p: 3, display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: 'background.paper' }}>
                    <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center' }}>
                      <HistoryIcon sx={{ mr: 1, color: '#1a4388' }} /> Transaction History
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Button
                        size="small" startIcon={<DownloadIcon />} onClick={handleExportCsv} disabled={exporting}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                      >
                        {exporting ? 'Exporting…' : 'Export CSV'}
                      </Button>
                      <IconButton onClick={fetchData}>
                        <RefreshIcon sx={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                      </IconButton>
                    </Box>
                  </Box>

                  <Box sx={{ px: 3, pb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <TextField
                      size="small" type="month" label="Statement month" InputLabelProps={{ shrink: true }}
                      value={statementMonth} onChange={(e) => setStatementMonth(e.target.value)}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                    <Button
                      size="small" variant="outlined" startIcon={<DownloadIcon />}
                      onClick={handleDownloadStatement} disabled={downloadingStatement}
                      sx={{ textTransform: 'none', fontWeight: 700, borderRadius: '10px' }}
                    >
                      {downloadingStatement ? 'Preparing…' : 'Download Statement (PDF)'}
                    </Button>
                  </Box>

                  <Box sx={{ px: 3, pb: 2, display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                    <TextField
                      size="small" type="date" label="From" InputLabelProps={{ shrink: true }}
                      value={filters.startDate} onChange={(e) => setFilters((f) => ({ ...f, startDate: e.target.value }))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                    <TextField
                      size="small" type="date" label="To" InputLabelProps={{ shrink: true }}
                      value={filters.endDate} onChange={(e) => setFilters((f) => ({ ...f, endDate: e.target.value }))}
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                    <TextField
                      select size="small" label="Type" value={filters.txnType}
                      onChange={(e) => setFilters((f) => ({ ...f, txnType: e.target.value }))}
                      sx={{ minWidth: 140, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    >
                      <MenuItem value="">All types</MenuItem>
                      <MenuItem value="deposit">Deposit</MenuItem>
                      <MenuItem value="withdrawal">Withdrawal</MenuItem>
                      <MenuItem value="admin_credit">Admin credit</MenuItem>
                      <MenuItem value="admin_debit">Admin debit</MenuItem>
                    </TextField>
                    <TextField
                      size="small" type="number" label="Min $" value={filters.minAmount}
                      onChange={(e) => setFilters((f) => ({ ...f, minAmount: e.target.value }))}
                      sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
                    <TextField
                      size="small" type="number" label="Max $" value={filters.maxAmount}
                      onChange={(e) => setFilters((f) => ({ ...f, maxAmount: e.target.value }))}
                      sx={{ width: 100, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                    />
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
