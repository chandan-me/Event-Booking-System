import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  TextField,
  InputAdornment,
  Chip,
  Pagination,
  CircularProgress,
  Button,
  Stack,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import RefreshIcon from '@mui/icons-material/Refresh';
import { useNavigate } from 'react-router-dom';
import { eventsApi } from '../api/eventsApi';
import { EventCard } from '../components/EventCard';
import { BookingModal } from '../components/BookingModal';
import { useAuth } from '../context/AuthContext';

export const HomePage = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Booking modal state
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  const fetchCategories = async () => {
    try {
      const res = await eventsApi.getCategories();
      if (res.success && res.data) {
        setCategories(res.data);
      }
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page,
        limit: 9,
        search: searchTerm || undefined,
        category_id: selectedCategory || undefined,
      };
      const res = await eventsApi.getEvents(params);
      if (res.success && res.data) {
        setEvents(res.data.events || []);
        setTotalPages(res.data.pagination?.total_pages || 1);
      }
    } catch (err) {
      setError('Unable to load live events. Verify that the API Gateway is online.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [page, selectedCategory]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    fetchEvents();
  };

  const handleBookClick = (event) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/' } } });
      return;
    }
    setSelectedEvent(event);
    setBookingModalOpen(true);
  };

  const handleBookingSuccess = () => {
    // Refresh events to reflect decremented capacity
    fetchEvents();
  };

  return (
    <Box sx={{ pb: 10 }}>
      {/* Hero Section */}
      <Box
        sx={{
          pt: { xs: 8, md: 12 },
          pb: { xs: 6, md: 9 },
          background: 'radial-gradient(ellipse 80% 50% at 50% -20%, rgba(99, 102, 241, 0.25), transparent)',
          textAlign: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
        }}
      >
        <Container maxWidth="md">
          <Chip
            icon={<ConfirmationNumberIcon sx={{ fontSize: 16 }} />}
            label="Real-Time Microservices Powered Ticketing"
            sx={{
              mb: 3,
              px: 1,
              py: 0.5,
              bgcolor: 'rgba(99, 102, 241, 0.12)',
              color: '#818cf8',
              border: '1px solid rgba(99, 102, 241, 0.3)',
              fontWeight: 600,
            }}
          />
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '2.5rem', md: '3.75rem' },
              lineHeight: 1.15,
              mb: 2.5,
              background: 'linear-gradient(135deg, #ffffff 0%, #cbd5e1 60%, #94a3b8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}
          >
            Discover & Book Unforgettable Live Experiences
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.secondary', fontWeight: 400, mb: 4, mx: 'auto', maxWidth: 650 }}>
            From high-octane stadium concerts and developer summits to boutique film festivals — secure your spot with atomic reservation certainty.
          </Typography>

          {/* Search Box */}
          <Box
            component="form"
            onSubmit={handleSearchSubmit}
            sx={{
              display: 'flex',
              gap: 1.5,
              maxWidth: 580,
              mx: 'auto',
              p: 0.75,
              borderRadius: 3,
              bgcolor: 'rgba(17, 24, 39, 0.85)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(10px)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.4)',
            }}
          >
            <TextField
              fullWidth
              placeholder="Search by event title, artist, or venue..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="standard"
              slotProps={{
                input: {
                  disableUnderline: true,
                  startAdornment: (
                    <InputAdornment position="start" sx={{ pl: 1 }}>
                      <SearchIcon sx={{ color: 'text.secondary' }} />
                    </InputAdornment>
                  ),
                  sx: { color: 'text.primary', fontSize: 15 },
                },
              }}
            />
            <Button type="submit" variant="contained" color="primary" sx={{ px: 3, borderRadius: 2.5 }}>
              Search
            </Button>
          </Box>
        </Container>
      </Box>

      {/* Main Events Feed */}
      <Container maxWidth="lg" sx={{ mt: 6 }}>
        {/* Category Filters */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5 }}>
            <Chip
              label="All Categories"
              onClick={() => { setSelectedCategory(''); setPage(1); }}
              variant={selectedCategory === '' ? 'filled' : 'outlined'}
              color={selectedCategory === '' ? 'primary' : 'default'}
              sx={{ fontWeight: 600, cursor: 'pointer' }}
            />
            {categories.map((cat) => (
              <Chip
                key={cat.id}
                label={cat.name}
                onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
                variant={selectedCategory === cat.id ? 'filled' : 'outlined'}
                color={selectedCategory === cat.id ? 'primary' : 'default'}
                sx={{ fontWeight: 600, cursor: 'pointer' }}
              />
            ))}
          </Stack>

          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => fetchEvents()}
            sx={{ color: 'text.secondary' }}
          >
            Refresh Feed
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>
            {error}
          </Alert>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress color="primary" />
          </Box>
        ) : events.length === 0 ? (
          /* Empty State */
          <Box
            sx={{
              textAlign: 'center',
              py: 12,
              px: 3,
              borderRadius: 4,
              bgcolor: 'rgba(17, 24, 39, 0.4)',
              border: '1px dashed rgba(255, 255, 255, 0.1)',
            }}
          >
            <ConfirmationNumberIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
              No upcoming events found
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
              Try adjusting your search query or switching categories.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => { setSearchTerm(''); setSelectedCategory(''); setPage(1); }}
            >
              Reset Filters
            </Button>
          </Box>
        ) : (
          /* Event Grid */
          <>
            <Grid container spacing={3.5}>
              {events.map((event) => (
                <Grid item xs={12} sm={6} md={4} key={event.id}>
                  <EventCard event={event} onBook={handleBookClick} />
                </Grid>
              ))}
            </Grid>

            {/* Pagination */}
            {totalPages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 6 }}>
                <Pagination
                  count={totalPages}
                  page={page}
                  onChange={(_, val) => setPage(val)}
                  color="primary"
                  shape="rounded"
                  size="large"
                />
              </Box>
            )}
          </>
        )}
      </Container>

      {/* Booking Modal */}
      <BookingModal
        event={selectedEvent}
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        onSuccess={handleBookingSuccess}
      />
    </Box>
  );
};
