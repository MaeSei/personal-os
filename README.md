# PersonalOS v0.2

PersonalOS now uses a central database, so phone and computer can share one source of truth.

## Included
- Flask web app
- PostgreSQL support
- Login/password
- PWA manifest and service worker
- Mobile responsive interface
- Today / Ready / Blocked / Waiting / Projects
- Change history ("What moved?")
- Docker deployment
- Starter data from the current PersonalOS design

## Local Docker test
Edit the three placeholder passwords/secrets in `docker-compose.yml`, then:

```bash
docker compose up -d --build
```

Open `http://localhost:5000`.

## Production
Deploy the Docker container to any host with HTTPS and PostgreSQL. Set:

```text
DATABASE_URL=...
SECRET_KEY=<long random value>
ADMIN_USERNAME=<username>
ADMIN_PASSWORD=<strong password>
COOKIE_SECURE=1
```

After first login, click **Load starter data** once.

## iPhone / PWA
Once hosted over HTTPS, open the URL in Safari → Share → Add to Home Screen.
Your phone and computer use the same server database. The service worker caches only app shell assets; it does not create a separate task database.

## Security
Keep this system for workflow metadata, reminders, project state, and next actions. Do not store patient identifiers, sequencing data, credentials, or regulated/confidential source documents in it.

## Next
Do not add features until use reveals recurring friction. Likely candidates:
- sequencing workflow templates
- dependencies
- recurring items
- weekly review
- search/filtering
- energy/stress-aware Today suggestions
