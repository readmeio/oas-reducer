import type { OpenAPIV3, OpenAPIV3_1 } from 'openapi-types';

import jsonPath from 'jsonpath';
import jsonPointer from 'jsonpointer';
import { version as getAPIDefinitionVersion } from 'oas-normalize/dist/lib/utils';

export type OpenAPI3Document = OpenAPIV3.Document | OpenAPIV3_1.Document;

/**
 * Query a JSON Schema object for any `$ref` pointers. Return any pointers that were found.
 *
 */
function getUsedRefs(schema: Record<string, unknown>) {
  return jsonPath.query(schema, "$..['$ref']");
}

/**
 * Recursively process a `$ref` pointer and accumulate any other `$ref` pointers that it or its
 * children use.
 *
 */
function accumulateUsedRefs(schema: Record<string, unknown>, $refs: Set<string>, $ref: string): void {
  const $refSchema = jsonPointer.get(schema, $ref.substring(1));
  getUsedRefs($refSchema).forEach(currRef => {
    // If we've already processed this $ref don't send us into an infinite loop.
    if ($refs.has(currRef)) {
      return;
    }

    $refs.add(currRef);
    accumulateUsedRefs(schema, $refs, currRef);
  });
}

/**
 * With an array of tags or object of paths+method combinations, reduce an OpenAPI definition to a
 * new definition that just contains those tags or path + methods.
 *
 * @example <caption>Reduce by an array of tags only.</caption>
 * { tags: ['pet] }
 *
 * @example <caption>Reduce by a specific path and methods.</caption>
 * { paths: { '/pet': ['get', 'post'] } }
 *
 * @example <caption>Reduce by a specific path and all methods it has.</caption>
 * { { paths: { '/pet': '*' } }  }
 *
 * @param definition A valid OpenAPI 3.x definition
 * @param opts Option configuration to reduce by. See the README for details.
 * @param opts.tags An array of tags in the OpenAPI definition to reduce by.
 * @param opts.paths A key-value object of path + method combinations to reduce by.
 */
export default function oasReducer(
  definition: OpenAPI3Document,
  opts: {
    paths?: Record<string, string[] | '*'>;
    tags?: string[];
  } = {}
) {
  const reduceTags = 'tags' in opts ? opts.tags : [];
  const reducePaths = 'paths' in opts ? opts.paths : {};

  const $refs: Set<string> = new Set();
  const usedTags: Set<string> = new Set();

  const baseVersion = parseInt(getAPIDefinitionVersion(definition as any), 10);
  if (baseVersion !== 3) {
    throw new Error('Sorry, OpenAPI v3.x definitions are supported.');
  }

  // Stringify and parse so we get a full non-reference clone of the API definition to work with.
  const reduced = JSON.parse(JSON.stringify(definition));

  if ('paths' in reduced) {
    Object.keys(reduced.paths).forEach(path => {
      if (Object.keys(reducePaths).length) {
        if (!(path in reducePaths)) {
          delete reduced.paths[path];
          return;
        }
      }

      Object.keys(reduced.paths[path]).forEach(method => {
        // If this method is `parameters` we should always retain it.
        if (method !== 'parameters') {
          if (Object.keys(reducePaths).length) {
            if (reducePaths[path] !== '*' && Array.isArray(reducePaths[path]) && !reducePaths[path].includes(method)) {
              delete reduced.paths[path][method];
              return;
            }
          }
        }

        const operation = reduced.paths[path][method];

        // If we're reducing by tags and this operation doesn't live in one of those, remove it.
        if (reduceTags.length) {
          if (!('tags' in operation)) {
            delete reduced.paths[path][method];
            return;
          } else if (!reduceTags.filter(value => operation.tags.includes(value)).length) {
            delete reduced.paths[path][method];
            return;
          }
        }

        // Accumulate a list of used tags so we can filter out any ones that we don't need later.
        if ('tags' in operation) {
          operation.tags.forEach((tag: string) => {
            usedTags.add(tag);
          });
        }

        // Accumulate a list of $ref pointers that are used within this operation.
        getUsedRefs(operation).forEach(ref => {
          $refs.add(ref);
        });

        // Accumulate any used security schemas that we need to retain.
        if ('security' in operation) {
          Object.keys(operation.security).forEach(k => {
            Object.keys(operation.security[k]).forEach(scheme => {
              $refs.add(`#/components/securitySchemes/${scheme}`);
            });
          });
        }
      });

      // If this path no longer has any methods, delete it.
      if (!Object.keys(reduced.paths[path]).length) {
        delete reduced.paths[path];
      }
    });

    // If we don't have any more paths after cleanup, throw an error because an OpenAPI file must
    // have at least one path.
    if (!Object.keys(reduced.paths).length) {
      throw new Error('All paths in the API definition were removed. Did you supply the right path name to reduce by?');
    }
  }

  // Recursively accumulate any components that are in use.
  $refs.forEach($ref => accumulateUsedRefs(reduced, $refs, $ref));

  // Remove any unused components.
  if ('components' in reduced) {
    Object.keys(reduced.components).forEach(componentType => {
      Object.keys(reduced.components[componentType]).forEach(component => {
        if (!$refs.has(`#/components/${componentType}/${component}`)) {
          delete reduced.components[componentType][component];
        }
      });

      // If this component group is now empty, delete it.
      if (!Object.keys(reduced.components[componentType]).length) {
        delete reduced.components[componentType];
      }
    });

    // If this path no longer has any components, delete it.
    if (!Object.keys(reduced.components).length) {
      delete reduced.components;
    }
  }

  // Remove any unused tags.
  if ('tags' in reduced) {
    reduced.tags.forEach((tag: OpenAPIV3_1.TagObject, k: number) => {
      if (!usedTags.has(tag.name)) {
        delete reduced.tags[k];
      }
    });

    // Remove any now empty items from the tags array.
    reduced.tags = reduced.tags.filter(Boolean);

    if (!reduced.tags.length) {
      delete reduced.tags;
    }
  }

  return reduced;
}
