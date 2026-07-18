import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, Table, TableBody, TableCell, TableHead,
  TableRow, Button, Box, CircularProgress, Alert, Tabs, Tab, TextField, Grid, Card, CardContent,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, Divider, IconButton, Tooltip,
  ToggleButtonGroup, ToggleButton
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import PeopleIcon from '@mui/icons-material/People';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import { useThemeMode, headingColor } from '../ThemeModeContext';
import {
  getAllUsers, getAllAccounts, getAccountTransactions, adjustAccountBalance,
  toggleAccountFreeze, terminateAccount, updateUserRole, getTransactionFeed
} from '../api/adminService';
import { getAllTickets, addTicketMessage, resolveTicket } from '../api/ticketService';
import { getAxiosErrorMessage } from '../utils/apiError';
import TicketThread from './TicketThread';
import DashboardLayout from './DashboardLayout';

const isDebitType = (txnType) => txnType === 'withdrawal' || txnType === 'admin_debit';

// Masks all but the last 4 characters — same convention as the debit card
// number on the user side (see DebitCard.js).
const maskId = (id) => (id ? '•'.repeat(Math.max(id.length - 4, 0)) + id.slice(-4) : '');

// Account IDs are hidden by default (handy when screen-sharing/demoing) and
// can be revealed per-row via the eye icon; clicking again hides them.
const MaskedAccountId = ({ id, visible, onToggle, sx }) => (
  <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, ...sx }}>
    <Typography component="span" sx={{ fontFamily: 'monospace', fontSize: 'inherit', color: 'inherit' }}>
      {visible ? id : maskId(id)}
    </Typography>
    <Tooltip title={visible ? 'Hide account ID' : 'Show account ID'}>
      <IconButton size="small" onClick={onToggle} sx={{ p: 0.4 }}>
        {visible ? <VisibilityOffIcon sx={{ fontSize: 16 }} /> : <VisibilityIcon sx={{ fontSize: 16 }} />}
      </IconButton>
    </Tooltip>
  </Box>
);

const AdminDashboard = () => {
  const { mode } = useThemeMode();
  const [users, setUsers] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [feed, setFeed] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [tabValue, setTabValue] = useState(0);
  const [error, setError] = useState('');
  const [freezingId, setFreezingId] = useState(null);
  const [roleUpdatingId, setRoleUpdatingId] = useState(null);
  const [terminatingId, setTerminatingId] = useState(null);
  const [confirmTerminateOpen, setConfirmTerminateOpen] = useState(false);

  // Account IDs are masked by default; tracks which ones have been revealed.
  const [visibleAccountIds, setVisibleAccountIds] = useState(new Set());
  const toggleAccountIdVisibility = (id) => {
    setVisibleAccountIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Account detail dialog
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [accountTx, setAccountTx] = useState([]);
  const [accountTxLoading, setAccountTxLoading] = useState(false);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustType, setAdjustType] = useState('credit');
  const [adjustReason, setAdjustReason] = useState('');
  const [adjusting, setAdjusting] = useState(false);
  const [freezeReason, setFreezeReason] = useState('');
  const [dialogMsg, setDialogMsg] = useState(null);

  // Ticket dialog
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resolvingTicket, setResolvingTicket] = useState(false);

  const myUserId = localStorage.getItem('userId');

  const fetchData = useCallback(async () => {
    try {
      const [uRes, aRes, fRes, tRes] = await Promise.all([
        getAllUsers(), getAllAccounts(), getTransactionFeed(), getAllTickets()
      ]);
      setUsers(uRes.data);
      setAccounts(aRes.data);
      setFeed(fRes.data);
      setTickets(tRes.data);
    } catch (err) {
      setError('Failed to sync with the bank\'s systems. Please re-login.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleToggleFreeze = async (accountId, reason) => {
    setFreezingId(accountId);
    try {
      const res = await toggleAccountFreeze(accountId, reason);
      setAccounts((prev) => prev.map((a) => (a._id === accountId
        ? { ...a, status: res.data.status, frozen_reason: res.data.frozen_reason }
        : a)));
      if (selectedAccount?._id === accountId) {
        setSelectedAccount((prev) => ({ ...prev, status: res.data.status, frozen_reason: res.data.frozen_reason }));
      }
      setFreezeReason('');
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'Could not update account status.'));
    } finally {
      setFreezingId(null);
    }
  };

  const handleTerminateAccount = async () => {
    if (!selectedAccount) return;
    const accountId = selectedAccount._id;
    setTerminatingId(accountId);
    setDialogMsg(null);
    try {
      const res = await terminateAccount(accountId);
      setAccounts((prev) => prev.map((a) => (a._id === accountId ? { ...a, status: res.data.status } : a)));
      setSelectedAccount((prev) => ({ ...prev, status: res.data.status }));
      setDialogMsg({ type: 'success', text: 'Account terminated. It can no longer send, receive, or process transactions.' });
    } catch (err) {
      setDialogMsg({ type: 'error', text: getAxiosErrorMessage(err, 'Could not terminate this account.') });
    } finally {
      setTerminatingId(null);
      setConfirmTerminateOpen(false);
    }
  };

  const handleUpdateRole = async (userId, newRole) => {
    setRoleUpdatingId(userId);
    try {
      await updateUserRole(userId, newRole);
      setUsers((prev) => prev.map((u) => (u._id === userId ? { ...u, role: newRole } : u)));
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'Could not update user role.'));
    } finally {
      setRoleUpdatingId(null);
    }
  };

  const openAccountDetail = async (account) => {
    setSelectedAccount(account);
    setAccountTx([]);
    setAdjustAmount('');
    setAdjustReason('');
    setAdjustType('credit');
    setDialogMsg(null);
    setConfirmTerminateOpen(false);
    setAccountTxLoading(true);
    try {
      const res = await getAccountTransactions(account._id);
      setAccountTx(res.data);
    } catch (err) {
      setDialogMsg({ type: 'error', text: getAxiosErrorMessage(err, 'Could not load transaction history.') });
    } finally {
      setAccountTxLoading(false);
    }
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    const amount = parseFloat(adjustAmount);
    if (!amount || amount <= 0) {
      setDialogMsg({ type: 'warning', text: 'Enter a valid amount.' });
      return;
    }
    if (!adjustReason.trim()) {
      setDialogMsg({ type: 'warning', text: 'A reason is required for manual adjustments.' });
      return;
    }
    setAdjusting(true);
    setDialogMsg(null);
    try {
      const res = await adjustAccountBalance(selectedAccount._id, amount, adjustType, adjustReason.trim());
      setDialogMsg({ type: 'success', text: `Balance updated to $${res.data.balance.toLocaleString()}.` });
      setAdjustAmount('');
      setAdjustReason('');
      setAccounts((prev) => prev.map((a) => (a._id === selectedAccount._id ? { ...a, balance: res.data.balance } : a)));
      const txRes = await getAccountTransactions(selectedAccount._id);
      setAccountTx(txRes.data);
    } catch (err) {
      setDialogMsg({ type: 'error', text: getAxiosErrorMessage(err, 'Adjustment failed.') });
    } finally {
      setAdjusting(false);
    }
  };

  const handleResolveTicket = async () => {
    setResolvingTicket(true);
    try {
      await resolveTicket(selectedTicket._id);
      const updated = { ...selectedTicket, status: 'resolved' };
      setSelectedTicket(updated);
      setTickets((prev) => prev.map((t) => (t._id === updated._id ? updated : t)));
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'Could not resolve ticket.'));
    } finally {
      setResolvingTicket(false);
    }
  };

  const handleSendTicketMessage = async (text) => {
    const res = await addTicketMessage(selectedTicket._id, text);
    setSelectedTicket(res.data);
    setTickets((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)));
  };

  // Safe Data Mapping: Links account user_id to the User email
  const getUserEmail = (userId) => {
    if (!userId) return "N/A";
    const user = users.find(u => u._id === userId);
    return user ? user.email : "Unknown Owner";
  };

  // Search Logic
  const filteredUsers = users.filter(u => u.email?.toLowerCase().includes(searchTerm.toLowerCase()));
  const filteredAccounts = accounts.filter(acc => getUserEmail(acc.user_id).toLowerCase().includes(searchTerm.toLowerCase()));

  const totalLiquidity = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
  const openTicketCount = tickets.filter((t) => t.status !== 'resolved').length;

  const adminName = localStorage.getItem('name') || 'Administrator';
  const firstName = adminName.split(' ')[0];
  const isFirstLogin = localStorage.getItem('firstLogin') === 'true';

  useEffect(() => {
    if (isFirstLogin) {
      localStorage.setItem('firstLogin', 'false');
    }
  }, [isFirstLogin]);

  if (loading) return <Box sx={{ textAlign: 'center', mt: 10 }}><CircularProgress /></Box>;

  return (
    <DashboardLayout>
    <Container maxWidth="lg" sx={{ py: 5 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: headingColor(mode) }}>
          {isFirstLogin ? `Thank you for joining us, ${firstName}! 🎉` : `Welcome back, ${firstName}`}
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {isFirstLogin
            ? "We're excited to have you leading the way here. Here's a full overview of the bank's activity."
            : "Here's what's happening across the bank today."}
        </Typography>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError('')}>{error}</Alert>}

      {/* 1. Statistics Row */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
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
        <Grid item xs={12} md={3}>
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
        <Grid item xs={12} md={3}>
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
        <Grid item xs={12} md={3}>
          <Card elevation={3} sx={{ borderLeft: '5px solid #d32f2f' }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <SupportAgentIcon sx={{ color: '#d32f2f' }} />
                <Typography color="textSecondary">Open Tickets</Typography>
              </Box>
              <Typography variant="h4" sx={{ mt: 1 }}>{openTicketCount}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 2. Search & Tab Controls */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)}>
          <Tab label="Customer Directory" />
          <Tab label="Global Ledger" />
          <Tab label="Transaction Feed" />
          <Tab label={`Support Tickets${openTicketCount ? ` (${openTicketCount})` : ''}`} />
        </Tabs>
        {tabValue <= 1 && (
          <TextField
            size="small"
            placeholder={tabValue === 0 ? "Search by email..." : "Search by owner email..."}
            InputProps={{ startAdornment: <SearchIcon sx={{ mr: 1, color: 'gray' }} /> }}
            onChange={(e) => setSearchTerm(e.target.value)}
            sx={{ ml: 'auto', width: '350px', bgcolor: 'background.paper' }}
          />
        )}
      </Box>

      {/* Tab 0: Customer Directory */}
      {tabValue === 0 && (
        <Paper elevation={4} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#1a4388' }}>
              <TableRow>
                <TableCell sx={{ color: 'white' }}><strong>User ID</strong></TableCell>
                <TableCell sx={{ color: 'white' }}><strong>Email Address</strong></TableCell>
                <TableCell sx={{ color: 'white' }}><strong>System Role</strong></TableCell>
                <TableCell sx={{ color: 'white', textAlign: 'center' }}><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredUsers.map((item) => (
                <TableRow key={item._id} hover>
                  <TableCell sx={{ fontSize: '0.8rem', color: 'gray' }}>{item._id}</TableCell>
                  <TableCell sx={{ fontWeight: '500' }}>{item.email}</TableCell>
                  <TableCell>{item.role ? item.role.toUpperCase() : "USER"}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    {item._id === myUserId ? (
                      <Chip label="You" size="small" />
                    ) : (
                      <Button
                        size="small"
                        variant="outlined"
                        disabled={roleUpdatingId === item._id}
                        onClick={() => handleUpdateRole(item._id, item.role === 'admin' ? 'user' : 'admin')}
                      >
                        {roleUpdatingId === item._id ? '...' : (item.role === 'admin' ? 'Revoke Admin' : 'Make Admin')}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tab 1: Global Ledger */}
      {tabValue === 1 && (
        <Paper elevation={4} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#1a4388' }}>
              <TableRow>
                <TableCell sx={{ color: 'white' }}><strong>Account Owner</strong></TableCell>
                <TableCell sx={{ color: 'white' }}><strong>Account ID</strong></TableCell>
                <TableCell sx={{ color: 'white' }}><strong>Balance</strong></TableCell>
                <TableCell sx={{ color: 'white' }}><strong>Type</strong></TableCell>
                <TableCell sx={{ color: 'white' }}><strong>Status</strong></TableCell>
                <TableCell sx={{ color: 'white', textAlign: 'center' }}><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredAccounts.map((item) => (
                <TableRow key={item._id} hover>
                  <TableCell sx={{ fontWeight: 'bold', color: '#1a4388' }}>{getUserEmail(item.user_id)}</TableCell>
                  <TableCell sx={{ fontSize: '0.8rem', color: 'gray' }}>
                    <MaskedAccountId
                      id={item._id}
                      visible={visibleAccountIds.has(item._id)}
                      onToggle={() => toggleAccountIdVisibility(item._id)}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold', color: item.balance < 0 ? '#d32f2f' : '#2e7d32' }}>
                    ${(item.balance || 0).toLocaleString()}
                  </TableCell>
                  <TableCell>{item.account_type || "Checking"}</TableCell>
                  <TableCell>
                    <Chip
                      label={item.status === 'terminated' ? 'Terminated' : item.status === 'frozen' ? 'Frozen' : 'Active'}
                      size="small"
                      color={item.status === 'terminated' ? 'default' : item.status === 'frozen' ? 'error' : 'success'}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Button startIcon={<VisibilityIcon />} size="small" variant="outlined" onClick={() => openAccountDetail(item)}>
                      View
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tab 2: Transaction Feed */}
      {tabValue === 2 && (
        <Paper elevation={4} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#1a4388' }}>
              <TableRow>
                <TableCell sx={{ color: 'white' }}><strong>Customer</strong></TableCell>
                <TableCell sx={{ color: 'white' }}><strong>Type</strong></TableCell>
                <TableCell sx={{ color: 'white' }}><strong>Date</strong></TableCell>
                <TableCell sx={{ color: 'white' }}><strong>Note</strong></TableCell>
                <TableCell sx={{ color: 'white', textAlign: 'right' }}><strong>Amount</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {feed.length > 0 ? feed.map((tx) => (
                <TableRow key={tx._id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{tx.owner_email}</TableCell>
                  <TableCell>{tx.txn_type?.replace('_', ' ').toUpperCase()}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{new Date(tx.created_at).toLocaleString()}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{tx.reason || '—'}</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700, color: isDebitType(tx.txn_type) ? '#d32f2f' : '#2e7d32' }}>
                    {isDebitType(tx.txn_type) ? '-' : '+'}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No activity yet.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Tab 3: Support Tickets */}
      {tabValue === 3 && (
        <Paper elevation={4} sx={{ borderRadius: '12px', overflow: 'hidden' }}>
          <Table>
            <TableHead sx={{ bgcolor: '#1a4388' }}>
              <TableRow>
                <TableCell sx={{ color: 'white' }}><strong>Customer</strong></TableCell>
                <TableCell sx={{ color: 'white' }}><strong>Subject</strong></TableCell>
                <TableCell sx={{ color: 'white' }}><strong>Last Update</strong></TableCell>
                <TableCell sx={{ color: 'white' }}><strong>Status</strong></TableCell>
                <TableCell sx={{ color: 'white', textAlign: 'center' }}><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {tickets.length > 0 ? tickets.map((t) => (
                <TableRow key={t._id} hover>
                  <TableCell sx={{ fontWeight: 500 }}>{t.user_email}</TableCell>
                  <TableCell>{t.subject}</TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{new Date(t.updated_at).toLocaleString()}</TableCell>
                  <TableCell>
                    <Chip label={t.status === 'resolved' ? 'Resolved' : 'Open'} size="small" color={t.status === 'resolved' ? 'success' : 'warning'} />
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Button size="small" variant="outlined" onClick={() => setSelectedTicket(t)}>Open</Button>
                  </TableCell>
                </TableRow>
              )) : (
                <TableRow><TableCell colSpan={5} sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>No support tickets.</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}
    </Container>

    {/* Account Detail Dialog */}
    <Dialog open={!!selectedAccount} onClose={() => setSelectedAccount(null)} maxWidth="sm" fullWidth>
      {selectedAccount && (
        <>
          <DialogTitle sx={{ fontWeight: 800 }}>
            {getUserEmail(selectedAccount.user_id)}
            <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0.5, color: 'text.secondary', fontWeight: 400 }}>
              <Typography component="span" variant="body2">Account</Typography>
              <MaskedAccountId
                id={selectedAccount._id}
                visible={visibleAccountIds.has(selectedAccount._id)}
                onToggle={() => toggleAccountIdVisibility(selectedAccount._id)}
                sx={{ fontSize: '0.875rem' }}
              />
              <Typography component="span" variant="body2">
                · Balance ${(selectedAccount.balance || 0).toLocaleString()}
              </Typography>
            </Box>
          </DialogTitle>
          <DialogContent dividers>
            {dialogMsg && <Alert severity={dialogMsg.type} sx={{ mb: 2 }}>{dialogMsg.text}</Alert>}

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Transaction History</Typography>
            {accountTxLoading ? (
              <CircularProgress size={24} />
            ) : (
              <Box sx={{ maxHeight: 180, overflowY: 'auto', mb: 3 }}>
                {accountTx.length > 0 ? accountTx.map((tx) => (
                  <Box key={tx._id} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{tx.txn_type?.replace('_', ' ').toUpperCase()}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{new Date(tx.created_at).toLocaleString()}{tx.reason ? ` · ${tx.reason}` : ''}</Typography>
                    </Box>
                    <Typography sx={{ fontWeight: 700, color: isDebitType(tx.txn_type) ? '#d32f2f' : '#2e7d32' }}>
                      {isDebitType(tx.txn_type) ? '-' : '+'}${Math.abs(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </Typography>
                  </Box>
                )) : <Typography variant="body2" sx={{ color: 'text.secondary' }}>No transactions yet.</Typography>}
              </Box>
            )}

            <Divider sx={{ mb: 3 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Manual Adjustment</Typography>
            <form onSubmit={handleAdjust}>
              <ToggleButtonGroup
                value={adjustType}
                exclusive
                size="small"
                onChange={(e, v) => v && setAdjustType(v)}
                sx={{ mb: 2 }}
              >
                <ToggleButton value="credit">Credit (+)</ToggleButton>
                <ToggleButton value="debit">Debit (-)</ToggleButton>
              </ToggleButtonGroup>
              <TextField
                fullWidth size="small" label="Amount" type="number" value={adjustAmount}
                onChange={(e) => setAdjustAmount(e.target.value)} sx={{ mb: 2 }}
              />
              <TextField
                fullWidth size="small" label="Reason (required, visible to audit trail)" value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)} sx={{ mb: 2 }}
              />
              <Button type="submit" variant="contained" disabled={adjusting} sx={{ bgcolor: '#0d2144', textTransform: 'none', fontWeight: 700 }}>
                {adjusting ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Apply Adjustment'}
              </Button>
            </form>

            <Divider sx={{ my: 3 }} />

            <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Account Status</Typography>
            {selectedAccount.status === 'terminated' ? (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                This account has been terminated and can no longer send, receive, or process transactions.
              </Typography>
            ) : (
              <>
                {selectedAccount.status === 'frozen' ? (
                  <Box>
                    <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                      Frozen{selectedAccount.frozen_reason ? ` — ${selectedAccount.frozen_reason}` : ''}
                    </Typography>
                    <Button
                      startIcon={<LockOpenIcon />} variant="outlined" color="success"
                      disabled={freezingId === selectedAccount._id}
                      onClick={() => handleToggleFreeze(selectedAccount._id)}
                    >
                      Unfreeze account
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <TextField
                      size="small" label="Reason (e.g. card reported lost/stolen)" value={freezeReason}
                      onChange={(e) => setFreezeReason(e.target.value)} sx={{ flex: 1 }}
                    />
                    <Button
                      startIcon={<LockIcon />} variant="outlined" color="error"
                      disabled={freezingId === selectedAccount._id}
                      onClick={() => handleToggleFreeze(selectedAccount._id, freezeReason.trim() || undefined)}
                    >
                      Freeze
                    </Button>
                  </Box>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mb: 1 }}>
                  Danger zone — this permanently closes the account. It cannot be undone.
                </Typography>
                <Button
                  startIcon={<DeleteForeverIcon />} variant="outlined" color="error"
                  disabled={(selectedAccount.balance || 0) !== 0 || terminatingId === selectedAccount._id}
                  onClick={() => setConfirmTerminateOpen(true)}
                >
                  Terminate account
                </Button>
                {(selectedAccount.balance || 0) !== 0 && (
                  <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', mt: 0.5 }}>
                    Balance must be $0 to terminate — settle it with a manual adjustment above first.
                  </Typography>
                )}
              </>
            )}
          </DialogContent>
        </>
      )}
    </Dialog>

    {/* Terminate Account Confirmation */}
    <Dialog open={confirmTerminateOpen} onClose={() => setConfirmTerminateOpen(false)} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>Terminate this account?</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          This permanently closes {selectedAccount ? getUserEmail(selectedAccount.user_id) : 'this'}'s account.
          It will no longer be able to send, receive, or process any transactions. This action cannot be undone.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={() => setConfirmTerminateOpen(false)}>Cancel</Button>
        <Button
          variant="contained" color="error"
          disabled={terminatingId === selectedAccount?._id}
          onClick={handleTerminateAccount}
        >
          {terminatingId === selectedAccount?._id ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Terminate account'}
        </Button>
      </DialogActions>
    </Dialog>

    {/* Ticket Dialog */}
    <Dialog open={!!selectedTicket} onClose={() => setSelectedTicket(null)} maxWidth="sm" fullWidth>
      {selectedTicket && (
        <DialogContent>
          <TicketThread
            ticket={selectedTicket}
            isAdmin
            onSendMessage={handleSendTicketMessage}
            onResolve={handleResolveTicket}
            resolving={resolvingTicket}
          />
        </DialogContent>
      )}
    </Dialog>
    </DashboardLayout>
  );
};

export default AdminDashboard;
