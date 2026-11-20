# Base Node.js image
FROM node:20-slim

# Set working directory inside container
WORKDIR /app

# Copy dependency specifications
COPY package*.json ./

# Install dependencies (production packages only)
RUN npm install --omit=dev

# Copy all application source code
COPY . .

# Expose port 7860 (Hugging Face Spaces default requirement)
ENV PORT=7860
EXPOSE 7860

# Start StudyMate AI Express server
CMD ["node", "server.js"]
