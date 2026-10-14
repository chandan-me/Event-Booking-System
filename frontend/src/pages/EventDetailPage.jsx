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
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
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
        <CircularProgress sx={{ color: '#0f172a' }} />
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

  const startVal = event.start_at || event.start_time;
  const endVal = event.end_at || event.end_time;
  const ticketPrice = parseFloat(event.price || event.ticket_price || 0);
  const venueDisplay = event.venue_name || event.venue || 'Venue TBA';

  const startDate = startVal
    ? new Date(startVal).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Date TBA';
  const startTime = startVal
    ? new Date(startVal).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';
  const endTime = endVal
    ? new Date(endVal).toLocaleTimeString(undefined, {
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  return (
    <Box sx={{ bgcolor: '#ffffff', minHeight: '100vh', pb: 10 }}>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate('/')}
          sx={{ mb: 4, color: '#64748b', bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 2 }}
        >
          Back to Catalog
        </Button>

        <Grid container spacing={5}>
          {/* Left Column: Event Narrative & Metadata */}
          <Grid item xs={12} md={8}>
            <Box sx={{ mb: 3 }}>
              <Chip
                label={event.category?.name || 'Live Event'}
                size="small"
                sx={{
                  bgcolor: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  fontWeight: 700,
                  mb: 2,
                }}
              />
              <Typography variant="h3" sx={{ fontWeight: 800, mb: 2, lineHeight: 1.2, color: '#0f172a', letterSpacing: '-0.025em' }}>
                {event.title}
              </Typography>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, color: '#64748b', mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <EventIcon sx={{ color: '#0f172a', fontSize: 20 }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                    {startDate}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <AccessTimeIcon sx={{ color: '#64748b', fontSize: 20 }} />
                  <Typography variant="body2">
                    {startTime} - {endTime}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <PlaceIcon sx={{ color: '#64748b', fontSize: 20 }} />
                  <Typography variant="body2">
                    {venueDisplay}
                  </Typography>
                </Box>
              </Box>
            </Box>

            <Divider sx={{ my: 4, borderColor: '#e2e8f0' }} />

            <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#0f172a' }}>
              About This Experience
            </Typography>
            <Typography
              variant="body1"
              sx={{
                color: '#475569',
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
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
                borderRadius: 4,
              }}
            >
              <CardContent sx={{ p: 4 }}>
                <Typography variant="caption" sx={{ color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, fontWeight: 600 }}>
                  Admission Price (INR)
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, mt: 0.5 }}>
                  <CurrencyRupeeIcon sx={{ fontSize: 32, mr: 0.5, color: '#0f172a' }} />
                  <Typography variant="h4" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    {ticketPrice.toLocaleString('en-IN')}{' '}
                    <Typography component="span" variant="body2" sx={{ color: '#64748b', fontWeight: 500 }}>
                      / ticket
                    </Typography>
                  </Typography>
                </Box>

                {/* Real-time Inventory Meter */}
                <Box sx={{ mb: 3.5, p: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 3 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
                      Available Tickets
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: isSoldOut ? '#dc2626' : '#0f172a' }}>
                      {event.available_capacity} left
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={percentLeft}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#e2e8f0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: isSoldOut ? '#dc2626' : percentLeft < 20 ? '#d97706' : '#059669',
                        borderRadius: 4,
                      },
                    }}
                  />
                </Box>

                <Button
                  fullWidth
                  variant="contained"
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
                  sx={{
                    py: 1.5,
                    fontSize: '1rem',
                    fontWeight: 700,
                    bgcolor: '#f5f5f5',
                    color: '#0f172a',
                    border: '1px solid #cbd5e1',
                    '&:hover': {
                      bgcolor: '#e5e5e5',
                      borderColor: '#94a3b8',
                    },
                  }}
                >
                  {isSoldOut ? 'Sold Out' : 'Reserve Tickets (INR)'}
                </Button>

                <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: '#64748b', mt: 2 }}>
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
    </Box>
  );
};
