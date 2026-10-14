import React, { useState, useEffect } from 'react';
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
  InputBase,
  Collapse,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [anchorEl, setAnchorEl] = useState(null);
  const [navSearch, setNavSearch] = useState(searchParams.get('search') || '');
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  useEffect(() => {
    const urlQuery = searchParams.get('search') || '';
    if (urlQuery !== navSearch) {
      setNavSearch(urlQuery);
    }
  }, [searchParams]);

  const handleOpenMenu = (event) => setAnchorEl(event.currentTarget);
  const handleCloseMenu = () => setAnchorEl(null);

  const handleLogout = () => {
    handleCloseMenu();
    logout();
    navigate('/');
  };

  const handleSearchChange = (value) => {
    setNavSearch(value);
    const trimmed = value.trim();
    if (location.pathname === '/') {
      const newParams = new URLSearchParams(searchParams);
      if (trimmed) {
        newParams.set('search', trimmed);
      } else {
        newParams.delete('search');
      }
      setSearchParams(newParams, { replace: true });
    } else {
      if (trimmed) {
        navigate(`/?search=${encodeURIComponent(trimmed)}`, { replace: false });
      }
    }
  };

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = navSearch.trim();
    if (location.pathname === '/') {
      const newParams = new URLSearchParams(searchParams);
      if (trimmed) {
        newParams.set('search', trimmed);
      } else {
        newParams.delete('search');
      }
      setSearchParams(newParams);
    } else {
      if (trimmed) {
        navigate(`/?search=${encodeURIComponent(trimmed)}`);
      } else {
        navigate('/');
      }
    }
    setMobileSearchOpen(false);
  };

  const handleClearSearch = () => {
    setNavSearch('');
    if (location.pathname === '/') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('search');
      setSearchParams(newParams, { replace: true });
    } else {
      navigate('/');
    }
  };

  return (
    <AppBar
      position="sticky"
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid #e2e8f0',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.03)',
        color: '#0f172a',
        zIndex: 1100,
      }}
    >
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ height: 74, justifyContent: 'space-between', gap: 2 }}>
          {/* Luxury Brand Logo */}
          <Box
            onClick={() => navigate('/')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              cursor: 'pointer',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 14px rgba(15, 23, 42, 0.18)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            >
              <ConfirmationNumberIcon sx={{ color: '#f8fafc', fontSize: 22 }} />
            </Box>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: 800,
                    fontSize: '1.25rem',
                    letterSpacing: '-0.03em',
                    color: '#0f172a',
                    lineHeight: 1,
                  }}
                >
                  EventPass
                </Typography>
                <Chip
                  icon={<CurrencyRupeeIcon sx={{ fontSize: '11px !important', color: '#0f172a !important' }} />}
                  label="INR"
                  size="small"
                  sx={{
                    height: 18,
                    fontSize: 10,
                    fontWeight: 700,
                    backgroundColor: '#f1f5f9',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              </Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>
                Tickets & Live Experiences
              </Typography>
            </Box>
          </Box>

          {/* Centered Luxury Search Bar (Desktop / Tablet) */}
          <Box
            component="form"
            onSubmit={handleSearchSubmit}
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              flexGrow: 1,
              maxWidth: 420,
              mx: 2,
              px: 2,
              py: 0.75,
              borderRadius: '9999px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              transition: 'all 0.2s ease-in-out',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.02)',
              '&:hover': {
                borderColor: '#cbd5e1',
                backgroundColor: '#ffffff',
                boxShadow: '0 2px 8px rgba(15, 23, 42, 0.06)',
              },
              '&:focus-within': {
                borderColor: '#0f172a',
                backgroundColor: '#ffffff',
                boxShadow: '0 0 0 3px rgba(15, 23, 42, 0.08)',
              },
            }}
          >
            <SearchIcon sx={{ color: '#94a3b8', fontSize: 20, mr: 1, flexShrink: 0 }} />
            <InputBase
              placeholder="Search concerts, tech, comedy, artists..."
              value={navSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              sx={{
                fontSize: 13.5,
                color: '#0f172a',
                width: '100%',
                fontWeight: 500,
                '& input::placeholder': {
                  color: '#94a3b8',
                  opacity: 1,
                },
              }}
            />
            {navSearch ? (
              <IconButton size="small" onClick={handleClearSearch} sx={{ p: 0.25, color: '#94a3b8' }}>
                <CloseIcon sx={{ fontSize: 16 }} />
              </IconButton>
            ) : (
              <Chip
                label="↵"
                size="small"
                sx={{
                  height: 18,
                  fontSize: 11,
                  fontWeight: 700,
                  bgcolor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  color: '#94a3b8',
                  borderRadius: 1,
                  px: 0.5,
                }}
              />
            )}
          </Box>

          {/* Navigation Links & User Menu */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            {/* Mobile Search Toggle */}
            <IconButton
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              sx={{
                display: { xs: 'flex', md: 'none' },
                color: '#0f172a',
                bgcolor: mobileSearchOpen ? '#f1f5f9' : 'transparent',
                border: '1px solid #e2e8f0',
                p: 1,
              }}
            >
              {mobileSearchOpen ? <CloseIcon fontSize="small" /> : <SearchIcon fontSize="small" />}
            </IconButton>

            <Button
              onClick={() => navigate('/')}
              sx={{
                color: location.pathname === '/' ? '#0f172a' : '#64748b',
                fontWeight: location.pathname === '/' ? 700 : 500,
                backgroundColor: location.pathname === '/' ? '#f8fafc' : 'transparent',
                border: location.pathname === '/' ? '1px solid #e2e8f0' : '1px solid transparent',
                borderRadius: 2.5,
                px: 2,
                display: { xs: 'none', sm: 'inline-flex' },
                '&:hover': {
                  backgroundColor: '#f1f5f9',
                  color: '#0f172a',
                },
              }}
            >
              Explore Events
            </Button>

            {isAuthenticated && (
              <Button
                onClick={() => navigate('/my-bookings')}
                startIcon={<BookmarksIcon fontSize="small" sx={{ color: '#64748b' }} />}
                sx={{
                  color: location.pathname === '/my-bookings' ? '#0f172a' : '#64748b',
                  fontWeight: location.pathname === '/my-bookings' ? 700 : 500,
                  backgroundColor: location.pathname === '/my-bookings' ? '#f8fafc' : 'transparent',
                  border: location.pathname === '/my-bookings' ? '1px solid #e2e8f0' : '1px solid transparent',
                  borderRadius: 2.5,
                  px: 2,
                  '&:hover': {
                    backgroundColor: '#f1f5f9',
                    color: '#0f172a',
                  },
                }}
              >
                My Bookings
              </Button>
            )}

            {isAdmin && (
              <Button
                variant="outlined"
                onClick={() => navigate('/admin')}
                startIcon={<AdminPanelSettingsIcon sx={{ fontSize: 18 }} />}
                size="small"
                sx={{
                  borderRadius: 2.5,
                  borderColor: '#cbd5e1',
                  color: '#0f172a',
                  backgroundColor: '#ffffff',
                  fontWeight: 600,
                  '&:hover': {
                    borderColor: '#0f172a',
                    backgroundColor: '#f8fafc',
                  },
                }}
              >
                Admin Portal
              </Button>
            )}

            {/* User Profile or Sign In */}
            {isAuthenticated ? (
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 0.5 }}>
                <IconButton onClick={handleOpenMenu} sx={{ p: 0.5 }}>
                  <Avatar
                    sx={{
                      width: 40,
                      height: 40,
                      bgcolor: '#0f172a',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 15,
                      border: '2px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    }}
                  >
                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </Avatar>
                </IconButton>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleCloseMenu}
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 1.5,
                        minWidth: 230,
                        backgroundColor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 3,
                        boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.1)',
                        p: 0.5,
                      },
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid #f1f5f9', mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                      {user?.full_name || 'Event Attendee'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      {user?.email}
                    </Typography>
                    <Chip
                      label={user?.role}
                      size="small"
                      sx={{
                        mt: 1,
                        height: 20,
                        fontSize: 11,
                        fontWeight: 700,
                        bgcolor: user?.role === 'ADMIN' ? '#fef3c7' : '#f1f5f9',
                        color: user?.role === 'ADMIN' ? '#92400e' : '#334155',
                        border: '1px solid #e2e8f0',
                      }}
                    />
                  </Box>
                  <MenuItem onClick={() => { handleCloseMenu(); navigate('/my-bookings'); }} sx={{ borderRadius: 2 }}>
                    <BookmarksIcon fontSize="small" sx={{ mr: 1.5, color: '#64748b' }} />
                    My Bookings
                  </MenuItem>
                  {isAdmin && (
                    <MenuItem onClick={() => { handleCloseMenu(); navigate('/admin'); }} sx={{ borderRadius: 2 }}>
                      <DashboardIcon fontSize="small" sx={{ mr: 1.5, color: '#0f172a' }} />
                      Admin Dashboard
                    </MenuItem>
                  )}
                  <MenuItem onClick={handleLogout} sx={{ color: '#dc2626', borderRadius: 2, mt: 0.5 }}>
                    <LogoutIcon fontSize="small" sx={{ mr: 1.5 }} />
                    Sign Out
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, ml: 1 }}>
                <Button
                  onClick={() => navigate('/login')}
                  sx={{
                    color: '#0f172a',
                    fontWeight: 600,
                    px: 2,
                    '&:hover': { backgroundColor: '#f1f5f9' },
                  }}
                >
                  Sign In
                </Button>
                <Button
                  variant="contained"
                  color="primary"
                  onClick={() => navigate('/register')}
                  sx={{
                    backgroundColor: '#f5f5f5',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0',
                    fontWeight: 700,
                    px: 2.5,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.04)',
                    '&:hover': {
                      backgroundColor: '#e5e5e5',
                      borderColor: '#cbd5e1',
                    },
                  }}
                >
                  Get Started
                </Button>
              </Box>
            )}
          </Box>
        </Toolbar>

        {/* Collapsible Mobile Search Bar */}
        <Collapse in={mobileSearchOpen}>
          <Box
            component="form"
            onSubmit={handleSearchSubmit}
            sx={{
              display: { xs: 'flex', md: 'none' },
              alignItems: 'center',
              pb: 2,
              pt: 0.5,
            }}
          >
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                width: '100%',
                px: 2,
                py: 0.75,
                borderRadius: '9999px',
                backgroundColor: '#f8fafc',
                border: '1px solid #e2e8f0',
              }}
            >
              <SearchIcon sx={{ color: '#94a3b8', fontSize: 18, mr: 1 }} />
              <InputBase
                fullWidth
                placeholder="Search concerts, tech, comedy..."
                value={navSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                sx={{ fontSize: 13, color: '#0f172a' }}
              />
              {navSearch && (
                <IconButton size="small" onClick={handleClearSearch} sx={{ p: 0.25, color: '#94a3b8' }}>
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              )}
            </Box>
          </Box>
        </Collapse>
      </Container>
    </AppBar>
  );
};
