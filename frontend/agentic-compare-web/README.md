This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### 1. Environment Setup

Before running the application, you need to configure the environment variables:

1. Copy the example environment file:
   ```bash
   cp .env.example .env.local
   ```

2. Edit `.env.local` and configure the backend URL:
   ```bash
   NEXT_PUBLIC_BACKEND_URL=http://localhost:8000
   ```

**Important Notes:**
- The `.env.local` file contains your environment variables and is automatically loaded by Next.js
- Environment variables prefixed with `NEXT_PUBLIC_` are exposed to the browser
- The `.env.local` file is gitignored by default for security
- If you change environment variables while the dev server is running, you must restart it

### 2. Install Dependencies

Install the required npm packages:

```bash
npm install
```

### 3. Run the Development Server

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Environment Variables

This project uses environment variables to configure the backend API connection.

### Available Variables

- `NEXT_PUBLIC_BACKEND_URL` - The URL of the FastAPI backend server (default: `http://localhost:8000`)
- `NEXT_PUBLIC_FRONTEND_URL` - The URL of the frontend application (default: `http://localhost:3000`)

### Configuration Files

- `.env.local` - Your local environment variables (not committed to git)
- `.env.example` - Template file showing required environment variables
- `.env` - Default environment file (if `.env.local` doesn't exist)

### Troubleshooting

If the frontend can't connect to the backend:
1. Verify the backend is running on the specified port (default: 8000)
2. Check that `NEXT_PUBLIC_BACKEND_URL` in `.env.local` matches your backend URL
3. Restart the Next.js dev server after changing environment variables
4. Check browser console for network errors

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
