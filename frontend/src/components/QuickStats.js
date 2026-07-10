import React, { useMemo } from 'react';
import { Grid, Paper, Typography, Box } from '@mui/material';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';

const isCreditType = (t) => t === 'deposit' || t === 'admin_credit';
const isDebitType = (t) => t === 'withdrawal' || t === 'admin_debit';

const StatTile = ({ label, value, icon, tone }) => (
  <Paper elevation={0} sx={{ p: 2.5, borderRadius: '20px', border: '1px solid', borderColor: 'divider', height: '100%' }}>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
      <Box sx={{
        width: 32, height: 32, borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: tone === 'good' ? 'rgba(46,125,50,0.1)' : tone === 'bad' ? 'rgba(211,47,47,0.1)' : 'rgba(13,33,68,0.08)',
        color: tone === 'good' ? '#2e7d32' : tone === 'bad' ? '#d32f2f' : '#0d2144',
      }}>
        {icon}
      </Box>
      <Typography variant="body2" sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
    </Box>
    <Typography variant="h5" sx={{ fontWeight: 800 }}>
      ${value.toLocaleString(undefined, { minimumFractionDigits: 2 })}
    </Typography>
  </Paper>
);

const QuickStats = ({ transactions }) => {
  const { income, expenses, net } = useMemo(() => {
    const now = new Date();
    const monthTx = (transactions || []).filter((tx) => {
      const d = new Date(tx.created_at);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const inc = monthTx.filter((t) => isCreditType(t.txn_type)).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    const exp = monthTx.filter((t) => isDebitType(t.txn_type)).reduce((s, t) => s + Math.abs(t.amount || 0), 0);
    return { income: inc, expenses: exp, net: inc - exp };
  }, [transactions]);

  const monthLabel = new Date().toLocaleDateString(undefined, { month: 'long' });

  return (
    <Grid container spacing={2} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={4}>
        <StatTile label={`${monthLabel} income`} value={income} icon={<ArrowUpwardIcon fontSize="small" />} tone="good" />
      </Grid>
      <Grid item xs={12} sm={4}>
        <StatTile label={`${monthLabel} expenses`} value={expenses} icon={<ArrowDownwardIcon fontSize="small" />} tone="bad" />
      </Grid>
      <Grid item xs={12} sm={4}>
        <StatTile label="Net change" value={net} icon={<TrendingUpIcon fontSize="small" />} tone={net >= 0 ? 'good' : 'bad'} />
      </Grid>
    </Grid>
  );
};

export default QuickStats;
