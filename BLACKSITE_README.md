# Blacksite - Anonymous Post Rooms

**Privacy-first anonymous posting platform for ephemeral discussions**

## 🚀 Features (MVP)

- **Anonymous Rooms**: Create and join rooms using simple codes (e.g., `ABCD-1234`)
- **Real-time Posting**: Share text and media with instant updates
- **No Accounts Required**: Choose any display name per room
- **Owner Controls**: Room creators get moderation tools via owner tokens
- **Dark/Light Themes**: Sleek techy aesthetic with neon accents
- **Privacy First**: No long-term data storage, ephemeral by design

## 🎯 Current Status

**✅ Completed (Frontend)**
- Beautiful techy UI with dark/light mode
- Home page with create/join room CTAs
- Room creation modal with all options (title, description, expiry, password)
- Room join flow with code validation
- Room interface with post composer and feed
- Responsive design for mobile/desktop

**⏳ Requires Backend Integration**
- Database operations (create/join rooms)
- Real-time post updates
- Media upload and storage
- User sessions and owner tokens
- Moderation systems

## 🔧 Tech Stack

- **Frontend**: React 18 + TypeScript + Tailwind CSS
- **Components**: shadcn/ui with custom techy variants
- **Routing**: React Router v6
- **State**: React Query + React hooks
- **Theming**: next-themes with custom design system
- **Backend**: Supabase (Postgres + Realtime + Storage)

## 🎨 Design System

The app uses a custom techy aesthetic with:
- **Primary Color**: Neon green (`#00D9A3`) 
- **Typography**: Mix of sans-serif and monospace fonts
- **Effects**: Subtle neon glows and smooth transitions
- **Layout**: Clean, minimal with high contrast

### Button Variants
- `neon`: Primary action buttons with glow effect
- `neon-outline`: Secondary actions with border glow
- `tech`: Monospace buttons for technical elements

## 🚀 Getting Started

1. **Clone and install**:
   ```bash
   npm install
   npm run dev
   ```

2. **Connect Supabase** (Required for backend features):
   - Click the Supabase button in Lovable interface
   - Set up database tables (see schema below)
   - Configure storage for media uploads

3. **Database Schema** (for Supabase setup):
   ```sql
   -- Rooms
   CREATE TABLE rooms (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     code varchar(9) UNIQUE NOT NULL,
     title varchar(255) NOT NULL,
     description text,
     owner_token_hash varchar(255) NOT NULL,
     is_ephemeral boolean DEFAULT false,
     expiry_at timestamp,
     password_hash varchar(255),
     created_at timestamp DEFAULT now(),
     updated_at timestamp DEFAULT now()
   );

   -- Posts
   CREATE TABLE posts (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     room_id uuid REFERENCES rooms(id) ON DELETE CASCADE,
     author_display varchar(25) NOT NULL,
     content text NOT NULL,
     media jsonb DEFAULT '[]'::jsonb,
     pinned boolean DEFAULT false,
     created_at timestamp DEFAULT now(),
     edited_at timestamp,
     deleted_at timestamp
   );

   -- Comments
   CREATE TABLE comments (
     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
     post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
     parent_comment_id uuid REFERENCES comments(id) ON DELETE CASCADE,
     author_display varchar(25) NOT NULL,
     content text NOT NULL,
     created_at timestamp DEFAULT now(),
     deleted_at timestamp
   );
   ```

## 📋 Implementation Roadmap

### Phase 1: Core Backend (Next)
- [ ] Supabase integration setup
- [ ] Room creation/joining API endpoints
- [ ] Post creation with real-time updates
- [ ] Basic session management
- [ ] Owner token authentication

### Phase 2: Media & Moderation
- [ ] Media upload (images/videos)
- [ ] Automated content moderation
- [ ] Report system
- [ ] Owner moderation tools

### Phase 3: Advanced Features
- [ ] QR code room joining
- [ ] Room analytics for owners
- [ ] Export room data
- [ ] Enhanced ephemeral modes

## 🔒 Privacy Features

- **Anonymous by Design**: No user accounts or persistent identity
- **Minimal Logging**: No IP storage beyond abuse prevention
- **Owner Tokens**: Secure room management without user accounts
- **Ephemeral Options**: Auto-delete content when rooms expire
- **Local Sessions**: Browser-only session tokens

## 🧪 Testing

Current implementation includes:
- Interactive room creation flow
- Responsive design testing
- Theme switching
- Mock data for UI development

For production testing after Supabase integration:
- End-to-end room creation → join → post flow
- Real-time updates across multiple browsers
- Media upload and display
- Owner moderation actions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is built for demonstration purposes. See LICENSE for details.

---

**Ready to go anonymous?** Create your first room and start posting without the overhead of user accounts!