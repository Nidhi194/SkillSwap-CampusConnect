# SkillSwap API

1. Create MySQL user, export env vars (see `.env.example`): `DB_USERNAME`, `DB_PASSWORD` are required. No defaults.
2. `mvn spring-boot:run`. Startup creates DB (createDatabaseIfNotExist), runs `schema.sql`, patches old DBs.
3. Optional first admin: set `ADMIN_EMAIL` + `ADMIN_PASSWORD` before first start.
4. Set `AUTH_SECRET` so logins survive restarts.
5. Frontend: serve repo root on :5500 (or set `CORS_ORIGINS`). Other API host: set `window.SKILLSWAP_API_BASE_URL` before `js/api.js`.
