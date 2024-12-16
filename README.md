# GreenCrowd

**GreenCrowd** is a citizen science platform designed to collect georeferenced data through campaigns or global contributions. Built with [Next.js](https://nextjs.org/) and Prisma, it provides robust tools for user authentication, data collection, and campaign management.

## Features

- **Georeferenced Data Collection**:
  - Support for campaigns, sub-campaigns, and global contributions.
  - Flexible data entry types: photos, forms, instructions, and more.
  - Zones and points with geospatial data (PostGIS enabled).
- **Authentication**:
  - Integrated with Keycloak for user management.
  - Secure role-based access control.
- **Scalable Backend**:
  - Database migrations and schema management using Prisma.
  - PostgreSQL as the database engine.
- **Modern Frontend**:
  - Built with Next.js for a fast and responsive user experience.
  - Styled with Tailwind CSS for easy customization.
- **Storage Integration**:
  - Support for file uploads using MinIO.

## Prerequisites

Before running this project, ensure you have the following installed:

- Node.js (LTS version recommended)
- PostgreSQL
- MinIO (optional for file storage)
- Keycloak for authentication

You also need to configure your `.env` file with the required environment variables.

## Environment Variables

Configure the following environment variables in a `.env` file at the root of the project:

```
# Keycloak Configuration
KEYCLOAK_CLIENT_ID=[CLIENT_ID]
KEYCLOAK_CLIENT_SECRET=[CLIENT_SECRET]
KEYCLOAK_ISSUER_URL=https://[KEYCLOAK_URL]/auth/realms/[REALM]
KEYCLOAK_REALM=[REALM]

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=[YOUR_NEXTAUTH_SECRET]

# PostgreSQL Configuration
DATABASE_URL=postgresql://[USER]:[PASSWORD]@[HOST]:[PORT]/[DATABASE]

# MinIO Configuration (optional)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET_NAME=[BUCKET_NAME]
```

## Getting Started

1. **Install dependencies**:

   ```bash
   npm install
   ```

2. **Initialize Prisma**:

   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

3. **Run the development server**:

   ```bash
   npm run dev
   ```

4. **Visit the app**:
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
.
├── prisma/                 # Prisma schema and migrations
├── src/
│   ├── app/                # Next.js app directory
│   ├── components/         # Shared UI components
│   ├── pages/              # API routes and page components
│   ├── utils/              # Utility functions
│   └── ws/                 # WebSocket server
├── docker-compose.yml      # Docker configuration for the app
├── package.json            # Dependencies and scripts
└── README.md               # Project documentation
```

## Available Scripts

- `npm run dev` - Start the development server.
- `npm run build` - Build the app for production.
- `npm start` - Run the production server.
- `npm run lint` - Lint and fix files.
- `npx prisma studio` - Launch Prisma Studio to explore your database.

## Database Management with Prisma

This project uses Prisma for database schema management and migrations. The main models include:

- **User**: Stores user references from Keycloak.
- **Role**: Defines roles (e.g., admin, user).
- **Campaign**: Represents campaigns and sub-campaigns.
- **GeoLocation**: Stores geospatial data (zones and points).
- **DataEntry**: Captures user-submitted data.
- **Log**: Tracks system events.

### Running Migrations

After modifying the `prisma/schema.prisma` file, run:

```bash
npx prisma migrate dev --name [migration_name]
```

### Exploring Data

Use Prisma Studio to browse your database:

```bash
npx prisma studio
```

## Styling

The project uses **Tailwind CSS** for fast and consistent UI development. You can extend or customize styles in the `tailwind.config.js` file.

## Storage

File uploads are handled using MinIO. Ensure MinIO is running and properly configured via the environment variables.

# First Step: DB migration

Into docker container run the following command:

```bash
npm run migration:deploy
```
