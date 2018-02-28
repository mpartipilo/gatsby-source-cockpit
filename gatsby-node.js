const _ = require(`lodash`)
const crypto = require(`crypto`)
const cp = require(`cockpit-api-client`)

const digest = (data) => (crypto
  .createHash(`md5`)
  .update(JSON.stringify(data))
  .digest(`hex`))

function createTextNode (node, key, text) {
  const str = _.isString(text) ? text : ` `
  const textNode = {
    id: `${node.id}${key}TextNode`,
    parent: node.id,
    children: [],
    [key]: str,
    internal: {
      type: _.camelCase(`${node.internal.type} ${key} TextNode`),
      mediaType: `text/markdown`,
      content: str,
      contentDigest: digest(str)
    }
  }

  return textNode
}

exports.sourceNodes = async ({ boundActionCreators, getNode, hasNodeChanged, reporter }, pluginOptions) => {
  const { createNode } = boundActionCreators
  const { accessToken, host, collectionName } = pluginOptions

  const client = new cp.Cockpit({ host, accessToken })
  reporter.info(`Cockpit host: ${host}`)
  reporter.info(`Cockpit access token: ${accessToken}`)

  reporter.info(`Fetching list of assets`)
  const assetResponse = await client.assets()
  reporter.info(`Assets retrieved: Found ${assetResponse.assets.length} assets`)

  reporter.info(`Specified Collections:`)
  reporter.list(`collection names`, collectionName)
  
  const collectionLength = collectionName.length;
  const tick = reporter.progress(collectionLength);
  for (let idx = 0; idx < collectionLength; idx += 1) {
    const c = collectionName[idx]
    reporter.info(`Fetching Cockpit Collection ${c}`)
    tick()
    // const data = getFakeData(pluginOptions);
    const data = await client.collectionEntries(c)
    reporter.info(`Collection retrieved: ${c}`)

    reporter.info(`Processing collection: ${c}`)

    const subtick = reporter.progress(data.entries.length);
    // Process data into nodes.
    await data.entries.forEach(async i => {
      subtick()

      const entry =
        Object.keys(data.fields)
          .map(f => data.fields[f].name)
          .reduce((x, y) => ({ ...x, [y]: i[y] }), {})

      const properties =
        Object.keys(i)
          .filter(f => !data.fields[f])
          .reduce((x, y) => ({ ...x, [y]: i[y] }), {})

      const node = {
        entry: { ...entry },
        properties: { ...properties },
        host,

        // eslint-disable-next-line
        id: i._id,
        parent: null, // or null if it's a source node without a parent
        children: [],
        internal: {
          type: `Cockpit${c}`,
          contentDigest: digest(i)
        }
      }

      await Object.keys(data.fields)
        .forEach(async f => {
          if (data.fields[f].type === `gallery`) {
            node.entry[f].forEach(async image => {
              if (image.meta.asset) {
                const assetDetails = assetResponse.assets.find(a => a._id === image.meta.asset)
                const {_id, width, height} = assetDetails
                const sizes = {
                  s2: {
                    width: Math.floor(width / 3),
                    height: Math.floor(height / 3)
                  },
                  s3: {
                    width: Math.floor(width / 2),
                    height: Math.floor(height / 2)
                  }
                }
                image.meta.asset = assetDetails
                image.thumb2 = {
                  src: await client.image(_id, sizes.s2),
                  ...sizes.s2
                }
                image.thumb3 = {
                  src: await client.image(_id, sizes.s3),
                  ...sizes.s3
                }
              }
            })
          }
          if (data.fields[f].type === `markdown`) {
            const textNode = createTextNode(node, data.fields[f].name, node.entry[f], createNode)
            createNode(textNode)
            node.children.push(textNode.id)
          }
        })

      createNode(node)
    })
    reporter.info(`Finished processing Collection: ${c}`)
  }
  reporter.success(`Finished processing all collections`)
}
