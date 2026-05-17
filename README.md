# Truck Delivery System

N&M Logistic delivery statement and driver payment system.

## Run Locally

```bash
npm install
npm run build
npm start
```

Open:

```text
http://localhost:5058
```

## Current Features

- Create monthly delivery statements.
- Separate statement workflow for Crane and No Crane trucks.
- Maximum 30 delivery rows per statement.
- Manual statement number with duplicate prevention by month.
- Delivery entry with truck, location, price lookup, and total calculation.
- Company price and driver price management with effective dates.
- Driver payment report by truck.
- Excel/PDF exports.
- Backup download and manual backup.

## Data Storage

The app uses SQLite and stores data in:

```text
backend/truck_delivery.db
backend/backups/
```

For online hosting, set `DATA_DIR` to a persistent disk folder:

```text
DATA_DIR=/var/data
```

Then data will be stored in:

```text
/var/data/truck_delivery.db
/var/data/backups/
```

Important: do not host this app without persistent storage, or business data may be lost when the server restarts.

## Login Protection

Set these environment variables online:

```text
APP_USERNAME=your-login-name
APP_PASSWORD=your-strong-password
```

If these are not set, login is disabled. That is acceptable for local development only.

## Render Deployment

This repo includes `render.yaml`.

Recommended Render setup:

1. Push this repo to GitHub.
2. In Render, create a new Blueprint from the GitHub repo.
3. Render will use:
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Persistent disk mounted at `/var/data`
   - `DATA_DIR=/var/data`
4. Add secret values for:
   - `APP_USERNAME`
   - `APP_PASSWORD`
5. Deploy.

After deployment, open the Render URL and log in.

## Before Real Operation

Before entering official business data online:

1. Confirm the online app asks for login.
2. Confirm `/api/health` returns `ok`.
3. Create one test statement.
4. Restart/redeploy the service.
5. Confirm the test statement is still there.
6. Download a backup.
7. Then delete test operation data if needed and start official entry.

## Future Production Upgrade

SQLite with persistent disk is good for the first real online pilot. Later, when the workflow is stable, migrate to PostgreSQL for stronger hosted backups, restore tools, and multi-user durability.
