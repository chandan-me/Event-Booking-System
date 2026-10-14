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
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  FormLabel,
  InputAdornment,
  IconButton,
} from '@mui/material';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';

export const RegisterPage = () => {
  const navigate = useNavigate();
  const { register } = useAuth();
  const { enqueueSnackbar } = useSnackbar();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('CUSTOMER');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await register(email, password, fullName, role);
      if (res.success) {
        enqueueSnackbar('Registration successful! OTP verification sent to email.', {
          variant: 'success',
        });
        navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
      } else {
        setErrorMsg(res.message || 'Registration failed.');
      }
    } catch (err) {
      const detail = err.response?.data?.error?.message || err.response?.data?.detail || 'Registration failed.';
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
                <PersonAddOutlinedIcon sx={{ fontSize: 24 }} />
              </Box>
              <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a' }}>
                Create an Account
              </Typography>
              <Typography variant="body2" sx={{ color: '#64748b', mt: 0.5 }}>
                Join EventPass to book tickets instantly in INR
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
                label="Full Name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                margin="normal"
                autoComplete="name"
                autoFocus
                required
              />

              <TextField
                fullWidth
                label="Email Address"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                margin="normal"
                autoComplete="email"
                required
              />

              <TextField
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                margin="normal"
                helperText="Minimum 8 characters"
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

              <FormControl component="fieldset" sx={{ mt: 2, mb: 1, width: '100%' }}>
                <FormLabel component="legend" sx={{ color: '#64748b', fontSize: 13, fontWeight: 600 }}>
                  Account Type
                </FormLabel>
                <RadioGroup
                  row
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  sx={{ mt: 0.5 }}
                >
                  <FormControlLabel
                    value="CUSTOMER"
                    control={<Radio size="small" sx={{ color: '#0f172a', '&.Mui-checked': { color: '#0f172a' } }} />}
                    label="Customer / Attendee"
                  />
                  <FormControlLabel
                    value="ADMIN"
                    control={<Radio size="small" sx={{ color: '#0f172a', '&.Mui-checked': { color: '#0f172a' } }} />}
                    label="Organizer (Admin)"
                  />
                </RadioGroup>
              </FormControl>

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
                {loading ? <CircularProgress size={24} sx={{ color: '#0f172a' }} /> : 'Register & Receive OTP'}
              </Button>

              <Box sx={{ textAlign: 'center', mt: 2 }}>
                <Typography variant="body2" sx={{ color: '#64748b' }}>
                  Already registered?{' '}
                  <MuiLink component={Link} to="/login" sx={{ color: '#0f172a', fontWeight: 700, textDecoration: 'none', '&:hover': { textDecoration: 'underline' } }}>
                    Sign In
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
