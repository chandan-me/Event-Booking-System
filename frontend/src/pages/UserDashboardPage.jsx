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
  Tabs,
  Tab,
  IconButton,
  Tooltip,
  Divider,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EventIcon from '@mui/icons-material/Event';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import EmailIcon from '@mui/icons-material/Email';
import PrintIcon from '@mui/icons-material/Print';
import CloseIcon from '@mui/icons-material/Close';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import PlaceIcon from '@mui/icons-material/Place';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { useNavigate } from 'react-router-dom';
import { bookingsApi } from '../api/bookingsApi';
import { ticketsApi } from '../api/ticketsApi';
import { getEvents } from '../api/eventsApi';
import { useSnackbar } from 'notistack';
import { useAuth } from '../context/AuthContext';

export const UserDashboardPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [activeTab, setActiveTab] = useState(0);
  const [tickets, setTickets] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Ticket modal
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [resendingEmailId, setResendingEmailId] = useState(null);

  // Cancel booking dialog state
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelReason, setCancelReason] = useState('Schedule conflict');
  const [cancelling, setCancelling] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [ticketsRes, bookingsRes, eventsRes] = await Promise.all([
        ticketsApi.getMyTickets().catch(() => ({ data: { items: [] } })),
        bookingsApi.getMyBookings().catch(() => ({ data: { items: [] } })),
        getEvents({ page: 1, limit: 100 }).catch(() => ({ data: { items: [] } })),
      ]);

      const ticketItems = ticketsRes.data?.items || ticketsRes.items || [];
      const bookingItems =
        bookingsRes.data?.items ||
        bookingsRes.data?.bookings ||
        bookingsRes.items ||
        (Array.isArray(bookingsRes.data) ? bookingsRes.data : []);

      const eventItems = eventsRes.data?.items || eventsRes.items || [];
      const eventMap = {};
      (Array.isArray(eventItems) ? eventItems : []).forEach((evt) => {
        eventMap[evt.id] = evt;
      });

      // Enrich tickets
      const enrichedTickets = (Array.isArray(ticketItems) ? ticketItems : []).map((t) => ({
        ...t,
        event: eventMap[t.event_id] || {
          title: t.event_title || `Event #${t.event_id}`,
          venue_name: t.venue_name || 'Main Venue',
          venue_address: t.venue_address || '',
          start_at: t.start_at,
          end_at: t.end_at,
        },
      }));

      // Enrich bookings
      const enrichedBookings = (Array.isArray(bookingItems) ? bookingItems : []).map((b) => ({
        ...b,
        event: eventMap[b.event_id] || b.event || null,
      }));

      setTickets(enrichedTickets);
      setBookings(enrichedBookings);
    } catch (err) {
      setErrorMsg('Failed to load your tickets and reservations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
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
        fetchData();
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

  const handleResendTicketEmail = async (ticketId, e) => {
    if (e) e.stopPropagation();
    setResendingEmailId(ticketId);
    try {
      const res = await ticketsApi.resendTicketEmail(ticketId);
      if (res.success) {
        enqueueSnackbar(res.message || 'QR ticket confirmation re-sent to your email!', {
          variant: 'success',
        });
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to resend email';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setResendingEmailId(null);
    }
  };

  const handlePrintTicket = () => {
    window.print();
  };

  const getStatusBadge = (status, eventEndAt) => {
    const isPast = eventEndAt && new Date(eventEndAt) < new Date();
    if (isPast && status === 'ACTIVE') {
      return (
        <Chip
          icon={<HourglassEmptyIcon sx={{ fontSize: '13px !important' }} />}
          label="EVENT COMPLETED"
          size="small"
          sx={{
            fontWeight: 800,
            fontSize: 11,
            bgcolor: '#f1f5f9',
            color: '#475569',
            border: '1px solid #cbd5e1',
          }}
        />
      );
    }

    switch (status) {
      case 'ACTIVE':
        return (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />}
            label="ACTIVE PASS"
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: 11,
              bgcolor: '#ecfdf5',
              color: '#065f46',
              border: '1px solid #a7f3d0',
            }}
          />
        );
      case 'CHECKED_IN':
        return (
          <Chip
            icon={<CheckCircleIcon sx={{ fontSize: '13px !important' }} />}
            label="CHECKED IN"
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: 11,
              bgcolor: '#eff6ff',
              color: '#1e40af',
              border: '1px solid #bfdbfe',
            }}
          />
        );
      case 'CANCELLED':
        return (
          <Chip
            icon={<CancelOutlinedIcon sx={{ fontSize: '13px !important' }} />}
            label="CANCELLED"
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: 11,
              bgcolor: '#fef2f2',
              color: '#991b1b',
              border: '1px solid #fecaca',
            }}
          />
        );
      case 'EXPIRED':
        return (
          <Chip
            icon={<HourglassEmptyIcon sx={{ fontSize: '13px !important' }} />}
            label="EXPIRED"
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: 11,
              bgcolor: '#f8fafc',
              color: '#64748b',
              border: '1px solid #cbd5e1',
            }}
          />
        );
      default:
        return (
          <Chip
            label={status}
            size="small"
            sx={{ fontWeight: 800, fontSize: 11 }}
          />
        );
    }
  };

  return (
    <Box sx={{ bgcolor: '#ffffff', minHeight: '100vh', pb: 12 }}>
      <Container maxWidth="lg" sx={{ py: 6 }}>
        {/* Header section */}
        <Box sx={{ mb: 4, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', gap: 2 }}>
          <Box>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 1 }}>
              <Chip
                icon={<ConfirmationNumberIcon sx={{ fontSize: '13px !important', color: '#0f172a !important' }} />}
                label="ATTENDEE ACCESS PORTAL"
                size="small"
                sx={{
                  fontWeight: 800,
                  fontSize: 10.5,
                  letterSpacing: '0.06em',
                  bgcolor: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                }}
              />
            </Box>
            <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5, color: '#0f172a', letterSpacing: '-0.02em' }}>
              My Digital Passes & Bookings
            </Typography>
            <Typography variant="body2" sx={{ color: '#64748b' }}>
              {user?.full_name ? `Welcome, ${user.full_name}! ` : ''}Manage your single-use entry QR codes, download verified passes, and track booking history.
            </Typography>
          </Box>
          <Button
            variant="contained"
            onClick={() => navigate('/events')}
            sx={{
              bgcolor: '#0f172a',
              color: '#ffffff',
              borderRadius: 2.5,
              fontWeight: 700,
              fontSize: 13.5,
              textTransform: 'none',
              px: 3,
              py: 1,
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.15)',
              '&:hover': { bgcolor: '#1e293b' },
            }}
          >
            Explore More Events
          </Button>
        </Box>

        {errorMsg && (
          <Alert severity="error" sx={{ mb: 4, borderRadius: 3 }}>
            {errorMsg}
          </Alert>
        )}

        {/* Tab Selection */}
        <Box
          sx={{
            mb: 4,
            bgcolor: '#f8fafc',
            p: 0.75,
            borderRadius: 3,
            border: '1px solid #e2e8f0',
            display: 'inline-flex',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            sx={{
              minHeight: 'auto',
              '& .MuiTabs-indicator': { display: 'none' },
            }}
          >
            <Tab
              disableRipple
              icon={<QrCode2Icon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Active QR Passes (${tickets.length})`}
              sx={{
                textTransform: 'none',
                fontWeight: activeTab === 0 ? 800 : 600,
                fontSize: 13.5,
                minHeight: 40,
                borderRadius: 2.5,
                px: 2.5,
                bgcolor: activeTab === 0 ? '#0f172a' : 'transparent',
                color: activeTab === 0 ? '#ffffff !important' : '#64748b',
                transition: 'all 0.2s',
              }}
            />
            <Tab
              disableRipple
              icon={<ReceiptLongIcon sx={{ fontSize: 18 }} />}
              iconPosition="start"
              label={`Booking Orders (${bookings.length})`}
              sx={{
                textTransform: 'none',
                fontWeight: activeTab === 1 ? 800 : 600,
                fontSize: 13.5,
                minHeight: 40,
                borderRadius: 2.5,
                px: 2.5,
                bgcolor: activeTab === 1 ? '#0f172a' : 'transparent',
                color: activeTab === 1 ? '#ffffff !important' : '#64748b',
                transition: 'all 0.2s',
              }}
            />
          </Tabs>
        </Box>

        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 12 }}>
            <CircularProgress sx={{ color: '#0f172a' }} />
          </Box>
        ) : activeTab === 0 ? (
          /* TAB 0: Individual Admission Passes with QR Code */
          tickets.length === 0 ? (
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
              <QrCode2Icon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
                No active tickets yet
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 3 }}>
                When you reserve tickets for an event, your unique admission QR passes will appear here.
              </Typography>
              <Button
                variant="contained"
                onClick={() => navigate('/events')}
                sx={{ bgcolor: '#0f172a', color: '#ffffff', '&:hover': { bgcolor: '#1e293b' } }}
              >
                Browse Events
              </Button>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {tickets.map((t) => {
                const isPast = t.event?.end_at && new Date(t.event.end_at) < new Date();
                const isUsable = t.status === 'ACTIVE' && !isPast;

                return (
                  <Grid item xs={12} md={6} key={t.id}>
                    <Card
                      sx={{
                        borderRadius: 3.5,
                        border: '1.5px solid',
                        borderColor: isUsable ? '#e2e8f0' : '#f1f5f9',
                        boxShadow: '0 4px 16px rgba(15,23,42,0.04)',
                        overflow: 'hidden',
                        transition: 'all 0.2s',
                        '&:hover': {
                          borderColor: isUsable ? '#cbd5e1' : '#e2e8f0',
                          boxShadow: '0 8px 24px rgba(15,23,42,0.08)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' } }}>
                        {/* QR Code thumbnail */}
                        <Box
                          sx={{
                            p: 2.5,
                            bgcolor: isUsable ? '#ffffff' : '#f8fafc',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRight: { sm: '1.5px dashed #e2e8f0' },
                            borderBottom: { xs: '1.5px dashed #e2e8f0', sm: 'none' },
                            minWidth: 160,
                            cursor: 'pointer',
                          }}
                          onClick={() => setSelectedTicket(t)}
                        >
                          <Box
                            component="img"
                            src={t.qr_code_image_base64 || `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(t.ticket_reference)}`}
                            alt="Ticket QR Code"
                            sx={{
                              width: 120,
                              height: 120,
                              p: 0.5,
                              borderRadius: 2,
                              border: '1px solid #e2e8f0',
                              opacity: isUsable ? 1 : 0.45,
                              filter: isUsable ? 'none' : 'grayscale(100%)',
                            }}
                          />
                          <Typography variant="caption" sx={{ fontFamily: 'monospace', fontWeight: 800, color: '#0f172a', mt: 1 }}>
                            #{t.ticket_reference.split('-').slice(-2).join('-')}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#2563eb', fontWeight: 700, fontSize: 11, mt: 0.5 }}>
                            Tap to expand QR
                          </Typography>
                        </Box>

                        {/* Ticket details */}
                        <Box sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                          <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1, mb: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.3 }}>
                                {t.event?.title || `Event #${t.event_id}`}
                              </Typography>
                              {getStatusBadge(t.status, t.event?.end_at)}
                            </Box>

                            <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                              <EventSeatIcon sx={{ fontSize: 15, color: '#64748b' }} />
                              {t.seat_label || 'General Admission'}
                            </Typography>

                            {t.event?.start_at && (
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.75, mb: 0.5 }}>
                                <AccessTimeIcon sx={{ fontSize: 15, color: '#64748b' }} />
                                {new Date(t.event.start_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </Typography>
                            )}

                            {t.event?.venue_name && (
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'flex', alignItems: 'center', gap: 0.75 }}>
                                <PlaceIcon sx={{ fontSize: 15, color: '#64748b' }} />
                                {t.event.venue_name}
                              </Typography>
                            )}
                          </Box>

                          {/* Action Buttons */}
                          <Box sx={{ display: 'flex', gap: 1, mt: 2, flexWrap: 'wrap' }}>
                            <Button
                              size="small"
                              variant="contained"
                              startIcon={<QrCode2Icon />}
                              onClick={() => setSelectedTicket(t)}
                              sx={{
                                bgcolor: '#0f172a',
                                color: '#ffffff',
                                fontWeight: 700,
                                textTransform: 'none',
                                borderRadius: 2,
                                fontSize: 12,
                                '&:hover': { bgcolor: '#1e293b' },
                              }}
                            >
                              View Full Pass
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={resendingEmailId === t.id ? <CircularProgress size={14} /> : <EmailIcon />}
                              disabled={resendingEmailId === t.id}
                              onClick={(e) => handleResendTicketEmail(t.id, e)}
                              sx={{
                                borderColor: '#cbd5e1',
                                color: '#0f172a',
                                fontWeight: 600,
                                textTransform: 'none',
                                borderRadius: 2,
                                fontSize: 12,
                                '&:hover': { borderColor: '#94a3b8', bgcolor: '#f8fafc' },
                              }}
                            >
                              Resend Email
                            </Button>
                          </Box>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )
        ) : (
          /* TAB 1: Booking Records & Financial Summary */
          bookings.length === 0 ? (
            <Card sx={{ textAlign: 'center', py: 10, px: 3, borderRadius: 4, bgcolor: '#f8fafc', border: '1px dashed #cbd5e1' }}>
              <ReceiptLongIcon sx={{ fontSize: 56, color: '#94a3b8', mb: 2 }} />
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 1, color: '#0f172a' }}>
                No booking records found
              </Typography>
            </Card>
          ) : (
            <Grid container spacing={3}>
              {bookings.map((booking) => {
                const isConfirmed = booking.status === 'CONFIRMED';
                return (
                  <Grid item xs={12} key={booking.id}>
                    <Card
                      sx={{
                        bgcolor: '#ffffff',
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
                        borderRadius: 3.5,
                        p: { xs: 2, sm: 3 },
                      }}
                    >
                      <CardContent sx={{ p: '0 !important' }}>
                        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2 }}>
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

                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2.5, color: '#64748b', fontSize: 13 }}>
                              <Box>
                                Ref: <strong>{booking.booking_reference}</strong>
                              </Box>
                              <Box>
                                Quantity: <strong>{booking.quantity} Ticket(s)</strong>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                Paid: <CurrencyRupeeIcon sx={{ fontSize: 14, ml: 0.5, color: '#059669' }} />
                                <strong style={{ color: '#059669' }}>
                                  {parseFloat(booking.total_amount_snapshot || 0).toLocaleString('en-IN')}
                                </strong>
                              </Box>
                              {booking.razorpay_payment_id && (
                                <Box>
                                  Payment ID: <code style={{ color: '#0284c7' }}>{booking.razorpay_payment_id}</code>
                                </Box>
                              )}
                              <Box>
                                Booked:{' '}
                                {new Date(booking.created_at).toLocaleDateString(undefined, {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric',
                                })}
                              </Box>
                            </Box>
                          </Box>

                          <Box sx={{ display: 'flex', gap: 1.5 }}>
                            {isConfirmed && (
                              <Button
                                variant="outlined"
                                color="error"
                                size="small"
                                onClick={() => handleOpenCancelDialog(booking)}
                                sx={{ borderColor: '#fca5a5', color: '#dc2626' }}
                              >
                                Cancel Booking
                              </Button>
                            )}
                            <Button
                              variant="contained"
                              size="small"
                              onClick={() => navigate(`/events/${booking.event_id}`)}
                              sx={{ bgcolor: '#f1f5f9', color: '#0f172a', fontWeight: 600, '&:hover': { bgcolor: '#e2e8f0' } }}
                            >
                              Event Info
                            </Button>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )
        )}

        {/* DIALOG: Full Digital Ticket Pass Modal */}
        <Dialog
          open={Boolean(selectedTicket)}
          onClose={() => setSelectedTicket(null)}
          maxWidth="xs"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: 4,
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.25)',
                overflow: 'hidden',
              },
            },
          }}
        >
          {selectedTicket && (
            <Box>
              {/* Header gradient banner */}
              <Box
                sx={{
                  background: 'linear-gradient(135deg, #090d16 0%, #1e1b4b 50%, #312e81 100%)',
                  color: '#ffffff',
                  p: 3,
                  textAlign: 'center',
                  position: 'relative',
                }}
              >
                <IconButton
                  size="small"
                  onClick={() => setSelectedTicket(null)}
                  sx={{ position: 'absolute', top: 12, right: 12, color: 'rgba(255,255,255,0.7)', '&:hover': { color: '#ffffff' } }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
                <Chip
                  label="OFFICIAL ADMISSION PASS"
                  size="small"
                  sx={{
                    bgcolor: 'rgba(16, 185, 129, 0.25)',
                    color: '#6ee7b7',
                    fontWeight: 800,
                    fontSize: 10,
                    letterSpacing: '0.1em',
                    mb: 1.25,
                    border: '1px solid rgba(110, 231, 183, 0.5)',
                  }}
                />
                <Typography
                  variant="h6"
                  sx={{
                    color: '#ffffff !important',
                    fontWeight: 800,
                    lineHeight: 1.3,
                    mb: 0.5,
                    textShadow: '0 2px 8px rgba(0,0,0,0.6)',
                  }}
                >
                  {selectedTicket.event?.title || `Event #${selectedTicket.event_id}`}
                </Typography>
                <Typography variant="body2" sx={{ color: '#cbd5e1 !important', fontSize: 13, fontWeight: 500 }}>
                  {selectedTicket.event?.venue_name || 'Main Venue'}
                </Typography>
              </Box>

              {/* QR Code section */}
              <Box sx={{ p: 3, textAlign: 'center', bgcolor: '#ffffff' }}>
                <Box
                  sx={{
                    width: 210,
                    height: 210,
                    mx: 'auto',
                    p: 1.5,
                    bgcolor: '#ffffff',
                    border: '1.5px solid #e2e8f0',
                    borderRadius: 3,
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    mb: 1.5,
                  }}
                >
                  <Box
                    component="img"
                    src={selectedTicket.qr_code_image_base64 || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(selectedTicket.ticket_reference)}`}
                    alt="Ticket QR Code"
                    sx={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      display: 'block',
                    }}
                  />
                </Box>

                <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', fontFamily: 'monospace' }}>
                  #{selectedTicket.ticket_reference}
                </Typography>

                <Box sx={{ my: 1 }}>
                  {getStatusBadge(selectedTicket.status, selectedTicket.event?.end_at)}
                </Box>

                {/* Status-specific warning or notice */}
                {selectedTicket.status === 'CHECKED_IN' ? (
                  <Alert severity="info" sx={{ my: 2, borderRadius: 2, textAlign: 'left', fontSize: 12 }}>
                    ✓ <strong>Checked In:</strong> Admission verified on{' '}
                    {selectedTicket.checked_in_at ? new Date(selectedTicket.checked_in_at).toLocaleTimeString() : 'at door'}.
                  </Alert>
                ) : selectedTicket.status === 'EXPIRED' || (selectedTicket.event?.end_at && new Date(selectedTicket.event.end_at) < new Date()) ? (
                  <Alert severity="warning" icon={<WarningAmberIcon />} sx={{ my: 2, borderRadius: 2, textAlign: 'left', fontSize: 12 }}>
                    ⛔ <strong>EVENT COMPLETED:</strong> This event has finished. This ticket pass is no longer valid for admission.
                  </Alert>
                ) : selectedTicket.status === 'CANCELLED' ? (
                  <Alert severity="error" sx={{ my: 2, borderRadius: 2, textAlign: 'left', fontSize: 12 }}>
                    ❌ <strong>CANCELLED:</strong> This booking was cancelled. Entry cannot be granted.
                  </Alert>
                ) : (
                  <Alert severity="warning" sx={{ my: 2, borderRadius: 2, textAlign: 'left', fontSize: 12 }}>
                    ⚠️ <strong>One-time Admission:</strong> Valid for exactly one entry. Present this QR code to door staff for scanning.
                  </Alert>
                )}

                {/* Details list */}
                <Box sx={{ bgcolor: '#f8fafc', p: 2, borderRadius: 2.5, border: '1px solid #e2e8f0', textAlign: 'left', fontSize: 13 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <span style={{ color: '#64748b' }}>Seat / Tier:</span>
                    <strong>{selectedTicket.seat_label}</strong>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <span style={{ color: '#64748b' }}>Attendee:</span>
                    <strong>{user?.full_name || 'Guest'}</strong>
                  </Box>
                  {selectedTicket.event?.start_at && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                      <span style={{ color: '#64748b' }}>Date & Time:</span>
                      <strong>
                        {new Date(selectedTicket.event.start_at).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </strong>
                    </Box>
                  )}
                  {selectedTicket.event?.venue_address && (
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#64748b' }}>Address:</span>
                      <strong style={{ maxWidth: 200, textAlign: 'right' }}>{selectedTicket.event.venue_address}</strong>
                    </Box>
                  )}
                </Box>
              </Box>

              {/* Modal action footer */}
              <Box sx={{ p: 2.5, pt: 0, display: 'flex', gap: 1.5, justifyContent: 'space-between' }}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<PrintIcon />}
                  onClick={handlePrintTicket}
                  sx={{ borderColor: '#cbd5e1', color: '#0f172a', fontWeight: 700 }}
                >
                  Print Pass
                </Button>
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={resendingEmailId === selectedTicket.id ? <CircularProgress size={16} /> : <EmailIcon />}
                  disabled={resendingEmailId === selectedTicket.id}
                  onClick={() => handleResendTicketEmail(selectedTicket.id)}
                  sx={{ bgcolor: '#0f172a', color: '#ffffff', fontWeight: 700, '&:hover': { bgcolor: '#1e293b' } }}
                >
                  Resend Email
                </Button>
              </Box>
            </Box>
          )}
        </Dialog>

        {/* Cancellation Confirmation Dialog */}
        <Dialog
          open={Boolean(cancelTarget)}
          onClose={!cancelling ? handleCloseCancelDialog : undefined}
          maxWidth="xs"
          fullWidth
          slotProps={{
            paper: {
              sx: {
                borderRadius: 4,
                bgcolor: '#ffffff',
                border: '1px solid #e2e8f0',
                boxShadow: '0 25px 50px -12px rgba(15, 23, 42, 0.15)',
              },
            },
          }}
        >
          <DialogTitle sx={{ fontWeight: 800, color: '#0f172a' }}>Cancel Booking</DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: '#64748b', mb: 2 }}>
              Are you sure you want to cancel booking <strong>{cancelTarget?.booking_reference}</strong>? All associated admission QR passes will be immediately invalidated and capacity released back to the event.
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
              onClick={handleConfirmCancel}
              disabled={cancelling}
              sx={{
                bgcolor: '#dc2626',
                color: '#ffffff !important',
                fontWeight: 700,
                borderRadius: 2,
                px: 2.5,
                '&:hover': { bgcolor: '#b91c1c' },
              }}
            >
              {cancelling ? 'Cancelling...' : 'Yes, Cancel'}
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    </Box>
  );
};
