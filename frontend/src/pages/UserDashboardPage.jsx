import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EventIcon from '@mui/icons-material/Event';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import { useNavigate } from 'react-router-dom';
import { bookingsApi } from '../api/bookingsApi';
import { useSnackbar } from 'notistack';

export const UserDashboardPage = () => {
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Cancel dialog state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('Change of plans');
  const [cancelling, setCancelling] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const res = await bookingsApi.getMyBookings();
      if (res.success && res.data) {
        setBookings(res.data.bookings || []);
      }
    } catch (err) {
      setErrorMsg('Failed to load your reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleOpenCancelDialog = (booking) => {
    setCancelTarget(booking);
    setCancelReason('Schedule conflict');
  };

  const handleCloseCancelDialog = () => {
    setCancelTarget(null);
  };

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;

    setCancelling(true);
    try {
      const res = await bookingsApi.cancelBooking(cancelTarget.id, cancelReason);
      if (res.success) {
        enqueueSnackbar(`Booking ${cancelTarget.booking_reference} cancelled. Capacity released.`, {
          variant: 'info',
        });
        handleCloseCancelDialog();
        fetchBookings();
      }
    } catch (err) {
      const serverMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Failed to cancel booking.';
      enqueueSnackbar(serverMessage, { variant: 'error' });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <Box sx={{ bgcolor: '#ffffff', minHeight: '100vh', pb: 12 }}>
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ mb: 5 }}>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 1, color: '#0f172a' }}>
            My Event Bookings
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b' }}>
            View, track, and manage your reserved tickets in INR across all live events.
          </Typography>
        </Box>

        {errorMsg && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>
            {errorMsg}
          </Alert>
        )}

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress sx={{ color: '#0f172a' }} />
          </Box>
        ) : bookings.length === 0 ? (
          <Card
            sx={{
              textAlign: 'center',
              py: 10,
              px: 3,
              borderRadius: 4,
              bgcolor: '#f8fafc',
              border: '1px dashed #cbd5e1',
            }}
          >
            <ConfirmationNumberIcon sx={{ fontSize: 56, color: '#94a3b8', mb: 2 }} />
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
              No bookings yet
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              You haven't reserved tickets for any upcoming events.
            </Typography>
            <Button
              variant="contained"
              onClick={() => navigate('/')}
              sx={{ bgcolor: '#0f172a', color: '#ffffff', '&:hover': { bgcolor: '#1e293b' } }}
            >
              Explore Events Catalog
            </Button>
          </Card>
        ) : (
          <Grid container spacing={3}>
            {bookings.map((booking) => {
              const isConfirmed = booking.status === 'CONFIRMED';
              const isCancelled = booking.status === 'CANCELLED';

              return (
                <Grid item xs={12} key={booking.id}>
                  <Card
                    sx={{
                      bgcolor: '#ffffff',
                      border: '1px solid #e2e8f0',
                      boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                      borderRadius: 3.5,
                      p: { xs: 2, sm: 3 },
                      transition: 'all 0.2s',
                      '&:hover': {
                        borderColor: '#cbd5e1',
                        boxShadow: '0 8px 16px -2px rgba(15, 23, 42, 0.06)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: '0 !important' }}>
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: { xs: 'column', sm: 'row' },
                          justifyContent: 'space-between',
                          alignItems: { xs: 'flex-start', sm: 'center' },
                          gap: 2,
                        }}
                      >
                        {/* Left: Info */}
                        <Box sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                              {booking.event?.title || `Event #${booking.event_id}`}
                            </Typography>
                            <Chip
                              size="small"
                              icon={isConfirmed ? <CheckCircleIcon sx={{ fontSize: '14px !important' }} /> : <CancelOutlinedIcon sx={{ fontSize: '14px !important' }} />}
                              label={booking.status}
                              sx={{
                                fontWeight: 700,
                                bgcolor: isConfirmed ? '#ecfdf5' : '#fef2f2',
                                color: isConfirmed ? '#065f46' : '#991b1b',
                                border: '1px solid',
                                borderColor: isConfirmed ? '#a7f3d0' : '#fecaca',
                              }}
                            />
                          </Box>

                          <Box
                            sx={{
                              display: 'flex',
                              flexWrap: 'wrap',
                              gap: 2.5,
                              color: '#64748b',
                              fontSize: 13,
                            }}
                          >
                            <Box>
                              Ref:{' '}
                              <Typography component="span" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                {booking.booking_reference}
                              </Typography>
                            </Box>
                            <Box>
                              Tickets:{' '}
                              <Typography component="span" sx={{ fontWeight: 600, color: '#0f172a' }}>
                                {booking.quantity}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              Total Paid:{' '}
                              <CurrencyRupeeIcon sx={{ fontSize: 14, ml: 0.5, color: '#059669' }} />
                              <Typography component="span" sx={{ fontWeight: 800, color: '#059669' }}>
                                {parseFloat(booking.total_price || 0).toLocaleString('en-IN')}
                              </Typography>
                            </Box>
                            <Box>
                              Date:{' '}
                              <Typography component="span">
                                {new Date(booking.created_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>

                        {/* Right: Actions */}
                        <Box sx={{ display: 'flex', gap: 1.5, width: { xs: '100%', sm: 'auto' }, justifyContent: 'flex-end' }}>
                          {isConfirmed && (
                            <Button
                              variant="outlined"
                              color="error"
                              size="small"
                              onClick={() => handleOpenCancelDialog(booking)}
                              sx={{
                                borderColor: '#fca5a5',
                                color: '#dc2626',
                                '&:hover': { borderColor: '#ef4444', bgcolor: '#fef2f2' },
                              }}
                            >
                              Cancel Reservation
                            </Button>
                          )}
                          <Button
                            variant="contained"
                            size="small"
                            onClick={() => navigate(`/events/${booking.event_id}`)}
                            sx={{
                              bgcolor: '#f5f5f5',
                              color: '#0f172a',
                              border: '1px solid #e2e8f0',
                              fontWeight: 600,
                              '&:hover': { bgcolor: '#e5e5e5' },
                            }}
                          >
                            View Event
                          </Button>
                        </Box>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}

        {/* Cancellation Confirmation Dialog */}
        <Dialog
          open={Boolean(cancelTarget)}
          onClose={!cancelling ? handleCloseCancelDialog : undefined}
          maxWidth="xs"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                bgcolor: '#ffffff',
                backgroundImage: 'none',
                borderRadius: 4,
                border: '1px solid #e2e8f0',
                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
              },
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>Cancel Booking</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              Are you sure you want to cancel booking <strong>{cancelTarget?.booking_reference}</strong>? Released tickets will be immediately available back to other attendees via RabbitMQ compensation.
            </Typography>
            <TextField
              fullWidth
              label="Cancellation Reason"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              margin="dense"
              size="small"
            />
          </DialogContent>
          <DialogActions sx={{ p: 2, pt: 0 }}>
            <Button onClick={handleCloseCancelDialog} disabled={cancelling} sx={{ color: '#64748b' }}>
              Keep Booking
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={handleConfirmCancel}
              disabled={cancelling}
              sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}
            >
              {cancelling ? 'Releasing...' : 'Yes, Cancel'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};
