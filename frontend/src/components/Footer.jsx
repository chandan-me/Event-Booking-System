import React from 'react';
import { Box, Container, Typography, Chip, Stack } from '@mui/material';
import CloudDoneIcon from '@mui/icons-material/CloudDone';

export const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        mt: 'auto',
        backgroundColor: '#070a12',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: { xs: 'column', md: 'row' },
            justifyContent: 'space-between',
            alignItems: { xs: 'flex-start', md: 'center' },
            gap: 3,
          }}
        >
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: '#f3f4f6' }}>
              EventPass Microservices Platform
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Powered by Python 3.12, FastAPI, MySQL 8.0, RabbitMQ, and React Vite.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
            <Chip
              icon={<CloudDoneIcon sx={{ fontSize: 16 }} />}
              label="API Gateway :8000"
              size="small"
              sx={{ bgcolor: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: 600 }}
            />
            <Chip
              label="RabbitMQ SAGA Queue"
              size="small"
              sx={{ bgcolor: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', fontWeight: 600 }}
            />
            <Chip
              label="MySQL 4 Logical DBs"
              size="small"
              sx={{ bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#34d399', fontWeight: 600 }}
            />
          </Stack>
        </Box>

        <Box sx={{ mt: 4, pt: 3, borderTop: '1px solid rgba(255, 255, 255, 0.04)', textAlign: 'center' }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            © {new Date().getFullYear()} EventPass Inc. All rights reserved. Built with professional microservices architecture.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
