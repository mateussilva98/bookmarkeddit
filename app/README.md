# bookmarkeddit

Modern tool to organize your Reddit saved posts and comments

- Safely connect to your Reddit account
- Search for anything using our smart search
- Unsave no longer necessary posts

## Main Features

- Grouped by subcategories
  - Order by Quantity od saved posts, Name or Recent
- Remove Saved Items
- Search your items
- Export Saved Items to your computer
- View Thread/Context for Links
- Search through all Saved Items or specific sub
- Filter to show Posts or Comments

## Other features

- Themes
- Layout: default (3 columns), 1 column, 2 columns and dynamic (depends on window size)
- Tooltip on unsave
- Toast message on unsave
- add locale
- export to csv

- improve logic on login. when going to main sure, if there's already tokens, redirect to posts page

## Useful links

https://www.youtube.com/watch?v=ilDSd3W_6UI&t=733s
https://github.com/reddit-archive/reddit/wiki/API
https://www.reddit.com/api/v1/scopes
https://tasoskakour.com/blog/react-use-oauth2
https://www.reddit.com/prefs/apps

## Similar solutions

https://updoot.app/#_
https://redditmanager.com/app#_
https://github.com/sergeystoma/updoot

## Notes

Each saved post should show subreddit, user, date, title, description and image. Option to blur image is NSFW

"""Fetch saved Reddit posts, using `after` for full fetch and `before` for incremental fetch."""

https://www.reddit.com/prefs/apps

https://www.reddit.com/user/mateus_silva_98/saved/

search box: https://www.fusejs.io/examples.html#extended-search

compact or no compact in settings (elipsis on title and description)

if going to /posts not logged in it should go back to login

fix on url on comments

identify domehow that they are comments
