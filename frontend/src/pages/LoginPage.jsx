import React, { useState } from 'react';
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
  Link as MuiLink,
  InputAdornment,
  IconButton,
  Chip,
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const loginSchema = Yup.object().shape({
  email: Yup.string()
    .trim()
    .email('Please enter a valid email address')
    .max(100, 'Email address is too long')
    .required('Email address is required'),
  password: Yup.string()
    .min(1, 'Password is required')
    .required('Password is required'),
});

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const queryParams = new URLSearchParams(location.search);
  const initialEmail = queryParams.get('email') || '';
  const isJustVerified = queryParams.get('verified') === 'true';

  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState('');

  const from = location.state?.from?.pathname || '/';

  const formik = useFormik({
    initialValues: {
      email: initialEmail,
      password: '',
    },
    enableReinitialize: true,
    validationSchema: loginSchema,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: async (values, { setSubmitting }) => {
      setErrorMsg('');
      setUnverifiedEmail('');
      try {
        const cleanEmail = values.email.trim().toLowerCase();
        const res = await login(cleanEmail, values.password);
        if (res && (res.success || res.access_token || res.user)) {
          enqueueSnackbar(`Welcome back, ${res.user?.full_name || 'User'}!`, {
            variant: 'success',
            autoHideDuration: 3500,
          });
          navigate(from, { replace: true });
        } else {
          const msg = 'Authentication failed. Please verify your email and password.';
          setErrorMsg(msg);
          enqueueSnackbar(msg, { variant: 'error' });
        }
      } catch (err) {
        const detail =
          err.response?.data?.error?.message ||
          err.response?.data?.detail ||
          err.message ||
          'Invalid email or password.';
        const cleanEmail = values.email.trim().toLowerCase();
        if (
          err.response?.status === 403 &&
          (detail.toLowerCase().includes('verify your email') || detail.toLowerCase().includes('otp'))
        ) {
          setUnverifiedEmail(cleanEmail);
        }
        setErrorMsg(detail);
        enqueueSnackbar(detail, { variant: 'error' });
      } finally {
        setSubmitting(false);
      }
    },
  });

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
      enqueueSnackbar('Please correct the highlighted errors before submitting.', {
        variant: 'warning',
      });
      return;
    }
    formik.handleSubmit(e);
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
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <Box
                sx={{
                  width: 50,
                  height: 50,
                  borderRadius: '14px',
                  bgcolor: '#f1f5f9',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <LockOutlinedIcon sx={{ fontSize: 24 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Welcome Back
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                Sign in to manage your tickets and bookings
              </Typography>
            </Box>

            {isJustVerified && !errorMsg && (
              <Alert severity="success" sx={{ mb: 3, borderRadius: 2 }}>
                ✓ Email verified successfully! Please enter your password to sign in.
              </Alert>
            )}

            {errorMsg && (
              <Alert severity="error" sx={{ mb: unverifiedEmail ? 1.5 : 3, borderRadius: 2 }}>
                {errorMsg}
              </Alert>
            )}

            {unverifiedEmail && (
              <Box sx={{ mb: 3, textAlign: 'center' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => navigate(`/verify-otp?email=${encodeURIComponent(unverifiedEmail)}`)}
                  sx={{
                    borderColor: '#2563eb',
                    color: '#2563eb',
                    fontWeight: 700,
                    textTransform: 'none',
                    borderRadius: 2,
                    fontSize: 13,
                    width: '100%',
                    py: 0.8,
                    '&:hover': { bgcolor: '#eff6ff', borderColor: '#1d4ed8' },
                  }}
                >
                  Verify Your Account with OTP Now →
                </Button>
              </Box>
            )}

            {/* Quick Fill Demo Credentials for Collaborators & Testers */}
            <Box
              sx={{
                mb: 2.5,
                p: 1.5,
                bgcolor: '#f8fafc',
                borderRadius: 2.5,
                border: '1px solid #e2e8f0',
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  display: 'block',
                  fontWeight: 700,
                  color: '#475569',
                  mb: 1,
                  textTransform: 'uppercase',
                  letterSpacing: 0.5,
                  fontSize: 11,
                }}
              >
                ⚡ Quick Fill Demo Accounts
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Chip
                  label="Host / Organizer"
                  size="small"
                  onClick={() => {
                    formik.setFieldValue('email', 'organizer@eventpass.com');
                    formik.setFieldValue('password', 'OrganizerPass@123');
                  }}
                  sx={{
                    fontWeight: 700,
                    fontSize: 11.5,
                    bgcolor: '#ede9fe',
                    color: '#6d28d9',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#ddd6fe' },
                  }}
                />
                <Chip
                  label="Admin"
                  size="small"
                  onClick={() => {
                    formik.setFieldValue('email', 'admin@eventpass.com');
                    formik.setFieldValue('password', 'AdminPass@123');
                  }}
                  sx={{
                    fontWeight: 700,
                    fontSize: 11.5,
                    bgcolor: '#fef3c7',
                    color: '#b45309',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#fde68a' },
                  }}
                />
                <Chip
                  label="Attendee"
                  size="small"
                  onClick={() => {
                    formik.setFieldValue('email', 'user@eventpass.com');
                    formik.setFieldValue('password', 'UserPass@123');
                  }}
                  sx={{
                    fontWeight: 700,
                    fontSize: 11.5,
                    bgcolor: '#dcfce7',
                    color: '#15803d',
                    cursor: 'pointer',
                    '&:hover': { bgcolor: '#bbf7d0' },
                  }}
                />
              </Box>
            </Box>

            <Box component="form" onSubmit={handleFormSubmit} noValidate>
              <TextField
                fullWidth
                id="login-email"
                name="email"
                label="Email Address"
                type="email"
                placeholder="name@example.com"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                margin="normal"
                autoComplete="username"
                autoFocus
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <TextField
                fullWidth
                id="login-password"
                name="password"
                label="Password"
                placeholder="Enter your password"
                type={showPassword ? 'text' : 'password'}
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                margin="normal"
                autoComplete="current-password"
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ color: '#94a3b8', fontSize: 20 }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
                          aria-label={showPassword ? 'Hide password' : 'Show password'}
                          sx={{ color: '#64748b' }}
                        >
                          {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                size="large"
                disabled={formik.isSubmitting}
                sx={{
                  mt: 3,
                  mb: 2,
                  py: 1.25,
                  fontWeight: 700,
                  bgcolor: '#0f172a',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                  border: '1px solid #0f172a',
                  '&:hover': {
                    bgcolor: '#1e293b',
                    borderColor: '#1e293b',
                  },
                  '&.Mui-disabled': {
                    bgcolor: '#cbd5e1',
                    color: '#64748b',
                  },
                }}
              >
                {formik.isSubmitting ? (
                  <CircularProgress size={24} sx={{ color: '#ffffff' }} />
                ) : (
                  'Sign In'
                )}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Don't have an account?{' '}
                  <MuiLink
                    component={Link}
                    to="/register"
                    sx={{
                      color: '#0f172a',
                      fontWeight: 700,
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    Create Account
                  </MuiLink>
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

