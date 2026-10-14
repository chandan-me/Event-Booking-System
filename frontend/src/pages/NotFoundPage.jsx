import React from 'react';
import { Container, Box, Typography, Button } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: '#ffffff', minHeight: '80vh', display: 'flex', alignItems: 'center' }}>
      <Container maxWidth="sm" sx={{ py: 12, textAlign: 'center' }}>
        <Box
          sx={{
            width: 68,
            height: 68,
            borderRadius: 4,
            bgcolor: '#f1f5f9',
            color: '#0f172a',
            border: '1px solid #e2e8f0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 3,
          }}
        >
          <ConfirmationNumberIcon sx={{ fontSize: 34 }} />
        </Box>
        <Typography variant="h2" sx={{ fontWeight: 800, mb: 1, color: '#0f172a' }}>
          404
        </Typography>
        <Typography variant="h5" sx={{ fontWeight: 700, mb: 2, color: '#0f172a' }}>
          Page Not Found
        </Typography>
        <Typography variant="body1" sx={{ color: '#64748b', mb: 4 }}>
          The live event, route, or ticket access you're looking for does not exist or has been relocated.
        </Typography>
        <Button
          variant="contained"
          onClick={() => navigate('/')}
          sx={{
            bgcolor: '#f5f5f5',
            color: '#0f172a',
            border: '1px solid #cbd5e1',
            fontWeight: 700,
            px: 3,
            '&:hover': { bgcolor: '#e5e5e5' },
          }}
        >
          Return Home
        </Button>
      </Container>
    </Box>
  );
};
