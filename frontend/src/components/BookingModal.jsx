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
  Grid,
  Card,
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
import EmailIcon from '@mui/icons-material/Email';
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

export const BookingModal = ({ event, open, onClose, onSuccess, initialQuantity = 1 }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [quantity, setQuantity] = useState(initialQuantity || 1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [completedBooking, setCompletedBooking] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  const [alreadyBookedCount, setAlreadyBookedCount] = useState(0);

  React.useEffect(() => {
    if (open) {
      // Preload Razorpay Checkout SDK in background so clicking Pay is instant
      loadRazorpayScript();
      if (initialQuantity) {
        setQuantity(initialQuantity);
      }
      if (event?.id && user) {
        bookingsApi.getMyBookings({ page: 1, page_size: 50 }).then((res) => {
          if (res && res.data && res.data.items) {
            const bookedForThisEvent = res.data.items
              .filter((b) => b.event_id === event.id && b.status === 'CONFIRMED')
              .reduce((sum, b) => sum + (b.quantity || 1), 0);
            setAlreadyBookedCount(bookedForThisEvent);
            const remaining = Math.max(0, 5 - bookedForThisEvent);
            if (remaining > 0 && quantity > remaining) {
              setQuantity(remaining);
            }
          }
        }).catch(() => {});
      }
    } else {
      setAlreadyBookedCount(0);
    }
  }, [open, initialQuantity, event?.id, user]);

  if (!event) return null;

  const unitPrice = parseFloat(event.price || event.ticket_price || 0);
  const totalAmount = (unitPrice * quantity).toFixed(2);
  const remainingAllowance = Math.max(0, 5 - alreadyBookedCount);
  const maxAvailable = Math.min(remainingAllowance, event.available_capacity || 0);
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
          customer_email: user?.email,
          customer_name: user?.full_name,
        },
        idempotencyKey
      );

      if (res.success && res.data) {
        setCompletedBooking(res.data);
        enqueueSnackbar(`Payment Verified! Digital Pass emailed to ${user?.email || 'your email'}`, {
          variant: 'success',
        });
        if (onSuccess) onSuccess(res.data);
      } else {
        setErrorMsg(res.message || 'Unable to finalize reservation.');
      }
    } catch (err) {
      let serverMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Booking finalization failed.';
      if (err.code === 'ECONNABORTED' || serverMessage.includes('timeout')) {
        serverMessage = 'Booking confirmation is taking longer than usual. Please check your tickets under My Bookings or retry.';
      }
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
        customer_email: user?.email,
      });

      if (!orderRes.success || !orderRes.data) {
        throw new Error(orderRes.message || 'Failed to initialize Razorpay payment order.');
      }

      const orderData = orderRes.data;

      // 2. Load Razorpay Checkout SDK
      const isLoaded = await loadRazorpayScript();

      if (isLoaded && window.Razorpay) {
        // Open Razorpay Checkout modal
        const options = {
          key: orderData.key_id,
          amount: orderData.amount,
          currency: orderData.currency || 'INR',
          name: 'EventPass',
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
            email: user?.email || 'attendee@example.com',
            contact: user?.phone_number || '9999999999',
          },
          notes: {
            event_id: String(event.id),
            event_title: event.title,
          },
          theme: {
            color: '#0f172a',
          },
          modal: {
            backdropclose: true,
            escape: true,
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
        throw new Error('Razorpay Payment Gateway could not be loaded. Please check your network connection.');
      }
    } catch (err) {
      let serverMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Razorpay initialization failed.';
      if (err.code === 'ECONNABORTED' || serverMessage.includes('timeout')) {
        serverMessage = 'Payment gateway initialization took longer than expected. Please check your internet connection and try again.';
      }
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
      maxWidth={completedBooking && completedBooking.tickets?.length > 1 ? 'md' : 'sm'}
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
            maxHeight: '92vh',
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

      <DialogContent sx={{ pt: 1, pb: 2 }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {errorMsg}
          </Alert>
        )}

        {completedBooking ? (
          <Box sx={{ textAlign: 'center', py: 1 }}>
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
                mb: 1.5,
                border: '2px solid #a7f3d0',
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 36 }} />
            </Box>

            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
              Payment Successful!
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              Your digital entry pass has been generated and verified.
            </Typography>

            {/* Generated QR Pass Preview for every confirmed ticket */}
            {completedBooking.tickets && completedBooking.tickets.length > 0 ? (
              <Box sx={{ mb: 2.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#0f172a', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', mb: 1.5 }}>
                  Official Admission QR Pass{completedBooking.tickets.length > 1 ? 'es' : ''}
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: completedBooking.tickets.length > 1 ? 'row' : 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 2,
                    overflowX: completedBooking.tickets.length > 1 ? 'auto' : 'visible',
                    py: 1,
                    px: 0.5,
                  }}
                >
                  {completedBooking.tickets.map((t, idx) => (
                    <Card
                      key={t.id || idx}
                      sx={{
                        width: '100%',
                        maxWidth: completedBooking.tickets.length > 1 ? 340 : 440,
                        bgcolor: '#ffffff',
                        border: '1.5px solid #e2e8f0',
                        borderRadius: '16px',
                        boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.08)',
                        overflow: 'hidden',
                        textAlign: 'center',
                        mx: 'auto',
                      }}
                    >
                      {/* Pass Header Banner */}
                      <Box
                        sx={{
                          bgcolor: '#0f172a',
                          color: '#ffffff',
                          py: 1.25,
                          px: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                        }}
                      >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <ConfirmationNumberIcon sx={{ fontSize: 17, color: '#38bdf8' }} />
                          <Typography sx={{ fontWeight: 800, fontSize: 12.5, letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                            Admission Pass
                          </Typography>
                        </Box>
                        <Chip
                          label={t.seat_label || (completedBooking.tickets.length > 1 ? `Pass #${idx + 1}` : 'General Admission')}
                          size="small"
                          sx={{
                            bgcolor: 'rgba(56, 189, 248, 0.15)',
                            color: '#38bdf8',
                            fontWeight: 700,
                            fontSize: 11,
                            height: 22,
                            border: '1px solid rgba(56, 189, 248, 0.3)',
                          }}
                        />
                      </Box>

                      {/* Event Details Summary on Pass */}
                      <Box sx={{ p: 2, pb: 1.5, bgcolor: '#f8fafc', borderBottom: '1px dashed #cbd5e1' }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', fontSize: '0.95rem', lineHeight: 1.25, mb: 1 }}>
                          {event.title}
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1.5, flexWrap: 'wrap', color: '#64748b', fontSize: 12 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <EventIcon sx={{ fontSize: 14, color: '#64748b' }} />
                            <span>
                              {startVal
                                ? new Date(startVal).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Date TBA'}
                            </span>
                          </Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <PlaceIcon sx={{ fontSize: 14, color: '#64748b' }} />
                            <span>{venueDisplay}</span>
                          </Box>
                        </Box>
                      </Box>

                      {/* QR Code Container */}
                      <Box sx={{ p: 2.5, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <Box
                          sx={{
                            width: 160,
                            height: 160,
                            p: 1.25,
                            bgcolor: '#ffffff',
                            border: '2px solid #0f172a',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            mb: 1.5,
                            boxShadow: '0 4px 12px rgba(15, 23, 42, 0.08)',
                          }}
                        >
                          <Box
                            component="img"
                            src={
                              t.qr_code_image_base64 ||
                              `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(t.ticket_reference)}`
                            }
                            alt={`QR Pass #${t.ticket_reference}`}
                            sx={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'contain',
                              display: 'block',
                            }}
                          />
                        </Box>

                        <Typography
                          variant="caption"
                          sx={{
                            fontWeight: 800,
                            color: '#0f172a',
                            fontFamily: 'monospace',
                            fontSize: '0.85rem',
                            letterSpacing: '0.04em',
                          }}
                        >
                          #{t.ticket_reference}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 11, mt: 0.5 }}>
                          Scan QR code at venue gate for admission
                        </Typography>
                      </Box>
                    </Card>
                  ))}
                </Box>

                <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, display: 'block', mt: 1, textAlign: 'center' }}>
                  ⚠️ Valid for one-time admission only. Keep this QR pass ready for check-in.
                </Typography>
              </Box>
            ) : null}

            {/* Payment & Verification Summary */}
            <Box
              sx={{
                bgcolor: '#f8fafc',
                p: 2,
                borderRadius: '14px',
                border: '1px solid #e2e8f0',
                maxWidth: 440,
                mx: 'auto',
                mb: 2,
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: 13 }}>Booking Reference</Typography>
                <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace', fontSize: 13.5 }}>
                  {completedBooking.booking_reference}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: 13 }}>Razorpay Payment ID</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0284c7', fontFamily: 'monospace', fontSize: 13 }}>
                  {completedBooking.razorpay_payment_id || 'pay_test_verified'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ color: '#64748b', fontSize: 13 }}>Tickets Reserved</Typography>
                <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', fontSize: 13 }}>
                  {completedBooking.quantity} Ticket(s)
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px dashed #cbd5e1' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>Total Paid (INR)</Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#059669', fontSize: '1rem' }}>
                  ₹{parseFloat(completedBooking.total_amount_snapshot || totalAmount).toLocaleString('en-IN')}
                </Typography>
              </Box>
            </Box>

            {/* Confirmation Email Alert */}
            <Box
              sx={{
                p: 1.5,
                bgcolor: '#f0fdf4',
                borderRadius: '12px',
                border: '1px solid #bbf7d0',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                textAlign: 'left',
                maxWidth: 440,
                mx: 'auto',
                mb: 1.5,
              }}
            >
              <EmailIcon sx={{ color: '#16a34a', fontSize: 22, flexShrink: 0 }} />
              <Box>
                <Typography variant="body2" sx={{ color: '#15803d', fontWeight: 700, fontSize: 13 }}>
                  Digital Entry Pass Dispatched!
                </Typography>
                <Typography variant="caption" sx={{ color: '#166534', fontSize: 11.5, display: 'block', mt: 0.25 }}>
                  A confirmation email with your QR entry pass and payment receipt has been sent to <strong>{user?.email}</strong>.
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
                <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700, display: 'block' }}>
                  {event.available_capacity} tickets left
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    color: alreadyBookedCount >= 5 ? '#dc2626' : '#ea580c',
                    fontWeight: 600,
                    display: 'block',
                    mt: 0.25,
                    fontSize: 11,
                  }}
                >
                  {alreadyBookedCount >= 5
                    ? 'Limit reached: You have already booked the maximum 5 tickets for this event.'
                    : alreadyBookedCount > 0
                    ? `Policy: Max 5 tickets per email ID. You booked ${alreadyBookedCount} (${remainingAllowance} remaining).`
                    : 'Policy: Maximum 5 tickets per email ID for this event.'}
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
          <Box sx={{ display: 'flex', gap: 1.5, width: '100%', maxWidth: 440, mx: 'auto' }}>
            <Button
              fullWidth
              variant="outlined"
              onClick={() => {
                handleClose();
                navigate('/my-bookings');
              }}
              sx={{
                color: '#0f172a',
                borderColor: '#cbd5e1',
                fontWeight: 700,
                textTransform: 'none',
                py: 1.1,
                borderRadius: '12px',
                '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
              }}
            >
              Go to My Tickets
            </Button>
            <Button
              fullWidth
              variant="contained"
              onClick={handleClose}
              sx={{
                py: 1.1,
                bgcolor: '#0f172a',
                color: '#ffffff',
                fontWeight: 700,
                textTransform: 'none',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
                '&:hover': { bgcolor: '#1e293b' },
              }}
            >
              Done
            </Button>
          </Box>
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
                  px: 3.5,
                  py: 1.25,
                  backgroundColor: '#0f172a',
                  color: '#ffffff',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 2.5,
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.25)',
                  '&:hover': {
                    backgroundColor: '#1e293b',
                    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.35)',
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
