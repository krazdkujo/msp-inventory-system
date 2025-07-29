# MSP Inventory System

A desktop Electron application for MSP (Managed Service Provider) inventory management with real-time Airtable synchronization, barcode scanning, and multi-client support with proper data isolation.

## 🚀 Features

### ✅ Implemented
- **Secure Authentication System** - Role-based access control (Admin, Technician, Read-only)
- **Encrypted Configuration** - Secure storage of Airtable credentials using electron-store
- **Airtable Integration** - Full CRUD operations for asset management
- **Multi-user Support** - User management with password policies and session handling
- **Modern UI** - React-based interface with responsive design
- **Security First** - Input validation, rate limiting, encrypted storage

### 🚧 In Development
- Client management with automatic table creation
- Asset listing and filtering interface
- Barcode scanning integration (USB scanners, Code 128)
- Comprehensive audit logging
- Auto-update system
- Testing framework

## 🏗️ Architecture

```
msp-inventory-system/
├── electron/           # Electron main process
│   ├── main.ts        # Main process and IPC handlers
│   └── preload.ts     # Secure IPC bridge
├── src/               # React renderer process
│   ├── components/    # React components
│   ├── services/      # Business logic services
│   ├── types/         # TypeScript type definitions
│   └── styles/        # CSS styles
├── public/            # Static assets
└── dist/              # Build output
```

## 🔧 Technology Stack

- **Frontend**: Electron + React 19 + TypeScript
- **Backend**: Node.js with Airtable API integration
- **Database**: Airtable (one base, tables per client)
- **Security**: Encrypted data transmission, secure API key storage
- **Build**: Webpack + TypeScript compiler
- **Package Management**: npm

## 📋 Prerequisites

- Node.js (v18+ recommended)
- npm or yarn
- Airtable account with Personal Access Token
- Airtable base for inventory data

## 🚀 Quick Start

### 1. Clone and Install
```bash
git clone https://github.com/yourusername/msp-inventory-system.git
cd msp-inventory-system
npm install
```

### 2. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` with your Airtable credentials:
```env
AIRTABLE_PAT=your_airtable_personal_access_token
AIRTABLE_BASE_ID=your_airtable_base_id
```

### 3. Development
```bash
# Start development server
npm run start:react

# In another terminal, start Electron
npm run start:electron

# Or run both concurrently
npm start
```

### 4. Build for Production
```bash
# Build React app
npm run build

# Build Electron main process
npm run build:electron

# Create distributable
npm run dist
```

## 🔐 Security Features

### Authentication
- **Password Requirements**: 8+ characters, mixed case, numbers, special characters
- **Rate Limiting**: 5 failed attempts = 15-minute lockout
- **Session Management**: 8-hour sessions with 2-hour inactivity timeout
- **Role-Based Access**: Admin, Technician, Read-only permissions

### Data Protection
- **Encrypted Storage**: All sensitive data encrypted with AES-256-GCM
- **Secure IPC**: Context isolation between main and renderer processes
- **Input Validation**: All user inputs sanitized and validated
- **No Data Mixing**: Strict client data isolation

### Default Credentials
- **Username**: `admin`
- **Password**: `admin123`
- ⚠️ **Change immediately after first login**

## 📊 Database Schema

### Standard Asset Fields
- Asset Tag (Primary Key, Barcode)
- Serial Number
- Make/Model
- Asset Type (Desktop, Laptop, Server, etc.)
- Location/Room
- Assigned User
- Purchase Date
- Warranty Expiration
- Status (Active, Retired, In Repair, Missing, Disposed)
- Notes
- Audit Trail (Created/Modified dates and users)

### Custom Fields Support
- Text fields
- Number fields
- Date fields
- Single/Multi-select dropdowns
- Checkbox fields
- Long text fields

## 🔧 Development

### Project Structure
```
src/
├── components/
│   ├── auth/          # Authentication components
│   ├── dashboard/     # Main dashboard components
│   ├── layout/        # Layout components
│   └── setup/         # Configuration setup
├── services/
│   ├── AuthService.ts       # User authentication
│   ├── ConfigService.ts     # App configuration
│   ├── SecurityService.ts   # Security utilities
│   └── AirtableService.ts   # Airtable integration
├── types/
│   ├── auth.ts        # Authentication types
│   └── electron.d.ts  # Electron API types
└── styles/
    └── global.css     # Global styles
```

### Available Scripts
- `npm start` - Start development with hot reload
- `npm run build` - Build React app for production
- `npm run build:electron` - Compile Electron main process
- `npm run start:react` - Start React dev server only
- `npm run start:electron` - Start Electron only
- `npm run dist` - Create distributable packages

## 🐛 Known Issues

1. **TypeScript Build**: Currently experiencing webpack compilation issues with TypeScript. The application structure is complete but needs build configuration fixes.

## 🛣️ Roadmap

### Phase 1: Foundation ✅
- [x] Electron application structure
- [x] Authentication system
- [x] Secure configuration
- [x] Airtable integration service

### Phase 2: Core Features 🚧
- [ ] Client management interface
- [ ] Asset CRUD operations
- [ ] Search and filtering
- [ ] Bulk operations

### Phase 3: Advanced Features
- [ ] Barcode scanning integration
- [ ] Audit logging system
- [ ] Custom field management
- [ ] Auto-update system

### Phase 4: Polish & Deploy
- [ ] Comprehensive testing
- [ ] Documentation
- [ ] Installer creation
- [ ] Code signing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/msp-inventory-system/issues)
- **Documentation**: See `/docs` folder (coming soon)
- **Email**: your-email@domain.com

## 🙏 Acknowledgments

- Built with [Electron](https://electronjs.org/)
- UI powered by [React](https://reactjs.org/)
- Data storage via [Airtable](https://airtable.com/)
- Icons from [Heroicons](https://heroicons.com/)

---

**⚠️ Security Notice**: This application handles sensitive inventory data. Always use HTTPS, keep dependencies updated, and follow security best practices in production deployments.