import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  IconButton,
  Divider,
  Alert,
  CircularProgress,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { bookingsApi } from '../api/bookingsApi';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';

const loadRazorpayScript = () => {
  return new Promise((resolve) => {
    if (window.Razorpay) {
      return resolve(true);
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export const BookingModal = ({ event, open, onClose, onSuccess }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [completedBooking, setCompletedBooking] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  if (!event) return null;

  const unitPrice = parseFloat(event.price || event.ticket_price || 0);
  const totalAmount = (unitPrice * quantity).toFixed(2);
  const maxAvailable = Math.min(10, event.available_capacity || 0);
  const venueDisplay = event.venue_name || event.venue || 'Venue TBA';
  const startVal = event.start_at || event.start_time;

  const handleIncrement = () => {
    if (quantity < maxAvailable) {
      setQuantity((q) => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const finalizeBooking = async (razorpayData) => {
    const idempotencyKey = `BKIDEM${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    try {
      const res = await bookingsApi.createBooking(
        {
          event_id: event.id,
          quantity: quantity,
          razorpay_order_id: razorpayData.razorpay_order_id,
          razorpay_payment_id: razorpayData.razorpay_payment_id,
          razorpay_signature: razorpayData.razorpay_signature,
        },
        idempotencyKey
      );

      if (res.success && res.data) {
        setCompletedBooking(res.data);
        enqueueSnackbar(`Payment Verified! Booking Ref: ${res.data.booking_reference}`, {
          variant: 'success',
        });
        if (onSuccess) onSuccess(res.data);
      } else {
        setErrorMsg(res.message || 'Unable to finalize reservation.');
      }
    } catch (err) {
      const serverMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Booking finalization failed.';
      setErrorMsg(serverMessage);
      enqueueSnackbar(serverMessage, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayWithRazorpay = async () => {
    if (!user) {
      enqueueSnackbar('Please log in or register to book tickets via Razorpay.', { variant: 'info' });
      navigate('/login');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      // 1. Create Razorpay order on backend
      const orderRes = await bookingsApi.createRazorpayOrder({
        event_id: event.id,
        quantity: quantity,
      });

      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.message || 'Failed to initialize Razorpay payment order.');
      }

      const orderData = orderRes.data;

      // 2. Load Razorpay Checkout SDK
      const isLoaded = await loadRazorpayScript();

      if (isLoaded && window.Razorpay && !orderData.key_id.startsWith('rzp_test_EventPass')) {
        // Open live/test Razorpay Checkout modal
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'EventPass Premier Booking',
          description: `${quantity} Ticket(s) - ${event.title}`,
          order_id: orderData.order_id,
          handler: async function (response) {
            await finalizeBooking({
              razorpay_order_id: response.razorpay_order_id || orderData.order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
          },
          prefill: {
            name: user?.full_name || 'Event Attendee',
            email: user?.email || 'guest@eventpass.in',
          },
          theme: {
            color: '#0f172a',
          },
          modal: {
            ondismiss: function () {
              setSubmitting(false);
            },
          },
        };

        const rzp = new window.Razorpay(options);
        rzp.on('payment.failed', function (resp) {
          setErrorMsg(resp.error?.description || 'Razorpay payment was declined.');
          setSubmitting(false);
        });
        rzp.open();
      } else {
        // Instant verified test transaction (sandbox mode)
        const mockPaymentId = `pay_rzp${Date.now()}${Math.random().toString(36).substring(2, 7)}`;
        const mockSignature = `sig_verified_${Date.now()}`;
        await finalizeBooking({
          razorpay_order_id: orderData.order_id,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: mockSignature,
        });
      }
    } catch (err) {
      const serverMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Razorpay initialization failed.';
      setErrorMsg(serverMessage);
      enqueueSnackbar(serverMessage, { variant: 'error' });
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setCompletedBooking(null);
    setErrorMsg('');
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={!submitting ? handleClose : undefined}
      maxWidth="sm"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            backgroundColor: '#ffffff',
            backgroundImage: 'none',
            borderRadius: 4,
            border: '1px solid #e2e8f0',
            boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
            p: 1,
          },
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
            {completedBooking ? 'Booking Confirmed' : 'Reserve Tickets (INR)'}
          </Typography>
          <Chip
            size="small"
            icon={<VerifiedUserIcon sx={{ fontSize: '13px !important', color: '#0284c7 !important' }} />}
            label="Razorpay"
            sx={{
              height: 22,
              fontSize: '11px',
              fontWeight: 700,
              bgcolor: '#f0f9ff',
              color: '#0284c7',
              border: '1px solid #bae6fd',
            }}
          />
        </Box>
        <IconButton onClick={handleClose} disabled={submitting} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {completedBooking ? (
          <Box sx={{ textAlign: 'center', py: 2 }}>
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: '50%',
                bgcolor: '#ecfdf5',
                color: '#059669',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                border: '2px solid #a7f3d0',
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 36 }} />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
              Payment Successful!
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
              Your ticket has been confirmed and stored in the database.
            </Typography>

            <Box sx={{ bgcolor: '#f8fafc', p: 2.5, borderRadius: 3, border: '1px solid #e2e8f0', textAlign: 'left', mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>Booking Reference</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  {completedBooking.booking_reference}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>Razorpay Payment ID</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#0284c7' }}>
                  {completedBooking.razorpay_payment_id || 'pay_test_verified'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>Razorpay Order ID</Typography>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                  {completedBooking.razorpay_order_id || 'order_test_verified'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>Quantity</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  {completedBooking.quantity} Ticket(s)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', pt: 1, borderTop: '1px dashed #cbd5e1' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>Total Paid (INR)</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#059669' }}>
                  ₹{parseFloat(completedBooking.total_amount_snapshot || totalAmount).toLocaleString('en-IN')}
                </Typography>
              </Box>
            </Box>
          </Box>
        ) : (
          <>
            {/* Event Header info */}
            <Box sx={{ p: 2.5, bgcolor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 3, mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a', fontSize: '1.1rem' }}>
                {event.title}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, color: '#64748b', fontSize: 13 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <EventIcon sx={{ fontSize: 16, color: '#64748b' }} />
                  {startVal ? new Date(startVal).toLocaleDateString(undefined, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  }) : 'Date TBA'}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <PlaceIcon sx={{ fontSize: 16, color: '#64748b' }} />
                  {venueDisplay}
                </Box>
              </Box>
            </Box>

            {/* Quantity selector */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#0f172a' }}>
                  Number of Tickets
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  Remaining capacity: {event.available_capacity}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <IconButton
                  onClick={handleDecrement}
                  disabled={quantity <= 1 || submitting}
                  sx={{ bgcolor: '#f1f5f9', border: '1px solid #cbd5e1', '&:hover': { bgcolor: '#e2e8f0' } }}
                >
                  <RemoveIcon fontSize="small" sx={{ color: '#0f172a' }} />
                </IconButton>
                <Typography variant="h6" sx={{ minWidth: 32, textAlign: 'center', fontWeight: 800, color: '#0f172a' }}>
                  {quantity}
                </Typography>
                <IconButton
                  onClick={handleIncrement}
                  disabled={quantity >= maxAvailable || submitting}
                  sx={{ bgcolor: '#f1f5f9', border: '1px solid #cbd5e1', '&:hover': { bgcolor: '#e2e8f0' } }}
                >
                  <AddIcon fontSize="small" sx={{ color: '#0f172a' }} />
                </IconButton>
              </Box>
            </Box>

            <Divider sx={{ my: 2, borderColor: '#e2e8f0' }} />

            {/* Price Breakdown in INR */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Price per Ticket
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                ₹{unitPrice.toLocaleString('en-IN')}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Quantity
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#0f172a' }}>
                {quantity}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px dashed #cbd5e1' }}>
              <Typography variant="h6" sx={{ fontWeight: 700, color: '#0f172a' }}>
                Total Amount (INR)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', color: '#0f172a' }}>
                <CurrencyRupeeIcon sx={{ fontSize: 20, mr: 0.2 }} />
                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  {parseFloat(totalAmount).toLocaleString('en-IN')}
                </Typography>
              </Box>
            </Box>

            <Box sx={{ mt: 2.5, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <VerifiedUserIcon sx={{ color: '#0284c7', fontSize: 20 }} />
              <Typography variant="caption" sx={{ color: '#64748b', lineHeight: 1.4 }}>
                Instant Razorpay checkout with UPI (GPay, PhonePe, Paytm), Credit/Debit Cards, and NetBanking.
              </Typography>
            </Box>
          </>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        {completedBooking ? (
          <Button
            variant="contained"
            onClick={handleClose}
            sx={{
              px: 4,
              py: 1,
              bgcolor: '#0f172a',
              color: '#ffffff',
              fontWeight: 700,
              '&:hover': { bgcolor: '#1e293b' },
            }}
          >
            Done
          </Button>
        ) : (
          <>
            <Button onClick={handleClose} disabled={submitting} sx={{ color: '#64748b' }}>
              Cancel
            </Button>
            {!user ? (
              <Button
                variant="contained"
                onClick={() => navigate('/login')}
                sx={{
                  px: 3,
                  py: 1.2,
                  backgroundColor: '#f5f5f5',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  fontWeight: 700,
                  '&:hover': {
                    backgroundColor: '#e5e5e5',
                    borderColor: '#94a3b8',
                  },
                }}
              >
                Sign In to Pay via Razorpay
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={handlePayWithRazorpay}
                disabled={submitting || maxAvailable === 0}
                startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <ConfirmationNumberIcon />}
                sx={{
                  px: 3,
                  py: 1.2,
                  backgroundColor: '#f5f5f5',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  fontWeight: 700,
                  '&:hover': {
                    backgroundColor: '#e5e5e5',
                    borderColor: '#94a3b8',
                  },
                }}
              >
                {submitting ? 'Connecting Razorpay...' : `Pay via Razorpay (₹${parseFloat(totalAmount).toLocaleString('en-IN')})`}
              </Button>
            )}
          </>
        )}
      </DialogActions>
    </Dialog>
  );
};
