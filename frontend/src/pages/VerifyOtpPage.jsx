import React, { useState, useEffect } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';

export const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const { verifyOtp, resendOtp } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [email, setEmail] = useState(emailParam);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    let interval = null;
    if (timer > 0) {
      interval = setInterval(() => setTimer((t) => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setErrorMsg('OTP code must be 6 digits.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await verifyOtp(email, otpCode);
      if (res.success) {
        enqueueSnackbar('Email verified successfully! Please sign in.', { variant: 'success' });
        navigate('/login');
      } else {
        setErrorMsg(res.message || 'OTP verification failed.');
      }
    } catch (err) {
      const detail = err.response?.data?.error?.message || err.response?.data?.detail || 'Invalid or expired OTP code.';
      setErrorMsg(detail);
      enqueueSnackbar(detail, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setErrorMsg('Please specify an email address.');
      return;
    }

    setResending(true);
    setErrorMsg('');

    try {
      const res = await resendOtp(email);
      if (res.success) {
        enqueueSnackbar('A new OTP has been dispatched to your email.', { variant: 'info' });
        setTimer(60);
      }
    } catch (err) {
      const detail = err.response?.data?.error?.message || err.response?.data?.detail || 'Failed to resend OTP.';
      setErrorMsg(detail);
      enqueueSnackbar(detail, { variant: 'error' });
    } finally {
      setResending(false);
    }
  };

  return (
    <Box sx={{ minHeight: '85vh', display: 'flex', alignItems: 'center', bgcolor: '#ffffff', py: 6 }}>
      <Container maxWidth="xs">
        <Card
          sx={{
            p: 2,
            borderRadius: 4,
            bgcolor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: '14px',
                  bgcolor: '#ecfdf5',
                  color: '#059669',
                  border: '1px solid #a7f3d0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <MarkEmailReadOutlinedIcon sx={{ fontSize: 26 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Verify Your Email
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                Enter the 6-digit verification code sent to
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 700, color: '#0f172a', mt: 0.25 }}>
                {email || 'your email address'}
              </Typography>
            </Box>

            {errorMsg && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                {errorMsg}
              </Alert>
            )}

            <Box component="form" onSubmit={handleVerify}>
              {!emailParam && (
                <TextField
                  fullWidth
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  margin="normal"
                  required
                />
              )}

              <TextField
                fullWidth
                label="6-Digit OTP Code"
                placeholder="123456"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                margin="normal"
                autoFocus
                required
                slotProps={{
                  htmlInput: {
                    style: { textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 700, color: '#0f172a' },
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={loading || otpCode.length !== 6}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.25,
                  fontWeight: 700,
                  bgcolor: '#f5f5f5',
                  color: '#0f172a',
                  border: '1px solid #cbd5e1',
                  '&:hover': {
                    bgcolor: '#e5e5e5',
                    borderColor: '#94a3b8',
                  },
                }}
              >
                {loading ? <CircularProgress size={24} sx={{ color: '#0f172a' }} /> : 'Confirm Verification'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Button
                  variant="text"
                  disabled={timer > 0 || resending}
                  onClick={handleResend}
                  sx={{ color: timer > 0 ? '#94a3b8' : '#0f172a', fontSize: 13, fontWeight: 600 }}
                >
                  {resending
                    ? 'Resending...'
                    : timer > 0
                    ? `Resend code in ${timer}s`
                    : 'Resend Verification Code'}
                </Button>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};
