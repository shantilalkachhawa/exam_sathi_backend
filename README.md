# Kisan Veges Backend with Docker

This is a Node.js backend application containerized with Docker. The application includes user authentication, product management, and order processing features for Kisan Veges platform.

## Prerequisites

- Docker installed on your machine
- Node.js and npm (for local development)
- MySQL database

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
PORT = 4000
MYSQL_HOST=localhost
MYSQL_USER=root
MYSQL_PASSWORD=12345
MYSQL_DATABASE=fresh_veges
JWT_SECRET=kisan_veges
```

## Docker Setup

### 1. Build the Docker Image

```bash
sudo docker build -t kisan-veges .
```

### 2. Run the Container

There are two ways to run the container:

#### Option 1: Using Host Network (Recommended for local development)
```bash
sudo docker run -d --name kisan-veges-app --network host kisan-veges
```

#### Option 2: Using Port Mapping
```bash
sudo docker run -d --name kisan-veges-app -p 4000:3000 kisan-veges
```

### 3. Common Docker Commands

#### View Container Logs
```bash
# View logs
sudo docker logs kisan-veges-app

# Follow logs in real-time
sudo docker logs -f kisan-veges-app
```

#### Container Management
```bash
# Stop the container
sudo docker stop kisan-veges-app

# Start the container
sudo docker start kisan-veges-app

# Restart the container
sudo docker restart kisan-veges-app

# Remove the container
sudo docker rm -f kisan-veges-app

# Check container status
sudo docker ps | grep kisan-veges-app
```

#### Rebuilding After Changes
```bash
# Remove the old container
sudo docker rm -f kisan-veges-app

# Rebuild the image
sudo docker build -t kisan-veges .

# Run the new container
sudo docker run -d --name kisan-veges-app --network host kisan-veges
```

## API Endpoints

### Authentication
- POST `/api/signup` - Create a new user account
- POST `/api/login` - Login with existing credentials
- POST `/api/otp-verify` - Verify OTP (requires authentication)

### Users
- GET `/api/users` - Get all users (requires authentication)
- GET `/api/user/:id` - Get user by ID (requires authentication)
- PUT `/api/user/:id` - Update user (requires authentication)
- DELETE `/api/user/:id` - Delete user (requires authentication)

### Request Examples

#### Login
```bash
curl -X POST http://localhost:4000/api/login \
  -H "Content-Type: application/json" \
  -d '{"email": "your.email@example.com", "password": "your_password"}'
```

#### Signup
```bash
curl -X POST http://localhost:4000/api/signup \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "john.doe@example.com",
    "password": "your_password"
  }'
```

## Troubleshooting

### Common Issues

1. **Database Connection Error**
   - Ensure MySQL is running on your host machine
   - Verify database credentials in `.env` file
   - Check if database exists and is accessible

2. **Port Already in Use**
   - Check if another process is using port 4000
   - Stop the existing process or use a different port

3. **Permission Issues**
   - Run Docker commands with `sudo`
   - Ensure proper file permissions on the project directory

### Checking Container Status
```bash
# View container details
sudo docker inspect kisan-veges-app

# View container resource usage
sudo docker stats kisan-veges-app
```

## Development

For local development without Docker:

1. Install dependencies:
```bash
npm install
```

2. Run in development mode:
```bash
npm run dev
```

3. Run in production mode:
```bash
npm start
```


User subscriptions (/api/user-subscriptions)
Method	Path	Notes
POST
/purchase
Paid/manual; overlap check; renews expired same plan
POST
/free
No payment row
POST
/trial
Once per user; no payment
GET
/my
All history
GET
/active
Non-expired only
PUT
/renew/:id
Extend expiry
DELETE
/:id
Cancel
Payments (/api/payments)
Method	Path	Notes
POST
/order
Creates pending payment
POST
/verify
Success → activates subscription
POST
/fail
Marks failed
POST
/manual
Offline success + activate
GET
/my
History
GET
/:id
Single payment
Purchase body stays:

{
  "subscription_id": 1,
  "payment_method": "razorpay",
  "transaction_id": "pay_xxxxxxxxx"
}
Gateway flow: POST /payments/order → gateway → POST /payments/verify with { payment_id, transaction_id }.




How the 3 pieces relate
1) Subscription (PLAN)
   = product you sell (Monthly PCS, Free Trial, etc.)
   + SubscriptionAccess = which categories/subcategories that plan unlocks
2) Payment
   = money record (pending → success / failed)
   linked to user + subscription
3) UserSubscription
   = user actually owns the plan (active / expired / cancelled)
   created AFTER payment success (or free/trial/admin assign)
Flow:

Create Plan → Map Access → User buys / Admin assigns
                              ↓
                         Payment (if paid)
                              ↓
                      UserSubscription active
                              ↓
                    User can access mapped categories
Important: purchase fails if the plan has no access mappings. First call:

POST /api/subscriptions/:id/access

1) Subscription (plan APIs)
Base: /api/subscriptions
Auth: not required currently

Method	Path	Body / Query
POST
/
create plan
GET
/?page=1&limit=10&search=
list + access
GET
/:id
one plan
PUT
/:id
update fields
DELETE
/:id
soft delete (inactive)
POST
/:id/access
map category/subcategory
GET
/:id/access
list access
DELETE
/:id/access/:accessId
remove access
POST
/assign
admin assign plan to user (new)
Create plan

POST /api/subscriptions
{
  "name": "Monthly PCS",
  "description": "PCS monthly plan",
  "access_type": "paid",
  "plan_type": "monthly",
  "price": 499,
  "validity_days": 30,
  "total_test": 50
}
access_type: free | paid | trial
plan_type: monthly | quarterly | half_yearly | yearly | lifetime | trial | custom

Map access (required before purchase)

POST /api/subscriptions/2/access
{
  "access_level": "category",
  "access_id": "1"
}
or

{
  "access_level": "sub_category",
  "access_id": "5"
}
Admin assign to user

POST /api/subscriptions/assign
{
  "user_id": 5,
  "subscription_id": 2,
  "payment_method": "manual",
  "transaction_id": "ADMIN-001"
}
If plan is paid → creates success payment + userSubscription
If free/trial → only userSubscription (amount 0)
2) Payment APIs
Base: /api/payments
All need: Authorization: Bearer <user_jwt>

Method	Path	Purpose
POST
/order
create pending payment (gateway checkout)
POST
/verify
mark success → activate plan
POST
/fail
mark failed
POST
/manual
offline success + activate (for logged-in user)
GET
/
admin list all payments
GET
/my
my payments
GET
/:id
one payment
Gateway flow (app user)

POST /api/payments/order
{ "subscription_id": 2, "payment_method": "razorpay" }
→ returns pending payment

POST /api/payments/verify
{
  "payment_id": 10,
  "transaction_id": "pay_xxx",
  "gateway_response": { "razorpay_payment_id": "pay_xxx" }
}
→ payment success + UserSubscription created

POST /api/payments/fail
{ "payment_id": 10 }
Manual for logged-in user

POST /api/payments/manual
{
  "subscription_id": 2,
  "payment_method": "cash",
  "transaction_id": "CASH-123"
}
3) UserSubscription APIs
Base: /api/user-subscriptions
All need Bearer token (most act on logged-in user)

Method	Path	Body	When
POST
/purchase
{ subscription_id, payment_method?, transaction_id? }
paid plan, instant success payment
POST
/free
{ subscription_id }
access_type = free
POST
/trial
{ subscription_id }
trial (once per user)
GET
/my
—
all my plans
GET
/active
—
currently active
GET
/
?page&limit&status&search
admin list all
PUT
/renew/:id
—
renew by user_subscription id
DELETE
/:id
—
cancel
Examples

POST /api/user-subscriptions/purchase
{ "subscription_id": 2, "payment_method": "upi", "transaction_id": "UPI999" }
POST /api/user-subscriptions/free
{ "subscription_id": 3 }
POST /api/user-subscriptions/trial
{ "subscription_id": 4 }
Which API should you use?
Goal	Use
Create plan
POST /subscriptions
Unlock categories for plan
POST /subscriptions/:id/access
Admin give plan to a user
POST /subscriptions/assign
App user pays via Razorpay
/payments/order → gateway → /payments/verify
App user paid instantly (no gateway)
POST /user-subscriptions/purchase
Free / trial
/user-subscriptions/free or /trial
See all payments
GET /payments
See all user plans
GET /user-subscriptions
