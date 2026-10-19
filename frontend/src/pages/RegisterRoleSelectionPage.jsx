import React, { useState } from 'react';
import {
  Container,
  Card,
  CardContent,
  Typography,
  Button,
  Box,
  Chip,
  Link as MuiLink,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CampaignIcon from '@mui/icons-material/Campaign';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner';
import StarIcon from '@mui/icons-material/Star';
import RadioButtonCheckedIcon from '@mui/icons-material/RadioButtonChecked';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import { Link, useNavigate } from 'react-router-dom';

export const RegisterRoleSelectionPage = () => {
  const navigate = useNavigate();
  const [hoveredRole, setHoveredRole] = useState(null);

  const roles = [
    {
      id: 'attendee',
      title: 'Attendee',
      subtitle: 'Discover, Book & Experience Live Events',
      badge: 'FOR EVENT GOERS',
      badgeBg: '#f1f5f9',
      badgeColor: '#0f172a',
      popular: false,
      tagline: 'Instant Booking • Digital QR Tickets',
      icon: <ConfirmationNumberIcon sx={{ fontSize: 28 }} />,
      iconBg: '#0f172a',
      iconColor: '#ffffff',
      description:
        'Discover music concerts, tech conferences, and workshops with instant booking and verifiable QR passes.',
      features: [
        'Instant ticket reservation with INR Razorpay checkout',
        'Cryptographic QR code ticket saved directly to your account',
        'Automated booking confirmations and email reminders',
        'Self-service booking history and cancellation requests',
      ],
      ctaText: 'Continue as Attendee',
      ctaColor: '#0f172a',
      ctaHoverBg: '#1e293b',
      targetUrl: '/register/attendee',
    },
    {
      id: 'organiser',
      title: 'Organiser / Host',
      subtitle: 'Publish, Host & Monetize Experiences',
      badge: 'MOST POPULAR FOR CREATORS',
      badgeBg: '#eff6ff',
      badgeColor: '#1d4ed8',
      popular: true,
      tagline: 'Unlimited Events • Real-Time Sales',
      icon: <CampaignIcon sx={{ fontSize: 28 }} />,
      iconBg: '#2563eb',
      iconColor: '#ffffff',
      description:
        'Publish live experiences, configure custom seating tiers, scan gate tickets, and track real-time revenue.',
      features: [
        'Create custom concerts, conferences, and workshops in minutes',
        'Configure multi-tier ticket pricing, seat inventories, and quotas',
        'Built-in QR ticket scanner for swift, fraud-free gate entry',
        'Real-time revenue metrics, attendee rosters, and sales charts',
      ],
      ctaText: 'Continue as Organiser',
      ctaColor: '#2563eb',
      ctaHoverBg: '#1d4ed8',
      targetUrl: '/register/organiser',
    },
  ];

  return (
    <Box
      sx={{
        minHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        bgcolor: '#f8fafc',
        py: { xs: 4, md: 6 },
      }}
    >
      <Container maxWidth="lg">
        {/* Header Section */}
        <Box sx={{ textAlign: 'center', maxWidth: 640, mx: 'auto', mb: { xs: 3.5, md: 5 } }}>
          <Chip
            label="STEP 1 OF 2 : SELECT ACCOUNT TYPE"
            size="small"
            sx={{
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: '0.08em',
              bgcolor: '#e2e8f0',
              color: '#334155',
              mb: 1.5,
              px: 1,
            }}
          />
          <Typography
            variant="h3"
            component="h1"
            sx={{
              fontWeight: 800,
              color: '#0f172a',
              letterSpacing: '-0.03em',
              fontSize: { xs: '1.75rem', sm: '2.25rem', md: '2.6rem' },
            }}
          >
            How will you use EventPass?
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#64748b',
              mt: 1,
              fontSize: { xs: 14.5, md: 16 },
              lineHeight: 1.55,
            }}
          >
            Select your account type to personalize your experience. You can switch or manage both functions anytime.
          </Typography>
        </Box>

        {/* Side-by-Side Cards Grid (2 Columns on Tablets & Desktops) */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' },
            gap: { xs: 2.5, sm: 3, md: 4 },
            alignItems: 'stretch',
            maxWidth: 980,
            mx: 'auto',
          }}
        >
          {roles.map((item) => {
            const isHovered = hoveredRole === item.id;
            return (
              <Card
                key={item.id}
                onMouseEnter={() => setHoveredRole(item.id)}
                onMouseLeave={() => setHoveredRole(null)}
                onClick={() => navigate(item.targetUrl)}
                sx={{
                  width: '100%',
                  display: 'flex',
                  flexDirection: 'column',
                  cursor: 'pointer',
                  borderRadius: 3.5,
                  border: '2px solid',
                  borderColor: isHovered ? item.ctaColor : '#e2e8f0',
                  bgcolor: '#ffffff',
                  p: { xs: 2.5, sm: 3, md: 3.5 },
                  boxShadow: isHovered
                    ? '0 20px 30px -10px rgba(15, 23, 42, 0.12), 0 8px 16px -6px rgba(15, 23, 42, 0.08)'
                    : '0 4px 15px rgba(15, 23, 42, 0.04)',
                  transform: isHovered ? 'translateY(-4px)' : 'none',
                  transition: 'all 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  overflow: 'visible',
                }}
              >
                {/* Popular Badge */}
                {item.popular && (
                  <Box
                    sx={{
                      position: 'absolute',
                      top: -12,
                      right: 24,
                      bgcolor: '#2563eb',
                      color: '#ffffff',
                      px: 1.5,
                      py: 0.25,
                      borderRadius: 10,
                      fontSize: 10.5,
                      fontWeight: 800,
                      letterSpacing: '0.04em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 0.5,
                      boxShadow: '0 4px 10px rgba(37, 99, 235, 0.35)',
                    }}
                  >
                    <StarIcon sx={{ fontSize: 13 }} />
                    RECOMMENDED FOR HOSTS
                  </Box>
                )}

                <CardContent sx={{ p: 0, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
                  {/* Top Bar: Icon + Radio State */}
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Box
                        sx={{
                          width: 48,
                          height: 48,
                          borderRadius: 2.5,
                          bgcolor: item.iconBg,
                          color: item.iconColor,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: '0 6px 14px -3px rgba(15, 23, 42, 0.15)',
                        }}
                      >
                        {item.icon}
                      </Box>
                      <Box>
                        <Chip
                          label={item.badge}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: 10,
                            bgcolor: item.badgeBg,
                            color: item.badgeColor,
                            height: 22,
                            border: '1px solid',
                            borderColor: isHovered ? item.ctaColor : 'transparent',
                          }}
                        />
                      </Box>
                    </Box>

                    {/* Radio visual indicator */}
                    <Box sx={{ color: isHovered ? item.ctaColor : '#94a3b8', display: 'flex', alignItems: 'center' }}>
                      {isHovered ? (
                        <RadioButtonCheckedIcon sx={{ fontSize: 24, color: item.ctaColor }} />
                      ) : (
                        <RadioButtonUncheckedIcon sx={{ fontSize: 24 }} />
                      )}
                    </Box>
                  </Box>

                  {/* Title & Tagline */}
                  <Typography
                    variant="h5"
                    component="h2"
                    sx={{
                      fontWeight: 800,
                      color: '#0f172a',
                      letterSpacing: '-0.02em',
                      fontSize: { xs: '1.25rem', sm: '1.4rem' },
                      mb: 0.25,
                    }}
                  >
                    {item.title}
                  </Typography>

                  <Typography
                    variant="caption"
                    sx={{
                      color: item.ctaColor,
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      mb: 1.5,
                      display: 'block',
                      fontSize: 12,
                    }}
                  >
                    {item.tagline}
                  </Typography>

                  {/* Description */}
                  <Typography
                    variant="body2"
                    sx={{
                      color: '#475569',
                      fontSize: 13.5,
                      lineHeight: 1.5,
                      mb: 2.5,
                    }}
                  >
                    {item.description}
                  </Typography>

                  {/* Key Features List Box */}
                  <Box
                    sx={{
                      bgcolor: '#f8fafc',
                      p: 2,
                      borderRadius: 2.5,
                      border: '1px solid #e2e8f0',
                      mb: 3,
                      flexGrow: 1,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 700,
                        color: '#64748b',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        display: 'block',
                        mb: 1.25,
                        fontSize: 11,
                      }}
                    >
                      Included Capabilities:
                    </Typography>
                    {item.features.map((feature, idx) => (
                      <Box
                        key={idx}
                        sx={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 1,
                          mb: idx === item.features.length - 1 ? 0 : 1,
                        }}
                      >
                        <CheckCircleIcon
                          sx={{
                            fontSize: 15,
                            color: item.ctaColor,
                            mt: '2px',
                            flexShrink: 0,
                          }}
                        />
                        <Typography
                          variant="body2"
                          sx={{
                            color: '#334155',
                            fontSize: 12.5,
                            lineHeight: 1.4,
                            fontWeight: 500,
                          }}
                        >
                          {feature}
                        </Typography>
                      </Box>
                    ))}
                  </Box>

                  {/* Call-to-action Button */}
                  <Button
                    variant="contained"
                    fullWidth
                    endIcon={<ArrowForwardIcon sx={{ fontSize: 18 }} />}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(item.targetUrl);
                    }}
                    sx={{
                      bgcolor: item.ctaColor,
                      color: '#ffffff',
                      fontWeight: 700,
                      py: 1.25,
                      fontSize: 14.5,
                      borderRadius: 2.2,
                      textTransform: 'none',
                      boxShadow: `0 4px 14px ${item.ctaColor}33`,
                      '&:hover': {
                        bgcolor: item.ctaHoverBg,
                        boxShadow: `0 6px 20px ${item.ctaColor}55`,
                      },
                    }}
                  >
                    {item.ctaText}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </Box>

        {/* Trust Badges & Sign-In Link */}
        <Box sx={{ textAlign: 'center', mt: 4 }}>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              justifyContent: 'center',
              gap: 3,
              color: '#64748b',
              fontSize: 13,
              mb: 2.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <SecurityIcon sx={{ fontSize: 16, color: '#059669' }} />
              <span>Enterprise Argon2id Password Encryption</span>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <CurrencyRupeeIcon sx={{ fontSize: 16, color: '#0f172a' }} />
              <span>INR Currency Integration</span>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
              <QrCodeScannerIcon sx={{ fontSize: 16, color: '#2563eb' }} />
              <span>Cryptographic QR Tickets</span>
            </Box>
          </Box>

          <Typography variant="body2" sx={{ color: '#64748b' }}>
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
              Sign In here
            </MuiLink>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};
