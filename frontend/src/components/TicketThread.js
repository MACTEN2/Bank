import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Chip, CircularProgress } from '@mui/material';

const TicketThread = ({ ticket, isAdmin, onSendMessage, onResolve, resolving }) => {
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;
    setSending(true);
    try {
      await onSendMessage(text.trim());
      setText('');
    } finally {
      setSending(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{ticket.subject}</Typography>
          {isAdmin && (
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>{ticket.user_email}</Typography>
          )}
        </Box>
        <Chip
          label={ticket.status === 'resolved' ? 'Resolved' : 'Open'}
          size="small"
          color={ticket.status === 'resolved' ? 'success' : 'warning'}
        />
      </Box>

      <Box sx={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 1.5, mb: 2, p: 1 }}>
        {ticket.messages.map((m, i) => {
          const fromAdmin = m.sender === 'admin';
          return (
            <Box key={i} sx={{ display: 'flex', justifyContent: fromAdmin ? 'flex-end' : 'flex-start' }}>
              <Box sx={{
                maxWidth: '75%',
                bgcolor: fromAdmin ? '#0d2144' : 'action.hover',
                color: fromAdmin ? '#fff' : 'text.primary',
                borderRadius: '14px',
                px: 2, py: 1,
              }}>
                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mb: 0.3 }}>
                  {m.sender_name} · {new Date(m.created_at).toLocaleString()}
                </Typography>
                <Typography variant="body2">{m.text}</Typography>
              </Box>
            </Box>
          );
        })}
      </Box>

      <form onSubmit={handleSend}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Type a reply…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
          />
          <Button
            type="submit"
            variant="contained"
            disabled={sending || !text.trim()}
            sx={{ borderRadius: '10px', textTransform: 'none', bgcolor: '#0d2144', '&:hover': { bgcolor: '#14346b' } }}
          >
            {sending ? <CircularProgress size={18} sx={{ color: '#fff' }} /> : 'Send'}
          </Button>
        </Box>
      </form>

      {isAdmin && ticket.status !== 'resolved' && onResolve && (
        <Button
          onClick={onResolve}
          disabled={resolving}
          sx={{ mt: 2, textTransform: 'none', fontWeight: 600 }}
          color="success"
        >
          {resolving ? 'Marking resolved…' : 'Mark as resolved'}
        </Button>
      )}
    </Box>
  );
};

export default TicketThread;
