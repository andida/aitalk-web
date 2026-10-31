import assert from 'node:assert/strict';
import test from 'node:test';
import type { AwsClient as AwsClientType } from 'aws4fetch';

import { R2Provider } from './r2';
import { S3Provider } from './s3';

test('S3 and R2 upload exactly the bytes in sliced buffers and views', async (t) => {
  const { AwsClient } = await import('aws4fetch');
  const requests: Request[] = [];
  t.mock.method(
    AwsClient.prototype,
    'fetch',
    async (input: Parameters<AwsClientType['fetch']>[0]) => {
      assert.ok(input instanceof Request);
      requests.push(input);
      return new Response(null, { status: 200 });
    }
  );

  const s3 = new S3Provider({
    endpoint: 'https://example.test',
    region: 'test',
    accessKeyId: 'test',
    secretAccessKey: 'test',
    bucket: 'bucket',
  });
  const r2 = new R2Provider({
    accountId: 'test',
    accessKeyId: 'test',
    secretAccessKey: 'test',
    bucket: 'bucket',
  });
  const bytes = Uint8Array.from([9, 1, 2, 3, 9]);
  const s3Result = await s3.uploadFile({
    body: bytes.subarray(1, 4),
    key: 'one',
  });
  assert.equal(s3Result.success, true, s3Result.error);
  const r2Result = await r2.uploadFile({
    body: Buffer.from(bytes).subarray(1, 4),
    key: 'two',
  });
  assert.equal(r2Result.success, true, r2Result.error);
  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.headers.get('content-length'), '3');
    assert.deepEqual(
      Array.from(new Uint8Array(await request.arrayBuffer())),
      [1, 2, 3]
    );
  }
});
