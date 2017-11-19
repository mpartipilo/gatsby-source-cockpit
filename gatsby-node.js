const cp = require(`cockpit-api-client`);
const crypto = require(`crypto`);

async function getCockpitData({ host, accessToken, collectionName }) {
  const client = new cp.Cockpit({host, accessToken});

  return client.collectionEntries(collectionName);
}

exports.sourceNodes = async ({ boundActionCreators }, pluginOptions) => {
  const { createNode } = boundActionCreators;
  const { accessToken, host, collectionName } = pluginOptions;

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
    const node = 
      Object.keys(data.fields)
      .map(f => data.fields[f].name)
      .reduce((x, y) => ({ ...x, [y]: i[y] }), {})

    createNode({
      content: { ...node },
      host,

      id: i._id,
      parent: null, // or null if it's a source node without a parent
      children: [],
      internal: {
        type: `Cockpit${collectionName}`,
        contentDigest: crypto
          .createHash(`md5`)
          .update(JSON.stringify(i))
          .digest(`hex`)
      }
    });
  });
};
