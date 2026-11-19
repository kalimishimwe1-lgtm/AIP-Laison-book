# Putting the system online

## 1. Server
A small Linux server (2 CPU, 4 GB RAM is enough for a pilot) with Docker installed.
```
git clone <your repo> iap && cd iap
cp .env.example .env && nano .env      # strong passwords, JWT_SECRET (openssl rand -hex 48), ADMIN_EMAIL, ADMIN_PASSWORD, CLIENT_ORIGIN=https://your-domain
docker compose up -d --build
```
The server refuses to start in production if ADMIN_PASSWORD is the example value.

## 2. HTTPS (required)
Passwords and learners' data must never travel over plain HTTP. Easiest: put Caddy in front, it gets certificates by itself.
```
# /etc/caddy/Caddyfile
iap.example.rw {
  reverse_proxy localhost:80
}
```
Then set `WEB_PORT=8080` in `.env` and `reverse_proxy localhost:8080`, and `CLIENT_ORIGIN=https://iap.example.rw`.
Offline mode (service worker) only works over HTTPS.

## 3. Backups
```
crontab -e
0 2 * * * cd /path/to/iap && ./scripts/backup.sh >> backups/backup.log 2>&1
```
Copy `backups/` to a second machine or storage regularly. Test a restore (`./scripts/restore.sh <file>`) on a spare server before you need it.

## 4. Before real learners use it
- [ ] HTTPS working, port 3306 not reachable from the internet (compose does not publish it)
- [ ] Admin password changed after first login; only 1-2 people know it
- [ ] Backups run and a restore has been tested
- [ ] Reviewed the Kinyarwanda text with RTB / a teacher
- [ ] RTB confirmed the marking weights and the certificate wording
- [ ] Pilot in 1-3 schools for at least one full IAP period
- [ ] Privacy: the system holds names, phones and emails of learners (many under 18). Rwanda's data-protection law (Law N° 058/2021) applies. Confirm with a legal adviser or the National Cyber Security Authority: the legal basis and consent of parents/guardians, how long data is kept, and whether data may be hosted outside Rwanda (transfer abroad is restricted). Hosting inside Rwanda is the safest choice.
- [ ] Decide who may see which data and write it in a short policy for schools

## 5. Updating
```
git pull && docker compose up -d --build
```
Database tables update themselves on start. Take a backup first.

## 6. Giving RTB's systems access
Set `RTB_API_KEY` in `.env`. RTB calls `GET https://your-domain/api/integration/summary` with header `x-api-key: <key>` and gets school totals as JSON (no personal data).
