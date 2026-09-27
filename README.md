# BalaHader

**Good Food. Brighter Tomorrow.**

BalaHader is a food waste reduction platform that connects local food businesses, customers, charities, and administrators. Businesses can sell surplus food at reduced prices or make it available for donation. Customers can purchase food from multiple businesses in one checkout, while verified charities can claim eligible donations.

## Main features

### Visitors and customers

- Browse, search, and filter available food without signing in
- View listing images, prices, servings, dietary information, allergens, and deadlines
- Save favorite listings
- Add products from multiple businesses to one cart
- Pay once for a combined cart using Stripe test mode
- Track expandable orders and the status of each business order
- Review completed purchases
- Generate a Smart Basket based on budget, people, meals, preferences, and available stock

### Businesses

- Create and manage surplus food listings
- Upload a required image for every new listing
- Record package contents, servings, dietary tags, allergens, and suitable meal types
- Configure pickup or delivery and listing deadlines
- Manage customer orders and donations
- View customer and charity reviews
- Use AI-powered Seller Insights

### Charities

- Create and maintain a charity profile
- Submit verification information
- Browse and claim available donations
- Track claimed, prepared, and collected donations
- Review completed donations

### Administrators

- Monitor platform activity from an overview dashboard
- Verify charities
- Manage users and businesses
- Moderate food listings
- Monitor orders, donations, and reviews

## AI usage

AI is limited to two features:

1. **Smart Basket** uses customer requirements and real available inventory to propose a suitable basket. It can combine listings from multiple businesses.
2. **Seller Insights** analyzes business activity and provides recommendations.

Both features use a local Ollama model. Authentication, payments, inventory, orders, donations, reviews, and administration use standard backend logic.

## Technology

| Area | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS |
| Backend | FastAPI, Python |
| Database | MongoDB |
| Local AI | Ollama with `llama3.2:3b` |
| Payments | Stripe test mode |
| Images | ImageKit |

## Project structure

```text
BalaHader2/
├── client/                 React frontend
│   ├── public/
│   └── src/
├── server/                 FastAPI backend
│   ├── app/
│   │   ├── routes/
│   │   ├── schemas/
│   │   ├── services/
│   │   └── utils/
│   ├── seed_data.py
│   └── requirements.txt
└── README.md
```

## Prerequisites

Install the following before running the project:

- Node.js and npm
- Python 3.11 or newer
- MongoDB, either locally or through MongoDB Atlas
- Ollama
- Stripe test credentials
- ImageKit credentials

SMTP credentials are optional during local development unless email delivery is being tested.

## Environment configuration

### Backend

Copy the example file:

```powershell
cd server
Copy-Item .env.example .env
```

Configure `server/.env`:

```env
MONGODB_URL=mongodb_connection_string
DATABASE_NAME=balahader

SECRET_KEY=replace_with_a_long_random_secret
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200

OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2:3b

IMAGEKIT_PRIVATE_KEY=your_private_key
IMAGEKIT_PUBLIC_KEY=your_public_key
IMAGEKIT_URL_ENDPOINT=https://ik.imagekit.io/your_id

STRIPE_SECRET_KEY=sk_test_replace_me
STRIPE_WEBHOOK_SECRET=whsec_replace_me

FRONTEND_URL=http://localhost:5173
ENVIRONMENT=development

SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USERNAME=your_username
SMTP_PASSWORD=your_password
EMAIL_FROM=support@example.com
```

Generate a strong secret key instead of using the example value. Never commit `.env` files.

### Frontend

Copy the frontend example file:

```powershell
cd client
Copy-Item .env.example .env.local
```

The local value should be:

```env
VITE_API_URL=http://127.0.0.1:8000
```

## Installation

### Backend

From the project root:

```powershell
cd server
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r requirements.txt
```

### Frontend

Open another terminal from the project root:

```powershell
cd client
npm install
```

## Local AI setup

Download the model once:

```powershell
ollama pull llama3.2:3b
```

Ollama normally starts its background service automatically on Windows. Confirm that the model is available:

```powershell
ollama list
```

If the `ollama` command is not on `PATH`, use the full path to the installed executable.

## Run the application

Start MongoDB before starting the backend.

### Terminal 1: backend

```powershell
cd server
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload
```

The API will run at `http://127.0.0.1:8000`.

- Health check: `http://127.0.0.1:8000/health`
- API documentation: `http://127.0.0.1:8000/docs`

### Terminal 2: frontend

```powershell
cd client
npm run dev
```

Open `http://localhost:5173`.

## Demo data

The seed script creates demo users, businesses, charities, listings, and donations.

```powershell
cd server
.\.venv\Scripts\Activate.ps1
python seed_data.py --reset
```

The script prints the generated demo email addresses and shared demo password after it finishes. The `--reset` option replaces previously seeded demo records, so use it only when resetting the demonstration data is intended.

## Stripe test payments

Keep Stripe in test mode during development. Configure the test secret key and webhook secret in `server/.env`.

When testing locally with the Stripe CLI, forward webhook events to the backend payment webhook endpoint used by the application. Use Stripe's documented test cards and never enter real card information in a development environment.

## Images

Businesses must upload a JPG, PNG, or WebP image when creating a listing. The application uploads listing images through ImageKit. Configure all three ImageKit variables before testing image uploads.

## Useful checks

### Frontend production build

```powershell
cd client
npm run build
```

### Frontend lint

```powershell
cd client
npm run lint
```

### Backend syntax check

```powershell
cd server
.\.venv\Scripts\Activate.ps1
python -m compileall -q app
```

## Typical platform workflow

1. A business creates a surplus food listing with an image and availability details.
2. A customer purchases the listing at a reduced price.
3. The customer can pay once for items from multiple businesses.
4. The backend creates and tracks the appropriate business orders.
5. If eligible food remains unsold after its sale deadline, the platform turns it into a donation.
6. A verified charity claims the donation.
7. The business prepares it and the charity confirms collection.
8. Customers and charities can review completed experiences.
9. Administrators monitor users, listings, orders, donations, and reviews.

## Security notes

- Keep `.env`, virtual environments, `node_modules`, and build outputs out of Git.
- Use a long random `SECRET_KEY` in production.
- Use production credentials only in the production environment.
- Restrict production CORS origins to the deployed frontend URL.
- Configure HTTPS for production payment and authentication flows.

## Future improvements

- Delivery tracking
- Maps and location-based discovery
- Arabic language support
- Mobile application
- More personalized recommendations

