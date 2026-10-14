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
import { bookingsApi } from '../api/bookingsApi';
import { useSnackbar } from 'notistack';

export const BookingModal = ({ event, open, onClose, onSuccess }) => {
  const [quantity, setQuantity] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const { enqueueSnackbar } = useSnackbar();

  if (!event) return null;

  const unitPrice = parseFloat(event.ticket_price || 0);
  const totalAmount = (unitPrice * quantity).toFixed(2);
  const maxAvailable = Math.min(10, event.available_capacity || 0);

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

    // Generate unique client-side idempotency key for safe retries
    const idempotencyKey = `BK-IDEM-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

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
      PaperProps={{
        sx: {
          backgroundColor: '#111827',
          backgroundImage: 'none',
          borderRadius: 4,
          border: '1px solid rgba(255, 255, 255, 0.1)',
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Reserve Tickets
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
        <Box sx={{ p: 2, bgcolor: 'rgba(255, 255, 255, 0.03)', borderRadius: 3, mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#f3f4f6' }}>
            {event.title}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1, color: 'text.secondary', fontSize: 13 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <EventIcon sx={{ fontSize: 16, color: '#818cf8' }} />
              {new Date(event.start_time).toLocaleDateString(undefined, {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <PlaceIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
              {event.venue}
            </Box>
          </Box>
        </Box>

        {/* Quantity selector */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Number of Tickets
            </Typography>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Remaining capacity: {event.available_capacity}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <IconButton
              onClick={handleDecrement}
              disabled={quantity <= 1 || submitting}
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.08)', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)' } }}
            >
              <RemoveIcon fontSize="small" />
            </IconButton>
            <Typography variant="h6" sx={{ minWidth: 32, textAlign: 'center', fontWeight: 700 }}>
              {quantity}
            </Typography>
            <IconButton
              onClick={handleIncrement}
              disabled={quantity >= maxAvailable || submitting}
              sx={{ bgcolor: 'rgba(255, 255, 255, 0.08)', '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)' } }}
            >
              <AddIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Price Breakdown */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Price per Ticket
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            ${unitPrice.toFixed(2)}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            Quantity
          </Typography>
          <Typography variant="body2" sx={{ fontWeight: 600 }}>
            {quantity}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2, pt: 2, borderTop: '1px dashed rgba(255, 255, 255, 0.12)' }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Total Amount
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#818cf8' }}>
            ${totalAmount}
          </Typography>
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2.5, pt: 1 }}>
        <Button onClick={onClose} disabled={submitting} sx={{ color: 'text.secondary' }}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color="primary"
          onClick={handleConfirmBooking}
          disabled={submitting || maxAvailable === 0}
          startIcon={submitting ? <CircularProgress size={18} color="inherit" /> : <ConfirmationNumberIcon />}
          sx={{ px: 3, py: 1 }}
        >
          {submitting ? 'Reserving...' : `Confirm & Book ($${totalAmount})`}
        </Button>
      </DialogActions>
    </Dialog>
  );
};
