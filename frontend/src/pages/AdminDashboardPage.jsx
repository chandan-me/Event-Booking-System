import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Grid,
  Collapse,
  InputAdornment,
  Divider,
  Avatar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import DnsIcon from '@mui/icons-material/Dns';
import StorageIcon from '@mui/icons-material/Storage';
import HubIcon from '@mui/icons-material/Hub';
import EmailIcon from '@mui/icons-material/Email';
import SpeedIcon from '@mui/icons-material/Speed';
import SecurityIcon from '@mui/icons-material/Security';
import CloseIcon from '@mui/icons-material/Close';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import GridViewIcon from '@mui/icons-material/GridView';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import LogoutIcon from '@mui/icons-material/Logout';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import { eventsApi } from '../api/eventsApi';
import { bookingsApi } from '../api/bookingsApi';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';

export const AdminDashboardPage = () => {
  const { enqueueSnackbar } = useSnackbar();
  const { user, logout } = useAuth();

  const [currentTab, setCurrentTab] = useState(0);

  // Events State
  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Bookings State
  const [allBookings, setAllBookings] = useState([]);
  const [loadingBookings, setLoadingBookings] = useState(false);

  // Health State
  const [healthData, setHealthData] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(false);

  // Waiting List State
  const [waitingList, setWaitingList] = useState([]);
  const [loadingWaitingList, setLoadingWaitingList] = useState(false);

  // Separate Section State for Event Creation (No popup)
  const [showCreateSection, setShowCreateSection] = useState(false);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const initialEventForm = {
    title: '',
    description: '',
    category_id: '',
    venue: '',
    venue_address: '',
    start_time: '',
    end_time: '',
    total_capacity: 100,
    ticket_price: 999,
  };
  const [eventForm, setEventForm] = useState(initialEventForm);

  // Dialog State for Category Creation
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [submittingCat, setSubmittingCat] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', slug: '', description: '' });

  const fetchEventsAndCategories = async () => {
    setLoadingEvents(true);
    try {
      const [eventsRes, catsRes] = await Promise.all([
        eventsApi.getEvents({ limit: 100 }),
        eventsApi.getCategories(),
      ]);
      if (eventsRes.success && eventsRes.data) {
        setEvents(eventsRes.data.items || eventsRes.data.events || []);
      }
      if (catsRes.success && catsRes.data) {
        setCategories(catsRes.data.items || catsRes.data || []);
      }
    } catch (err) {
      enqueueSnackbar('Failed to load events data', { variant: 'error' });
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await bookingsApi.getAllBookingsAdmin({ limit: 100 });
      if (res.success && res.data) {
        setAllBookings(res.data.items || res.data.bookings || []);
      }
    } catch (err) {
      enqueueSnackbar('Failed to fetch system bookings', { variant: 'error' });
    } finally {
      setLoadingBookings(false);
    }
  };

  const fetchPlatformHealth = async () => {
    setLoadingHealth(true);
    try {
      const res = await bookingsApi.getAdminDashboard();
      if (res.success) {
        setHealthData(res.data);
      }
    } catch (err) {
      enqueueSnackbar('Could not ping microservices health probe', { variant: 'warning' });
    } finally {
      setLoadingHealth(false);
    }
  };

  const fetchWaitingListAdmin = async () => {
    setLoadingWaitingList(true);
    try {
      const res = await bookingsApi.getAdminWaitingList();
      if (res && res.success) {
        setWaitingList(res.data?.items || res.data || []);
      }
    } catch (err) {
      console.warn('Could not fetch admin waitlist:', err);
    } finally {
      setLoadingWaitingList(false);
    }
  };

  useEffect(() => {
    if (currentTab === 0) fetchEventsAndCategories();
    if (currentTab === 1) fetchBookings();
    if (currentTab === 2) fetchPlatformHealth();
    if (currentTab === 3) fetchWaitingListAdmin();
  }, [currentTab]);

  useEffect(() => {
    fetchWaitingListAdmin();
  }, []);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setSubmittingEvent(true);
    try {
      const desc =
        eventForm.description && eventForm.description.trim().length >= 10
          ? eventForm.description.trim()
          : `${eventForm.title} live experience at ${eventForm.venue}. Book your premium tickets now!`;

      const payload = {
        title: eventForm.title,
        description: desc,
        category_id: parseInt(eventForm.category_id, 10),
        venue_name: eventForm.venue,
        venue_address: eventForm.venue_address?.trim() || `${eventForm.venue}, India`,
        start_at: new Date(eventForm.start_time).toISOString(),
        end_at: new Date(eventForm.end_time).toISOString(),
        total_capacity: parseInt(eventForm.total_capacity, 10),
        price: parseFloat(eventForm.ticket_price),
        currency: 'INR',
        status: 'PUBLISHED',
      };
      const res = await eventsApi.createEvent(payload);
      if (res.success) {
        enqueueSnackbar('Event successfully created and published!', { variant: 'success' });
        setShowCreateSection(false);
        setEventForm(initialEventForm);
        fetchEventsAndCategories();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.response?.data?.detail || err.message || 'Creation failed';
      enqueueSnackbar(typeof msg === 'string' ? msg : JSON.stringify(msg), { variant: 'error' });
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleDeleteEvent = async (id) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      await eventsApi.deleteEvent(id);
      enqueueSnackbar('Event removed successfully', { variant: 'info' });
      fetchEventsAndCategories();
    } catch (err) {
      enqueueSnackbar('Could not delete event', { variant: 'error' });
    }
  };

  const handleCreateCategory = async (e) => {
    e.preventDefault();
    setSubmittingCat(true);
    try {
      const res = await eventsApi.createCategory(catForm);
      if (res.success) {
        enqueueSnackbar('Category created successfully', { variant: 'success' });
        setCatModalOpen(false);
        fetchEventsAndCategories();
      }
    } catch (err) {
      enqueueSnackbar('Could not create category', { variant: 'error' });
    } finally {
      setSubmittingCat(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', lg: 'row' }, gap: 3.5, alignItems: 'flex-start' }}>
        {/* LEFT SIDEBAR NAVIGATION (Styled like Image 2) */}
        <Box
          sx={{
            width: { xs: '100%', lg: 300 },
            flexShrink: 0,
            position: { lg: 'sticky' },
            top: { lg: 88 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {/* Main Navigation Card */}
          <Card
            sx={{
              p: 2.5,
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.04)',
              bgcolor: '#ffffff',
            }}
          >
            {/* Sidebar Brand Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5, px: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: '11px',
                    bgcolor: '#0f172a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
                  }}
                >
                  <SecurityIcon sx={{ fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography sx={{ fontWeight: 800, fontSize: 15, color: '#0f172a', lineHeight: 1.2 }}>
                    Admin Console
                  </Typography>
                  <Typography sx={{ fontSize: 11, color: '#64748b', lineHeight: 1.2 }}>
                    Operations & Controls
                  </Typography>
                </Box>
              </Box>
              <Chip
                label="ADMIN"
                size="small"
                sx={{
                  fontWeight: 800,
                  fontSize: 10.5,
                  bgcolor: '#fef3c7',
                  color: '#92400e',
                  border: '1px solid #fde68a',
                  height: 22,
                }}
              />
            </Box>

            <Divider sx={{ mb: 2, borderColor: '#f1f5f9' }} />

            {/* Vertical Navigation Items (Exact Image 2 Structure) */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {/* Item 0: Events & Categories */}
              <Box
                onClick={() => setCurrentTab(0)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.4,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  bgcolor: currentTab === 0 ? '#fff7ed' : 'transparent',
                  border: currentTab === 0 ? '1.5px solid #fed7aa' : '1.5px solid transparent',
                  color: currentTab === 0 ? '#0f172a' : '#475569',
                  transition: 'all 0.18s ease-in-out',
                  '&:hover': {
                    bgcolor: currentTab === 0 ? '#fff7ed' : '#f8fafc',
                    color: '#0f172a',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <GridViewIcon sx={{ fontSize: 20, color: currentTab === 0 ? '#ea580c' : '#64748b' }} />
                  <Typography sx={{ fontWeight: currentTab === 0 ? 800 : 600, fontSize: 13.5 }}>
                    Events & Categories
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: currentTab === 0 ? '#ea580c' : '#f1f5f9',
                    color: currentTab === 0 ? '#ffffff' : '#64748b',
                    fontSize: 11,
                    fontWeight: 800,
                    minWidth: 22,
                    height: 22,
                    borderRadius: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 0.8,
                  }}
                >
                  {events.length}
                </Box>
              </Box>

              {/* Item 1: System Bookings Audit */}
              <Box
                onClick={() => setCurrentTab(1)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.4,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  bgcolor: currentTab === 1 ? '#fff7ed' : 'transparent',
                  border: currentTab === 1 ? '1.5px solid #fed7aa' : '1.5px solid transparent',
                  color: currentTab === 1 ? '#0f172a' : '#475569',
                  transition: 'all 0.18s ease-in-out',
                  '&:hover': {
                    bgcolor: currentTab === 1 ? '#fff7ed' : '#f8fafc',
                    color: '#0f172a',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <ShoppingBagIcon sx={{ fontSize: 20, color: currentTab === 1 ? '#ea580c' : '#64748b' }} />
                  <Typography sx={{ fontWeight: currentTab === 1 ? 800 : 600, fontSize: 13.5 }}>
                    System Bookings Audit
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: currentTab === 1 ? '#ea580c' : '#f1f5f9',
                    color: currentTab === 1 ? '#ffffff' : '#64748b',
                    fontSize: 11,
                    fontWeight: 800,
                    minWidth: 22,
                    height: 22,
                    borderRadius: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 0.8,
                  }}
                >
                  {allBookings.length}
                </Box>
              </Box>

              {/* Item 2: Microservices Health */}
              <Box
                onClick={() => setCurrentTab(2)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.4,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  bgcolor: currentTab === 2 ? '#fff7ed' : 'transparent',
                  border: currentTab === 2 ? '1.5px solid #fed7aa' : '1.5px solid transparent',
                  color: currentTab === 2 ? '#0f172a' : '#475569',
                  transition: 'all 0.18s ease-in-out',
                  '&:hover': {
                    bgcolor: currentTab === 2 ? '#fff7ed' : '#f8fafc',
                    color: '#0f172a',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <HubIcon sx={{ fontSize: 20, color: currentTab === 2 ? '#ea580c' : '#64748b' }} />
                  <Typography sx={{ fontWeight: currentTab === 2 ? 800 : 600, fontSize: 13.5 }}>
                    Microservices Health
                  </Typography>
                </Box>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.5,
                    bgcolor: currentTab === 2 ? '#dcfce7' : '#f0fdf4',
                    color: '#15803d',
                    border: '1px solid #bbf7d0',
                    fontSize: 10.5,
                    fontWeight: 800,
                    height: 22,
                    borderRadius: '11px',
                    px: 0.85,
                  }}
                >
                  <Box
                    sx={{
                      width: 6,
                      height: 6,
                      borderRadius: '50%',
                      bgcolor: '#22c55e',
                      boxShadow: '0 0 6px #22c55e',
                    }}
                  />
                  4 Online
                </Box>
              </Box>

              {/* Item 3: Platform Priority Waiting List */}
              <Box
                onClick={() => setCurrentTab(3)}
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  px: 2,
                  py: 1.4,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  userSelect: 'none',
                  bgcolor: currentTab === 3 ? '#fff7ed' : 'transparent',
                  border: currentTab === 3 ? '1.5px solid #fed7aa' : '1.5px solid transparent',
                  color: currentTab === 3 ? '#0f172a' : '#475569',
                  transition: 'all 0.18s ease-in-out',
                  '&:hover': {
                    bgcolor: currentTab === 3 ? '#fff7ed' : '#f8fafc',
                    color: '#0f172a',
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <HourglassTopIcon sx={{ fontSize: 20, color: currentTab === 3 ? '#ea580c' : '#64748b' }} />
                  <Typography sx={{ fontWeight: currentTab === 3 ? 800 : 600, fontSize: 13.5 }}>
                    Priority Waiting List
                  </Typography>
                </Box>
                <Box
                  sx={{
                    bgcolor: currentTab === 3 ? '#ea580c' : '#f1f5f9',
                    color: currentTab === 3 ? '#ffffff' : '#64748b',
                    fontSize: 11,
                    fontWeight: 800,
                    minWidth: 22,
                    height: 22,
                    borderRadius: '11px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    px: 0.8,
                  }}
                >
                  {waitingList.length}
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 2.5, borderColor: '#f1f5f9' }} />

            {/* Bottom Profile Card & Sign Out (Matching Image 2) */}
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.5,
                  p: 1.5,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                }}
              >
                <Avatar
                  sx={{
                    width: 38,
                    height: 38,
                    bgcolor: '#fef3c7',
                    color: '#d97706',
                    fontWeight: 800,
                    fontSize: 15,
                    border: '1.5px solid #fed7aa',
                  }}
                >
                  {user?.full_name?.charAt(0) || user?.email?.charAt(0) || 'S'}
                </Avatar>
                <Box sx={{ minWidth: 0, flex: 1 }}>
                  <Typography
                    noWrap
                    sx={{ fontWeight: 800, fontSize: 13.5, color: '#0f172a', lineHeight: 1.2 }}
                  >
                    {user?.full_name || 'System Administrator'}
                  </Typography>
                  <Typography
                    noWrap
                    sx={{ fontSize: 11, color: '#64748b', lineHeight: 1.2, mt: 0.25 }}
                  >
                    {user?.email || ''}
                  </Typography>
                </Box>
              </Box>

              <Button
                fullWidth
                variant="outlined"
                startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
                onClick={logout}
                sx={{
                  textTransform: 'none',
                  color: '#dc2626',
                  borderColor: '#fecaca',
                  bgcolor: '#fff1f2',
                  fontWeight: 700,
                  fontSize: 13,
                  borderRadius: '12px',
                  py: 1,
                  '&:hover': {
                    bgcolor: '#fee2e2',
                    borderColor: '#fca5a5',
                  },
                }}
              >
                Sign Out
              </Button>
            </Box>
          </Card>
        </Box>

        {/* RIGHT MAIN CONTENT AREA */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* Top Header Card */}
          <Card
            sx={{
              mb: 3.5,
              p: { xs: 2.5, md: 3 },
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              bgcolor: '#ffffff',
              boxShadow: '0 4px 20px rgba(15, 23, 42, 0.03)',
            }}
          >
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em', fontSize: { xs: '1.6rem', md: '2rem' } }}>
              Administrator Operations Portal
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
              Manage events inventory, view system reservations, and inspect microservice cluster health
            </Typography>
          </Card>

      {/* Tab 0: Events & Categories */}
      {currentTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Live Events Catalog ({events.length})
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Manage live experiences, add new listings, and configure seat allocations
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2 }}>
              <Button
                variant="outlined"
                color="secondary"
                startIcon={<AddIcon />}
                onClick={() => setCatModalOpen(true)}
              >
                Add Category
              </Button>
              <Button
                variant="contained"
                startIcon={showCreateSection ? <CloseIcon /> : <AddIcon />}
                onClick={() => setShowCreateSection(!showCreateSection)}
                sx={{
                  bgcolor: showCreateSection ? '#475569' : '#0f172a',
                  color: '#ffffff',
                  fontWeight: 700,
                  borderRadius: 2,
                  px: 2.5,
                  textTransform: 'none',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.15)',
                  '&:hover': { bgcolor: showCreateSection ? '#334155' : '#1e293b' },
                }}
              >
                {showCreateSection ? 'Close Creator' : 'Create New Event'}
              </Button>
            </Box>
          </Box>

          {/* SEPARATE INLINE SECTION FOR CREATING NEW EVENT (REPLACES POPUP MODAL) */}
          <Collapse in={showCreateSection} unmountOnExit sx={{ mb: 4 }}>
            <Card
              sx={{
                bgcolor: '#ffffff',
                borderRadius: 4,
                border: '1.5px solid #cbd5e1',
                boxShadow: '0 12px 32px -6px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.03)',
                overflow: 'hidden',
              }}
            >
              {/* Section Header */}
              <Box
                sx={{
                  p: 3,
                  pb: 2.5,
                  bgcolor: '#f8fafc',
                  borderBottom: '1px solid #e2e8f0',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Box
                    sx={{
                      width: 40,
                      height: 40,
                      borderRadius: 2.5,
                      bgcolor: '#0f172a',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <EventAvailableIcon sx={{ fontSize: 22 }} />
                  </Box>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                      Create & Publish New Live Event
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: 12.5 }}>
                      Add a verified live experience to the public catalog with atomic seat reservation
                    </Typography>
                  </Box>
                </Box>
                <IconButton
                  size="small"
                  onClick={() => setShowCreateSection(false)}
                  sx={{
                    color: '#64748b',
                    border: '1px solid #e2e8f0',
                    borderRadius: 2,
                    p: 0.75,
                    '&:hover': { bgcolor: '#e2e8f0', color: '#0f172a' },
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>

              {/* Form Content */}
              <Box component="form" onSubmit={handleCreateEvent} sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, 1fr)' },
                    gap: 2.5,
                  }}
                >
                  {/* Event Title */}
                  <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 8' } }}>
                    <TextField
                      fullWidth
                      label="Event Title"
                      required
                      placeholder="e.g. A.R. Rahman Live Symphony Tour 2026"
                      value={eventForm.title}
                      onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                      }}
                    />
                  </Box>

                  {/* Category Selection */}
                  <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 4' } }}>
                    <TextField
                      fullWidth
                      select
                      label="Event Category"
                      required
                      value={eventForm.category_id}
                      onChange={(e) => setEventForm({ ...eventForm, category_id: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                      }}
                    >
                      {categories.map((c) => (
                        <MenuItem key={c.id} value={c.id}>
                          {c.name}
                        </MenuItem>
                      ))}
                    </TextField>
                  </Box>

                  {/* Venue Name */}
                  <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 6' } }}>
                    <TextField
                      fullWidth
                      label="Venue / Arena Name"
                      required
                      placeholder="e.g. MMRDA Grounds, BKC"
                      value={eventForm.venue}
                      onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                      }}
                    />
                  </Box>

                  {/* Complete Address / City */}
                  <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 6' } }}>
                    <TextField
                      fullWidth
                      label="Venue Address / City"
                      placeholder="e.g. Bandra Kurla Complex, Mumbai, Maharashtra 400051"
                      value={eventForm.venue_address || ''}
                      onChange={(e) => setEventForm({ ...eventForm, venue_address: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                      }}
                    />
                  </Box>

                  {/* Start Date & Time */}
                  <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 6' } }}>
                    <TextField
                      fullWidth
                      label="Start Date & Time"
                      type="datetime-local"
                      required
                      InputLabelProps={{ shrink: true }}
                      helperText="Specify when doors open and event begins"
                      value={eventForm.start_time}
                      onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                      }}
                    />
                  </Box>

                  {/* End Date & Time */}
                  <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 6' } }}>
                    <TextField
                      fullWidth
                      label="End Date & Time"
                      type="datetime-local"
                      required
                      InputLabelProps={{ shrink: true }}
                      helperText="Scheduled event conclusion time"
                      value={eventForm.end_time}
                      onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                      }}
                    />
                  </Box>

                  {/* Total Capacity */}
                  <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 6' } }}>
                    <TextField
                      fullWidth
                      label="Total Capacity (Tickets)"
                      type="number"
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <EventSeatIcon sx={{ fontSize: 19, color: '#64748b' }} />
                          </InputAdornment>
                        ),
                      }}
                      helperText="Total available seats allocated for reservation"
                      value={eventForm.total_capacity}
                      onChange={(e) => setEventForm({ ...eventForm, total_capacity: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                      }}
                    />
                  </Box>

                  {/* Ticket Price in INR */}
                  <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 6' } }}>
                    <TextField
                      fullWidth
                      label="Ticket Price (₹ INR)"
                      type="number"
                      step="0.01"
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <CurrencyRupeeIcon sx={{ fontSize: 19, color: '#0f172a' }} />
                          </InputAdornment>
                        ),
                      }}
                      helperText="Base ticket price charged in Indian Rupees"
                      value={eventForm.ticket_price}
                      onChange={(e) => setEventForm({ ...eventForm, ticket_price: e.target.value })}
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                      }}
                    />
                  </Box>

                  {/* Event Narrative / Description */}
                  <Box sx={{ gridColumn: { xs: 'span 1', sm: 'span 12' } }}>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      label="Event Narrative & Highlights"
                      placeholder="Highlight performing artists, agenda, parking information, and age limits..."
                      value={eventForm.description}
                      onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                      helperText="Brief summary visible on attendee event discovery cards"
                      sx={{
                        '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                      }}
                    />
                  </Box>
                </Box>

                <Divider sx={{ my: 3, borderColor: '#f1f5f9' }} />

                {/* Form Buttons: Explicit High-Contrast Cancel + Publish Button */}
                <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setShowCreateSection(false);
                      setEventForm(initialEventForm);
                    }}
                    sx={{
                      borderColor: '#cbd5e1',
                      color: '#0f172a',
                      fontWeight: 700,
                      px: 3.5,
                      py: 1.1,
                      borderRadius: 2.5,
                      textTransform: 'none',
                      fontSize: 14,
                      '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                    }}
                  >
                    Cancel
                  </Button>

                  <Button
                    type="submit"
                    variant="contained"
                    disabled={submittingEvent}
                    startIcon={<AddIcon />}
                    sx={{
                      bgcolor: '#0f172a',
                      color: '#ffffff',
                      fontWeight: 800,
                      px: 4,
                      py: 1.1,
                      borderRadius: 2.5,
                      textTransform: 'none',
                      fontSize: 14,
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                      '&:hover': { bgcolor: '#1e293b' },
                    }}
                  >
                    {submittingEvent ? 'Publishing Event...' : 'Publish Event Listing'}
                  </Button>
                </Box>
              </Box>
            </Card>
          </Collapse>

          <TableContainer component={Paper} sx={{ bgcolor: '#ffffff', borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 920 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }}>Event Title</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }}>Venue</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap', minWidth: 240 }}>Capacity</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }} align="right">Price (INR)</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }} align="center">Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingEvents ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} sx={{ color: '#0f172a' }} />
                    </TableCell>
                  </TableRow>
                ) : events.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#64748b' }}>
                      No events in system. Click "Create New Event" to initialize catalog.
                    </TableCell>
                  </TableRow>
                ) : (
                  events.map((evt) => (
                    <TableRow key={evt.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 600, color: '#0f172a', verticalAlign: 'middle' }}>{evt.title}</TableCell>
                      <TableCell sx={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <Chip
                          label={evt.category_name || evt.category?.name || 'General'}
                          size="small"
                          sx={{ fontSize: 11, bgcolor: '#f1f5f9', color: '#334155', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell sx={{ color: '#64748b', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{evt.venue_name || evt.venue || 'Venue TBA'}</TableCell>
                      <TableCell sx={{ minWidth: 240, verticalAlign: 'middle' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, whiteSpace: 'nowrap' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 800,
                              whiteSpace: 'nowrap',
                              color: (evt.available_capacity ?? evt.total_capacity) <= 0 ? '#dc2626' : '#15803d',
                            }}
                          >
                            {(evt.available_capacity ?? evt.total_capacity) <= 0
                              ? '🔴 0 tickets left'
                              : `🟢 ${evt.available_capacity ?? evt.total_capacity} tickets left`}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', whiteSpace: 'nowrap' }}>
                            / {evt.total_capacity} total
                          </Typography>
                        </Box>
                        {(evt.available_capacity ?? evt.total_capacity) <= 0 && (
                          <Box sx={{ mt: 0.5 }}>
                            <Chip
                              label="SOLD OUT • WAITLIST"
                              size="small"
                              sx={{
                                fontSize: 10,
                                fontWeight: 800,
                                bgcolor: '#fee2e2',
                                color: '#dc2626',
                                height: 20,
                              }}
                            />
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#0f172a', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        ₹{parseFloat(evt.price ?? evt.ticket_price ?? 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                        <Chip
                          label={evt.status}
                          size="small"
                          color={evt.status === 'PUBLISHED' ? 'success' : 'default'}
                          sx={{ fontWeight: 700, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle' }}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteEvent(evt.id)}
                          sx={{ '&:hover': { bgcolor: '#fee2e2' } }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 1: Bookings Audit */}
      {currentTab === 1 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Platform Reservations Ledger ({allBookings.length})
            </Typography>
            <Button size="small" startIcon={<RefreshIcon />} onClick={fetchBookings}>
              Refresh
            </Button>
          </Box>

          <TableContainer component={Paper} sx={{ bgcolor: '#ffffff', borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 920 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }}>Booking Ref</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }}>Customer ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }}>Event ID</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }} align="center">Qty</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }} align="right">Total (INR)</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }} align="center">Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }} align="right">Created At</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingBookings ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={32} sx={{ color: '#0f172a' }} />
                    </TableCell>
                  </TableRow>
                ) : allBookings.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#64748b' }}>
                      No bookings recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  allBookings.map((b) => (
                    <TableRow key={b.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{b.booking_reference}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {String(b.customer_id || b.user_id || '').substring(0, 12)}
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {String(b.event_id || '').substring(0, 12)}
                      </TableCell>
                      <TableCell align="center" sx={{ fontWeight: 700, color: '#0f172a', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>{b.quantity}</TableCell>
                      <TableCell align="right" sx={{ fontWeight: 700, color: '#059669', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        ₹{parseFloat(b.total_amount_snapshot || b.total_price || 0).toLocaleString('en-IN')}
                        {b.razorpay_payment_id && (
                          <Box sx={{ fontSize: 10, color: '#6366f1', fontFamily: 'monospace', mt: 0.5 }}>
                            RPay: {b.razorpay_payment_id}
                          </Box>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <Chip
                          label={b.status}
                          size="small"
                          color={b.status === 'CONFIRMED' ? 'success' : 'error'}
                          sx={{ fontWeight: 700, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ fontSize: 12, color: 'text.secondary', verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        {b.created_at ? new Date(b.created_at).toLocaleString() : 'N/A'}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 2: Cluster & API Gateway Health */}
      {currentTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                System Architecture & Gateway Health
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Live operational telemetry for API Gateway, microservices cluster, event broker, and databases.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              startIcon={<RefreshIcon />}
              onClick={fetchPlatformHealth}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Probe Cluster
            </Button>
          </Box>

          {/* Top API Gateway Hero Card */}
          <Card
            sx={{
              mb: 3,
              p: 2.5,
              borderRadius: 3.5,
              bgcolor: '#0f172a',
              color: '#ffffff',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.25)',
              border: '1px solid #1e293b',
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}>
              <Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <Box sx={{ width: 36, height: 36, borderRadius: 2, bgcolor: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <DnsIcon sx={{ fontSize: 20, color: '#ffffff' }} />
                  </Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#ffffff' }}>
                    Central API Gateway (Port :8000)
                  </Typography>
                  <Chip
                    label="ONLINE • FASTAPI PROXY"
                    size="small"
                    sx={{ bgcolor: '#059669', color: '#ffffff', fontWeight: 800, fontSize: 10.5 }}
                  />
                </Box>
                <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: 13.5, maxWidth: 640 }}>
                  Reverse proxy routing client requests to internal services, validating JWT bearer tokens, CORS policies, and distributed request tracing.
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  size="small"
                  href="http://127.0.0.1:8000/docs"
                  target="_blank"
                  rel="noreferrer"
                  endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  sx={{ bgcolor: '#2563eb', color: '#ffffff', textTransform: 'none', fontWeight: 700, borderRadius: 2, '&:hover': { bgcolor: '#1d4ed8' } }}
                >
                  Gateway Swagger Docs
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  href="http://127.0.0.1:8000/health"
                  target="_blank"
                  rel="noreferrer"
                  endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  sx={{ color: '#94a3b8', borderColor: 'rgba(255,255,255,0.2)', textTransform: 'none', fontWeight: 600, borderRadius: 2, '&:hover': { color: '#ffffff', borderColor: '#ffffff' } }}
                >
                  Health Endpoint
                </Button>
              </Box>
            </Box>
          </Card>

          {/* Microservices Grid */}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2, fontSize: 12 }}>
            Connected Cluster Microservices
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '1fr 1fr 1fr 1fr' },
              gap: 2.5,
              mb: 4,
            }}
          >
            {[
              {
                name: 'auth',
                title: 'Auth Service',
                port: ':8001',
                db: 'event_auth_db',
                desc: 'Argon2id hashing, JWT authentication & OTP email verification',
                icon: <SecurityIcon sx={{ fontSize: 20, color: '#3b82f6' }} />,
              },
              {
                name: 'events',
                title: 'Event Service',
                port: ':8002',
                db: 'event_catalog_db',
                desc: 'Concert/conference catalog, seating tiers & inventory limits',
                icon: <CloudQueueIcon sx={{ fontSize: 20, color: '#10b981' }} />,
              },
              {
                name: 'bookings',
                title: 'Booking Service',
                port: ':8003',
                db: 'event_booking_db',
                desc: 'Atomic reservations, SAGA locks & Razorpay payments in INR',
                icon: <SpeedIcon sx={{ fontSize: 20, color: '#8b5cf6' }} />,
              },
              {
                name: 'notifications',
                title: 'Notification Service',
                port: ':8004',
                db: 'event_notification_db',
                desc: 'RabbitMQ event consumer & asynchronous email delivery',
                icon: <EmailIcon sx={{ fontSize: 20, color: '#f59e0b' }} />,
              },
            ].map((svc) => {
              const status = healthData?.services?.[svc.name] || (loadingHealth ? 'PROBING' : 'ONLINE');
              const isOnline = status === 'ONLINE' || status === 'UP';

              return (
                <Card
                  key={svc.name}
                  sx={{
                    bgcolor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 3,
                    p: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  }}
                >
                  <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                      <Box sx={{ width: 34, height: 34, borderRadius: 2, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {svc.icon}
                      </Box>
                      <Chip
                        icon={isOnline ? <CheckCircleIcon sx={{ fontSize: '13px !important' }} /> : <ErrorIcon sx={{ fontSize: '13px !important' }} />}
                        label={status}
                        size="small"
                        color={isOnline ? 'success' : 'error'}
                        sx={{ fontWeight: 800, fontSize: 10, height: 22 }}
                      />
                    </Box>

                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      {svc.title}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#2563eb', fontWeight: 700, display: 'block', mb: 1 }}>
                      Port {svc.port} • MySQL {svc.db}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b', fontSize: 11.5, lineHeight: 1.4, display: 'block' }}>
                      {svc.desc}
                    </Typography>
                  </CardContent>
                </Card>
              );
            })}
          </Box>

          {/* Infrastructure & Developer Tools */}
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em', mb: 2, fontSize: 12 }}>
            Cluster Infrastructure & Developer Tooling
          </Typography>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1fr' },
              gap: 2.5,
            }}
          >
            {/* Mailpit */}
            <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3, p: 2 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <EmailIcon sx={{ color: '#ea580c' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Mailpit OTP Sandbox
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                  SMTP Port :1025 • Web UI Port :8025. Catches all OTP and ticket notification emails locally.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  href="http://localhost:8025"
                  target="_blank"
                  rel="noreferrer"
                  endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Open Mailpit Inbox (:8025)
                </Button>
              </CardContent>
            </Card>

            {/* RabbitMQ */}
            <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3, p: 2 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <HubIcon sx={{ color: '#d97706' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    RabbitMQ Event Broker
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                  AMQP Port :5672 • Management Port :15672. Asynchronous SAGA message exchange and event queues.
                </Typography>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  href="http://localhost:15672"
                  target="_blank"
                  rel="noreferrer"
                  endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
                  sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
                >
                  Open RabbitMQ Admin (:15672)
                </Button>
              </CardContent>
            </Card>

            {/* MySQL Multi-Database */}
            <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: 3, p: 2 }}>
              <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                  <StorageIcon sx={{ color: '#059669' }} />
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    MySQL 8.0 Databases
                  </Typography>
                </Box>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mb: 2 }}>
                  Host localhost:3306. Isolated schemas for auth, events, bookings, and notifications.
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
                  <Chip label="event_auth_db" size="small" sx={{ fontSize: 10, bgcolor: '#f1f5f9' }} />
                  <Chip label="event_catalog_db" size="small" sx={{ fontSize: 10, bgcolor: '#f1f5f9' }} />
                  <Chip label="event_booking_db" size="small" sx={{ fontSize: 10, bgcolor: '#f1f5f9' }} />
                  <Chip label="event_notification_db" size="small" sx={{ fontSize: 10, bgcolor: '#f1f5f9' }} />
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {/* TAB 3: PLATFORM PRIORITY WAITING LIST AUDIT */}
      {currentTab === 3 && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Platform Priority Waiting List
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                All sold-out event waiting list requests across the system. Enforcing the strict limit of maximum 5 tickets per user/email.
              </Typography>
            </Box>
            <Button
              variant="outlined"
              size="small"
              onClick={fetchWaitingListAdmin}
              disabled={loadingWaitingList}
              startIcon={<RefreshIcon />}
              sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
            >
              Refresh Waitlist
            </Button>
          </Box>

          {/* Mini KPI Cards */}
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
              gap: 2,
            }}
          >
            <Paper sx={{ p: 2, borderRadius: 2.5, bgcolor: '#fff7ed', border: '1px solid #fed7aa' }}>
              <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Platform Waitlist
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#9a3412', mt: 0.5 }}>
                {waitingList.length}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
              <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>
                Total Seats Demanded
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#166534', mt: 0.5 }}>
                {waitingList.reduce((acc, curr) => acc + (curr.quantity || 1), 0)}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: 2.5, bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <Typography variant="caption" sx={{ color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase' }}>
                Awaiting Tickets
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e40af', mt: 0.5 }}>
                {waitingList.filter((i) => i.status === 'WAITING').length}
              </Typography>
            </Paper>
            <Paper sx={{ p: 2, borderRadius: 2.5, bgcolor: '#faf5ff', border: '1px solid #e9d5ff' }}>
              <Typography variant="caption" sx={{ color: '#7e22ce', fontWeight: 700, textTransform: 'uppercase' }}>
                Notified & Converted
              </Typography>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#6b21a8', mt: 0.5 }}>
                {waitingList.filter((i) => i.status !== 'WAITING').length}
              </Typography>
            </Paper>
          </Box>

          {/* Table */}
          <TableContainer component={Paper} sx={{ bgcolor: '#ffffff', borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', overflowX: 'auto' }}>
            <Table sx={{ minWidth: 920 }}>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }}>Queue # & Date</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }}>User / Email</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }}>Target Event</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }}>Quantity Desired</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }}>Tier & Notes</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }} align="center">Status</TableCell>
                  <TableCell sx={{ fontWeight: 700, py: 2, whiteSpace: 'nowrap' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loadingWaitingList ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      <CircularProgress size={30} sx={{ color: '#ea580c' }} />
                    </TableCell>
                  </TableRow>
                ) : waitingList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6, color: '#64748b' }}>
                      No waiting list entries found on the platform.
                    </TableCell>
                  </TableRow>
                ) : (
                  waitingList.map((item, idx) => (
                    <TableRow key={item.id} hover sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                      <TableCell sx={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box
                            sx={{
                              bgcolor: '#ea580c',
                              color: '#ffffff',
                              fontWeight: 800,
                              fontSize: 12,
                              width: 24,
                              height: 24,
                              borderRadius: '50%',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            {item.position || idx + 1}
                          </Box>
                          <Box>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              #{item.id}
                            </Typography>
                            <Typography variant="caption" sx={{ color: '#64748b' }}>
                              {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Recent'}
                            </Typography>
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'middle' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap' }}>
                          {item.customer_name || 'Customer'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block', whiteSpace: 'nowrap' }}>
                          {item.customer_email || `User #${item.customer_id}`}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'middle' }}>
                        <Typography variant="body2" sx={{ fontWeight: 700 }}>
                          {item.event_title || `Event #${item.event_id}`}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <Chip
                          label={`${item.quantity} ${item.quantity === 1 ? 'ticket' : 'tickets'} (Max 5 Limit)`}
                          size="small"
                          sx={{ bgcolor: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontWeight: 800 }}
                        />
                      </TableCell>
                      <TableCell sx={{ verticalAlign: 'middle' }}>
                        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', whiteSpace: 'nowrap' }}>
                          {item.preferred_tier || 'General Admission'}
                        </Typography>
                        {item.notes && (
                          <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic', display: 'block', maxWidth: 180 }}>
                            "{item.notes}"
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <Chip
                          label={item.status}
                          size="small"
                          sx={{
                            fontWeight: 800,
                            fontSize: 11,
                            bgcolor:
                              item.status === 'WAITING'
                                ? '#fff7ed'
                                : item.status === 'NOTIFIED'
                                ? '#eff6ff'
                                : item.status === 'CONVERTED'
                                ? '#dcfce7'
                                : '#fee2e2',
                            color:
                              item.status === 'WAITING'
                                ? '#c2410c'
                                : item.status === 'NOTIFIED'
                                ? '#1d4ed8'
                                : item.status === 'CONVERTED'
                                ? '#15803d'
                                : '#b91c1c',
                          }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ verticalAlign: 'middle', whiteSpace: 'nowrap' }}>
                        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
                          {item.status === 'WAITING' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={async () => {
                                await bookingsApi.updateWaitingListStatus(item.id, 'NOTIFIED');
                                fetchWaitingListAdmin();
                              }}
                              sx={{ textTransform: 'none', borderRadius: 2, fontSize: 11, fontWeight: 700 }}
                            >
                              Notify
                            </Button>
                          )}
                          {item.status === 'NOTIFIED' && (
                            <Button
                              size="small"
                              variant="contained"
                              onClick={async () => {
                                await bookingsApi.updateWaitingListStatus(item.id, 'CONVERTED');
                                fetchWaitingListAdmin();
                              }}
                              sx={{ bgcolor: '#16a34a', color: '#ffffff !important', textTransform: 'none', borderRadius: 2, fontSize: 11, fontWeight: 700, '&:hover': { bgcolor: '#15803d', color: '#ffffff' } }}
                            >
                              Convert
                            </Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
        </Box>
      </Box>

      {/* Create Category Modal */}
      <Dialog
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: '#ffffff', borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15,23,42,0.15)' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>Add Event Category</DialogTitle>
        <Box component="form" onSubmit={handleCreateCategory}>
          <DialogContent>
            <TextField
              fullWidth
              label="Category Name"
              required
              margin="dense"
              value={catForm.name}
              onChange={(e) =>
                setCatForm({
                  ...catForm,
                  name: e.target.value,
                  slug: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
                })
              }
            />
            <TextField
              fullWidth
              label="Slug"
              required
              margin="dense"
              value={catForm.slug}
              onChange={(e) => setCatForm({ ...catForm, slug: e.target.value })}
            />
            <TextField
              fullWidth
              label="Description"
              margin="dense"
              multiline
              rows={2}
              value={catForm.description}
              onChange={(e) => setCatForm({ ...catForm, description: e.target.value })}
            />
          </DialogContent>
          <DialogActions sx={{ p: 2.5, gap: 1 }}>
            <Button
              variant="outlined"
              onClick={() => setCatModalOpen(false)}
              sx={{
                borderColor: '#cbd5e1',
                color: '#0f172a',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: 2,
                '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submittingCat}
              sx={{
                bgcolor: '#0f172a',
                color: '#ffffff',
                fontWeight: 800,
                textTransform: 'none',
                borderRadius: 2,
                '&:hover': { bgcolor: '#1e293b' },
              }}
            >
              {submittingCat ? 'Creating...' : 'Create Category'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Container>
  );
};
