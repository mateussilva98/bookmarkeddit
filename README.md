# 📚 Bookmarkeddit

<div align="center">
  <img src="./app/src/assets/images/logo.svg" alt="Bookmarkeddit Logo" width="300" />

  <p><strong>Reddit's missing save manager: Finally organize what matters to you</strong></p>
  
  <p>A modern tool to organize, search, and manage your Reddit saved posts and comments</p>
</div>

## 🌟 Overview

**Bookmarkeddit** is the solution to Reddit's limited saved post management. Easily organize, filter, search, and rediscover your saved content without the limitations of Reddit's native interface.

Built with React, TypeScript, and powered by Reddit's API, Bookmarkeddit provides privacy-first functionality right from your browser - your data never leaves your device.

## ✨ Main Features

- **🔍 Smart Search** - Full-text search through titles and content of your saved posts
- **🗂️ Intelligent Filters** - Filter by subreddit, post type (text/image/video), or NSFW content
- **🔄 Dynamic Layout Options** - Switch between grid and list views to browse your content
- **⬆️ Custom Sorting** - Sort posts by most recent, most upvotes, or most comments
- **🔄 Incremental Fetching** - Automatically fetches all your saved posts, handling Reddit's API limits
- **🌓 Light/Dark Mode** - Choose your preferred theme for comfortable browsing
- **🛡️ Private Experience** - Your data stays in your browser, nothing is stored on our servers

## 🖼️ Features Showcase

### Powerful Filtering System

Filter saved posts by community, type, or NSFW status. See exactly how many posts you have in each category.

### Advanced Search & Sorting

Search through all your saved content with instant results and sort by recency, popularity, or engagement.

### Content Management

Easily unsave posts you no longer need with confirmation to prevent accidental removal.

### Saved Post Organization

View posts in an attractive grid layout or detailed list view depending on your preference.

## 🔧 Technical Features

- **📱 Responsive Design** - Works across desktop and mobile devices
- **🗄️ Efficient Data Management** - Intelligent handling of post data with optimized state management
- **⌨️ Keyboard Shortcuts** - Ctrl+F to quickly focus search, Ctrl+R to refresh posts
- **🔍 Fuzzy Search** - Find content even with partial or inexact matches
- **📊 Masonry Grid Layout** - Beautiful display of posts with varying heights
- **🎥 Media Support** - View images and videos directly within the app
- **🛑 NSFW Content Handling** - Option to blur NSFW images with one-click reveal
- **📦 Infinite Scroll** - Load and display large numbers of posts efficiently
- **🚀 Performance Optimizations** - Efficient rendering and data handling

## 🚀 Getting Started

### Prerequisites

- Node.js (v14 or higher)
- Reddit account with saved posts
- Reddit Developer Application credentials (see below)

### Reddit API Credentials Setup

1. Go to [Reddit's App Preferences](https://www.reddit.com/prefs/apps)
2. Click "Create App" or "Create Another App" button at the bottom
3. Fill in the following:
   - Name: Bookmarkeddit (or any name you prefer)
   - App type: Select "web app"
   - Description: Optional
   - About URL: Optional
   - Redirect URI: `http://localhost/login/callback` (for local development)
   - Note this URI for your .env file configuration
4. Click "Create app" button
5. Note your:
   - Client ID: The string under the app name
   - Client Secret: Listed as "secret"

### Installation & Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/bookmarkeddit.git
   cd bookmarkeddit
   ```

2. Install dependencies for both the app and the server:

   ```bash
   # Install app dependencies
   cd app
   npm install

   # Install server dependencies
   cd ../server
   npm install
   ```

3. Create and configure the environment files:

   **For the server:**

   Copy the example environment file:

   ```bash
   cp server/example.env server/.env
   ```

   Edit `server/.env` with your Reddit API credentials:

   ```
   # Reddit API credentials
   CLIENT_ID=your_reddit_client_id
   CLIENT_SECRET=your_reddit_client_secret

   # Server configuration
   PORT=3001
   NODE_ENV=development
   ```

   **For the app:**

   Copy the example environment file:

   ```bash
   cp app/.env.example app/.env
   ```

   Edit `app/.env` with your Reddit API credentials:

   ```
   # Reddit API Configuration
   VITE_CLIENT_ID=your_reddit_client_id
   VITE_REDIRECT_URI=http://localhost/login/callback
   ```

4. Start the development servers:

   ```bash
   # Start the proxy server
   cd server
   npm run dev

   # In another terminal, start the frontend
   cd app
   npm run dev
   ```

5. Navigate to `http://localhost:5173` in your browser

## 🐳 Docker Deployment

Bookmarkeddit supports Docker for easy deployment. Follow these steps to run the application using Docker:

### Using Docker Compose

1. Make sure you have Docker and Docker Compose installed on your system

2. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/bookmarkeddit.git
   cd bookmarkeddit
   ```

3. Create the necessary environment files:

   ```bash
   # For the server
   cp server/example.env server/.env

   # For the app
   cp app/.env.example app/.env

   # For docker-compose
   cp .env.example .env
   ```

4. Edit the `.env` files with your Reddit API credentials and other configuration

5. Build and start the containers:

   ```bash
   docker-compose up -d
   ```

6. Access the application at http://localhost

### Building and Running Containers Separately

If you prefer to build and run the containers separately:

#### Backend Server

```bash
cd server
docker build -t bookmarkeddit-server .
docker run -p 3000:3000 --env-file .env -d bookmarkeddit-server
```

#### Frontend App

```bash
cd app
docker build -t bookmarkeddit-app .
docker run -p 80:80 -d bookmarkeddit-app
```

### Production Deployment

For production deployment, consider:

1. Setting appropriate environment variables for production
2. Setting up proper SSL/TLS with a reverse proxy like Caddy or Nginx
3. Using Docker Swarm for better container orchestration and zero-downtime updates

## 📄 Authentication & Permissions

Bookmarkeddit requires the following Reddit API permissions:

- **identity** - To see your username and profile picture
- **history** - To access your saved posts
- **save** - To unsave posts when requested

## 🔒 Privacy

Your Reddit data never leaves your browser. Bookmarkeddit acts as a client-side interface to your Reddit saved posts, with a minimal proxy server only used to make authenticated API requests to Reddit.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, SCSS Modules
- **API**: Reddit API
- **State Management**: React Context API
- **Build Tool**: Vite
- **Deployment**: Docker support for easy deployment

## 🔮 Upcoming Features

- Export saved posts to CSV
- Markdown rendering for post content
- Dashboard with statistics about your saved content
- Pin important posts to the top
- Advanced caching for faster loading
- Customizable text styling options

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgements

Created by [Mateus Silva](https://github.com/mateussilva98/)

---

<p align="center">
  <i>Your data, better organized. Never lose a valuable Reddit post again.</i>
</p>
