# Inventory & Stock Management System

A full-stack Product Inventory & Stock Management system built with Django REST Framework and React.

## Tech Stack

- **Backend:** Python 3.10+, Django 4.x, Django REST Framework, PostgreSQL 14+
- **Frontend:** React 18+ (Vite), Tailwind CSS
- **Auth:** JWT (djangorestframework-simplejwt)

## Project Structure

```
inventory_system/
├── inventory_system/   # Django project config (settings, urls, wsgi)
├── core/                # Django app (models, serializers, views, services)
├── logs/                # app.log written here at runtime
├── frontend/            # React (Vite) app
├── manage.py
└── requirements.txt
```

## Prerequisites

- Python 3.10+
- Node.js 18+ and npm
- PostgreSQL 14+ running locally or accessible remotely

## 1. Backend Setup

```bash
# from the project root
python3 -m venv env
source env/bin/activate        # Windows: env\Scripts\activate

pip install -r requirements.txt
```

### Configure environment variables

Copy the example file and fill in your values:

```bash
cp .env.example .env
```

```env
SECRET_KEY=your-django-secret-key
DEBUG=True
DB_NAME=inventory_db
DB_USER=postgres
DB_PASSWORD=your-password
DB_HOST=localhost
DB_PORT=5432
ALLOWED_HOSTS=localhost,127.0.0.1
```

### Create the database

```bash
# in psql, or via your preferred PostgreSQL client
CREATE DATABASE inventory_db;
```

### Run migrations and create an admin user

```bash
python manage.py migrate
python manage.py createsuperuser
```

### Start the backend server

```bash
python manage.py runserver
```

API is now available at `http://localhost:8000/api/`.
Logs are written to `logs/app.log`.

## 2. Frontend Setup

```bash
cd frontend
npm install
```

### Configure environment variables

Create `frontend/.env`:

```env
VITE_API_BASE=http://localhost:8000/api
```

### Start the frontend dev server

```bash
npm run dev
```

Frontend is now available at `http://localhost:5173` (default Vite port).

## 3. Login

Use the superuser credentials created above to log in via the frontend login page. The frontend stores the JWT access/refresh tokens and attaches them to all API requests automatically.

## Notes & Assumptions

- `ProductID` is a required, unique numeric field on product creation (per the provided base model) and must be supplied by the client; it is not auto-generated server-side.
- `PUT /api/products/{id}/` updates product-level fields only (name, code, HSN code, etc.). Variants and sub-variants are managed exclusively through the dedicated `/api/products/{id}/variants/` and `/api/variants/{id}/` endpoints.
- Deleting a product (`DELETE /api/products/{id}/`) performs a soft delete (`Active=False`); it does not remove the row from the database.
- Deleting a variant cascades to remove any sub-variant combinations that depended on it, and the product's `TotalStock` is recalculated afterward.
- Stock quantity is guarded against going negative at both the application level (explicit check before sale) and the database level (`CheckConstraint`).