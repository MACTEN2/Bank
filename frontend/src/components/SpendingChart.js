import React, { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { useThemeMode } from '../ThemeModeContext';

// Categorical palette, fixed order (slot 1 = blue, slot 2 = aqua) — see the
// dataviz skill's color-formula: hue order never changes. Dark-mode steps
// are the skill's own validated dark set (re-validated against the #1a1a19
// dark surface), not an automatic flip of the light hex values.
const PALETTE = {
  light: { deposit: '#2a78d6', withdrawal: '#1baf7a', gridline: '#e1e0d9', mutedText: '#898781', primaryInk: '#0b0b0b' },
  dark: { deposit: '#3987e5', withdrawal: '#199e70', gridline: '#2c2c2a', mutedText: '#898781', primaryInk: '#ffffff' },
};

const DAY_MS = 24 * 60 * 60 * 1000;

const buildLastNDays = (n) => {
  const days = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    days.push(new Date(today.getTime() - i * DAY_MS));
  }
  return days;
};

const dayKey = (d) => d.toISOString().slice(0, 10);

const SpendingChart = ({ transactions }) => {
  const { mode } = useThemeMode();
  const colors = PALETTE[mode];
  const [hovered, setHovered] = useState(null); // { dayIndex, series }

  const { days, maxValue, totals } = useMemo(() => {
    const daysList = buildLastNDays(7);
    const byDay = Object.fromEntries(daysList.map((d) => [dayKey(d), { deposit: 0, withdrawal: 0 }]));

    (transactions || []).forEach((tx) => {
      const key = tx.created_at ? new Date(tx.created_at).toISOString().slice(0, 10) : null;
      if (key && byDay[key] && (tx.txn_type === 'deposit' || tx.txn_type === 'withdrawal')) {
        byDay[key][tx.txn_type] += Math.abs(tx.amount || 0);
      }
    });

    const merged = daysList.map((d) => ({ date: d, ...byDay[dayKey(d)] }));
    const max = Math.max(1, ...merged.flatMap((d) => [d.deposit, d.withdrawal]));
    const totalDeposits = merged.reduce((s, d) => s + d.deposit, 0);
    const totalWithdrawals = merged.reduce((s, d) => s + d.withdrawal, 0);

    return { days: merged, maxValue: max, totals: { deposit: totalDeposits, withdrawal: totalWithdrawals } };
  }, [transactions]);

  const fmt = (n) => `$${n.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5 }}>Spending Overview</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
        Deposits vs. withdrawals over the last 7 days
      </Typography>

      {/* Plot area */}
      <Box sx={{ position: 'relative', height: 160, display: 'flex', alignItems: 'flex-end', gap: 2, px: 1 }}>
        {/* zero baseline */}
        <Box sx={{ position: 'absolute', left: 0, right: 0, bottom: 24, borderTop: `1px solid ${colors.gridline}` }} />

        {days.map((d, i) => {
          const depH = Math.round((d.deposit / maxValue) * 120);
          const witH = Math.round((d.withdrawal / maxValue) * 120);
          const label = d.date.toLocaleDateString(undefined, { weekday: 'short' });
          return (
            <Box key={i} sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 120 }}>
                {/* Deposit bar */}
                <Box
                  onPointerEnter={() => setHovered({ i, series: 'deposit' })}
                  onPointerLeave={() => setHovered(null)}
                  sx={{
                    width: 14,
                    height: Math.max(depH, d.deposit > 0 ? 3 : 0),
                    bgcolor: colors.deposit,
                    borderRadius: '4px 4px 0 0',
                    opacity: hovered && hovered.i === i && hovered.series !== 'deposit' ? 0.5 : 1,
                    transition: 'opacity 0.15s',
                    cursor: 'pointer',
                  }}
                />
                {/* Withdrawal bar */}
                <Box
                  onPointerEnter={() => setHovered({ i, series: 'withdrawal' })}
                  onPointerLeave={() => setHovered(null)}
                  sx={{
                    width: 14,
                    height: Math.max(witH, d.withdrawal > 0 ? 3 : 0),
                    bgcolor: colors.withdrawal,
                    borderRadius: '4px 4px 0 0',
                    opacity: hovered && hovered.i === i && hovered.series !== 'withdrawal' ? 0.5 : 1,
                    transition: 'opacity 0.15s',
                    cursor: 'pointer',
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: colors.mutedText, mt: 0.5 }}>{label}</Typography>
              {hovered && hovered.i === i && (
                <Box sx={{
                  position: 'absolute', bottom: 150, bgcolor: '#0d2144', color: '#fff',
                  px: 1.2, py: 0.6, borderRadius: '8px', fontSize: '0.75rem', whiteSpace: 'nowrap',
                }}>
                  <strong>{fmt(hovered.series === 'deposit' ? d.deposit : d.withdrawal)}</strong>
                  {' '}{hovered.series === 'deposit' ? 'deposited' : 'withdrawn'}
                </Box>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Legend + relief totals (visible without hovering, per contrast-relief rule) */}
      <Box sx={{ display: 'flex', gap: 3, mt: 3, flexWrap: 'wrap' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: colors.deposit }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Deposits <strong style={{ color: colors.primaryInk }}>{fmt(totals.deposit)}</strong>
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '2px', bgcolor: colors.withdrawal }} />
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Withdrawals <strong style={{ color: colors.primaryInk }}>{fmt(totals.withdrawal)}</strong>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};

export default SpendingChart;
