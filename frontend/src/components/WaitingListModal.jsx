import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  Box,
  IconButton,
  TextField,
  MenuItem,
  CircularProgress,
  Alert,
  Chip,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EmailIcon from '@mui/icons-material/Email';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import { bookingsApi } from '../api/bookingsApi';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';

export const WaitingListModal = ({ event, open, onClose, onSuccess }) => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [tier, setTier] = useState('General Admission');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successEntry, setSuccessEntry] = useState(null);

  useEffect(() => {
    if (open) {
      setName(user?.full_name || user?.name || '');
      setEmail(user?.email || '');
      setQuantity(1);
      setTier('General Admission');
      setNotes('');
      setErrorMsg('');
      setSuccessEntry(null);
    }
  }, [open, user]);

  if (!event) return null;

  const handleIncrement = () => {
    if (quantity < 5) {
      setQuantity((q) => q + 1);
    }
  };

  const handleDecrement = () => {
    if (quantity > 1) {
      setQuantity((q) => q - 1);
    }
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    try {
      const payload = {
        event_id: event.id,
        customer_email: email.trim().toLowerCase(),
        customer_name: name.trim() || undefined,
        quantity: Math.min(5, Math.max(1, quantity)),
        preferred_tier: tier,
        notes: notes.trim() || undefined,
      };

      const res = await bookingsApi.joinWaitingList(payload);
      if (res.success && res.data) {
        setSuccessEntry(res.data);
        enqueueSnackbar(`Added to waiting list! Queue position #${res.data.queue_position || 1}`, {
          variant: 'success',
        });
        if (onSuccess) onSuccess(res.data);
      } else {
        setErrorMsg(res.message || 'Unable to join waiting list.');
      }
    } catch (err) {
      const msg =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Failed to join waiting list. Please try again.';
      setErrorMsg(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 4,
          boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25)',
          overflow: 'hidden',
          border: '1px solid #e2e8f0',
        },
      }}
    >
      {/* Header */}
      <DialogTitle
        sx={{
          m: 0,
          p: 2.5,
          bgcolor: '#0f172a',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: 'rgba(234, 88, 12, 0.18)',
              border: '1px solid rgba(234, 88, 12, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fb923c',
            }}
          >
            <HourglassTopIcon fontSize="small" />
          </Box>
          <Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 800, lineHeight: 1.2, color: '#ffffff' }}>
              Join Priority Waiting List
            </Typography>
            <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 11.5 }}>
              Sold-out event queue & notification alert
            </Typography>
          </Box>
        </Box>
        <IconButton
          onClick={onClose}
          size="small"
          sx={{
            color: '#94a3b8',
            '&:hover': { color: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.08)' },
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 3, bgcolor: '#ffffff' }}>
        {successEntry ? (
          <Box sx={{ textAlign: 'center', py: 3 }}>
            <Box
              sx={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                bgcolor: '#ecfdf5',
                border: '2px solid #a7f3d0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
                color: '#059669',
              }}
            >
              <CheckCircleIcon sx={{ fontSize: 44 }} />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 1 }}>
              You're on the Waiting List!
            </Typography>
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1,
                bgcolor: '#fff7ed',
                border: '1.5px solid #fed7aa',
                borderRadius: 3,
                px: 2.5,
                py: 1,
                mb: 2,
              }}
            >
              <Typography variant="body2" sx={{ color: '#ea580c', fontWeight: 700 }}>
                Queue Position: #{successEntry.queue_position || 1}
              </Typography>
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 440, mx: 'auto', mb: 3 }}>
              We've registered your request for <strong>{successEntry.quantity} ticket(s)</strong> for{' '}
              <strong>{event.title}</strong>. When capacity opens or extra add-on seats are released, an alert invite will
              be dispatched to <strong>{successEntry.customer_email}</strong>.
            </Typography>
            <Button
              variant="contained"
              onClick={onClose}
              sx={{
                bgcolor: '#0f172a',
                color: '#ffffff',
                fontWeight: 700,
                borderRadius: 2.5,
                px: 4,
                py: 1,
                textTransform: 'none',
                '&:hover': { bgcolor: '#1e293b' },
              }}
            >
              Close & View Events
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            {/* Event Summary Pill */}
            <Box
              sx={{
                p: 2,
                borderRadius: 2.5,
                bgcolor: '#f8fafc',
                border: '1px solid #e2e8f0',
                mb: 2.5,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Box sx={{ maxWidth: '75%' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a', lineHeight: 1.25 }}>
                  {event.title}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                  📍 {event.venue_name || event.venue || 'Venue TBA'}
                </Typography>
              </Box>
              <Chip
                label="Sold Out"
                size="small"
                sx={{
                  bgcolor: '#fee2e2',
                  color: '#dc2626',
                  fontWeight: 800,
                  fontSize: 11,
                  border: '1px solid #fecaca',
                }}
              />
            </Box>

            <Alert severity="info" sx={{ mb: 2.5, borderRadius: 2, fontSize: 12.5 }}>
              All regular tickets are currently booked. As cancellations occur or the organizer releases add-on seats,
              waiting list attendees will be prioritized based on timestamp.
            </Alert>

            {errorMsg && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: 2, fontSize: 13 }}>
                {errorMsg}
              </Alert>
            )}

            {/* Email Field */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block', mb: 0.75 }}>
                Email Address * (For Notification Alert)
              </Typography>
              <TextField
                fullWidth
                size="small"
                required
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                InputProps={{
                  startAdornment: <EmailIcon sx={{ fontSize: 18, color: '#94a3b8', mr: 1 }} />,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>

            {/* Name Field */}
            <Box sx={{ mb: 2 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block', mb: 0.75 }}>
                Attendee Full Name
              </Typography>
              <TextField
                fullWidth
                size="small"
                placeholder="e.g. Rahul Sharma"
                value={name}
                onChange={(e) => setName(e.target.value)}
                InputProps={{
                  startAdornment: <PersonIcon sx={{ fontSize: 18, color: '#94a3b8', mr: 1 }} />,
                }}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>

            {/* Ticket Quantity Selector & Tier */}
            <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block', mb: 0.75 }}>
                  Tickets Needed (Max 5 Per Policy)
                </Typography>
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    border: '1px solid #cbd5e1',
                    borderRadius: 2,
                    p: 0.5,
                    bgcolor: '#f8fafc',
                  }}
                >
                  <IconButton
                    size="small"
                    onClick={handleDecrement}
                    disabled={quantity <= 1}
                    sx={{ borderRadius: 1.5 }}
                  >
                    <RemoveIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="body2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    {quantity} ticket{quantity > 1 ? 's' : ''}
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={handleIncrement}
                    disabled={quantity >= 5}
                    sx={{ borderRadius: 1.5 }}
                  >
                    <AddIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="caption" sx={{ color: '#94a3b8', fontSize: 10.5, mt: 0.5, display: 'block' }}>
                  Limit: 5 tickets per user / email
                </Typography>
              </Box>

              <Box sx={{ flex: 1, minWidth: 160 }}>
                <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block', mb: 0.75 }}>
                  Preferred Seating Tier
                </Typography>
                <TextField
                  fullWidth
                  select
                  size="small"
                  value={tier}
                  onChange={(e) => setTier(e.target.value)}
                  sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                >
                  <MenuItem value="General Admission">General Admission</MenuItem>
                  <MenuItem value="VIP Seating">VIP Seating</MenuItem>
                  <MenuItem value="Front Row">Front Row / Premium</MenuItem>
                  <MenuItem value="Any Available">Any Available Tier</MenuItem>
                </TextField>
              </Box>
            </Box>

            {/* Special Notes / Requests */}
            <Box sx={{ mb: 1 }}>
              <Typography variant="caption" sx={{ fontWeight: 700, color: '#334155', display: 'block', mb: 0.75 }}>
                Special Notes / Group Requirements (Optional)
              </Typography>
              <TextField
                fullWidth
                size="small"
                multiline
                rows={2}
                placeholder="e.g. Wheelchair access needed, booking with family..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              />
            </Box>
          </Box>
        )}
      </DialogContent>

      {!successEntry && (
        <DialogActions sx={{ p: 2.5, bgcolor: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
          <Button
            onClick={onClose}
            sx={{ color: '#64748b', fontWeight: 600, textTransform: 'none', borderRadius: 2 }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={submitting}
            startIcon={submitting ? <CircularProgress size={16} sx={{ color: '#ffffff' }} /> : <HourglassTopIcon />}
            sx={{
              bgcolor: '#ea580c',
              color: '#ffffff',
              fontWeight: 700,
              borderRadius: 2.5,
              px: 3,
              py: 0.85,
              textTransform: 'none',
              boxShadow: '0 4px 12px rgba(234, 88, 12, 0.25)',
              '&:hover': { bgcolor: '#c2410c' },
            }}
          >
            {submitting ? 'Joining Queue...' : 'Join Waiting List'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};
