# 🏠 MYES.GLOBAL - Global Real Estate Platform

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb)](https://reactjs.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)

Modern cryptocurrency-powered real estate platform with integrated rental system, payment processing, and AI assistance.

## 🌟 Features

### Real Estate Platform
- 🏢 **Property Listings** - Buy/sell real estate with cryptocurrency
- 💎 **Crypto Payments** - BTC, ETH, USDT, USDC support via LovePay
- 🔐 **KYC Verification** - Veriff integration for realtors
- 💬 **Real-time Chat** - Ably-powered messaging system
- 📊 **Analytics** - Comprehensive property and sales analytics
- 🤝 **Referral Program** - 0.35% commission for buyers

### 🆕 Rental System
- 🏠 **Short-term Rentals** - List properties worldwide
- 📅 **Smart Booking** - Real-time availability checking
- 💰 **7% Commission** - Automatic calculation
- 🗺️ **Google Maps** - Interactive location selection
- 🔒 **Secure Escrow** - Protected payments
- 🌍 **Multi-language** - Russian & English

### Admin Systems
- 👨‍💼 **MYES Admin** - Full platform administration
- 💳 **LovePay** - Payment processing system
- ⚖️ **Lawyer Support** - Legal transaction assistance
- 📈 **CRM** - Customer relationship management

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- Supabase account
- Google Maps API key (for maps)
- Ably API key (for chat)
- OpenAI API key (for AI assistant)

### Installation

```bash
# Clone repository
git clone https://github.com/zevsoboggs/myes-global.git
cd myes-global

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Edit .env with your keys
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_anon_key
# VITE_GOOGLE_MAPS_API_KEY=your_maps_key
# VITE_ABLY_API_KEY=your_ably_key

# Run database migrations
supabase db push

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 🗂️ Project Structure

```
myes-global/
├── src/
│   ├── components/      # Reusable UI components
│   ├── contexts/        # React contexts (Auth, Language, Loading)
│   ├── hooks/           # Custom React hooks
│   ├── lib/             # Utilities and API functions
│   ├── pages/           # Application pages (50+)
│   └── main.tsx         # Application entry point
├── supabase/
│   ├── migrations/      # Database migrations (60+)
│   └── functions/       # Edge Functions (5)
├── public/              # Static assets
└── package.json
```

## 💾 Database

### Main Tables (50+)

**Core:**
- `profiles` - User profiles (buyer, realtor, lawyer, lovepay, admin)
- `properties` - Real estate properties for sale
- `rental_properties` - Short-term rental properties

**Sales & Payments:**
- `sales_requests` - Purchase requests
- `invoices` - Payment invoices
- `sales_commissions` - Realtor commissions
- `payouts` - Payout management

**Rental System:**
- `rental_bookings` - Rental reservations
- `rental_invoices` - Rental payments
- `rental_unavailability` - Blocked dates
- `rental_owner_payouts` - Owner earnings

**Social & Communication:**
- `conversations` - Chat conversations
- `messages` - Chat messages
- `notifications` - User notifications
- `feed_posts` - Social feed

**And many more...**

## 🔧 Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **React Router** - Navigation
- **Google Maps API** - Maps & geocoding
- **Lucide React** - Icons

### Backend
- **Supabase** - Backend-as-a-Service
  - PostgreSQL database
  - Authentication & authorization
  - File storage
  - Realtime subscriptions
  - Edge Functions

### Integrations
- **Ably** - Real-time messaging
- **OpenAI GPT-4** - AI chat assistant
- **Veriff** - KYC verification
- **CoinGecko** - Crypto prices

## 📚 Key Modules

### 1. Main Platform (MYES)
- Property catalog and search
- Favorites and comparison
- Chat system
- Property showings
- Analytics and reporting

### 2. LovePay (Payment System)
- Purchase request management
- Document verification
- Commission calculations
- Realtor payouts
- Audit logging

### 3. MYES Admin (Admin Panel)
- User management
- Property moderation
- Financial reporting
- System settings
- Content moderation

### 4. Rental System
- Short-term property listings
- Real-time booking with availability check
- 7% platform commission
- Owner payout management
- Guest reviews

## 🔒 Security

- **Row Level Security (RLS)** on all tables
- **JWT Authentication** via Supabase
- **Role-based access control**
- **Veriff KYC** verification
- **RSA-2048** partner certificates
- **Digital signatures** for documents

## 🌍 Multi-language Support

- 🇷🇺 Russian
- 🇬🇧 English

## 📖 Documentation

### General
- `About.MD` - Project overview (Russian)
- `AI_CHAT_WIDGET_README.md` - AI assistant documentation
- `API_EXAMPLES.md` - API integration examples
- `DEPLOYMENT_GUIDE.md` - Deployment instructions

### Rental System
- `RENTAL_ГОТОВО.md` - Complete guide (Russian)
- `RENTAL_QUICK_START.md` - Quick start guide
- `RENTAL_SYSTEM_README.md` - API documentation
- `НАЧАТЬ_ЗДЕСЬ.md` - Getting started (Russian)

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Deploy to Vercel/Netlify

```bash
# Vercel
vercel deploy

# Netlify
netlify deploy --prod
```

### Deploy Supabase Functions

```bash
supabase functions deploy ai-assistant
supabase functions deploy crypto-prices
supabase functions deploy properties-api
supabase functions deploy veriff-session
supabase functions deploy veriff-webhook
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/)
- Backend by [Supabase](https://supabase.com/)
- Maps by [Google Maps Platform](https://developers.google.com/maps)
- AI by [OpenAI](https://openai.com/)
- Real-time by [Ably](https://ably.com/)

## 📞 Support

For issues and questions:
- GitHub Issues: [Create an issue](https://github.com/zevsoboggs/myes-global/issues)
- Email: support@myes.global

---

**Made with ❤️ for the global real estate market**

🤖 *Developed with assistance from [Claude Code](https://claude.com/claude-code)*
