import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, IconButton,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContactsIcon from '@mui/icons-material/Contacts';
import { getMyBeneficiaries, createBeneficiary, deleteBeneficiary } from '../api/beneficiaryService';
import { getAxiosErrorMessage } from '../utils/apiError';

const RecipientRow = ({ recipient, onDelete }) => (
  <Box sx={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    p: 2, borderRadius: '14px', border: '1px solid', borderColor: 'divider', mb: 1.5,
  }}>
    <Box sx={{ minWidth: 0 }}>
      <Typography sx={{ fontWeight: 700 }}>{recipient.nickname}</Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary', wordBreak: 'break-all' }}>
        {recipient.account_id}
      </Typography>
    </Box>
    <IconButton size="small" onClick={() => onDelete(recipient._id)}>
      <DeleteOutlineIcon fontSize="small" />
    </IconButton>
  </Box>
);

const SavedRecipients = () => {
  const [recipients, setRecipients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [nickname, setNickname] = useState('');
  const [accountId, setAccountId] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchRecipients = useCallback(async () => {
    try {
      const res = await getMyBeneficiaries();
      setRecipients(res.data);
    } catch (err) {
      setError('Could not load your saved recipients.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchRecipients(); }, [fetchRecipients]);

  const handleSave = async () => {
    if (!nickname.trim() || !accountId.trim()) return;
    setSaving(true);
    setError('');
    try {
      await createBeneficiary(nickname.trim(), accountId.trim());
      setNickname('');
      setAccountId('');
      setDialogOpen(false);
      fetchRecipients();
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'Could not save this recipient.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteBeneficiary(id);
      setRecipients((prev) => prev.filter((r) => r._id !== id));
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'Could not remove this recipient.'));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center' }}>
          <ContactsIcon sx={{ mr: 1, color: '#1a4388' }} /> Saved Recipients
        </Typography>
        <Button
          size="small" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Add Recipient
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <CircularProgress size={22} />
      ) : recipients.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Save a nickname for an account ID so you can pick it from a list next time you transfer — no more retyping IDs.
        </Typography>
      ) : (
        recipients.map((r) => <RecipientRow key={r._id} recipient={r} onDelete={handleDelete} />)
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Save a Recipient</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth label="Nickname" value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="e.g. Mom, Roommate, Landlord"
            sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth label="Account ID" value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            placeholder="Paste their Account ID"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleSave} disabled={saving}
            sx={{ textTransform: 'none', bgcolor: '#0d2144', '&:hover': { bgcolor: '#14346b' } }}
          >
            {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Save recipient'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SavedRecipients;
