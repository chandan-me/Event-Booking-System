import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Chip,
  Button,
  TextField,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  CircularProgress,
  LinearProgress,
  Alert,
  Tabs,
  Tab,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import EventIcon from '@mui/icons-material/Event';
import HistoryIcon from '@mui/icons-material/History';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import FilterListIcon from '@mui/icons-material/FilterList';
import RefreshIcon from '@mui/icons-material/Refresh';
import CloseIcon from '@mui/icons-material/Close';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import SwapVertIcon from '@mui/icons-material/SwapVert';
import TuneIcon from '@mui/icons-material/Tune';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { getEvents, getCategories } from '../api/eventsApi';
import { EventCard } from '../components/EventCard';
import { BookingModal } from '../components/BookingModal';
import { WaitingListModal } from '../components/WaitingListModal';
import { useAuth } from '../context/AuthContext';

const CATEGORY_META = [
  { slug: 'music-concerts', name: 'Music & Concerts', icon: '🎵', accent: '#8b5cf6', bg: '#f5f3ff' },
  { slug: 'tech-conferences', name: 'Tech & AI', icon: '💻', accent: '#2563eb', bg: '#eff6ff' },
  { slug: 'comedy-theatre', name: 'Comedy & Theatre', icon: '🎭', accent: '#f59e0b', bg: '#fffbeb' },
  { slug: 'arts-culture', name: 'Arts & Culture', icon: '🎨', accent: '#ec4899', bg: '#fdf2f8' },
  { slug: 'sports-fitness', name: 'Sports & Fitness', icon: '🏃', accent: '#10b981', bg: '#f0fdf4' },
  { slug: 'food-nightlife', name: 'Food & Nightlife', icon: '🍷', accent: '#ef4444', bg: '#fef2f2' },
  { slug: 'workshops', name: 'Workshops', icon: '🛠️', accent: '#06b6d4', bg: '#ecfeff' },
];

export const EventsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [allEvents, setAllEvents] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  // Tab State: 'UPCOMING' (default), 'ALL', 'PAST'
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'UPCOMING');

  // Search & Category from URL query
  const searchTerm = searchParams.get('search') || '';
  const selectedCategory = searchParams.get('category') || '';
  const [sortBy, setSortBy] = useState('date_asc');

  // Booking Modal
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

  // Waiting List Modal
  const [waitingListEvent, setWaitingListEvent] = useState(null);
  const [waitingListOpen, setWaitingListOpen] = useState(false);

  // Pagination: Show 9 cards initially, load remaining via "Load More Events"
  const INITIAL_VISIBLE_COUNT = 9;
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE_COUNT);
  const [loadingMore, setLoadingMore] = useState(false);

  // Reset visible cards back to 9 whenever filters or tabs change
  useEffect(() => {
    setVisibleCount(INITIAL_VISIBLE_COUNT);
  }, [activeTab, selectedCategory, searchTerm, sortBy]);

  useEffect(() => {
    loadCategories();
    loadEvents();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await getCategories();
      const rawCategories = res.data || [];
      const cleanCategories = rawCategories.filter(
        (c) => !/\d{3,}/.test(c.name) && !/\d{3,}/.test(c.slug)
      );
      setCategories(cleanCategories);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const loadEvents = async () => {
    setLoading(true);
    setError(null);
    try {
      // Fetch all published events (includes both upcoming and concluded events)
      const res = await getEvents({ page: 1, limit: 100 });
      const items = res.data?.items || [];
      const cleanItems = items.filter(
        (e) =>
          !/\d{4,}/.test(e.title) &&
          !/\d{4,}/.test(e.category_name || '') &&
          !e.title.includes('One Ticket Only') &&
          !e.title.includes('Exclusive Coding Workshop')
      );
      setAllEvents(cleanItems);
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to retrieve live events.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadEvents();
    setTimeout(() => setRefreshing(false), 400);
  };

  // Helper to determine if an event is finished/outdated
  const isEventOutdated = (event) => {
    const dateValue = event.start_at || event.start_time;
    return Boolean(
      (dateValue && new Date(dateValue) < new Date()) ||
      event.status === 'COMPLETED' ||
      event.status === 'CANCELLED' ||
      event.is_finished
    );
  };

  // Split into upcoming and past
  const { upcomingList, pastList } = useMemo(() => {
    const upcoming = [];
    const past = [];
    allEvents.forEach((e) => {
      if (isEventOutdated(e)) {
        past.push(e);
      } else {
        upcoming.push(e);
      }
    });
    return { upcomingList: upcoming, pastList: past };
  }, [allEvents]);

  // Tab switch
  const handleTabChange = (event, newTab) => {
    setActiveTab(newTab);
    const newParams = new URLSearchParams(searchParams);
    if (newTab === 'UPCOMING') {
      newParams.delete('tab');
    } else {
      newParams.set('tab', newTab);
    }
    setSearchParams(newParams);
  };

  const handleCategorySelect = (catId) => {
    const newParams = new URLSearchParams(searchParams);
    if (catId && String(selectedCategory) !== String(catId)) {
      newParams.set('category', catId);
    } else {
      newParams.delete('category');
    }
    setSearchParams(newParams);
  };

  const handleSearchChange = (val) => {
    const newParams = new URLSearchParams(searchParams);
    if (val.trim()) {
      newParams.set('search', val.trim());
    } else {
      newParams.delete('search');
    }
    setSearchParams(newParams);
  };

  const handleClearAll = () => {
    setSearchParams({});
    setActiveTab('UPCOMING');
  };

  const handleBookClick = (event) => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: { pathname: '/events' } } });
      return;
    }
    setSelectedEvent(event);
    setBookingModalOpen(true);
  };

  const handleWaitingListClick = (event) => {
    setWaitingListEvent(event);
    setWaitingListOpen(true);
  };

  // Filtered & Sorted events based on active tab, search, category, sort
  const displayedEvents = useMemo(() => {
    let pool = [];
    if (activeTab === 'UPCOMING') {
      pool = upcomingList;
    } else if (activeTab === 'PAST') {
      pool = pastList;
    } else {
      // ALL
      pool = allEvents;
    }

    // Category filter
    if (selectedCategory) {
      pool = pool.filter((e) => String(e.category_id) === String(selectedCategory));
    }

    // Search query
    const q = searchTerm.trim().toLowerCase();
    if (q) {
      const words = q.split(/\s+/).filter(Boolean);
      pool = pool.filter((e) => {
        const text = `${e.title || ''} ${e.description || ''} ${e.venue_name || ''} ${e.venue_address || ''} ${e.category_name || ''}`.toLowerCase();
        return words.every((w) => text.includes(w));
      });
    }

    // Sorting
    const sorted = [...pool].sort((a, b) => {
      const dateA = new Date(a.start_at || a.start_time || 0).getTime();
      const dateB = new Date(b.start_at || b.start_time || 0).getTime();
      const priceA = parseFloat(a.price || 0);
      const priceB = parseFloat(b.price || 0);

      switch (sortBy) {
        case 'date_asc':
          return dateA - dateB;
        case 'date_desc':
          return dateB - dateA;
        case 'price_asc':
          return priceA - priceB;
        case 'price_desc':
          return priceB - priceA;
        case 'availability':
          return (b.available_capacity || 0) - (a.available_capacity || 0);
        default:
          return dateA - dateB;
      }
    });

    return sorted;
  }, [allEvents, upcomingList, pastList, activeTab, selectedCategory, searchTerm, sortBy]);

  const categoryScrollRef = React.useRef(null);
  const handleScrollCategories = (direction) => {
    if (categoryScrollRef.current) {
      const scrollAmount = direction === 'left' ? -260 : 260;
      categoryScrollRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Category event counts based on current active tab
  const categoryCounts = useMemo(() => {
    const counts = {};
    const pool = activeTab === 'UPCOMING' ? upcomingList : activeTab === 'PAST' ? pastList : allEvents;
    pool.forEach((e) => {
      const cid = String(e.category_id);
      counts[cid] = (counts[cid] || 0) + 1;
    });
    return counts;
  }, [allEvents, upcomingList, pastList, activeTab]);

  const selectedCatObj = useMemo(() => {
    return categories.find((c) => String(c.id) === String(selectedCategory));
  }, [categories, selectedCategory]);

  // Sliced visible events for 9-card pagination
  const visibleEvents = useMemo(() => {
    return displayedEvents.slice(0, visibleCount);
  }, [displayedEvents, visibleCount]);

  const handleLoadMore = () => {
    setLoadingMore(true);
    setTimeout(() => {
      setVisibleCount((prev) => Math.min(prev + 9, displayedEvents.length));
      setLoadingMore(false);
    }, 280);
  };

  return (
    <Box sx={{ pb: 12, bgcolor: '#ffffff', minHeight: '100vh' }}>
      {/* 1. Improvised Header Banner */}
      <Box
        sx={{
          pt: { xs: 4, md: 5.5 },
          pb: { xs: 3, md: 4 },
          background: 'linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)',
          borderBottom: '1px solid #f1f5f9',
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', md: 'flex-end' },
              gap: 2.5,
            }}
          >
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 1, flexWrap: 'wrap' }}>
                <Chip
                  icon={<AutoAwesomeIcon sx={{ fontSize: '13px !important', color: '#2563eb !important' }} />}
                  label="EXPLORE LIVE EXPERIENCES"
                  sx={{
                    bgcolor: '#eff6ff',
                    color: '#1d4ed8',
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: '0.04em',
                    height: 24,
                  }}
                />
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                  Instant INR Checkout • Zero Hidden Fees
                </Typography>
              </Box>

              <Typography
                variant="h3"
                sx={{
                  fontWeight: 800,
                  fontSize: { xs: '2rem', md: '2.7rem' },
                  color: '#0f172a',
                  letterSpacing: '-0.025em',
                  lineHeight: 1.15,
                }}
              >
                {activeTab === 'PAST'
                  ? 'Archived & Concluded Events'
                  : activeTab === 'ALL'
                  ? 'All Live & Past Events'
                  : 'Upcoming Live Events'}
              </Typography>
              <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 640, fontSize: { xs: 14, md: 15.5 } }}>
                {activeTab === 'PAST'
                  ? 'Browse past concerts, conferences, and tours that have finished. Concluded events are displayed in grey.'
                  : 'Discover and reserve seats at India’s top upcoming concerts, tech summits, standup comedy, and cultural festivals.'}
              </Typography>
            </Box>

            {/* Live Inventory Counter Badge */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.75,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                px: 2.25,
                py: 1.25,
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, fontSize: 10.5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Live Inventory
                </Typography>
                <Typography variant="body2" sx={{ color: '#0f172a', fontWeight: 800, fontSize: 14.5 }}>
                  {activeTab === 'UPCOMING'
                    ? `${upcomingList.length} Upcoming`
                    : activeTab === 'PAST'
                    ? `${pastList.length} Concluded`
                    : `${allEvents.length} Total Events`}
                </Typography>
              </Box>
              <Tooltip title="Refresh event listings" arrow>
                <IconButton
                  size="small"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  sx={{
                    color: '#64748b',
                    bgcolor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    transition: 'all 0.2s',
                    '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
                  }}
                >
                  <RefreshIcon sx={{ fontSize: 16, animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* 2. Unified Discovery Console (Single cohesive, user-friendly card) */}
      <Container maxWidth="lg" sx={{ mt: 3.5, mb: 4 }}>
        <Box
          sx={{
            bgcolor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 30px -4px rgba(15, 23, 42, 0.06)',
            p: { xs: 2, sm: 2.5, md: 3 },
            display: 'flex',
            flexDirection: 'column',
            gap: 2.5,
          }}
        >
          {/* Row 1: Segmented View Tabs & Sorting / Reset Controls */}
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', md: 'row' },
              justifyContent: 'space-between',
              alignItems: { xs: 'stretch', md: 'center' },
              gap: 2,
            }}
          >
            {/* Segmented Pill Tabs */}
            <Box
              sx={{
                display: 'inline-flex',
                bgcolor: '#f1f5f9',
                p: 0.6,
                borderRadius: '14px',
                gap: 0.5,
                overflowX: 'auto',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {[
                { key: 'UPCOMING', label: 'Upcoming Events', icon: <EventIcon sx={{ fontSize: 17 }} />, count: upcomingList.length, activeColor: '#ea580c', activeBg: '#fff7ed', activeBorder: '#fed7aa' },
                { key: 'ALL', label: 'All Events', icon: <FilterListIcon sx={{ fontSize: 17 }} />, count: allEvents.length, activeColor: '#2563eb', activeBg: '#eff6ff', activeBorder: '#bfdbfe' },
                { key: 'PAST', label: 'Concluded & Past', icon: <HistoryIcon sx={{ fontSize: 17 }} />, count: pastList.length, activeColor: '#475569', activeBg: '#ffffff', activeBorder: '#cbd5e1' },
              ].map((tab) => {
                const isActive = activeTab === tab.key;
                return (
                  <Button
                    key={tab.key}
                    disableRipple
                    onClick={() => handleTabChange(null, tab.key)}
                    startIcon={React.cloneElement(tab.icon, {
                      sx: { fontSize: 17, color: isActive ? tab.activeColor : '#64748b' },
                    })}
                    sx={{
                      textTransform: 'none',
                      px: 2,
                      py: 0.85,
                      borderRadius: '10px',
                      fontWeight: isActive ? 800 : 600,
                      fontSize: 13.5,
                      whiteSpace: 'nowrap',
                      color: isActive ? '#0f172a' : '#64748b',
                      bgcolor: isActive ? '#ffffff' : 'transparent',
                      boxShadow: isActive ? '0 2px 6px rgba(15, 23, 42, 0.08)' : 'none',
                      border: isActive ? `1px solid ${tab.activeBorder}` : '1px solid transparent',
                      transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        bgcolor: isActive ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                        color: '#0f172a',
                      },
                    }}
                  >
                    <span>{tab.label}</span>
                    <Box
                      component="span"
                      sx={{
                        ml: 1,
                        bgcolor: isActive ? tab.activeColor : '#e2e8f0',
                        color: isActive ? '#ffffff' : '#64748b',
                        fontSize: 11,
                        fontWeight: 800,
                        minWidth: 20,
                        height: 19,
                        borderRadius: '999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 0.7,
                        lineHeight: 1,
                      }}
                    >
                      {tab.count}
                    </Box>
                  </Button>
                );
              })}
            </Box>

            {/* Right Controls: Sort Dropdown & Quick Reset */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexShrink: 0 }}>
              <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 220 } }}>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  startAdornment={
                    <InputAdornment position="start">
                      <SwapVertIcon sx={{ fontSize: 18, color: '#64748b' }} />
                    </InputAdornment>
                  }
                  sx={{
                    borderRadius: '12px',
                    bgcolor: '#f8fafc',
                    fontSize: 13,
                    fontWeight: 600,
                    color: '#0f172a',
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#e2e8f0' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#cbd5e1' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#0f172a' },
                  }}
                >
                  <MenuItem value="date_asc">Date: Earliest First</MenuItem>
                  <MenuItem value="date_desc">Date: Latest First</MenuItem>
                  <MenuItem value="price_asc">Price: Low to High</MenuItem>
                  <MenuItem value="price_desc">Price: High to Low</MenuItem>
                  <MenuItem value="availability">Highest Availability</MenuItem>
                </Select>
              </FormControl>

              {/* Reset Filters Button (appears whenever search, category, or non-default tab is set) */}
              {(selectedCategory || searchTerm || activeTab !== 'UPCOMING') && (
                <Tooltip title="Clear all active filters and return to default view">
                  <Button
                    size="small"
                    onClick={handleClearAll}
                    startIcon={<RestartAltIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      color: '#ef4444',
                      fontWeight: 700,
                      textTransform: 'none',
                      fontSize: 13,
                      bgcolor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: '10px',
                      px: 1.5,
                      py: 0.7,
                      whiteSpace: 'nowrap',
                      '&:hover': { bgcolor: '#fee2e2', borderColor: '#fca5a5' },
                    }}
                  >
                    Reset
                  </Button>
                </Tooltip>
              )}
            </Box>
          </Box>

          {/* Row 2: Omni-Search Bar with instant Clear & Results Counter */}
          <TextField
            fullWidth
            placeholder="Search by artist, summit title, venue, or city..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: '#64748b', fontSize: 22, ml: 0.5 }} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {searchTerm && (
                        <IconButton
                          size="small"
                          onClick={() => handleSearchChange('')}
                          sx={{ color: '#94a3b8', '&:hover': { color: '#0f172a' }, p: 0.5 }}
                        >
                          <CloseIcon sx={{ fontSize: 18 }} />
                        </IconButton>
                      )}
                      <Chip
                        label={`${displayedEvents.length} events`}
                        size="small"
                        sx={{
                          bgcolor: '#f1f5f9',
                          color: '#475569',
                          fontWeight: 700,
                          fontSize: 11.5,
                          height: 24,
                          borderRadius: '8px',
                        }}
                      />
                    </Box>
                  </InputAdornment>
                ),
              },
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: '14px',
                bgcolor: '#f8fafc',
                fontSize: 14.5,
                fontWeight: 500,
                color: '#0f172a',
                transition: 'all 0.2s ease',
                '& fieldset': { borderColor: '#e2e8f0' },
                '&:hover fieldset': { borderColor: '#cbd5e1' },
                '&.Mui-focused': {
                  bgcolor: '#ffffff',
                  boxShadow: '0 0 0 3px rgba(37, 99, 235, 0.12)',
                  '& fieldset': { borderColor: '#2563eb' },
                },
              },
            }}
          />

          {/* Row 3: Interactive Category Rail with Navigation Chevrons */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Filter Label */}
            <Box sx={{ display: { xs: 'none', sm: 'flex' }, alignItems: 'center', gap: 0.75, mr: 0.5, flexShrink: 0 }}>
              <TuneIcon sx={{ fontSize: 16, color: '#64748b' }} />
              <Typography sx={{ fontSize: 12.5, fontWeight: 700, color: '#64748b', letterSpacing: '0.02em', textTransform: 'uppercase' }}>
                Categories
              </Typography>
            </Box>

            {/* Left Scroll Chevron */}
            <Tooltip title="Scroll categories left">
              <IconButton
                size="small"
                onClick={() => handleScrollCategories('left')}
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  p: 0.6,
                  color: '#64748b',
                  bgcolor: '#f8fafc',
                  flexShrink: 0,
                  '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
                }}
              >
                <ChevronLeftIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>

            {/* Scrollable Categories Rail */}
            <Box
              ref={categoryScrollRef}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1,
                overflowX: 'auto',
                py: 0.5,
                px: 0.25,
                flex: 1,
                scrollBehavior: 'smooth',
                scrollbarWidth: 'none',
                '&::-webkit-scrollbar': { display: 'none' },
              }}
            >
              {/* All Categories Pill */}
              <Chip
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                    <span>All Categories</span>
                    <Box
                      component="span"
                      sx={{
                        bgcolor: selectedCategory === '' ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
                        color: selectedCategory === '' ? '#ffffff' : '#64748b',
                        fontSize: 10.5,
                        fontWeight: 800,
                        minWidth: 18,
                        height: 18,
                        borderRadius: '999px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        px: 0.5,
                      }}
                    >
                      {activeTab === 'UPCOMING' ? upcomingList.length : activeTab === 'PAST' ? pastList.length : allEvents.length}
                    </Box>
                  </Box>
                }
                onClick={() => handleCategorySelect('')}
                sx={{
                  fontWeight: 700,
                  fontSize: 12.5,
                  height: 34,
                  borderRadius: '12px',
                  bgcolor: selectedCategory === '' ? '#0f172a' : '#f8fafc',
                  color: selectedCategory === '' ? '#ffffff' : '#475569',
                  border: '1px solid',
                  borderColor: selectedCategory === '' ? '#0f172a' : '#e2e8f0',
                  cursor: 'pointer',
                  flexShrink: 0,
                  transition: 'all 0.2s',
                  '&:hover': {
                    bgcolor: selectedCategory === '' ? '#1e293b' : '#f1f5f9',
                    borderColor: selectedCategory === '' ? '#1e293b' : '#cbd5e1',
                  },
                }}
              />

              {/* Dynamic Category Pills */}
              {categories.map((cat) => {
                const isSelected = String(selectedCategory) === String(cat.id);
                const meta = CATEGORY_META.find((m) => m.slug === cat.slug) || { icon: '🎟️' };
                const count = categoryCounts[cat.id] || 0;

                return (
                  <Chip
                    key={cat.id}
                    label={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        <span>{meta.icon}</span>
                        <span>{cat.name}</span>
                        <Box
                          component="span"
                          sx={{
                            bgcolor: isSelected ? 'rgba(255, 255, 255, 0.25)' : '#e2e8f0',
                            color: isSelected ? '#ffffff' : '#64748b',
                            fontSize: 10.5,
                            fontWeight: 800,
                            minWidth: 18,
                            height: 18,
                            borderRadius: '999px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            px: 0.5,
                          }}
                        >
                          {count}
                        </Box>
                      </Box>
                    }
                    onClick={() => handleCategorySelect(isSelected ? '' : cat.id)}
                    sx={{
                      fontWeight: isSelected ? 800 : 600,
                      fontSize: 12.5,
                      height: 34,
                      borderRadius: '12px',
                      bgcolor: isSelected ? '#0f172a' : '#f8fafc',
                      color: isSelected ? '#ffffff' : '#334155',
                      border: '1px solid',
                      borderColor: isSelected ? '#0f172a' : '#e2e8f0',
                      cursor: 'pointer',
                      flexShrink: 0,
                      transition: 'all 0.2s',
                      '&:hover': {
                        bgcolor: isSelected ? '#1e293b' : '#f1f5f9',
                        borderColor: isSelected ? '#1e293b' : '#cbd5e1',
                      },
                    }}
                  />
                );
              })}
            </Box>

            {/* Right Scroll Chevron */}
            <Tooltip title="Scroll categories right">
              <IconButton
                size="small"
                onClick={() => handleScrollCategories('right')}
                sx={{
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  p: 0.6,
                  color: '#64748b',
                  bgcolor: '#f8fafc',
                  flexShrink: 0,
                  '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
                }}
              >
                <ChevronRightIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Box>

          {/* Row 4: Active Filters Dismiss Bar (conditionally shown if filtered) */}
          {(selectedCategory || searchTerm) && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1,
                pt: 1,
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase', fontSize: 11, letterSpacing: '0.04em' }}>
                Active Filters:
              </Typography>

              {selectedCategory && (
                <Chip
                  size="small"
                  label={`Category: ${selectedCatObj?.name || 'Selected'}`}
                  onDelete={() => handleCategorySelect('')}
                  sx={{
                    bgcolor: '#eff6ff',
                    color: '#1d4ed8',
                    border: '1px solid #bfdbfe',
                    fontWeight: 700,
                    fontSize: 12,
                    '& .MuiChip-deleteIcon': { color: '#2563eb', '&:hover': { color: '#1e40af' } },
                  }}
                />
              )}

              {searchTerm && (
                <Chip
                  size="small"
                  label={`Keyword: "${searchTerm}"`}
                  onDelete={() => handleSearchChange('')}
                  sx={{
                    bgcolor: '#fef3c7',
                    color: '#b45309',
                    border: '1px solid #fde68a',
                    fontWeight: 700,
                    fontSize: 12,
                    '& .MuiChip-deleteIcon': { color: '#d97706', '&:hover': { color: '#92400e' } },
                  }}
                />
              )}

              <Button
                size="small"
                onClick={handleClearAll}
                sx={{
                  color: '#64748b',
                  fontSize: 11.5,
                  fontWeight: 600,
                  textTransform: 'none',
                  p: 0,
                  minWidth: 'auto',
                  ml: 0.5,
                  textDecoration: 'underline',
                  '&:hover': { color: '#ef4444', bgcolor: 'transparent' },
                }}
              >
                Clear all filters
              </Button>
            </Box>
          )}
        </Box>

        {/* Notice for Past Events if on Past Tab */}
        {activeTab === 'PAST' && (
          <Alert
            severity="info"
            sx={{
              mb: 3.5,
              borderRadius: 3,
              bgcolor: '#f8fafc',
              color: '#334155',
              border: '1px solid #cbd5e1',
              '& .MuiAlert-icon': { color: '#64748b' },
            }}
          >
            <strong>Concluded Events Archive:</strong> The events below have concluded or passed their scheduled date. They are displayed fully in grey for reference and cannot be booked.
          </Alert>
        )}

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 3, border: '1px solid #fecaca' }}>
            {error}
          </Alert>
        )}

        {/* 4. Events Grid */}
        {loading ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 14 }}>
            <CircularProgress sx={{ color: '#0f172a', mb: 2 }} />
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              Loading curated events list...
            </Typography>
          </Box>
        ) : displayedEvents.length === 0 ? (
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
            <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, color: '#0f172a' }}>
              {activeTab === 'PAST' ? 'No concluded events found' : 'No matching live events found'}
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              Try adjusting your search criteria, clearing selected categories, or switching tabs.
            </Typography>
            <Button
              variant="contained"
              onClick={handleClearAll}
              sx={{ bgcolor: '#0f172a', color: '#ffffff', textTransform: 'none', fontWeight: 700, '&:hover': { bgcolor: '#1e293b' } }}
            >
              Reset All Filters
            </Button>
          </Box>
        ) : (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Typography variant="subtitle2" sx={{ color: '#64748b', fontWeight: 600 }}>
                Showing {Math.min(visibleCount, displayedEvents.length)} of {displayedEvents.length} event{displayedEvents.length === 1 ? '' : 's'}
                {activeTab === 'UPCOMING' && ' • Available for instant reservation'}
                {activeTab === 'PAST' && ' • Concluded (Greyed Out)'}
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: {
                  xs: '1fr',
                  sm: 'repeat(2, 1fr)',
                  md: 'repeat(3, 1fr)',
                },
                gap: 3.5,
              }}
            >
              {visibleEvents.map((event) => (
                <EventCard
                  key={event.id}
                  event={event}
                  onBook={handleBookClick}
                  onJoinWaitingList={handleWaitingListClick}
                />
              ))}
            </Box>

            {/* Load More Events Block */}
            {displayedEvents.length > INITIAL_VISIBLE_COUNT && (
              <Box
                sx={{
                  mt: 6,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  p: { xs: 3.5, md: 4.5 },
                  borderRadius: 4,
                  bgcolor: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  textAlign: 'center',
                  boxShadow: '0 2px 10px rgba(0,0,0,0.02)',
                }}
              >
                {visibleCount < displayedEvents.length ? (
                  <>
                    {/* Progress Bar & Counter */}
                    <Box sx={{ width: '100%', maxWidth: 360, mb: 2.5 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography
                          variant="caption"
                          sx={{
                            color: '#64748b',
                            fontWeight: 700,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            fontSize: 11.5,
                          }}
                        >
                          Showing {visibleCount} of {displayedEvents.length} Events
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#0f172a', fontWeight: 800, fontSize: 12 }}>
                          {Math.round((visibleCount / displayedEvents.length) * 100)}%
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={(visibleCount / displayedEvents.length) * 100}
                        sx={{
                          height: 7,
                          borderRadius: 4,
                          bgcolor: '#e2e8f0',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: '#0f172a',
                            borderRadius: 4,
                          },
                        }}
                      />
                    </Box>

                    {/* Action Button */}
                    <Button
                      variant="contained"
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      endIcon={
                        loadingMore ? (
                          <CircularProgress size={18} sx={{ color: '#ffffff' }} />
                        ) : (
                          <KeyboardArrowDownIcon sx={{ fontSize: 20 }} />
                        )
                      }
                      sx={{
                        bgcolor: '#0f172a',
                        color: '#ffffff',
                        px: 4.5,
                        py: 1.5,
                        borderRadius: 3,
                        fontSize: 14.5,
                        fontWeight: 700,
                        textTransform: 'none',
                        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                        transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                        '&:hover': {
                          bgcolor: '#1e293b',
                          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.35)',
                          transform: 'translateY(-2px)',
                        },
                      }}
                    >
                      {loadingMore
                        ? 'Loading remaining events...'
                        : `Load More Events (${displayedEvents.length - visibleCount} Remaining)`}
                    </Button>

                    <Typography variant="caption" sx={{ color: '#94a3b8', mt: 1.75, fontWeight: 500, fontSize: 12 }}>
                      Click to reveal the remaining live concerts, summits, and festivals
                    </Typography>
                  </>
                ) : (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1 }}>
                    <CheckCircleIcon sx={{ color: '#10b981', fontSize: 22 }} />
                    <Typography variant="body2" sx={{ color: '#334155', fontWeight: 700 }}>
                      All {displayedEvents.length} events loaded! You've viewed all available experiences.
                    </Typography>
                  </Box>
                )}
              </Box>
            )}
          </Box>
        )}
      </Container>

      {/* Booking Modal with Razorpay Checkout */}
      <BookingModal
        event={selectedEvent}
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        onSuccess={loadEvents}
      />

      {/* Waiting List Modal for Sold Out Events */}
      <WaitingListModal
        event={waitingListEvent}
        open={waitingListOpen}
        onClose={() => setWaitingListOpen(false)}
        onSuccess={loadEvents}
      />
    </Box>
  );
};
