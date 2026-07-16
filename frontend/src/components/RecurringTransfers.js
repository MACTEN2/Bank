import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, TextField, IconButton, Chip,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import {
  getMyRecurringTransfers, createRecurringTransfer, toggleRecurringTransfer, deleteRecurringTransfer
} from '../api/recurringService';
import { getAxiosErrorMessage } from '../utils/apiError';

const FREQUENCIES = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

const RecurringTransferRow = ({ transfer, onToggle, onDelete }) => (
  <Box sx={{ p: 2, borderRadius: '14px', border: '1px solid', borderColor: 'divider', mb: 1.5 }}>
    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <Box>
        <Typography sx={{ fontWeight: 700 }}>
          ${transfer.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} · {transfer.frequency === 'weekly' ? 'Weekly' : 'Monthly'}
        </Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          To {transfer.to_account_id.slice(0, 10)}… · Next: {new Date(transfer.next_run_at).toLocaleDateString()}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Chip
          label={transfer.active ? 'Active' : 'Paused'}
          size="small"
          color={transfer.active ? 'success' : 'default'}
        />
        <IconButton size="small" onClick={() => onToggle(transfer._id)}>
          {transfer.active ? <PauseCircleOutlineIcon fontSize="small" /> : <PlayCircleOutlineIcon fontSize="small" />}
        </IconButton>
        <IconButton size="small" onClick={() => onDelete(transfer._id)}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  </Box>
);

const RecurringTransfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [toAccountId, setToAccountId] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('monthly');
  const [creating, setCreating] = useState(false);

  const fetchTransfers = useCallback(async () => {
    try {
      const res = await getMyRecurringTransfers();
      setTransfers(res.data);
    } catch (err) {
      setError('Could not load your recurring transfers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTransfers(); }, [fetchTransfers]);

  const handleCreate = async () => {
    const val = parseFloat(amount);
    if (!toAccountId.trim() || !val || val <= 0) return;
    setCreating(true);
    setError('');
    try {
      await createRecurringTransfer(toAccountId.trim(), val, frequency);
      setToAccountId('');
      setAmount('');
      setDialogOpen(false);
      fetchTransfers();
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'Could not create recurring transfer.'));
    } finally {
      setCreating(false);
    }
  };

  const handleToggle = async (id) => {
    try {
      await toggleRecurringTransfer(id);
      fetchTransfers();
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'Could not update recurring transfer.'));
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteRecurringTransfer(id);
      setTransfers((prev) => prev.filter((t) => t._id !== id));
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'Could not cancel recurring transfer.'));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center' }}>
          <AutorenewIcon sx={{ mr: 1, color: '#1a4388' }} /> Recurring Transfers
        </Typography>
        <Button
          size="small" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          New Schedule
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <CircularProgress size={22} />
      ) : transfers.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          No recurring transfers set up — automate a regular payment on a weekly or monthly schedule.
        </Typography>
      ) : (
        transfers.map((t) => (
          <RecurringTransferRow key={t._id} transfer={t} onToggle={handleToggle} onDelete={handleDelete} />
        ))
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New Recurring Transfer</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth label="Recipient Account ID" value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)} sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth type="number" label="Amount" value={amount}
            onChange={(e) => setAmount(e.target.value)} sx={{ mb: 2 }}
          />
          <TextField
            select fullWidth label="Frequency" value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
          >
            {FREQUENCIES.map((f) => <MenuItem key={f.value} value={f.value}>{f.label}</MenuItem>)}
          </TextField>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleCreate} disabled={creating}
            sx={{ textTransform: 'none', bgcolor: '#0d2144', '&:hover': { bgcolor: '#14346b' } }}
          >
            {creating ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Create schedule'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RecurringTransfers;
