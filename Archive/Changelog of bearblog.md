---
title: "Changelog"
source: "https://docs.bearblog.dev/changelog/"
author:
published: 2023-11-01
created: 2026-04-14
description: "Latest updates to Bear"
tags:
  - "clippings"
---
The following only logs functional changes. Minor bug fixes, patches and updates are not logged here, but can be viewed in the GitHub repository [commit history](https://github.com/HermanMartinus/bearblog/commits/master/) (if you're very interested).

### March 2026

- Exclude tags in post lists
- Add italics and bold in post titles
- Date range on post lists
- Export backup as MD files instead of CSV
- Full text search on discover
- Random link to other blogs/posts
- Random blogs on discovery feed

### February 2026

- [Plugins are officially available](https://github.com/HermanMartinus/bear-plugins/)
- Restore unsaved drafts on accidental navigation/reload
- Paste image into content field to upload
- Fixed *viewed* state on Discovery feed
- Save draft on accidental redirect/reloads

### January 2026

- Rendering updates
- Hide blogs in discovery feed
- Bot storm protection on reverse proxy

### November 2025

- Robust caching on the edge (about 60% speedier loads)
- Monitoring and redundancy
- Hit and upvote upgrades
- Added homepage to analytics

### October 2025

- More admin tools
- [Plugins repo](https://github.com/HermanMartinus/bear-plugins/)
- Improved reverse proxy
- Transitioning to static upvoting

### September 2025

- Changed [code license](https://herman.bearblog.dev/license/)
- Fixed favicon issue in Google and RSS readers
- Upload raw checkbox in media center
- Security updates
- Analytics speedup

### August 2025

- Add a tag list anywhere using `{{ tags }}`
- Pasting url over selected text generates markdown link
- Support `image` in [embedded post lists](https://docs.bearblog.dev/embedding-blog-post-lists/)
- Add Next/Previous post links using `{{ previous_post }}` and `{{ next_post }}`

### July 2025

- Styling changes to the blog list/account page
- Added RSS/Atom meta links to all pages
- More moderation tools (as always)

### June 2025

- Minor dashboard updates
- Moderation tooling
- Fallbacks for infrastructure outages

### May 2025

- Discovery feed work
- Minor bug fixes

### April 2025

- Bot mitigation tools
- More moderation tools
- More caching and dynamic cache invalidation

### March 2025

- Support paths for posts (eg: `/blog/post-title/`)
- Search by tag
- Community management tools
- Backup recovery tools

### February 2025

- Small rendering tweaks and fixes
- Added blog hiding filter to discovery feed
- More bot fighting and redundancy work

### January 2025

- Dealt with a deluge of AI scrapers and bots
- Added rate-limiting, WAF rules, and extra security
- RSS and post optimisations
- Search optimisation

### December 2024

- Improved admin tooling
- Added more file support in the media center

### November 2024

- Bug fixes
- Improved review process
- DB speedup and migration
- Added filtering by multiple tags

### October 2024

- Database speedup
- Performance monitoring

### 27 September 2024

- Optimise images on upload

### 17 September 2024

- Allow favicons to be either emojis or links

### 04 September 2024

- Moved `lang` and `date_format` into settings

### 03 September 2024

- Improved media center
- Upload more file types
- Strip metadata from images on upload

### August 2024

- Reduced dependencies
- Improved DB performance

### 29 July 2024

- Discovery feed language filter
- Removed email confirmation links for blog subscribers

### 12 July 2024

- Made the media center publicly available on the dashboard to upgraded blogs

### 08 July 2024

- Made error on post saving fail gracefully

### 05 July 2024

- Page named `blog` can overwrite default blog page

### June 2024

- Cache RSS feeds
- Auto scaling enabled
- Better moderation tools
- Show local time instead of UTC

### May 2024

- Ability to remove emoji favicon
- Rearranged a bunch of dashboard settings
- Rewrite of the Markdown and LaTeX renderer

### 08 March 2024

- Separated Post and Page logic for brevity

### 07 March 2024

- Post previews are now token protected, as opposed to just using `?preview=True` flag

### 27 February 2024

- Added the ability to manage multiple blogs on one user account

### 19 February 2024

- Added custom footer content (which allows the addition of your own scripts, etc) for the dashboard. This can be found in Account > Customise dashboard

### 04 January 2024

- Started work on auth tokens
- Added RSS subscriber count to analytics

### 23 November 2023

- Added `blog_last_posted` attribute
- Dashboard uses `uid` instead of `slug` to handle "new"
- Cleanup Blog domain functions

### 21 November 2023

- Fixes:
	- Localisation bleeding
		- XSS injection in frontmatter
		- Only show relevant tags in posts

### 17 November 2023

- Added the ability to [reference blog and post attributes in content](https://docs.bearblog.dev/neat-bear-features/#insert-blog-and-post-attributes)

### 09 November 2023

- Removed all public instances of `pk` and replaced them with random `uid`
- Removed all dashboard instances of `pk` and replaced them with `slug`

### 08 November 2023

- **robots.txt** editor in Blog dashboard > Settings > Advanced settings
- Customise dashboard CSS in Blog dashboard > Settings > Advanced settings
- Directives editor relocated to Blog dashboard > Settings > Header and footer directives
- Refactored tags to be native instead of using `taggit`

### 07 November 2023

- [Ability to embed filtered post lists in page content](https://docs.bearblog.dev/embedding-blog-post-lists/)
- Cleaned out and refactored old code

### 01 November 2023

- Automated daily `hash_id` scrubbing
- Started this Changelog