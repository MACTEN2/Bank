import React, { useState } from 'react';
import { Box, AppBar, Toolbar, IconButton, useMediaQuery } from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import Sidebar from './Sidebar';

const DashboardLayout = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isDesktop = useMediaQuery('(min-width:900px)');

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Sidebar
        variant={isDesktop ? 'permanent' : 'temporary'}
        open={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />

      {!isDesktop && (
        <AppBar position="fixed" elevation={0} sx={{ bgcolor: '#0d2144' }}>
          <Toolbar variant="dense">
            <IconButton color="inherit" edge="start" onClick={() => setMobileOpen(true)}>
              <MenuIcon />
            </IconButton>
          </Toolbar>
        </AppBar>
      )}

      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, ...(!isDesktop && { mt: '48px' }) }}>
        {children}
      </Box>
    </Box>
  );
};

export default DashboardLayout;
