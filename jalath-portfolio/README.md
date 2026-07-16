# Tharusha Naveendra — Dynamic Full-Stack Portfolio

A responsive, animated portfolio website built with Node.js, Express, EJS and a persistent JSON data store. It includes a public portfolio, live GitHub repositories, a secure admin dashboard, certificate uploads, project management and a working contact inbox.

## Main features

- Modern responsive design with animated background particles, scroll reveals, typewriter text and interactive cards
- Personal profile, education, technical skills, learning journey and project sections
- Live GitHub repository and account statistics through the GitHub API
- Admin dashboard for updating profile details, adding/editing/deleting projects and uploading certificates
- Certificate support for PDF, JPG, PNG and WEBP files
- Working contact form that stores enquiries in the admin inbox
- Rate limiting, secure session cookies, file validation, Helmet security headers and responsive accessibility support
- Dockerfile and Render configuration included

## Run locally

1. Install Node.js 18 or newer.
2. Open a terminal in this project folder.
3. Install dependencies:

```bash
npm install
```

4. Create your environment file:

```bash
cp .env.example .env
```

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

5. Edit `.env` and replace `SESSION_SECRET` and `ADMIN_PASSWORD`.
6. Start the site:

```bash
npm run dev
```

Open `http://localhost:3000`.

Admin dashboard: `http://localhost:3000/admin`

The development default password is `change-me-now`, but it must be changed before deployment.

## Updating the website

Use the admin dashboard to:

- Edit personal profile information
- Add or update project details
- Upload certificate images or PDF files
- Read messages sent through the contact form

Core skill percentages, focus areas and course lists are stored in `data/db.json` and can also be edited directly.

## GitHub live data

The website automatically retrieves public repository data from:

`tharushanaveendra831-creator`

The unauthenticated GitHub API has a lower request limit. An optional `GITHUB_TOKEN` can be added to `.env` to increase the limit.

## Deploy with Render

1. Create a new GitHub repository and upload this project.
2. In Render, create a Web Service from the repository or use the included `render.yaml`.
3. Add a strong `ADMIN_PASSWORD` environment variable.
4. Deploy.

Important: uploaded certificate/project files and `data/db.json` need persistent storage in production. On hosting platforms with an ephemeral filesystem, attach a persistent disk or connect the application to cloud storage/database services before relying on permanent uploads.

## Deploy with Docker

```bash
docker build -t tharusha-portfolio .
docker run -p 3000:3000 \
  -e SESSION_SECRET="replace-this-secret" \
  -e ADMIN_PASSWORD="replace-this-password" \
  tharusha-portfolio
```

## Project structure

```text
public/              CSS, JavaScript, profile photo and uploads
views/               EJS public and admin pages
data/db.json         Portfolio content and contact inbox
lib/store.js         Persistent JSON store helper
server.js            Express application and APIs
```

## Production recommendations

For a larger public deployment, move certificates, project images and contact messages to a managed service such as Cloudinary plus PostgreSQL/Supabase. Also use a production session store instead of the default in-memory session store.

## Windows npm registry repair

This package is configured to use the public npm registry. If a previous installation was interrupted, close editors and terminals that use this folder, then run `repair-install-windows.bat`.
