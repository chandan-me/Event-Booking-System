import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  Button,
  LinearProgress,
  IconButton,
} from '@mui/material';
import EventIcon from '@mui/icons-material/Event';
import PlaceIcon from '@mui/icons-material/Place';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import { useNavigate } from 'react-router-dom';

const getCategoryTheme = (slug, name) => {
  const normalized = (slug || name || '').toLowerCase();
  if (normalized.includes('music') || normalized.includes('concert') || normalized.includes('symphony') || normalized.includes('dj')) {
    return {
      gradient: 'linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #818cf8 100%)',
      badgeBg: 'rgba(255, 255, 255, 0.92)',
      badgeColor: '#3730a3',
      icon: '🎵',
      cleanName: 'Music & Concerts',
    };
  }
  if (normalized.includes('tech') || normalized.includes('ai') || normalized.includes('cloud') || normalized.includes('code')) {
    return {
      gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #38bdf8 100%)',
      badgeBg: 'rgba(255, 255, 255, 0.92)',
      badgeColor: '#0369a1',
      icon: '💻',
      cleanName: 'Tech & Conferences',
    };
  }
  if (normalized.includes('comedy') || normalized.includes('theatre') || normalized.includes('musical') || normalized.includes('standup')) {
    return {
      gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #f59e0b 100%)',
      badgeBg: 'rgba(255, 255, 255, 0.92)',
      badgeColor: '#92400e',
      icon: '🎭',
      cleanName: 'Comedy & Theatre',
    };
  }
  if (normalized.includes('art') || normalized.includes('culture') || normalized.includes('sculpture') || normalized.includes('museum')) {
    return {
      gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #34d399 100%)',
      badgeBg: 'rgba(255, 255, 255, 0.92)',
      badgeColor: '#047857',
      icon: '🎨',
      cleanName: 'Arts & Culture',
    };
  }
  if (normalized.includes('sport') || normalized.includes('marathon') || normalized.includes('fitness') || normalized.includes('esport')) {
    return {
      gradient: 'linear-gradient(135deg, #991b1b 0%, #ea580c 50%, #fb923c 100%)',
      badgeBg: 'rgba(255, 255, 255, 0.92)',
      badgeColor: '#c2410c',
      icon: '🏃',
      cleanName: 'Sports & Fitness',
    };
  }
  if (normalized.includes('food') || normalized.includes('wine') || normalized.includes('nightlife') || normalized.includes('beer')) {
    return {
      gradient: 'linear-gradient(135deg, #831843 0%, #db2777 50%, #f472b6 100%)',
      badgeBg: 'rgba(255, 255, 255, 0.92)',
      badgeColor: '#be185d',
      icon: '🍷',
      cleanName: 'Food & Nightlife',
    };
  }
  return {
    gradient: 'linear-gradient(135deg, #334155 0%, #475569 50%, #94a3b8 100%)',
    badgeBg: 'rgba(255, 255, 255, 0.92)',
    badgeColor: '#334155',
    icon: '✨',
    cleanName: name || 'Live Experience',
  };
};

export const EventCard = ({ event, onBook }) => {
  const navigate = useNavigate();

  const totalCap = event.total_capacity || 100;
  const availCap = event.available_capacity !== undefined ? event.available_capacity : 0;
  const percentLeft = totalCap > 0 ? Math.round((availCap / totalCap) * 100) : 0;
  const isSoldOut = availCap <= 0;

  const dateValue = event.start_at || event.start_time;
  const formattedDate = dateValue
    ? new Date(dateValue).toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Date TBA';

  const ticketPrice = parseFloat(event.price || event.ticket_price || 0);
  const venueDisplay = event.venue_name || event.venue || 'Venue TBA';
  const categoryName = event.category_name || event.category?.name || 'General';
  const theme = getCategoryTheme(event.slug, categoryName);

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 3.5,
        border: '1px solid #e2e8f0',
        backgroundColor: '#ffffff',
        boxShadow: '0 2px 8px rgba(15, 23, 42, 0.04)',
        overflow: 'hidden',
        transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
        '&:hover': {
          transform: 'translateY(-4px)',
          borderColor: '#cbd5e1',
          boxShadow: '0 16px 32px -4px rgba(15, 23, 42, 0.09)',
        },
      }}
    >
      {/* 1. Curated Visual Header Banner */}
      <Box
        sx={{
          height: 120,
          background: theme.gradient,
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          p: 2,
          overflow: 'hidden',
        }}
      >
        {/* Subtle decorative glow */}
        <Box
          sx={{
            position: 'absolute',
            top: -20,
            right: -20,
            width: 100,
            height: 100,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(255,255,255,0.25) 0%, rgba(255,255,255,0) 70%)',
            pointerEvents: 'none',
          }}
        />

        {/* Top Header Tags */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
          <Chip
            size="small"
            label={`${theme.icon} ${theme.cleanName}`}
            sx={{
              height: 24,
              fontSize: 11,
              fontWeight: 700,
              bgcolor: theme.badgeBg,
              color: theme.badgeColor,
              backdropFilter: 'blur(8px)',
              boxShadow: '0 2px 6px rgba(0,0,0,0.1)',
            }}
          />
          {isSoldOut ? (
            <Chip
              size="small"
              label="SOLD OUT"
              sx={{
                height: 24,
                fontSize: 10,
                fontWeight: 800,
                bgcolor: '#ef4444',
                color: '#ffffff',
              }}
            />
          ) : (
            <Chip
              size="small"
              label={`${availCap.toLocaleString('en-IN')} seats`}
              sx={{
                height: 24,
                fontSize: 11,
                fontWeight: 700,
                bgcolor: 'rgba(255, 255, 255, 0.95)',
                color: '#0f172a',
                backdropFilter: 'blur(8px)',
              }}
            />
          )}
        </Box>

        {/* Bottom Banner City / Price Tag */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', zIndex: 1 }}>
          <Typography
            variant="caption"
            sx={{
              color: 'rgba(255, 255, 255, 0.95)',
              fontWeight: 600,
              fontSize: 12,
              letterSpacing: '0.02em',
              textShadow: '0 1px 2px rgba(0,0,0,0.2)',
            }}
          >
            {venueDisplay.split(',')[0]}
          </Typography>
          <Typography
            variant="subtitle2"
            sx={{
              color: '#ffffff',
              fontWeight: 800,
              fontSize: 14,
              textShadow: '0 1px 3px rgba(0,0,0,0.3)',
            }}
          >
            ₹{ticketPrice.toLocaleString('en-IN')}
          </Typography>
        </Box>
      </Box>

      {/* 2. Structured Body Content */}
      <CardContent sx={{ p: 2.5, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        {/* Title Clamped to 2 lines for uniform card height */}
        <Typography
          variant="h6"
          onClick={() => navigate(`/events/${event.id}`)}
          sx={{
            fontWeight: 700,
            color: '#0f172a',
            fontSize: '1.05rem',
            lineHeight: 1.35,
            height: '2.8rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            cursor: 'pointer',
            mb: 1.5,
            '&:hover': { color: '#2563eb' },
          }}
        >
          {event.title}
        </Typography>

        {/* Date & Venue Metadata */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.75, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventIcon sx={{ fontSize: 16, color: '#64748b', flexShrink: 0 }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: '#334155',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {formattedDate}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PlaceIcon sx={{ fontSize: 16, color: '#64748b', flexShrink: 0 }} />
            <Typography
              variant="caption"
              sx={{
                color: '#64748b',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {venueDisplay}
            </Typography>
          </Box>
        </Box>

        {/* Short Description Clamped */}
        <Typography
          variant="body2"
          sx={{
            color: '#64748b',
            fontSize: 12.5,
            lineHeight: 1.45,
            height: '2.6rem',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 2,
          }}
        >
          {event.description || 'Join us for this premier live event featuring top performers, speakers, and audiences.'}
        </Typography>

        {/* Capacity Bar */}
        <Box sx={{ mt: 'auto', pt: 1 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5, fontSize: 11 }}>
            <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 500 }}>
              Live Availability
            </Typography>
            <Typography variant="caption" sx={{ color: '#0f172a', fontWeight: 700 }}>
              {isSoldOut ? 'Sold Out' : `${percentLeft}% Available`}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, percentLeft))}
            sx={{
              height: 5,
              borderRadius: 3,
              bgcolor: '#f1f5f9',
              '& .MuiLinearProgress-bar': {
                bgcolor: isSoldOut ? '#ef4444' : percentLeft < 25 ? '#f59e0b' : '#059669',
                borderRadius: 3,
              },
            }}
          />
        </Box>
      </CardContent>

      {/* 3. Action Row Aligned to Card Bottom */}
      <Box
        sx={{
          mt: 'auto',
          px: 2.5,
          py: 1.75,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid #f1f5f9',
          bgcolor: '#fafafa',
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: '#64748b', fontSize: 11, display: 'block', fontWeight: 500 }}>
            Ticket Price
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', color: '#0f172a' }}>
            <CurrencyRupeeIcon sx={{ fontSize: 17, mr: 0.1 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#0f172a', lineHeight: 1.1 }}>
              {ticketPrice.toLocaleString('en-IN')}
            </Typography>
          </Box>
        </Box>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Button
            size="small"
            variant="contained"
            disabled={isSoldOut}
            onClick={() => onBook(event)}
            startIcon={<ConfirmationNumberIcon sx={{ fontSize: '15px !important' }} />}
            sx={{
              px: 2,
              py: 0.75,
              fontSize: 12.5,
              fontWeight: 700,
              backgroundColor: '#f5f5f5',
              color: '#0f172a',
              border: '1px solid #cbd5e1',
              borderRadius: 2,
              textTransform: 'none',
              boxShadow: 'none',
              '&:hover': {
                backgroundColor: '#e5e5e5',
                borderColor: '#94a3b8',
                boxShadow: 'none',
              },
            }}
          >
            {isSoldOut ? 'Sold Out' : 'Book Ticket'}
          </Button>

          <IconButton
            size="small"
            onClick={() => navigate(`/events/${event.id}`)}
            sx={{
              bgcolor: '#ffffff',
              border: '1px solid #e2e8f0',
              borderRadius: 2,
              width: 32,
              height: 32,
              color: '#0f172a',
              '&:hover': {
                bgcolor: '#f1f5f9',
                borderColor: '#cbd5e1',
              },
            }}
          >
            <ArrowForwardIcon sx={{ fontSize: 15 }} />
          </IconButton>
        </Box>
      </Box>
    </Card>
  );
};
