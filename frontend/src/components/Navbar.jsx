import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [anchorEl, setAnchorEl] = useState(null);

  const handleOpenMenu = (event) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const handleLogout = () => {
    handleCloseMenu();
    logout();
    navigate('/');
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: 'rgba(11, 15, 25, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        boxShadow: 'none',
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ height: 72, justifyContent: 'space-between' }}>
          {/* Brand Logo */}
          <Box
            onClick={() => navigate('/')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
            }}
          >
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(99, 102, 241, 0.4)',
              }}
            >
              <ConfirmationNumberIcon sx={{ color: '#fff', fontSize: 24 }} />
            </Box>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.02em',
                background: 'linear-gradient(90deg, #ffffff 0%, #cbd5e1 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              EventPass
            </Typography>
          </Box>

          {/* Navigation Links */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Button
              color="inherit"
              onClick={() => navigate('/')}
              sx={{
                color: location.pathname === '/' ? '#6366f1' : 'text.secondary',
                fontWeight: location.pathname === '/' ? 700 : 500,
              }}
            >
              Explore Events
            </Button>

            {isAuthenticated && (
              <Button
                color="inherit"
                onClick={() => navigate('/my-bookings')}
                startIcon={<BookmarksIcon fontSize="small" />}
                sx={{
                  color: location.pathname === '/my-bookings' ? '#6366f1' : 'text.secondary',
                  fontWeight: location.pathname === '/my-bookings' ? 700 : 500,
                }}
              >
                My Bookings
              </Button>
            )}

            {isAdmin && (
              <Button
                color="secondary"
                variant="outlined"
                onClick={() => navigate('/admin')}
                startIcon={<AdminPanelSettingsIcon />}
                size="small"
                sx={{
                  borderRadius: 2,
                  borderColor: 'rgba(245, 158, 11, 0.4)',
                  color: '#fbbf24',
                  '&:hover': {
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.08)',
                  },
                }}
              >
                Admin Portal
              </Button>
            )}

            {/* User Profile or Sign In */}
            {isAuthenticated ? (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1 }}>
                <IconButton onClick={handleOpenMenu} sx={{ p: 0.5 }}>
                  <Avatar
                    sx={{
                      width: 38,
                      height: 38,
                      bgcolor: '#4f46e5',
                      fontWeight: 700,
                      fontSize: 15,
                    }}
                  >
                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleCloseMenu}
                  PaperProps={{
                    sx: {
                      mt: 1.5,
                      minWidth: 220,
                      backgroundColor: '#111827',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 3,
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {user?.full_name || 'Event Attendee'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                      {user?.email}
                    </Typography>
                    <Chip
                      label={user?.role}
                      size="small"
                      color={isAdmin ? 'secondary' : 'primary'}
                      sx={{ mt: 1, height: 20, fontSize: 11 }}
                    />
                  </Box>
                  <MenuItem onClick={() => { handleCloseMenu(); navigate('/my-bookings'); }}>
                    <BookmarksIcon fontSize="small" sx={{ mr: 1.5, color: '#818cf8' }} />
                    My Bookings
                  </MenuItem>
                  {isAdmin && (
                    <MenuItem onClick={() => { handleCloseMenu(); navigate('/admin'); }}>
                      <DashboardIcon fontSize="small" sx={{ mr: 1.5, color: '#fbbf24' }} />
                      Admin Dashboard
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                    <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Sign Out
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Button
                  variant="text"
                  color="inherit"
                  onClick={() => navigate('/login')}
                  sx={{ color: 'text.primary' }}
                >
                  Sign In
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/register')}
                >
                  Get Started
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
};
