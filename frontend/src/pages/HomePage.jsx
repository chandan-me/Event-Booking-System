import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Chip,
  Button,
  Card,
  CardContent,
  Stack,
  Divider,
} from '@mui/material';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import CurrencyRupeeIcon from '@mui/icons-material/CurrencyRupee';
import SecurityIcon from '@mui/icons-material/Security';
import FlashOnIcon from '@mui/icons-material/FlashOn';
import VerifiedIcon from '@mui/icons-material/Verified';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import SearchIcon from '@mui/icons-material/Search';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import QrCode2Icon from '@mui/icons-material/QrCode2';
import PaymentsIcon from '@mui/icons-material/Payments';
import CelebrationIcon from '@mui/icons-material/Celebration';
import StarIcon from '@mui/icons-material/Star';
import CampaignIcon from '@mui/icons-material/Campaign';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { useNavigate } from 'react-router-dom';
import { getCategories } from '../api/eventsApi';

const CATEGORY_SHOWCASE = [
  {
    slug: 'music-concerts',
    name: 'Music & Live Concerts',
    tagline: 'Stadium tours, acoustic evenings & rooftop jazz',
    icon: '🎵',
    gradient: 'linear-gradient(135deg, #4338ca 0%, #6366f1 50%, #818cf8 100%)',
    bg: '#f5f3ff',
    border: '#ddd6fe',
    badge: 'Trending Live',
  },
  {
    slug: 'tech-conferences',
    name: 'Tech & AI Summits',
    tagline: 'Multi-agent systems, cloud infra & founder keynotes',
    icon: '💻',
    gradient: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #38bdf8 100%)',
    bg: '#eff6ff',
    border: '#bfdbfe',
    badge: 'Popular in Bengaluru',
  },
  {
    slug: 'comedy-theatre',
    name: 'Standup Comedy & Theatre',
    tagline: 'Arena comedy specials, Broadway plays & improv tours',
    icon: '🎭',
    gradient: 'linear-gradient(135deg, #78350f 0%, #b45309 50%, #f59e0b 100%)',
    bg: '#fffbeb',
    border: '#fde68a',
    badge: 'Selling Fast',
  },
  {
    slug: 'food-nightlife',
    name: 'Food, Wine & Nightlife',
    tagline: 'Craft beer galas, masterclasses & culinary tours',
    icon: '🍷',
    gradient: 'linear-gradient(135deg, #831843 0%, #db2777 50%, #f472b6 100%)',
    bg: '#fef2f2',
    border: '#fecaca',
    badge: 'Curated Tastes',
  },
  {
    slug: 'arts-culture',
    name: 'Arts & Cultural Exhibitions',
    tagline: 'Sculpture exhibitions, heritage biennials & design expos',
    icon: '🎨',
    gradient: 'linear-gradient(135deg, #064e3b 0%, #059669 50%, #34d399 100%)',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    badge: 'Heritage & Modern',
  },
  {
    slug: 'sports-fitness',
    name: 'Sports & Marathons',
    tagline: 'City half-marathons, esports arenas & fitness summits',
    icon: '🏃',
    gradient: 'linear-gradient(135deg, #991b1b 0%, #ea580c 50%, #fb923c 100%)',
    bg: '#fff7ed',
    border: '#fed7aa',
    badge: 'High Energy',
  },
];

export const HomePage = () => {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const res = await getCategories();
      const rawCategories = res.data || [];
      const cleanCategories = rawCategories.filter(
        (c) => !/\d{3,}/.test(c.name) && !/\d{3,}/.test(c.slug)
      );
      setCategories(cleanCategories);
    } catch (err) {
      console.error('Failed to load categories', err);
    }
  };

  const handleCategoryClick = (categorySlug) => {
    // Look up category ID from loaded categories if available
    const matched = categories.find((c) => c.slug === categorySlug);
    if (matched) {
      navigate(`/events?category=${matched.id}`);
    } else {
      navigate(`/events?search=${encodeURIComponent(categorySlug.replace('-', ' '))}`);
    }
  };

  return (
    <Box sx={{ pb: 12, bgcolor: '#ffffff', minHeight: '100vh', overflowX: 'hidden' }}>
      {/* 1. Ultra-Interactive Hero Section */}
      <Box
        sx={{
          position: 'relative',
          pt: { xs: 8, md: 11 },
          pb: { xs: 8, md: 12 },
          background: 'radial-gradient(ellipse 90% 60% at 50% -10%, #f1f5f9 0%, #ffffff 100%)',
          borderBottom: '1px solid #e2e8f0',
          textAlign: 'center',
          overflow: 'hidden',
        }}
      >
        {/* Subtle Ambient Background Orbs */}
        <Box
          sx={{
            position: 'absolute',
            top: '10%',
            left: '15%',
            width: 320,
            height: 320,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(37,99,235,0.08) 0%, rgba(255,255,255,0) 70%)',
            filter: 'blur(40px)',
            pointerEvents: 'none',
          }}
        />
        <Box
          sx={{
            position: 'absolute',
            top: '20%',
            right: '15%',
            width: 360,
            height: 360,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, rgba(255,255,255,0) 70%)',
            filter: 'blur(50px)',
            pointerEvents: 'none',
          }}
        />

        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 1 }}>
          {/* Live Status Pill */}
          <Chip
            icon={<AutoAwesomeIcon sx={{ fontSize: '14px !important', color: '#2563eb !important' }} />}
            label="India's Premier Live Ticketing Platform • Instant QR Passes"
            sx={{
              mb: 3,
              px: 1.75,
              py: 0.6,
              bgcolor: '#ffffff',
              color: '#0f172a',
              border: '1.5px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(15, 23, 42, 0.04)',
              fontWeight: 800,
              fontSize: 12.5,
              letterSpacing: '0.01em',
            }}
          />

          {/* Impact Headline */}
          <Typography
            variant="h1"
            sx={{
              fontWeight: 900,
              fontSize: { xs: '2.5rem', sm: '3.6rem', md: '4.4rem' },
              lineHeight: 1.1,
              mb: 2.5,
              color: '#0f172a',
              letterSpacing: '-0.035em',
              maxWidth: 960,
              mx: 'auto',
            }}
          >
            Unforgettable Experiences,{' '}
            <Box
              component="span"
              sx={{
                background: 'linear-gradient(135deg, #2563eb 0%, #7c3aed 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              Reserved in Seconds.
            </Box>
          </Typography>

          {/* Subtitle */}
          <Typography
            variant="h6"
            sx={{
              color: '#64748b',
              fontWeight: 400,
              mb: 5,
              mx: 'auto',
              maxWidth: 680,
              fontSize: { xs: '1.05rem', md: '1.25rem' },
              lineHeight: 1.55,
            }}
          >
            From stadium rock concerts and national comedy arenas to world-class tech summits and culinary festivals — discover upcoming events and book with verified atomic reservations.
          </Typography>

          {/* Explore CTA Button */}
          <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 3 }}>
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/events')}
              endIcon={<ArrowForwardIcon />}
              sx={{
                px: 4,
                py: 1.4,
                bgcolor: '#0f172a',
                color: '#ffffff',
                borderRadius: 2.5,
                fontWeight: 800,
                fontSize: 15,
                textTransform: 'none',
                boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.25)',
                transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                '&:hover': {
                  bgcolor: '#1e293b',
                  transform: 'translateY(-2px)',
                  boxShadow: '0 12px 28px -4px rgba(15, 23, 42, 0.35)',
                },
              }}
            >
              Explore All Events
            </Button>
          </Box>

          {/* 4 Trust Value Props Row */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'center',
              flexWrap: 'wrap',
              gap: { xs: 2.5, sm: 4.5 },
              mt: 5,
              color: '#475569',
              fontSize: 13.5,
              fontWeight: 700,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <VerifiedIcon sx={{ fontSize: 18, color: '#059669' }} />
              100% Genuine Verified Tickets
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FlashOnIcon sx={{ fontSize: 18, color: '#f59e0b' }} />
              Instant Razorpay UPI & Cards
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <SecurityIcon sx={{ fontSize: 18, color: '#0284c7' }} />
              Atomic Double-Booking Protection
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <QrCode2Icon sx={{ fontSize: 18, color: '#7c3aed' }} />
              Offline Digital QR Passes
            </Box>
          </Box>
        </Container>
      </Box>

      {/* 2. Interactive Platform Pulse & Live Stats Bar */}
      <Container maxWidth="lg" sx={{ mt: -4, mb: 10, position: 'relative', zIndex: 2 }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, 1fr)',
              md: 'repeat(4, 1fr)',
            },
            gap: 3,
          }}
        >
          {[
            { label: 'Verified Attendees', value: '50,000+', desc: 'Happy fans & attendees nationwide', icon: '🎟️' },
            { label: 'Live Stages & Arenas', value: '1,200+', desc: 'Concert halls, tech parks & stadiums', icon: '🏟️' },
            { label: 'Booking Availability', value: '99.9%', desc: 'Real-time atomic seat concurrency', icon: '⚡' },
            { label: 'Zero Hidden Fees', value: '₹0 Markup', desc: 'Transparent INR pricing with Razorpay', icon: '💳' },
          ].map((stat, i) => (
            <Box
              key={i}
              sx={{
                p: 3,
                bgcolor: '#ffffff',
                borderRadius: 3.5,
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 24px -4px rgba(15, 23, 42, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                transition: 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  borderColor: '#cbd5e1',
                  boxShadow: '0 16px 32px -4px rgba(15, 23, 42, 0.1)',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="caption" sx={{ fontWeight: 800, color: '#64748b', letterSpacing: '0.04em', textTransform: 'uppercase', fontSize: 11 }}>
                  {stat.label}
                </Typography>
                <Typography sx={{ fontSize: 20 }}>{stat.icon}</Typography>
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.02em', mb: 0.5 }}>
                {stat.value}
              </Typography>
              <Typography variant="caption" sx={{ color: '#64748b', fontSize: 12 }}>
                {stat.desc}
              </Typography>
            </Box>
          ))}
        </Box>
      </Container>

      {/* 3. Interactive Category Showcase ("Choose Your Atmosphere") */}
      <Container maxWidth="lg" sx={{ mb: 12 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, mb: 1 }}>
            <CelebrationIcon sx={{ color: '#2563eb', fontSize: 20 }} />
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#2563eb', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              CHOOSE YOUR ATMOSPHERE
            </Typography>
          </Box>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Curated Event Channels
          </Typography>
          <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 600, mx: 'auto' }}>
            Click any experience channel to view upcoming live dates, venues, and ticket passes.
          </Typography>
        </Box>

        {/* 3-Column Grid for Category Channels */}
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 3.5,
          }}
        >
          {CATEGORY_SHOWCASE.map((cat) => (
            <Card
              key={cat.slug}
              onClick={() => handleCategoryClick(cat.slug)}
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 3.5,
                border: '1.5px solid #e2e8f0',
                cursor: 'pointer',
                overflow: 'hidden',
                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                '&:hover': {
                  transform: 'translateY(-6px)',
                  borderColor: '#cbd5e1',
                  boxShadow: '0 20px 35px -8px rgba(15, 23, 42, 0.12)',
                  '& .category-arrow': {
                    transform: 'translateX(4px)',
                    color: '#0f172a',
                  },
                },
              }}
            >
              {/* Visual Header */}
              <Box
                sx={{
                  height: 120,
                  background: cat.gradient,
                  p: 2.5,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Chip
                    size="small"
                    label={cat.badge}
                    sx={{
                      bgcolor: 'rgba(255, 255, 255, 0.92)',
                      color: '#0f172a',
                      fontWeight: 800,
                      fontSize: 11,
                      backdropFilter: 'blur(6px)',
                    }}
                  />
                  <Box
                    sx={{
                      width: 36,
                      height: 36,
                      borderRadius: '50%',
                      bgcolor: 'rgba(255, 255, 255, 0.2)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 18,
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    {cat.icon}
                  </Box>
                </Box>

                <Typography variant="h6" sx={{ color: '#ffffff', fontWeight: 800, fontSize: '1.15rem', textShadow: '0 2px 4px rgba(0,0,0,0.3)' }}>
                  {cat.name}
                </Typography>
              </Box>

              {/* Card Content */}
              <CardContent sx={{ p: 3, flexGrow: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ color: '#64748b', mb: 3, lineHeight: 1.5 }}>
                  {cat.tagline}
                </Typography>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px solid #f1f5f9' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a', fontSize: 13.5 }}>
                    Explore Live Events
                  </Typography>
                  <ArrowForwardIcon
                    className="category-arrow"
                    sx={{ fontSize: 18, color: '#64748b', transition: 'all 0.2s ease' }}
                  />
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      </Container>

      {/* 4. Interactive "How It Works" 3-Step Journey */}
      <Box sx={{ bgcolor: '#f8fafc', py: 12, borderTop: '1px solid #e2e8f0', borderBottom: '1px solid #e2e8f0', mb: 12 }}>
        <Container maxWidth="lg">
          <Box sx={{ textAlign: 'center', mb: 7 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#2563eb', letterSpacing: '0.06em', textTransform: 'uppercase', mb: 1 }}>
              SMOOTH & GUARANTEED
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              How Ticketing Works on EventFlow
            </Typography>
            <Typography variant="body1" sx={{ color: '#64748b', mt: 1, maxWidth: 580, mx: 'auto' }}>
              Built for speed and reliability with zero queue wait times and instant verification.
            </Typography>
          </Box>

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: {
                xs: '1fr',
                sm: 'repeat(3, 1fr)',
                md: 'repeat(3, 1fr)',
              },
              gap: 4,
            }}
          >
            {[
              {
                step: '01',
                title: 'Discover & Select Stage',
                desc: 'Explore curated upcoming concerts, tech summits, or standup comedy. Check live availability in real-time.',
                icon: <SearchIcon sx={{ fontSize: 28, color: '#2563eb' }} />,
                pill: 'Live Calendar',
              },
              {
                step: '02',
                title: 'Instant INR Checkout',
                desc: 'Lock your seats with concurrency-safe atomic reservation. Pay instantly using Razorpay UPI, Cards, or NetBanking.',
                icon: <PaymentsIcon sx={{ fontSize: 28, color: '#059669' }} />,
                pill: 'Zero Markup',
              },
              {
                step: '03',
                title: 'Scan Offline QR at Gate',
                desc: 'Receive immediate digital ticket passes with fraud-proof QR codes. Walk through event venue turnstiles effortlessly.',
                icon: <QrCode2Icon sx={{ fontSize: 28, color: '#7c3aed' }} />,
                pill: 'Instant Pass',
              },
            ].map((s, index) => (
              <Box
                key={s.step}
                onClick={() => setActiveStep(index)}
                sx={{
                  p: 4,
                  height: '100%',
                  bgcolor: activeStep === index ? '#ffffff' : '#ffffff',
                  borderRadius: 4,
                  border: '1.5px solid',
                  borderColor: activeStep === index ? '#0f172a' : '#e2e8f0',
                  boxShadow: activeStep === index
                    ? '0 16px 36px -4px rgba(15, 23, 42, 0.12)'
                    : '0 4px 16px -2px rgba(15, 23, 42, 0.03)',
                  transition: 'all 0.25s ease',
                  cursor: 'pointer',
                  '&:hover': {
                    borderColor: '#0f172a',
                    transform: 'translateY(-4px)',
                  },
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Box
                    sx={{
                      width: 52,
                      height: 52,
                      borderRadius: 3,
                      bgcolor: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {s.icon}
                  </Box>
                  <Chip
                    label={`Step ${s.step}`}
                    size="small"
                    sx={{
                      bgcolor: activeStep === index ? '#0f172a' : '#f1f5f9',
                      color: activeStep === index ? '#ffffff' : '#64748b',
                      fontWeight: 800,
                      fontSize: 11,
                    }}
                  />
                </Box>

                <Typography variant="h5" sx={{ fontWeight: 800, color: '#0f172a', mb: 1.5, fontSize: '1.25rem' }}>
                  {s.title}
                </Typography>

                <Typography variant="body2" sx={{ color: '#64748b', lineHeight: 1.6 }}>
                  {s.desc}
                </Typography>
              </Box>
            ))}
          </Box>
        </Container>
      </Box>

      {/* 5. Interactive Organizer Section ("Host on EventFlow") */}
      <Container maxWidth="lg" sx={{ mb: 12 }}>
        <Box
          sx={{
            p: { xs: 4, md: 6 },
            borderRadius: 5,
            bgcolor: '#0f172a',
            color: '#ffffff',
            position: 'relative',
            overflow: 'hidden',
            boxShadow: '0 24px 48px -12px rgba(15, 23, 42, 0.25)',
          }}
        >
          {/* Ambient Glow */}
          <Box
            sx={{
              position: 'absolute',
              top: -60,
              right: -60,
              width: 300,
              height: 300,
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(37,99,235,0.4) 0%, rgba(37,99,235,0) 70%)',
              pointerEvents: 'none',
            }}
          />

          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr', md: '1.25fr 0.75fr' },
              gap: 4,
              alignItems: 'center',
              position: 'relative',
              zIndex: 1,
            }}
          >
            <Box>
              <Chip
                label="FOR EVENT CREATORS & VENUES"
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.15)',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: 11,
                  letterSpacing: '0.04em',
                  mb: 2,
                }}
              />
              <Typography variant="h3" sx={{ fontWeight: 900, mb: 2, fontSize: { xs: '2rem', md: '2.8rem' }, lineHeight: 1.15 }}>
                Host Your Live Experience on EventFlow
              </Typography>
              <Typography variant="body1" sx={{ color: '#94a3b8', mb: 3, maxWidth: 540, lineHeight: 1.6 }}>
                Publish your concerts, summits, and workshops with custom seat tiers, live revenue analytics, atomic concurrency locks, and high-speed QR check-ins.
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 4 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#38bdf8' }} />
                  <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                    Instant INR payouts via Razorpay Route & Webhooks
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#38bdf8' }} />
                  <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                    Real-time attendee rosters and live gate telemetry
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
                  <CheckCircleIcon sx={{ fontSize: 18, color: '#38bdf8' }} />
                  <Typography variant="body2" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                    Zero double-booking guarantee with Redis & MySQL atomic locks
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                <Button
                  variant="contained"
                  onClick={() => navigate('/register/organiser')}
                  sx={{
                    bgcolor: '#ffffff',
                    color: '#0f172a',
                    px: 3.5,
                    py: 1.25,
                    borderRadius: 2.5,
                    fontWeight: 800,
                    textTransform: 'none',
                    fontSize: 14.5,
                    '&:hover': { bgcolor: '#f1f5f9' },
                  }}
                >
                  Create Organizer Account
                </Button>
                <Button
                  variant="outlined"
                  onClick={() => navigate('/events')}
                  sx={{
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    color: '#ffffff',
                    px: 3.5,
                    py: 1.25,
                    borderRadius: 2.5,
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: 14.5,
                    '&:hover': { borderColor: '#ffffff', bgcolor: 'rgba(255, 255, 255, 0.05)' },
                  }}
                >
                  Browse What's Live
                </Button>
              </Box>
            </Box>

            <Box>
              <Box
                sx={{
                  p: 3.5,
                  borderRadius: 4,
                  bgcolor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  backdropFilter: 'blur(10px)',
                }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#38bdf8', mb: 2, letterSpacing: '0.04em' }}>
                  ⚡ LIVE ORGANIZER METRICS
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>Gate Check-in Speed</Typography>
                  <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 800 }}>&lt; 0.4s / scan</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>Razorpay Settlement</Typography>
                  <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 800 }}>T+1 Automated</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>Ticket Fraud Prevention</Typography>
                  <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 800 }}>HMAC-SHA256 Signed</Typography>
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', py: 1.5 }}>
                  <Typography variant="body2" sx={{ color: '#94a3b8' }}>Cluster Concurrency</Typography>
                  <Typography variant="body2" sx={{ color: '#ffffff', fontWeight: 800 }}>10,000 req/sec</Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>
      </Container>

      {/* 6. Attendee Feedback / Trust Spotlight */}
      <Container maxWidth="lg" sx={{ mb: 12 }}>
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#2563eb', letterSpacing: '0.06em', textTransform: 'uppercase', mb: 1 }}>
            ATTENDEE EXPERIENCES
          </Typography>
          <Typography variant="h3" sx={{ fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Loved by Fans & Professionals Across India
          </Typography>
        </Box>

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(3, 1fr)',
            },
            gap: 3.5,
          }}
        >
          {[
            {
              quote: 'Booked tickets for the Zakir Khan tour in Bengaluru. The Razorpay UPI checkout was instant, and the digital QR worked without an internet connection at the gate!',
              author: 'Priya Sharma',
              role: 'Attendee • Bengaluru',
              stars: 5,
            },
            {
              quote: 'Organized our annual 1,200-seat AI Summit through EventFlow. The real-time seat reservation engine prevented any ticket collisions. Phenomenal platform!',
              author: 'Karthik Raman',
              role: 'Tech Summit Lead • Hyderabad',
              stars: 5,
            },
            {
              quote: 'Finding upcoming classical concerts and jazz festivals in Mumbai used to be chaotic. EventFlow made discovering and booking seats seamless and fast.',
              author: 'Ananya Deshmukh',
              role: 'Concertgoer • Mumbai',
              stars: 5,
            },
          ].map((item, idx) => (
            <Box
              key={idx}
              sx={{
                p: 3.5,
                height: '100%',
                bgcolor: '#ffffff',
                borderRadius: 3.5,
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px -4px rgba(15, 23, 42, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
              }}
            >
              <Box>
                <Box sx={{ display: 'flex', gap: 0.5, mb: 2 }}>
                  {[...Array(item.stars)].map((_, s) => (
                    <StarIcon key={s} sx={{ fontSize: 18, color: '#f59e0b' }} />
                  ))}
                </Box>
                <Typography variant="body2" sx={{ color: '#334155', lineHeight: 1.6, fontStyle: 'italic', mb: 3 }}>
                  "{item.quote}"
                </Typography>
              </Box>
              <Box sx={{ pt: 2, borderTop: '1px solid #f1f5f9' }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#0f172a' }}>
                  {item.author}
                </Typography>
                <Typography variant="caption" sx={{ color: '#64748b' }}>
                  {item.role}
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </Container>

      {/* 7. Grand Interactive Pre-Footer CTA */}
      <Container maxWidth="md">
        <Box
          sx={{
            py: 7,
            px: 4,
            borderRadius: 4,
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            textAlign: 'center',
            boxShadow: '0 20px 40px -8px rgba(15, 23, 42, 0.35)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Typography
            variant="h3"
            sx={{
              fontWeight: 900,
              mb: 2,
              fontSize: { xs: '2rem', md: '2.6rem' },
              color: '#ffffff !important',
              letterSpacing: '-0.025em',
            }}
          >
            Ready for Your Next Live Event?
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: '#cbd5e1 !important',
              mb: 4,
              maxWidth: 560,
              mx: 'auto',
              fontSize: { xs: 15, md: 16 },
              lineHeight: 1.6,
            }}
          >
            Browse upcoming live concerts, tech keynotes, standup tours, and masterclasses across India with instant confirmed bookings.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/events')}
            endIcon={<ArrowForwardIcon />}
            sx={{
              bgcolor: '#ffffff',
              color: '#0f172a',
              px: 4.5,
              py: 1.5,
              borderRadius: 2.5,
              fontWeight: 800,
              fontSize: 16,
              textTransform: 'none',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              '&:hover': {
                bgcolor: '#f1f5f9',
                transform: 'translateY(-2px)',
                boxShadow: '0 12px 28px rgba(0, 0, 0, 0.4)',
              },
            }}
          >
            Explore Upcoming Events Now
          </Button>
        </Box>
      </Container>
    </Box>
  );
};
