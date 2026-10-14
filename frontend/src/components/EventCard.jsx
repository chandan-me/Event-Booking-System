import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  LinearProgress,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import { useNavigate } from 'react-router-dom';

export const EventCard = ({ event, onBook }) => {
  const navigate = useNavigate();

  const totalCap = event.total_capacity || 100;
  const availCap = event.available_capacity || 0;
  const percentLeft = Math.round((availCap / totalCap) * 100);
  const isSoldOut = availCap <= 0;

  const dateValue = event.start_at || event.start_time;
  const formattedDate = dateValue
    ? new Date(dateValue).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Date TBA';

  const ticketPrice = parseFloat(event.price || event.ticket_price || 0);
  const venueDisplay = event.venue_name || event.venue || 'Venue TBA';

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: 4,
        boxShadow: '0 2px 12px -2px rgba(15, 23, 42, 0.04)',
        transition: 'all 0.25s ease-in-out',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: '#cbd5e1',
          boxShadow: '0 16px 24px -6px rgba(15, 23, 42, 0.08)',
        },
      }}
    >
      {/* Top Accent Bar */}
      <Box
        sx={{
          height: 5,
          background: isSoldOut
            ? 'linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)'
            : 'linear-gradient(90deg, #0f172a 0%, #334155 100%)',
        }}
      />

      <CardContent sx={{ p: 3, flexGrow: 1 }}>
        {/* Category & Status */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Chip
            label={event.category?.name || 'General'}
            size="small"
            sx={{
              bgcolor: '#f1f5f9',
              color: '#334155',
              fontWeight: 700,
              fontSize: 12,
              border: '1px solid #e2e8f0',
            }}
          />
          {isSoldOut ? (
            <Chip label="SOLD OUT" size="small" color="error" sx={{ fontWeight: 700 }} />
          ) : percentLeft < 20 ? (
            <Chip label="ALMOST FULL" size="small" color="warning" sx={{ fontWeight: 700 }} />
          ) : (
            <Chip
              label={`${availCap} seats left`}
              size="small"
              sx={{ bgcolor: '#f0fdf4', color: '#166534', border: '1px solid #bbf7d0', fontWeight: 600, fontSize: 11 }}
            />
          )}
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: '#0f172a',
            mb: 1.5,
            cursor: 'pointer',
            lineHeight: 1.35,
            fontSize: '1.1rem',
            '&:hover': { color: '#2563eb' },
          }}
          onClick={() => navigate(`/events/${event.id}`)}
        >
          {event.title}
        </Typography>

        {/* Metadata info */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2.5, color: '#64748b', fontSize: 13 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventIcon sx={{ fontSize: 16, color: '#64748b' }} />
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#334155' }}>
              {formattedDate}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PlaceIcon sx={{ fontSize: 16, color: '#64748b' }} />
            <Typography variant="caption" sx={{ color: '#64748b' }}>
              {venueDisplay}
            </Typography>
          </Box>
        </Box>

        {/* Capacity Progress Bar */}
        <Box sx={{ mt: 'auto', pt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: 11, fontWeight: 500 }}>
              Live Capacity
            </Typography>
            <Typography variant="caption" sx={{ color: '#334155', fontWeight: 700, fontSize: 11 }}>
              {availCap} / {totalCap}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, 100 - percentLeft))}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: '#f1f5f9',
              '& .MuiLinearProgress-bar': {
                bgcolor: isSoldOut ? '#ef4444' : percentLeft < 20 ? '#f59e0b' : '#0f172a',
                borderRadius: 3,
              },
            }}
          />
        </Box>
      </CardContent>

      {/* Card Actions Bottom */}
      <Box
        sx={{
          p: 3,
          pt: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #f1f5f9',
          bgcolor: '#fafafa',
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: '#64748b', display: 'block', fontWeight: 500 }}>
            Price
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', color: '#0f172a' }}>
            <CurrencyRupeeIcon sx={{ fontSize: 18, mr: 0.2 }} />
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
              {ticketPrice.toLocaleString('en-IN')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="contained"
            color="primary"
            disabled={isSoldOut}
            onClick={() => onBook(event)}
            startIcon={<ConfirmationNumberIcon fontSize="small" />}
            sx={{
              backgroundColor: '#f5f5f5',
              color: '#0f172a',
              border: '1px solid #e2e8f0',
              fontWeight: 700,
              '&:hover': {
                backgroundColor: '#e5e5e5',
                borderColor: '#cbd5e1',
              },
            }}
          >
            {isSoldOut ? 'Sold Out' : 'Book'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate(`/events/${event.id}`)}
            sx={{
              minWidth: 36,
              px: 1,
              borderColor: '#e2e8f0',
              color: '#0f172a',
              backgroundColor: '#ffffff',
              '&:hover': {
                borderColor: '#cbd5e1',
                backgroundColor: '#f8fafc',
              },
            }}
          >
            <ArrowForwardIcon fontSize="small" />
          </Button>
        </Box>
      </Box>
    </Card>
  );
};
