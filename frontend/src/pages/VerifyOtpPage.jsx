import React, { useState, useEffect } from 'react';
import {
  Container,
  Box,
  Typography,
  TextField,
  Button,
  Card,
  CardContent,
  Alert,
  CircularProgress,
} from '@mui/material';
import MarkEmailReadOutlinedIcon from '@mui/icons-material/MarkEmailReadOutlined';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { authApi } from '../api/authApi';
import { useSnackbar } from 'notistack';

export const VerifyOtpPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const emailParam = searchParams.get('email') || '';
  const [email, setEmail] = useState(emailParam);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [timer, setTimer] = useState(60);

  useEffect(() => {
    if (timer > 0) {
      const interval = setInterval(() => setTimer((t) => t - 1), 1000);
      return () => clearInterval(interval);
    }
  }, [timer]);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!email || !otpCode || otpCode.length !== 6) {
      setErrorMsg('Please enter a valid 6-digit verification code.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await authApi.verifyOtp({ email, otp_code: otpCode });
      if (res.success) {
        enqueueSnackbar('Email verified successfully! You can now sign in.', {
          variant: 'success',
        });
        navigate('/login');
      }
    } catch (err) {
      const serverMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Verification failed. The code may be expired or invalid.';
      setErrorMsg(serverMessage);
      enqueueSnackbar(serverMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      setErrorMsg('Email address required to resend OTP.');
      return;
    }

    setResending(true);
    setErrorMsg('');

    try {
      const res = await authApi.resendOtp({ email });
      if (res.success) {
        enqueueSnackbar('A fresh OTP code has been dispatched to your email!', {
          variant: 'info',
        });
        setTimer(60);
      }
    } catch (err) {
      const serverMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Could not resend OTP.';
      setErrorMsg(serverMessage);
    } finally {
      setResending(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 10 }}>
      <Card
        sx={{
          p: 2,
          borderRadius: 4,
          bgcolor: 'rgba(17, 24, 39, 0.95)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.8)',
        }}
      >
        <CardContent sx={{ p: 3 }}>
          <Box sx={{ textAlign: 'center', mb: 3 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: '12px',
                bgcolor: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <MarkEmailReadOutlinedIcon />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Verify Your Email
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Enter the 6-digit security code sent to
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600, color: '#818cf8' }}>
              {email || 'your email'}
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
              inputProps={{
                style: { textAlign: 'center', fontSize: 24, letterSpacing: 8, fontWeight: 700 },
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              disabled={loading || otpCode.length !== 6}
              sx={{ mt: 3, mb: 2, py: 1.25, fontWeight: 700 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Confirm Verification'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Button
                variant="text"
                disabled={timer > 0 || resending}
                onClick={handleResend}
                sx={{ color: timer > 0 ? 'text.secondary' : '#818cf8', fontSize: 13 }}
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
  );
};
