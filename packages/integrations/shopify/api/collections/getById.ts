import { NextApiResponse } from 'next/types';
import { AppNextApiRequest } from '@chaindesk/lib/types';
import {
  createLazyAuthHandler,
  respond,
} from '@chaindesk/lib/createa-api-handler';
import shopify from '../../sdk';
import { z } from 'zod';
import { ApiError, ApiErrorType } from '@chaindesk/lib/api-error';
import prisma from '@chaindesk/prisma/client';
import { LATEST_API_VERSION } from '@shopify/shopify-api';
import { ServiceProviderType } from '@chaindesk/prisma';
import { shopSchema } from '../../../../../apps/dashboard/components/ConnectShopifyStore';

const handler = createLazyAuthHandler();

const schema = shopSchema.extend({ collectionId: z.string() });

export const collectionProdcuts = async (
  req: AppNextApiRequest,
  res: NextApiResponse
) => {
  const result = await schema.safeParseAsync(req.query);

  if (!result.success) {
    throw new ApiError(ApiErrorType.INVALID_REQUEST);
  }

  const provider = await prisma.serviceProvider.findUniqueOrThrow({
    where: {
      unique_external_id: {
        externalId: result.data.shop,
        type: ServiceProviderType.shopify,
      },
    },
  });

  const client = new shopify.clients.Rest({
    session: (provider?.config as any)?.shopify_offline_session as any,
    apiVersion: LATEST_API_VERSION,
  });
  const response = await client.get({
    path: `collections/${result.data.collectionId}/products.json`,
  });

  return response.body;
};

handler.get(respond(collectionProdcuts));

export default handler;
