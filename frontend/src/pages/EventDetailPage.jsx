import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Grid,
  Chip,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Divider,
  LinearProgress,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import { useParams, useNavigate } from 'react-router-dom';
import { eventsApi } from '../api/eventsApi';
import { BookingModal } from '../components/BookingModal';
import { useAuth } from '../context/AuthContext';

export const EventDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [bookingModalOpen, setBookingModalOpen] = useState(false);

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

  useEffect(() => {
    fetchEvent();
  }, [id]);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 16 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  if (error || !event) {
    return (
      <Container maxWidth="md" sx={{ py: 10, textAlign: 'center' }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Event details unavailable.'}
        </Alert>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/')}>
          Return to Events
        </Button>
      </Container>
    );
  }

  const isSoldOut = (event.available_capacity || 0) <= 0;
  const percentLeft = Math.round(((event.available_capacity || 0) / (event.total_capacity || 100)) * 100);

  const startDate = new Date(event.start_time).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const startTime = new Date(event.start_time).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const endTime = new Date(event.end_time).toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Container maxWidth="lg" sx={{ py: 6 }}>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate('/')}
        sx={{ mb: 4, color: 'text.secondary' }}
      >
        Back to Catalog
      </Button>

      <Grid container spacing={5}>
        {/* Left Column: Event Narrative & Metadata */}
        <Grid item xs={12} md={8}>
          <Box sx={{ mb: 3 }}>
            <Chip
              label={event.category?.name || 'Live Event'}
              color="primary"
              size="small"
              sx={{ fontWeight: 700, mb: 2 }}
            />
            <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.2 }}>
              {event.title}
            </Typography>

            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, color: 'text.secondary', mt: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <EventIcon sx={{ color: '#818cf8', fontSize: 20 }} />
                <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                  {startDate}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AccessTimeIcon sx={{ color: '#818cf8', fontSize: 20 }} />
                <Typography variant="body2">
                  {startTime} - {endTime}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PlaceIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
                <Typography variant="body2">
                  {event.venue}
                </Typography>
              </Box>
            </Box>
          </Box>

          <Divider sx={{ my: 4 }} />

          <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
            About This Experience
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: 'text.secondary',
              lineHeight: 1.8,
              fontSize: '1.05rem',
              whiteSpace: 'pre-line',
            }}
          >
            {event.description || 'No detailed description provided for this event.'}
          </Typography>
        </Grid>

        {/* Right Column: Reservation Action Card */}
        <Grid item xs={12} md={4}>
          <Card
            sx={{
              position: 'sticky',
              top: 100,
              bgcolor: 'rgba(17, 24, 39, 0.95)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.7)',
            }}
          >
            <CardContent sx={{ p: 4 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 1 }}>
                Admission Price
              </Typography>
              <Typography variant="h4" sx={{ fontWeight: 800, color: '#fbbf24', mb: 3 }}>
                ${parseFloat(event.ticket_price || 0).toFixed(2)}{' '}
                <Typography component="span" variant="body2" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                  / ticket
                </Typography>
              </Typography>

              {/* Real-time Inventory Meter */}
              <Box sx={{ mb: 3.5, p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    Available Tickets
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: isSoldOut ? 'error.main' : 'text.primary' }}>
                    {event.available_capacity} left
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={percentLeft}
                  sx={{
                    height: 8,
                    borderRadius: 4,
                    bgcolor: 'rgba(255, 255, 255, 0.08)',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: isSoldOut ? '#ef4444' : percentLeft < 20 ? '#f59e0b' : '#10b981',
                      borderRadius: 4,
                    },
                  }}
                />
              </Box>

              <Button
                fullWidth
                variant="contained"
                color="primary"
                size="large"
                disabled={isSoldOut}
                onClick={() => {
                  if (!isAuthenticated) {
                    navigate('/login', { state: { from: { pathname: `/events/${event.id}` } } });
                  } else {
                    setBookingModalOpen(true);
                  }
                }}
                startIcon={<ConfirmationNumberIcon />}
                sx={{ py: 1.5, fontSize: '1rem', fontWeight: 700 }}
              >
                {isSoldOut ? 'Sold Out' : 'Reserve Tickets'}
              </Button>

              <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mt: 2 }}>
                Instant confirmation via Email OTP & RabbitMQ notification
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Booking Modal */}
      <BookingModal
        event={event}
        open={bookingModalOpen}
        onClose={() => setBookingModalOpen(false)}
        onSuccess={() => fetchEvent()}
      />
    </Container>
  );
};
