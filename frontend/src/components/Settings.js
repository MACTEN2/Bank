import React, { useState, useEffect } from 'react';
import {
  Box, Container, Typography, Paper, TextField, Button, Alert,
  CircularProgress, Divider, Grid
} from '@mui/material';
import { getProfile, updateProfile, changePassword } from '../api/authService';
import { getAxiosErrorMessage } from '../utils/apiError';
import { useThemeMode, headingColor } from '../ThemeModeContext';
import DashboardLayout from './DashboardLayout';

const Settings = () => {
  const { mode } = useThemeMode();
  const [loading, setLoading] = useState(true);

  const [name, setName] = useState('');
  const [profileMsg, setProfileMsg] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState(null);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    getProfile()
      .then((res) => setName(res.data.name || ''))
      .catch(() => setName(localStorage.getItem('name') || ''))
      .finally(() => setLoading(false));
  }, []);

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
          </Grid>
        )}
      </Container>
    </DashboardLayout>
  );
};

export default Settings;
