import React, { useState } from 'react';
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
  InputAdornment,
  IconButton,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Link as MuiLink,
} from '@mui/material';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import PersonAddOutlinedIcon from '@mui/icons-material/PersonAddOutlined';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSnackbar } from 'notistack';

export const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
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
    if (!fullName || !email || !password) {
      setErrorMsg('Please fill in all required fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      const res = await register({
        full_name: fullName,
        email,
        password,
        role,
      });

      if (res.success) {
        enqueueSnackbar('Registration successful! Please verify your email with the OTP.', {
          variant: 'info',
        });
        navigate(`/verify-otp?email=${encodeURIComponent(email)}`);
      }
    } catch (err) {
      const serverMessage =
        err.response?.data?.error?.message ||
        err.response?.data?.detail ||
        err.message ||
        'Registration failed. Please check your details.';
      setErrorMsg(serverMessage);
      enqueueSnackbar(serverMessage, { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container maxWidth="xs" sx={{ py: 8 }}>
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
                bgcolor: 'rgba(99, 102, 241, 0.15)',
                color: '#818cf8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 2,
              }}
            >
              <PersonAddOutlinedIcon />
            </Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>
              Create an Account
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
              Join EventPass to book tickets instantly
            </Typography>
          </Box>

          {errorMsg && (
            <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
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
              required
              autoFocus
            />
            <TextField
              fullWidth
              label="Email Address"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
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
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                      sx={{ color: 'text.secondary' }}
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <FormControl component="fieldset" sx={{ mt: 2, mb: 1, width: '100%' }}>
              <FormLabel component="legend" sx={{ color: 'text.secondary', fontSize: 13 }}>
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
                  control={<Radio size="small" color="primary" />}
                  label="Customer / Attendee"
                />
                <FormControlLabel
                  value="ADMIN"
                  control={<Radio size="small" color="secondary" />}
                  label="Event Organizer (Admin)"
                />
              </RadioGroup>
            </FormControl>

            <Button
              type="submit"
              fullWidth
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              sx={{ mt: 3, mb: 2, py: 1.25, fontWeight: 700 }}
            >
              {loading ? <CircularProgress size={24} color="inherit" /> : 'Register & Receive OTP'}
            </Button>

            <Box sx={{ textAlign: 'center', mt: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Already registered?{' '}
                <MuiLink component={Link} to="/login" sx={{ color: '#818cf8', fontWeight: 600 }}>
                  Sign In
                </MuiLink>
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};
