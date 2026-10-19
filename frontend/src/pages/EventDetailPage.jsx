import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Chip,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
  LinearProgress,
  IconButton,
  Tooltip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Avatar,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import ShareIcon from '@mui/icons-material/Share';
import BookmarkBorderIcon from '@mui/icons-material/BookmarkBorder';
import BookmarkIcon from '@mui/icons-material/Bookmark';
import VerifiedIcon from '@mui/icons-material/Verified';
import LocalParkingIcon from '@mui/icons-material/LocalParking';
import DirectionsSubwayIcon from '@mui/icons-material/DirectionsSubway';
import AccessibleIcon from '@mui/icons-material/Accessible';
import SecurityIcon from '@mui/icons-material/Security';
import MusicNoteIcon from '@mui/icons-material/MusicNote';
import LocalBarIcon from '@mui/icons-material/LocalBar';
import RestaurantIcon from '@mui/icons-material/Restaurant';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import DirectionsIcon from '@mui/icons-material/Directions';
import LaunchIcon from '@mui/icons-material/Launch';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import StarIcon from '@mui/icons-material/Star';
import CelebrationIcon from '@mui/icons-material/Celebration';
import ShieldIcon from '@mui/icons-material/Shield';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsApi } from '../api/eventsApi';
import { BookingModal } from '../components/BookingModal';
import { WaitingListModal } from '../components/WaitingListModal';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';
import { EventCard } from '../components/EventCard';

// Category Visual Styling
const getCategoryDetails = (slug, name) => {
  const normalized = (slug || name || '').toLowerCase();
  if (normalized.includes('music') || normalized.includes('concert') || normalized.includes('jazz') || normalized.includes('symphony')) {
    return {
      gradient: 'linear-gradient(135deg, #1e1b4b 0%, #312e81 40%, #4338ca 70%, #6366f1 100%)',
      badgeBg: '#e0e7ff',
      badgeColor: '#3730a3',
      icon: '🎷',
      genre: 'Live Music & Jazz Ensemble',
      tagline: 'An intimate evening of live acoustic melodies and fine vintages.',
    };
  }
  if (normalized.includes('food') || normalized.includes('wine') || normalized.includes('dine') || normalized.includes('nightlife')) {
    return {
      gradient: 'linear-gradient(135deg, #500724 0%, #831843 45%, #9d174d 75%, #db2777 100%)',
      badgeBg: '#fce7f3',
      badgeColor: '#9d174d',
      icon: '🍷',
      genre: 'Artisan Food & Wine Tasting',
      tagline: 'Curated culinary flights paired with artisan twilight cocktails.',
    };
  }
  if (normalized.includes('tech') || normalized.includes('ai') || normalized.includes('code') || normalized.includes('cloud')) {
    return {
      gradient: 'linear-gradient(135deg, #020617 0%, #0f172a 45%, #1e293b 75%, #0284c7 100%)',
      badgeBg: '#e0f2fe',
      badgeColor: '#0369a1',
      icon: '💻',
      genre: 'Tech Summit & Keynote',
      tagline: 'Leading engineers, founders, and architects shaping the future.',
    };
  }
  if (normalized.includes('comedy') || normalized.includes('theatre') || normalized.includes('drama')) {
    return {
      gradient: 'linear-gradient(135deg, #451a03 0%, #78350f 45%, #92400e 75%, #d97706 100%)',
      badgeBg: '#fef3c7',
      badgeColor: '#92400e',
      icon: '🎭',
      genre: 'Standup Comedy & Theatre',
      tagline: 'Unfiltered laughter, premier headliners, and unforgettable storytelling.',
    };
  }
  return {
    gradient: 'linear-gradient(135deg, #090d16 0%, #1e293b 50%, #334155 100%)',
    badgeBg: '#f1f5f9',
    badgeColor: '#0f172a',
    icon: '✨',
    genre: 'Live Cultural Experience',
    tagline: 'A premier live gathering curated for memories and genuine connection.',
  };
};

export const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);
  const [waitingListOpen, setWaitingListOpen] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isSaved, setIsSaved] = useState(false);
  const [selectedTier, setSelectedTier] = useState('STANDARD');
  const [relatedEvents, setRelatedEvents] = useState([]);

  const fetchEvent = async () => {
    setLoading(true);
    try {
      const res = await eventsApi.getEventById(id);
      if (res.success && res.data) {
        setEvent(res.data);
      } else {
        setError('Event not found.');
      }
    } catch (err) {
      setError(err.response?.data?.error?.message || 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  const fetchRelated = async () => {
    try {
      const res = await eventsApi.getEvents({ limit: 4 });
      if (res.success && res.data?.items) {
        setRelatedEvents(res.data.items.filter((e) => String(e.id) !== String(id)).slice(0, 3));
      }
    } catch {
      // Ignore background fetch error for recommendations
    }
  };

  useEffect(() => {
    fetchEvent();
    fetchRelated();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 20 }}>
        <CircularProgress sx={{ color: '#0f172a', mb: 2 }} />
        <Typography variant="body2" sx={{ color: '#64748b' }}>
          Loading curated event experience...
        </Typography>
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Container maxWidth="md" sx={{ py: 12, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3, borderRadius: 3 }}>
          {error || 'Event details unavailable.'}
        </Alert>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/events')}
          variant="contained"
          sx={{ bgcolor: '#0f172a', color: '#ffffff', borderRadius: 2 }}
        >
          Return to Events Catalog
        </Button>
      </Container>
    );
  }

  const isSoldOut = (event.available_capacity || 0) <= 0;
  const totalCap = event.total_capacity || 100;
  const availCap = event.available_capacity || 0;
  const percentLeft = Math.round((availCap / totalCap) * 100);
  const maxSelectable = Math.min(5, Math.max(1, availCap));

  const startVal = event.start_at || event.start_time;
  const endVal = event.end_at || event.end_time;
  const baseTicketPrice = parseFloat(event.price || event.ticket_price || 0);
  const ticketPrice = selectedTier === 'VIP' ? Math.round(baseTicketPrice * 1.5) : baseTicketPrice;
  const venueDisplay = event.venue_name || event.venue || 'Skyline Terrace Gardens';
  const categoryName = event.category_name || event.category?.name || 'Live Event';
  const theme = getCategoryDetails(event.slug, categoryName);

  const isFinished = Boolean(
    (startVal && new Date(startVal) < new Date()) ||
    event.status === 'COMPLETED' ||
    event.status === 'CANCELLED' ||
    event.is_finished
  );

  const startDate = startVal
    ? new Date(startVal).toLocaleDateString('en-IN', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date TBA';

  const startTime = startVal
    ? new Date(startVal).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const endTime = endVal
    ? new Date(endVal).toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      enqueueSnackbar('Event link copied to clipboard!', { variant: 'success' });
    }
  };

  const handleShareWhatsapp = () => {
    const text = `Check out "${event.title}" on EventPass: ${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', pb: 12 }}>
      {/* 1. TOP BREADCRUMB & UTILITY BAR */}
      <Box sx={{ bgcolor: '#ffffff', borderBottom: '1px solid #e2e8f0', py: 1.5 }}>
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Button
                startIcon={<ArrowBackIcon />}
                onClick={() => navigate('/events')}
                size="small"
                sx={{
                  color: '#475569',
                  bgcolor: '#f1f5f9',
                  border: '1px solid #e2e8f0',
                  borderRadius: 2,
                  textTransform: 'none',
                  fontWeight: 600,
                  fontSize: 13,
                  '&:hover': { bgcolor: '#e2e8f0' },
                }}
              >
                Back to Catalog
              </Button>
              <Typography variant="body2" sx={{ color: '#94a3b8', display: { xs: 'none', sm: 'inline' } }}>
                /
              </Typography>
              <Typography
                variant="body2"
                onClick={() => navigate('/events')}
                sx={{
                  color: '#64748b',
                  cursor: 'pointer',
                  fontWeight: 500,
                  display: { xs: 'none', sm: 'inline' },
                  '&:hover': { color: '#0f172a' },
                }}
              >
                Explore Events
              </Typography>
              <Typography variant="body2" sx={{ color: '#94a3b8', display: { xs: 'none', md: 'inline' } }}>
                /
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: '#0f172a',
                  fontWeight: 600,
                  maxWidth: 260,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: { xs: 'none', md: 'inline' },
                }}
              >
                {event.title}
              </Typography>
            </Box>

            {/* Social Sharing & Bookmark Actions */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Tooltip title="Share on WhatsApp">
                <IconButton
                  size="small"
                  onClick={handleShareWhatsapp}
                  sx={{
                    bgcolor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#16a34a',
                    '&:hover': { bgcolor: '#dcfce7', borderColor: '#86efac' },
                  }}
                >
                  <WhatsAppIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Copy Event Link">
                <IconButton
                  size="small"
                  onClick={handleCopyLink}
                  sx={{
                    bgcolor: '#f1f5f9',
                    border: '1px solid #e2e8f0',
                    color: '#475569',
                    '&:hover': { bgcolor: '#e2e8f0' },
                  }}
                >
                  <ShareIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={isSaved ? 'Saved to Wishlist' : 'Save for Later'}>
                <IconButton
                  size="small"
                  onClick={() => {
                    setIsSaved(!isSaved);
                    enqueueSnackbar(isSaved ? 'Removed from saved events' : 'Saved to your wishlist!', {
                      variant: isSaved ? 'info' : 'success',
                    });
                  }}
                  sx={{
                    bgcolor: isSaved ? '#fef2f2' : '#f1f5f9',
                    border: '1px solid',
                    borderColor: isSaved ? '#fecaca' : '#e2e8f0',
                    color: isSaved ? '#dc2626' : '#475569',
                    '&:hover': { bgcolor: isSaved ? '#fee2e2' : '#e2e8f0' },
                  }}
                >
                  {isSaved ? <BookmarkIcon sx={{ fontSize: 18 }} /> : <BookmarkBorderIcon sx={{ fontSize: 18 }} />}
                </IconButton>
              </Tooltip>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* 2. RICH ATMOSPHERIC HERO BANNER */}
      <Box
        sx={{
          background: theme.gradient,
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          pt: { xs: 5, md: 7 },
          pb: { xs: 6, md: 8 },
          boxShadow: 'inset 0 -1px 0 rgba(255,255,255,0.1)',
        }}
      >
        {/* Decorative background glows */}
        <Box
          sx={{
            position: 'absolute',
            top: -60,
            right: '10%',
            width: 380,
            height: 380,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.15) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          <Box sx={{ maxWidth: 840 }}>
            {/* Top Badges */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.25, mb: 2.5 }}>
              <Chip
                icon={<span style={{ fontSize: 14, marginRight: -2 }}>{theme.icon}</span>}
                label={theme.genre}
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.95)',
                  color: '#0f172a',
                  fontWeight: 800,
                  fontSize: 12,
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }}
              />
              {isFinished ? (
                <Chip
                  label="EVENT CONCLUDED"
                  size="small"
                  sx={{
                    bgcolor: '#0f172a',
                    color: '#94a3b8',
                    border: '1px solid rgba(255,255,255,0.2)',
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: '0.04em',
                  }}
                />
              ) : isSoldOut ? (
                <Chip
                  label="SOLD OUT"
                  size="small"
                  sx={{ bgcolor: '#dc2626', color: '#ffffff', fontWeight: 800, fontSize: 11 }}
                />
              ) : (
                <Chip
                  icon={<CelebrationIcon sx={{ fontSize: '14px !important', color: '#ffffff !important' }} />}
                  label="LIVE & SELLING FAST"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.25)',
                    color: '#6ee7b7',
                    border: '1px solid rgba(110, 231, 183, 0.4)',
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: '0.02em',
                  }}
                />
              )}
              <Chip
                label="18+ AGE RESTRICTION"
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.12)',
                  color: '#f8fafc',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  fontWeight: 700,
                  fontSize: 11,
                }}
              />
            </Box>

            {/* Event Title */}
            <Typography
              variant="h3"
              sx={{
                fontWeight: 900,
                fontSize: { xs: '1.95rem', sm: '2.6rem', md: '3.1rem' },
                lineHeight: 1.15,
                letterSpacing: '-0.03em',
                mb: 2,
                color: '#ffffff',
                textShadow: '0 2px 10px rgba(0,0,0,0.3)',
              }}
            >
              {event.title}
            </Typography>

            {/* Subtitle / Tagline */}
            <Typography
              variant="subtitle1"
              sx={{
                color: 'rgba(255, 255, 255, 0.85)',
                fontSize: { xs: '1rem', md: '1.15rem' },
                fontWeight: 400,
                mb: 3.5,
                lineHeight: 1.5,
              }}
            >
              {theme.tagline}
            </Typography>

            {/* Key Schedule and Location Strip */}
            <Box
              sx={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: { xs: 2, sm: 3.5 },
                p: { xs: 2, sm: 2.5 },
                bgcolor: 'rgba(15, 23, 42, 0.45)',
                backdropFilter: 'blur(12px)',
                borderRadius: 3,
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <EventIcon sx={{ color: '#ffffff', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600, display: 'block' }}>
                    DATE
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700 }}>
                    {startDate}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AccessTimeIcon sx={{ color: '#ffffff', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600, display: 'block' }}>
                    TIME
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700 }}>
                    {startTime} {endTime ? `- ${endTime}` : ''} (IST)
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                <Box
                  sx={{
                    width: 38,
                    height: 38,
                    borderRadius: 2,
                    bgcolor: 'rgba(255,255,255,0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <PlaceIcon sx={{ color: '#ffffff', fontSize: 20 }} />
                </Box>
                <Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.65)', fontWeight: 600, display: 'block' }}>
                    VENUE
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 700 }}>
                    {venueDisplay}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Container>
      </Box>

      {/* 3. FAST SPECS & HIGHLIGHTS RIBBON */}
      <Container maxWidth="lg" sx={{ mt: -3, mb: 4, position: 'relative', zIndex: 10 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
            gap: 2,
            p: 2,
            bgcolor: '#ffffff',
            borderRadius: 3.5,
            border: '1px solid #e2e8f0',
            boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.08)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AccessTimeIcon sx={{ color: '#0f172a', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                Duration
              </Typography>
              <Typography variant="subtitle2" sx={{ color: '#0f172a', fontWeight: 700 }}>
                ~4.5 Hours
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <SecurityIcon sx={{ color: '#0f172a', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                Age Guidance
              </Typography>
              <Typography variant="subtitle2" sx={{ color: '#0f172a', fontWeight: 700 }}>
                18+ Govt ID Check
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MusicNoteIcon sx={{ color: '#0f172a', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                Performance Format
              </Typography>
              <Typography variant="subtitle2" sx={{ color: '#0f172a', fontWeight: 700 }}>
                Live Acoustic & Vocals
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, p: 1 }}>
            <Box sx={{ width: 40, height: 40, borderRadius: 2, bgcolor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <QrCode2Icon sx={{ color: '#0f172a', fontSize: 22 }} />
            </Box>
            <Box>
              <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block' }}>
                Digital Gate Pass
              </Typography>
              <Typography variant="subtitle2" sx={{ color: '#0f172a', fontWeight: 700 }}>
                Instant QR Code on App
              </Typography>
            </Box>
          </Box>
        </Box>
      </Container>

      {/* 4. MAIN TWO-COLUMN CONTENT GRID */}
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' },
            gap: 4.5,
            alignItems: 'start',
          }}
        >
          {/* ================= LEFT COLUMN ================= */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {/* 4.1 About The Experience */}
            <Card sx={{ borderRadius: 3.5, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 2, letterSpacing: '-0.02em' }}>
                  About This Experience
                </Typography>
                <Typography
                  variant="body1"
                  sx={{
                    color: '#334155',
                    lineHeight: 1.85,
                    fontSize: '1.05rem',
                    mb: 3,
                    whiteSpace: 'pre-line',
                  }}
                >
                  {event.description ||
                    'Step into an enchanting evening celebrating vintage melodies, acoustic harmonies, and curated tastings. Enjoy panoramic skyline vistas from the open terrace as twilight sets over the city.'}
                </Typography>

                <Divider sx={{ my: 3, borderColor: '#f1f5f9' }} />

                {/* Experience Highlights Grid */}
                <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 2 }}>
                  Why You’ll Love This Event
                </Typography>

                <Box
                  sx={{
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                    gap: 2,
                  }}
                >
                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                      <LocalBarIcon sx={{ color: '#db2777', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Curated Tasting Flights
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b', lineHeight: 1.5, display: 'block' }}>
                      Sample a curated flight of artisan vintages and craft beverages selected by resident sommeliers.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                      <MusicNoteIcon sx={{ color: '#4f46e5', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Acoustic Skyline Sets
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b', lineHeight: 1.5, display: 'block' }}>
                      Smooth jazz arrangements, saxophone melodies, and soul vocalists playing live throughout sunset.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                      <RestaurantIcon sx={{ color: '#d97706', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Artisan Tapas & Charcuterie
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b', lineHeight: 1.5, display: 'block' }}>
                      Gourmet appetizers, handcrafted cheese boards, and warm tapas included with your ticket.
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.75 }}>
                      <ShieldIcon sx={{ color: '#059669', fontSize: 20 }} />
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Guaranteed Reserved Seating
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b', lineHeight: 1.5, display: 'block' }}>
                      Comfortable lounge tables with unobstructed terrace views and dedicated table hospitality.
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* 4.2 Performer & Host Spotlight */}
            <Card sx={{ borderRadius: 3.5, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5, letterSpacing: '-0.02em' }}>
                  Artist & Performer Lineup
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                  World-class performers curated specifically for this exclusive showcase.
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2.5 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid #e2e8f0',
                      bgcolor: '#ffffff',
                      alignItems: 'center',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: '#1e1b4b',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: 20,
                        border: '2px solid #cbd5e1',
                      }}
                    >
                      SJ
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        The Skyline Jazz Quintet
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#4f46e5', fontWeight: 700, display: 'block' }}>
                        Headlining Ensemble
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                        Saxophone, Double Bass, Rhodes Piano & Brushes
                      </Typography>
                    </Box>
                  </Box>

                  <Box
                    sx={{
                      display: 'flex',
                      gap: 2,
                      p: 2,
                      borderRadius: 3,
                      border: '1px solid #e2e8f0',
                      bgcolor: '#ffffff',
                      alignItems: 'center',
                    }}
                  >
                    <Avatar
                      sx={{
                        width: 56,
                        height: 56,
                        bgcolor: '#831843',
                        color: '#ffffff',
                        fontWeight: 800,
                        fontSize: 20,
                        border: '2px solid #cbd5e1',
                      }}
                    >
                      ER
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        Elena Rostova
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#db2777', fontWeight: 700, display: 'block' }}>
                        Lead Vocalist & Songwriter
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.25 }}>
                        Contemporary Jazz & Soul Classics
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* 4.3 Event Schedule / Timeline */}
            <Card sx={{ borderRadius: 3.5, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5, letterSpacing: '-0.02em' }}>
                  Experience Schedule
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                  All timings in Indian Standard Time (IST). Please arrive 20 minutes before gate opening.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {[
                    {
                      time: startTime || '01:30 AM',
                      title: 'Welcome Reception & Check-in',
                      desc: 'Scan digital QR passes, receive complimentary welcome vintage flute, and take your reserved lounge seating.',
                      icon: '🥂',
                    },
                    {
                      time: '02:30 AM',
                      title: 'Sommelier Tasting & Acoustic Opening',
                      desc: 'Guided tasting notes through select artisan vineyard flights paired with live acoustic guitar arrangements.',
                      icon: '🍷',
                    },
                    {
                      time: '03:45 AM',
                      title: 'Twilight Skyline Quintet Main Set',
                      desc: 'Full jazz ensemble headline performance featuring classic and modern vocal standards under the twilight sky.',
                      icon: '🎷',
                    },
                    {
                      time: endTime || '05:30 AM',
                      title: 'Gourmet Tapas & Closing Jam',
                      desc: 'Dessert pairings, open networking on the terrace, and photo sessions with the resident musicians.',
                      icon: '✨',
                    },
                  ].map((item, idx) => (
                    <Box
                      key={idx}
                      sx={{
                        display: 'flex',
                        gap: 2.5,
                        alignItems: 'flex-start',
                        position: 'relative',
                      }}
                    >
                      <Box
                        sx={{
                          width: 44,
                          height: 44,
                          borderRadius: '50%',
                          bgcolor: '#f1f5f9',
                          border: '2px solid #cbd5e1',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: 18,
                          flexShrink: 0,
                          zIndex: 1,
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Box sx={{ flexGrow: 1, pt: 0.5, pb: 1.5, borderBottom: idx < 3 ? '1px dashed #e2e8f0' : 'none' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.25 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                            {item.title}
                          </Typography>
                          <Chip
                            label={item.time}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: 11,
                              fontWeight: 700,
                              bgcolor: '#f1f5f9',
                              color: '#334155',
                              border: '1px solid #e2e8f0',
                            }}
                          />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748b', lineHeight: 1.5, display: 'block' }}>
                          {item.desc}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* 4.4 Venue & Location Guide */}
            <Card sx={{ borderRadius: 3.5, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                  <Box>
                    <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                      Venue & Directions
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                      Panoramic rooftop terrace in the heart of the city
                    </Typography>
                  </Box>
                  <Button
                    startIcon={<DirectionsIcon />}
                    endIcon={<LaunchIcon sx={{ fontSize: 14 }} />}
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      const query = encodeURIComponent(`${venueDisplay}, ${event.venue_address || ''}`);
                      window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
                    }}
                    sx={{
                      borderColor: '#cbd5e1',
                      color: '#0f172a',
                      fontWeight: 700,
                      borderRadius: 2,
                      textTransform: 'none',
                      '&:hover': { borderColor: '#0f172a', bgcolor: '#f8fafc' },
                    }}
                  >
                    Directions
                  </Button>
                </Box>

                {/* Simulated Interactive Map Preview Card */}
                <Box
                  sx={{
                    height: 180,
                    borderRadius: 3,
                    bgcolor: '#0f172a',
                    backgroundImage:
                      'radial-gradient(#334155 1.5px, transparent 1.5px), radial-gradient(#334155 1.5px, #0f172a 1.5px)',
                    backgroundSize: '24px 24px',
                    backgroundPosition: '0 0, 12px 12px',
                    position: 'relative',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 3,
                    border: '1px solid #334155',
                  }}
                >
                  <Box
                    sx={{
                      p: 2,
                      borderRadius: 2.5,
                      bgcolor: 'rgba(255, 255, 255, 0.95)',
                      backdropFilter: 'blur(10px)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      boxShadow: '0 10px 25px rgba(0,0,0,0.3)',
                    }}
                  >
                    <PlaceIcon sx={{ color: '#dc2626', fontSize: 28 }} />
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        {venueDisplay}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                        {event.venue_address || 'Rooftop Terrace, Central Commercial Avenue'}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Transit & Accessibility Pills */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(3, 1fr)' }, gap: 2 }}>
                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <DirectionsSubwayIcon sx={{ color: '#0284c7', fontSize: 18 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Metro Access
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Nearest Station: 350m (Exit Gate 2)
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <LocalParkingIcon sx={{ color: '#16a34a', fontSize: 18 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Valet Parking
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Complimentary on-site valet
                    </Typography>
                  </Box>

                  <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                      <AccessibleIcon sx={{ color: '#8b5cf6', fontSize: 18 }} />
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Accessibility
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                      Elevator & ramp accessible
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>

            {/* 4.5 Terms & Entry Guidelines */}
            <Card sx={{ borderRadius: 3.5, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 2, letterSpacing: '-0.02em' }}>
                  Entry Guidelines & Terms
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {[
                    'Photo ID Requirement: A physical or DigiLocker Govt Photo ID (Aadhaar, Passport, Driver License) matching your booking name is mandatory at reception.',
                    'Digital QR Ticket: Please keep your digital ticket barcode ready on your smartphone screen for contactless gate scanning.',
                    'Age Policy: Strictly 18 years and above. Minors will not be permitted entry.',
                    'Entry Cutoff: Venue security reserves the right to deny admission 45 minutes after commencement to preserve acoustic performance quality.',
                    'Outside Food & Drink: Outside edible items, bottled beverages, and professional cinema cameras are not allowed.',
                  ].map((rule, idx) => (
                    <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                      <CheckCircleIcon sx={{ color: '#059669', fontSize: 18, mt: 0.25, flexShrink: 0 }} />
                      <Typography variant="body2" sx={{ color: '#475569', lineHeight: 1.6 }}>
                        {rule}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>

            {/* 4.6 Frequently Asked Questions (Accordion) */}
            <Card sx={{ borderRadius: 3.5, border: '1px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.03)' }}>
              <CardContent sx={{ p: { xs: 3, md: 4 } }}>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5, letterSpacing: '-0.02em' }}>
                  Frequently Asked Questions
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                  Everything you need to know about booking, cancellation, and venue facilities.
                </Typography>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  <Accordion
                    disableGutters
                    elevation={0}
                    sx={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px !important',
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        What is the cancellation and refund policy?
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.7 }}>
                        You can cancel your booking up to 24 hours prior to the event start time directly from your
                        <strong> My Bookings</strong> page for a 100% instant refund directly to your original payment method.
                      </Typography>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion
                    disableGutters
                    elevation={0}
                    sx={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px !important',
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Are food and beverages included in the admission ticket?
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.7 }}>
                        Yes! Each ticket includes tasting tokens for the sommelier-guided vintages as well as curated artisan charcuterie and warm tapas. Additional beverage bottles and menu items can be purchased at the venue bar.
                      </Typography>
                    </AccordionDetails>
                  </Accordion>

                  <Accordion
                    disableGutters
                    elevation={0}
                    sx={{
                      border: '1px solid #e2e8f0',
                      borderRadius: '12px !important',
                      '&:before': { display: 'none' },
                    }}
                  >
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                        Can I transfer my ticket to a friend or colleague?
                      </Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                      <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.7 }}>
                        Yes. Simply share your digital confirmation pass or QR voucher with your guest. They will only need to show the QR code and their valid photo ID matching the attendee entry check.
                      </Typography>
                    </AccordionDetails>
                  </Accordion>
                </Box>
              </CardContent>
            </Card>

            {/* 4.7 Verified Host / Organizer Profile Card */}
            <Card sx={{ borderRadius: 3.5, border: '1px solid #e2e8f0', bgcolor: '#ffffff' }}>
              <CardContent sx={{ p: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                  <Avatar sx={{ width: 48, height: 48, bgcolor: '#0f172a', fontWeight: 800 }}>EP</Avatar>
                  <Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        EventPass Curated Experiences
                      </Typography>
                      <VerifiedIcon sx={{ color: '#0284c7', fontSize: 18 }} />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mt: 0.25 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.3, color: '#d97706' }}>
                        <StarIcon sx={{ fontSize: 16 }} />
                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#0f172a' }}>
                          4.9 / 5
                        </Typography>
                      </Box>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        • 2,840+ Attendee Reviews
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 600 }}>
                        • Verified Host
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => enqueueSnackbar('Inquiry message sent to organizer desk.', { variant: 'info' })}
                  sx={{
                    borderRadius: 2,
                    borderColor: '#cbd5e1',
                    color: '#0f172a',
                    fontWeight: 700,
                    textTransform: 'none',
                    display: { xs: 'none', sm: 'inline-flex' },
                  }}
                >
                  Contact Host
                </Button>
              </CardContent>
            </Card>
          </Box>

          {/* ================= RIGHT COLUMN: STICKY BOOKING CONSOLE ================= */}
          <Box sx={{ position: { xs: 'static', lg: 'sticky' }, top: 96 }}>
            <Card
              sx={{
                borderRadius: 4,
                border: '1px solid #cbd5e1',
                boxShadow: '0 20px 35px -5px rgba(15, 23, 42, 0.12), 0 10px 15px -5px rgba(15, 23, 42, 0.05)',
                bgcolor: '#ffffff',
                overflow: 'hidden',
              }}
            >
              {/* Card Header Strip */}
              <Box
                sx={{
                  p: 2.5,
                  bgcolor: isFinished ? '#475569' : '#0f172a',
                  color: '#ffffff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.7)', fontWeight: 600, letterSpacing: '0.04em' }}>
                    SELECT TICKETS
                  </Typography>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#ffffff', lineHeight: 1.2 }}>
                    Instant Digital Reservation
                  </Typography>
                </Box>
                <Chip
                  icon={<VerifiedIcon sx={{ fontSize: '13px !important', color: '#ffffff !important' }} />}
                  label="Razorpay"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.15)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: 11,
                    border: '1px solid rgba(255,255,255,0.25)',
                  }}
                />
              </Box>

              <CardContent sx={{ p: 3 }}>
                {/* Ticket Tier Switcher */}
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600, display: 'block', mb: 1 }}>
                    CHOOSE ADMISSION PASS
                  </Typography>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
                    {/* Standard Tier */}
                    <Box
                      onClick={() => setSelectedTier('STANDARD')}
                      sx={{
                        p: 1.75,
                        borderRadius: 2.5,
                        border: '2px solid',
                        borderColor: selectedTier === 'STANDARD' ? '#0f172a' : '#e2e8f0',
                        bgcolor: selectedTier === 'STANDARD' ? '#f8fafc' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease-in-out',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                          Standard Experience Pass
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          Full admission • Welcome wine flute • Reserved seat
                        </Typography>
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        ₹{baseTicketPrice.toLocaleString('en-IN')}
                      </Typography>
                    </Box>

                    {/* VIP Tier */}
                    <Box
                      onClick={() => setSelectedTier('VIP')}
                      sx={{
                        p: 1.75,
                        borderRadius: 2.5,
                        border: '2px solid',
                        borderColor: selectedTier === 'VIP' ? '#0f172a' : '#e2e8f0',
                        bgcolor: selectedTier === 'VIP' ? '#f8fafc' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease-in-out',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                            VIP Twilight Experience
                          </Typography>
                          <Chip label="PREMIUM" size="small" sx={{ height: 18, fontSize: 9.5, fontWeight: 800, bgcolor: '#fef3c7', color: '#92400e' }} />
                        </Box>
                        <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                          Front-row terrace lounge • Tapas platter • Fast-track entry
                        </Typography>
                      </Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        ₹{Math.round(baseTicketPrice * 1.5).toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Quantity Counter */}
                <Box
                  sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    p: 2,
                    bgcolor: '#f8fafc',
                    borderRadius: 3,
                    border: '1px solid #e2e8f0',
                    mb: 3,
                  }}
                >
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Ticket Quantity
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700, display: 'block' }}>
                      {availCap} tickets left
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#ea580c', fontWeight: 600, display: 'block', fontSize: 11 }}>
                      Limit: Max 5 tickets per user / email
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <IconButton
                      size="small"
                      disabled={quantity <= 1 || isSoldOut || isFinished}
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      sx={{
                        width: 34,
                        height: 34,
                        bgcolor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        '&:hover': { bgcolor: '#f1f5f9' },
                      }}
                    >
                      <RemoveIcon sx={{ fontSize: 16 }} />
                    </IconButton>

                    <Typography variant="h6" sx={{ minWidth: 28, textAlign: 'center', fontWeight: 900, color: '#0f172a' }}>
                      {quantity}
                    </Typography>

                    <IconButton
                      size="small"
                      disabled={quantity >= maxSelectable || isSoldOut || isFinished}
                      onClick={() => setQuantity((q) => Math.min(maxSelectable, q + 1))}
                      sx={{
                        width: 34,
                        height: 34,
                        bgcolor: '#ffffff',
                        border: '1px solid #cbd5e1',
                        color: '#0f172a',
                        '&:hover': { bgcolor: '#f1f5f9' },
                      }}
                    >
                      <AddIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Box>

                {/* Inventory Availability Progress */}
                <Box sx={{ mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.75 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 600 }}>
                      Live Inventory
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 800,
                        color: isFinished ? '#64748b' : isSoldOut ? '#dc2626' : percentLeft < 20 ? '#d97706' : '#059669',
                      }}
                    >
                      {isFinished ? 'Concluded' : isSoldOut ? 'Sold Out' : `${availCap} tickets remaining (${percentLeft}% available)`}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={isFinished ? 100 : Math.min(100, Math.max(0, percentLeft))}
                    sx={{
                      height: 7,
                      borderRadius: 4,
                      bgcolor: '#e2e8f0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: isFinished ? '#94a3b8' : isSoldOut ? '#dc2626' : percentLeft < 20 ? '#d97706' : '#059669',
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>

                {/* Transparent Price Calculation */}
                <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2.5, border: '1px solid #e2e8f0', mb: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Base Fare ({quantity} × ₹{ticketPrice.toLocaleString('en-IN')})
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                      ₹{(ticketPrice * quantity).toLocaleString('en-IN')}
                    </Typography>
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#64748b' }}>
                      Platform Fee & Booking Charge
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: '#16a34a' }}>
                      FREE (₹0)
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 1.5, borderColor: '#cbd5e1', borderStyle: 'dashed' }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        Total Amount
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        Inclusive of all GST & taxes
                      </Typography>
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: '#0f172a' }}>
                      <CurrencyRupeeIcon sx={{ fontSize: 24, mr: 0.1 }} />
                      <Typography variant="h5" sx={{ fontWeight: 900, color: '#0f172a' }}>
                        {(ticketPrice * quantity).toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                  </Box>
                </Box>

                {/* Primary Booking or Waiting List CTA Button */}
                {isSoldOut && !isFinished ? (
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    onClick={() => setWaitingListOpen(true)}
                    startIcon={<HourglassTopIcon />}
                    sx={{
                      py: 1.75,
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      bgcolor: '#ea580c',
                      color: '#ffffff',
                      borderRadius: 3,
                      textTransform: 'none',
                      boxShadow: '0 4px 14px rgba(234, 88, 12, 0.25)',
                      '&:hover': {
                        bgcolor: '#c2410c',
                        boxShadow: '0 6px 20px rgba(234, 88, 12, 0.35)',
                      },
                    }}
                  >
                    Join Priority Waiting List
                  </Button>
                ) : (
                  <Button
                    fullWidth
                    variant="contained"
                    size="large"
                    disabled={isSoldOut || isFinished}
                    onClick={() => {
                      if (!isAuthenticated) {
                        navigate('/login', { state: { from: { pathname: `/events/${event.id}` } } });
                      } else {
                        setBookingModalOpen(true);
                      }
                    }}
                    startIcon={<ConfirmationNumberIcon />}
                    sx={{
                      py: 1.75,
                      fontSize: '1.05rem',
                      fontWeight: 800,
                      bgcolor: isFinished ? '#94a3b8' : '#0f172a',
                      color: '#ffffff',
                      borderRadius: 3,
                      textTransform: 'none',
                      boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                      '&:hover': {
                        bgcolor: '#1e293b',
                        boxShadow: '0 6px 20px rgba(15, 23, 42, 0.3)',
                      },
                    }}
                  >
                    {isFinished ? 'Event Concluded' : `Reserve Tickets Now (₹${(ticketPrice * quantity).toLocaleString('en-IN')})`}
                  </Button>
                )}

                {/* Trust Badges */}
                <Box sx={{ mt: 3, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <ShieldIcon sx={{ fontSize: 16, color: '#16a34a' }} />
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                      100% Buyer Protection & Atomic Seat Locking
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <QrCode2Icon sx={{ fontSize: 16, color: '#0284c7' }} />
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                      Instant QR Pass on screen & delivered via Email
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <VerifiedIcon sx={{ fontSize: 16, color: '#64748b' }} />
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                      Official ticketing partner for {venueDisplay}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Box>
        </Box>

        {/* 5. RECOMMENDATIONS SECTION: YOU MIGHT ALSO LIKE */}
        {relatedEvents.length > 0 && (
          <Box sx={{ mt: 8 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', mb: 3 }}>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                  You Might Also Like
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                  Curated live gatherings and concerts happening soon
                </Typography>
              </Box>
              <Button
                onClick={() => navigate('/events')}
                sx={{
                  color: '#2563eb',
                  fontWeight: 700,
                  textTransform: 'none',
                  fontSize: 14,
                  '&:hover': { bgcolor: '#eff6ff' },
                }}
              >
                View Full Catalog →
              </Button>
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
              {relatedEvents.map((relEvent) => (
                <EventCard
                  key={relEvent.id}
                  event={relEvent}
                  onBook={(e) => {
                    navigate(`/events/${e.id}`);
                  }}
                />
              ))}
            </Box>
          </Box>
        )}
      </Container>

      {/* Booking Modal with Razorpay Checkout */}
      <BookingModal
        event={event}
        open={bookingModalOpen}
        initialQuantity={quantity}
        onClose={() => setBookingModalOpen(false)}
        onSuccess={() => fetchEvent()}
      />

      {/* Waiting List Modal for Sold Out Events */}
      <WaitingListModal
        event={event}
        open={waitingListOpen}
        onClose={() => setWaitingListOpen(false)}
        onSuccess={() => fetchEvent()}
      />
    </Box>
  );
};
