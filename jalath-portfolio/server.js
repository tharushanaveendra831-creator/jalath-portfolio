require('dotenv').config();

const express = require('express');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs/promises');
const helmet = require('helmet');
const compression = require('compression');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const multer = require('multer');
const { readData, updateData } = require('./lib/store');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === 'production';

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.set('trust proxy', 1);

app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(compression());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public'), { maxAge: isProduction ? '7d' : 0 }));
app.use(session({
  name: 'portfolio_admin',
  secret: process.env.SESSION_SECRET || 'development-only-secret-change-this',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: 1000 * 60 * 60 * 6
  }
}));

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, message: 'Too many messages. Please try again later.' }
});

const uploadDir = path.join(__dirname, 'public', 'uploads');
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname).toLowerCase();
    const safeBase = path.basename(file.originalname, extension)
      .replace(/[^a-z0-9-_]/gi, '-')
      .replace(/-+/g, '-')
      .slice(0, 60) || 'upload';
    cb(null, `${Date.now()}-${safeBase}${extension}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error('Only PDF, JPG, PNG and WEBP files are allowed.'));
    }
    cb(null, true);
  }
});

function requireAdmin(req, res, next) {
  if (req.session?.isAdmin) return next();
  res.redirect('/admin/login');
}

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || crypto.randomUUID();
}

function cleanText(value, max = 2000) {
  return String(value || '').trim().slice(0, max);
}

function parseTechnologies(value) {
  return cleanText(value, 500)
    .split(',')
    .map(item => item.trim())
    .filter(Boolean)
    .slice(0, 15);
}

async function safeDeleteUpload(publicPath) {
  if (!publicPath || !publicPath.startsWith('/uploads/')) return;
  const target = path.join(__dirname, 'public', publicPath);
  try { await fs.unlink(target); } catch (_) { /* File may already be absent. */ }
}

app.get('/', async (_req, res, next) => {
  try {
    const data = await readData();
    res.render('index', { data, currentYear: new Date().getFullYear() });
  } catch (error) { next(error); }
});

let githubCache = { expiresAt: 0, payload: null };
app.get('/api/github', async (_req, res) => {
  try {
    if (githubCache.payload && Date.now() < githubCache.expiresAt) {
      return res.json(githubCache.payload);
    }

    const data = await readData();
    const username = data.profile.githubUsername;
    const headers = {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'Jalath-Portfolio'
    };
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

    const [profileResponse, reposResponse] = await Promise.all([
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}`, { headers }),
      fetch(`https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=12`, { headers })
    ]);

    if (!profileResponse.ok || !reposResponse.ok) {
      throw new Error('GitHub API is temporarily unavailable.');
    }

    const profile = await profileResponse.json();
    const repos = (await reposResponse.json())
      .filter(repo => !repo.fork)
      .slice(0, 6)
      .map(repo => ({
        name: repo.name,
        description: repo.description || 'GitHub repository',
        url: repo.html_url,
        language: repo.language,
        stars: repo.stargazers_count,
        forks: repo.forks_count,
        updatedAt: repo.updated_at
      }));

    const payload = {
      ok: true,
      profile: {
        username: profile.login,
        url: profile.html_url,
        publicRepos: profile.public_repos,
        followers: profile.followers,
        following: profile.following
      },
      repos
    };

    githubCache = { expiresAt: Date.now() + 15 * 60 * 1000, payload };
    res.json(payload);
  } catch (error) {
    res.status(502).json({ ok: false, message: error.message });
  }
});

app.post('/api/contact', contactLimiter, async (req, res, next) => {
  try {
    const name = cleanText(req.body.name, 100);
    const email = cleanText(req.body.email, 180);
    const subject = cleanText(req.body.subject, 180);
    const message = cleanText(req.body.message, 3000);

    if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(email) || message.length < 10) {
      return res.status(400).json({ ok: false, message: 'Please enter a valid name, email address and message.' });
    }

    await updateData(data => {
      data.messages.unshift({
        id: crypto.randomUUID(),
        name,
        email,
        subject: subject || 'Portfolio enquiry',
        message,
        createdAt: new Date().toISOString(),
        read: false
      });
      data.messages = data.messages.slice(0, 500);
      return data;
    });

    res.json({ ok: true, message: 'Thank you. Your message has been received.' });
  } catch (error) { next(error); }
});

app.get('/admin/login', (req, res) => {
  if (req.session?.isAdmin) return res.redirect('/admin');
  res.render('admin-login', { error: null });
});

app.post('/admin/login', (req, res) => {
  const submitted = String(req.body.password || '');
  const expected = process.env.ADMIN_PASSWORD || 'change-me-now';
  const a = Buffer.from(submitted);
  const b = Buffer.from(expected);
  const valid = a.length === b.length && crypto.timingSafeEqual(a, b);

  if (!valid) return res.status(401).render('admin-login', { error: 'Incorrect admin password.' });
  req.session.isAdmin = true;
  res.redirect('/admin');
});

app.post('/admin/logout', requireAdmin, (req, res) => {
  req.session.destroy(() => res.redirect('/admin/login'));
});

app.get('/admin', requireAdmin, async (_req, res, next) => {
  try {
    const data = await readData();
    res.render('admin', { data, success: null, error: null });
  } catch (error) { next(error); }
});

app.post('/admin/profile', requireAdmin, async (req, res, next) => {
  try {
    await updateData(data => {
      const fields = ['name', 'displayName', 'headline', 'intro', 'about', 'birthday', 'university', 'degree', 'location', 'email', 'whatsapp', 'githubUsername', 'availability'];
      for (const field of fields) data.profile[field] = cleanText(req.body[field], field === 'about' ? 3000 : 500);
      return data;
    });
    githubCache = { expiresAt: 0, payload: null };
    res.redirect('/admin#profile');
  } catch (error) { next(error); }
});

app.post('/admin/projects', requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    const title = cleanText(req.body.title, 160);
    if (!title) throw new Error('Project title is required.');

    await updateData(data => {
      data.projects.unshift({
        id: `${slugify(title)}-${Date.now().toString(36)}`,
        title,
        description: cleanText(req.body.description, 2500),
        role: cleanText(req.body.role, 120),
        technologies: parseTechnologies(req.body.technologies),
        repoUrl: cleanText(req.body.repoUrl, 500),
        liveUrl: cleanText(req.body.liveUrl, 500),
        featured: req.body.featured === 'on',
        image: req.file ? `/uploads/${req.file.filename}` : ''
      });
      return data;
    });
    res.redirect('/admin#projects');
  } catch (error) { next(error); }
});

app.post('/admin/projects/:id', requireAdmin, upload.single('image'), async (req, res, next) => {
  try {
    let previousImage = '';
    await updateData(data => {
      const project = data.projects.find(item => item.id === req.params.id);
      if (!project) throw new Error('Project not found.');
      previousImage = project.image;
      project.title = cleanText(req.body.title, 160);
      project.description = cleanText(req.body.description, 2500);
      project.role = cleanText(req.body.role, 120);
      project.technologies = parseTechnologies(req.body.technologies);
      project.repoUrl = cleanText(req.body.repoUrl, 500);
      project.liveUrl = cleanText(req.body.liveUrl, 500);
      project.featured = req.body.featured === 'on';
      if (req.file) project.image = `/uploads/${req.file.filename}`;
      return data;
    });
    if (req.file && previousImage) await safeDeleteUpload(previousImage);
    res.redirect('/admin#projects');
  } catch (error) { next(error); }
});

app.post('/admin/projects/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    let image = '';
    await updateData(data => {
      const project = data.projects.find(item => item.id === req.params.id);
      if (project) image = project.image;
      data.projects = data.projects.filter(item => item.id !== req.params.id);
      return data;
    });
    await safeDeleteUpload(image);
    res.redirect('/admin#projects');
  } catch (error) { next(error); }
});

app.post('/admin/certificates', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    const title = cleanText(req.body.title, 180);
    if (!title) throw new Error('Certificate title is required.');
    await updateData(data => {
      data.certificates.unshift({
        id: `${slugify(title)}-${Date.now().toString(36)}`,
        title,
        issuer: cleanText(req.body.issuer, 180),
        date: cleanText(req.body.date, 30),
        credentialUrl: cleanText(req.body.credentialUrl, 500),
        note: cleanText(req.body.note, 500),
        file: req.file ? `/uploads/${req.file.filename}` : ''
      });
      return data;
    });
    res.redirect('/admin#certificates');
  } catch (error) { next(error); }
});

app.post('/admin/certificates/:id', requireAdmin, upload.single('file'), async (req, res, next) => {
  try {
    let previousFile = '';
    await updateData(data => {
      const certificate = data.certificates.find(item => item.id === req.params.id);
      if (!certificate) throw new Error('Certificate not found.');
      previousFile = certificate.file;
      certificate.title = cleanText(req.body.title, 180);
      certificate.issuer = cleanText(req.body.issuer, 180);
      certificate.date = cleanText(req.body.date, 30);
      certificate.credentialUrl = cleanText(req.body.credentialUrl, 500);
      certificate.note = cleanText(req.body.note, 500);
      if (req.file) certificate.file = `/uploads/${req.file.filename}`;
      return data;
    });
    if (req.file && previousFile) await safeDeleteUpload(previousFile);
    res.redirect('/admin#certificates');
  } catch (error) { next(error); }
});

app.post('/admin/certificates/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    let file = '';
    await updateData(data => {
      const certificate = data.certificates.find(item => item.id === req.params.id);
      if (certificate) file = certificate.file;
      data.certificates = data.certificates.filter(item => item.id !== req.params.id);
      return data;
    });
    await safeDeleteUpload(file);
    res.redirect('/admin#certificates');
  } catch (error) { next(error); }
});

app.post('/admin/messages/:id/read', requireAdmin, async (req, res, next) => {
  try {
    await updateData(data => {
      const message = data.messages.find(item => item.id === req.params.id);
      if (message) message.read = true;
      return data;
    });
    res.redirect('/admin#messages');
  } catch (error) { next(error); }
});

app.post('/admin/messages/:id/delete', requireAdmin, async (req, res, next) => {
  try {
    await updateData(data => {
      data.messages = data.messages.filter(item => item.id !== req.params.id);
      return data;
    });
    res.redirect('/admin#messages');
  } catch (error) { next(error); }
});

app.get('/health', (_req, res) => res.json({ ok: true, service: 'portfolio' }));

app.use((req, res) => res.status(404).render('404', { path: req.path }));

app.use((error, req, res, _next) => {
  console.error(error);
  const message = isProduction ? 'Something went wrong.' : error.message;
  if (req.path.startsWith('/api/')) return res.status(500).json({ ok: false, message });
  res.status(500).send(`<h1>Server error</h1><p>${message}</p><p><a href="/">Return home</a></p>`);
});

app.listen(PORT, () => {
  console.log(`Portfolio running at http://localhost:${PORT}`);
  if (!process.env.ADMIN_PASSWORD) {
    console.warn('WARNING: Using default admin password. Set ADMIN_PASSWORD in .env before deployment.');
  }
});
