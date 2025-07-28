# Trae Backend - Modern Authentication System

NestJS tabanlı modern kimlik doğrulama sistemi backend'i.

## Özellikler

- 🔐 JWT tabanlı kimlik doğrulama
- 👤 Kullanıcı kayıt ve giriş sistemi
- 🛡️ Bcrypt ile şifre hashleme
- 🗄️ PostgreSQL veritabanı (Prisma ORM)
- 🔒 Role-based access control
- 🌐 CORS desteği

## Teknolojiler

- NestJS
- Prisma ORM
- PostgreSQL
- JWT
- Bcrypt
- Passport.js

## Render.com Deployment

### Otomatik Deployment

1. GitHub'a push edin
2. Render.com'da yeni Web Service oluşturun
3. GitHub repository'nizi bağlayın
4. `render.yaml` dosyası otomatik olarak deployment'ı yapılandıracak

### Environment Variables

Render.com'da şu environment variables'ları ayarlayın:
- `DATABASE_URL`: PostgreSQL connection string (otomatik)
- `JWT_SECRET`: JWT secret key (otomatik generate)
- `NODE_ENV`: production

## API Endpoints

### Authentication
- `POST /auth/register` - Kullanıcı kaydı
- `POST /auth/login` - Kullanıcı girişi
- `GET /auth/profile` - Kullanıcı profili (JWT gerekli)
- `GET /auth/me` - Mevcut kullanıcı bilgileri (JWT gerekli)

### Users
- `GET /users` - Tüm kullanıcıları listele (JWT gerekli)
- `POST /users` - Yeni kullanıcı oluştur (JWT gerekli)
- `DELETE /users/:id` - Kullanıcı sil (JWT gerekli)