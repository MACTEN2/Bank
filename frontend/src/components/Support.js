import React, { useState, useEffect, useCallback } from 'react';
import {
  Container, Typography, Paper, TextField, Button, Alert,
  CircularProgress, Grid, List, ListItemButton,
  ListItemText, Chip, Dialog, DialogContent
} from '@mui/material';
import { createTicket, getMyTickets, addTicketMessage } from '../api/ticketService';
import { getAxiosErrorMessage } from '../utils/apiError';
import TicketThread from './TicketThread';
import { useThemeMode, headingColor } from '../ThemeModeContext';
import DashboardLayout from './DashboardLayout';

const Support = () => {
  const { mode } = useThemeMode();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState(null);

  const fetchTickets = useCallback(async () => {
    try {
      const res = await getMyTickets();
      setTickets(res.data);
    } catch (err) {
      setCreateMsg({ type: 'error', text: 'Could not load your support tickets.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const handleCreateTicket = async (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setCreating(true);
    setCreateMsg(null);
    try {
      await createTicket(subject.trim(), message.trim());
      setSubject('');
      setMessage('');
      setCreateMsg({ type: 'success', text: 'Your message has been sent to our support team.' });
      fetchTickets();
    } catch (err) {
      setCreateMsg({ type: 'error', text: getAxiosErrorMessage(err, 'Could not send your message.') });
    } finally {
      setCreating(false);
    }
  };

  const handleSendMessage = async (text) => {
    const res = await addTicketMessage(selectedTicket._id, text);
    setSelectedTicket(res.data);
    setTickets((prev) => prev.map((t) => (t._id === res.data._id ? res.data : t)));
  };

  return (
    <DashboardLayout>
      <Container maxWidth="md" sx={{ py: 6 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, color: headingColor(mode), mb: 1 }}>Support</Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
          Have a question or an issue with your account? Send us a message and our team will follow up here.
        </Typography>

        <Grid container spacing={4}>
          <Grid item xs={12} md={5}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>New message</Typography>
              {createMsg && <Alert severity={createMsg.type} sx={{ mb: 2, borderRadius: '10px' }}>{createMsg.text}</Alert>}
              <form onSubmit={handleCreateTicket}>
                <TextField
                  fullWidth label="Subject" value={subject} onChange={(e) => setSubject(e.target.value)}
                  required sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
                <TextField
                  fullWidth multiline minRows={4} label="How can we help?" value={message}
                  onChange={(e) => setMessage(e.target.value)} required
                  sx={{ mb: 2, '& .MuiOutlinedInput-root': { borderRadius: '12px' } }}
                />
                <Button
                  type="submit" variant="contained" disabled={creating}
                  sx={{ borderRadius: '12px', fontWeight: 700, textTransform: 'none', bgcolor: '#0d2144', '&:hover': { bgcolor: '#14346b' } }}
                >
                  {creating ? <CircularProgress size={22} sx={{ color: '#fff' }} /> : 'Send message'}
                </Button>
              </form>
            </Paper>
          </Grid>

          <Grid item xs={12} md={7}>
            <Paper elevation={0} sx={{ p: 3, borderRadius: '20px', border: '1px solid', borderColor: 'divider' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>Your conversations</Typography>
              {loading ? (
                <CircularProgress size={24} />
              ) : tickets.length === 0 ? (
                <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                  You haven't contacted support yet.
                </Typography>
              ) : (
                <List sx={{ p: 0 }}>
                  {tickets.map((t) => (
                    <ListItemButton
                      key={t._id}
                      onClick={() => setSelectedTicket(t)}
                      sx={{ borderRadius: '12px', mb: 1, border: '1px solid', borderColor: 'divider' }}
                    >
                      <ListItemText
                        primary={t.subject}
                        secondary={new Date(t.updated_at).toLocaleString()}
                      />
                      <Chip
                        label={t.status === 'resolved' ? 'Resolved' : 'Open'}
                        size="small"
                        color={t.status === 'resolved' ? 'success' : 'warning'}
                      />
                    </ListItemButton>
                  ))}
                </List>
              )}
            </Paper>
          </Grid>
        </Grid>
      </Container>

      <Dialog open={!!selectedTicket} onClose={() => setSelectedTicket(null)} maxWidth="sm" fullWidth>
        {selectedTicket && (
          <DialogContent>
            <TicketThread ticket={selectedTicket} isAdmin={false} onSendMessage={handleSendMessage} />
          </DialogContent>
        )}
      </Dialog>
    </DashboardLayout>
  );
};

export default Support;
