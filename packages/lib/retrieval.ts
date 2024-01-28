import { Datastore } from '@chaindesk/prisma';

import { QdrantManager } from './datastores/qdrant';
import { AppDocument, ChunkMetadataRetrieved } from './types/document';
import { ChatRequest } from './types/dtos';
import { DatastoreManager } from './datastores';

type RetrievalProps = {
  query: string;
  topK: number;
  datastore?: Datastore;
  filters?: ChatRequest['filters'];
};

const retrieval = async (props: RetrievalProps) => {
  let results: AppDocument<ChunkMetadataRetrieved>[] = [];

  if (props.datastore) {
    console.log('called-1111');
    const store = new DatastoreManager(props.datastore);
    results = await store.search({
      query: props.query,
      topK: props.topK,
      filters: props.filters,
      tags: [],
    });
  } else if (
    props.filters?.datasource_ids?.length ||
    props.filters?.datastore_ids?.length
  ) {
    console.log('called-2222');
    // Support for Multi-datastore search
    // TODO: need to be refactored if other vector db provider are used in the future
    results = await QdrantManager._search({
      query: props.query,
      topK: props.topK,
      filters: props.filters,
      tags: [],
    });
  }

  // return results;
  // Sort by order of appearance in the document
  return results.sort(
    (a, b) => a.metadata.chunk_offset! - b.metadata.chunk_offset!
  );
};

export default retrieval;
