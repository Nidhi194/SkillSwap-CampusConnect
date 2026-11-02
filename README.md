# SkillSwap Campus

Peer-to-peer skill exchange for college students, with no money involved.

## Features

- Register and log in with a campus account.
- Add skills you can teach and skills you want to learn.
- Find students with search, department/skill filters, and pagination.
- See skill match counts and potential matches.
- Send, accept, reject, cancel, and disconnect swap requests.
- Admin dashboard for students, skills, and requests.
- Light and dark themes with a responsive layout.
- Login rate limiting: five failed attempts per email and IP within five minutes.
- Persistent token versioning invalidates tokens after logout or account deletion.
- Student email addresses are hidden from other students.
- JUnit tests cover login and request-service behavior.

## Tech stack

- Frontend: HTML, CSS, and vanilla JavaScript.
- Backend: Java, Spring Boot, Spring Security, BCrypt, and JDBC DAOs.
- Database: MySQL.
- Build: Maven.

## Project structure

```text
.
├── index.html, login.html, register.html
├── dashboard.html, find-students.html, profile.html
├── admin.html, requests.html, student-details.html
├── css/
├── js/
├── backend/
│   ├── src/main/java/.../controller, service, dao, security
│   ├── src/main/resources/
│   ├── src/test/
│   ├── db/
│   └── pom.xml
└── LICENSE
```

## Requirements

- Java 17, as specified by `backend/pom.xml`.
- Maven.
- MySQL.
- Python 3 or VS Code Live Server for the frontend.

## Setup

### Create the MySQL user

Run this as a MySQL administrator, replacing the placeholders with your own values:

```sql
CREATE USER 'skillswap_app'@'localhost' IDENTIFIED BY 'your-password';
GRANT ALL PRIVILEGES ON skillswap_db.* TO 'skillswap_app'@'localhost';
FLUSH PRIVILEGES;
```

### Environment variables

Set these for the backend. `DB_USERNAME` and `DB_PASSWORD` are required.

| Variable | Required | Default / purpose |
|---|---|---|
| `DB_USERNAME` | Yes | MySQL username |
| `DB_PASSWORD` | Yes | MySQL password |
| `DB_URL` | No | `jdbc:mysql://localhost:3306/skillswap_db?createDatabaseIfNotExist=true` |
| `AUTH_SECRET` | No | HMAC secret; set a long random value to preserve tokens across restarts |
| `AUTH_TOKEN_TTL_HOURS` | No | `12` |
| `ADMIN_EMAIL` | No | Creates the first admin when no admin exists |
| `ADMIN_PASSWORD` | No | Required with `ADMIN_EMAIL`; must be at least 10 characters |
| `ADMIN_NAME` | No | First admin display name, default `Administrator` |
| `CORS_ORIGINS` | No | Comma-separated allowed frontend origins |
| `PORT` | No | Backend port, default `8080` |

Token versioning uses the `token_version` database column; it does not add an environment variable.

### Start the backend

From `backend`, use one command per line in Windows PowerShell (older PowerShell does not support `&&`):

```powershell
$env:DB_USERNAME = "skillswap_app"
$env:DB_PASSWORD = "your-password"
$env:DB_URL = "jdbc:mysql://localhost:3306/skillswap_db?createDatabaseIfNotExist=true"
$env:AUTH_SECRET = "your-long-random-secret"
$env:CORS_ORIGINS = "http://localhost:5500"
mvn spring-boot:run
```

On macOS/Linux:

```bash
export DB_USERNAME="skillswap_app"
export DB_PASSWORD="your-password"
export DB_URL="jdbc:mysql://localhost:3306/skillswap_db?createDatabaseIfNotExist=true"
export AUTH_SECRET="your-long-random-secret"
export CORS_ORIGINS="http://localhost:5500"
mvn spring-boot:run
```

A local git-ignored start script can hold these environment variables.

### Start the frontend

From the repository root:

```bash
python -m http.server 5500
```

Open `http://localhost:5500`. Use `localhost` consistently rather than mixing it with `127.0.0.1`. If you use another frontend port, add its origin to `CORS_ORIGINS`.

### Run tests

From `backend`:

```bash
mvn test
```

## API overview

All endpoints require authentication unless marked Public. Admin-only endpoints require an admin token.

| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/register` | Public |
| POST | `/api/auth/login` | Public |
| POST | `/api/auth/logout` | Public/token-aware |
| GET | `/api/stats` | Public |
| GET | `/api/skills` | Public |
| GET | `/api/users` | Authenticated; supports `skill`, `role`, `page`, and `size` |
| GET | `/api/users/{id}` | Authenticated |
| PUT | `/api/users/{id}` | Self or admin |
| DELETE | `/api/users/{id}` | Admin-only |
| POST | `/api/skills` | Authenticated |
| DELETE | `/api/skills/{id}` | Admin-only |
| POST | `/api/users/{userId}/skills` | Self or admin |
| GET | `/api/user-skills` | Authenticated |
| GET | `/api/users/{userId}/skills` | Authenticated |
| DELETE | `/api/users/{userId}/skills/{skillId}` | Self or admin |
| POST | `/api/requests` | Sender or admin |
| GET | `/api/requests/user/{userId}` | User or admin |
| PUT | `/api/requests/{id}/accept` | Request receiver or admin |
| PUT | `/api/requests/{id}/reject` | Request receiver or admin |
| PUT | `/api/requests/{id}/cancel` | Request sender or admin |
| PUT | `/api/requests/{id}/disconnect` | Connected participant or admin |
| GET | `/api/requests` | Admin-only |

## Troubleshooting

| Problem | Fix |
|---|---|
| Missing required setting `DB_USERNAME` | Set `DB_USERNAME` and `DB_PASSWORD` before starting Maven. |
| Access denied for user | Check the MySQL username/password, host, and the `GRANT` for `skillswap_db`. |
| Communications link failure | Ensure MySQL is running and `DB_URL` points to the correct host and port. |
| Port 8080 already in use | Run `netstat -ano \| findstr :8080`, then stop the owning process with `taskkill /PID <PID> /F`, or set `PORT` to another port. |
| “The backend is unavailable” in the browser | Start the backend, confirm it is on port 8080, and reload the frontend. |
| CORS error | Set `CORS_ORIGINS` to the exact frontend origin, such as `http://localhost:5500`, then restart the backend. |
| Logged in as the wrong user | Session data is stored in `sessionStorage`, which is separate per browser tab. Log out in that tab or clear its site storage. |

## License

See [LICENSE](LICENSE).
