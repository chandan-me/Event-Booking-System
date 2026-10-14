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
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import { bookingsApi } from '../api/bookingsApi';
import { useSnackbar } from 'notistack';

export const BookingModal = ({ event, open, onClose, onSuccess }) => {
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
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

  const handleConfirmBooking = async () => {
    setSubmitting(true);
    setErrorMsg('');

    // Generate unique client-side idempotency key using only letters and numbers
    const idempotencyKey = `BKIDEM${Date.now()}${Math.random().toString(36).substring(2, 9).toUpperCase()}`;

    try {
      const res = await bookingsApi.createBooking(
        {
          event_id: event.id,
          quantity: quantity,
        },
        idempotencyKey
      );

      if (res.success && res.data) {
        enqueueSnackbar(`Booking Confirmed! Ref: ${res.data.booking_reference}`, {
          variant: 'success',
        });
        onSuccess(res.data);
        onClose();
      } else {
        setErrorMsg(res.message || 'Unable to complete reservation.');
      }
    } catch (err) {
      const serverMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Reservation failed. Please try again.';
      setErrorMsg(serverMessage);
      enqueueSnackbar(serverMessage, { variant: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={!submitting ? onClose : undefined}
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
        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
          Reserve Tickets (INR)
        </Typography>
        <IconButton onClick={onClose} disabled={submitting} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 1 }}>
        {errorMsg && (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {errorMsg}
          </Alert>
        )}

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
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ color: '#64748b' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleConfirmBooking}
          disabled={submitting || maxAvailable === 0}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <ConfirmationNumberIcon />}
          sx={{
            px: 3,
            py: 1,
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
          {submitting ? 'Reserving...' : `Confirm & Book (₹${parseFloat(totalAmount).toLocaleString('en-IN')})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
