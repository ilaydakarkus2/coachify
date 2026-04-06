# Coachify - Mentor Payment Panel

A simple Next.js application for managing mentor payments and invoices.

## Features

- **Admin Panel**: Manage mentors, packages, and invoices
- **Customer Panel**: Browse mentors, create invoices, and view payment history
- **Invoice Management**: Create, track, and print invoices
- **Role-based Access**: Admin and Customer roles
- **Responsive Design**: Works on mobile, tablet, and desktop

## Tech Stack

- **Frontend**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: NextAuth.js
- **Password Hashing**: bcryptjs

## Getting Started

### Prerequisites

- Node.js 18+ installed
- PostgreSQL database (Supabase recommended)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd coachify
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` file with your database credentials:
```env
DATABASE_URL="postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret-key-change-this-in-production"
```

4. Set up the database:
```bash
npx prisma generate
npx prisma db push
npm run db:seed
```

5. Run the development server:
```bash
npm run dev
```

6. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Demo Accounts

### Admin
- Email: `admin@coachify.com`
- Password: `admin123`

### Customer
- Email: `customer@test.com`
- Password: `customer123`

## Project Structure

```
src/
├── app/
│   ├── (auth)/
│   │   └── login/           # Login page
│   ├── (admin)/
│   │   ├── mentors/         # Admin mentor management
│   │   ├── packages/        # Admin package management
│   │   └── invoices/        # Admin invoice management
│   ├── (customer)/
│   │   ├── mentors/         # Customer mentor browsing
│   │   ├── create-invoice/  # Create new invoice
│   │   └── invoices/        # Customer invoice history
│   └── api/
│       ├── auth/            # NextAuth API
│       ├── admin/           # Admin API routes
│       └── customer/        # Customer API routes
├── components/              # Reusable components
├── lib/
│   ├── auth.ts             # NextAuth configuration
│   └── prisma.ts           # Prisma client
└── types/                  # TypeScript types
```

## Database Schema

The application uses the following main models:

- **User**: Admin and Customer accounts
- **Mentor**: Mentor profiles
- **Package**: Pricing packages for mentorship
- **Invoice**: Payment invoices

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run db:push` - Push database schema
- `npm run db:seed` - Seed database with demo data
- `npm run prisma:generate` - Generate Prisma client

## Deployment

### Netlify

1. Build the project:
```bash
npm run build
```

2. Deploy to Netlify and set environment variables in the Netlify dashboard.

### Vercel

The easiest way to deploy is using [Vercel](https://vercel.com/new):

```bash
vercel
```

## Development Notes

- The application uses server-side authentication with NextAuth.js
- All API routes are protected with session checks
- Invoices can be printed using the browser's print functionality
- The database schema can be modified and pushed with `npx prisma db push`

## License

This project is licensed under the MIT License.