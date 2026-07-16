import React, { useState } from 'react';
import { Box, AppBar, Toolbar, IconButton, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from './Sidebar';
import NotificationBell from './NotificationBell';
import ChatWidget from './ChatWidget';

const DashboardLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width:900px)');
  const isAdmin = localStorage.getItem('role') === 'admin';

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {!isDesktop && (
        <AppBar position="fixed" elevation={0} sx={{ bgcolor: '#0d2144' }}>
          <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ color: '#fff' }}>
              <NotificationBell />
            </Box>
          </Toolbar>
        </AppBar>
      )}

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, ...(!isDesktop && { mt: '48px' }) }}>
        {isDesktop && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', px: 3, pt: 2 }}>
            <NotificationBell />
          </Box>
        )}
        {children}
      </Box>

      {!isAdmin && <ChatWidget />}
    </Box>
  );
};

export default DashboardLayout;
