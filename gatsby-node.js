const _ = require(`lodash`)
const crypto = require(`crypto`);
const cp = require(`cockpit-api-client`);

const getCockpitData = async ({ host, accessToken, collectionName }) => {
  const client = new cp.Cockpit({host, accessToken});

  return client.collectionEntries(collectionName);
}

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

  /* eslint no-console: 0 */
  console.time(`Fetching Cockpit Collection ${collectionName}`);
  console.log(`Fetching Cockpit Collection ${collectionName}`);
  console.log(`Cockpit host: ${host}`);
  console.log(`Cockpit access token: ${accessToken}`);

  // const data = getFakeData(pluginOptions);
  const data = await getCockpitData(pluginOptions);

  console.timeEnd(
    `Fetching Cockpit Collection ${collectionName}`
  );

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
        type: `Cockpit${collectionName}`,
        contentDigest: digest(i)
      }
    }

    createNode(node);
    
    Object.keys(data.fields)
      .filter(f => data.fields[f].type === `markdown`)
      .forEach(f => {
        const textNode = createTextNode(node, data.fields[f].name, node.entry[f], createNode)
        createNode(textNode);
        createParentChildLink({ parent: node, child: textNode })
      });
  });
};
