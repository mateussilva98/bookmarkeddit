# 📚 Bookmarkeddit

<div align="center">
  <img src="./app/src/assets/images/logo.svg" alt="Bookmarkeddit Logo" width="300" />
  <p><strong>Reddit's missing save manager: Finally organize what matters to you</strong></p>
  <p>A modern tool to organize, search, and manage your Reddit saved posts and comments.</p>
  <p>
    <a href="https://bookmarkeddit.com" target="_blank"><strong>Live Demo</strong></a> |
    <a href="#features">Features</a> |
    <a href="#getting-started">Getting Started</a> |
    <a href="#docker-swarm-deployment-with-caddy">Deployment</a>
  </p>
</div>

## 🌟 Overview

**Bookmarkeddit** is the solution to Reddit's limited saved post management. Easily organize, filter, search, and rediscover your saved content without the limitations of Reddit's native interface.

Built with React, TypeScript, and powered by Reddit's API, Bookmarkeddit provides a privacy-first experience—your data never leaves your browser.

## ✨ Features

### Core Functionality

- **🔍 Smart Search**: Full-text search through titles and content of your saved posts.
- **🗂️ Intelligent Filters**: Filter by subreddit, post type (text/image/video), or NSFW status.
- **🔄 Dynamic Layouts**: Switch between grid and list views.
- **⬆️ Custom Sorting**: Sort by recency, upvotes, or comments.
- **🔄 Incremental Fetching**: Automatically fetches all saved posts, handling Reddit's API limits.
- **🌓 Light/Dark Mode**: Choose your preferred theme.
- **🛡️ Privacy First**: Your data stays in your browser; nothing is stored on our servers.

### Technical Highlights

- **📱 Responsive Design**: Seamless experience on desktop and mobile.
- **🗄️ Efficient Data Management**: Optimized state management for handling post data.
- **⌨️ Keyboard Shortcuts**: `Ctrl+F` for search, `Ctrl+R` to refresh.
- **🔍 Fuzzy Search**: Find content with partial or inexact matches.
- **📊 Masonry Grid Layout**: Visually appealing display for posts of varying heights.
- **🎥 Media Support**: View images and videos directly in the app.
- **🛑 NSFW Handling**: Option to blur NSFW images with one-click reveal.
- **📦 Infinite Scroll**: Efficiently load and display large numbers of posts.
- **🚀 Performance Optimized**: Fast rendering and data handling.

### Powerful Filtering System

Filter saved posts by community, type, or NSFW status. See exactly how many posts you have in each category.

### Advanced Search & Sorting

Search through all your saved content with instant results and sort by recency, popularity, or engagement.

### Content Management

Easily unsave posts you no longer need, with confirmation to prevent accidental removal.

### Saved Post Organization

View posts in an attractive grid layout or a detailed list view.

## 🚀 Getting Started

### Prerequisites

- Node.js (v16 or higher recommended)
- A Reddit account
- Reddit Developer Application credentials (see below)

### Reddit API Credentials Setup

1. Go to [Reddit's App Preferences](https://www.reddit.com/prefs/apps).
2. Click "Create App" or "Create Another App".
3. Fill in the details:
   - **Name**: Bookmarkeddit (or your preferred name)
   - **App type**: Select "web app"
   - **Description**: (Optional)
   - **About URL**: (Optional)
   - **Redirect URI**:
     - For local development: `http://localhost:5173/login/callback`
     - _(Ensure this matches your `VITE_REDIRECT_URI` in the respective `.env` file)_
4. Click "Create app".
5. Note your **Client ID** (under the app name) and **Client Secret**.

### Installation & Local Development

1. Clone the repository:

   ```bash
   git clone https://github.com/mateussilva98/bookmarkeddit.git
   # Replace with your fork if applicable
   cd bookmarkeddit
   ```

2. Install dependencies for both the client app and the server:

   ```bash
   # Install client app dependencies
   cd app
   npm install

   # Install server dependencies
   cd ../server
   npm install
   cd ..
   # Return to root for next steps
   ```

3. Create and configure environment files:

   **For the server (`server/.env`):**

   Copy `server/example.env` to `server/.env` and fill in:

   ```env
   NODE_ENV=development
   PORT=3000 # Or your preferred port for the proxy server
   REDDIT_CLIENT_ID=YOUR_REDDIT_CLIENT_ID
   REDDIT_CLIENT_SECRET=YOUR_REDDIT_CLIENT_SECRET
   ```

   **For the client app (`app/.env):**

   Copy `app/example.env` to `app/.env` and fill in:

   ```env
   VITE_API_URL=http://localhost:3000/api # Points to the proxy server
   VITE_CLIENT_ID=YOUR_REDDIT_CLIENT_ID
   VITE_REDIRECT_URI=http://localhost:5173/login/callback
   ```

   _(Note: `VITE_CLIENT_ID` in the app is the same as `REDDIT_CLIENT_ID` for the server)_

4. Start the development servers:

   ```bash
   # Start the proxy server
   cd server
   npm run dev

   # In another terminal, start the frontend
   cd ../app
   # or cd app from the root directory if you opened a new terminal
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:5173`.

## 📄 Authentication & Permissions

Bookmarkeddit requires the following Reddit API permissions during OAuth:

- `identity`: To display your username and profile picture.
- `history`: To access your saved posts and comments.
- `save`: To allow unsaving posts/comments from within the app.

## 🔒 Privacy

Your Reddit data (saved posts, username) is fetched by the client app and stored in your browser's local storage. The backend server only proxies requests to the Reddit API and does not store any of your personal Reddit data.

## 🛠️ Tech Stack

- **Frontend**: React, TypeScript, SCSS Modules, Vite
- **Backend (Proxy Server)**: Node.js, Express, TypeScript
- **API**: Reddit API
- **State Management**: Zustand (as per `useStore.ts`)
- **Deployment**: Docker, Docker Swarm, Caddy
- **Analytics**: Self-hosted Plausible

## 🔮 Upcoming Features

- Export saved posts (e.g., to CSV/JSON).
- Enhanced Markdown rendering for post content.
- Dashboard with statistics about saved content.
- Pin important posts to the top.
- Advanced caching strategies.

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Please feel free to:

- Open an issue to discuss a bug or feature.
- Submit a Pull Request with your improvements.

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](./LICENSE) file for details.

## 🙏 Acknowledgements

- Created by [Mateus Silva](https://github.com/mateussilva98/)

---

<p align="center">
  <i>Your data, better organized. Never lose a valuable Reddit post again.</i>
</p>
