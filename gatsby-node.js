const _ = require(`lodash`)
const crypto = require(`crypto`);
const cp = require(`cockpit-api-client`);

/* eslint no-console: 0 */
/* eslint no-underscore-dangle: 0 */
/* eslint no-await-in-loop: 0 */

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
    await data.entries.forEach(async i => {
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
                const {_id,width,height} = assetDetails;
                const sizes = {
                  s2: {
                    width: Math.floor(width / 3),
                    height: Math.floor(height / 3),
                  },
                  s3: {
                    width: Math.floor(width / 2),
                    height: Math.floor(height / 2),
                  }
                }
                image.meta.asset = assetDetails;
                image.thumb2 = {
                  src: await client.image(_id, sizes.s2),
                  ...sizes.s2
                };
                image.thumb3 = {
                  src: await client.image(_id, sizes.s3),
                  ...sizes.s3
                };
              }
            });
          }
          if (data.fields[f].type === `markdown`) {
            const textNode = createTextNode(node, data.fields[f].name, node.entry[f], createNode)
            createNode(textNode);
            node.children.push(textNode.id);
          }
        });
      
      createNode(node);
    });

    console.timeEnd(
      `Fetching Cockpit Collection ${c}`
    );
  }
}
