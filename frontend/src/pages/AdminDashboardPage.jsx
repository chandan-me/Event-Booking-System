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
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloudQueueIcon from '@mui/icons-material/CloudQueue';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { eventsApi } from '../api/eventsApi';
import { bookingsApi } from '../api/bookingsApi';
import { useSnackbar } from 'notistack';

export const AdminDashboardPage = () => {
  const { enqueueSnackbar } = useSnackbar();

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

  // Dialog State for Event Creation
  const [eventModalOpen, setEventModalOpen] = useState(false);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    category_id: '',
    venue: '',
    start_time: '',
    end_time: '',
    total_capacity: 100,
    ticket_price: 49.99,
  });

  // Dialog State for Category Creation
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [submittingCat, setSubmittingCat] = useState(false);
  const [catForm, setCatForm] = useState({ name: '', slug: '', description: '' });

  const fetchEventsAndCategories = async () => {
    setLoadingEvents(true);
    try {
      const [eventsRes, catsRes] = await Promise.all([
        eventsApi.getEvents({ limit: 50 }),
        eventsApi.getCategories(),
      ]);
      if (eventsRes.success) setEvents(eventsRes.data.events || []);
      if (catsRes.success) setCategories(catsRes.data || []);
    } catch (err) {
      enqueueSnackbar('Failed to load events data', { variant: 'error' });
    } finally {
      setLoadingEvents(false);
    }
  };

  const fetchBookings = async () => {
    setLoadingBookings(true);
    try {
      const res = await bookingsApi.getAllBookingsAdmin({ limit: 50 });
      if (res.success && res.data) {
        setAllBookings(res.data.bookings || []);
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

  useEffect(() => {
    if (currentTab === 0) fetchEventsAndCategories();
    if (currentTab === 1) fetchBookings();
    if (currentTab === 2) fetchPlatformHealth();
  }, [currentTab]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    setSubmittingEvent(true);
    try {
      const payload = {
        ...eventForm,
        start_time: new Date(eventForm.start_time).toISOString(),
        end_time: new Date(eventForm.end_time).toISOString(),
        total_capacity: parseInt(eventForm.total_capacity, 10),
        ticket_price: parseFloat(eventForm.ticket_price),
      };
      const res = await eventsApi.createEvent(payload);
      if (res.success) {
        enqueueSnackbar('Event successfully created and published!', { variant: 'success' });
        setEventModalOpen(false);
        fetchEventsAndCategories();
      }
    } catch (err) {
      const msg = err.response?.data?.error?.message || err.message || 'Creation failed';
      enqueueSnackbar(msg, { variant: 'error' });
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
    <Container maxWidth="xl" sx={{ py: 6 }}>
      {/* Title */}
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800 }}>
            Administrator Operations Portal
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Manage events inventory, view system reservations, and inspect microservice cluster health
          </Typography>
        </Box>
        <Chip label="ROLE: ADMIN" color="secondary" sx={{ fontWeight: 700 }} />
      </Box>

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
        <Tabs value={currentTab} onChange={(_, val) => setCurrentTab(val)} textColor="secondary" indicatorColor="secondary">
          <Tab label="Events & Categories" sx={{ fontWeight: 600 }} />
          <Tab label="System Bookings Audit" sx={{ fontWeight: 600 }} />
          <Tab label="Microservices Health" sx={{ fontWeight: 600 }} />
        </Tabs>
      </Box>

      {/* Tab 0: Events & Categories */}
      {currentTab === 0 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Live Events ({events.length})
            </Typography>
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
                color="primary"
                startIcon={<AddIcon />}
                onClick={() => setEventModalOpen(true)}
              >
                Create New Event
              </Button>
            </Box>
          </Box>

          <TableContainer component={Paper} sx={{ bgcolor: '#ffffff', borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Event Title</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Category</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Venue</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Capacity</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Price (INR)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
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
                    <TableRow key={evt.id} hover>
                      <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>{evt.title}</TableCell>
                      <TableCell>
                        <Chip label={evt.category?.name || 'General'} size="small" sx={{ fontSize: 11, bgcolor: '#f1f5f9', color: '#334155' }} />
                      </TableCell>
                      <TableCell sx={{ color: '#64748b' }}>{evt.venue}</TableCell>
                      <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>
                        {evt.available_capacity} / {evt.total_capacity}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>
                        ₹{parseFloat(evt.ticket_price || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={evt.status}
                          size="small"
                          color={evt.status === 'PUBLISHED' ? 'success' : 'default'}
                          sx={{ fontWeight: 700, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell align="right">
                        <IconButton size="small" color="error" onClick={() => handleDeleteEvent(evt.id)}>
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

          <TableContainer component={Paper} sx={{ bgcolor: '#ffffff', borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Booking Ref</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Customer ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Event ID</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Qty</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Total (INR)</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Created At</TableCell>
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
                    <TableRow key={b.id} hover>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>{b.booking_reference}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{String(b.user_id || '').substring(0, 12)}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: 12, color: '#64748b' }}>{String(b.event_id || '').substring(0, 12)}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#0f172a' }}>{b.quantity}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#059669' }}>
                        ₹{parseFloat(b.total_price || 0).toLocaleString('en-IN')}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={b.status}
                          size="small"
                          color={b.status === 'CONFIRMED' ? 'success' : 'error'}
                          sx={{ fontWeight: 700, fontSize: 11 }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontSize: 12, color: 'text.secondary' }}>
                        {new Date(b.created_at).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tab 2: Microservices Health */}
      {currentTab === 2 && (
        <Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>
              Cluster Microservices Health
            </Typography>
            <Button size="small" startIcon={<RefreshIcon />} onClick={fetchPlatformHealth}>
              Probe Health
            </Button>
          </Box>

          <Grid container spacing={3}>
            {loadingHealth ? (
              <Grid item xs={12} sx={{ textAlign: 'center', py: 6 }}>
                <CircularProgress />
              </Grid>
            ) : healthData ? (
              Object.entries(healthData.services || {}).map(([service, status]) => {
                const isOnline = status === 'ONLINE' || status === 'UP';
                return (
                  <Grid item xs={12} sm={6} md={3} key={service}>
                    <Card sx={{ bgcolor: '#ffffff', border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)', p: 2 }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                          <CloudQueueIcon sx={{ color: isOnline ? '#059669' : '#dc2626' }} />
                          <Chip
                            icon={isOnline ? <CheckCircleIcon sx={{ fontSize: 14 }} /> : <ErrorIcon sx={{ fontSize: 14 }} />}
                            label={status}
                            size="small"
                            color={isOnline ? 'success' : 'error'}
                            sx={{ fontWeight: 700 }}
                          />
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, textTransform: 'capitalize', color: '#0f172a' }}>
                          {service} Service
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          Protocol: HTTP REST / SAGA
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })
            ) : (
              <Grid item xs={12}>
                <Typography color="text.secondary">No health probe data available.</Typography>
              </Grid>
            )}
          </Grid>
        </Box>
      )}

      {/* Create Event Modal */}
      <Dialog
        open={eventModalOpen}
        onClose={() => setEventModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{ paper: { sx: { bgcolor: '#ffffff', borderRadius: 4, border: '1px solid #e2e8f0', boxShadow: '0 25px 50px -12px rgba(15,23,42,0.15)' } } }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>Create New Live Event</DialogTitle>
        <Box component="form" onSubmit={handleCreateEvent}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Event Title"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  select
                  label="Category"
                  required
                  value={eventForm.category_id}
                  onChange={(e) => setEventForm({ ...eventForm, category_id: e.target.value })}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Venue / Arena"
                  required
                  value={eventForm.venue}
                  onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Start Time"
                  type="datetime-local"
                  required
                  InputLabelProps={{ shrink: true }}
                  value={eventForm.start_time}
                  onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="End Time"
                  type="datetime-local"
                  required
                  InputLabelProps={{ shrink: true }}
                  value={eventForm.end_time}
                  onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Total Capacity"
                  type="number"
                  required
                  value={eventForm.total_capacity}
                  onChange={(e) => setEventForm({ ...eventForm, total_capacity: e.target.value })}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  label="Ticket Price (₹ INR)"
                  type="number"
                  step="0.01"
                  required
                  value={eventForm.ticket_price}
                  onChange={(e) => setEventForm({ ...eventForm, ticket_price: e.target.value })}
                />
              </Grid>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Event Narrative & Highlights"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ p: 2.5 }}>
            <Button onClick={() => setEventModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary" disabled={submittingEvent}>
              {submittingEvent ? 'Publishing...' : 'Publish Event'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

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
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={() => setCatModalOpen(false)}>Cancel</Button>
            <Button type="submit" variant="contained" color="secondary" disabled={submittingCat}>
              Create
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Container>
  );
};
