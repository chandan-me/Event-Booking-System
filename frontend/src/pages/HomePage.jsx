import React, { useState, useEffect, useMemo } from 'react';
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
  Stack,
  Alert,
  Divider,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import RefreshIcon from '@mui/icons-material/Refresh';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import SecurityIcon from '@mui/icons-material/Security';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import VerifiedIcon from '@mui/icons-material/Verified';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getEvents, getCategories } from '../api/eventsApi';
import { EventCard } from '../components/EventCard';
import { BookingModal } from '../components/BookingModal';
import { useAuth } from '../context/AuthContext';

const CATEGORY_META = [
  { slug: 'music-concerts', name: 'Music & Live Concerts', icon: '🎵', tag: 'Concerts' },
  { slug: 'tech-conferences', name: 'Tech & AI Conferences', icon: '💻', tag: 'Tech' },
  { slug: 'comedy-theatre', name: 'Standup Comedy & Theatre', icon: '🎭', tag: 'Comedy' },
  { slug: 'arts-culture', name: 'Arts & Cultural Exhibitions', icon: '🎨', tag: 'Arts' },
  { slug: 'sports-fitness', name: 'Sports & Fitness Marathons', icon: '🏃', tag: 'Sports' },
  { slug: 'food-nightlife', name: 'Food, Wine & Nightlife', icon: '🍷', tag: 'Food' },
  { slug: 'workshops', name: 'Workshops & Masterclasses', icon: '🛠️', tag: 'Workshops' },
];

export const HomePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [allEvents, setAllEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || '');

  // Booking Modal State
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  useEffect(() => {
    loadCategories();
    loadAllEvents();
  }, []);

  useEffect(() => {
    const params = {};
    if (searchTerm) params.search = searchTerm;
    if (selectedCategory) params.category = selectedCategory;
    setSearchParams(params);
  }, [selectedCategory]);

  const loadCategories = async () => {
    try {
      const res = await getCategories();
      const rawCategories = res.data || [];
      // Clean and sanitize category list: ignore any leftover test timestamps
      const cleanCategories = rawCategories.filter(
        (c) => !c.name.match(/\d{9,}/) && !c.name.toLowerCase().includes('last ticket')
      );
      setCategories(cleanCategories);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadAllEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch up to 100 published live events for rich row-by-row categorization
      const res = await getEvents({ page: 1, limit: 100, status: 'PUBLISHED' });
      const items = res.data?.items || [];
      // Filter out any leftover test titles
      const cleanItems = items.filter(
        (e) => !e.title.includes('One Ticket Only') && !e.title.includes('17919')
      );
      setAllEvents(cleanItems);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to retrieve live events.');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
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
    loadAllEvents();
  };

  // Filter events based on active search
  const filteredEvents = useMemo(() => {
    let result = allEvents;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      result = result.filter(
        (e) =>
          e.title?.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q) ||
          e.venue_name?.toLowerCase().includes(q) ||
          e.category_name?.toLowerCase().includes(q)
      );
    }
    if (selectedCategory) {
      result = result.filter((e) => String(e.category_id) === String(selectedCategory));
    }
    return result;
  }, [allEvents, searchTerm, selectedCategory]);

  // Group events row by row by professional categories
  const eventsByTheme = useMemo(() => {
    const groups = {};

    // Group filtered events by their category
    filteredEvents.forEach((evt) => {
      const catKey = evt.category_name || 'General';
      if (!groups[catKey]) {
        groups[catKey] = [];
      }
      groups[catKey].push(evt);
    });

    return groups;
  }, [filteredEvents]);

  // Marquee featured events row (top 3 premier experiences)
  const featuredEvents = useMemo(() => {
    return allEvents.slice(0, 3);
  }, [allEvents]);

  return (
    <Box sx={{ pb: 12, bgcolor: '#ffffff', minHeight: '100vh' }}>
      {/* 1. Hero Banner */}
      <Box
        sx={{
          pt: { xs: 7, md: 9 },
          pb: { xs: 6, md: 8 },
          background: 'radial-gradient(ellipse 90% 60% at 50% -10%, #f8fafc 0%, #ffffff 100%)',
          textAlign: 'center',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        <Container maxWidth="md">
          <Chip
            icon={<CurrencyRupeeIcon sx={{ fontSize: '13px !important', color: '#0f172a !important' }} />}
            label="Instant Ticketing in INR • Powered by Razorpay"
            sx={{
              mb: 2.5,
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
              fontSize: { xs: '2.4rem', md: '3.4rem' },
              lineHeight: 1.15,
              mb: 2,
              color: '#0f172a',
              letterSpacing: '-0.03em',
            }}
          >
            Discover Premier Live Events in India
          </Typography>

          <Typography
            variant="h6"
            sx={{
              color: '#64748b',
              fontWeight: 400,
              mb: 4,
              mx: 'auto',
              maxWidth: 620,
              fontSize: { xs: '1rem', md: '1.15rem' },
              lineHeight: 1.5,
            }}
          >
            Reserve your seats at India's top concerts, tech summits, Broadway theatre, and comedy arenas with guaranteed atomic reservation.
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
              placeholder="Search by artist, conference, city, or venue..."
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
            {searchTerm && (
              <Button
                size="small"
                onClick={() => setSearchTerm('')}
                sx={{ color: '#64748b', minWidth: 'auto', px: 1 }}
              >
                Clear
              </Button>
            )}
          </Box>

          {/* Value Props Row */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: { xs: 2, sm: 4 },
              mt: 4,
              color: '#64748b',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <VerifiedIcon sx={{ fontSize: 16, color: '#059669' }} />
              100% Genuine Tickets
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <FlashOnIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
              Instant Razorpay UPI & Cards
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <SecurityIcon sx={{ fontSize: 16, color: '#0284c7' }} />
              Atomic Seat Reservation
            </Box>
          </Box>
        </Container>
      </Box>

      {/* 2. Professional Category Navigation Bar */}
      <Container maxWidth="lg" sx={{ mt: 5 }}>
        <Box
          sx={{
            p: 1,
            bgcolor: '#ffffff',
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(15, 23, 42, 0.03)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 2,
            mb: 5,
          }}
        >
          {/* Category Pills List */}
          <Stack
            direction="row"
            spacing={1}
            sx={{
              overflowX: 'auto',
              scrollbarWidth: 'none',
              '&::-webkit-scrollbar': { display: 'none' },
              py: 0.5,
              px: 0.5,
              flexGrow: 1,
            }}
          >
            <Chip
              label="✨ All Experiences"
              onClick={() => setSelectedCategory('')}
              sx={{
                height: 36,
                px: 1.5,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                borderRadius: '9999px',
                bgcolor: selectedCategory === '' ? '#0f172a' : '#f8fafc',
                color: selectedCategory === '' ? '#ffffff' : '#475569',
                border: '1px solid',
                borderColor: selectedCategory === '' ? '#0f172a' : '#e2e8f0',
                transition: 'all 0.15s',
                '&:hover': {
                  bgcolor: selectedCategory === '' ? '#1e293b' : '#f1f5f9',
                },
              }}
            />

            {categories.map((cat) => {
              const isSelected = String(selectedCategory) === String(cat.id);
              const meta = CATEGORY_META.find((m) => m.slug === cat.slug) || { icon: '🎟️' };

              return (
                <Chip
                  key={cat.id}
                  label={`${meta.icon} ${cat.name}`}
                  onClick={() => setSelectedCategory(isSelected ? '' : cat.id)}
                  sx={{
                    height: 36,
                    px: 1.5,
                    fontWeight: 700,
                    fontSize: 13,
                    cursor: 'pointer',
                    borderRadius: '9999px',
                    bgcolor: isSelected ? '#0f172a' : '#f8fafc',
                    color: isSelected ? '#ffffff' : '#475569',
                    border: '1px solid',
                    borderColor: isSelected ? '#0f172a' : '#e2e8f0',
                    transition: 'all 0.15s',
                    '&:hover': {
                      bgcolor: isSelected ? '#1e293b' : '#f1f5f9',
                    },
                  }}
                />
              );
            })}
          </Stack>

          <Button
            size="small"
            startIcon={<RefreshIcon sx={{ fontSize: 16 }} />}
            onClick={() => loadAllEvents()}
            sx={{
              flexShrink: 0,
              color: '#64748b',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              px: 1.75,
              py: 0.75,
              fontSize: 12.5,
              fontWeight: 600,
              textTransform: 'none',
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

        {/* 3. Loading State */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 14 }}>
            <CircularProgress sx={{ color: '#0f172a', mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Loading curated live experiences in INR...
            </Typography>
          </Box>
        ) : filteredEvents.length === 0 ? (
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
              No matching live events found
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              Try clearing your search query or switching categories.
            </Typography>
            <Button
              variant="contained"
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('');
              }}
              sx={{ bgcolor: '#0f172a', color: '#ffffff', '&:hover': { bgcolor: '#1e293b' } }}
            >
              Show All Experiences
            </Button>
          </Box>
        ) : selectedCategory || searchTerm ? (
          /* 4. Single Filtered View (When searching or filtering by single category) */
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  {searchTerm
                    ? `Results for "${searchTerm}"`
                    : categories.find((c) => String(c.id) === String(selectedCategory))?.name || 'Selected Category'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Showing {filteredEvents.length} available live event(s)
                </Typography>
              </Box>

              <Button
                variant="outlined"
                size="small"
                onClick={() => {
                  setSelectedCategory('');
                  setSearchTerm('');
                }}
                sx={{ borderColor: '#cbd5e1', color: '#0f172a', textTransform: 'none' }}
              >
                Clear Filters
              </Button>
            </Box>

            <Grid container spacing={3.5}>
              {filteredEvents.map((event) => (
                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={event.id}>
                  <EventCard event={event} onBook={handleBookClick} />
                </Grid>
              ))}
            </Grid>
          </Box>
        ) : (
          /* 5. THEME ROW BY ROW VIEW (All Experiences Default) */
          <Box>
            {/* Top Row: Trending / Featured Picks */}
            {featuredEvents.length > 0 && (
              <Box sx={{ mb: 7 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        🔥 Trending & Featured Experiences
                      </Typography>
                      <Chip
                        label="Top Selling"
                        size="small"
                        sx={{ bgcolor: '#fef3c7', color: '#b45309', fontWeight: 700, fontSize: 11 }}
                      />
                    </Box>
                    <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                      Highest demand concerts, summits, and premier festivals across India
                    </Typography>
                  </Box>
                </Box>

                <Grid container spacing={3.5}>
                  {featuredEvents.map((event) => (
                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={`featured-${event.id}`}>
                      <EventCard event={event} onBook={handleBookClick} />
                    </Grid>
                  ))}
                </Grid>
              </Box>
            )}

            <Divider sx={{ my: 6, borderColor: '#f1f5f9' }} />

            {/* Category Rows: Grouped and Presented Row by Row */}
            {Object.entries(eventsByTheme).map(([themeName, themeEvents], index) => {
              const meta = CATEGORY_META.find((m) => m.name.toLowerCase() === themeName.toLowerCase()) || {
                icon: '🎟️',
              };

              return (
                <Box key={themeName} sx={{ mb: 7 }}>
                  {/* Row Header */}
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
                    <Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                        <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.01em' }}>
                          {meta.icon} {themeName}
                        </Typography>
                        <Chip
                          label={`${themeEvents.length} event${themeEvents.length > 1 ? 's' : ''}`}
                          size="small"
                          sx={{
                            bgcolor: '#f1f5f9',
                            color: '#334155',
                            fontWeight: 700,
                            fontSize: 11,
                            border: '1px solid #e2e8f0',
                          }}
                        />
                      </Box>
                      <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                        Live performances, dates, and ticket bookings available in INR
                      </Typography>
                    </Box>

                    {themeEvents.length > 3 && (
                      <Button
                        size="small"
                        endIcon={<ArrowForwardIcon sx={{ fontSize: 14 }} />}
                        onClick={() => {
                          const catObj = categories.find(
                            (c) => c.name.toLowerCase() === themeName.toLowerCase()
                          );
                          if (catObj) setSelectedCategory(catObj.id);
                        }}
                        sx={{ color: '#0f172a', fontWeight: 700, textTransform: 'none' }}
                      >
                        Explore All
                      </Button>
                    )}
                  </Box>

                  {/* Cards Row in Clean Grid Alignment */}
                  <Grid container spacing={3.5}>
                    {themeEvents.map((event) => (
                      <Grid size={{ xs: 12, sm: 6, md: 4 }} key={event.id}>
                        <EventCard event={event} onBook={handleBookClick} />
                      </Grid>
                    ))}
                  </Grid>

                  {index < Object.entries(eventsByTheme).length - 1 && (
                    <Divider sx={{ mt: 6, borderColor: '#f1f5f9' }} />
                  )}
                </Box>
              );
            })}
          </Box>
        )}
      </Container>

      {/* Booking Modal with Razorpay */}
      <BookingModal
        event={selectedEvent}
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        onSuccess={handleBookingSuccess}
      />
    </Box>
  );
};
