# Truck Delivery System

First version for steel truck delivery records.

## Run

```bash
npm start
```

Open:

```text
http://localhost:5058
```

## What This Version Does

- Manage truck master data with two truck types:
  - With Crane
  - Without Crane
- Manage location price list by:
  - From Location
  - To Location
  - Truck Type
  - Company Unit Price
  - Truck Salary Unit Price
- Enter delivery records from driver receipts.
- Auto-fill truck type and driver from truck number.
- Auto-find price from location and truck type.
- Calculate:
  - Company Total = QTY(T) x Company Unit Price
  - Truck Salary = QTY(T) x Truck Salary Unit Price
- Export accounting report as Excel-readable `.xls`.
- Export monthly salary report as Excel-readable `.xls`.

## Data Storage

Data is stored in:

```text
backend/data.json
```

This keeps the first version simple. Later it can be migrated to SQLite or PostgreSQL.
