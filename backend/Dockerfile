# backend/Dockerfile
FROM node:18

# Set working directory
WORKDIR /app

# Copy files
COPY . .

# Install dependencies
RUN npm ci

# Expose the port your app runs on
EXPOSE 5000

# Start the app
CMD ["node", "index.js"]
