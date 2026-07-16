import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Fab, Paper, Box, Typography, IconButton, TextField, CircularProgress, Alert
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { sendChatMessage } from '../api/chatService';
import { getAxiosErrorMessage } from '../utils/apiError';

const GREETING = "Hi, I'm the Sterling Bank assistant. Ask me about your balance, recent activity, or how a feature works — and I'll bring in a human via a support ticket if you need one.";

const ChatWidget = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [ticket, setTicket] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  const handleSend = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;

    const nextMessages = [...messages, { role: 'user', content: text }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError('');

    try {
      const res = await sendChatMessage(nextMessages);
      setMessages([...nextMessages, { role: 'assistant', content: res.data.reply }]);
      if (res.data.ticket) setTicket(res.data.ticket);
    } catch (err) {
      setError(getAxiosErrorMessage(err, 'The assistant is unavailable right now.'));
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ position: 'fixed', bottom: 24, right: 24, zIndex: 1300 }}>
      {open && (
        <Paper
          elevation={8}
          sx={{
            width: 340, height: 460, mb: 2, borderRadius: '18px', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}
        >
          <Box sx={{ bgcolor: '#0d2144', color: '#fff', px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SupportAgentIcon fontSize="small" />
              <Typography sx={{ fontWeight: 700, fontSize: '0.95rem' }}>Support Assistant</Typography>
            </Box>
            <IconButton size="small" onClick={() => setOpen(false)} sx={{ color: '#fff' }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>

          <Box ref={scrollRef} sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5, display: 'flex', flexDirection: 'column', gap: 1 }}>
            {messages.map((m, i) => (
              <Box key={i} sx={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
                <Box sx={{
                  maxWidth: '85%', borderRadius: '12px', px: 1.5, py: 1,
                  bgcolor: m.role === 'user' ? '#0d2144' : 'action.hover',
                  color: m.role === 'user' ? '#fff' : 'text.primary',
                }}>
                  <Typography variant="body2">{m.content}</Typography>
                </Box>
              </Box>
            ))}
            {sending && (
              <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                <CircularProgress size={18} />
              </Box>
            )}
            {ticket && (
              <Alert severity="success" sx={{ borderRadius: '10px', fontSize: '0.8rem' }}>
                Ticket "{ticket.subject}" created —{' '}
                <Box
                  component="span"
                  sx={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 700 }}
                  onClick={() => navigate('/support')}
                >
                  follow up in Support
                </Box>.
              </Alert>
            )}
            {error && <Alert severity="error" sx={{ borderRadius: '10px', fontSize: '0.8rem' }}>{error}</Alert>}
          </Box>

          <Box component="form" onSubmit={handleSend} sx={{ display: 'flex', gap: 1, p: 1.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <TextField
              fullWidth size="small" placeholder="Ask a question…" value={input}
              onChange={(e) => setInput(e.target.value)} disabled={sending}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
            />
            <IconButton type="submit" disabled={sending || !input.trim()} sx={{ bgcolor: '#0d2144', color: '#fff', '&:hover': { bgcolor: '#14346b' } }}>
              <SendIcon fontSize="small" />
            </IconButton>
          </Box>
        </Paper>
      )}

      <Fab
        onClick={() => setOpen((prev) => !prev)}
        sx={{ bgcolor: '#0d2144', color: '#fff', '&:hover': { bgcolor: '#14346b' } }}
      >
        {open ? <CloseIcon /> : <ChatIcon />}
      </Fab>
    </Box>
  );
};

export default ChatWidget;
