# 🔗 VNChain Identity - Blockchain Identity Management System

A comprehensive blockchain-based identity verification system with KYC (Know Your Customer) capabilities, built with modern web technologies.

## 🌟 Features

- **🔐 Secure Authentication**: JWT-based auth with admin and user roles
- **📱 Modern UI**: Responsive React/Next.js frontend with Tailwind CSS
- **🤖 AI-Powered KYC**: CCCD (Vietnamese ID) OCR and face recognition
- **⛓️ Blockchain Integration**: Ethereum-based identity storage using Hardhat
- **👥 User Management**: Complete admin dashboard for user oversight
- **🔒 Data Security**: AES-256 encryption and zero-knowledge proof ready

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │    Backend      │    │  AI Services    │
│   (Next.js)     │◄──►│   (NestJS)      │◄──►│   (FastAPI)     │
│   Port: 5173    │    │   Port: 3000    │    │   Port: 8000    │
└─────────────────┘    └─────────────────┘    └─────────────────┘
         │                       │                       │
         │              ┌─────────────────┐              │
         │              │   Database      │              │
         └──────────────│  PostgreSQL +   │──────────────┘
                        │     Redis       │
                        │   Port: 5432    │
                        └─────────────────┘
                                 │
                        ┌─────────────────┐
                        │   Blockchain    │
                        │   (Hardhat)     │
                        │   Port: 8545    │
                        └─────────────────┘
```

## 🚀 Quick Start

### Prerequisites
- Node.js >= 18.0
- Python >= 3.9  
- Docker Desktop
- Git

### 1. Clone Repository
```bash
git clone https://github.com/Shima1704/Identity-Blockchain.git
cd Identity-Blockchain
```

### 2. Environment Setup
```bash
# Backend environment
cp backend/.env.example backend/.env

# Frontend environment  
cp frontend/.env.local.example frontend/.env.local

# AI Services environment
cp ai-services/.env.example ai-services/.env
```

### 3. Install Dependencies
```bash
# Backend
cd backend && npm install

# Frontend
cd ../frontend && npm install  

# Contracts
cd ../contracts && npm install

# AI Services
cd ../ai-services && pip install -r requirements.txt
```

### 4. Start Database
```bash
# Start PostgreSQL
docker run -d --name identity_postgres \
  -e POSTGRES_DB=identity_db \
  -e POSTGRES_USER=identity_user \
  -e POSTGRES_PASSWORD=identity_pass \
  -p 5432:5432 postgres:15-alpine

# Start Redis
docker run -d --name identity_redis \
  -p 6379:6379 redis:7-alpine
```

### 5. Start Services
```bash
# Terminal 1: Backend
cd backend && npm run start:dev

# Terminal 2: Frontend  
cd frontend && npm run dev

# Terminal 3: AI Services
cd ai-services && python main.py

# Terminal 4: Blockchain
cd contracts && npx hardhat node
```

## 🌐 Access URLs

| Service | URL | Description |
|---------|-----|-------------|
| **User Portal** | http://localhost:5173 | Main application |
| **Admin Panel** | http://localhost:5173/admin | Admin dashboard |
| **Backend API** | http://localhost:3000/api | REST API |
| **API Documentation** | http://localhost:3000/api/docs | Swagger docs |
| **AI Services** | http://localhost:8000 | OCR & Face Recognition |
| **AI Docs** | http://localhost:8000/docs | FastAPI docs |

## 🔐 Default Credentials

### Admin Access
- **Username**: `admin`
- **Password**: `admin@123`
- **URL**: http://localhost:5173 (login redirects to admin panel)

## 📱 User Flow

1. **Registration**: Create account with phone/email
2. **CCCD Verification**: Upload Vietnamese ID card images
3. **Face Recognition**: Complete biometric verification  
4. **KYC Complete**: Access full features
5. **Dashboard**: View identity status and manage account

## 🛠️ Tech Stack

### Frontend
- **Framework**: Next.js 15+ with React
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State**: Zustand
- **TypeScript**: Full type safety

### Backend  
- **Framework**: NestJS with Express
- **Database**: PostgreSQL + Redis
- **Auth**: JWT with Passport
- **Validation**: Class Validator
- **Documentation**: Swagger/OpenAPI

### AI Services
- **Framework**: FastAPI with Python
- **OCR**: EasyOCR for Vietnamese text
- **Face Recognition**: OpenCV + DeepFace
- **Image Processing**: Pillow

### Blockchain
- **Framework**: Hardhat with Ethereum
- **Contracts**: Solidity smart contracts  
- **Network**: Local development node
- **Integration**: ethers.js

## 📋 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User/Admin login
- `GET /api/auth/me` - Get current user

### KYC Process
- `POST /api/kyc/cccd/scan` - CCCD OCR processing
- `POST /api/kyc/face/verify` - Face verification
- `POST /api/kyc/complete` - Complete KYC process
- `GET /api/kyc/status` - Check KYC status

### Admin Management
- `GET /api/admin/dashboard` - Dashboard stats
- `GET /api/admin/users` - List all users
- `GET /api/admin/users/:id` - User details
- `GET /api/admin/blockchain` - Blockchain records

## 🗄️ Database Schema

### Users Table
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY,
  first_name VARCHAR(100),
  last_name VARCHAR(100), 
  phone VARCHAR(20),
  email VARCHAR(255),
  password_hash VARCHAR(255),
  role VARCHAR(20) DEFAULT 'user',
  kyc_status VARCHAR(20) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);
```

### Identities Table  
```sql
CREATE TABLE identities (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  cccd_number VARCHAR(20),
  full_name VARCHAR(255),
  date_of_birth DATE,
  blockchain_hash VARCHAR(66),
  verification_status VARCHAR(20),
  created_at TIMESTAMP DEFAULT NOW()
);
```

## 🧪 Testing

### Manual Testing
```bash
# Test admin login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"phoneOrEmail": "admin", "password": "admin@123"}'

# Test user registration
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"firstName": "Test", "lastName": "User", "phone": "0987654321", "password": "test123"}'
```

### Health Checks
- Backend: http://localhost:3000/api/auth/me (requires auth)
- AI Services: http://localhost:8000/health
- Frontend: http://localhost:5173

## 📦 Deployment

### Docker Compose (Production)
```bash
# Build and start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Environment Variables
Refer to `.env.example` files in each service directory for required configuration.

## 🔧 Development

### Database Reset
```bash
# Clear user data but keep structure
docker exec -it identity_postgres psql -U identity_user -d identity_db -c \
  "DELETE FROM identities; DELETE FROM users WHERE role != 'admin';"

# Clear uploaded files
rm -rf backend/src/uploads/cccd/*
rm -rf ai-services/uploads/cccd/*
```

### Adding New Features
1. Backend: Add controllers in `src/modules/`
2. Frontend: Add components in `src/components/`
3. AI: Add endpoints in `main.py`
4. Database: Update entities in `src/database/entities/`

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)  
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the [API documentation](http://localhost:3000/api/docs) when running locally

## 🚀 Built With

Made with ❤️ using modern web technologies:
- React & Next.js for amazing UX
- NestJS for robust backend architecture  
- FastAPI for high-performance AI services
- PostgreSQL for reliable data storage
- Ethereum blockchain for immutable identity records

---

**⭐ Star this repository if you find it helpful!**