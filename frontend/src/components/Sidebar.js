import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography,
  Avatar, Divider
} from '@mui/material';
import SpaceDashboardIcon from '@mui/icons-material/SpaceDashboard';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import SettingsIcon from '@mui/icons-material/Settings';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import LightModeIcon from '@mui/icons-material/LightMode';
import { logout } from '../api/authService';
import { useThemeMode } from '../ThemeModeContext';

export const SIDEBAR_WIDTH = 236;

const navItemSx = (selected) => ({
  borderRadius: '10px',
  mb: 0.5,
  color: '#fff',
  bgcolor: selected ? 'rgba(255,255,255,0.12)' : 'transparent',
  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
});

const Sidebar = ({ variant, open, onClose }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { mode, toggleMode } = useThemeMode();
  const role = localStorage.getItem('role');
  const name = localStorage.getItem('name') || 'there';
  const firstName = name.split(' ')[0];

  const handleLogout = () => {
    logout();
    window.location.href = '/login';
  };

  const go = (path) => {
    navigate(path);
    if (variant === 'temporary') onClose();
  };

  const navItems = [
    { label: 'Dashboard', icon: <SpaceDashboardIcon />, path: '/dashboard' },
    { label: 'Support', icon: <SupportAgentIcon />, path: '/support' },
    { label: 'Settings', icon: <SettingsIcon />, path: '/settings' },
  ];

  const content = (
    <Box sx={{ width: SIDEBAR_WIDTH, height: '100%', display: 'flex', flexDirection: 'column', bgcolor: '#0d2144', color: '#fff' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, p: 2.5 }}>
        <AccountBalanceIcon />
        <Typography sx={{ fontWeight: 800, letterSpacing: 1, fontSize: '0.95rem' }}>STERLING BANK</Typography>
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <List sx={{ px: 1.5, py: 2, flexGrow: 1 }}>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => go(item.path)}
            sx={navItemSx(location.pathname === item.path)}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}

        {role === 'admin' && (
          <ListItemButton
            selected={location.pathname === '/admin/dashboard'}
            onClick={() => go('/admin/dashboard')}
            sx={navItemSx(location.pathname === '/admin/dashboard')}
          >
            <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><AdminPanelSettingsIcon /></ListItemIcon>
            <ListItemText primary="Admin Console" />
          </ListItemButton>
        )}
      </List>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.1)' }} />

      <Box sx={{ p: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5, minWidth: 0 }}>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 34, height: 34, fontSize: '0.9rem', fontWeight: 700, flexShrink: 0 }}>
            {firstName.charAt(0).toUpperCase()}
          </Avatar>
          <Box sx={{ overflow: 'hidden' }}>
            <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {name}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.6 }}>{role === 'admin' ? 'Administrator' : 'Customer'}</Typography>
          </Box>
        </Box>
        <ListItemButton onClick={toggleMode} sx={{ borderRadius: '10px', color: '#fff', mb: 0.5 }}>
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}>
            {mode === 'dark' ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText primary={mode === 'dark' ? 'Light mode' : 'Dark mode'} primaryTypographyProps={{ variant: 'body2' }} />
        </ListItemButton>
        <ListItemButton onClick={handleLogout} sx={{ borderRadius: '10px', color: '#fff' }}>
          <ListItemIcon sx={{ color: 'inherit', minWidth: 40 }}><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText primary="Logout" primaryTypographyProps={{ variant: 'body2' }} />
        </ListItemButton>
      </Box>
    </Box>
  );

  if (variant === 'permanent') {
    return (
      <Drawer
        variant="permanent"
        sx={{ width: SIDEBAR_WIDTH, flexShrink: 0, '& .MuiDrawer-paper': { width: SIDEBAR_WIDTH, border: 'none' } }}
      >
        {content}
      </Drawer>
    );
  }

  return (
    <Drawer variant="temporary" open={open} onClose={onClose} ModalProps={{ keepMounted: true }}>
      {content}
    </Drawer>
  );
};

export default Sidebar;
