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

3. Create `.env` files:

   For the server (`server/.env`):

   ```
   CLIENT_ID=your_reddit_app_client_id
   CLIENT_SECRET=your_reddit_app_client_secret
   PORT=3001
   ```

   For the app (`app/.env`):

   ```
   VITE_API_URL=http://localhost:3001
   VITE_CLIENT_ID=your_reddit_app_client_id
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
