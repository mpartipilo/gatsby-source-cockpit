const _ = require(`lodash`)
const crypto = require(`crypto`);
const cp = require(`cockpit-api-client`);

/* eslint no-console: 0 */
/* eslint no-underscore-dangle: 0 */

const digest = (data) => (crypto
  .createHash(`md5`)
  .update(JSON.stringify(data))
  .digest(`hex`));

function createTextNode(node, key, text) {
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
      contentDigest: digest(str),
    },
  }

  return textNode
}

exports.sourceNodes = async ({ boundActionCreators }, pluginOptions) => {
  const { createNode, createParentChildLink } = boundActionCreators;
  const { accessToken, host, collectionName } = pluginOptions;

  const client = new cp.Cockpit({ host, accessToken });
  console.log(`Cockpit host: ${host}`);
  console.log(`Cockpit access token: ${accessToken}`);

  const assetResponse = await client.assets();

  for (let idx = 0; idx < collectionName.length; idx += 1) {
    const c = collectionName[idx];
    console.time(`Fetching Cockpit Collection ${c}`);
    console.log(`Fetching Cockpit Collection ${c}`);

    // const data = getFakeData(pluginOptions);
    const data = await client.collectionEntries(c);

    // Process data into nodes.
    data.entries.forEach(i => {
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

      createNode(node);

      Object.keys(data.fields)
        .forEach(f => {
          if (data.fields[f].type === `gallery`) {
            node.entry[f].forEach(image => {
              if (image.meta.asset) {
                image.meta.asset = assetResponse.assets.find(a => a._id === image.meta.asset)
              }
            });
          }
          if (data.fields[f].type === `markdown`) {
            const textNode = createTextNode(node, data.fields[f].name, node.entry[f], createNode)
            createNode(textNode);
            createParentChildLink({ parent: node, child: textNode })
          }
        });
    });

    console.timeEnd(
      `Fetching Cockpit Collection ${c}`
    );
  }
}
