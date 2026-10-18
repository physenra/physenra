// ==============================================================================
// PHYSENRA — CLINICAL FORM DRAFTS SERVER API TEST SUITE
// Test File: tests/clinical_form_draft_server_api.test.cjs
// ==============================================================================

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const ROOT_DIR = path.join(__dirname, '..');
const formDraftsHandler = require(path.join(ROOT_DIR, 'netlify', 'functions', 'form-drafts.cjs')).handler;

test('PHYSENRA — Clinical Form Drafts Serverless Function Tests', async (t) => {
  const mockDeps = {
    user: { id: 'usr_test_clinician_001' },
    isMember: true,
    supabaseAdmin: {
      from: () => ({
        upsert: async () => ({ error: { message: 'table migration pending' } }),
        select: () => ({
          eq: () => ({
            eq: () => ({
              eq: () => ({
                maybeSingle: async () => ({ data: null, error: null }),
              }),
            }),
          }),
        }),
        delete: () => ({
          eq: () => ({
            eq: () => ({
              eq: async () => ({ error: null }),
            }),
          }),
        }),
      }),
    },
  };

  await t.test('1. OPTIONS returns 204 with CORS headers', async () => {
    const event = {
      httpMethod: 'OPTIONS',
      headers: {},
    };
    const response = await formDraftsHandler(event, {});
    assert.equal(response.statusCode, 204);
    assert.equal(response.headers['Access-Control-Allow-Origin'], '*');
    assert.match(response.headers['Access-Control-Allow-Methods'], /GET, POST, DELETE/);
  });

  await t.test('2. Missing Authorization header returns 401', async () => {
    const event = {
      httpMethod: 'GET',
      queryStringParameters: { formId: 'create_hep_program' },
      headers: {},
    };
    const response = await formDraftsHandler(event, {});
    assert.equal(response.statusCode, 401);
    const body = JSON.parse(response.body);
    assert.match(body.error, /Unauthorized/);
  });

  await t.test('3. Malformed Authorization header returns 401', async () => {
    const event = {
      httpMethod: 'GET',
      queryStringParameters: { formId: 'create_hep_program' },
      headers: {
        authorization: 'Basic dXNlcjpwYXNz',
      },
    };
    const response = await formDraftsHandler(event, {});
    assert.equal(response.statusCode, 401);
  });

  await t.test('4. Unsupported HTTP method returns 405', async () => {
    const event = {
      httpMethod: 'PUT',
      headers: {
        authorization: 'Bearer mock_valid_bearer_token',
      },
    };
    const response = await formDraftsHandler(event, {});
    assert.equal(response.statusCode, 405);
  });

  await t.test('5. Missing practice context returns 400', async () => {
    const event = {
      httpMethod: 'GET',
      queryStringParameters: { formId: 'create_hep_123' },
      headers: {
        authorization: 'Bearer mock_valid_bearer_token',
      },
    };
    const response = await formDraftsHandler(event, {}, mockDeps);
    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.match(body.error, /practice context/i);
  });

  await t.test('6. POST without formId returns 400', async () => {
    const event = {
      httpMethod: 'POST',
      headers: {
        authorization: 'Bearer mock_valid_bearer_token',
        'x-practice-id': 'prac_lagos_001',
      },
      body: JSON.stringify({ data: { test: 1 } }),
    };
    const response = await formDraftsHandler(event, {}, mockDeps);
    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.match(body.error, /formId.*required/i);
  });

  await t.test('7. GET without formId returns 400', async () => {
    const event = {
      httpMethod: 'GET',
      queryStringParameters: {},
      headers: {
        authorization: 'Bearer mock_valid_bearer_token',
        'x-practice-id': 'prac_lagos_001',
      },
    };
    const response = await formDraftsHandler(event, {}, mockDeps);
    assert.equal(response.statusCode, 400);
    const body = JSON.parse(response.body);
    assert.match(body.error, /formId.*required/i);
  });

  await t.test('8. Full Draft Lifecycle: Save -> Retrieve -> Discard', async () => {
    const formId = 'test_hep_form_prescription_42';
    const draftPayload = {
      programTitle: 'Post-Op Knee Extension Regimen',
      notes: 'Prescribed by Dr. Adeleke',
    };

    // 1. POST save draft
    const postEvent = {
      httpMethod: 'POST',
      headers: {
        authorization: 'Bearer mock_valid_bearer_token',
        'x-practice-id': 'prac_lagos_001',
      },
      body: JSON.stringify({
        formId,
        data: draftPayload,
      }),
    };
    const postRes = await formDraftsHandler(postEvent, {}, mockDeps);
    assert.equal(postRes.statusCode, 200);
    const postBody = JSON.parse(postRes.body);
    assert.equal(postBody.success, true);
    assert.equal(postBody.formId, formId);

    // 2. GET retrieve draft
    const getEvent = {
      httpMethod: 'GET',
      queryStringParameters: { formId },
      headers: {
        authorization: 'Bearer mock_valid_bearer_token',
        'x-practice-id': 'prac_lagos_001',
      },
    };
    const getRes = await formDraftsHandler(getEvent, {}, mockDeps);
    assert.equal(getRes.statusCode, 200);
    const getBody = JSON.parse(getRes.body);
    assert.ok(getBody.draft);
    assert.equal(getBody.draft.formId, formId);
    assert.deepEqual(getBody.draft.data, draftPayload);

    // 3. DELETE discard draft
    const deleteEvent = {
      httpMethod: 'DELETE',
      queryStringParameters: { formId },
      headers: {
        authorization: 'Bearer mock_valid_bearer_token',
        'x-practice-id': 'prac_lagos_001',
      },
    };
    const delRes = await formDraftsHandler(deleteEvent, {}, mockDeps);
    assert.equal(delRes.statusCode, 200);

    // 4. GET after delete returns null
    const getAfterDel = await formDraftsHandler(getEvent, {}, mockDeps);
    assert.equal(getAfterDel.statusCode, 200);
    const getAfterDelBody = JSON.parse(getAfterDel.body);
    assert.equal(getAfterDelBody.draft, null);
  });
});
