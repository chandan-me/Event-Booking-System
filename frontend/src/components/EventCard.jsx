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
import { useNavigate } from 'react-router-dom';

export const EventCard = ({ event, onBook }) => {
  const navigate = useNavigate();

  const totalCap = event.total_capacity || 100;
  const availCap = event.available_capacity || 0;
  const percentLeft = Math.round((availCap / totalCap) * 100);
  const isSoldOut = availCap <= 0;

  const formattedDate = new Date(event.start_time).toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <Card
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top Gradient Accent Bar */}
      <Box
        sx={{
          height: 6,
          background: isSoldOut
            ? 'linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)'
            : 'linear-gradient(90deg, #6366f1 0%, #a855f7 100%)',
        }}
      />

      <CardContent sx={{ p: 3, flexGrow: 1 }}>
        {/* Category & Status */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Chip
            label={event.category?.name || 'General'}
            size="small"
            sx={{
              bgcolor: 'rgba(99, 102, 241, 0.15)',
              color: '#818cf8',
              fontWeight: 700,
              fontSize: 12,
            }}
          />
          {isSoldOut ? (
            <Chip label="SOLD OUT" size="small" color="error" sx={{ fontWeight: 700 }} />
          ) : percentLeft < 20 ? (
            <Chip label="ALMOST FULL" size="small" color="warning" sx={{ fontWeight: 700 }} />
          ) : null}
        </Box>

        {/* Title */}
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            mb: 1.5,
            cursor: 'pointer',
            lineHeight: 1.3,
            '&:hover': { color: '#818cf8' },
          }}
          onClick={() => navigate(`/events/${event.id}`)}
        >
          {event.title}
        </Typography>

        {/* Metadata info */}
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2.5, color: 'text.secondary', fontSize: 13 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EventIcon sx={{ fontSize: 16, color: '#818cf8' }} />
            <Typography variant="caption" sx={{ fontWeight: 500, color: 'text.primary' }}>
              {formattedDate}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PlaceIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {event.venue}
            </Typography>
          </Box>
        </Box>

        {/* Description */}
        <Typography
          variant="body2"
          sx={{
            color: 'text.secondary',
            mb: 3,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            lineHeight: 1.6,
          }}
        >
          {event.description || 'Join us for this premier live experience.'}
        </Typography>

        {/* Capacity Progress */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Availability
            </Typography>
            <Typography variant="caption" sx={{ fontWeight: 600, color: isSoldOut ? 'error.main' : 'text.primary' }}>
              {availCap} / {totalCap} seats
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={percentLeft}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              '& .MuiLinearProgress-bar': {
                bgcolor: isSoldOut ? '#ef4444' : percentLeft < 20 ? '#f59e0b' : '#10b981',
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
          pt: 0,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.04)',
        }}
      >
        <Box>
          <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
            From
          </Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, color: '#fbbf24', lineHeight: 1 }}>
            ${parseFloat(event.ticket_price || 0).toFixed(2)}
          </Typography>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            size="small"
            variant="contained"
            color="primary"
            disabled={isSoldOut}
            onClick={() => onBook(event)}
            startIcon={<ConfirmationNumberIcon fontSize="small" />}
          >
            {isSoldOut ? 'Sold Out' : 'Book'}
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={() => navigate(`/events/${event.id}`)}
            sx={{ minWidth: 36, px: 1, borderColor: 'rgba(255, 255, 255, 0.15)' }}
          >
            <ArrowForwardIcon fontSize="small" />
          </Button>
        </Box>
      </Box>
    </Card>
  );
};
