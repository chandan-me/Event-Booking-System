import React from 'react';
import { Box, Container, Typography, Chip, Stack } from '@mui/material';
import CloudDoneIcon from '@mui/icons-material/CloudDone';
import SecurityIcon from '@mui/icons-material/Security';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';

export const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 6,
        mt: 'auto',
        backgroundColor: '#ffffff',
        borderTop: '1px solid #e2e8f0',
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
                EventPass Platform
              </Typography>
              <Chip
                icon={<CurrencyRupeeIcon sx={{ fontSize: '12px !important', color: '#059669 !important' }} />}
                label="INR Enabled"
                size="small"
                sx={{
                  bgcolor: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  fontWeight: 700,
                  height: 20,
                  fontSize: 10,
                }}
              />
            </Box>
            <Typography variant="body2" sx={{ color: '#64748b', maxWidth: 480 }}>
              Enterprise distributed ticketing system with atomic inventory locks, SAGA compensation, and instant OTP verification.
            </Typography>
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ alignItems: 'center' }}>
            <Chip
              icon={<CloudDoneIcon sx={{ fontSize: 15, color: '#2563eb' }} />}
              label="API Gateway :8000"
              size="small"
              sx={{ bgcolor: '#eff6ff', color: '#1e40af', border: '1px solid #bfdbfe', fontWeight: 600 }}
            />
            <Chip
              label="RabbitMQ SAGA"
              size="small"
              sx={{ bgcolor: '#fffbeb', color: '#b45309', border: '1px solid #fde68a', fontWeight: 600 }}
            />
            <Chip
              label="MySQL 8.0 Multi-DB"
              size="small"
              sx={{ bgcolor: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0', fontWeight: 600 }}
            />
            <Chip
              icon={<SecurityIcon sx={{ fontSize: 14, color: '#475569' }} />}
              label="Argon2id Secure"
              size="small"
              sx={{ bgcolor: '#f8fafc', color: '#334155', border: '1px solid #e2e8f0', fontWeight: 600 }}
            />
          </Stack>
        </Box>

        <Box sx={{ mt: 5, pt: 3, borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
          <Typography variant="caption" sx={{ color: '#94a3b8' }}>
            © {new Date().getFullYear()} EventPass Technologies. Built with Python 3.12, FastAPI, React 19 & MySQL.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <Typography variant="caption" sx={{ color: '#64748b', cursor: 'pointer', '&:hover': { color: '#0f172a' } }}>
              API Documentation
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', cursor: 'pointer', '&:hover': { color: '#0f172a' } }}>
              Architecture Guide
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748b', cursor: 'pointer', '&:hover': { color: '#0f172a' } }}>
              System Health
            </Typography>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};
