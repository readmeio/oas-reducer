const oasReducer = require('../src');

const complexNesting = require('./__fixtures__/complex-nesting.json');
const parametersCommon = require('./__fixtures__/parameters-common.json');
const petstore = require('@readme/oas-examples/3.0/json/petstore.json');
const swagger = require('@readme/oas-examples/2.0/json/petstore.json');
const tagQuirks = require('./__fixtures__/tag-quirks.json');
const uspto = require('@readme/oas-examples/3.0/json/uspto.json');

test('it should not do anything if no reducers are supplied', () => {
  expect(oasReducer(petstore)).toStrictEqual(petstore);
});

test('should fail if given a Swagger 2.0 definition', () => {
  expect(() => {
    oasReducer(swagger);
  }).toThrow('Sorry, OpenAPI v3.x definitions are supported.');
});

describe('tag reduction', () => {
  it('should reduce by tags', () => {
    const reduced = oasReducer(petstore, { tags: ['store'] });

    expect(reduced.tags).toStrictEqual([{ name: 'store', description: 'Access to Petstore orders' }]);

    expect(reduced.paths).toStrictEqual({
      '/store/inventory': {
        get: expect.any(Object),
      },
      '/store/order': {
        post: expect.any(Object),
      },
      '/store/order/{orderId}': {
        get: expect.any(Object),
        delete: expect.any(Object),
      },
    });

    expect(reduced.components).toStrictEqual({
      schemas: {
        Order: expect.any(Object),
      },
      securitySchemes: {
        api_key: expect.any(Object),
      },
    });
  });

  it('should support reducing by tags that are only stored at the operation level', () => {
    const reduced = oasReducer(tagQuirks, { tags: ['commerce'] });

    expect(reduced.tags).toStrictEqual([{ name: 'store', description: 'Access to Petstore orders' }]);

    expect(reduced.paths).toStrictEqual({
      '/store/inventory': {
        get: expect.any(Object),
      },
    });
  });
});

describe('path reduction', () => {
  it('should reduce by paths', () => {
    const reduced = oasReducer(petstore, {
      paths: {
        '/store/order/{orderId}': ['get'],
      },
    });

    expect(reduced.tags).toStrictEqual([{ name: 'store', description: 'Access to Petstore orders' }]);

    expect(reduced.paths).toStrictEqual({
      '/store/order/{orderId}': {
        get: expect.any(Object),
      },
    });

    expect(reduced.components).toStrictEqual({
      schemas: {
        Order: expect.any(Object),
      },
    });
  });

  it('should support method wildcards', () => {
    const reduced = oasReducer(petstore, {
      paths: {
        '/store/order/{orderId}': '*',
      },
    });

    expect(reduced.paths).toStrictEqual({
      '/store/order/{orderId}': {
        get: expect.any(Object),
        delete: expect.any(Object),
      },
    });
  });

  it('should support reducing common parameters', () => {
    const reduced = oasReducer(parametersCommon, {
      paths: {
        '/anything/{id}': ['get'],
      },
    });

    expect(reduced.paths).toStrictEqual({
      '/anything/{id}': {
        parameters: expect.any(Array),
        get: expect.any(Object),
      },
    });
  });
});

test('should support retaining deeply nested used $ref pointers', () => {
  const reduced = oasReducer(complexNesting, { paths: { '/multischema/of-everything': '*' } });

  expect(reduced.components).toStrictEqual({
    schemas: {
      MultischemaOfEverything: expect.any(Object),
      ArrayOfObjectsOfObjectsAndArrays: expect.any(Object),
      ObjectOfEverything: expect.any(Object),
      ArrayOfPrimitives: expect.any(Object),
      ArrayOfFlatObjects: expect.any(Object),
      ObjectOfObjectsAndArrays: expect.any(Object),
      FlatObject: expect.any(Object),
    },
  });
});

test("it should not leave any components if there aren't any in use", () => {
  const reduced = oasReducer(uspto, { paths: { '/{dataset}/{version}/records': '*' } });

  expect(reduced.components).toBeUndefined();
});

test('should throw an error if we end up with a definition that has no paths', () => {
  expect(() => {
    oasReducer(petstore, { tags: ['unknownTag'] });
  }).toThrow('All paths in the API definition were removed. Did you supply the right path name to reduce by?');

  expect(() => {
    oasReducer(petstore, { paths: { '/unknownPath': '*' } });
  }).toThrow('All paths in the API definition were removed. Did you supply the right path name to reduce by?');
});
