> **Warning**
>
> `oas-reducer` has moved! If you're looking for the CLI reducer you can use it in [rdme](https://npm.im/rdme) with its `rdme openapi:reduce` command, ad if you're looking for the programmatic API aspect of this library that has been relocated into [oas](https://npm.im/oas)

# oas-reducer

Reduce an OpenAPI definition into a smaller subset.

[![Build](https://github.com/readmeio/oas-reducer/workflows/CI/badge.svg)](https://github.com/readmeio/oas-reducer/) [![](https://img.shields.io/npm/v/oas-reducer)](https://npm.im/oas-reducer)

[![](https://d3vv6lp55qjaqc.cloudfront.net/items/1M3C3j0I0s0j3T362344/Untitled-2.png)](https://readme.com)

## Installation

```
npm install -g oas-reducer
```

## Usage

### Library

```js
import oasReducer from 'oas-reducer';

console.log(
  oasReducer(<OpenAPI definition>, options)
);
```

> ⚠️ Note that the API definition supplied here must be: an OpenAPI 3.x definition and a JSON object.

#### Available options

- `tags`: An array of tags to reduce by. Example: `['pet']`
- `paths`: A key-value object of path + method combinations to reduce by. Example: `{'/pet': ['get', 'post']}`
  - If you wish to retain all methods of a given path, supply `*` as the method array instead. Example: `{'/pet': '*'}`

### CLI

```shell
$ oas-reducer <OpenAPI definition to reduce>
```

The CLI will walk you through a couple of questions about how and what you want to reduce the file by and then it'll prompt you to save the newly reduced API definition to a new file! 🏅

> ⚠️ Note that the API definition supplied here must be an OpenAPI 3.x definition and can be either a JSON or YAML file path.
