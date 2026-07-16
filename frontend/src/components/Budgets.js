import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, LinearProgress, TextField, IconButton,
  CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, MenuItem, Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PieChartIcon from '@mui/icons-material/PieChart';
import { getMyBudgets, upsertBudget, deleteBudget } from '../api/budgetService';
import { getAxiosErrorMessage } from '../utils/apiError';
import { SPENDING_CATEGORIES } from '../constants';

const barColor = (pct) => {
  if (pct >= 100) return '#d32f2f';
  if (pct >= 80) return '#ed6c02';
  return '#2e7d32';
};

const BudgetRow = ({ budget, onDelete }) => {
  const pct = Math.min(100, budget.percent_used);
  return (
    <Box sx={{ p: 2.5, borderRadius: '16px', border: '1px solid', borderColor: 'divider', mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
        <Typography sx={{ fontWeight: 700 }}>{budget.category}</Typography>
        <IconButton size="small" onClick={() => onDelete(budget._id)}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Box>
      <LinearProgress
        variant="determinate"
        value={pct}
        sx={{
          height: 8, borderRadius: 4, mb: 1,
          bgcolor: 'action.hover',
          '& .MuiLinearProgress-bar': { bgcolor: barColor(budget.percent_used), borderRadius: 4 },
        }}
      />
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        ${budget.spent.toLocaleString(undefined, { minimumFractionDigits: 2 })} of ${budget.monthly_limit.toLocaleString(undefined, { minimumFractionDigits: 2 })} this month ({budget.percent_used}%)
      </Typography>
    </Box>
  );
};

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState(SPENDING_CATEGORIES[0]);
  const [limit, setLimit] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchBudgets = useCallback(async () => {
    try {
      const res = await getMyBudgets();
      setBudgets(res.data);
    } catch (err) {
      setError('Could not load your budgets.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchBudgets(); }, [fetchBudgets]);

  const handleSave = async () => {
    const val = parseFloat(limit);
    if (!val || val <= 0) return;
    setSaving(true);
    setError('');
    try {
      await upsertBudget(category, val);
      setLimit('');
      setDialogOpen(false);
      fetchBudgets();
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'Could not save budget.'));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (budgetId) => {
    try {
      await deleteBudget(budgetId);
      setBudgets((prev) => prev.filter((b) => b._id !== budgetId));
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'Could not delete budget.'));
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 800, display: 'flex', alignItems: 'center' }}>
          <PieChartIcon sx={{ mr: 1, color: '#1a4388' }} /> Budgets
        </Typography>
        <Button
          size="small" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}
          sx={{ textTransform: 'none', fontWeight: 700 }}
        >
          Set Budget
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

      {loading ? (
        <CircularProgress size={22} />
      ) : budgets.length === 0 ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          Set a monthly budget for a spending category and we'll alert you as you approach it.
        </Typography>
      ) : (
        budgets.map((b) => <BudgetRow key={b._id} budget={b} onDelete={handleDelete} />)
      )}

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Set a Budget</DialogTitle>
        <DialogContent>
          <TextField
            select fullWidth label="Category" value={category}
            onChange={(e) => setCategory(e.target.value)} sx={{ mt: 1, mb: 2 }}
          >
            {SPENDING_CATEGORIES.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </TextField>
          <TextField
            fullWidth type="number" label="Monthly limit" value={limit}
            onChange={(e) => setLimit(e.target.value)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ textTransform: 'none' }}>Cancel</Button>
          <Button
            variant="contained" onClick={handleSave} disabled={saving}
            sx={{ textTransform: 'none', bgcolor: '#0d2144', '&:hover': { bgcolor: '#14346b' } }}
          >
            {saving ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Save budget'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Budgets;
