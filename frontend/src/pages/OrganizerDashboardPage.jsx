import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Box,
  Typography,
  Tabs,
  Tab,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  CircularProgress,
  Grid,
  Alert,
  Tooltip,
  LinearProgress,
  InputAdornment,
  Collapse,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RefreshIcon from '@mui/icons-material/Refresh';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EmailIcon from '@mui/icons-material/Email';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import HowToRegIcon from '@mui/icons-material/HowToReg';
import EventAvailableIcon from '@mui/icons-material/EventAvailable';
import SearchIcon from '@mui/icons-material/Search';
import EventSeatIcon from '@mui/icons-material/EventSeat';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import BlockIcon from '@mui/icons-material/Block';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import PeopleIcon from '@mui/icons-material/People';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorIcon from '@mui/icons-material/Error';
import CameraAltIcon from '@mui/icons-material/CameraAlt';
import HistoryIcon from '@mui/icons-material/History';
import HourglassTopIcon from '@mui/icons-material/HourglassTop';
import { Html5Qrcode } from 'html5-qrcode';
import { organizerApi } from '../api/organizerApi';
import { eventsApi } from '../api/eventsApi';
import { ticketsApi } from '../api/ticketsApi';
import { bookingsApi } from '../api/bookingsApi';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';

export const OrganizerDashboardPage = () => {
  const { user } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [analytics, setAnalytics] = useState(null);
  const [hostedEvents, setHostedEvents] = useState([]);
  const [categories, setCategories] = useState([]);

  // Attendees state
  const [selectedEventId, setSelectedEventId] = useState('');
  const [attendees, setAttendees] = useState([]);
  const [loadingAttendees, setLoadingAttendees] = useState(false);
  const [attendeeSearch, setAttendeeSearch] = useState('');
  const [rosterFilter, setRosterFilter] = useState('ALL'); // 'ALL' | 'CHECKED_IN' | 'PENDING'

  // QR Scanner & Verification State
  const [checkInStats, setCheckInStats] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [rejectedScansCount, setRejectedScansCount] = useState(0);
  const [recentScans, setRecentScans] = useState([]);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [scanFeedback, setScanFeedback] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const html5QrCodeRef = useRef(null);

  // Separate Section State for Event Creation (No popup)
  const [showCreateSection, setShowCreateSection] = useState(false);
  const [submittingEvent, setSubmittingEvent] = useState(false);
  const initialEventForm = {
    title: '',
    description: '',
    category_id: '',
    venue: '',
    venue_address: '',
    start_time: '',
    end_time: '',
    total_capacity: 100,
    ticket_price: 999,
  };
  const [eventForm, setEventForm] = useState(initialEventForm);

  // Edit Event Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingEventId, setEditingEventId] = useState(null);
  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    category_id: '',
    venue_name: '',
    venue_address: '',
    start_time: '',
    end_time: '',
    total_capacity: 100,
    ticket_price: 999,
  });

  // Add Seats Modal
  const [addSeatsModalOpen, setAddSeatsModalOpen] = useState(false);
  const [seatTargetEvent, setSeatTargetEvent] = useState(null);
  const [addSeatsForm, setAddSeatsForm] = useState({
    additional_seats: 50,
    tier_name: 'VIP Balcony',
    notes: 'Premium add-on allocation',
  });
  const [submittingSeats, setSubmittingSeats] = useState(false);

  // QR Code preview modal
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedAttendee, setSelectedAttendee] = useState(null);

  // Quick Check-in text box
  const [quickCheckInRef, setQuickCheckInRef] = useState('');
  const [checkingIn, setCheckingIn] = useState(false);

  // Waiting list state & handlers
  const [waitingList, setWaitingList] = useState([]);
  const [loadingWaitingList, setLoadingWaitingList] = useState(false);
  const [waitlistEventFilter, setWaitlistEventFilter] = useState('ALL');
  const [updatingWaitlistId, setUpdatingWaitlistId] = useState(null);

  const fetchWaitingList = async (eventId = null) => {
    setLoadingWaitingList(true);
    try {
      const res = await bookingsApi.getOrganizerWaitingList(eventId || undefined);
      if (res && res.success) {
        setWaitingList(res.data?.items || res.data || []);
      }
    } catch (err) {
      console.warn('Could not load organizer waiting list:', err);
    } finally {
      setLoadingWaitingList(false);
    }
  };

  const handleUpdateWaitlistStatus = async (item, newStatus) => {
    setUpdatingWaitlistId(item.id);
    try {
      const res = await bookingsApi.updateWaitingListStatus(item.id, newStatus);
      if (res && res.success) {
        enqueueSnackbar(`Waitlist #${item.id} (${item.customer_name || item.customer_email}) marked as ${newStatus}`, { variant: 'success' });
        fetchWaitingList(waitlistEventFilter === 'ALL' ? null : waitlistEventFilter);
      } else {
        enqueueSnackbar(res?.message || 'Failed to update waitlist entry', { variant: 'error' });
      }
    } catch (err) {
      enqueueSnackbar(err.response?.data?.detail || 'Failed to update waitlist entry', { variant: 'error' });
    } finally {
      setUpdatingWaitlistId(null);
    }
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [eventsRes, catsRes] = await Promise.all([
        organizerApi.getHostedEvents().catch(() => null),
        eventsApi.getCategories().catch(() => null),
      ]);

      let loadedEvents = [];
      if (eventsRes && eventsRes.success) {
        loadedEvents = eventsRes.data || [];
        setHostedEvents(loadedEvents);
        if (loadedEvents.length > 0 && !selectedEventId) {
          setSelectedEventId(loadedEvents[0].id);
        }
      }
      if (catsRes && catsRes.success) {
        setCategories(catsRes.data.items || catsRes.data || []);
      }

      const eventIds = loadedEvents.map((e) => e.id);
      const analyticsRes = await organizerApi.getAnalytics(eventIds).catch(() => null);
      if (analyticsRes && analyticsRes.success) {
        setAnalytics(analyticsRes.data);
      }
      fetchWaitingList(waitlistEventFilter === 'ALL' ? null : waitlistEventFilter);
    } catch (err) {
      enqueueSnackbar('Failed to load organizer analytics', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const fetchAttendeesForEvent = async (eventId) => {
    if (!eventId) return;
    setLoadingAttendees(true);
    try {
      const res = await organizerApi.getAttendees(eventId);
      if (res && res.success) {
        setAttendees(res.data || []);
      }
    } catch (err) {
      enqueueSnackbar('Failed to fetch attendee roster', { variant: 'error' });
    } finally {
      setLoadingAttendees(false);
    }
  };

  const fetchCheckInStats = async (eventId) => {
    if (!eventId) return;
    setLoadingStats(true);
    try {
      const res = await ticketsApi.getCheckInStats(eventId);
      if (res && res.success) {
        setCheckInStats(res.data);
      }
    } catch (err) {
      console.warn('Could not fetch check-in stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchAttendeesForEvent(selectedEventId);
      fetchCheckInStats(selectedEventId);
    }
  }, [selectedEventId]);

  // Clean up camera scanner on unmount or tab switch
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop().catch(() => {});
          }
          html5QrCodeRef.current.clear().catch(() => {});
        } catch (e) {}
      }
    };
  }, []);

  useEffect(() => {
    if (activeTab !== 2 && isScanning) {
      stopCameraScanner();
    }
  }, [activeTab]);

  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (eventForm.start_time && eventForm.end_time && new Date(eventForm.end_time) <= new Date(eventForm.start_time)) {
      enqueueSnackbar('Event end date/time must be strictly after start date/time', { variant: 'warning' });
      return;
    }
    setSubmittingEvent(true);
    try {
      const venueName = eventForm.venue_name || eventForm.venue;
      const desc =
        eventForm.description && eventForm.description.trim().length >= 10
          ? eventForm.description.trim()
          : `${eventForm.title} live experience at ${venueName}. Book your verified tickets now!`;

      const payload = {
        title: eventForm.title,
        description: desc,
        category_id: parseInt(eventForm.category_id, 10),
        venue_name: venueName,
        venue_address: eventForm.venue_address?.trim() || `${venueName}, India`,
        start_at: new Date(eventForm.start_time).toISOString(),
        end_at: new Date(eventForm.end_time).toISOString(),
        total_capacity: parseInt(eventForm.total_capacity, 10),
        price: parseFloat(eventForm.ticket_price),
        currency: 'INR',
        status: 'PUBLISHED',
      };

      const res = await organizerApi.createEvent(payload);
      if (res.success) {
        enqueueSnackbar('Event hosted successfully!', { variant: 'success' });
        setShowCreateSection(false);
        setEventForm(initialEventForm);
        fetchDashboardData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to create event';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleOpenEdit = (event) => {
    setEditingEventId(event.id);
    const startStr = (event.start_at || event.start_time)
      ? new Date(event.start_at || event.start_time).toISOString().slice(0, 16)
      : '';
    const endStr = (event.end_at || event.end_time)
      ? new Date(event.end_at || event.end_time).toISOString().slice(0, 16)
      : '';
    setEditForm({
      title: event.title || '',
      description: event.description || '',
      category_id: event.category_id || (categories[0]?.id || ''),
      venue_name: event.venue_name || event.venue || '',
      venue_address: event.venue_address || '',
      start_time: startStr,
      end_time: endStr,
      total_capacity: event.total_capacity || 100,
      ticket_price: event.price !== undefined ? event.price : (event.ticket_price || event.base_price || 0),
    });
    setEditModalOpen(true);
  };

  const handleUpdateEvent = async (e) => {
    e.preventDefault();
    if (editForm.start_time && editForm.end_time && new Date(editForm.end_time) <= new Date(editForm.start_time)) {
      enqueueSnackbar('Event end date/time must be strictly after start date/time', { variant: 'warning' });
      return;
    }
    try {
      const payload = {
        title: editForm.title,
        description: editForm.description && editForm.description.trim().length >= 10
          ? editForm.description.trim()
          : `${editForm.title} live experience at ${editForm.venue_name}. Book your verified tickets now!`,
        category_id: editForm.category_id ? parseInt(editForm.category_id, 10) : undefined,
        venue_name: editForm.venue_name,
        venue_address: editForm.venue_address?.trim() || `${editForm.venue_name}, India`,
        start_at: editForm.start_time ? new Date(editForm.start_time).toISOString() : undefined,
        end_at: editForm.end_time ? new Date(editForm.end_time).toISOString() : undefined,
        total_capacity: parseInt(editForm.total_capacity, 10),
        price: parseFloat(editForm.ticket_price),
      };
      const res = await organizerApi.updateEvent(editingEventId, payload);
      if (res.success) {
        enqueueSnackbar('Event updated successfully!', { variant: 'success' });
        setEditModalOpen(false);
        fetchDashboardData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to update event';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const handleCancelEvent = async (eventId, title) => {
    if (!window.confirm(`Are you sure you want to cancel event "${title}"?`)) return;
    try {
      const res = await organizerApi.cancelEvent(eventId);
      if (res.success) {
        enqueueSnackbar('Event cancelled successfully', { variant: 'info' });
        fetchDashboardData();
      }
    } catch (err) {
      enqueueSnackbar('Failed to cancel event', { variant: 'error' });
    }
  };

  const handleOpenAddSeats = (event) => {
    setSeatTargetEvent(event);
    setAddSeatsForm({
      additional_seats: 50,
      tier_name: 'VIP Balcony',
      notes: 'Premium add-on allocation',
    });
    setAddSeatsModalOpen(true);
  };

  const handleAddSeatsSubmit = async (e) => {
    e.preventDefault();
    if (!seatTargetEvent) return;
    setSubmittingSeats(true);
    try {
      const payload = {
        additional_seats: parseInt(addSeatsForm.additional_seats, 10),
        tier_name: addSeatsForm.tier_name,
        notes: addSeatsForm.notes,
      };
      const res = await organizerApi.addSeats(seatTargetEvent.id, payload);
      if (res.success) {
        enqueueSnackbar(`Added +${payload.additional_seats} seats (${payload.tier_name}) successfully!`, {
          variant: 'success',
        });
        setAddSeatsModalOpen(false);
        fetchDashboardData();
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Failed to add seats';
      enqueueSnackbar(msg, { variant: 'error' });
    } finally {
      setSubmittingSeats(false);
    }
  };

  // Camera-based scanner controls
  const startCameraScanner = async () => {
    setCameraError('');
    setIsScanning(true);
    setTimeout(async () => {
      try {
        const scanner = new Html5Qrcode('qr-reader');
        html5QrCodeRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            try {
              if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
                await html5QrCodeRef.current.pause();
              }
            } catch (e) {}

            await handleProcessScan(decodedText);

            setTimeout(async () => {
              try {
                if (html5QrCodeRef.current) {
                  await html5QrCodeRef.current.resume();
                }
              } catch (e) {}
            }, 2500);
          },
          () => {} // Ignore per-frame decode errors
        );
      } catch (err) {
        setIsScanning(false);
        const errMsg = err?.message || String(err);
        if (errMsg.toLowerCase().includes('permission') || errMsg.toLowerCase().includes('notallowed') || errMsg.toLowerCase().includes('denied')) {
          setCameraError('Camera permission was denied. Please allow camera access in your browser settings or use manual ticket reference entry below.');
        } else {
          setCameraError(`Camera initialization failed (${errMsg}). Please use manual ticket reference entry.`);
        }
      }
    }, 150);
  };

  const stopCameraScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        await html5QrCodeRef.current.clear();
      } catch (e) {
        console.warn('Error stopping camera scanner:', e);
      }
      html5QrCodeRef.current = null;
    }
    setIsScanning(false);
  };

  // Unified Ticket Verification and Admission Processor
  const handleProcessScan = async (codeText) => {
    if (!codeText || !codeText.trim()) return;
    const cleanInput = codeText.trim();
    setCheckingIn(true);
    try {
      const payload = {
        event_id: selectedEventId ? parseInt(selectedEventId, 10) : undefined,
        raw_qr_data: cleanInput,
        ticket_reference: (cleanInput.startsWith('TKT-') || cleanInput.startsWith('BK-')) ? cleanInput : undefined,
      };

      const res = await ticketsApi.scanCheckIn(payload);
      const result = res.data || res;
      setScanFeedback(result);

      if (result.valid) {
        enqueueSnackbar(`Admitted: ${result.ticket_reference || 'Ticket'}`, { variant: 'success' });
        if (selectedEventId) {
          fetchAttendeesForEvent(selectedEventId);
          fetchCheckInStats(selectedEventId);
        }
        fetchDashboardData();
        if (qrModalOpen && selectedAttendee) {
          setSelectedAttendee((prev) => (prev ? { ...prev, checked_in: true, checked_in_at: new Date().toISOString() } : null));
        }
      } else {
        setRejectedScansCount((c) => c + 1);
        enqueueSnackbar(result.message || 'Check-in rejected', { variant: 'warning' });
      }

      setRecentScans((prev) => [
        {
          id: Date.now(),
          reference: result.ticket_reference || cleanInput.slice(0, 18),
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          valid: !!result.valid,
          code: result.code || (result.valid ? 'SUCCESS' : 'REJECTED'),
          message: result.message,
        },
        ...prev.slice(0, 4),
      ]);
    } catch (err) {
      setRejectedScansCount((c) => c + 1);
      const msg = err.response?.data?.message || err.response?.data?.detail || 'Verification unavailable — Cannot connect to backend server.';
      const errorResult = {
        valid: false,
        code: 'CONNECTION_ERROR',
        message: typeof msg === 'string' ? msg : 'Verification unavailable — Cannot connect to backend server.',
      };
      setScanFeedback(errorResult);
      enqueueSnackbar(errorResult.message, { variant: 'error' });
    } finally {
      setCheckingIn(false);
    }
  };

  const handleManualVerifySubmit = async (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;
    await handleProcessScan(manualInput.trim());
    setManualInput('');
  };

  const handleCheckInAttendee = async (bookingId, bookingReference, ticketReference) => {
    const refToUse = ticketReference || bookingReference;
    await handleProcessScan(refToUse);
  };

  const handleQuickCheckIn = async (e) => {
    e.preventDefault();
    if (!quickCheckInRef.trim()) return;
    await handleProcessScan(quickCheckInRef.trim());
    setQuickCheckInRef('');
  };

  const handleExportCsv = () => {
    if (!attendees || attendees.length === 0) {
      enqueueSnackbar('No attendee records to export for this event', { variant: 'info' });
      return;
    }
    const eventObj = hostedEvents.find((e) => String(e.id) === String(selectedEventId));
    const eventName = eventObj?.title || `Event-${selectedEventId}`;
    
    const headers = ['Booking Reference', 'Ticket Reference', 'Attendee Name', 'Attendee Email', 'Quantity', 'Amount (INR)', 'Email Sent', 'Checked In', 'Checked In At', 'Checked In By'];
    const rows = attendees.map((att) => [
      `"${att.booking_reference || ''}"`,
      `"${att.ticket_reference || ''}"`,
      `"${att.user_name || ''}"`,
      `"${att.user_email || ''}"`,
      att.quantity || 1,
      att.total_amount || 0,
      att.email_sent ? 'YES' : 'NO',
      att.checked_in ? 'YES' : 'NO',
      `"${att.checked_in_at ? new Date(att.checked_in_at).toLocaleString('en-IN') : 'N/A'}"`,
      `"${att.checked_in_by || 'N/A'}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `${eventName.replace(/[^a-zA-Z0-9]/g, '_')}_Attendees_Roster.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    enqueueSnackbar('Attendee roster CSV report exported successfully!', { variant: 'success' });
  };

  const filteredAttendees = attendees.filter((item) => {
    const q = attendeeSearch.toLowerCase();
    const matchesSearch = (
      item.booking_reference?.toLowerCase().includes(q) ||
      item.ticket_reference?.toLowerCase().includes(q) ||
      item.user_name?.toLowerCase().includes(q) ||
      item.user_email?.toLowerCase().includes(q)
    );
    if (!matchesSearch) return false;
    if (rosterFilter === 'CHECKED_IN') return !!item.checked_in;
    if (rosterFilter === 'PENDING') return !item.checked_in;
    return true;
  });

  return (
    <Box sx={{ bgcolor: '#f8fafc', minHeight: '100vh', pb: 8 }}>
      {/* Top Banner */}
      <Box
        sx={{
          bgcolor: '#0f172a',
          color: '#ffffff',
          pt: 5,
          pb: 6,
          borderBottom: '1px solid #1e293b',
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
            <Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Chip
                  label="ORGANIZER PORTAL"
                  size="small"
                  sx={{
                    bgcolor: '#3b82f6',
                    color: '#ffffff',
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: '0.05em',
                  }}
                />
                <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                  {user?.email}
                </Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.02em', color: '#ffffff !important' }}>
                Event Host & Operations Hub
              </Typography>
              <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5 }}>
                Manage ticket allocations, seat add-ons, payments, dispatched emails, and live QR code check-ins.
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5 }}>
              <Button
                variant="outlined"
                onClick={fetchDashboardData}
                disabled={loading}
                startIcon={<RefreshIcon />}
                sx={{
                  color: '#ffffff',
                  borderColor: '#334155',
                  borderRadius: 2.5,
                  '&:hover': { borderColor: '#94a3b8', bgcolor: '#1e293b' },
                }}
              >
                Refresh
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  setActiveTab(0);
                  setShowCreateSection(!showCreateSection);
                }}
                startIcon={showCreateSection ? <CloseIcon /> : <AddIcon />}
                sx={{
                  bgcolor: showCreateSection ? '#334155' : '#ffffff',
                  color: showCreateSection ? '#ffffff' : '#0f172a',
                  fontWeight: 700,
                  borderRadius: 2.5,
                  textTransform: 'none',
                  '&:hover': { bgcolor: showCreateSection ? '#1e293b' : '#f1f5f9' },
                }}
              >
                {showCreateSection ? 'Close Creator' : 'Host New Event'}
              </Button>
            </Box>
          </Box>
        </Container>
      </Box>

      <Container maxWidth="lg" sx={{ mt: -3 }}>
        {/* KPI Summary Cards */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
            gap: 2.5,
          }}
        >
          {/* Gross Revenue */}
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Gross Revenue
                </Typography>
                <CurrencyRupeeIcon sx={{ color: '#16a34a', fontSize: 20 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                ₹{Number(analytics?.gross_revenue ?? analytics?.total_revenue ?? 0).toLocaleString('en-IN')}
              </Typography>
              <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 600 }}>
                Confirmed payments
              </Typography>
            </CardContent>
          </Card>

          {/* Tickets Sold */}
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Tickets Sold
                </Typography>
                <ConfirmationNumberIcon sx={{ color: '#2563eb', fontSize: 20 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {analytics?.total_tickets_sold || 0}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Active admissions
              </Typography>
            </CardContent>
          </Card>

          {/* Hosted Events */}
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Hosted Events
                </Typography>
                <EventAvailableIcon sx={{ color: '#8b5cf6', fontSize: 20 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {hostedEvents.length}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Created by you
              </Typography>
            </CardContent>
          </Card>

          {/* Emails Dispatched */}
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Emails Sent
                </Typography>
                <EmailIcon sx={{ color: '#f59e0b', fontSize: 20 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {analytics?.total_emails_sent ?? analytics?.emails_delivered ?? 0}
              </Typography>
              <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 600 }}>
                100% Delivery rate
              </Typography>
            </CardContent>
          </Card>

          {/* QR Codes Issued */}
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  QR Codes Sent
                </Typography>
                <QrCode2Icon sx={{ color: '#0284c7', fontSize: 20 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {analytics?.total_qrs_generated ?? analytics?.qr_codes_generated ?? 0}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b' }}>
                Live e-Passes issued
              </Typography>
            </CardContent>
          </Card>

          {/* Verified Check-Ins */}
          <Card sx={{ borderRadius: 3, boxShadow: '0 4px 12px rgba(15,23,42,0.06)', border: '1px solid #e2e8f0' }}>
            <CardContent sx={{ p: 2.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                  Checked In
                </Typography>
                <HowToRegIcon sx={{ color: '#059669', fontSize: 20 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                {analytics?.total_checked_in ?? analytics?.check_in_count ?? 0}
              </Typography>
              <Typography variant="caption" sx={{ color: '#059669', fontWeight: 600 }}>
                Door scans completed
              </Typography>
            </CardContent>
          </Card>
        </Box>

        {/* Tab Navigation (Styled with Icons, Badges & Warm Active Pill like Image 2) */}
        <Box
          sx={{
            mt: 4,
            mb: 3,
            bgcolor: '#ffffff',
            borderRadius: '14px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
            p: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Tabs
            value={activeTab}
            onChange={(e, v) => setActiveTab(v)}
            sx={{
              minHeight: 'auto',
              '& .MuiTabs-indicator': { display: 'none' },
              '& .MuiTabs-flexContainer': {
                gap: 1.5,
                flexWrap: 'wrap',
              },
            }}
          >
            {/* Tab 0: Hosted Events */}
            <Tab
              disableRipple
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <ConfirmationNumberIcon sx={{ fontSize: 19, color: activeTab === 0 ? '#ea580c' : '#64748b' }} />
                  <Typography sx={{ fontWeight: activeTab === 0 ? 800 : 600, fontSize: 14 }}>
                    Hosted Events
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: activeTab === 0 ? '#ea580c' : '#f1f5f9',
                      color: activeTab === 0 ? '#ffffff' : '#64748b',
                      fontSize: 11,
                      fontWeight: 800,
                      minWidth: 22,
                      height: 20,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 0.75,
                      transition: 'all 0.2s',
                    }}
                  >
                    {hostedEvents.length}
                  </Box>
                </Box>
              }
              sx={{
                textTransform: 'none',
                minHeight: 44,
                borderRadius: '10px',
                px: 2,
                py: 0.75,
                bgcolor: activeTab === 0 ? '#fff7ed' : 'transparent',
                color: activeTab === 0 ? '#0f172a !important' : '#64748b',
                border: activeTab === 0 ? '1.5px solid #fed7aa' : '1.5px solid transparent',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: activeTab === 0 ? '#fff7ed' : '#f8fafc',
                  color: '#0f172a',
                },
              }}
            />

            {/* Tab 1: Seating Tiers & Add-On Seats */}
            <Tab
              disableRipple
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <EventSeatIcon sx={{ fontSize: 19, color: activeTab === 1 ? '#ea580c' : '#64748b' }} />
                  <Typography sx={{ fontWeight: activeTab === 1 ? 800 : 600, fontSize: 14 }}>
                    Seating Tiers & Add-On Seats
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: activeTab === 1 ? '#ea580c' : '#f1f5f9',
                      color: activeTab === 1 ? '#ffffff' : '#64748b',
                      fontSize: 11,
                      fontWeight: 800,
                      height: 20,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 1,
                      transition: 'all 0.2s',
                    }}
                  >
                    Tiers
                  </Box>
                </Box>
              }
              sx={{
                textTransform: 'none',
                minHeight: 44,
                borderRadius: '10px',
                px: 2,
                py: 0.75,
                bgcolor: activeTab === 1 ? '#fff7ed' : 'transparent',
                color: activeTab === 1 ? '#0f172a !important' : '#64748b',
                border: activeTab === 1 ? '1.5px solid #fed7aa' : '1.5px solid transparent',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: activeTab === 1 ? '#fff7ed' : '#f8fafc',
                  color: '#0f172a',
                },
              }}
            />

            {/* Tab 2: Attendee Roster & QR Verification */}
            <Tab
              disableRipple
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <PeopleIcon sx={{ fontSize: 19, color: activeTab === 2 ? '#ea580c' : '#64748b' }} />
                  <Typography sx={{ fontWeight: activeTab === 2 ? 800 : 600, fontSize: 14 }}>
                    Attendee Roster & QR
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: activeTab === 2 ? '#ea580c' : '#f1f5f9',
                      color: activeTab === 2 ? '#ffffff' : '#64748b',
                      fontSize: 11,
                      fontWeight: 800,
                      minWidth: 22,
                      height: 20,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 0.75,
                      transition: 'all 0.2s',
                    }}
                  >
                    {attendees.length}
                  </Box>
                </Box>
              }
              sx={{
                textTransform: 'none',
                minHeight: 44,
                borderRadius: '10px',
                px: 2,
                py: 0.75,
                bgcolor: activeTab === 2 ? '#fff7ed' : 'transparent',
                color: activeTab === 2 ? '#0f172a !important' : '#64748b',
                border: activeTab === 2 ? '1.5px solid #fed7aa' : '1.5px solid transparent',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: activeTab === 2 ? '#fff7ed' : '#f8fafc',
                  color: '#0f172a',
                },
              }}
            />

            {/* Tab 3: Financials & Email Dispatch Ledger */}
            <Tab
              disableRipple
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <CurrencyRupeeIcon sx={{ fontSize: 19, color: activeTab === 3 ? '#ea580c' : '#64748b' }} />
                  <Typography sx={{ fontWeight: activeTab === 3 ? 800 : 600, fontSize: 14 }}>
                    Financials & Email Ledger
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: activeTab === 3 ? '#dcfce7' : '#f0fdf4',
                      color: '#15803d',
                      border: '1px solid #bbf7d0',
                      fontSize: 11,
                      fontWeight: 800,
                      height: 20,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 0.85,
                      transition: 'all 0.2s',
                    }}
                  >
                    Audited
                  </Box>
                </Box>
              }
              sx={{
                textTransform: 'none',
                minHeight: 44,
                borderRadius: '10px',
                px: 2,
                py: 0.75,
                bgcolor: activeTab === 3 ? '#fff7ed' : 'transparent',
                color: activeTab === 3 ? '#0f172a !important' : '#64748b',
                border: activeTab === 3 ? '1.5px solid #fed7aa' : '1.5px solid transparent',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: activeTab === 3 ? '#fff7ed' : '#f8fafc',
                  color: '#0f172a',
                },
              }}
            />

            {/* Tab 4: Priority Waiting List & Demand */}
            <Tab
              disableRipple
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
                  <HourglassTopIcon sx={{ fontSize: 19, color: activeTab === 4 ? '#ea580c' : '#64748b' }} />
                  <Typography sx={{ fontWeight: activeTab === 4 ? 800 : 600, fontSize: 14 }}>
                    Waiting List & Demand
                  </Typography>
                  <Box
                    sx={{
                      bgcolor: activeTab === 4 ? '#ea580c' : '#f1f5f9',
                      color: activeTab === 4 ? '#ffffff' : '#64748b',
                      fontSize: 11,
                      fontWeight: 800,
                      minWidth: 22,
                      height: 20,
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      px: 0.75,
                      transition: 'all 0.2s',
                    }}
                  >
                    {waitingList.length}
                  </Box>
                </Box>
              }
              sx={{
                textTransform: 'none',
                minHeight: 44,
                borderRadius: '10px',
                px: 2,
                py: 0.75,
                bgcolor: activeTab === 4 ? '#fff7ed' : 'transparent',
                color: activeTab === 4 ? '#0f172a !important' : '#64748b',
                border: activeTab === 4 ? '1.5px solid #fed7aa' : '1.5px solid transparent',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: activeTab === 4 ? '#fff7ed' : '#f8fafc',
                  color: '#0f172a',
                },
              }}
            />
          </Tabs>
        </Box>

        {/* TAB 0: Hosted Events */}
        {activeTab === 0 && (
          <Box>
            {/* SEPARATE INLINE SECTION FOR HOSTING NEW EVENT (NO POPUP) */}
            <Collapse in={showCreateSection} unmountOnExit sx={{ mb: 4 }}>
              <Card
                sx={{
                  bgcolor: '#ffffff',
                  borderRadius: 4,
                  border: '1.5px solid #cbd5e1',
                  boxShadow: '0 12px 32px -6px rgba(15, 23, 42, 0.08), 0 4px 12px -2px rgba(15, 23, 42, 0.03)',
                  overflow: 'hidden',
                }}
              >
                {/* Section Header */}
                <Box
                  sx={{
                    p: 3,
                    pb: 2.5,
                    bgcolor: '#f8fafc',
                    borderBottom: '1px solid #e2e8f0',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <Box
                      sx={{
                        width: 40,
                        height: 40,
                        borderRadius: 2.5,
                        bgcolor: '#0f172a',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <EventAvailableIcon sx={{ fontSize: 22 }} />
                    </Box>
                    <Box>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>
                        Host & Publish New Live Event
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: 12.5 }}>
                        Create a verified live listing with seat allocation and Razorpay ticketing
                      </Typography>
                    </Box>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={() => setShowCreateSection(false)}
                    sx={{
                      color: '#64748b',
                      border: '1px solid #e2e8f0',
                      borderRadius: 2,
                      p: 0.75,
                      '&:hover': { bgcolor: '#e2e8f0', color: '#0f172a' },
                    }}
                  >
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>

                {/* Form Content */}
                <Box component="form" onSubmit={handleCreateEvent} sx={{ p: { xs: 2.5, sm: 3.5 } }}>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, 1fr)' },
                      gap: 2.5,
                    }}
                  >
                    {/* Event Title */}
                    <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 8' } }}>
                      <TextField
                        fullWidth
                        label="Event Title"
                        required
                        placeholder="e.g. Minimalist UI/UX Systems & Micro-Interactions Masterclass"
                        value={eventForm.title}
                        onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                        sx={{
                          '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                        }}
                      />
                    </Box>

                    {/* Category Selection */}
                    <Box sx={{ gridColumn: { xs: '1 / -1', md: 'span 4' } }}>
                      <TextField
                        fullWidth
                        select
                        label="Event Category"
                        required
                        value={eventForm.category_id}
                        onChange={(e) => setEventForm({ ...eventForm, category_id: e.target.value })}
                        sx={{
                          '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                        }}
                      >
                        {categories.map((c) => (
                          <MenuItem key={c.id} value={c.id}>
                            {c.name}
                          </MenuItem>
                        ))}
                      </TextField>
                    </Box>

                    {/* Venue Name */}
                    <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6' } }}>
                      <TextField
                        fullWidth
                        label="Venue / Arena Name"
                        required
                        placeholder="e.g. Bangalore International Centre"
                        value={eventForm.venue}
                        onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                        sx={{
                          '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                        }}
                      />
                    </Box>

                    {/* Complete Address / City */}
                    <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6' } }}>
                      <TextField
                        fullWidth
                        label="Venue Address / City"
                        placeholder="e.g. 7 4th Main Road, Domlur II Stage, Bengaluru"
                        value={eventForm.venue_address || ''}
                        onChange={(e) => setEventForm({ ...eventForm, venue_address: e.target.value })}
                        sx={{
                          '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                        }}
                      />
                    </Box>

                    {/* Start Date & Time */}
                    <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6' } }}>
                      <TextField
                        fullWidth
                        label="Start Date & Time"
                        type="datetime-local"
                        required
                        InputLabelProps={{ shrink: true }}
                        helperText="Specify when doors open and event begins"
                        value={eventForm.start_time}
                        onChange={(e) => setEventForm({ ...eventForm, start_time: e.target.value })}
                        sx={{
                          '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                        }}
                      />
                    </Box>

                    {/* End Date & Time */}
                    <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6' } }}>
                      <TextField
                        fullWidth
                        label="End Date & Time"
                        type="datetime-local"
                        required
                        InputLabelProps={{ shrink: true }}
                        helperText="Scheduled event conclusion time"
                        value={eventForm.end_time}
                        onChange={(e) => setEventForm({ ...eventForm, end_time: e.target.value })}
                        sx={{
                          '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                        }}
                      />
                    </Box>

                    {/* Total Capacity */}
                    <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6' } }}>
                      <TextField
                        fullWidth
                        label="Total Capacity (Tickets)"
                        type="number"
                        required
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <EventSeatIcon sx={{ fontSize: 19, color: '#64748b' }} />
                            </InputAdornment>
                          ),
                        }}
                        helperText="Total available seats allocated for reservation"
                        value={eventForm.total_capacity}
                        onChange={(e) => setEventForm({ ...eventForm, total_capacity: e.target.value })}
                        sx={{
                          '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                        }}
                      />
                    </Box>

                    {/* Ticket Price in INR */}
                    <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6' } }}>
                      <TextField
                        fullWidth
                        label="Ticket Price (₹ INR)"
                        type="number"
                        step="0.01"
                        required
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CurrencyRupeeIcon sx={{ fontSize: 19, color: '#0f172a' }} />
                            </InputAdornment>
                          ),
                        }}
                        helperText="Base ticket price charged in Indian Rupees"
                        value={eventForm.ticket_price}
                        onChange={(e) => setEventForm({ ...eventForm, ticket_price: e.target.value })}
                        sx={{
                          '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                        }}
                      />
                    </Box>

                    {/* Event Narrative / Description */}
                    <Box sx={{ gridColumn: '1 / -1' }}>
                      <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Event Narrative & Highlights"
                        placeholder="Highlight performing artists, agenda, parking information, and age limits..."
                        value={eventForm.description}
                        onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                        helperText="Brief summary visible on attendee event discovery cards"
                        sx={{
                          '& .MuiOutlinedInput-root': { borderRadius: 2.5 },
                        }}
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ my: 3, borderColor: '#f1f5f9' }} />

                  {/* Form Buttons: Explicit High-Contrast Cancel + Publish Button */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: 2 }}>
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setShowCreateSection(false);
                        setEventForm(initialEventForm);
                      }}
                      sx={{
                        borderColor: '#cbd5e1',
                        color: '#0f172a',
                        fontWeight: 700,
                        px: 3.5,
                        py: 1.1,
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontSize: 14,
                        '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8' },
                      }}
                    >
                      Cancel
                    </Button>

                    <Button
                      type="submit"
                      variant="contained"
                      disabled={submittingEvent}
                      startIcon={<AddIcon />}
                      sx={{
                        bgcolor: '#0f172a',
                        color: '#ffffff',
                        fontWeight: 800,
                        px: 4,
                        py: 1.1,
                        borderRadius: 2.5,
                        textTransform: 'none',
                        fontSize: 14,
                        boxShadow: '0 4px 14px rgba(15, 23, 42, 0.25)',
                        '&:hover': { bgcolor: '#1e293b' },
                      }}
                    >
                      {submittingEvent ? 'Publishing Event...' : 'Publish Event Listing'}
                    </Button>
                  </Box>
                </Box>
              </Card>
            </Collapse>

            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <Box sx={{ p: 2.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Your Hosted Events
                </Typography>
                <Button
                  variant="contained"
                  size="small"
                  startIcon={showCreateSection ? <CloseIcon /> : <AddIcon />}
                  onClick={() => setShowCreateSection(!showCreateSection)}
                  sx={{
                    bgcolor: showCreateSection ? '#475569' : '#0f172a',
                    color: '#ffffff',
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    '&:hover': { bgcolor: showCreateSection ? '#334155' : '#1e293b' },
                  }}
                >
                  {showCreateSection ? 'Close Creator' : 'Add Event'}
                </Button>
              </Box>
            <TableContainer component={Paper} elevation={0}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Event & Venue Details</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Date & Timing</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Capacity (Remaining / Total)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Ticket Price</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                    <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {hostedEvents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          You have not hosted any events yet. Click "Host New Event" to get started!
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    hostedEvents.map((evt) => {
                      const pctUsed = Math.min(
                        100,
                        Math.round(((evt.total_capacity - evt.available_capacity) / evt.total_capacity) * 100)
                      );
                      const startVal = evt.start_at || evt.start_time;
                      const endVal = evt.end_at || evt.end_time;
                      const catName = evt.category_name || categories.find((c) => c.id === evt.category_id)?.name || 'General';
                      const venueName = evt.venue_name || evt.venue || 'Venue TBA';
                      const priceVal = parseFloat(evt.price ?? evt.ticket_price ?? evt.base_price ?? 0);

                      return (
                        <TableRow key={evt.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                {evt.title}
                              </Typography>
                              <Chip
                                label={catName}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: 10.5,
                                  fontWeight: 700,
                                  bgcolor: '#f1f5f9',
                                  color: '#334155',
                                }}
                              />
                            </Box>
                            <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                              📍 {venueName} {evt.venue_address ? `• ${evt.venue_address}` : ''}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                              {startVal
                                ? new Date(startVal).toLocaleDateString('en-IN', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })
                                : 'Date TBA'}
                            </Typography>
                            {endVal && (
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                Concludes: {new Date(endVal).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ minWidth: 210 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontWeight: 800,
                                  color: evt.available_capacity <= 0 ? '#dc2626' : '#15803d',
                                }}
                              >
                                {evt.available_capacity <= 0 ? '🔴 0 TICKETS LEFT' : `🟢 ${evt.available_capacity} tickets left`}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                Total: {evt.total_capacity}
                              </Typography>
                            </Box>
                            <LinearProgress
                              variant="determinate"
                              value={pctUsed}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: '#e2e8f0',
                                '& .MuiLinearProgress-bar': { bgcolor: evt.available_capacity <= 0 ? '#ef4444' : pctUsed > 80 ? '#f97316' : '#16a34a' },
                              }}
                            />
                            {evt.available_capacity <= 0 && (
                              <Box sx={{ mt: 0.8, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Chip
                                  icon={<HourglassTopIcon sx={{ fontSize: '13px !important' }} />}
                                  label="Sold Out • Waitlist Active"
                                  size="small"
                                  onClick={() => {
                                    setWaitlistEventFilter(evt.id);
                                    setActiveTab(4);
                                  }}
                                  sx={{
                                    bgcolor: '#fff7ed',
                                    color: '#ea580c',
                                    border: '1px solid #fed7aa',
                                    fontWeight: 700,
                                    fontSize: 10.5,
                                    height: 22,
                                    cursor: 'pointer',
                                    '&:hover': { bgcolor: '#ffedd5' },
                                  }}
                                />
                              </Box>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                              ₹{priceVal.toLocaleString('en-IN')}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={evt.status}
                              size="small"
                              sx={{
                                fontWeight: 700,
                                fontSize: 11,
                                bgcolor: evt.status === 'PUBLISHED' ? '#dcfce7' : evt.status === 'CANCELLED' ? '#fee2e2' : '#f1f5f9',
                                color: evt.status === 'PUBLISHED' ? '#15803d' : evt.status === 'CANCELLED' ? '#b91c1c' : '#475569',
                              }}
                            />
                          </TableCell>
                          <TableCell align="right">
                            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
                              <Tooltip title="Add Extra Seats / Tiers">
                                <Button
                                  variant="outlined"
                                  size="small"
                                  startIcon={<EventSeatIcon fontSize="small" />}
                                  onClick={() => handleOpenAddSeats(evt)}
                                  sx={{ textTransform: 'none', borderRadius: 2 }}
                                >
                                  + Seats
                                </Button>
                              </Tooltip>
                              <Tooltip title="Edit Event Details">
                                <IconButton size="small" onClick={() => handleOpenEdit(evt)} sx={{ border: '1px solid #e2e8f0' }}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {evt.status !== 'CANCELLED' && (
                                <Tooltip title="Cancel Event">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleCancelEvent(evt.id, evt.title)}
                                    sx={{ border: '1px solid #fee2e2', color: '#dc2626' }}
                                  >
                                    <BlockIcon fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        </Box>
      )}

        {/* TAB 1: Seating Tiers & Add-On Seats */}
        {activeTab === 1 && (
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Seating Capacity & Add-On Seats Management
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Expand capacity dynamically during high demand. Add VIP sections, balcony rows, or general admission seats to any event in real-time.
              </Typography>
            </Box>

            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 3,
              }}
            >
              {hostedEvents.map((evt) => {
                const sold = evt.total_capacity - evt.available_capacity;
                const venueName = evt.venue_name || evt.venue || 'Venue TBA';
                const priceVal = parseFloat(evt.price ?? evt.ticket_price ?? evt.base_price ?? 0);
                return (
                  <Card key={evt.id} variant="outlined" sx={{ borderRadius: 3, p: 2.5, bgcolor: '#ffffff' }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                          {evt.title}
                        </Typography>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>
                          📍 {venueName} {evt.venue_address ? `• ${evt.venue_address}` : ''}
                        </Typography>
                      </Box>
                      <Chip
                        icon={<EventSeatIcon sx={{ fontSize: '14px !important' }} />}
                        label={`${evt.total_capacity} Seats Total`}
                        size="small"
                        sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 700 }}
                      />
                    </Box>

                    <Box
                      sx={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 2,
                        mb: 2.5,
                      }}
                    >
                      <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Sold Seats</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#2563eb' }}>{sold}</Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Available</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#16a34a' }}>{evt.available_capacity}</Typography>
                      </Box>
                      <Box sx={{ p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center' }}>
                        <Typography variant="caption" sx={{ color: '#64748b' }}>Base Price</Typography>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>₹{priceVal.toLocaleString('en-IN')}</Typography>
                      </Box>
                    </Box>

                      <Box sx={{ display: 'flex', gap: 1.5 }}>
                        <Button
                          fullWidth
                          variant="contained"
                          startIcon={<AddIcon sx={{ color: '#ffffff' }} />}
                          onClick={() => handleOpenAddSeats(evt)}
                          sx={{
                            bgcolor: '#0f172a',
                            color: '#ffffff !important',
                            borderRadius: 2,
                            fontWeight: 700,
                            textTransform: 'none',
                            '&:hover': { bgcolor: '#1e293b', color: '#ffffff' },
                          }}
                        >
                          Add On Extra Seats
                        </Button>
                      </Box>
                    </Card>
                );
              })}
            </Box>
          </Card>
        )}

        {/* TAB 2: Attendee Roster & Live QR Check-in Hub */}
        {activeTab === 2 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Header & Event Selector Card */}
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                    <QrCode2Icon sx={{ color: '#0f172a', fontSize: 26 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      QR Ticket Scanner & Live Check-in Operations
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                    Verify attendee passes with device camera or manual fallback. Enforces strict single-use admission, schedule windows, and audit logging.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
                  <TextField
                    select
                    size="small"
                    label="Current Event"
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    sx={{ minWidth: 280, bgcolor: '#ffffff' }}
                  >
                    {hostedEvents.map((evt) => (
                      <MenuItem key={evt.id} value={evt.id}>
                        {evt.title} ({evt.total_capacity - evt.available_capacity} booked)
                      </MenuItem>
                    ))}
                  </TextField>
                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => {
                      if (selectedEventId) {
                        fetchAttendeesForEvent(selectedEventId);
                        fetchCheckInStats(selectedEventId);
                      }
                    }}
                    startIcon={<RefreshIcon />}
                    sx={{ borderRadius: 2, textTransform: 'none', height: 40 }}
                  >
                    Refresh Stats
                  </Button>
                </Box>
              </Box>

              {/* Live Check-In Statistics Bar */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
                  gap: 2,
                }}
              >
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderRadius: 2.5, border: '1px solid #e2e8f0', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Tickets
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mt: 0.5 }}>
                    {checkInStats ? checkInStats.total_tickets : attendees.length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#64748b' }}>Issued passes</Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: '#ecfdf5', borderRadius: 2.5, border: '1px solid #a7f3d0', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#047857', fontWeight: 700, textTransform: 'uppercase' }}>
                    Admitted
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#059669', mt: 0.5 }}>
                    {checkInStats ? checkInStats.checked_in_count : attendees.filter((a) => a.checked_in).length}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#047857', fontWeight: 600 }}>Verified scans</Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: '#eff6ff', borderRadius: 2.5, border: '1px solid #bfdbfe', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Remaining
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#2563eb', mt: 0.5 }}>
                    {checkInStats
                      ? checkInStats.remaining_count
                      : Math.max(0, attendees.length - attendees.filter((a) => a.checked_in).length)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#1d4ed8' }}>Awaiting entry</Typography>
                </Box>

                <Box sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 2.5, border: '1px solid #fde68a', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 700, textTransform: 'uppercase' }}>
                    Check-in Rate
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#b45309', mt: 0.5 }}>
                    {checkInStats
                      ? `${checkInStats.check_in_rate_percent}%`
                      : `${attendees.length > 0 ? Math.round((attendees.filter((a) => a.checked_in).length / attendees.length) * 100) : 0}%`}
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={checkInStats ? checkInStats.check_in_rate_percent : (attendees.length > 0 ? (attendees.filter((a) => a.checked_in).length / attendees.length) * 100 : 0)}
                    sx={{ height: 6, borderRadius: 3, mt: 1, bgcolor: '#fde68a', '& .MuiLinearProgress-bar': { bgcolor: '#b45309' } }}
                  />
                </Box>

                <Box sx={{ p: 2, bgcolor: rejectedScansCount > 0 ? '#fef2f2' : '#f8fafc', borderRadius: 2.5, border: rejectedScansCount > 0 ? '1px solid #fecaca' : '1px solid #e2e8f0', textAlign: 'center' }}>
                  <Typography variant="caption" sx={{ color: rejectedScansCount > 0 ? '#b91c1c' : '#64748b', fontWeight: 700, textTransform: 'uppercase' }}>
                    Rejected Scans
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: rejectedScansCount > 0 ? '#dc2626' : '#64748b', mt: 0.5 }}>
                    {rejectedScansCount}
                  </Typography>
                  <Typography variant="caption" sx={{ color: rejectedScansCount > 0 ? '#b91c1c' : '#64748b' }}>
                    Duplicate/invalid attempts
                  </Typography>
                </Box>
              </Box>
            </Card>

            {/* SCANNER CONSOLE & VERIFICATION RESULTS */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)' },
                gap: 3,
              }}
            >
              {/* Left Column: Live Camera Scanner */}
                <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CameraAltIcon sx={{ color: '#0f172a' }} />
                      <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a' }}>
                        Camera QR Scanner
                      </Typography>
                    </Box>
                    {isScanning && (
                      <Chip
                        label="SCANNER ACTIVE"
                        size="small"
                        sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 800, fontSize: 10, animation: 'pulse 1.5s infinite' }}
                      />
                    )}
                  </Box>

                  {/* Camera Viewport */}
                  <Box
                    sx={{
                      position: 'relative',
                      bgcolor: '#0f172a',
                      borderRadius: 3,
                      minHeight: 280,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      overflow: 'hidden',
                      p: isScanning ? 1 : 3,
                      border: '2px solid #1e293b',
                    }}
                  >
                    {/* HTML5 QR Code Mount Element */}
                    <div
                      id="qr-reader"
                      style={{
                        width: '100%',
                        display: isScanning ? 'block' : 'none',
                        borderRadius: 12,
                        overflow: 'hidden',
                      }}
                    />

                    {!isScanning && (
                      <Box sx={{ textAlign: 'center', color: '#ffffff', py: 3 }}>
                        <Box
                          sx={{
                            width: 64,
                            height: 64,
                            mx: 'auto',
                            mb: 2,
                            borderRadius: '50%',
                            bgcolor: '#1e293b',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid #334155',
                          }}
                        >
                          <CameraAltIcon sx={{ fontSize: 32, color: '#94a3b8' }} />
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#f8fafc' }}>
                          Camera is currently paused
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#94a3b8', maxWidth: 300, mx: 'auto', mt: 0.5, mb: 2.5, fontSize: 13 }}>
                          Click below to request camera permission and scan attendee QR passes in real-time.
                        </Typography>
                        <Button
                          variant="contained"
                          startIcon={<VideocamIcon sx={{ color: '#ffffff' }} />}
                          onClick={startCameraScanner}
                          sx={{
                            bgcolor: '#3b82f6',
                            color: '#ffffff !important',
                            fontWeight: 700,
                            borderRadius: 2.5,
                            px: 3,
                            py: 1,
                            textTransform: 'none',
                            '&:hover': { bgcolor: '#2563eb', color: '#ffffff' },
                          }}
                        >
                          Start Camera Scanner
                        </Button>
                      </Box>
                    )}

                    {isScanning && (
                      <Box sx={{ width: '100%', pt: 1.5, textAlign: 'center' }}>
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<VideocamOffIcon />}
                          onClick={stopCameraScanner}
                          sx={{
                            color: '#ffffff',
                            borderColor: '#475569',
                            borderRadius: 2,
                            textTransform: 'none',
                            '&:hover': { borderColor: '#94a3b8', bgcolor: '#1e293b' },
                          }}
                        >
                          Stop Camera Scanner
                        </Button>
                      </Box>
                    )}
                  </Box>

                  {cameraError && (
                    <Alert severity="warning" sx={{ mt: 2, borderRadius: 2 }}>
                      {cameraError}
                    </Alert>
                  )}
                </Card>

              {/* Right Column: Manual Verification & Recent Scans */}
                <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', mb: 0.5 }}>
                    Manual Ticket Entry Fallback
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b', mb: 2, fontSize: 13 }}>
                    In case of broken camera, poor lighting, or printed vouchers, enter the ticket reference or token directly:
                  </Typography>

                  <Box component="form" onSubmit={handleManualVerifySubmit} sx={{ display: 'flex', gap: 1.5, mb: 3 }}>
                    <TextField
                      fullWidth
                      size="small"
                      placeholder="e.g. TKT-20261018-ABC12345 or #BK-..."
                      value={manualInput}
                      onChange={(e) => setManualInput(e.target.value)}
                      sx={{ bgcolor: '#ffffff' }}
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                          </InputAdornment>
                        ),
                      }}
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      disabled={checkingIn || !manualInput.trim()}
                      startIcon={<HowToRegIcon sx={{ color: '#ffffff' }} />}
                      sx={{
                        bgcolor: '#059669',
                        color: '#ffffff !important',
                        borderRadius: 2.5,
                        fontWeight: 700,
                        px: 3,
                        whiteSpace: 'nowrap',
                        textTransform: 'none',
                        '&:hover': { bgcolor: '#047857', color: '#ffffff' },
                      }}
                    >
                      {checkingIn ? 'Checking...' : 'Admit Attendee'}
                    </Button>
                  </Box>

                  <Divider sx={{ my: 1 }} />

                  {/* Recent Scans Activity Log */}
                  <Box sx={{ mt: 1.5, flexGrow: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <HistoryIcon sx={{ color: '#64748b', fontSize: 18 }} />
                        <Typography variant="caption" sx={{ fontWeight: 800, color: '#475569', textTransform: 'uppercase' }}>
                          Recent Scans Activity (Last 5)
                        </Typography>
                      </Box>
                      {recentScans.length > 0 && (
                        <Button size="small" onClick={() => setRecentScans([])} sx={{ fontSize: 11, textTransform: 'none', p: 0 }}>
                          Clear Log
                        </Button>
                      )}
                    </Box>

                    {recentScans.length === 0 ? (
                      <Box sx={{ p: 3, bgcolor: '#f8fafc', borderRadius: 2, textAlign: 'center', color: '#94a3b8' }}>
                        <Typography variant="caption">No scans recorded in this session yet.</Typography>
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        {recentScans.map((scan) => (
                          <Box
                            key={scan.id}
                            sx={{
                              p: 1.25,
                              px: 1.75,
                              borderRadius: 2,
                              bgcolor: scan.valid ? '#f0fdf4' : '#fef2f2',
                              border: scan.valid ? '1px solid #bbf7d0' : '1px solid #fecaca',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              {scan.valid ? (
                                <CheckCircleIcon sx={{ color: '#16a34a', fontSize: 18 }} />
                              ) : (
                                <ErrorIcon sx={{ color: '#dc2626', fontSize: 18 }} />
                              )}
                              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                #{scan.reference}
                              </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Chip
                                label={scan.code}
                                size="small"
                                sx={{
                                  fontSize: 10,
                                  fontWeight: 800,
                                  bgcolor: scan.valid ? '#dcfce7' : '#fee2e2',
                                  color: scan.valid ? '#15803d' : '#991b1b',
                                }}
                              />
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {scan.time}
                              </Typography>
                            </Box>
                          </Box>
                        ))}
                      </Box>
                    )}
                  </Box>
                </Card>
            </Box>

            {/* LIVE VERIFICATION FEEDBACK BANNER */}
            {scanFeedback && (
              <Card
                sx={{
                  borderRadius: 3,
                  p: 2.5,
                  bgcolor: scanFeedback.valid ? '#ecfdf5' : scanFeedback.code === 'ALREADY_USED' ? '#fffbeb' : '#fef2f2',
                  border: `2px solid ${scanFeedback.valid ? '#10b981' : scanFeedback.code === 'ALREADY_USED' ? '#f59e0b' : '#ef4444'}`,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                    {scanFeedback.valid ? (
                      <CheckCircleIcon sx={{ color: '#059669', fontSize: 32, mt: 0.25 }} />
                    ) : scanFeedback.code === 'ALREADY_USED' ? (
                      <WarningAmberIcon sx={{ color: '#d97706', fontSize: 32, mt: 0.25 }} />
                    ) : (
                      <ErrorIcon sx={{ color: '#dc2626', fontSize: 32, mt: 0.25 }} />
                    )}

                    <Box>
                      <Typography
                        variant="h6"
                        sx={{
                          fontWeight: 800,
                          color: scanFeedback.valid ? '#065f46' : scanFeedback.code === 'ALREADY_USED' ? '#92400e' : '#991b1b',
                        }}
                      >
                        {scanFeedback.valid
                          ? 'ADMISSION GRANTED — VALID TICKET'
                          : scanFeedback.code === 'ALREADY_USED'
                          ? 'ALREADY USED — ADMISSION DENIED'
                          : scanFeedback.code === 'WRONG_EVENT'
                          ? 'WRONG EVENT — MISMATCHED EVENT TICKET'
                          : scanFeedback.code === 'EVENT_COMPLETED'
                          ? 'EVENT COMPLETED — ENTRY CLOSED'
                          : scanFeedback.code === 'CHECK_IN_NOT_OPEN'
                          ? 'CHECK-IN NOT OPEN — DOOR CLOSED'
                          : scanFeedback.code === 'CANCELLED_TICKET'
                          ? 'CANCELLED TICKET — BOOKING CANCELLED'
                          : scanFeedback.code === 'EXPIRED_TICKET'
                          ? 'EXPIRED TICKET — TICKET EXPIRED'
                          : 'INVALID TICKET — VERIFICATION FAILED'}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#334155', mt: 0.5, fontWeight: 500 }}>
                        {scanFeedback.message}
                      </Typography>

                      {scanFeedback.valid && (
                        <Box sx={{ display: 'flex', gap: 3, mt: 1.5, flexWrap: 'wrap' }}>
                          <Typography variant="caption" sx={{ color: '#065f46', fontWeight: 600 }}>
                            Ticket: <strong>{scanFeedback.ticket_reference}</strong>
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#065f46', fontWeight: 600 }}>
                            Event: <strong>{scanFeedback.event_title}</strong>
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#065f46', fontWeight: 600 }}>
                            Attendee: <strong>{scanFeedback.attendee_name}</strong>
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#065f46', fontWeight: 600 }}>
                            Staff: <strong>{user?.email || 'Authorized Staff'}</strong>
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Box>

                  <Button
                    size="small"
                    onClick={() => setScanFeedback(null)}
                    sx={{ color: '#64748b', textTransform: 'none', fontWeight: 700 }}
                  >
                    Dismiss
                  </Button>
                </Box>
              </Card>
            )}

            {/* ATTENDEE ROSTER & AUDIT TABLE */}
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Box>
                  <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                    Attendee Roster & Entry Audit Ledger
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Real-time list of all confirmed ticket-holders with check-in timestamps and staff audit identities.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
                  <Button
                    variant="outlined"
                    startIcon={<FileDownloadIcon />}
                    onClick={handleExportCsv}
                    sx={{
                      borderRadius: 2.5,
                      textTransform: 'none',
                      fontWeight: 700,
                      borderColor: '#cbd5e1',
                      color: '#0f172a',
                      '&:hover': { bgcolor: '#f1f5f9', borderColor: '#94a3b8' },
                    }}
                  >
                    Export Roster (CSV)
                  </Button>
                </Box>
              </Box>

              {/* Filters & Search Toolbar */}
              <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label={`All (${attendees.length})`}
                    clickable
                    color={rosterFilter === 'ALL' ? 'primary' : 'default'}
                    onClick={() => setRosterFilter('ALL')}
                    sx={{ fontWeight: 700 }}
                  />
                  <Chip
                    label={`Checked In (${attendees.filter((a) => a.checked_in).length})`}
                    clickable
                    color={rosterFilter === 'CHECKED_IN' ? 'success' : 'default'}
                    onClick={() => setRosterFilter('CHECKED_IN')}
                    sx={{ fontWeight: 700 }}
                  />
                  <Chip
                    label={`Pending (${attendees.filter((a) => !a.checked_in).length})`}
                    clickable
                    color={rosterFilter === 'PENDING' ? 'warning' : 'default'}
                    onClick={() => setRosterFilter('PENDING')}
                    sx={{ fontWeight: 700 }}
                  />
                </Box>

                <TextField
                  size="small"
                  placeholder="Filter attendee by name, email, booking ref, or ticket ref..."
                  value={attendeeSearch}
                  onChange={(e) => setAttendeeSearch(e.target.value)}
                  sx={{ flexGrow: 1, minWidth: 260, bgcolor: '#ffffff' }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>

              {loadingAttendees ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
                  <Table>
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Booking / Ticket Ref</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Attendee Details</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Tickets & Total</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Email & QR</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Check-in Status</TableCell>
                        <TableCell sx={{ fontWeight: 700 }} align="right">Admit / Action</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {filteredAttendees.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
                            <Typography variant="body2" sx={{ color: '#64748b' }}>
                              No attendees match your search and filter criteria.
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredAttendees.map((att) => (
                          <TableRow key={att.booking_id} hover>
                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                                #{att.booking_reference}
                              </Typography>
                              {att.ticket_reference && (
                                <Typography variant="caption" sx={{ color: '#2563eb', fontWeight: 700, display: 'block' }}>
                                  {att.ticket_reference}
                                </Typography>
                              )}
                              <Typography variant="caption" sx={{ color: '#94a3b8' }}>
                                {new Date(att.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {att.user_name || 'Attendee'}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b' }}>
                                {att.user_email}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                {att.quantity} Ticket(s)
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 600 }}>
                                ₹{parseFloat(att.total_amount).toLocaleString('en-IN')} Paid
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                                <Chip
                                  icon={<EmailIcon sx={{ fontSize: '14px !important' }} />}
                                  label={att.email_sent ? 'Delivered' : 'Queued'}
                                  size="small"
                                  sx={{
                                    bgcolor: att.email_sent ? '#dcfce7' : '#fef3c7',
                                    color: att.email_sent ? '#15803d' : '#92400e',
                                    fontWeight: 700,
                                    fontSize: 11,
                                    width: 'fit-content',
                                  }}
                                />
                                <Button
                                  size="small"
                                  startIcon={<QrCode2Icon />}
                                  onClick={() => {
                                    setSelectedAttendee(att);
                                    setQrModalOpen(true);
                                  }}
                                  sx={{ textTransform: 'none', fontSize: 11, p: 0, justifyContent: 'flex-start' }}
                                >
                                  View QR Pass
                                </Button>
                              </Box>
                            </TableCell>

                            <TableCell>
                              {att.checked_in ? (
                                <Box>
                                  <Chip
                                    icon={<CheckCircleIcon sx={{ fontSize: '14px !important' }} />}
                                    label="Checked In"
                                    size="small"
                                    sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11 }}
                                  />
                                  {att.checked_in_at && (
                                    <Typography variant="caption" sx={{ color: '#64748b', display: 'block', mt: 0.5 }}>
                                      {new Date(att.checked_in_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                      {att.checked_in_by ? ` • ${att.checked_in_by}` : ''}
                                    </Typography>
                                  )}
                                </Box>
                              ) : (
                                <Chip
                                  icon={<PendingActionsIcon sx={{ fontSize: '14px !important' }} />}
                                  label="Pending Entry"
                                  size="small"
                                  sx={{ bgcolor: '#f1f5f9', color: '#475569', fontWeight: 700, fontSize: 11 }}
                                />
                              )}
                            </TableCell>

                            <TableCell align="right">
                              {!att.checked_in ? (
                                <Button
                                  size="small"
                                  variant="contained"
                                  startIcon={<HowToRegIcon sx={{ color: '#ffffff' }} />}
                                  disabled={checkingIn}
                                  onClick={() => handleCheckInAttendee(att.booking_id, att.booking_reference, att.ticket_reference)}
                                  sx={{
                                    bgcolor: '#059669',
                                    color: '#ffffff !important',
                                    borderRadius: 2,
                                    fontWeight: 700,
                                    textTransform: 'none',
                                    fontSize: 12,
                                    '&:hover': { bgcolor: '#047857', color: '#ffffff' },
                                  }}
                                >
                                  Admit
                                </Button>
                              ) : (
                                <Typography variant="caption" sx={{ color: '#059669', fontWeight: 700 }}>
                                  Verified ✓
                                </Typography>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </Card>
          </Box>
        )}

        {/* TAB 3: Financials & Email Dispatch Ledger */}
        {activeTab === 3 && (
          <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                Financials, Dispatched Emails & QR Ticket Ledger
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b' }}>
                Event-by-event summary of ticket revenues, payment collections, email confirmations sent, and entrance scans.
              </Typography>
            </Box>

            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2 }}>
              <Table>
                <TableHead sx={{ bgcolor: '#f8fafc' }}>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Tickets Sold</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Unit Price</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Gross Revenue (₹)</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Emails Dispatched</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>QR Codes Generated</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Attendance Scans</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {analytics?.events?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                        <Typography variant="body2" sx={{ color: '#64748b' }}>
                          No event sales activity recorded yet.
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    analytics?.events?.map((evt) => (
                      <TableRow key={evt.event_id} hover>
                        <TableCell>
                          <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                            {evt.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b' }}>
                            📍 {evt.venue}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 700 }}>
                            {evt.tickets_sold} / {evt.total_capacity}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            ₹{parseFloat(evt.base_price).toLocaleString('en-IN')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 800, color: '#16a34a' }}>
                            ₹{parseFloat(evt.gross_revenue).toLocaleString('en-IN')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<EmailIcon sx={{ fontSize: '13px !important' }} />}
                            label={`${evt.emails_sent} Sent`}
                            size="small"
                            sx={{ bgcolor: '#dcfce7', color: '#15803d', fontWeight: 700, fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<QrCode2Icon sx={{ fontSize: '13px !important' }} />}
                            label={`${evt.qrs_generated} Issued`}
                            size="small"
                            sx={{ bgcolor: '#e0e7ff', color: '#3730a3', fontWeight: 700, fontSize: 11 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={<HowToRegIcon sx={{ fontSize: '13px !important' }} />}
                            label={`${evt.checked_in_count} Checked In`}
                            size="small"
                            sx={{ bgcolor: '#f1f5f9', color: '#0f172a', fontWeight: 700, fontSize: 11 }}
                          />
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Card>
        )}

        {/* TAB 4: Priority Waiting List & Demand */}
        {activeTab === 4 && (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {/* Top Toolbar & Filter */}
            <Card sx={{ borderRadius: 3, border: '1px solid #e2e8f0', p: 3, boxShadow: '0 2px 6px rgba(0,0,0,0.03)' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3 }}>
                <Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                    <HourglassTopIcon sx={{ color: '#ea580c', fontSize: 24 }} />
                    <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                      Priority Waiting List & Ticket Demand
                    </Typography>
                  </Box>
                  <Typography variant="body2" sx={{ color: '#64748b' }}>
                    Real-time queue of patrons waiting for tickets. Enforcing strict limit of maximum 5 tickets per user/email.
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                  <TextField
                    select
                    size="small"
                    label="Filter by Event"
                    value={waitlistEventFilter}
                    onChange={(e) => {
                      const val = e.target.value;
                      setWaitlistEventFilter(val);
                      fetchWaitingList(val === 'ALL' ? null : val);
                    }}
                    sx={{ minWidth: 220, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                  >
                    <MenuItem value="ALL">All Hosted Events</MenuItem>
                    {hostedEvents.map((evt) => (
                      <MenuItem key={evt.id} value={evt.id}>
                        {evt.title} ({evt.available_capacity <= 0 ? 'SOLD OUT' : `${evt.available_capacity} left`})
                      </MenuItem>
                    ))}
                  </TextField>

                  <Button
                    variant="outlined"
                    size="small"
                    onClick={() => fetchWaitingList(waitlistEventFilter === 'ALL' ? null : waitlistEventFilter)}
                    disabled={loadingWaitingList}
                    startIcon={<RefreshIcon />}
                    sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
                  >
                    Refresh
                  </Button>
                </Box>
              </Box>

              {/* KPI Mini Cards */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' },
                  gap: 2,
                  mb: 2,
                }}
              >
                <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#fff7ed', border: '1px solid #fed7aa' }}>
                  <Typography variant="caption" sx={{ color: '#c2410c', fontWeight: 700, textTransform: 'uppercase' }}>
                    Total Queue Entries
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#9a3412', mt: 0.5 }}>
                    {waitingList.length}
                  </Typography>
                </Box>

                <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0' }}>
                  <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 700, textTransform: 'uppercase' }}>
                    Tickets in Demand
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#166534', mt: 0.5 }}>
                    {waitingList.reduce((acc, curr) => acc + (curr.quantity || 1), 0)}
                  </Typography>
                </Box>

                <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#eff6ff', border: '1px solid #bfdbfe' }}>
                  <Typography variant="caption" sx={{ color: '#1d4ed8', fontWeight: 700, textTransform: 'uppercase' }}>
                    Pending (WAITING)
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#1e40af', mt: 0.5 }}>
                    {waitingList.filter((i) => i.status === 'WAITING').length}
                  </Typography>
                </Box>

                <Box sx={{ p: 2, borderRadius: 2.5, bgcolor: '#faf5ff', border: '1px solid #e9d5ff' }}>
                  <Typography variant="caption" sx={{ color: '#7e22ce', fontWeight: 700, textTransform: 'uppercase' }}>
                    Notified / Converted
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#6b21a8', mt: 0.5 }}>
                    {waitingList.filter((i) => i.status !== 'WAITING').length}
                  </Typography>
                </Box>
              </Box>

              {/* Waiting List Table */}
              <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 2, mt: 2 }}>
                <Table>
                  <TableHead sx={{ bgcolor: '#f8fafc' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700 }}>Queue Pos & Date</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Patron Details</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Event</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tickets Desired</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Tier & Notes</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Actions & Allocation</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {loadingWaitingList ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                          <CircularProgress size={30} sx={{ color: '#ea580c' }} />
                        </TableCell>
                      </TableRow>
                    ) : waitingList.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                          <Box sx={{ textAlign: 'center', py: 2 }}>
                            <HourglassTopIcon sx={{ fontSize: 44, color: '#94a3b8', mb: 1 }} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#334155' }}>
                              No Waiting List Requests Yet
                            </Typography>
                            <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 450, mx: 'auto', mt: 0.5 }}>
                              When an event sells out, patrons will be able to join the priority waiting list from the event card. Their requests will appear right here.
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    ) : (
                      waitingList.map((item, idx) => {
                        const targetEvt = hostedEvents.find((e) => e.id === item.event_id);
                        return (
                          <TableRow key={item.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Box
                                  sx={{
                                    bgcolor: '#ea580c',
                                    color: '#ffffff',
                                    fontWeight: 800,
                                    fontSize: 12,
                                    width: 26,
                                    height: 26,
                                    borderRadius: '50%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                  }}
                                >
                                  {item.position || idx + 1}
                                </Box>
                                <Box>
                                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>
                                    #{item.id}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#64748b' }}>
                                    {item.created_at ? new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Recently'}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>

                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: '#0f172a' }}>
                                {item.customer_name || 'Guest User'}
                              </Typography>
                              <Typography variant="caption" sx={{ color: '#64748b', display: 'block' }}>
                                {item.customer_email || 'No email registered'}
                              </Typography>
                              <Chip
                                label="Policy: ≤ 5 Tickets"
                                size="small"
                                sx={{ height: 18, fontSize: 10, bgcolor: '#f1f5f9', color: '#475569', mt: 0.5, fontWeight: 700 }}
                              />
                            </TableCell>

                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                                {item.event_title || targetEvt?.title || `Event #${item.event_id}`}
                              </Typography>
                              <Typography variant="caption" sx={{ color: targetEvt?.available_capacity <= 0 ? '#dc2626' : '#16a34a', fontWeight: 700 }}>
                                {targetEvt ? (targetEvt.available_capacity <= 0 ? '🔴 Sold Out' : `🟢 ${targetEvt.available_capacity} left`) : ''}
                              </Typography>
                            </TableCell>

                            <TableCell>
                              <Chip
                                label={`${item.quantity} ${item.quantity === 1 ? 'Ticket' : 'Tickets'}`}
                                size="small"
                                sx={{ bgcolor: '#fff7ed', color: '#ea580c', border: '1px solid #fed7aa', fontWeight: 800 }}
                              />
                            </TableCell>

                            <TableCell>
                              <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', color: '#334155' }}>
                                {item.preferred_tier || 'General Admission'}
                              </Typography>
                              {item.notes && (
                                <Typography variant="caption" sx={{ color: '#64748b', fontStyle: 'italic', display: 'block', maxWidth: 200 }}>
                                  "{item.notes}"
                                </Typography>
                              )}
                            </TableCell>

                            <TableCell>
                              <Chip
                                label={item.status}
                                size="small"
                                sx={{
                                  fontWeight: 800,
                                  fontSize: 11,
                                  bgcolor:
                                    item.status === 'WAITING'
                                      ? '#fff7ed'
                                      : item.status === 'NOTIFIED'
                                      ? '#eff6ff'
                                      : item.status === 'CONVERTED'
                                      ? '#dcfce7'
                                      : '#fee2e2',
                                  color:
                                    item.status === 'WAITING'
                                      ? '#c2410c'
                                      : item.status === 'NOTIFIED'
                                      ? '#1d4ed8'
                                      : item.status === 'CONVERTED'
                                      ? '#15803d'
                                      : '#b91c1c',
                                  border:
                                    item.status === 'WAITING'
                                      ? '1px solid #fed7aa'
                                      : item.status === 'NOTIFIED'
                                      ? '1px solid #bfdbfe'
                                      : item.status === 'CONVERTED'
                                      ? '1px solid #bbf7d0'
                                      : '1px solid #fecaca',
                                }}
                              />
                            </TableCell>

                            <TableCell align="right">
                              <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                                {targetEvt && (
                                  <Tooltip title="Add extra seats to this event so tickets become available">
                                    <Button
                                      size="small"
                                      variant="outlined"
                                      startIcon={<EventSeatIcon fontSize="small" />}
                                      onClick={() => handleOpenAddSeats(targetEvt)}
                                      sx={{ textTransform: 'none', borderRadius: 2, fontWeight: 700 }}
                                    >
                                      + Seats
                                    </Button>
                                  </Tooltip>
                                )}

                                {item.status === 'WAITING' && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    disabled={updatingWaitlistId === item.id}
                                    onClick={() => handleUpdateWaitlistStatus(item, 'NOTIFIED')}
                                    sx={{ bgcolor: '#2563eb', color: '#ffffff !important', textTransform: 'none', borderRadius: 2, fontWeight: 700, fontSize: 12, '&:hover': { bgcolor: '#1d4ed8', color: '#ffffff' } }}
                                  >
                                    Notify
                                  </Button>
                                )}

                                {item.status === 'NOTIFIED' && (
                                  <Button
                                    size="small"
                                    variant="contained"
                                    disabled={updatingWaitlistId === item.id}
                                    onClick={() => handleUpdateWaitlistStatus(item, 'CONVERTED')}
                                    sx={{ bgcolor: '#16a34a', color: '#ffffff !important', textTransform: 'none', borderRadius: 2, fontWeight: 700, fontSize: 12, '&:hover': { bgcolor: '#15803d', color: '#ffffff' } }}
                                  >
                                    Convert
                                  </Button>
                                )}

                                {item.status !== 'CANCELLED' && item.status !== 'CONVERTED' && (
                                  <IconButton
                                    size="small"
                                    disabled={updatingWaitlistId === item.id}
                                    onClick={() => handleUpdateWaitlistStatus(item, 'CANCELLED')}
                                    sx={{ color: '#94a3b8', '&:hover': { color: '#ef4444' } }}
                                  >
                                    <CloseIcon fontSize="small" />
                                  </IconButton>
                                )}
                              </Box>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Card>
          </Box>
        )}
      </Container>

      {/* DIALOG 2: Edit Event */}
      <Dialog open={editModalOpen} onClose={() => setEditModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, pb: 1.5, borderBottom: '1px solid #e2e8f0' }}>
          Edit Event Details & Attributes
        </DialogTitle>
        <Box component="form" onSubmit={handleUpdateEvent}>
          <DialogContent sx={{ pt: 2.5 }}>
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(12, 1fr)' },
                gap: 2.5,
              }}
            >
              {/* Event Title */}
              <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 8' } }}>
                <TextField
                  fullWidth
                  label="Event Title"
                  required
                  value={editForm.title}
                  onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                />
              </Box>

              {/* Category */}
              <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 4' } }}>
                <TextField
                  fullWidth
                  select
                  label="Event Category"
                  required
                  value={editForm.category_id}
                  onChange={(e) => setEditForm({ ...editForm, category_id: e.target.value })}
                >
                  {categories.map((c) => (
                    <MenuItem key={c.id} value={c.id}>
                      {c.name}
                    </MenuItem>
                  ))}
                </TextField>
              </Box>

              {/* Venue Name */}
              <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6' } }}>
                <TextField
                  fullWidth
                  label="Venue / Arena Name"
                  required
                  value={editForm.venue_name}
                  onChange={(e) => setEditForm({ ...editForm, venue_name: e.target.value })}
                />
              </Box>

              {/* Venue Address */}
              <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6' } }}>
                <TextField
                  fullWidth
                  label="Venue Address / City"
                  value={editForm.venue_address}
                  onChange={(e) => setEditForm({ ...editForm, venue_address: e.target.value })}
                />
              </Box>

              {/* Start Date & Time */}
              <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6' } }}>
                <TextField
                  fullWidth
                  label="Start Date & Time"
                  type="datetime-local"
                  required
                  InputLabelProps={{ shrink: true }}
                  value={editForm.start_time}
                  onChange={(e) => setEditForm({ ...editForm, start_time: e.target.value })}
                />
              </Box>

              {/* End Date & Time */}
              <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6' } }}>
                <TextField
                  fullWidth
                  label="End Date & Time"
                  type="datetime-local"
                  required
                  InputLabelProps={{ shrink: true }}
                  value={editForm.end_time}
                  onChange={(e) => setEditForm({ ...editForm, end_time: e.target.value })}
                />
              </Box>

              {/* Total Capacity */}
              <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6' } }}>
                <TextField
                  fullWidth
                  type="number"
                  label="Total Capacity (Tickets)"
                  required
                  value={editForm.total_capacity}
                  onChange={(e) => setEditForm({ ...editForm, total_capacity: e.target.value })}
                />
              </Box>

              {/* Ticket Price */}
              <Box sx={{ gridColumn: { xs: '1 / -1', sm: 'span 6' } }}>
                <TextField
                  fullWidth
                  type="number"
                  step="0.01"
                  label="Base Price (₹ INR)"
                  required
                  value={editForm.ticket_price}
                  onChange={(e) => setEditForm({ ...editForm, ticket_price: e.target.value })}
                />
              </Box>

              {/* Event Description */}
              <Box sx={{ gridColumn: '1 / -1' }}>
                <TextField
                  fullWidth
                  label="Event Highlights & Narrative"
                  multiline
                  rows={3}
                  value={editForm.description}
                  onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                />
              </Box>
            </Box>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5, borderTop: '1px solid #f1f5f9' }}>
            <Button onClick={() => setEditModalOpen(false)} sx={{ color: '#64748b', fontWeight: 600 }}>Cancel</Button>
            <Button type="submit" variant="contained" sx={{ bgcolor: '#0f172a', color: '#ffffff !important', fontWeight: 700, px: 3, borderRadius: 2, '&:hover': { bgcolor: '#1e293b', color: '#ffffff' } }}>
              Save Changes
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* DIALOG 3: Add Seats Modal */}
      <Dialog open={addSeatsModalOpen} onClose={() => setAddSeatsModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, pb: 1 }}>
          Add Extra Seats to Event
        </DialogTitle>
        <Box component="form" onSubmit={handleAddSeatsSubmit}>
          <DialogContent sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
              Adding extra capacity for <strong>{seatTargetEvent?.title}</strong>. This updates inventory and makes more tickets available for purchase immediately.
            </Alert>
            <TextField
              fullWidth
              type="number"
              label="Additional Seats Quantity"
              margin="dense"
              required
              inputProps={{ min: 1, max: 10000 }}
              value={addSeatsForm.additional_seats}
              onChange={(e) => setAddSeatsForm({ ...addSeatsForm, additional_seats: e.target.value })}
            />
            <TextField
              select
              fullWidth
              label="Seating Tier"
              margin="dense"
              value={addSeatsForm.tier_name}
              onChange={(e) => setAddSeatsForm({ ...addSeatsForm, tier_name: e.target.value })}
            >
              <MenuItem value="VIP Balcony">VIP Balcony</MenuItem>
              <MenuItem value="Front Row Premium">Front Row Premium</MenuItem>
              <MenuItem value="General Admission Additional">General Admission Additional</MenuItem>
              <MenuItem value="Early Bird Overflow">Early Bird Overflow</MenuItem>
              <MenuItem value="Executive Lounge">Executive Lounge</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Internal Notes"
              margin="dense"
              value={addSeatsForm.notes}
              onChange={(e) => setAddSeatsForm({ ...addSeatsForm, notes: e.target.value })}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2.5 }}>
            <Button onClick={() => setAddSeatsModalOpen(false)}>Cancel</Button>
            <Button
              type="submit"
              variant="contained"
              disabled={submittingSeats}
              sx={{ bgcolor: '#0f172a', color: '#ffffff !important', fontWeight: 700, '&:hover': { bgcolor: '#1e293b', color: '#ffffff' } }}
            >
              {submittingSeats ? <CircularProgress size={20} color="inherit" /> : 'Confirm & Add Seats'}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>

      {/* DIALOG 4: QR Code Preview & Instant Door Check-In */}
      <Dialog open={qrModalOpen} onClose={() => setQrModalOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 800, textAlign: 'center', pb: 1 }}>
          Live e-Ticket & QR Verification
        </DialogTitle>
        <DialogContent sx={{ textAlign: 'center', pt: 1 }}>
          {selectedAttendee && (
            <Box>
              <Box
                component="img"
                src={selectedAttendee.qr_code_url || `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(selectedAttendee.booking_reference)}`}
                alt="Ticket QR Code"
                sx={{
                  width: 200,
                  height: 200,
                  mx: 'auto',
                  p: 1.5,
                  bgcolor: '#ffffff',
                  border: '1.5px solid #e2e8f0',
                  borderRadius: 3,
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  display: 'block',
                  objectFit: 'contain',
                  mb: 2,
                }}
              />
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a' }}>
                #{selectedAttendee.booking_reference}
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mb: 1 }}>
                Attendee: <strong>{selectedAttendee.user_name}</strong> ({selectedAttendee.user_email})
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 600, color: '#16a34a', mb: 2 }}>
                {selectedAttendee.quantity} Ticket(s) • ₹{parseFloat(selectedAttendee.total_amount).toLocaleString('en-IN')} Paid
              </Typography>

              {selectedAttendee.checked_in ? (
                <Alert severity="success" sx={{ borderRadius: 2, justifyContent: 'center' }}>
                  ✓ Attendee already checked in
                </Alert>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  startIcon={<HowToRegIcon sx={{ color: '#ffffff' }} />}
                  disabled={checkingIn}
                  onClick={() => handleCheckInAttendee(selectedAttendee.booking_id, selectedAttendee.booking_reference)}
                  sx={{
                    bgcolor: '#059669',
                    color: '#ffffff !important',
                    fontWeight: 700,
                    py: 1.25,
                    borderRadius: 2,
                    '&:hover': { bgcolor: '#047857', color: '#ffffff' },
                  }}
                >
                  Verify & Check-In Attendee Now
                </Button>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 2.5 }}>
          <Button onClick={() => setQrModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};
