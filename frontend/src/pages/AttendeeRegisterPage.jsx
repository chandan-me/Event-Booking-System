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
  LinearProgress,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import EmailOutlinedIcon from '@mui/icons-material/EmailOutlined';
import PersonOutlinedIcon from '@mui/icons-material/PersonOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';
import { useFormik } from 'formik';
import * as Yup from 'yup';

const attendeeRegisterSchema = Yup.object().shape({
  fullName: Yup.string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(70, 'Full name cannot exceed 70 characters')
    .matches(/^[a-zA-Z\s.'-]+$/, 'Full name may only contain letters, spaces, hyphens, and apostrophes')
    .required('Full name is required'),
  email: Yup.string()
    .trim()
    .email('Please provide a valid email address')
    .max(100, 'Email cannot exceed 100 characters')
    .required('Email address is required'),
  password: Yup.string()
    .min(8, 'Password must be at least 8 characters')
    .max(64, 'Password cannot exceed 64 characters')
    .matches(/[A-Z]/, 'Must include at least one uppercase letter (A-Z)')
    .matches(/[a-z]/, 'Must include at least one lowercase letter (a-z)')
    .matches(/\d/, 'Must include at least one number (0-9)')
    .matches(/[@$!%*?&#^()_\-+={}[\]:;"'<>,./\\|~`]/, 'Must include at least one special character')
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password'), null], 'Passwords do not match')
    .required('Please confirm your password'),
});

export const AttendeeRegisterPage = () => {
  const navigate = useNavigate();
  const { register, login } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const formik = useFormik({
    initialValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
    validationSchema: attendeeRegisterSchema,
    validateOnBlur: true,
    validateOnChange: true,
    onSubmit: async (values, { setSubmitting }) => {
      setErrorMsg('');
      try {
        const cleanEmail = values.email.trim().toLowerCase();
        const cleanName = values.fullName.trim();

        const res = await register(cleanEmail, values.password, cleanName, 'ATTENDEE');
        if (res.success) {
          enqueueSnackbar('Account created! A 6-digit verification code has been dispatched to your email (Mailpit).', {
            variant: 'success',
            autoHideDuration: 4000,
          });
          navigate(`/verify-otp?email=${encodeURIComponent(cleanEmail)}`);
        } else {
          const msg = res.message || 'Registration failed. Please check your details.';
          setErrorMsg(msg);
          enqueueSnackbar(msg, { variant: 'error' });
        }
      } catch (err) {
        const detail =
          err.response?.data?.error?.message ||
          err.response?.data?.detail ||
          'Registration failed. Please verify your details.';
        setErrorMsg(detail);
        enqueueSnackbar(detail, { variant: 'error' });
      } finally {
        setSubmitting(false);
      }
    },
  });

  const pwd = formik.values.password || '';
  const pwdChecks = [
    { label: 'At least 8 characters', valid: pwd.length >= 8 },
    { label: 'One uppercase letter (A-Z)', valid: /[A-Z]/.test(pwd) },
    { label: 'One lowercase letter (a-z)', valid: /[a-z]/.test(pwd) },
    { label: 'One number (0-9)', valid: /\d/.test(pwd) },
    { label: 'One special symbol (!@#$...)', valid: /[@$!%*?&#^()_\-+={}[\]:;"'<>,./\\|~`]/.test(pwd) },
  ];
  const passedCount = pwdChecks.filter((c) => c.valid).length;
  const strengthPercent = (passedCount / pwdChecks.length) * 100;
  const strengthColor =
    strengthPercent <= 40 ? '#ef4444' : strengthPercent <= 80 ? '#f59e0b' : '#10b981';
  const strengthLabel =
    strengthPercent <= 40 ? 'Weak' : strengthPercent <= 80 ? 'Moderate' : 'Strong & Secure';

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
      enqueueSnackbar('Please correct all highlighted validation errors.', {
        variant: 'warning',
      });
      return;
    }
    formik.handleSubmit(e);
  };

  return (
    <Box
      sx={{
        minHeight: '88vh',
        display: 'flex',
        alignItems: 'center',
        bgcolor: '#f8fafc',
        py: { xs: 5, md: 8 },
      }}
    >
      <Container maxWidth="sm">
        {/* Back Button to Role Selection */}
        <Box sx={{ mb: 2.5 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/register')}
            sx={{
              color: '#64748b',
              fontWeight: 600,
              fontSize: 14,
              textTransform: 'none',
              borderRadius: 2,
              px: 1.5,
              '&:hover': {
                color: '#0f172a',
                bgcolor: '#e2e8f0',
              },
            }}
          >
            Back to Role Selection
          </Button>
        </Box>

        <Card
          sx={{
            p: { xs: 3, sm: 4 },
            borderRadius: 4,
            bgcolor: '#ffffff',
            border: '1px solid #e2e8f0',
            boxShadow: '0 20px 25px -5px rgba(15, 23, 42, 0.08), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
          }}
        >
          <CardContent sx={{ p: 0 }}>
            {/* Header with Role Badge */}
            <Box sx={{ textAlign: 'center', mb: 3.5 }}>
              <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                <Chip
                  icon={<ConfirmationNumberIcon sx={{ fontSize: '15px !important', color: '#0f172a !important' }} />}
                  label="ATTENDEE REGISTRATION"
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: 11,
                    letterSpacing: '0.06em',
                    bgcolor: '#f1f5f9',
                    color: '#0f172a',
                    border: '1px solid #e2e8f0',
                  }}
                />
              </Box>
              <Typography
                variant="h4"
                component="h1"
                sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}
              >
                Create Attendee Account
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.75, fontSize: 14 }}>
                Discover live concerts, tech summits, and cultural events with instant INR bookings.
              </Typography>
            </Box>

            {/* Error Banner */}
            {errorMsg && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2.5 }}>
                {errorMsg}
              </Alert>
            )}

            {/* Registration Form */}
            <Box component="form" onSubmit={handleFormSubmit} noValidate>
              {/* Full Name */}
              <TextField
                fullWidth
                id="attendee-fullName"
                name="fullName"
                label="Full Name"
                placeholder="e.g. Rahul Verma"
                value={formik.values.fullName}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.fullName && Boolean(formik.errors.fullName)}
                helperText={formik.touched.fullName && formik.errors.fullName}
                margin="normal"
                required
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <PersonOutlinedIcon sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {/* Email Address */}
              <TextField
                fullWidth
                id="attendee-email"
                name="email"
                label="Email Address"
                placeholder="user@email.com"
                type="email"
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.email && Boolean(formik.errors.email)}
                helperText={formik.touched.email && formik.errors.email}
                margin="normal"
                required
                autoComplete="email"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <EmailOutlinedIcon sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {/* Password */}
              <TextField
                fullWidth
                id="attendee-password"
                name="password"
                label="Password"
                placeholder="Create a strong password"
                type={showPassword ? 'text' : 'password'}
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.password && Boolean(formik.errors.password)}
                helperText={formik.touched.password && formik.errors.password}
                margin="normal"
                required
                autoComplete="new-password"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword((prev) => !prev)}
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

              {/* Interactive Password Strength Checklist */}
              {pwd.length > 0 && (
                <Box
                  sx={{
                    mt: 1,
                    mb: 2,
                    p: 2,
                    borderRadius: 2.5,
                    bgcolor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#475569' }}>
                      Password Strength: <span style={{ color: strengthColor }}>{strengthLabel}</span>
                    </Typography>
                    <Typography variant="caption" sx={{ fontWeight: 600, color: '#64748b' }}>
                      {passedCount} of 5 criteria met
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={strengthPercent}
                    sx={{
                      height: 6,
                      borderRadius: 3,
                      bgcolor: '#e2e8f0',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: strengthColor,
                        borderRadius: 3,
                        transition: 'all 0.3s ease',
                      },
                    }}
                  />
                  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 0.75, mt: 1.5 }}>
                    {pwdChecks.map((item, idx) => (
                      <Box key={idx} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                        {item.valid ? (
                          <CheckCircleIcon sx={{ fontSize: 14, color: '#10b981' }} />
                        ) : (
                          <RadioButtonUncheckedIcon sx={{ fontSize: 14, color: '#94a3b8' }} />
                        )}
                        <Typography
                          variant="caption"
                          sx={{
                            color: item.valid ? '#0f172a' : '#64748b',
                            fontWeight: item.valid ? 600 : 400,
                            fontSize: 11.5,
                          }}
                        >
                          {item.label}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              )}

              {/* Confirm Password */}
              <TextField
                fullWidth
                id="attendee-confirmPassword"
                name="confirmPassword"
                label="Confirm Password"
                placeholder="Re-enter your password"
                type={showConfirmPassword ? 'text' : 'password'}
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
                error={formik.touched.confirmPassword && Boolean(formik.errors.confirmPassword)}
                helperText={formik.touched.confirmPassword && formik.errors.confirmPassword}
                margin="normal"
                required
                autoComplete="new-password"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ color: '#94a3b8' }} />
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowConfirmPassword((prev) => !prev)}
                          edge="end"
                          size="small"
                          aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                          sx={{ color: '#64748b' }}
                        >
                          {showConfirmPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                        </IconButton>
                      </InputAdornment>
                    ),
                  },
                }}
              />

              {/* Submit Button */}
              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={formik.isSubmitting}
                endIcon={!formik.isSubmitting && <ArrowForwardIcon />}
                sx={{
                  mt: 3,
                  mb: 2.5,
                  py: 1.5,
                  fontSize: 15,
                  fontWeight: 700,
                  borderRadius: 2.5,
                  textTransform: 'none',
                  bgcolor: '#0f172a',
                  color: '#ffffff',
                  boxShadow: '0 4px 14px rgba(15, 23, 42, 0.2)',
                  '&:hover': {
                    bgcolor: '#1e293b',
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
                  'Complete Attendee Registration'
                )}
              </Button>

              {/* Footer Links */}
              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Want to host events instead?{' '}
                  <MuiLink
                    component={Link}
                    to="/register/organiser"
                    sx={{
                      color: '#2563eb',
                      fontWeight: 700,
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    Register as Organiser
                  </MuiLink>
                </Typography>
                <Typography variant="body2" sx={{ color: '#64748b', mt: 1 }}>
                  Already have an account?{' '}
                  <MuiLink
                    component={Link}
                    to="/login"
                    sx={{
                      color: '#0f172a',
                      fontWeight: 700,
                      textDecoration: 'none',
                      '&:hover': { textDecoration: 'underline' },
                    }}
                  >
                    Log in
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

