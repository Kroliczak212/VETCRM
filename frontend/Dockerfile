FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 5173

# Start in development mode
# --host is needed to expose the server to the network
CMD ["npm", "run", "dev", "--", "--host"]
