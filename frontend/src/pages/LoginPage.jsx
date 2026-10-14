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
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const from = location.state?.from?.pathname || '/';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      const res = await login(email, password);
      if (res.success) {
        enqueueSnackbar('Welcome back to EventPass!', { variant: 'success' });
        navigate(from, { replace: true });
      } else {
        setErrorMsg(res.message || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      const detail = err.response?.data?.error?.message || err.response?.data?.detail || 'Invalid email or password.';
      setErrorMsg(detail);
      enqueueSnackbar(detail, { variant: 'error' });
    } finally {
      setLoading(false);
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

            {errorMsg && (
              <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>
                {errorMsg}
              </Alert>
            )}

            <Box component="form" onSubmit={handleSubmit}>
              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                autoComplete="email"
                autoFocus
                required
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                autoComplete="current-password"
                required
                slotProps={{
                  input: {
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          onClick={() => setShowPassword(!showPassword)}
                          edge="end"
                          size="small"
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
                disabled={loading}
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
                {loading ? <CircularProgress size={24} sx={{ color: '#0f172a' }} /> : 'Sign In'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Don't have an account?{' '}
                  <MuiLink component={Link} to="/register" sx={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
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
