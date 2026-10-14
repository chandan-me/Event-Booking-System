import React from 'react';
import { Container, Box, Typography, Button } from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import { useNavigate } from 'react-router-dom';

export const NotFoundPage = () => {
  const navigate = useNavigate();

  return (
    <Container maxWidth="sm" sx={{ py: 16, textAlign: 'center' }}>
      <Box
        sx={{
          width: 64,
          height: 64,
          borderRadius: 4,
          bgcolor: 'rgba(99, 102, 241, 0.15)',
          color: '#818cf8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          mx: 'auto',
          mb: 3,
        }}
      >
        <ConfirmationNumberIcon sx={{ fontSize: 32 }} />
      </Box>
      <Typography variant="h2" sx={{ fontWeight: 800, mb: 1 }}>
        404
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700, mb: 2 }}>
        Page Not Found
      </Typography>
      <Typography variant="body1" sx={{ color: 'text.secondary', mb: 4 }}>
        The live event, route, or ticket access you're looking for does not exist or has been relocated.
      </Typography>
      <Button variant="contained" color="primary" onClick={() => navigate('/')}>
        Return Home
      </Button>
    </Container>
  );
};
