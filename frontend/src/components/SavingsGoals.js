import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, LinearProgress, TextField, IconButton,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, Grid, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import SavingsIcon from '@mui/icons-material/Savings';
import { getMyGoals, createGoal, contributeToGoal, deleteGoal } from '../api/goalService';
import { getAxiosErrorMessage } from '../utils/apiError';

const GoalCard = ({ goal, onContribute, onDelete }) => {
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const pct = Math.min(100, Math.round((goal.saved_amount / goal.target_amount) * 100));
  const complete = pct >= 100;

  const handleAdd = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    setBusy(true);
    try {
      await onContribute(goal._id, val);
      setAmount('');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography sx={{ fontWeight: 700 }}>{goal.name}</Typography>
        <IconButton size="small" onClick={() => onDelete(goal._id)}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 8, borderRadius: 4, mb: 1,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: complete ? '#2e7d32' : '#0d2144', borderRadius: 4 },
        }}
      />
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
        ${goal.saved_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} of ${goal.target_amount.toLocaleString(undefined, { minimumFractionDigits: 2 })} ({pct}%)
      </Typography>
      {!complete ? (
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            size="small" type="number" placeholder="Amount" value={amount}
            onChange={(e) => setAmount(e.target.value)}
            sx={{ flex: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />
          <Button
            size="small" variant="contained" onClick={handleAdd} disabled={busy}
            sx={{ borderRadius: '10px', textTransform: 'none', bgcolor: '#0d2144', '&:hover': { bgcolor: '#14346b' } }}
          >
            {busy ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : 'Add funds'}
          </Button>
        </Box>
      ) : (
        <Typography variant="body2" sx={{ color: '#2e7d32', fontWeight: 700 }}>Goal reached! 🎉</Typography>
      )}
    </Box>
  );
};

const SavingsGoals = () => {
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTarget, setNewTarget] = useState('');
  const [creating, setCreating] = useState(false);

  const fetchGoals = useCallback(async () => {
    try {
      const res = await getMyGoals();
      setGoals(res.data);
    } catch (err) {
      setError('Could not load your savings goals.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  const handleCreate = async () => {
    if (!newName.trim() || !parseFloat(newTarget)) return;
    setCreating(true);
    setError('');
    try {
      await createGoal(newName.trim(), parseFloat(newTarget));
      setNewName('');
      setNewTarget('');
      setDialogOpen(false);
      fetchGoals();
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'Could not create goal.'));
    } finally {
      setCreating(false);
    }
  };

  const handleContribute = async (goalId, amount) => {
    try {
      await contributeToGoal(goalId, amount);
      fetchGoals();
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'Could not add funds.'));
    }
  };

  const handleDelete = async (goalId) => {
    try {
      await deleteGoal(goalId);
      setGoals((prev) => prev.filter((g) => g._id !== goalId));
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'Could not delete goal.'));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center' }}>
          <SavingsIcon sx={{ mr: 1, color: '#1a4388' }} /> Savings Goals
        </Typography>
        <Button
          size="small" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          New Goal
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <CircularProgress size={22} />
      ) : goals.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          You don't have any savings goals yet — set one to start tracking progress toward it.
        </Typography>
      ) : (
        <Grid container spacing={2}>
          {goals.map((g) => (
            <Grid item xs={12} sm={6} key={g._id}>
              <GoalCard goal={g} onContribute={handleContribute} onDelete={handleDelete} />
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>New Savings Goal</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth label="Goal name" value={newName} onChange={(e) => setNewName(e.target.value)}
            placeholder="e.g. Vacation Fund" sx={{ mt: 1, mb: 2 }}
          />
          <TextField
            fullWidth type="number" label="Target amount" value={newTarget}
            onChange={(e) => setNewTarget(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleCreate} disabled={creating}
            sx={{ textTransform: 'none', bgcolor: '#0d2144', '&:hover': { bgcolor: '#14346b' } }}
          >
            {creating ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Create goal'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SavingsGoals;
