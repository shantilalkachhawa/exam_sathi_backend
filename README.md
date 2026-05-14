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