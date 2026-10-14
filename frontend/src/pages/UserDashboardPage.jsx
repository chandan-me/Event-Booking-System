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
    <Container maxWidth="lg" sx={{ py: 8 }}>
      <Box sx={{ mb: 5 }}>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
          My Event Bookings
        </Typography>
        <Typography variant="body1" sx={{ color: 'text.secondary' }}>
          View, track, and manage your reserved tickets across all live events.
        </Typography>
      </Box>

      {errorMsg && (
        <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>
          {errorMsg}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
          <CircularProgress color="primary" />
        </Box>
      ) : bookings.length === 0 ? (
        <Card
          sx={{
            textAlign: 'center',
            py: 10,
            px: 3,
            borderRadius: 4,
            bgcolor: 'rgba(17, 24, 39, 0.4)',
            border: '1px dashed rgba(255, 255, 255, 0.1)',
          }}
        >
          <ConfirmationNumberIcon sx={{ fontSize: 56, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
            No bookings yet
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 3 }}>
            You haven't reserved tickets for any upcoming events.
          </Typography>
          <Button variant="contained" color="primary" onClick={() => navigate('/')}>
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
                    bgcolor: 'rgba(17, 24, 39, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    p: { xs: 2, sm: 3 },
                    transition: 'all 0.2s',
                    '&:hover': {
                      borderColor: 'rgba(99, 102, 241, 0.3)',
                    },
                  }}
                >
                  <CardContent sx={{ p: 0 }}>
                    <Box
                      sx={{
                        display: 'flex',
                        flexDirection: { xs: 'column', sm: 'row' },
                        justifyContent: 'space-between',
                        alignItems: { xs: 'flex-start', sm: 'center' },
                        gap: 2,
                      }}
                    >
                      {/* Left: Booking Details */}
                      <Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#f3f4f6' }}>
                            {booking.event?.title || `Event #${booking.event_id?.substring(0, 8)}`}
                          </Typography>
                          <Chip
                            icon={
                              isConfirmed ? (
                                <CheckCircleIcon sx={{ fontSize: 14 }} />
                              ) : (
                                <CancelOutlinedIcon sx={{ fontSize: 14 }} />
                              )
                            }
                            label={booking.status}
                            size="small"
                            color={isConfirmed ? 'success' : isCancelled ? 'error' : 'default'}
                            sx={{ fontWeight: 700, fontSize: 11 }}
                          />
                        </Box>

                        <Box
                          sx={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 2.5,
                            color: 'text.secondary',
                            fontSize: 13,
                          }}
                        >
                          <Box>
                            Reference:{' '}
                            <Typography component="span" sx={{ fontWeight: 700, color: '#818cf8' }}>
                              {booking.booking_reference}
                            </Typography>
                          </Box>
                          <Box>
                            Tickets:{' '}
                            <Typography component="span" sx={{ fontWeight: 600, color: 'text.primary' }}>
                              {booking.quantity}
                            </Typography>
                          </Box>
                          <Box>
                            Total Paid:{' '}
                            <Typography component="span" sx={{ fontWeight: 700, color: '#fbbf24' }}>
                              ${parseFloat(booking.total_price || 0).toFixed(2)}
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
                              borderColor: 'rgba(239, 68, 68, 0.4)',
                              '&:hover': { borderColor: '#ef4444', bgcolor: 'rgba(239, 68, 68, 0.08)' },
                            }}
                          >
                            Cancel Reservation
                          </Button>
                        )}
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => navigate(`/events/${booking.event_id}`)}
                          sx={{ bgcolor: 'rgba(255, 255, 255, 0.08)', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)' } }}
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
        PaperProps={{
          sx: {
            bgcolor: '#111827',
            backgroundImage: 'none',
            borderRadius: 3,
            border: '1px solid rgba(255, 255, 255, 0.1)',
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Cancel Booking</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
            Are you sure you want to cancel booking{' '}
            <strong style={{ color: '#fff' }}>{cancelTarget?.booking_reference}</strong>? Your reserved capacity will be immediately released back to the event pool.
          </Typography>
          <TextField
            fullWidth
            label="Reason for cancellation"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
            size="small"
            margin="dense"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleCloseCancelDialog} disabled={cancelling}>
            Keep Booking
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleConfirmCancel}
            disabled={cancelling}
          >
            {cancelling ? 'Cancelling...' : 'Confirm Cancellation'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};
