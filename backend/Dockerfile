FROM node:18-alpine

WORKDIR /app

# Install tzdata for timezone support
RUN apk add --no-cache tzdata

# Set timezone to Poland (UTC+1/UTC+2 with DST)
ENV TZ=Europe/Warsaw

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start in development mode with hot reload
CMD ["npm", "run", "dev"]
