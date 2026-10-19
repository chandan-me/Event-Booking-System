import React, { useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Chip,
  IconButton,
  TextField,
  Button,
  Divider,
  Tooltip,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import SecurityIcon from '@mui/icons-material/Security';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import GitHubIcon from '@mui/icons-material/GitHub';
import TwitterIcon from '@mui/icons-material/Twitter';
import LinkedInIcon from '@mui/icons-material/LinkedIn';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import EmailIcon from '@mui/icons-material/Email';
import { Link, useNavigate } from 'react-router-dom';

export const Footer = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail('');
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Box
      component="footer"
      sx={{
        mt: 'auto',
        bgcolor: '#090d16',
        color: '#94a3b8',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Subtle radial ambient glow */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '80%',
          height: 140,
          background: 'radial-gradient(ellipse at top, rgba(37, 99, 235, 0.12), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Top Banner: Newsletter Subscription */}
      <Box
        sx={{
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          py: 4,
          position: 'relative',
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
            {/* Left: Newsletter pitch */}
            <Box sx={{ maxWidth: 520 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: 2,
                    bgcolor: 'rgba(37, 99, 235, 0.2)',
                    color: '#60a5fa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <EmailIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 700, fontSize: '1.1rem' }}>
                  Subscribe to EventPass Pulse
                </Typography>
              </Box>
              <Typography variant="body2" sx={{ color: '#94a3b8', fontSize: 14, lineHeight: 1.5 }}>
                Get hand-picked event drops, exclusive presale access, and host tips delivered directly to your inbox.
              </Typography>
            </Box>

            {/* Right: Newsletter Input Form */}
            <Box
              component="form"
              onSubmit={handleSubscribe}
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 1.25,
                width: { xs: '100%', sm: 'auto' },
                maxWidth: 440,
              }}
            >
              {subscribed ? (
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'rgba(16, 185, 129, 0.15)',
                    color: '#34d399',
                    border: '1px solid rgba(52, 211, 153, 0.3)',
                    px: 2.5,
                    py: 1.2,
                    borderRadius: 2,
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 18 }} />
                  You're on the VIP presale list!
                </Box>
              ) : (
                <>
                  <TextField
                    size="small"
                    placeholder="Enter your email address..."
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    type="email"
                    sx={{
                      flexGrow: 1,
                      minWidth: { xs: 200, sm: 260 },
                      '& .MuiOutlinedInput-root': {
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                        color: '#f8fafc',
                        borderRadius: 2,
                        fontSize: 14,
                        '& fieldset': { borderColor: 'rgba(255, 255, 255, 0.15)' },
                        '&:hover fieldset': { borderColor: 'rgba(255, 255, 255, 0.3)' },
                        '&.Mui-focused fieldset': { borderColor: '#3b82f6' },
                      },
                    }}
                  />
                  <Button
                    type="submit"
                    variant="contained"
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      bgcolor: '#2563eb',
                      color: '#ffffff',
                      textTransform: 'none',
                      fontWeight: 700,
                      px: 2.5,
                      py: 1,
                      borderRadius: 2,
                      whiteSpace: 'nowrap',
                      boxShadow: '0 4px 14px rgba(37, 99, 235, 0.4)',
                      '&:hover': { bgcolor: '#1d4ed8' },
                    }}
                  >
                    Subscribe
                  </Button>
                </>
              )}
            </Box>
          </Box>
        </Container>
      </Box>

      {/* Main Footer Links Columns (Attendee & Organiser Centric) */}
      <Container maxWidth="lg" sx={{ py: 6 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: '2.2fr 1.2fr 1.3fr 1.3fr' },
            gap: { xs: 4, md: 5 },
          }}
        >
          {/* Column 1: Brand & Consumer Mission */}
          <Box>
            <Box
              onClick={() => navigate('/')}
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.25,
                cursor: 'pointer',
                mb: 2,
              }}
            >
              <Box
                sx={{
                  width: 38,
                  height: 38,
                  borderRadius: 2.2,
                  bgcolor: '#2563eb',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.35)',
                }}
              >
                <ConfirmationNumberIcon sx={{ fontSize: 22 }} />
              </Box>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 800,
                  color: '#ffffff',
                  letterSpacing: '-0.02em',
                  fontSize: '1.25rem',
                }}
              >
                EventPass
              </Typography>
            </Box>

            <Typography
              variant="body2"
              sx={{
                color: '#94a3b8',
                fontSize: 14,
                lineHeight: 1.65,
                mb: 2.5,
                maxWidth: 360,
              }}
            >
              India's premier live event ticketing and hosting platform. Discover music concerts, technology conferences, comedy tours, and workshops with instant bookings, verified passes, and seamless gate check-ins.
            </Typography>

            {/* Consumer Trust Badge */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 1.25,
                px: 1.75,
                py: 0.75,
                borderRadius: 2,
                bgcolor: 'rgba(37, 99, 235, 0.08)',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                mb: 3,
              }}
            >
              <VerifiedUserIcon sx={{ fontSize: 16, color: '#60a5fa' }} />
              <Typography variant="caption" sx={{ color: '#93c5fd', fontWeight: 700, fontSize: 12 }}>
                100% Verified Tickets • Buyer Protection
              </Typography>
            </Box>

            {/* Social & Community Links */}
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Tooltip title="Follow on GitHub">
                <IconButton
                  size="small"
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' },
                  }}
                >
                  <GitHubIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Follow on Twitter / X">
                <IconButton
                  size="small"
                  href="https://twitter.com"
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' },
                  }}
                >
                  <TwitterIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title="Follow on LinkedIn">
                <IconButton
                  size="small"
                  href="https://linkedin.com"
                  target="_blank"
                  rel="noreferrer"
                  sx={{
                    bgcolor: 'rgba(255, 255, 255, 0.05)',
                    color: '#cbd5e1',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.15)', color: '#ffffff' },
                  }}
                >
                  <LinkedInIcon sx={{ fontSize: 18 }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          {/* Column 2: Discover & Attend */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontSize: 12,
                mb: 2,
              }}
            >
              Discover Events
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {[
                { label: 'Explore All Events', to: '/events' },
                { label: 'Upcoming Live Stages', to: '/events?tab=UPCOMING' },
                { label: 'Concluded & Past Events', to: '/events?tab=PAST' },
                { label: 'Music Concerts & Festivals', to: '/events?search=Music' },
                { label: 'Tech & AI Conferences', to: '/events?search=Tech' },
                { label: 'My Bookings & QR Tickets', to: '/my-bookings' },
              ].map((link, idx) => (
                <Typography
                  key={idx}
                  component={Link}
                  to={link.to}
                  variant="body2"
                  sx={{
                    color: '#94a3b8',
                    textDecoration: 'none',
                    fontSize: 14,
                    transition: 'all 0.2s',
                    '&:hover': { color: '#60a5fa', transform: 'translateX(3px)' },
                  }}
                >
                  {link.label}
                </Typography>
              ))}
            </Box>
          </Box>

          {/* Column 3: For Organisers & Hosts */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontSize: 12,
                mb: 2,
              }}
            >
              For Organisers
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {[
                { label: 'Host an Event', to: '/register/organiser' },
                { label: 'Organizer Command Hub', to: '/organizer' },
                { label: 'Publish New Event Listing', to: '/organizer' },
                { label: 'QR Gate Ticket Scanner', to: '/organizer' },
                { label: 'Real-time Sales Analytics', to: '/organizer' },
                { label: 'Role Selection Portal', to: '/register' },
              ].map((link, idx) => (
                <Typography
                  key={idx}
                  component={Link}
                  to={link.to}
                  variant="body2"
                  sx={{
                    color: '#94a3b8',
                    textDecoration: 'none',
                    fontSize: 14,
                    transition: 'all 0.2s',
                    '&:hover': { color: '#60a5fa', transform: 'translateX(3px)' },
                  }}
                >
                  {link.label}
                </Typography>
              ))}
            </Box>
          </Box>

          {/* Column 4: Help, Support & Trust (User-Facing) */}
          <Box>
            <Typography
              variant="subtitle2"
              sx={{
                fontWeight: 700,
                color: '#ffffff',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
                fontSize: 12,
                mb: 2,
              }}
            >
              Help & Support
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.25 }}>
              {[
                { label: 'Help Center & FAQs', to: '/' },
                { label: 'Ticket Booking Guide', to: '/' },
                { label: 'Refund & Cancellation Policy', to: '/' },
                { label: 'Buyer & Seller Terms', to: '/' },
                { label: 'Privacy & Data Protection', to: '/' },
                { label: 'Contact Customer Support', to: '/' },
              ].map((item, idx) => (
                <Typography
                  key={idx}
                  component={Link}
                  to={item.to}
                  variant="body2"
                  sx={{
                    color: '#94a3b8',
                    textDecoration: 'none',
                    fontSize: 14,
                    transition: 'all 0.2s',
                    '&:hover': { color: '#60a5fa', transform: 'translateX(3px)' },
                  }}
                >
                  {item.label}
                </Typography>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Security & Customer Trust Bar */}
        <Box
          sx={{
            mt: 6,
            pt: 3,
            pb: 2,
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexWrap: 'wrap',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 2,
          }}
        >
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#cbd5e1', fontSize: 13 }}>
              <SecurityIcon sx={{ fontSize: 16, color: '#10b981' }} />
              <span>Argon2id Encrypted Accounts</span>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', height: 16, my: 'auto' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#cbd5e1', fontSize: 13 }}>
              <CurrencyRupeeIcon sx={{ fontSize: 16, color: '#38bdf8' }} />
              <span>100% Verified INR Payments</span>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', height: 16, my: 'auto' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#cbd5e1', fontSize: 13 }}>
              <QrCodeScannerIcon sx={{ fontSize: 16, color: '#a855f7' }} />
              <span>Digital QR Pass Verification</span>
            </Box>
            <Divider orientation="vertical" flexItem sx={{ borderColor: 'rgba(255, 255, 255, 0.15)', height: 16, my: 'auto' }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, color: '#cbd5e1', fontSize: 13 }}>
              <SupportAgentIcon sx={{ fontSize: 16, color: '#f59e0b' }} />
              <span>Dedicated 24/7 Support</span>
            </Box>
          </Box>

          <Button
            onClick={scrollToTop}
            size="small"
            endIcon={<KeyboardArrowUpIcon />}
            sx={{
              color: '#94a3b8',
              bgcolor: 'rgba(255, 255, 255, 0.04)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              textTransform: 'none',
              fontSize: 13,
              borderRadius: 2,
              px: 1.5,
              '&:hover': {
                color: '#ffffff',
                bgcolor: 'rgba(255, 255, 255, 0.1)',
                borderColor: 'rgba(255, 255, 255, 0.2)',
              },
            }}
          >
            Back to Top
          </Button>
        </Box>
      </Container>

      {/* Bottom Legal Bar */}
      <Box
        sx={{
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          bgcolor: '#060910',
          py: 2.5,
        }}
      >
        <Container maxWidth="lg">
          <Box
            sx={{
              display: 'flex',
              flexDirection: { xs: 'column', sm: 'row' },
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 2,
            }}
          >
            <Typography variant="caption" sx={{ color: '#64748b', fontSize: 13 }}>
              © {new Date().getFullYear()} EventPass Technologies, Inc. All rights reserved.
            </Typography>

            <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
              <Typography
                component={Link}
                to="/"
                variant="caption"
                sx={{ color: '#64748b', textDecoration: 'none', '&:hover': { color: '#cbd5e1' } }}
              >
                Privacy Policy
              </Typography>
              <Typography
                component={Link}
                to="/"
                variant="caption"
                sx={{ color: '#64748b', textDecoration: 'none', '&:hover': { color: '#cbd5e1' } }}
              >
                Terms of Service
              </Typography>
              <Typography
                component={Link}
                to="/"
                variant="caption"
                sx={{ color: '#64748b', textDecoration: 'none', '&:hover': { color: '#cbd5e1' } }}
              >
                Security Specs
              </Typography>
              <Typography
                component={Link}
                to="/"
                variant="caption"
                sx={{ color: '#64748b', textDecoration: 'none', '&:hover': { color: '#cbd5e1' } }}
              >
                Cookie Preferences
              </Typography>
            </Box>
          </Box>
        </Container>
      </Box>
    </Box>
  );
};
