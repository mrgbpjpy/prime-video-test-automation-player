# Use official Node.js LTS image
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files and install deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy the rest of your app
COPY . .

# Expose port (change if needed)
EXPOSE 5000

# Start the app
CMD ["node", "index.js"]
