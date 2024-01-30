import axios from 'axios';
import pMap from 'p-map';
import pRetry from 'p-retry';

import bulkDeleteDatasources from '@chaindesk/lib/bulk-delete-datasources';
import { DatastoreManager } from '@chaindesk/lib/datastores';
import { prisma } from '@chaindesk/prisma/client';

const datastoreRemoveOrphans = async (datastoreId: string) => {
  const client = axios.create({
    baseURL: process.env.QDRANT_API_URL,
    headers: {
      'api-key': process.env.QDRANT_API_KEY,
    },
  });

  const datastore = await prisma.datastore.findUnique({
    where: {
      id: datastoreId,
    },
  });

  const datasoures = await prisma.appDatasource.findMany({
    where: {
      datastoreId,
    },
    select: {
      id: true,
    },
  });

  const ids = datasoures.map((each) => each.id);

  let fetchedAll = false;
  let cursor = '';

  const manager = new DatastoreManager(datastore!);

  console.log(`${datasoures.length} Datasources found in DB`);

  while (!fetchedAll) {
    await pRetry(
      async () => {
        const { data } = await client.post(
          'collections/text-embedding-ada-002/points/scroll',
          {
            ...(cursor ? { offset: cursor } : {}),
            limit: 1000,
            filter: {
              must: [
                {
                  key: 'datastore_id',
                  match: {
                    value: datastoreId,
                  },
                },
              ],
            },
            with_payload: true,
            with_vector: false,
          }
        );

        const batchIds = new Set<string>();

        for (const each of data?.result?.points) {
          batchIds.add(each.payload?.datasource_id);
        }

        const zombies = Array.from(batchIds).filter(
          (each) => !ids.includes(each)
        );

        if (zombies.length > 0) {
          console.log('zombies', zombies);
          //   await manager.removeBulk(zombies);
          await bulkDeleteDatasources({
            datastoreId,
            datasourceIds: zombies,
          });
        }

        cursor = data?.result?.next_page_offset;

        if (!cursor) {
          fetchedAll = true;
        }
      },
      {
        retries: 3,
      }
    );
  }
};

export default datastoreRemoveOrphans;

(async () => {
  const datastores = await prisma.datastore.findMany({
    where: {
      organization: {
        subscriptions: {
          some: {
            status: 'active',
          },
        },
      },
    },
  });

  let counter = 0;

  await pMap(
    datastores,
    async (store) => {
      await datastoreRemoveOrphans(store.id);
      counter++;

      console.log(`✅ Done ${counter} / ${datastores.length}`);
    },
    {
      concurrency: 4,
    }
  );
})();
