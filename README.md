# gatsby-source-cockpit
Gatsby plugin to access remote content from a Cockpit API (http://getcockpit.com/)

# Installation:
`npm install -save-dev gatsby-source-cockpit`

# Usage:
Add this in your gatsby-config.js file.
```
  {
      resolve: "gatsby-source-cockpit",
      options: {
          host: "http://{YOUR_COCKPIT_URL}",
          accessToken: "{YOUR_ACCOUNT_API_KEY}",
          collectionName: ["Gallery", "Blog", ...]
      }
  }
```
