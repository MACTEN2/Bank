import React from 'react';
import { Box, Typography } from '@mui/material';
import WifiIcon from '@mui/icons-material/Wifi';

const formatExpiry = (createdAt) => {
  const base = createdAt ? new Date(createdAt) : new Date();
  const expiry = new Date(base.getFullYear() + 4, base.getMonth(), 1);
  const mm = String(expiry.getMonth() + 1).padStart(2, '0');
  const yy = String(expiry.getFullYear()).slice(-2);
  return `${mm}/${yy}`;
};

const DebitCard = ({ account, holderName }) => {
  const last4 = (account?._id || '0000').slice(-4).toUpperCase();

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 360,
        aspectRatio: '1.6 / 1',
        borderRadius: '20px',
        p: 2.5,
        background: 'linear-gradient(135deg, #1a4388 0%, #0d2144 55%, #061126 100%)',
        color: '#fff',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        boxShadow: '0 12px 24px rgba(13,33,68,0.35)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <Box sx={{
        position: 'absolute', top: -40, right: -40, width: 160, height: 160,
        borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.05)',
      }} />

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <Typography sx={{ fontWeight: 800, letterSpacing: 1.5, fontSize: '0.85rem' }}>STERLING BANK</Typography>
        <WifiIcon sx={{ transform: 'rotate(90deg)', opacity: 0.85 }} />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box sx={{ width: 36, height: 26, borderRadius: '6px', background: 'linear-gradient(135deg, #e0c56f, #b3924a)' }} />
      </Box>

      <Typography sx={{ fontWeight: 600, fontSize: '1.15rem', letterSpacing: 3 }}>
        •••• •••• •••• {last4}
      </Typography>

      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <Box>
          <Typography variant="caption" sx={{ opacity: 0.6, display: 'block' }}>Cardholder</Typography>
          <Typography sx={{ fontWeight: 700, letterSpacing: 1, fontSize: '0.9rem' }}>
            {(holderName || 'CUSTOMER').toUpperCase()}
          </Typography>
        </Box>
        <Box sx={{ textAlign: 'right' }}>
          <Typography variant="caption" sx={{ opacity: 0.6, display: 'block' }}>Valid thru</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: '0.9rem' }}>{formatExpiry(account?.created_at)}</Typography>
        </Box>
        <Box sx={{ display: 'flex', ml: 1 }}>
          <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.75)', mr: '-8px' }} />
          <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: 'rgba(255,255,255,0.4)' }} />
        </Box>
      </Box>
    </Box>
  );
};

export default DebitCard;
