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
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const verifyOtpSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .email('Please provide a valid email address')
    .required('Email address is required'),
  otpCode: Yup.string()
    .matches(/^\d{6}$/, 'OTP code must be exactly 6 numeric digits')
    .required('6-digit OTP code is required'),
});

export const VerifyOtpPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const { verifyOtp, resendOtp } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

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

  const formik = useFormik({
    initialValues: {
      email: emailParam || '',
      otpCode: '',
    },
    validationSchema: verifyOtpSchema,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: async (values, { setSubmitting }) => {
      setErrorMsg('');
      try {
        const cleanEmail = values.email.trim().toLowerCase();
        const cleanOtp = values.otpCode.trim();

        const res = await verifyOtp(cleanEmail, cleanOtp);
        if (res.success) {
          enqueueSnackbar('Email verified successfully! You can now log in.', {
            variant: 'success',
            autoHideDuration: 4000,
          });
          navigate(`/login?verified=true&email=${encodeURIComponent(cleanEmail)}`);
        } else {
          const msg = res.message || 'OTP verification failed.';
          setErrorMsg(msg);
          enqueueSnackbar(msg, { variant: 'error' });
        }
      } catch (err) {
        const detail =
          err.response?.data?.error?.message ||
          err.response?.data?.detail ||
          'Invalid or expired OTP code.';
        setErrorMsg(detail);
        enqueueSnackbar(detail, { variant: 'error' });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const handleResend = async () => {
    const targetEmail = formik.values.email.trim().toLowerCase();
    if (!targetEmail) {
      const msg = 'Please specify a valid email address first.';
      setErrorMsg(msg);
      enqueueSnackbar(msg, { variant: 'warning' });
      return;
    }

    setResending(true);
    setErrorMsg('');

    try {
      const res = await resendOtp(targetEmail);
      if (res.success) {
        enqueueSnackbar('A fresh verification code has been dispatched to your mailbox.', {
          variant: 'info',
        });
        setTimer(60);
      } else {
        const msg = res.message || 'Failed to dispatch verification code.';
        setErrorMsg(msg);
        enqueueSnackbar(msg, { variant: 'error' });
      }
    } catch (err) {
      const detail =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        'Failed to resend OTP.';
      setErrorMsg(detail);
      enqueueSnackbar(detail, { variant: 'error' });
    } finally {
      setResending(false);
    }
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    const errors = await formik.validateForm();
    if (Object.keys(errors).length > 0) {
      formik.setTouched(
        Object.keys(formik.values).reduce((acc, key) => {
          acc[key] = true;
          return acc;
        }, {})
      );
      enqueueSnackbar('Please provide a valid 6-digit numeric verification code.', {
        variant: 'warning',
      });
      return;
    }
    formik.handleSubmit(e);
  };

  return (
    <Box sx={{ minHeight: '85vh', display: 'flex', alignItems: 'center', bgcolor: '#f8fafc', py: 6 }}>
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
                {formik.values.email || 'your email address'}
              </Typography>
            </Box>

            {errorMsg && (
              <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
                {errorMsg}
              </Alert>
            )}

            <Box component="form" onSubmit={handleFormSubmit} noValidate>
              {!emailParam && (
                <TextField
                  fullWidth
                  id="verify-email"
                  name="email"
                  label="Email"
                  type="email"
                  value={formik.values.email}
                  onChange={formik.handleChange}
                  onBlur={formik.handleBlur}
                  error={formik.touched.email && Boolean(formik.errors.email)}
                  helperText={formik.touched.email && formik.errors.email}
                  margin="normal"
                  required
                />
              )}

              <TextField
                fullWidth
                id="verify-otpCode"
                name="otpCode"
                label="6-Digit OTP Code"
                placeholder="123456"
                value={formik.values.otpCode}
                onChange={(e) => {
                  const cleaned = e.target.value.replace(/\D/g, '').slice(0, 6);
                  formik.setFieldValue('otpCode', cleaned);
                }}
                onBlur={formik.handleBlur}
                error={formik.touched.otpCode && Boolean(formik.errors.otpCode)}
                helperText={formik.touched.otpCode && formik.errors.otpCode}
                margin="normal"
                autoFocus
                autoComplete="one-time-code"
                required
                slotProps={{
                  htmlInput: {
                    style: {
                      textAlign: 'center',
                      fontSize: 24,
                      letterSpacing: 8,
                      fontWeight: 700,
                      color: '#0f172a',
                    },
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={formik.isSubmitting || formik.values.otpCode.length !== 6}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.35,
                  fontWeight: 700,
                  bgcolor: '#0f172a',
                  color: '#ffffff',
                  borderRadius: 2.5,
                  textTransform: 'none',
                  fontSize: 15,
                  boxShadow: '0 4px 12px rgba(15, 23, 42, 0.2)',
                  '&:hover': {
                    bgcolor: '#1e293b',
                    boxShadow: '0 6px 18px rgba(15, 23, 42, 0.3)',
                  },
                  '&.Mui-disabled': {
                    bgcolor: '#e2e8f0',
                    color: '#94a3b8',
                  },
                }}
              >
                {formik.isSubmitting ? (
                  <CircularProgress size={24} sx={{ color: '#ffffff' }} />
                ) : (
                  'Confirm Verification'
                )}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 1.5 }}>
                <Button
                  variant="text"
                  disabled={timer > 0 || resending}
                  onClick={handleResend}
                  sx={{
                    color: timer > 0 ? '#94a3b8' : '#2563eb',
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: 'none',
                  }}
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

        {/* Development Environment Mailbox Helper */}
        <Box
          sx={{
            mt: 3,
            p: 2.5,
            borderRadius: 3,
            bgcolor: '#eff6ff',
            border: '1px solid #bfdbfe',
            textAlign: 'center',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 0.5 }}>
            <MarkEmailReadOutlinedIcon sx={{ fontSize: 16, color: '#2563eb' }} />
            <Typography variant="caption" sx={{ fontWeight: 800, color: '#1e40af', letterSpacing: '0.04em' }}>
              MAILPIT OTP VERIFICATION SANDBOX
            </Typography>
          </Box>
          <Typography variant="body2" sx={{ color: '#1e40af', mb: 1.5, fontSize: 13, lineHeight: 1.45, fontWeight: 500 }}>
            Your 6-digit verification code has been dispatched to Mailpit. Open your Mailpit inbox below to view the incoming email and copy your code.
          </Typography>
          <Button
            variant="contained"
            size="small"
            href="http://localhost:8025"
            target="_blank"
            rel="noreferrer"
            endIcon={<OpenInNewIcon sx={{ fontSize: 14 }} />}
            sx={{
              bgcolor: '#2563eb',
              color: '#ffffff',
              fontSize: 12,
              fontWeight: 700,
              textTransform: 'none',
              borderRadius: 2,
              px: 2,
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.25)',
              '&:hover': { bgcolor: '#1d4ed8' },
            }}
          >
            Open Mailpit Inbox (:8025)
          </Button>
        </Box>
      </Container>
    </Box>
  );
};

