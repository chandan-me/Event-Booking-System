import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  TextField,
  InputAdornment,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Pagination,
  Stack,
  Alert,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import RefreshIcon from '@mui/icons-material/Refresh';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import { useSearchParams } from 'react-router-dom';
import { getEvents, getCategories } from '../api/eventsApi';
import { EventCard } from '../components/EventCard';
import { BookingModal } from '../components/BookingModal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [events, setEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Pagination
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');
  const [page, setPage] = useState(parseInt(searchParams.get('page') || '1', 10));
  const [totalPages, setTotalPages] = useState(1);

  // Booking Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    fetchEvents();
    // Update URL queries
    const params = {};
    if (searchTerm) params.search = searchTerm;
    if (selectedCategory) params.category = selectedCategory;
    if (page > 1) params.page = page.toString();
    setSearchParams(params);
  }, [selectedCategory, page]);

  const loadCategories = async () => {
    try {
      const res = await getCategories();
      setCategories(res.data || []);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const fetchEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {
        page,
        limit: 9,
      };
      if (searchTerm) params.search = searchTerm;
      if (selectedCategory) params.category = selectedCategory;

      const res = await getEvents(params);
      const items = res.data?.items || [];
      const total = res.data?.total || 0;
      setEvents(items);
      setTotalPages(Math.ceil(total / 9) || 1);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to retrieve events. Ensure services are running.');
    } finally {
      setLoading(false);
    }
  };

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
    fetchEvents(); // Refresh capacity
  };

  return (
    <Box sx={{ pb: 10, bgcolor: '#ffffff', minHeight: '100vh' }}>
      {/* Hero Banner Section */}
      <Box
        sx={{
          pt: { xs: 8, md: 10 },
          pb: { xs: 7, md: 9 },
          background: 'radial-gradient(ellipse 90% 60% at 50% -10%, #f8fafc 0%, #ffffff 100%)',
          textAlign: 'center',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Container maxWidth="md">
          <Chip
            icon={<CurrencyRupeeIcon sx={{ fontSize: '13px !important', color: '#0f172a !important' }} />}
            label="Live Ticketing in INR with Instant Confirmation"
            sx={{
              mb: 3,
              px: 1.5,
              py: 0.5,
              bgcolor: '#f1f5f9',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              fontWeight: 700,
              fontSize: 12,
            }}
          />
          <Typography
            variant="h2"
            sx={{
              fontWeight: 800,
              fontSize: { xs: '2.5rem', md: '3.5rem' },
              lineHeight: 1.15,
              mb: 2.5,
              color: '#0f172a',
              letterSpacing: '-0.03em',
            }}
          >
            Discover & Book Unforgettable Live Experiences
          </Typography>
          <Typography variant="h6" sx={{ color: '#64748b', fontWeight: 400, mb: 4, mx: 'auto', maxWidth: 640, fontSize: '1.1rem' }}>
            From premier tech summits and esports arena showdowns to acoustic festivals — secure your seats with atomic reservation certainty.
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
              borderRadius: 3.5,
              bgcolor: '#ffffff',
              border: '1px solid #cbd5e1',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.08)',
            }}
          >
            <TextField
              fullWidth
              placeholder="Search by event title, venue, or keywords..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              variant="standard"
              slotProps={{
                input: {
                  disableUnderline: true,
                  startAdornment: (
                    <InputAdornment position="start" sx={{ pl: 1.5 }}>
                      <SearchIcon sx={{ color: '#94a3b8' }} />
                    </InputAdornment>
                  ),
                  sx: { color: '#0f172a', fontSize: 15 },
                },
              }}
            />
            <Button
              type="submit"
              variant="contained"
              sx={{
                px: 3.5,
                borderRadius: 2.5,
                bgcolor: '#0f172a',
                color: '#ffffff',
                fontWeight: 700,
                '&:hover': { bgcolor: '#1e293b' },
              }}
            >
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
              sx={{
                fontWeight: 700,
                cursor: 'pointer',
                bgcolor: selectedCategory === '' ? '#0f172a' : '#f8fafc',
                color: selectedCategory === '' ? '#ffffff' : '#475569',
                border: '1px solid',
                borderColor: selectedCategory === '' ? '#0f172a' : '#e2e8f0',
                '&:hover': { bgcolor: selectedCategory === '' ? '#1e293b' : '#f1f5f9' },
              }}
            />
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <Chip
                  key={cat.id}
                  label={cat.name}
                  onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
                  sx={{
                    fontWeight: 700,
                    cursor: 'pointer',
                    bgcolor: isSelected ? '#0f172a' : '#f8fafc',
                    color: isSelected ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: isSelected ? '#0f172a' : '#e2e8f0',
                    '&:hover': { bgcolor: isSelected ? '#1e293b' : '#f1f5f9' },
                  }}
                />
              );
            })}
          </Stack>

          <Button
            size="small"
            startIcon={<RefreshIcon />}
            onClick={() => fetchEvents()}
            sx={{
              color: '#64748b',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              px: 1.5,
              '&:hover': { color: '#0f172a', bgcolor: '#f1f5f9' },
            }}
          >
            Refresh Feed
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 3, border: '1px solid #fecaca' }}>
            {error}
          </Alert>
        )}

        {/* Loading Spinner */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress sx={{ color: '#0f172a' }} />
          </Box>
        ) : events.length === 0 ? (
          /* Empty State */
          <Box
            sx={{
              textAlign: 'center',
              py: 12,
              px: 3,
              borderRadius: 4,
              bgcolor: '#f8fafc',
              border: '1px dashed #cbd5e1',
            }}
          >
            <ConfirmationNumberIcon sx={{ fontSize: 48, color: '#94a3b8', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
              No upcoming events found
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              Try adjusting your search query or switching categories.
            </Typography>
            <Button
              variant="outlined"
              onClick={() => { setSearchTerm(''); setSelectedCategory(''); setPage(1); }}
              sx={{ bgcolor: '#ffffff', borderColor: '#cbd5e1', color: '#0f172a' }}
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
                  shape="rounded"
                  size="large"
                  sx={{
                    '& .MuiPaginationItem-root': {
                      color: '#0f172a',
                      fontWeight: 600,
                      border: '1px solid #e2e8f0',
                      '&.Mui-selected': {
                        bgcolor: '#0f172a',
                        color: '#ffffff',
                      },
                    },
                  }}
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
