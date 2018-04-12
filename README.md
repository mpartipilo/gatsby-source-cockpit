# gatsby-source-cockpit
A Gatsby plugin for accessing remote content from the Cockpit API (http://getcockpit.com/)

# Installation:
`npm install -save-dev gatsby-source-cockpit`

# Usage:
Configure the plugin in your gatsby-config.js file. 

```
  {
      resolve: "gatsby-source-cockpit",
      options: {
          host: "http://{YOUR_COCKPIT_URL}",
          accessToken: "{YOUR_ACCOUNT_API_KEY}",
          collectionName: ["Gallery", "Blog", "Pages",...]
      }
  }
```

Any collections you've created with Cockpit can be accessed from within your project with a simple GraphQL query. 

##Example Query
```
{
    allCockpitPages {
        edges {
            node {
                id
                entry
            }
        }
    }
}
```

The plugin currently returns both markdown and html, and can be used in tandem with Gatsby's [createPages](https://www.gatsbyjs.org/docs/node-apis/#createPages) API to programatically serve content created within the Cockpit CMS to your project. 