import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Paper, TextField, Button, Alert,
  CircularProgress, Divider, Grid, IconButton, Tooltip, Snackbar
} from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { getProfile, updateProfile, changePassword, getLoginHistory } from '../api/authService';
import { getMyAccount } from '../api/bankService';
import { getAxiosErrorMessage } from '../utils/apiError';
import { useThemeMode, headingColor } from '../ThemeModeContext';
import DashboardLayout from './DashboardLayout';

const simplifyUserAgent = (ua) => {
  if (!ua) return 'Unknown device';
  const os = /iPhone|iPad|iPod/.test(ua) ? 'iOS'
    : /Android/.test(ua) ? 'Android'
    : /Macintosh/.test(ua) ? 'macOS'
    : /Windows/.test(ua) ? 'Windows'
    : /Linux/.test(ua) ? 'Linux'
    : 'Unknown OS';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /OPR\//.test(ua) ? 'Opera'
    : /Chrome\//.test(ua) && !/Chromium/.test(ua) ? 'Chrome'
    : /Firefox\//.test(ua) ? 'Firefox'
    : /Safari\//.test(ua) && !/Chrome/.test(ua) ? 'Safari'
    : /curl\//.test(ua) ? 'curl'
    : 'Unknown browser';
  return `${browser} on ${os}`;
};

const Settings = () => {
  const { mode } = useThemeMode();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [account, setAccount] = useState(null);
  const [loginHistory, setLoginHistory] = useState([]);
  const [profileMsg, setProfileMsg] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);
  const [copied, setCopied] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    Promise.all([
      getProfile().catch(() => ({ data: { name: localStorage.getItem('name') || '', email: '' } })),
      getMyAccount().catch(() => ({ data: null })),
      getLoginHistory().catch(() => ({ data: [] })),
    ]).then(([profileRes, accountRes, loginHistoryRes]) => {
      setName(profileRes.data.name || '');
      setEmail(profileRes.data.email || '');
      setAccount(accountRes.data);
      setLoginHistory(loginHistoryRes.data);
    }).finally(() => setLoading(false));
  }, []);

  const handleCopyAccountId = () => {
    if (!account?._id) return;
    navigator.clipboard.writeText(account._id);
    setCopied(true);
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      await updateProfile(name.trim());
      setProfileMsg({ type: 'success', text: 'Your name has been updated.' });
    } catch (err) {
      setProfileMsg({ type: 'error', text: getAxiosErrorMessage(err, 'Could not update your profile.') });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPasswordMsg(null);
    setSavingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setPasswordMsg({ type: 'success', text: 'Your password has been changed.' });
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPasswordMsg({ type: 'error', text: getAxiosErrorMessage(err, 'Could not change your password.') });
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <DashboardLayout>
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: headingColor(mode), mb: 3 }}>
          Profile &amp; Security
        </Typography>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
            <CircularProgress sx={{ color: headingColor(mode) }} />
          </Box>
        ) : (
          <Grid container spacing={4}>
            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Account Information</Typography>
                <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                  Share your Account ID with someone else so they can transfer money to you — it's the
                  same ID you'd paste into the "Recipient Account ID" field when transferring to their account.
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Full name</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{name || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Email</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{email || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Account type</Typography>
                    <Typography sx={{ fontWeight: 600 }}>{account?.account_type || 'Checking'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Account ID</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                      <Typography sx={{ fontWeight: 600, fontFamily: 'monospace', wordBreak: 'break-all' }}>
                        {account?._id || '—'}
                      </Typography>
                      {account?._id && (
                        <Tooltip title="Copy account ID">
                          <IconButton size="small" onClick={handleCopyAccountId} sx={{ ml: 0.5 }}>
                            <ContentCopyIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Profile</Typography>
                {profileMsg && (
                  <Alert severity={profileMsg.type} sx={{ mb: 2, borderRadius: '10px' }}>{profileMsg.text}</Alert>
                )}
                <form onSubmit={handleSaveProfile}>
                  <TextField
                    fullWidth
                    label="Full name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={savingProfile}
                    sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none', bgcolor: '#0d2144', '&:hover': { bgcolor: '#14346b' } }}
                  >
                    {savingProfile ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Save changes'}
                  </Button>
                </form>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Change password</Typography>
                {passwordMsg && (
                  <Alert severity={passwordMsg.type} sx={{ mb: 2, borderRadius: '10px' }}>{passwordMsg.text}</Alert>
                )}
                <form onSubmit={handleChangePassword}>
                  <TextField
                    fullWidth
                    type="password"
                    label="Current password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                  <TextField
                    fullWidth
                    type="password"
                    label="New password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    helperText="Use at least 8 characters"
                    required
                    sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    disabled={savingPassword}
                    sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none', bgcolor: '#0d2144', '&:hover': { bgcolor: '#14346b' } }}
                  >
                    {savingPassword ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Update password'}
                  </Button>
                </form>
              </Paper>
            </Grid>

            <Grid item xs={12}>
              <Divider />
            </Grid>

            <Grid item xs={12}>
              <Paper elevation={0} sx={{ p: 4, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Recent logins</Typography>
                {loginHistory.length === 0 ? (
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>No login activity recorded yet.</Typography>
                ) : (
                  loginHistory.map((e) => (
                    <Box
                      key={e._id}
                      sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid', borderColor: 'divider' }}
                    >
                      <Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{simplifyUserAgent(e.user_agent)}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>{e.ip_address || 'Unknown IP'}</Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {new Date(e.created_at).toLocaleString()}
                      </Typography>
                    </Box>
                  ))
                )}
              </Paper>
            </Grid>
          </Grid>
        )}
      </Container>

      <Snackbar
        open={copied}
        autoHideDuration={2500}
        onClose={() => setCopied(false)}
        message="Account ID copied to clipboard"
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </DashboardLayout>
  );
};

export default Settings;
