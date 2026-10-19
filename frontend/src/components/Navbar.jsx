import React, { useState, useEffect } from 'react';
import {
  AppBar,
  Typography,
  Button,
  Box,
  IconButton,
  Menu,
  MenuItem,
  Avatar,
  Chip,
  InputBase,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Divider,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BookmarksIcon from '@mui/icons-material/Bookmarks';
import LogoutIcon from '@mui/icons-material/Logout';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import CampaignIcon from '@mui/icons-material/Campaign';
import MenuIcon from '@mui/icons-material/Menu';
import ExploreIcon from '@mui/icons-material/Explore';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar = () => {
  const { user, isAuthenticated, isAdmin, isOrganizer, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();

  const [anchorEl, setAnchorEl] = useState(null);
  const [navSearch, setNavSearch] = useState(searchParams.get('search') || '');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [searchModalOpen, setSearchModalOpen] = useState(false);

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

  const handleSearchSubmit = (e) => {
    if (e) e.preventDefault();
    const trimmed = navSearch.trim();
    if (location.pathname === '/events') {
      const newParams = new URLSearchParams(searchParams);
      if (trimmed) {
        newParams.set('search', trimmed);
      } else {
        newParams.delete('search');
      }
      setSearchParams(newParams);
    } else {
      if (trimmed) {
        navigate(`/events?search=${encodeURIComponent(trimmed)}`);
      } else {
        navigate('/events');
      }
    }
    setSearchModalOpen(false);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Top Black Bezel Line */}
      <Box
        sx={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          bgcolor: '#000000',
          zIndex: 1250,
        }}
      />

      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          backgroundColor: 'transparent',
          boxShadow: 'none',
          backgroundImage: 'none',
          border: 'none',
          top: 0,
          zIndex: 1200,
          display: 'flex',
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        {/* Supaste-Style Top Notch Container */}
        <Box
          sx={{
            pointerEvents: 'auto',
            position: 'relative',
            backgroundColor: '#000000',
            borderBottomLeftRadius: 18,
            borderBottomRightRadius: 18,
            boxShadow: '0 12px 32px -4px rgba(0, 0, 0, 0.6), 0 4px 12px rgba(0, 0, 0, 0.4)',
            px: { xs: 2, sm: 3, md: 3.5, lg: 4 },
            height: 50,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: { xs: 1.5, sm: 2, md: 3, lg: 3.5 },
            width: { xs: 'calc(100% - 20px)', md: 'fit-content' },
            maxWidth: { xs: '100%', md: '94vw' },
            transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        >
          {/* Left Wing (Smooth Inverted Notch Corner with overlap to eliminate subpixel seam) */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'absolute',
              top: 0,
              left: -18,
              width: 24,
              height: 18,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M0 0 C10 0 18 8 18 18 H24 V0 H0 Z" fill="#000000" />
            </svg>
          </Box>

          {/* Right Wing (Smooth Inverted Notch Corner with overlap to eliminate subpixel seam) */}
          <Box
            sx={{
              display: { xs: 'none', md: 'block' },
              position: 'absolute',
              top: 0,
              right: -18,
              width: 24,
              height: 18,
              pointerEvents: 'none',
              zIndex: 1,
            }}
          >
            <svg width="24" height="18" viewBox="0 0 24 18" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M24 0 C14 0 6 8 6 18 H0 V0 H24 Z" fill="#000000" />
            </svg>
          </Box>

          {/* Brand Logo & Name (matching Supaste icon tile & text) */}
          <Box
            onClick={() => navigate('/')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.2,
              cursor: 'pointer',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            {/* Glossy App Icon Tile */}
            <Box
              sx={{
                width: 29,
                height: 29,
                borderRadius: '8px',
                background: 'linear-gradient(180deg, #60a5fa 0%, #2563eb 50%, #1d4ed8 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'inset 0 1px 1px rgba(255, 255, 255, 0.8), 0 2px 6px rgba(0, 0, 0, 0.4)',
                position: 'relative',
                overflow: 'hidden',
                flexShrink: 0,
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: '46%',
                  background: 'linear-gradient(180deg, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.08) 100%)',
                  borderRadius: '8px 8px 0 0',
                },
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.4))' }}>
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
                <path d="M12 9v6" />
              </svg>
            </Box>

            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                fontSize: 15,
                letterSpacing: '-0.02em',
                color: '#ffffff',
                lineHeight: 1,
              }}
            >
              EventPass
            </Typography>
          </Box>

          {/* Desktop Clean Text Navigation Links (Features, FAQ style) */}
          <Box
            sx={{
              display: { xs: 'none', md: 'flex' },
              alignItems: 'center',
              gap: { md: 2.2, lg: 3 },
            }}
          >
            {/* Explore Events - Available to all */}
            <Button
              onClick={() => navigate('/events')}
              sx={{
                color: location.pathname === '/events' ? '#ffffff' : '#cbd5e1',
                fontWeight: location.pathname === '/events' ? 700 : 500,
                fontSize: 13.5,
                textTransform: 'none',
                p: 0,
                minWidth: 'auto',
                '&:hover': {
                  color: '#ffffff',
                  bgcolor: 'transparent',
                },
              }}
            >
              Explore Events
            </Button>

            {/* GUEST: Show 'Host an Event' to register as an organiser */}
            {!isAuthenticated && (
              <Button
                onClick={() => navigate('/register/organiser')}
                sx={{
                  color: location.pathname.includes('/register/organis') ? '#ffffff' : '#cbd5e1',
                  fontWeight: location.pathname.includes('/register/organis') ? 700 : 500,
                  fontSize: 13.5,
                  textTransform: 'none',
                  p: 0,
                  minWidth: 'auto',
                  '&:hover': {
                    color: '#ffffff',
                    bgcolor: 'transparent',
                  },
                }}
              >
                Host an Event
              </Button>
            )}

            {/* ATTENDEE: Only show 'My Bookings', NEVER 'Host an Event' */}
            {isAuthenticated && !isOrganizer && !isAdmin && (
              <Button
                onClick={() => navigate('/my-bookings')}
                sx={{
                  color: location.pathname === '/my-bookings' ? '#ffffff' : '#cbd5e1',
                  fontWeight: location.pathname === '/my-bookings' ? 700 : 500,
                  fontSize: 13.5,
                  textTransform: 'none',
                  p: 0,
                  minWidth: 'auto',
                  '&:hover': {
                    color: '#ffffff',
                    bgcolor: 'transparent',
                  },
                }}
              >
                My Bookings
              </Button>
            )}

            {/* ORGANISER: Show 'Organizer Hub' and 'Host an Event' */}
            {isOrganizer && (
              <>
                <Button
                  onClick={() => navigate('/organizer')}
                  sx={{
                    color: location.pathname === '/organizer' ? '#ffffff' : '#cbd5e1',
                    fontWeight: location.pathname === '/organizer' ? 700 : 500,
                    fontSize: 13.5,
                    textTransform: 'none',
                    p: 0,
                    minWidth: 'auto',
                    '&:hover': {
                      color: '#ffffff',
                      bgcolor: 'transparent',
                    },
                  }}
                >
                  Organizer Hub
                </Button>
                <Button
                  onClick={() => navigate('/organizer')}
                  sx={{
                    color: '#38bdf8',
                    fontWeight: 600,
                    fontSize: 13.5,
                    textTransform: 'none',
                    p: 0,
                    minWidth: 'auto',
                    '&:hover': {
                      color: '#7dd3fc',
                      bgcolor: 'transparent',
                    },
                  }}
                >
                  + Host Event
                </Button>
              </>
            )}

            {/* ADMIN: Show Admin Portal */}
            {isAdmin && (
              <Button
                onClick={() => navigate('/admin')}
                sx={{
                  color: location.pathname === '/admin' ? '#ffffff' : '#cbd5e1',
                  fontWeight: location.pathname === '/admin' ? 700 : 500,
                  fontSize: 13.5,
                  textTransform: 'none',
                  p: 0,
                  minWidth: 'auto',
                  '&:hover': {
                    color: '#ffffff',
                    bgcolor: 'transparent',
                  },
                }}
              >
                Admin
              </Button>
            )}

            {/* Sleek Integrated Search Bar */}
            <Box
              component="form"
              onSubmit={handleSearchSubmit}
              sx={{
                display: { xs: 'none', md: 'flex' },
                alignItems: 'center',
                backgroundColor: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.16)',
                borderRadius: '8px',
                px: 1.25,
                py: 0.25,
                width: { md: 150, lg: 180 },
                transition: 'all 0.2s ease',
                '&:focus-within': {
                  width: { md: 200, lg: 240 },
                  backgroundColor: 'rgba(255, 255, 255, 0.14)',
                  borderColor: '#38bdf8',
                },
              }}
            >
              <SearchIcon sx={{ color: '#cbd5e1', fontSize: 16, mr: 0.75 }} />
              <InputBase
                placeholder="Search..."
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                sx={{
                  fontSize: 12.5,
                  color: '#ffffff',
                  width: '100%',
                  '& input::placeholder': { color: '#94a3b8', opacity: 1 },
                }}
              />
            </Box>
          </Box>

          {/* Right Action: White Button with Black Text (matches Supaste "Download" button) */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
            {isAuthenticated ? (
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Button
                  onClick={handleOpenMenu}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    py: 0.35,
                    px: 1.2,
                    borderRadius: '8px',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    textTransform: 'none',
                    transition: 'all 0.15s ease',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.15)',
                      borderColor: 'rgba(255, 255, 255, 0.25)',
                    },
                  }}
                >
                  <Avatar
                    sx={{
                      width: 24,
                      height: 24,
                      bgcolor: '#2563eb',
                      color: '#ffffff',
                      fontWeight: 700,
                      fontSize: 11,
                    }}
                  >
                    {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'U'}
                  </Avatar>
                  <Typography
                    sx={{
                      color: '#ffffff',
                      fontWeight: 600,
                      fontSize: 13,
                      maxWidth: { xs: 90, sm: 140 },
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user?.full_name || user?.email?.split('@')[0] || 'Account'}
                  </Typography>
                  <KeyboardArrowDownIcon sx={{ color: '#94a3b8', fontSize: 16 }} />
                </Button>
                <Menu
                  anchorEl={anchorEl}
                  open={Boolean(anchorEl)}
                  onClose={handleCloseMenu}
                  slotProps={{
                    paper: {
                      sx: {
                        mt: 1.5,
                        minWidth: 220,
                        backgroundColor: '#000000',
                        color: '#ffffff',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: 2.5,
                        boxShadow: '0 20px 35px -5px rgba(0, 0, 0, 0.8)',
                        p: 0.5,
                      },
                    },
                  }}
                >
                  <Box sx={{ px: 2, py: 1.5, borderBottom: '1px solid rgba(255, 255, 255, 0.1)', mb: 0.5 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#ffffff', fontSize: 13 }}>
                      {user?.full_name || 'Event Attendee'}
                    </Typography>
                    {user?.organization_name && isOrganizer && (
                      <Typography variant="caption" sx={{ color: '#38bdf8', display: 'block', fontWeight: 600, fontSize: 11.5, mt: 0.25 }}>
                        {user.organization_name}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', fontSize: 11.5 }}>
                      {user?.email}
                    </Typography>
                    <Chip
                      label={isAdmin ? 'ADMINISTRATOR' : isOrganizer ? 'ORGANISER' : 'ATTENDEE'}
                      size="small"
                      sx={{
                        mt: 1,
                        height: 20,
                        fontSize: 10,
                        fontWeight: 800,
                        letterSpacing: '0.04em',
                        bgcolor: isAdmin ? 'rgba(245, 158, 11, 0.2)' : isOrganizer ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.12)',
                        color: isAdmin ? '#fbbf24' : isOrganizer ? '#38bdf8' : '#e2e8f0',
                        border: '1px solid',
                        borderColor: isAdmin ? 'rgba(245, 158, 11, 0.4)' : isOrganizer ? 'rgba(56, 189, 248, 0.4)' : 'rgba(255, 255, 255, 0.2)',
                      }}
                    />
                  </Box>

                  {/* ATTENDEE Profile Menu Items */}
                  {!isOrganizer && !isAdmin && (
                    <>
                      <MenuItem
                        onClick={() => { handleCloseMenu(); navigate('/my-bookings'); }}
                        sx={{ borderRadius: 1.5, color: '#cbd5e1', fontSize: 13, '&:hover': { color: '#ffffff', bgcolor: 'rgba(255,255,255,0.08)' } }}
                      >
                        <BookmarksIcon fontSize="small" sx={{ mr: 1.25, color: '#94a3b8', fontSize: 16 }} />
                        My Bookings & Passes
                      </MenuItem>
                      <MenuItem
                        onClick={() => { handleCloseMenu(); navigate('/events'); }}
                        sx={{ borderRadius: 1.5, color: '#cbd5e1', fontSize: 13, '&:hover': { color: '#ffffff', bgcolor: 'rgba(255,255,255,0.08)' } }}
                      >
                        <ExploreIcon fontSize="small" sx={{ mr: 1.25, color: '#94a3b8', fontSize: 16 }} />
                        Browse Live Events
                      </MenuItem>
                    </>
                  )}

                  {/* ORGANISER Profile Menu Items */}
                  {isOrganizer && (
                    <>
                      <MenuItem
                        onClick={() => { handleCloseMenu(); navigate('/organizer'); }}
                        sx={{ borderRadius: 1.5, color: '#cbd5e1', fontSize: 13, '&:hover': { color: '#ffffff', bgcolor: 'rgba(255,255,255,0.08)' } }}
                      >
                        <CampaignIcon fontSize="small" sx={{ mr: 1.25, color: '#38bdf8', fontSize: 16 }} />
                        Organizer Dashboard
                      </MenuItem>
                      <MenuItem
                        onClick={() => { handleCloseMenu(); navigate('/organizer'); }}
                        sx={{ borderRadius: 1.5, color: '#cbd5e1', fontSize: 13, '&:hover': { color: '#ffffff', bgcolor: 'rgba(255,255,255,0.08)' } }}
                      >
                        <ConfirmationNumberIcon fontSize="small" sx={{ mr: 1.25, color: '#38bdf8', fontSize: 16 }} />
                        + Host New Event
                      </MenuItem>
                      <MenuItem
                        onClick={() => { handleCloseMenu(); navigate('/events'); }}
                        sx={{ borderRadius: 1.5, color: '#cbd5e1', fontSize: 13, '&:hover': { color: '#ffffff', bgcolor: 'rgba(255,255,255,0.08)' } }}
                      >
                        <ExploreIcon fontSize="small" sx={{ mr: 1.25, color: '#94a3b8', fontSize: 16 }} />
                        Public Events Catalog
                      </MenuItem>
                    </>
                  )}

                  {/* ADMIN Profile Menu Items */}
                  {isAdmin && (
                    <>
                      <MenuItem
                        onClick={() => { handleCloseMenu(); navigate('/admin'); }}
                        sx={{ borderRadius: 1.5, color: '#cbd5e1', fontSize: 13, '&:hover': { color: '#ffffff', bgcolor: 'rgba(255,255,255,0.08)' } }}
                      >
                        <AdminPanelSettingsIcon fontSize="small" sx={{ mr: 1.25, color: '#f59e0b', fontSize: 16 }} />
                        Admin Console
                      </MenuItem>
                      <MenuItem
                        onClick={() => { handleCloseMenu(); navigate('/organizer'); }}
                        sx={{ borderRadius: 1.5, color: '#cbd5e1', fontSize: 13, '&:hover': { color: '#ffffff', bgcolor: 'rgba(255,255,255,0.08)' } }}
                      >
                        <DashboardIcon fontSize="small" sx={{ mr: 1.25, color: '#38bdf8', fontSize: 16 }} />
                        Organizer Hub
                      </MenuItem>
                    </>
                  )}

                  <MenuItem
                    onClick={handleLogout}
                    sx={{ color: '#f87171', borderRadius: 1.5, mt: 0.5, fontSize: 13, '&:hover': { bgcolor: 'rgba(239,68,68,0.1)' } }}
                  >
                    <LogoutIcon fontSize="small" sx={{ mr: 1.25, fontSize: 16 }} />
                    Sign Out
                  </MenuItem>
                </Menu>
              </Box>
            ) : (
              <>
                <Button
                  onClick={() => navigate('/login')}
                  sx={{
                    display: { xs: 'none', sm: 'inline-flex' },
                    color: '#94a3b8',
                    fontWeight: 500,
                    fontSize: 13,
                    textTransform: 'none',
                    p: 0,
                    minWidth: 'auto',
                    '&:hover': {
                      color: '#ffffff',
                      bgcolor: 'transparent',
                    },
                  }}
                >
                  Sign In
                </Button>

                {/* The Iconic Supaste White Button */}
                <Button
                  variant="contained"
                  onClick={() => navigate('/register')}
                  startIcon={<ConfirmationNumberIcon sx={{ fontSize: '15px !important', color: '#000000' }} />}
                  sx={{
                    backgroundColor: '#ffffff',
                    color: '#000000',
                    fontWeight: 700,
                    fontSize: 12.5,
                    textTransform: 'none',
                    px: 1.75,
                    py: 0.5,
                    height: 31,
                    borderRadius: '8px',
                    boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
                    lineHeight: 1,
                    whiteSpace: 'nowrap',
                    '&:hover': {
                      backgroundColor: '#f1f5f9',
                      boxShadow: '0 3px 10px rgba(255, 255, 255, 0.25)',
                    },
                  }}
                >
                  Register
                </Button>
              </>
            )}

            {/* Mobile Hamburger Menu Button */}
            <IconButton
              onClick={() => setMobileDrawerOpen(true)}
              sx={{
                display: { xs: 'flex', md: 'none' },
                color: '#ffffff',
                p: 0.5,
                '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.1)' },
              }}
            >
              <MenuIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </AppBar>

      {/* Mobile Dark Drawer */}
      <Drawer
        anchor="right"
        open={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        PaperProps={{
          sx: {
            width: 280,
            backgroundColor: '#000000',
            color: '#ffffff',
            borderLeft: '1px solid rgba(255, 255, 255, 0.15)',
            p: 2.5,
          },
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 26,
                height: 26,
                borderRadius: '7px',
                background: 'linear-gradient(180deg, #60a5fa 0%, #2563eb 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ConfirmationNumberIcon sx={{ color: '#ffffff', fontSize: 14 }} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', fontSize: 15 }}>
              EventPass
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => setMobileDrawerOpen(false)} sx={{ color: '#cbd5e1' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>

        {/* Mobile Search Input */}
        <Box
          component="form"
          onSubmit={handleSearchSubmit}
          sx={{
            display: 'flex',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.18)',
            borderRadius: '8px',
            px: 1.5,
            py: 0.5,
            mb: 2.5,
          }}
        >
          <SearchIcon sx={{ color: '#cbd5e1', fontSize: 17, mr: 1 }} />
          <InputBase
            fullWidth
            placeholder="Search events..."
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            sx={{ fontSize: 13, color: '#ffffff', '& input::placeholder': { color: '#94a3b8', opacity: 1 } }}
          />
        </Box>

        {/* Mobile Navigation List */}
        <List sx={{ p: 0 }}>
          <ListItem disablePadding sx={{ mb: 0.5 }}>
            <ListItemButton
              onClick={() => { setMobileDrawerOpen(false); navigate('/events'); }}
              sx={{ borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
            >
              <ExploreIcon sx={{ fontSize: 17, mr: 1.5, color: '#cbd5e1' }} />
              <ListItemText primary="Explore Events" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500, color: '#f8fafc' }} />
            </ListItemButton>
          </ListItem>

          {/* GUEST: Show 'Host an Event' */}
          {!isAuthenticated && (
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => { setMobileDrawerOpen(false); navigate('/register/organiser'); }}
                sx={{ borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
              >
                <CampaignIcon sx={{ fontSize: 17, mr: 1.5, color: '#38bdf8' }} />
                <ListItemText primary="Host an Event" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500, color: '#38bdf8' }} />
              </ListItemButton>
            </ListItem>
          )}

          {/* ATTENDEE: Only show 'My Bookings', NEVER 'Host an Event' */}
          {isAuthenticated && !isOrganizer && !isAdmin && (
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => { setMobileDrawerOpen(false); navigate('/my-bookings'); }}
                sx={{ borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
              >
                <BookmarksIcon sx={{ fontSize: 17, mr: 1.5, color: '#cbd5e1' }} />
                <ListItemText primary="My Bookings & Passes" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500, color: '#f8fafc' }} />
              </ListItemButton>
            </ListItem>
          )}

          {/* ORGANISER: Show 'Organizer Hub' and '+ Host Event' */}
          {isOrganizer && (
            <>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => { setMobileDrawerOpen(false); navigate('/organizer'); }}
                  sx={{ borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
                >
                  <CampaignIcon sx={{ fontSize: 17, mr: 1.5, color: '#38bdf8' }} />
                  <ListItemText primary="Organizer Hub" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }} />
                </ListItemButton>
              </ListItem>
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => { setMobileDrawerOpen(false); navigate('/organizer'); }}
                  sx={{ borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
                >
                  <ConfirmationNumberIcon sx={{ fontSize: 17, mr: 1.5, color: '#38bdf8' }} />
                  <ListItemText primary="+ Host Event" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500, color: '#38bdf8' }} />
                </ListItemButton>
              </ListItem>
            </>
          )}

          {/* ADMIN: Show 'Admin Portal' */}
          {isAdmin && (
            <ListItem disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => { setMobileDrawerOpen(false); navigate('/admin'); }}
                sx={{ borderRadius: 1.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}
              >
                <AdminPanelSettingsIcon sx={{ fontSize: 17, mr: 1.5, color: '#f59e0b' }} />
                <ListItemText primary="Admin Portal" primaryTypographyProps={{ fontSize: 13.5, fontWeight: 500 }} />
              </ListItemButton>
            </ListItem>
          )}
        </List>

        <Divider sx={{ my: 2.5, borderColor: 'rgba(255, 255, 255, 0.1)' }} />

        {/* Mobile Auth Buttons */}
        {!isAuthenticated ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => { setMobileDrawerOpen(false); navigate('/login'); }}
              sx={{
                borderColor: 'rgba(255,255,255,0.2)',
                color: '#ffffff',
                borderRadius: '8px',
                py: 0.75,
                fontWeight: 600,
                fontSize: 13,
                textTransform: 'none',
                '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255,255,255,0.06)' },
              }}
            >
              Sign In
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={() => { setMobileDrawerOpen(false); navigate('/register'); }}
              sx={{
                backgroundColor: '#ffffff',
                color: '#000000',
                borderRadius: '8px',
                py: 0.75,
                fontWeight: 700,
                fontSize: 13,
                textTransform: 'none',
                '&:hover': { backgroundColor: '#f1f5f9' },
              }}
            >
              Register
            </Button>
          </Box>
        ) : (
          <Button
            fullWidth
            onClick={handleLogout}
            sx={{
              color: '#f87171',
              borderRadius: '8px',
              py: 0.75,
              border: '1px solid rgba(239, 68, 68, 0.3)',
              textTransform: 'none',
              fontWeight: 600,
              fontSize: 13,
              '&:hover': { bgcolor: 'rgba(239, 68, 68, 0.1)' },
            }}
          >
            Sign Out
          </Button>
        )}
      </Drawer>
    </>
  );
};
