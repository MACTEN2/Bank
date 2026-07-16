import React, { useState, useEffect, useCallback } from 'react';
import {
  IconButton, Badge, Menu, Box, Typography, Button, Divider, CircularProgress
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import {
  getMyNotifications, getUnreadNotificationCount, markNotificationRead, markAllNotificationsRead
} from '../api/notificationService';

const NotificationBell = () => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await getUnreadNotificationCount();
      setUnreadCount(res.data.unread_count);
    } catch (err) {
      // Silently ignore — the bell just won't show a badge this cycle.
    }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const handleOpen = async (e) => {
    setAnchorEl(e.currentTarget);
    setLoading(true);
    try {
      const res = await getMyNotifications();
      setNotifications(res.data);
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => setAnchorEl(null);

  const handleMarkRead = async (id) => {
    setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)));
    setUnreadCount((prev) => Math.max(0, prev - 1));
    await markNotificationRead(id);
  };

  const handleMarkAllRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    setUnreadCount(0);
    await markAllNotificationsRead();
  };

  return (
    <>
      <IconButton onClick={handleOpen} color="inherit">
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={!!anchorEl}
        onClose={handleClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 360, maxHeight: 420, borderRadius: '14px' } }}
      >
        <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 700 }}>Notifications</Typography>
          {unreadCount > 0 && (
            <Button size="small" onClick={handleMarkAllRead} sx={{ textTransform: 'none' }}>
              Mark all read
            </Button>
          )}
        </Box>
        <Divider />
        {loading ? (
          <Box sx={{ p: 3, textAlign: 'center' }}><CircularProgress size={22} /></Box>
        ) : notifications.length === 0 ? (
          <Box sx={{ p: 3 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>You're all caught up.</Typography>
          </Box>
        ) : (
          notifications.map((n) => (
            <Box
              key={n._id}
              onClick={() => !n.read && handleMarkRead(n._id)}
              sx={{
                px: 2, py: 1.25, cursor: n.read ? 'default' : 'pointer',
                bgcolor: n.read ? 'transparent' : 'action.hover',
                borderBottom: '1px solid', borderColor: 'divider',
                '&:hover': { bgcolor: 'action.hover' },
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{n.title}</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>{n.message}</Typography>
              <Typography variant="caption" sx={{ color: 'text.disabled' }}>
                {new Date(n.created_at).toLocaleString()}
              </Typography>
            </Box>
          ))
        )}
      </Menu>
    </>
  );
};

export default NotificationBell;
